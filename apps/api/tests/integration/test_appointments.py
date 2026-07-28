"""
MediRDV CI — Tests d'intégration pour le module ``appointments`` (BLOC 6).
"""

from __future__ import annotations

from datetime import datetime, timedelta
from uuid import UUID, uuid4

import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.extensions import db
from app.models import Appointment, AppointmentStatus, ConsultationType, DoctorProfile, SecretaryDoctor, SecretaryDoctorStatus, User, UserRole


class TestAppointmentsIntegration:
    """Tests d'intégration des endpoints de gestion des rendez-vous."""

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

    def test_create_and_read_appointment(self, client: FlaskClient) -> None:
        """Un patient peut réserver un rendez-vous et lire ses détails."""
        # 1. Enregistrer médecin et patient
        doc_payload = {
            "role": "medecin",
            "first_name": "Jean",
            "last_name": "Valjean",
            "phone": "+22501010101",
            "password": "Password123",
        }
        pat_payload = {
            "role": "patient",
            "first_name": "Cosette",
            "last_name": "Fauchelevent",
            "phone": "+22502020202",
            "password": "Password123",
            "gdpr_consent": True,
        }
        doc_headers = self._get_auth_headers(client, doc_payload)
        pat_headers = self._get_auth_headers(client, pat_payload)

        doctor = User.query.filter_by(phone="+22501010101").first()
        patient = User.query.filter_by(phone="+22502020202").first()

        # 2. Réserver un rendez-vous (patient connecté)
        slot_start = datetime.now() + timedelta(days=2)
        slot_end = slot_start + timedelta(minutes=30)

        appt_payload = {
            "doctor_id": str(doctor.id),
            "patient_id": str(patient.id),
            "slot_start": slot_start.isoformat(),
            "slot_end": slot_end.isoformat(),
            "type": "presentiel",
        }

        resp = client.post("/api/v1/appointments", json=appt_payload, headers=pat_headers)
        assert resp.status_code == 201
        data = resp.get_json()
        assert data["status"] == "confirme"
        assert data["version_token"] == 1
        appt_id = data["id"]

        # 3. Double réservation interdite sur le même créneau (409 Conflict)
        resp_conflict = client.post("/api/v1/appointments", json=appt_payload, headers=pat_headers)
        assert resp_conflict.status_code == 409

        # 4. Lire le rendez-vous (GET)
        resp_get = client.get(f"/api/v1/appointments/{appt_id}", headers=pat_headers)
        assert resp_get.status_code == 200
        assert resp_get.get_json()["id"] == appt_id

    def test_secretary_booking_and_linking(self, client: FlaskClient) -> None:
        """Une secrétaire liée peut réserver et gérer les rendez-vous."""
        # Enregistrer médecin, secrétaire, patient
        doc_payload = {
            "role": "medecin",
            "first_name": "Dr",
            "last_name": "House",
            "phone": "+22503030303",
            "password": "Password123",
        }
        sec_payload = {
            "role": "secretaire",
            "first_name": "Allison",
            "last_name": "Cameron",
            "phone": "+22504040404",
            "password": "Password123",
        }
        pat_payload = {
            "role": "patient",
            "first_name": "John",
            "last_name": "Doe",
            "phone": "+22505050505",
            "password": "Password123",
            "gdpr_consent": True,
        }
        doc_headers = self._get_auth_headers(client, doc_payload)
        sec_headers = self._get_auth_headers(client, sec_payload)
        self._get_auth_headers(client, pat_payload)

        doctor = User.query.filter_by(phone="+22503030303").first()
        secretary = User.query.filter_by(phone="+22504040404").first()
        patient = User.query.filter_by(phone="+22505050505").first()

        slot_start = datetime.now() + timedelta(days=5)
        slot_end = slot_start + timedelta(minutes=30)
        appt_payload = {
            "doctor_id": str(doctor.id),
            "patient_id": str(patient.id),
            "slot_start": slot_start.isoformat(),
            "slot_end": slot_end.isoformat(),
            "type": "video",
        }

        # Secrétaire non rattachée -> 403 Forbidden
        resp_forbidden = client.post("/api/v1/appointments", json=appt_payload, headers=sec_headers)
        assert resp_forbidden.status_code == 403

        # Rattacher la secrétaire (invitation)
        invite_resp = client.post("/api/v1/secretary/invite", headers=doc_headers)
        invite_code = invite_resp.get_json()["invitation_code"]

        client.post("/api/v1/secretary/join", json={"invitation_code": invite_code}, headers=sec_headers)

        # Secrétaire rattachée -> 201 Created (et génération de room vidéo Daily)
        resp_ok = client.post("/api/v1/appointments", json=appt_payload, headers=sec_headers)
        assert resp_ok.status_code == 201
        data = resp_ok.get_json()
        assert data["video_url"] is not None

    def test_optimistic_locking(self, client: FlaskClient) -> None:
        """Vérifie le verrouillage optimiste avec version_token."""
        doc_payload = {
            "role": "medecin",
            "first_name": "Mick",
            "last_name": "Jagger",
            "phone": "+22506060606",
            "password": "Password123",
        }
        pat_payload = {
            "role": "patient",
            "first_name": "Keith",
            "last_name": "Richards",
            "phone": "+22507070707",
            "password": "Password123",
            "gdpr_consent": True,
        }
        doc_headers = self._get_auth_headers(client, doc_payload)
        pat_headers = self._get_auth_headers(client, pat_payload)

        doctor = User.query.filter_by(phone="+22506060606").first()
        patient = User.query.filter_by(phone="+22507070707").first()

        slot_start = datetime.now() + timedelta(days=2)
        slot_end = slot_start + timedelta(minutes=30)
        appt_payload = {
            "doctor_id": str(doctor.id),
            "patient_id": str(patient.id),
            "slot_start": slot_start.isoformat(),
            "slot_end": slot_end.isoformat(),
            "type": "presentiel",
        }

        # Créer RDV
        post_resp = client.post("/api/v1/appointments", json=appt_payload, headers=pat_headers)
        appt_id = post_resp.get_json()["id"]

        # Modifier le statut avec la bonne version (token=1) -> Réussit
        patch_payload_good = {"status": "annule", "version_token": 1}
        resp_good = client.patch(
            f"/api/v1/appointments/{appt_id}/status",
            json=patch_payload_good,
            headers=pat_headers,
        )
        assert resp_good.status_code == 200
        assert resp_good.get_json()["version_token"] == 2

        # Modifier avec une version obsolète (token=1) -> 409 Conflict
        patch_payload_bad = {"status": "confirme", "version_token": 1}
        resp_bad = client.patch(
            f"/api/v1/appointments/{appt_id}/status",
            json=patch_payload_bad,
            headers=pat_headers,
        )
        assert resp_bad.status_code == 409

    def test_cancellation_delay_hours_rule(self, client: FlaskClient) -> None:
        """Le patient ne peut pas annuler en deçà du délai configuré (par défaut 24h)."""
        doc_payload = {
            "role": "medecin",
            "first_name": "Marc",
            "last_name": "Lavoine",
            "phone": "+22508080808",
            "password": "Password123",
        }
        pat_payload = {
            "role": "patient",
            "first_name": "Sarah",
            "last_name": "Connor",
            "phone": "+22509090909",
            "password": "Password123",
            "gdpr_consent": True,
        }
        doc_headers = self._get_auth_headers(client, doc_payload)
        pat_headers = self._get_auth_headers(client, pat_payload)

        doctor = User.query.filter_by(phone="+22508080808").first()
        patient = User.query.filter_by(phone="+22509090909").first()

        # Configurer un délai de cancellation de 48h pour le médecin
        doc_profile = DoctorProfile.query.filter_by(user_id=doctor.id).first()
        doc_profile.cancellation_delay_hours = 48
        db.session.commit()

        # Créer un rendez-vous dans 30 heures (inférieur à 48 heures)
        slot_start = datetime.now() + timedelta(hours=30)
        slot_end = slot_start + timedelta(minutes=30)
        appt_payload = {
            "doctor_id": str(doctor.id),
            "patient_id": str(patient.id),
            "slot_start": slot_start.isoformat(),
            "slot_end": slot_end.isoformat(),
            "type": "presentiel",
        }

        post_resp = client.post("/api/v1/appointments", json=appt_payload, headers=pat_headers)
        appt_id = post_resp.get_json()["id"]

        # Tenter d'annuler en tant que patient -> 422 Unprocessable Entity
        cancel_payload = {"status": "annule", "version_token": 1}
        cancel_resp = client.patch(
            f"/api/v1/appointments/{appt_id}/status",
            json=cancel_payload,
            headers=pat_headers,
        )
        assert cancel_resp.status_code == 422
        assert "Délai d'annulation dépassé" in cancel_resp.get_json()["message"]

        # Le médecin peut outrepasser cette règle d'annulation -> 200 OK
        doc_cancel_resp = client.patch(
            f"/api/v1/appointments/{appt_id}/status",
            json=cancel_payload,
            headers=doc_headers,
        )
        assert doc_cancel_resp.status_code == 200
        assert doc_cancel_resp.get_json()["status"] == "annule"
