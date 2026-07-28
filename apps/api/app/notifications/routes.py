"""
MediRDV CI — Routes du module ``notifications``.

Endpoints prévus (BLOC 8) :
- Endpoints internes / admin pour la gestion des notifications.
  La plupart des déclencheurs passent par les tâches Celery (pas par REST).
"""

from __future__ import annotations

from typing import Any
from flask import Blueprint

notifications_bp = Blueprint("notifications", __name__, url_prefix="/api/v1/notifications")


# Les endpoints seront implémentés au BLOC 8.

from flask import jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from app.models import NotificationLog, Appointment
from uuid import UUID

@notifications_bp.route("", methods=["GET"])
@jwt_required()
def get_my_notifications() -> Any:
    """Récupère les 20 derniers logs de notification pour l'utilisateur connecté."""
    current_user_id = UUID(get_jwt_identity())
    
    logs = (
        NotificationLog.query.join(Appointment)
        .filter(
            (Appointment.patient_id == current_user_id) | 
            (Appointment.doctor_id == current_user_id)
        )
        .order_by(NotificationLog.created_at.desc())
        .limit(20)
        .all()
    )
    
    serialized = []
    for log in logs:
        serialized.append({
            "id": str(log.id),
            "appointment_id": str(log.appointment_id),
            "type": log.type.value,
            "trigger": log.trigger.value,
            "status": log.status.value,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })
        
    return jsonify(serialized), 200
