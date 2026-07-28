"""
MediRDV CI — Tests d'intégration pour la sécurité, RGPD et audit log (BLOC 10).
"""

from __future__ import annotations

from datetime import datetime, timedelta
from uuid import UUID

import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.extensions import db
from app.models import Appointment, AppointmentStatus, AuditLog, ConsultationType, PatientProfile, User, UserRole


class TestSecurityAndRgpdIntegration:
    """Tests d'intégration couvrant la conformité RGPD, l'audit log et le droit à l'oubli."""

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

    def test_droit_a_l_oubli_anonymization(self, client: FlaskClient) -> None:
        """RGPD : Droit à l'oubli anonymise le User et supprime le PatientProfile."""
        pat_payload = {
            "role": "patient",
            "first_name": "Lana",
            "last_name": "DelRey",
            "phone": "+22501020304",
            "password": "Password123",
            "gdpr_consent": True,
        }
        headers = self._get_auth_headers(client, pat_payload)
        patient = User.query.filter_by(phone="+22501020304").first()
        assert patient is not None

        # 1. Vérifier que son PatientProfile existe
        profile = PatientProfile.query.filter_by(user_id=patient.id).first()
        assert profile is not None

        # 2. Lancer le droit à l'oubli
        resp = client.delete("/api/v1/users/me", headers=headers)
        assert resp.status_code == 200

        # 3. Vérifier que le profil est supprimé
        db.session.expire_all()
        profile_deleted = PatientProfile.query.filter_by(user_id=patient.id).first()
        assert profile_deleted is None

        # 4. Vérifier que l'utilisateur est anonymisé
        patient_anonymized = User.query.filter_by(id=patient.id).first()
        assert patient_anonymized.first_name == "Anonyme"
        assert patient_anonymized.last_name == "Patient"
        assert "anonyme" in patient_anonymized.email
        assert patient_anonymized.phone != "+22501020304"
        assert patient_anonymized.password_hash == "ANONYMIZED_PASSWORD_HASH"

    def test_health_data_access_audit_log(self, client: FlaskClient) -> None:
        """RGPD : L'accès à une fiche de rendez-vous génère un log d'audit."""
        doc_payload = {
            "role": "medecin",
            "first_name": "Albert",
            "last_name": "Camus",
            "phone": "+22501010170",
            "password": "Password123",
        }
        pat_payload = {
            "role": "patient",
            "first_name": "Jean-Paul",
            "last_name": "Sartre",
            "phone": "+22502020270",
            "password": "Password123",
            "gdpr_consent": True,
        }
        doc_headers = self._get_auth_headers(client, doc_payload)
        self._get_auth_headers(client, pat_payload)

        doctor = User.query.filter_by(phone="+22501010170").first()
        patient = User.query.filter_by(phone="+22502020270").first()

        slot_start = datetime.now() + timedelta(days=2)
        slot_end = slot_start + timedelta(minutes=30)
        appt = Appointment(
            doctor_id=doctor.id,
            patient_id=patient.id,
            slot_start=slot_start,
            slot_end=slot_end,
            type=ConsultationType.PRESENTIEL,
            status=AppointmentStatus.CONFIRME,
        )
        db.session.add(appt)
        db.session.commit()

        # Vider les logs d'audit existants pour démarrer le test propre
        AuditLog.query.delete()
        db.session.commit()

        # Consulter le RDV (GET) en tant que médecin
        resp = client.get(f"/api/v1/appointments/{appt.id}", headers=doc_headers)
        assert resp.status_code == 200

        # Vérifier qu'un log d'audit a été créé
        logs = AuditLog.query.filter_by(user_id=doctor.id).all()
        assert len(logs) == 1
        assert logs[0].action == "GET_APPOINTMENT"
        assert logs[0].resource_id == str(appt.id)
