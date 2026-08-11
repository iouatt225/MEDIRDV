"""
MediRDV CI — Événements persistants de téléconsultation.

Historise les étapes clés d'une session vidéo afin de conserver un suivi
consultable après fermeture de la page ou rechargement du navigateur.
"""

from __future__ import annotations

from uuid import uuid4

from sqlalchemy import Column, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.extensions import db
from app.models.base import TimestampMixin


class TeleconsultSessionEvent(TimestampMixin, db.Model):  # type: ignore[name-defined]
    """Journal persistant des événements d'une session vidéo."""

    __tablename__ = "teleconsult_session_event"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    appointment_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("appointment.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="SET NULL"),
        nullable=True,
    )
    role = Column(String(32), nullable=True)
    event_type = Column(String(80), nullable=False)
    label = Column(String(120), nullable=False)
    detail = Column(Text, nullable=True)
    source = Column(String(80), nullable=False, default="frontend")

    appointment = relationship("Appointment", back_populates="teleconsult_events")
    user = relationship("User", lazy="joined")

    def __repr__(self) -> str:
        return (
            f"<TeleconsultSessionEvent {self.id} appointment={self.appointment_id} "
            f"event_type={self.event_type}>"
        )
