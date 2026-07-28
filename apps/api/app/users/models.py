"""
MediRDV CI — Modèles profils utilisateurs.

- ``DoctorProfile`` : profil étendu du médecin.
- ``PatientProfile`` : profil étendu du patient.
- ``SecretaryDoctor`` : relation many-to-many secrétaire ↔ médecins.
"""

from __future__ import annotations

from uuid import uuid4

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.extensions import db
from app.models.base import TimestampMixin
from app.models.enums import SecretaryDoctorStatus


class DoctorProfile(TimestampMixin, db.Model):  # type: ignore[name-defined]
    """Profil étendu d'un médecin."""

    __tablename__ = "doctor_profile"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    specialty = Column(String(100), nullable=True)
    cabinet_name = Column(String(200), nullable=True)
    address = Column(Text, nullable=True)
    bio = Column(Text, nullable=True)
    # JSON plutôt que ARRAY pour compatibilité SQLite en test
    languages = Column(db.JSON, nullable=True)
    fee = Column(Numeric(10, 2), nullable=True)
    photo_url = Column(String(500), nullable=True)
    cancellation_delay_hours = Column(Integer, default=24, nullable=False)
    latitude = Column(Numeric(10, 6), nullable=True)
    longitude = Column(Numeric(10, 6), nullable=True)

    # --- Relations ---
    user = relationship("User", back_populates="doctor_profile")

    def __repr__(self) -> str:
        return f"<DoctorProfile {self.id} user_id={self.user_id}>"


class PatientProfile(TimestampMixin, db.Model):  # type: ignore[name-defined]
    """Profil étendu d'un patient."""

    __tablename__ = "patient_profile"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    date_of_birth = Column(Date, nullable=True)
    phone_secondary = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)

    # --- Relations ---
    user = relationship("User", back_populates="patient_profile")

    def __repr__(self) -> str:
        return f"<PatientProfile {self.id} user_id={self.user_id}>"


class SecretaryDoctor(TimestampMixin, db.Model):  # type: ignore[name-defined]
    """Relation many-to-many secrétaire ↔ médecins."""

    __tablename__ = "secretary_doctor"
    __table_args__ = (
        UniqueConstraint("secretary_id", "doctor_id", name="uq_secretary_doctor"),
    )

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    secretary_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        nullable=False,
    )
    doctor_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        nullable=False,
    )
    invited_at = Column(DateTime, default=func.now(), nullable=False)
    status = Column(
        Enum(
            SecretaryDoctorStatus,
            name="secretary_doctor_status",
            create_constraint=False,
            native_enum=False,
        ),
        default=SecretaryDoctorStatus.ACTIVE,
        nullable=False,
    )

    # --- Relations ---
    secretary = relationship("User", foreign_keys=[secretary_id])
    doctor = relationship("User", foreign_keys=[doctor_id])

    def __repr__(self) -> str:
        return (
            f"<SecretaryDoctor secretary={self.secretary_id} "
            f"doctor={self.doctor_id} status={self.status}>"
        )
