"""
MediRDV CI — Endpoints et contrôleurs du module ``agenda``.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import EXCLUDE, ValidationError
from werkzeug.exceptions import BadRequest, NotFound

from app.agenda.schemas import (
    AvailabilityQuerySchema,
    AvailabilitySlotSchema,
    BlockSlotSchema,
)
from app.agenda.services import (
    block_slots,
    calculate_availabilities,
    create_slot,
    delete_slot,
    get_slots,
    update_slot,
)
from app.auth.decorators import require_role

agenda_bp = Blueprint("agenda", __name__, url_prefix="/api/v1")


def serialize_slot(slot: Any) -> dict[str, Any]:
    """Helper de sérialisation pour AvailabilitySlot."""
    return {
        "id": str(slot.id),
        "doctor_id": str(slot.doctor_id),
        "day_of_week": slot.day_of_week,
        "start_time": slot.start_time.isoformat(),
        "end_time": slot.end_time.isoformat(),
        "consultation_type": slot.consultation_type.value,
        "duration_min": slot.duration_min,
        "is_recurring": slot.is_recurring,
    }


@agenda_bp.route("/slots", methods=["GET"])
@jwt_required(optional=True)
def get_all_slots() -> Any:
    """Récupère les créneaux récurrents d'un médecin."""
    doctor_id_str = request.args.get("doctor_id")

    if not doctor_id_str:
        # Si aucun doctor_id n'est fourni, on tente de récupérer le médecin connecté
        current_user_id = get_jwt_identity()
        if not current_user_id:
            return (
                jsonify(
                    {
                        "error": "bad_request",
                        "message": "doctor_id est obligatoire pour les visiteurs.",
                    }
                ),
                400,
            )
        doctor_id_str = current_user_id

    try:
        doctor_id = UUID(doctor_id_str)
    except ValueError:
        return (
            jsonify({"error": "bad_request", "message": "doctor_id invalide."}),
            400,
        )

    slots = get_slots(doctor_id)
    return jsonify([serialize_slot(s) for s in slots]), 200


@agenda_bp.route("/slots", methods=["POST"])
@require_role("medecin")
def post_slot() -> Any:
    """Ajoute un nouveau créneau récurrent."""
    doctor_id = get_jwt_identity()
    json_data = request.get_json() or {}

    try:
        data = AvailabilitySlotSchema().load(json_data, unknown=EXCLUDE)
    except ValidationError as err:
        return (
            jsonify({"error": "validation_error", "messages": err.messages}),
            422,
        )

    slot = create_slot(UUID(doctor_id), data)
    return jsonify(serialize_slot(slot)), 201


@agenda_bp.route("/slots/<string:id>", methods=["PUT"])
@require_role("medecin")
def put_slot(id: str) -> Any:
    """Met à jour un créneau récurrent existant."""
    doctor_id = get_jwt_identity()
    json_data = request.get_json() or {}

    try:
        uuid_id = UUID(id)
    except ValueError:
        raise NotFound("Créneau introuvable.")

    try:
        data = AvailabilitySlotSchema().load(
            json_data, partial=True, unknown=EXCLUDE
        )
    except ValidationError as err:
        return (
            jsonify({"error": "validation_error", "messages": err.messages}),
            422,
        )

    slot = update_slot(uuid_id, UUID(doctor_id), data)
    return jsonify(serialize_slot(slot)), 200


@agenda_bp.route("/slots/<string:id>", methods=["DELETE"])
@require_role("medecin")
def remove_slot(id: str) -> Any:
    """Supprime un créneau récurrent."""
    doctor_id = get_jwt_identity()
    try:
        uuid_id = UUID(id)
    except ValueError:
        raise NotFound("Créneau introuvable.")

    delete_slot(uuid_id, UUID(doctor_id))
    return "", 204


@agenda_bp.route("/slots/block", methods=["POST"])
@require_role("medecin")
def post_block_slot() -> Any:
    """Bloque une plage horaire pour le médecin connecté."""
    doctor_id = get_jwt_identity()
    json_data = request.get_json() or {}

    try:
        data = BlockSlotSchema().load(json_data, unknown=EXCLUDE)
    except ValidationError as err:
        return (
            jsonify({"error": "validation_error", "messages": err.messages}),
            422,
        )

    blocked = block_slots(UUID(doctor_id), data)
    return (
        jsonify(
            {
                "id": str(blocked.id),
                "doctor_id": str(blocked.doctor_id),
                "start_datetime": blocked.start_datetime.isoformat(),
                "end_datetime": blocked.end_datetime.isoformat(),
                "reason": blocked.reason,
            }
        ),
        201,
    )


@agenda_bp.route("/doctors/<string:id>/availability", methods=["GET"])
def get_availability(id: str) -> Any:
    """Calcule et renvoie les disponibilités réelles d'un médecin."""
    try:
        doctor_id = UUID(id)
    except ValueError:
        raise NotFound("Médecin introuvable.")

    try:
        query_data = AvailabilityQuerySchema().load(request.args)
    except ValidationError as err:
        return (
            jsonify({"error": "validation_error", "messages": err.messages}),
            422,
        )

    availabilities = calculate_availabilities(
        doctor_id, query_data["from_date"], query_data["to_date"]
    )
    return jsonify([dt.isoformat() for dt in availabilities]), 200
