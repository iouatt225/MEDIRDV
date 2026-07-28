"""
MediRDV CI — Tests d'intégration pour le module ``teleconsult`` (BLOC 7).
"""

from __future__ import annotations

from datetime import datetime, timedelta
from uuid import UUID

import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.extensions import db
from app.models import Appointment, AppointmentStatus, ConsultationType, User, UserRole


class TestTeleconsultIntegration:
    """Tests d'intégration des visioconférences Daily.co."""

    def _get_auth_headers(self, client: FlaskClient, register_payload: dict) -> dict:
        """Helper pour inscrire et connecter un utilisateur."""
        client.post("/api/v1/auth/register", json=register_payload)
        login_resp = client.post(
            "/api/v1/auth/login",
            json={
                "phone": register_payload["phone"],
                "password": register_payload["password"],
            },
        ).get_json()
        return {"Authorization": f"Bearer {login_resp['access_token']}"}

    def test_token_access_and_scoping(self, client: FlaskClient) -> None:
        """Accès sécurisé au token vidéo en fonction de la plage horaire et des permissions."""
        doc_payload = {
            "role": "medecin",
            "first_name": "Jean",
            "last_name": "Reno",
            "phone": "+22501010110",
            "password": "Password123",
        }
        pat_payload = {
            "role": "patient",
            "first_name": "Leon",
            "last_name": "Pro",
            "phone": "+22502020220",
            "password": "Password123",
            "gdpr_consent": True,
        }
        intruder_payload = {
            "role": "patient",
            "first_name": "Intrud",
            "last_name": "Er",
            "phone": "+22503030330",
            "password": "Password123",
            "gdpr_consent": True,
        }

        doc_headers = self._get_auth_headers(client, doc_payload)
        pat_headers = self._get_auth_headers(client, pat_payload)
        intruder_headers = self._get_auth_headers(client, intruder_payload)

        doctor = User.query.filter_by(phone="+22501010110").first()
        patient = User.query.filter_by(phone="+22502020220").first()

        # 1. Créer un RDV vidéo dans le futur (ex: dans 2 heures)
        future_start = datetime.now() + timedelta(hours=2)
        future_end = future_start + timedelta(minutes=30)
        appt_future = Appointment(
            doctor_id=doctor.id,
            patient_id=patient.id,
            slot_start=future_start,
            slot_end=future_end,
            type=ConsultationType.VIDEO,
            status=AppointmentStatus.CONFIRME,
            video_url="https://medirdv.daily.co/room-future",
        )
        db.session.add(appt_future)
        db.session.commit()

        # Tenter d'obtenir le token en avance -> 422 Unprocessable Entity
        resp_too_early = client.get(
            f"/api/v1/teleconsult/{appt_future.id}/token",
            headers=pat_headers,
        )
        assert resp_too_early.status_code == 422

        # 2. Créer un RDV vidéo en cours (maintenant)
        now_start = datetime.now() - timedelta(minutes=10)
        now_end = now_start + timedelta(minutes=30)
        appt_now = Appointment(
            doctor_id=doctor.id,
            patient_id=patient.id,
            slot_start=now_start,
            slot_end=now_end,
            type=ConsultationType.VIDEO,
            status=AppointmentStatus.CONFIRME,
            video_url="https://medirdv.daily.co/room-now",
        )
        db.session.add(appt_now)
        db.session.commit()

        # Patient du RDV -> 200 OK et renvoie un token
        resp_patient = client.get(
            f"/api/v1/teleconsult/{appt_now.id}/token",
            headers=pat_headers,
        )
        assert resp_patient.status_code == 200
        assert "token" in resp_patient.get_json()

        # Médecin du RDV -> 200 OK
        resp_doc = client.get(
            f"/api/v1/teleconsult/{appt_now.id}/token",
            headers=doc_headers,
        )
        assert resp_doc.status_code == 200

        # Un utilisateur externe -> 403 Forbidden
        resp_intruder = client.get(
            f"/api/v1/teleconsult/{appt_now.id}/token",
            headers=intruder_headers,
        )
        assert resp_intruder.status_code == 403

    def test_daily_webhook_ends_meeting(self, client: FlaskClient) -> None:
        """Le webhook Daily.co met à jour le statut du RDV à EFFECTUE."""
        doctor = User(
            role=UserRole.MEDECIN,
            first_name="Dr",
            last_name="Who",
            phone="+22501000099",
            password_hash="...",
        )
        patient = User(
            role=UserRole.PATIENT,
            first_name="Rose",
            last_name="Tyler",
            phone="+22502000099",
            password_hash="...",
        )
        db.session.add_all([doctor, patient])
        db.session.commit()

        slot_start = datetime.now() - timedelta(minutes=20)
        slot_end = slot_start + timedelta(minutes=30)
        appt = Appointment(
            doctor_id=doctor.id,
            patient_id=patient.id,
            slot_start=slot_start,
            slot_end=slot_end,
            type=ConsultationType.VIDEO,
            status=AppointmentStatus.CONFIRME,
            video_url="https://medirdv.daily.co/webhook-room-xyz",
        )
        db.session.add(appt)
        db.session.commit()

        # Simuler l'appel webhook meeting.ended envoyé par Daily.co
        webhook_payload = {
            "event": "meeting.ended",
            "payload": {
                "room": "webhook-room-xyz",
            },
        }

        resp = client.post("/api/v1/teleconsult/webhook", json=webhook_payload)
        assert resp.status_code == 200
        assert resp.get_json() == {"status": "event processed"}

        # Vérifier la mise à jour en base de données
        db.session.refresh(appt)
        assert appt.status == AppointmentStatus.EFFECTUE
