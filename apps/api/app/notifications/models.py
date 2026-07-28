"""
MediRDV CI — Modèle ``NotificationLog``.

Traçabilité RGPD des envois de notifications (SMS et email).
Chaque entrée est liée à un rendez-vous.
"""

from __future__ import annotations

from uuid import uuid4

from sqlalchemy import Column, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.extensions import db
from app.models.base import TimestampMixin
from app.models.enums import NotificationStatus, NotificationTrigger, NotificationType


class NotificationLog(TimestampMixin, db.Model):  # type: ignore[name-defined]
    """Journal des notifications envoyées."""

    __tablename__ = "notification_log"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    appointment_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("appointment.id", ondelete="CASCADE"),
        nullable=False,
    )
    type = Column(
        Enum(
            NotificationType,
            name="notification_type",
            create_constraint=False,
            native_enum=False,
        ),
        nullable=False,
    )
    trigger = Column(
        Enum(
            NotificationTrigger,
            name="notification_trigger",
            create_constraint=False,
            native_enum=False,
        ),
        nullable=False,
    )
    sent_at = Column(DateTime, nullable=True)
    status = Column(
        Enum(
            NotificationStatus,
            name="notification_status",
            create_constraint=False,
            native_enum=False,
        ),
        nullable=False,
    )

    # --- Relations ---
    appointment = relationship("Appointment", back_populates="notification_logs")

    def __repr__(self) -> str:
        return (
            f"<NotificationLog {self.id} appointment={self.appointment_id} "
            f"type={self.type} trigger={self.trigger} status={self.status}>"
        )
