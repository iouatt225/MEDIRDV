"""
MediRDV CI — Modèle ``User``.

Table racine des 3 rôles (médecin, secrétaire, patient).
"""

from __future__ import annotations

from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, Enum, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.extensions import db
from app.models.base import TimestampMixin
from app.models.enums import UserRole


class User(TimestampMixin, db.Model):  # type: ignore[name-defined]
    """Utilisateur de la plateforme MediRDV CI."""

    __tablename__ = "user"

    id = Column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    role = Column(
        Enum(UserRole, name="user_role", create_constraint=False, native_enum=False),
        nullable=False,
    )
    phone = Column(String(20), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # RGPD — BLOC 10 : horodatage du consentement explicite
    gdpr_consent_at = Column(DateTime, nullable=True)

    # --- Relations ---
    doctor_profile = relationship(
        "DoctorProfile",
        back_populates="user",
        uselist=False,
        lazy="joined",
    )
    patient_profile = relationship(
        "PatientProfile",
        back_populates="user",
        uselist=False,
        lazy="joined",
    )

    def __repr__(self) -> str:
        return f"<User {self.id} role={self.role} phone={self.phone}>"
