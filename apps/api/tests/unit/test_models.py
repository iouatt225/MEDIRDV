"""
MediRDV CI — Tests unitaires des modèles SQLAlchemy.

Couvre la création d'instances, les contraintes de clé étrangère,
les contraintes d'unicité et la validation des enums.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from uuid import uuid4

import pytest
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import (
    Appointment,
    AppointmentStatus,
    AvailabilitySlot,
    BlockedSlot,
    ConsultationType,
    DoctorProfile,
    NotificationLog,
    NotificationStatus,
    NotificationTrigger,
    NotificationType,
    PatientProfile,
    SecretaryDoctor,
    SecretaryDoctorStatus,
    User,
    UserRole,
)


# ------------------------------------------------------------------ #
#  Helpers
# ------------------------------------------------------------------ #


def _make_user(
    role: UserRole = UserRole.MEDECIN,
    phone: str | None = None,
    email: str | None = None,
) -> User:
    """Crée un User avec des valeurs par défaut."""
    uid = uuid4()
    return User(
        id=uid,
        role=role,
        phone=phone or f"+225{uid.hex[:10]}",
        email=email,
        password_hash="$2b$12$fakehashfortest",
        first_name="Test",
        last_name="User",
    )


# ------------------------------------------------------------------ #
#  User
# ------------------------------------------------------------------ #


class TestUserModel:
    """Tests du modèle User."""

    def test_create_user(self, app) -> None:
        """Un User peut être créé avec un UUID auto-généré."""
        user = _make_user()
        db.session.add(user)
        db.session.flush()

        assert user.id is not None
        assert user.role == UserRole.MEDECIN
        assert user.is_active is True

    def test_user_phone_unique(self, app) -> None:
        """Deux utilisateurs avec le même téléphone déclenchent IntegrityError."""
        phone = "+22501234567"
        user1 = _make_user(phone=phone)
        user2 = _make_user(phone=phone)

        db.session.add(user1)
        db.session.flush()
        db.session.add(user2)

        with pytest.raises(IntegrityError):
            db.session.flush()
        db.session.rollback()

    def test_user_role_enum_values(self, app) -> None:
        """Les 3 rôles sont acceptés."""
        for role in UserRole:
            user = _make_user(role=role)
            db.session.add(user)
            db.session.flush()
            assert user.role == role
            db.session.rollback()

    def test_user_repr(self, app) -> None:
        """__repr__ retourne une chaîne lisible."""
        user = _make_user()
        assert "User" in repr(user)


# ------------------------------------------------------------------ #
#  DoctorProfile
# ------------------------------------------------------------------ #


class TestDoctorProfileModel:
    """Tests du modèle DoctorProfile."""

    def test_create_doctor_profile(self, app) -> None:
        """Un DoctorProfile est lié à un User médecin."""
        user = _make_user(role=UserRole.MEDECIN)
        db.session.add(user)
        db.session.flush()

        profile = DoctorProfile(
            user_id=user.id,
            specialty="Cardiologie",
            cabinet_name="Cabinet Cœur",
            cancellation_delay_hours=48,
        )
        db.session.add(profile)
        db.session.flush()

        assert profile.id is not None
        assert profile.user_id == user.id
        assert profile.cancellation_delay_hours == 48

    def test_doctor_profile_default_cancellation(self, app) -> None:
        """Le délai d'annulation par défaut est de 24 heures."""
        user = _make_user(role=UserRole.MEDECIN)
        db.session.add(user)
        db.session.flush()

        profile = DoctorProfile(user_id=user.id)
        db.session.add(profile)
        db.session.flush()

        assert profile.cancellation_delay_hours == 24


# ------------------------------------------------------------------ #
#  PatientProfile
# ------------------------------------------------------------------ #


class TestPatientProfileModel:
    """Tests du modèle PatientProfile."""

    def test_create_patient_profile(self, app) -> None:
        """Un PatientProfile est lié à un User patient."""
        user = _make_user(role=UserRole.PATIENT)
        db.session.add(user)
        db.session.flush()

        profile = PatientProfile(
            user_id=user.id,
            date_of_birth=date(1990, 5, 15),
            phone_secondary="+22507654321",
            address="Cocody, Abidjan",
        )
        db.session.add(profile)
        db.session.flush()

        assert profile.id is not None
        assert profile.date_of_birth == date(1990, 5, 15)


# ------------------------------------------------------------------ #
#  SecretaryDoctor
# ------------------------------------------------------------------ #


class TestSecretaryDoctorModel:
    """Tests du modèle SecretaryDoctor."""

    def test_secretary_doctor_link(self, app) -> None:
        """Un SecretaryDoctor relie une secrétaire à un médecin."""
        secretary = _make_user(role=UserRole.SECRETAIRE)
        doctor = _make_user(role=UserRole.MEDECIN)
        db.session.add_all([secretary, doctor])
        db.session.flush()

        link = SecretaryDoctor(
            secretary_id=secretary.id,
            doctor_id=doctor.id,
        )
        db.session.add(link)
        db.session.flush()

        assert link.id is not None
        assert link.status == SecretaryDoctorStatus.ACTIVE

    def test_secretary_doctor_unique(self, app) -> None:
        """Un même couple secretary/doctor ne peut exister en double."""
        secretary = _make_user(role=UserRole.SECRETAIRE)
        doctor = _make_user(role=UserRole.MEDECIN)
        db.session.add_all([secretary, doctor])
        db.session.flush()

        link1 = SecretaryDoctor(
            secretary_id=secretary.id,
            doctor_id=doctor.id,
        )
        link2 = SecretaryDoctor(
            secretary_id=secretary.id,
            doctor_id=doctor.id,
        )
        db.session.add(link1)
        db.session.flush()
        db.session.add(link2)

        with pytest.raises(IntegrityError):
            db.session.flush()
        db.session.rollback()


# ------------------------------------------------------------------ #
#  AvailabilitySlot
# ------------------------------------------------------------------ #


class TestAvailabilitySlotModel:
    """Tests du modèle AvailabilitySlot."""

    def test_create_availability_slot(self, app) -> None:
        """Un créneau est créé avec jour, heures et type."""
        doctor = _make_user(role=UserRole.MEDECIN)
        db.session.add(doctor)
        db.session.flush()

        slot = AvailabilitySlot(
            doctor_id=doctor.id,
            day_of_week=0,  # Lundi
            start_time=time(9, 0),
            end_time=time(12, 0),
            consultation_type=ConsultationType.PRESENTIEL,
            duration_min=30,
        )
        db.session.add(slot)
        db.session.flush()

        assert slot.id is not None
        assert slot.is_recurring is True


# ------------------------------------------------------------------ #
#  BlockedSlot
# ------------------------------------------------------------------ #


class TestBlockedSlotModel:
    """Tests du modèle BlockedSlot."""

    def test_create_blocked_slot(self, app) -> None:
        """Un blocage couvre une plage datetime avec une raison."""
        doctor = _make_user(role=UserRole.MEDECIN)
        db.session.add(doctor)
        db.session.flush()

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        blocked = BlockedSlot(
            doctor_id=doctor.id,
            start_datetime=now,
            end_datetime=now + timedelta(days=7),
            reason="Congés annuels",
        )
        db.session.add(blocked)
        db.session.flush()

        assert blocked.id is not None
        assert blocked.reason == "Congés annuels"


# ------------------------------------------------------------------ #
#  Appointment
# ------------------------------------------------------------------ #


class TestAppointmentModel:
    """Tests du modèle Appointment."""

    def test_create_appointment(self, app) -> None:
        """Un Appointment est créé avec version_token=1 par défaut."""
        doctor = _make_user(role=UserRole.MEDECIN)
        patient = _make_user(role=UserRole.PATIENT)
        db.session.add_all([doctor, patient])
        db.session.flush()

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        appt = Appointment(
            doctor_id=doctor.id,
            patient_id=patient.id,
            slot_start=now,
            slot_end=now + timedelta(minutes=30),
            type=ConsultationType.VIDEO,
        )
        db.session.add(appt)
        db.session.flush()

        assert appt.id is not None
        assert appt.version_token == 1
        assert appt.status == AppointmentStatus.CONFIRME

    def test_appointment_status_enum(self, app) -> None:
        """Tous les statuts du cycle de vie sont acceptés."""
        doctor = _make_user(role=UserRole.MEDECIN)
        patient = _make_user(role=UserRole.PATIENT)
        db.session.add_all([doctor, patient])
        db.session.flush()

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        for status in AppointmentStatus:
            appt = Appointment(
                doctor_id=doctor.id,
                patient_id=patient.id,
                slot_start=now,
                slot_end=now + timedelta(minutes=30),
                type=ConsultationType.PRESENTIEL,
                status=status,
            )
            db.session.add(appt)
            db.session.flush()
            assert appt.status == status
            db.session.rollback()
            # Re-add users after rollback
            db.session.add_all([doctor, patient])
            db.session.flush()

    def test_appointment_fk_constraint(self, app) -> None:
        """Un Appointment avec un doctor_id inexistant est rejeté."""
        db.session.execute(db.text("PRAGMA foreign_keys=ON"))
        patient = _make_user(role=UserRole.PATIENT)
        db.session.add(patient)
        db.session.flush()

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        appt = Appointment(
            doctor_id=uuid4(),  # ID inexistant
            patient_id=patient.id,
            slot_start=now,
            slot_end=now + timedelta(minutes=30),
            type=ConsultationType.PRESENTIEL,
        )
        db.session.add(appt)

        with pytest.raises(IntegrityError):
            db.session.flush()
        db.session.rollback()


# ------------------------------------------------------------------ #
#  NotificationLog
# ------------------------------------------------------------------ #


class TestNotificationLogModel:
    """Tests du modèle NotificationLog."""

    def test_notification_log_creation(self, app) -> None:
        """Un NotificationLog est lié à un Appointment."""
        doctor = _make_user(role=UserRole.MEDECIN)
        patient = _make_user(role=UserRole.PATIENT)
        db.session.add_all([doctor, patient])
        db.session.flush()

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        appt = Appointment(
            doctor_id=doctor.id,
            patient_id=patient.id,
            slot_start=now,
            slot_end=now + timedelta(minutes=30),
            type=ConsultationType.PRESENTIEL,
        )
        db.session.add(appt)
        db.session.flush()

        log = NotificationLog(
            appointment_id=appt.id,
            type=NotificationType.SMS,
            trigger=NotificationTrigger.CONFIRM,
            sent_at=now,
            status=NotificationStatus.SENT,
        )
        db.session.add(log)
        db.session.flush()

        assert log.id is not None
        assert log.appointment_id == appt.id


# ------------------------------------------------------------------ #
#  TimestampMixin
# ------------------------------------------------------------------ #


class TestTimestampMixin:
    """Tests du mixin created_at / updated_at."""

    def test_timestamp_mixin(self, app) -> None:
        """created_at et updated_at sont renseignés automatiquement."""
        user = _make_user()
        db.session.add(user)
        db.session.flush()

        # En SQLite, func.now() s'exécute côté serveur.
        # On vérifie que les colonnes ne sont pas None.
        assert user.created_at is not None
        assert user.updated_at is not None
