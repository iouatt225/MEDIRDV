"""
MediRDV CI — Modèle ``Appointment``.

Cœur fonctionnel de la plateforme. Chaque rendez-vous porte un
``version_token`` pour le verrouillage optimiste (BLOC 5).
"""

from __future__ import annotations

from uuid import uuid4

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.extensions import db
from app.models.base import TimestampMixin
from app.models.enums import AppointmentStatus, ConsultationType


class Appointment(TimestampMixin, db.Model):  # type: ignore[name-defined]
    """Rendez-vous médical."""

    __tablename__ = "appointment"
    __table_args__ = (
        # Index composite pour les requêtes agenda (fréquentes)
        Index("ix_appointment_doctor_slot", "doctor_id", "slot_start"),
        # Index sur le statut pour le filtrage
        Index("ix_appointment_status", "status"),
        # Contrainte d'unicité sur les rendez-vous actifs (confirmés)
        Index(
            "uq_active_appointment_slot",
            "doctor_id",
            "slot_start",
            unique=True,
            postgresql_where=db.text("status = 'CONFIRME'"),
            sqlite_where=db.text("status = 'CONFIRME'"),
        ),
    )

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    doctor_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="RESTRICT"),
        nullable=False,
    )
    patient_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="RESTRICT"),
        nullable=False,
    )
    slot_start = Column(DateTime, nullable=False)
    slot_end = Column(DateTime, nullable=False)
    type = Column(
        Enum(
            ConsultationType,
            name="appointment_consultation_type",
            create_constraint=False,
            native_enum=False,
        ),
        nullable=False,
    )
    status = Column(
        Enum(
            AppointmentStatus,
            name="appointment_status",
            create_constraint=False,
            native_enum=False,
        ),
        default=AppointmentStatus.CONFIRME,
        nullable=False,
    )
    reason = Column(Text, nullable=True)
    video_url = Column(String(500), nullable=True)

    # Verrouillage optimiste — incrémenté à chaque mise à jour
    version_token = Column(Integer, default=1, nullable=False)

    # --- Relations ---
    doctor = relationship("User", foreign_keys=[doctor_id])
    patient = relationship("User", foreign_keys=[patient_id])
    notification_logs = relationship(
        "NotificationLog",
        back_populates="appointment",
        lazy="dynamic",
    )
    teleconsult_events = relationship(
        "TeleconsultSessionEvent",
        back_populates="appointment",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return (
            f"<Appointment {self.id} doctor={self.doctor_id} "
            f"patient={self.patient_id} status={self.status}>"
        )
