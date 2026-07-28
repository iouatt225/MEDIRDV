"""
MediRDV CI — Modèle ``AuditLog`` pour la conformité RGPD.

Journalise tous les accès aux fiches patients et aux rendez-vous.
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from app.extensions import db


class AuditLog(db.Model):  # type: ignore[name-defined]
    """Journal d'audit des accès aux données de santé."""

    __tablename__ = "audit_log"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(PG_UUID(as_uuid=True), nullable=True)  # Auteur de l'action
    action = Column(String(255), nullable=False)  # ex: "GET_APPOINTMENT"
    resource_id = Column(String(255), nullable=True)  # ID de la ressource consultée
    accessed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)

    def __repr__(self) -> str:
        return (
            f"<AuditLog {self.id} user={self.user_id} "
            f"action={self.action} resource={self.resource_id}>"
        )
