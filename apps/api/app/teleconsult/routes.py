"""
MediRDV CI — Contrôleurs et routes pour le module ``teleconsult``.
"""

from __future__ import annotations

from datetime import datetime, timedelta
import logging
from typing import Any
from uuid import UUID

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, get_jwt, jwt_required
from werkzeug.exceptions import Forbidden, NotFound, UnprocessableEntity

from app.extensions import db
from app.models import Appointment, AppointmentStatus, User, UserRole
from app.notifications.tasks import send_post_consultation_summary_task
from app.teleconsult.providers.daily_client import generate_meeting_token

logger = logging.getLogger(__name__)

teleconsult_bp = Blueprint("teleconsult", __name__, url_prefix="/api/v1/teleconsult")


@teleconsult_bp.route("/<string:appointment_id>/token", methods=["GET"])
@jwt_required()
def get_meeting_token(appointment_id: str) -> Any:
    """Génère un token d'accès temporaire restrictif pour la visioconférence."""
    current_user_id = UUID(get_jwt_identity())
    claims = get_jwt()
    current_user_role = claims.get("role")

    try:
        appt_uuid = UUID(appointment_id)
    except ValueError:
        raise NotFound("Rendez-vous introuvable.")

    appt = db.session.get(Appointment, appt_uuid)
    if not appt:
        raise NotFound("Rendez-vous introuvable.")

    # 1. Vérification des rôles et de la participation au RDV
    if current_user_role == UserRole.PATIENT.value:
        if appt.patient_id != current_user_id:
            raise Forbidden("Vous ne participez pas à ce rendez-vous.")
    elif current_user_role == UserRole.MEDECIN.value:
        if appt.doctor_id != current_user_id:
            raise Forbidden("Vous n'êtes pas le médecin de ce rendez-vous.")
    else:
        raise Forbidden("Rôle non autorisé pour accéder aux visioconférences.")

    # 2. Vérification de la fenêtre de temps (RDV ± 15 minutes)
    now = datetime.now()
    if now < appt.slot_start - timedelta(minutes=15) or now > appt.slot_end + timedelta(minutes=15):
        raise UnprocessableEntity(
            "Le salon vidéo n'est accessible que dans une fenêtre de ±15 minutes autour du rendez-vous."
        )

    # 3. Extraction du nom de salon depuis l'URL enregistrée
    if not appt.video_url:
        raise UnprocessableEntity("Ce rendez-vous n'est pas configuré pour une visioconférence.")

    room_name = appt.video_url.split("/")[-1]
    is_owner = (current_user_role == UserRole.MEDECIN.value)

    # Récupérer le nom complet de l'utilisateur pour Daily
    user = db.session.get(User, current_user_id)
    user_name = f"{user.first_name} {user.last_name}" if user else "Utilisateur"

    # Expiration du token (fin de la fenêtre de 15 minutes après le RDV)
    expiry_ts = int((appt.slot_end + timedelta(minutes=15)).timestamp())

    token = generate_meeting_token(room_name, is_owner, user_name, expiry_ts)

    return jsonify({"token": token, "video_url": appt.video_url}), 200


@teleconsult_bp.route("/webhook", methods=["POST"])
def daily_webhook() -> Any:
    """Webhook pour capter les événements de fin de session Daily.co."""
    event_data = request.get_json() or {}
    event_type = event_data.get("event")

    # On écoute la fin du meeting
    if event_type == "meeting.ended":
        payload = event_data.get("payload", {})
        room_name = payload.get("room")
        if room_name:
            # Retrouver le rendez-vous lié à cette room
            # match avec like sur la fin de l'URL
            appt = Appointment.query.filter(
                Appointment.video_url.like(f"%/{room_name}")
            ).first()

            if appt and appt.status == AppointmentStatus.CONFIRME:
                # Mettre à jour le statut du RDV
                appt.status = AppointmentStatus.EFFECTUE
                appt.version_token += 1
                db.session.commit()

                # Déclencher le récapitulatif post-consultation Celery
                send_post_consultation_summary_task.delay(str(appt.id))
                logger.info(
                    "Meeting terminé pour le rendez-vous %s, statut mis à EFFECTUE.",
                    appt.id,
                )

    return jsonify({"status": "event processed"}), 200
