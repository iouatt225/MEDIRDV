"""
MediRDV CI — Teleconsult integration tests.
"""

from __future__ import annotations

from datetime import datetime, timedelta

from flask.testing import FlaskClient

from app.extensions import db
from app.models import (
    Appointment,
    AppointmentStatus,
    ConsultationType,
    TeleconsultSessionEvent,
    User,
    UserRole,
)


class TestTeleconsultIntegration:
    """Integration coverage for the Daily.co video flow."""

    def _get_auth_headers(self, client: FlaskClient, register_payload: dict) -> dict:
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

        resp_too_early = client.get(
            f"/api/v1/teleconsult/{appt_future.id}/token",
            headers=pat_headers,
        )
        assert resp_too_early.status_code == 422

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

        resp_patient = client.get(
            f"/api/v1/teleconsult/{appt_now.id}/token",
            headers=pat_headers,
        )
        assert resp_patient.status_code == 200
        assert "token" in resp_patient.get_json()

        resp_doc = client.get(
            f"/api/v1/teleconsult/{appt_now.id}/token",
            headers=doc_headers,
        )
        assert resp_doc.status_code == 200

        resp_intruder = client.get(
            f"/api/v1/teleconsult/{appt_now.id}/token",
            headers=intruder_headers,
        )
        assert resp_intruder.status_code == 403

    def test_daily_webhook_ends_meeting(self, client: FlaskClient) -> None:
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

        webhook_payload = {
            "event": "meeting.ended",
            "payload": {"room": "webhook-room-xyz"},
        }

        resp = client.post("/api/v1/teleconsult/webhook", json=webhook_payload)
        assert resp.status_code == 200
        assert resp.get_json() == {"status": "event processed"}

        db.session.refresh(appt)
        assert appt.status == AppointmentStatus.EFFECTUE

        event = TeleconsultSessionEvent.query.filter_by(appointment_id=appt.id).first()
        assert event is not None
        assert event.event_type == "meeting_ended"
        assert event.source == "daily-webhook"

    def test_teleconsult_event_history_roundtrip(self, client: FlaskClient) -> None:
        doc_payload = {
            "role": "medecin",
            "first_name": "Maya",
            "last_name": "Soul",
            "phone": "+22501110011",
            "password": "Password123",
        }
        pat_payload = {
            "role": "patient",
            "first_name": "Noah",
            "last_name": "Zen",
            "phone": "+22502220022",
            "password": "Password123",
            "gdpr_consent": True,
        }

        doc_headers = self._get_auth_headers(client, doc_payload)
        pat_headers = self._get_auth_headers(client, pat_payload)

        doctor = User.query.filter_by(phone="+22501110011").first()
        patient = User.query.filter_by(phone="+22502220022").first()

        slot_start = datetime.now() - timedelta(minutes=5)
        slot_end = slot_start + timedelta(minutes=40)
        appt = Appointment(
            doctor_id=doctor.id,
            patient_id=patient.id,
            slot_start=slot_start,
            slot_end=slot_end,
            type=ConsultationType.VIDEO,
            status=AppointmentStatus.CONFIRME,
            video_url="https://medirdv.daily.co/history-room-1",
        )
        db.session.add(appt)
        db.session.commit()

        token_resp = client.get(f"/api/v1/teleconsult/{appt.id}/token", headers=doc_headers)
        assert token_resp.status_code == 200

        create_resp = client.post(
            f"/api/v1/teleconsult/{appt.id}/events",
            headers=pat_headers,
            json={
                "event_type": "prejoin_ready",
                "label": "Pre-join valide",
                "detail": "Camera et micro prets.",
                "source": "frontend",
            },
        )
        assert create_resp.status_code == 201

        history_resp = client.get(f"/api/v1/teleconsult/{appt.id}/events", headers=pat_headers)
        assert history_resp.status_code == 200
        history = history_resp.get_json()["events"]
        assert len(history) >= 2
        assert any(item["event_type"] == "token_issued" for item in history)
        assert any(item["event_type"] == "prejoin_ready" for item in history)
