"""
MediRDV CI — Controllers and routes for the teleconsult module.
"""

from __future__ import annotations

from datetime import datetime, timedelta
import logging
from typing import Any
from uuid import UUID

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from werkzeug.exceptions import Forbidden, NotFound, UnprocessableEntity

from app.extensions import db
from app.models import Appointment, AppointmentStatus, TeleconsultSessionEvent, User, UserRole
from app.notifications.tasks import send_post_consultation_summary_task
from app.teleconsult.providers.daily_client import generate_meeting_token

logger = logging.getLogger(__name__)

teleconsult_bp = Blueprint("teleconsult", __name__, url_prefix="/api/v1/teleconsult")


def _get_appointment_or_404(appointment_id: str) -> Appointment:
    try:
        appt_uuid = UUID(appointment_id)
    except ValueError:
        raise NotFound("Rendez-vous introuvable.")

    appt = db.session.get(Appointment, appt_uuid)
    if not appt:
        raise NotFound("Rendez-vous introuvable.")
    return appt


def _assert_participant_access(appt: Appointment, current_user_id: UUID, current_user_role: str | None) -> None:
    if current_user_role == UserRole.PATIENT.value:
        if appt.patient_id != current_user_id:
            raise Forbidden("Vous ne participez pas a ce rendez-vous.")
    elif current_user_role == UserRole.MEDECIN.value:
        if appt.doctor_id != current_user_id:
            raise Forbidden("Vous n'etes pas le medecin de ce rendez-vous.")
    else:
        raise Forbidden("Role non autorise pour acceder aux visioconferences.")


def _serialize_teleconsult_event(event: TeleconsultSessionEvent) -> dict[str, Any]:
    user_name = None
    if event.user:
        user_name = f"{event.user.first_name} {event.user.last_name}"

    return {
        "id": str(event.id),
        "appointment_id": str(event.appointment_id),
        "user_id": str(event.user_id) if event.user_id else None,
        "user_name": user_name,
        "role": event.role,
        "event_type": event.event_type,
        "label": event.label,
        "detail": event.detail,
        "source": event.source,
        "created_at": event.created_at.isoformat() if event.created_at else None,
    }


def _log_teleconsult_event(
    appt: Appointment,
    *,
    event_type: str,
    label: str,
    detail: str | None = None,
    source: str = "frontend",
    user_id: UUID | None = None,
    role: str | None = None,
) -> TeleconsultSessionEvent:
    event = TeleconsultSessionEvent(
        appointment_id=appt.id,
        user_id=user_id,
        role=role,
        event_type=event_type,
        label=label,
        detail=detail,
        source=source,
    )
    db.session.add(event)
    return event


@teleconsult_bp.route("/<string:appointment_id>/token", methods=["GET"])
@jwt_required()
def get_meeting_token(appointment_id: str) -> Any:
    """Generate a temporary token for the video room."""
    current_user_id = UUID(get_jwt_identity())
    current_user_role = get_jwt().get("role")
    appt = _get_appointment_or_404(appointment_id)
    _assert_participant_access(appt, current_user_id, current_user_role)

    now = datetime.now()
    if now < appt.slot_start - timedelta(minutes=15) or now > appt.slot_end + timedelta(minutes=15):
        raise UnprocessableEntity(
            "The video room is only available within a +/- 15 minute window around the appointment."
        )

    if not appt.video_url:
        raise UnprocessableEntity("This appointment is not configured for video.")

    room_name = appt.video_url.split("/")[-1]
    is_owner = current_user_role == UserRole.MEDECIN.value

    user = db.session.get(User, current_user_id)
    user_name = f"{user.first_name} {user.last_name}" if user else "Utilisateur"
    expiry_ts = int((appt.slot_end + timedelta(minutes=15)).timestamp())

    token = generate_meeting_token(room_name, is_owner, user_name, expiry_ts)
    _log_teleconsult_event(
        appt,
        event_type="token_issued",
        label="Acces video autorise",
        detail="Un jeton Daily a ete genere pour la session.",
        source="backend",
        user_id=current_user_id,
        role=current_user_role,
    )
    db.session.commit()

    return jsonify({"token": token, "video_url": appt.video_url}), 200


@teleconsult_bp.route("/<string:appointment_id>/events", methods=["GET"])
@jwt_required()
def list_teleconsult_events(appointment_id: str) -> Any:
    """Return the persistent event history for a video appointment."""
    current_user_id = UUID(get_jwt_identity())
    current_user_role = get_jwt().get("role")
    appt = _get_appointment_or_404(appointment_id)
    _assert_participant_access(appt, current_user_id, current_user_role)

    events = (
        TeleconsultSessionEvent.query.filter_by(appointment_id=appt.id)
        .order_by(TeleconsultSessionEvent.created_at.asc(), TeleconsultSessionEvent.id.asc())
        .all()
    )
    return jsonify({"events": [_serialize_teleconsult_event(event) for event in events]}), 200


@teleconsult_bp.route("/<string:appointment_id>/events", methods=["POST"])
@jwt_required()
def create_teleconsult_event(appointment_id: str) -> Any:
    """Add a persistent event to the video session history."""
    current_user_id = UUID(get_jwt_identity())
    current_user_role = get_jwt().get("role")
    appt = _get_appointment_or_404(appointment_id)
    _assert_participant_access(appt, current_user_id, current_user_role)

    payload = request.get_json() or {}
    event_type = str(payload.get("event_type") or "").strip()
    label = str(payload.get("label") or "").strip()
    detail = payload.get("detail")
    source = str(payload.get("source") or "frontend").strip() or "frontend"

    if not event_type or not label:
        raise UnprocessableEntity("event_type and label are required.")

    event = _log_teleconsult_event(
        appt,
        event_type=event_type,
        label=label,
        detail=str(detail).strip() if detail is not None else None,
        source=source,
        user_id=current_user_id,
        role=current_user_role,
    )
    db.session.commit()

    return jsonify({"event": _serialize_teleconsult_event(event)}), 201


@teleconsult_bp.route("/webhook", methods=["POST"])
def daily_webhook() -> Any:
    """Webhook used to capture Daily.co events."""
    event_data = request.get_json() or {}
    event_type = event_data.get("event")

    if event_type == "meeting.ended":
        payload = event_data.get("payload", {})
        room_name = payload.get("room")
        if room_name:
            appt = Appointment.query.filter(Appointment.video_url.like(f"%/{room_name}")).first()

            if appt and appt.status == AppointmentStatus.CONFIRME:
                appt.status = AppointmentStatus.EFFECTUE
                appt.version_token += 1
                _log_teleconsult_event(
                    appt,
                    event_type="meeting_ended",
                    label="Session terminee",
                    detail="Daily.co a notifie la fin de la reunion.",
                    source="daily-webhook",
                )
                db.session.commit()

                send_post_consultation_summary_task.delay(str(appt.id))
                logger.info(
                    "Meeting termine pour le rendez-vous %s, statut mis a EFFECTUE.",
                    appt.id,
                )

    return jsonify({"status": "event processed"}), 200
