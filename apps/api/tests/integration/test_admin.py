"""
Tests d'intégration pour le module admin.
"""

from __future__ import annotations

from datetime import datetime, timedelta

from flask.testing import FlaskClient

from app.extensions import bcrypt, db
from app.models import (
    Appointment,
    AppointmentStatus,
    ConsultationType,
    DoctorProfile,
    PatientProfile,
    User,
    UserRole,
)


class TestAdminIntegration:
    """Vérifie l'accès au tableau de bord admin."""

    def _create_admin(self) -> User:
        admin = User(
            role=UserRole.ADMIN,
            phone="+22590000001",
            email="admin@test.ci",
            password_hash=bcrypt.generate_password_hash("Admin123").decode("utf-8"),
            first_name="Ada",
            last_name="Min",
            is_active=True,
        )
        db.session.add(admin)
        db.session.commit()
        return admin

    def _create_doctor_patient_and_appointment(self) -> Appointment:
        doctor = User(
            role=UserRole.MEDECIN,
            phone="+22590000002",
            email="doctor@test.ci",
            password_hash=bcrypt.generate_password_hash("Password123").decode("utf-8"),
            first_name="Dr",
            last_name="Test",
            is_active=True,
        )
        patient = User(
            role=UserRole.PATIENT,
            phone="+22590000003",
            email="patient@test.ci",
            password_hash=bcrypt.generate_password_hash("Password123").decode("utf-8"),
            first_name="Pat",
            last_name="Ient",
            is_active=True,
        )
        db.session.add_all([doctor, patient])
        db.session.flush()

        db.session.add(
            DoctorProfile(
                user_id=doctor.id,
                specialty="Cardiologie",
                cabinet_name="Cabinet Test",
                address="Abidjan",
                cancellation_delay_hours=24,
            )
        )
        db.session.add(
            PatientProfile(
                user_id=patient.id,
                address="Cocody",
            )
        )

        appointment = Appointment(
            doctor_id=doctor.id,
            patient_id=patient.id,
            slot_start=datetime.utcnow() + timedelta(days=1),
            slot_end=datetime.utcnow() + timedelta(days=1, minutes=30),
            type=ConsultationType.VIDEO,
            status=AppointmentStatus.CONFIRME,
            reason="Contrôle",
            video_url="https://daily.co/room-test",
            version_token=1,
        )
        db.session.add(appointment)
        db.session.commit()
        return appointment

    def test_admin_dashboard_is_accessible(self, client: FlaskClient) -> None:
        admin = self._create_admin()
        self._create_doctor_patient_and_appointment()

        login = client.post(
            "/api/v1/auth/login",
            json={"phone": admin.phone, "password": "Admin123"},
        )
        assert login.status_code == 200
        token = login.get_json()["access_token"]

        resp = client.get(
            "/api/v1/admin/dashboard",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.get_json()

        assert data["overview"]["admins"] == 1
        assert data["overview"]["doctors"] == 1
        assert data["overview"]["patients"] == 1
        assert data["overview"]["appointments_total"] == 1
        assert data["overview"]["appointments_confirmed"] == 1
        assert data["recent_users"]
        assert data["recent_appointments"]
        assert data["system"]["database"] in {"connected", "disconnected"}

    def test_admin_dashboard_is_forbidden_for_doctor(self, client: FlaskClient) -> None:
        doctor = User(
            role=UserRole.MEDECIN,
            phone="+22590000004",
            email="doctor2@test.ci",
            password_hash=bcrypt.generate_password_hash("Password123").decode("utf-8"),
            first_name="Doc",
            last_name="Tor",
            is_active=True,
        )
        db.session.add(doctor)
        db.session.commit()

        login = client.post(
            "/api/v1/auth/login",
            json={"phone": doctor.phone, "password": "Password123"},
        )
        token = login.get_json()["access_token"]

        resp = client.get(
            "/api/v1/admin/dashboard",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 403
        assert resp.get_json()["error"] == "forbidden"

    def test_admin_users_list_and_status_toggle(self, client: FlaskClient) -> None:
        admin = self._create_admin()
        self._create_doctor_patient_and_appointment()

        login = client.post(
            "/api/v1/auth/login",
            json={"phone": admin.phone, "password": "Admin123"},
        )
        assert login.status_code == 200
        token = login.get_json()["access_token"]

        list_resp = client.get(
            "/api/v1/admin/users",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert list_resp.status_code == 200
        data = list_resp.get_json()
        assert data["total"] == 3
        assert data["summary"]
        summary_map = {item["role"]: item["count"] for item in data["summary"]}
        assert summary_map["admin"] == 1
        assert summary_map["medecin"] == 1
        assert summary_map["patient"] == 1

        doctor = User.query.filter_by(phone="+22590000002").first()
        assert doctor is not None

        disable_resp = client.patch(
            f"/api/v1/admin/users/{doctor.id}/status",
            headers={"Authorization": f"Bearer {token}"},
            json={"is_active": False},
        )
        assert disable_resp.status_code == 200
        assert disable_resp.get_json()["user"]["is_active"] is False

        reactivate_resp = client.patch(
            f"/api/v1/admin/users/{doctor.id}/status",
            headers={"Authorization": f"Bearer {token}"},
            json={"is_active": True},
        )
        assert reactivate_resp.status_code == 200
        assert reactivate_resp.get_json()["user"]["is_active"] is True

        detail_resp = client.get(
            f"/api/v1/admin/users/{doctor.id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert detail_resp.status_code == 200
        detail_data = detail_resp.get_json()
        assert detail_data["user"]["id"] == str(doctor.id)
        assert detail_data["actions"]["can_enable"] is False
        assert detail_data["related_appointments"]
        assert len(detail_data["action_history"]) >= 2

        self_disable_resp = client.patch(
            f"/api/v1/admin/users/{admin.id}/status",
            headers={"Authorization": f"Bearer {token}"},
            json={"is_active": False},
        )
        assert self_disable_resp.status_code == 403
        assert self_disable_resp.get_json()["error"] == "forbidden"
