"""
MediRDV CI — Modèles agenda.

- ``AvailabilitySlot`` : créneaux récurrents d'un médecin.
- ``BlockedSlot`` : plages bloquées (congés, formations).
"""

from __future__ import annotations

from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Time,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from app.extensions import db
from app.models.base import TimestampMixin
from app.models.enums import ConsultationType


class AvailabilitySlot(TimestampMixin, db.Model):  # type: ignore[name-defined]
    """Créneau de disponibilité récurrent d'un médecin."""

    __tablename__ = "availability_slot"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    doctor_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        nullable=False,
    )
    day_of_week = Column(Integer, nullable=False)  # 0 = lundi, 6 = dimanche
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    consultation_type = Column(
        Enum(
            ConsultationType,
            name="consultation_type",
            create_constraint=False,
            native_enum=False,
        ),
        nullable=False,
    )
    duration_min = Column(Integer, default=30, nullable=False)
    is_recurring = Column(Boolean, default=True, nullable=False)

    # --- Relations ---
    doctor = db.relationship("User", foreign_keys=[doctor_id])

    def __repr__(self) -> str:
        return (
            f"<AvailabilitySlot {self.id} doctor={self.doctor_id} "
            f"day={self.day_of_week} {self.start_time}-{self.end_time}>"
        )


class BlockedSlot(TimestampMixin, db.Model):  # type: ignore[name-defined]
    """Plage horaire bloquée par un médecin (congés, formations)."""

    __tablename__ = "blocked_slot"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    doctor_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        nullable=False,
    )
    start_datetime = Column(DateTime, nullable=False)
    end_datetime = Column(DateTime, nullable=False)
    reason = Column(String(255), nullable=True)

    # --- Relations ---
    doctor = db.relationship("User", foreign_keys=[doctor_id])

    def __repr__(self) -> str:
        return (
            f"<BlockedSlot {self.id} doctor={self.doctor_id} "
            f"{self.start_datetime} → {self.end_datetime}>"
        )
