"""
MediRDV CI — Tests d'intégration pour le module ``dashboard`` (BLOC 9).
"""

from __future__ import annotations

from datetime import datetime, timedelta
from uuid import UUID

import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.extensions import db
from app.models import Appointment, AppointmentStatus, ConsultationType, User, UserRole


class TestDashboardIntegration:
    """Tests d'intégration des endpoints du tableau de bord médecin et export CSV."""

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

    def test_doctor_dashboard_kpis(self, client: FlaskClient) -> None:
        """Le médecin peut voir ses KPIs agrégés sur la semaine."""
        doc_payload = {
            "role": "medecin",
            "first_name": "Jean",
            "last_name": "Gabin",
            "phone": "+22501010180",
            "password": "Password123",
        }
        headers = self._get_auth_headers(client, doc_payload)
        doctor = User.query.filter_by(phone="+22501010180").first()

        # Enregistrer un patient
        patient = User(
            role=UserRole.PATIENT,
            first_name="Lino",
            last_name="Ventura",
            phone="+22502020280",
            password_hash="...",
        )
        db.session.add(patient)
        db.session.commit()

        # Créer des rendez-vous cette semaine
        now = datetime.now()
        start_of_week = now - timedelta(days=now.weekday())
        
        # 1. RDV vidéo confirmé
        appt1 = Appointment(
            doctor_id=doctor.id,
            patient_id=patient.id,
            slot_start=start_of_week + timedelta(hours=10),
            slot_end=start_of_week + timedelta(hours=10, minutes=30),
            type=ConsultationType.VIDEO,
            status=AppointmentStatus.CONFIRME,
        )
        # 2. RDV présentiel annulé
        appt2 = Appointment(
            doctor_id=doctor.id,
            patient_id=patient.id,
            slot_start=start_of_week + timedelta(hours=11),
            slot_end=start_of_week + timedelta(hours=11, minutes=30),
            type=ConsultationType.PRESENTIEL,
            status=AppointmentStatus.ANNULE,
        )
        db.session.add_all([appt1, appt2])
        db.session.commit()

        # Récupérer les stats dashboard
        resp = client.get("/api/v1/dashboard/doctor", headers=headers)
        assert resp.status_code == 200
        data = resp.get_json()

        assert data["weekly_appointments"] == 1
        assert data["weekly_cancellations"] == 1
        assert data["weekly_video_consultations"] == 1

    def test_appointments_csv_export(self, client: FlaskClient) -> None:
        """L'export CSV renvoie les colonnes correctes et respecte la sécurité."""
        doc_payload = {
            "role": "medecin",
            "first_name": "Jean",
            "last_name": "Gabin",
            "phone": "+22501010180",
            "password": "Password123",
        }
        pat_payload = {
            "role": "patient",
            "first_name": "Lino",
            "last_name": "Ventura",
            "phone": "+22502020280",
            "password": "Password123",
            "gdpr_consent": True,
        }
        doc_headers = self._get_auth_headers(client, doc_payload)
        pat_headers = self._get_auth_headers(client, pat_payload)

        # 1. Patient tente d'exporter -> 403 Forbidden
        resp_forbidden = client.get("/api/v1/appointments/export", headers=pat_headers)
        assert resp_forbidden.status_code == 403

        # 2. Médecin exporte -> 200 OK
        resp_export = client.get("/api/v1/appointments/export", headers=doc_headers)
        assert resp_export.status_code == 200
        assert resp_export.mimetype == "text/csv"
        
        csv_data = resp_export.data.decode("utf-8")
        lines = csv_data.strip().split("\r\n")
        headers = lines[0].split(",")
        assert headers == ["id", "patient_name", "slot_start", "slot_end", "type", "status", "reason"]
