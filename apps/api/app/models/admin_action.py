"""
MediRDV CI — Journal des actions d'administration.
"""

from __future__ import annotations

from uuid import uuid4

from sqlalchemy import Boolean, Column, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.extensions import db
from app.models.base import TimestampMixin


class AdminActionLog(TimestampMixin, db.Model):  # type: ignore[name-defined]
    """Historise les actions sensibles réalisées par un administrateur."""

    __tablename__ = "admin_action_log"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    admin_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="RESTRICT"),
        nullable=False,
    )
    target_user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="RESTRICT"),
        nullable=False,
    )
    action = Column(String(120), nullable=False)
    previous_is_active = Column(Boolean, nullable=True)
    new_is_active = Column(Boolean, nullable=True)
    note = Column(Text, nullable=True)

    admin = relationship("User", foreign_keys=[admin_id], lazy="joined")
    target_user = relationship("User", foreign_keys=[target_user_id], lazy="joined")

    def __repr__(self) -> str:
        return (
            f"<AdminActionLog {self.id} admin={self.admin_id} "
            f"target={self.target_user_id} action={self.action}>"
        )
