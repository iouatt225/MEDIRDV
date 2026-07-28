"""
MediRDV CI — Contrôleurs et routes pour le module ``appointments``.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, get_jwt, jwt_required
from marshmallow import EXCLUDE, ValidationError
from werkzeug.exceptions import Forbidden, NotFound

from app.appointments.schemas import CreateAppointmentSchema, UpdateAppointmentStatusSchema
from app.appointments.services import create_appointment, update_appointment_status
from app.auth.decorators import require_role
from app.extensions import db
from app.models import Appointment, AppointmentStatus, SecretaryDoctor, SecretaryDoctorStatus, UserRole

appointments_bp = Blueprint("appointments", __name__, url_prefix="/api/v1/appointments")


def serialize_appointment(appt: Any) -> dict[str, Any]:
    """Helper de sérialisation pour le modèle Appointment."""
    return {
        "id": str(appt.id),
        "doctor_id": str(appt.doctor_id),
        "patient_id": str(appt.patient_id),
        "slot_start": appt.slot_start.isoformat(),
        "slot_end": appt.slot_end.isoformat(),
        "type": appt.type.value,
        "status": appt.status.value,
        "reason": appt.reason,
        "video_url": appt.video_url,
        "version_token": appt.version_token,
        "created_at": appt.created_at.isoformat() if appt.created_at else None,
        "updated_at": appt.updated_at.isoformat() if appt.updated_at else None,
    }


@appointments_bp.route("", methods=["POST"])
@jwt_required()
def post_appointment() -> Any:
    """Réserve un nouveau rendez-vous."""
    current_user_id = UUID(get_jwt_identity())
    
    # Récupérer le rôle via les claims JWT
    claims = get_jwt()
    current_user_role = claims.get("role")

    json_data = request.get_json() or {}

    try:
        data = CreateAppointmentSchema().load(json_data, unknown=EXCLUDE)
    except ValidationError as err:
        return jsonify({"error": "validation_error", "messages": err.messages}), 422

    appt = create_appointment(current_user_id, current_user_role, data)
    return jsonify(serialize_appointment(appt)), 201


@appointments_bp.route("/<string:id>", methods=["GET"])
@jwt_required()
def get_appointment(id: str) -> Any:
    """Récupère les détails d'un rendez-vous par son ID."""
    current_user_id = UUID(get_jwt_identity())
    claims = get_jwt()
    current_user_role = claims.get("role")

    try:
        uuid_id = UUID(id)
    except ValueError:
        raise NotFound("Rendez-vous introuvable.")

    appt = db.session.get(Appointment, uuid_id)
    if not appt:
        raise NotFound("Rendez-vous introuvable.")

    # Vérification des autorisations
    if current_user_role == UserRole.PATIENT.value:
        if appt.patient_id != current_user_id:
            raise Forbidden("Vous n'êtes pas autorisé à voir ce rendez-vous.")
    elif current_user_role == UserRole.SECRETAIRE.value:
        link = SecretaryDoctor.query.filter_by(
            secretary_id=current_user_id,
            doctor_id=appt.doctor_id,
            status=SecretaryDoctorStatus.ACTIVE,
        ).first()
        if not link:
            raise Forbidden("Vous n'êtes pas rattaché au médecin de ce rendez-vous.")
    elif current_user_role == UserRole.MEDECIN.value:
        if appt.doctor_id != current_user_id:
            raise Forbidden("Vous n'êtes pas le médecin de ce rendez-vous.")

    return jsonify(serialize_appointment(appt)), 200


@appointments_bp.route("", methods=["GET"])
@jwt_required()
def get_appointments() -> Any:
    """Liste les rendez-vous selon les filtres (doctor_id, patient_id, status)."""
    current_user_id = UUID(get_jwt_identity())
    claims = get_jwt()
    current_user_role = claims.get("role")

    doctor_id_str = request.args.get("doctor_id")
    patient_id_str = request.args.get("patient_id")
    status_str = request.args.get("status")

    query = Appointment.query

    # Enforce access checks on filtering
    if current_user_role == UserRole.PATIENT.value:
        # Un patient ne peut voir que ses propres rendez-vous
        query = query.filter(Appointment.patient_id == current_user_id)
    elif current_user_role == UserRole.SECRETAIRE.value:
        # Une secrétaire ne peut voir que les rendez-vous des médecins auxquels elle est liée
        subquery = db.session.query(SecretaryDoctor.doctor_id).filter_by(
            secretary_id=current_user_id,
            status=SecretaryDoctorStatus.ACTIVE
        ).subquery()
        query = query.filter(Appointment.doctor_id.in_(subquery))
    elif current_user_role == UserRole.MEDECIN.value:
        # Un médecin ne peut voir que ses propres rendez-vous
        query = query.filter(Appointment.doctor_id == current_user_id)

    # Filtres optionnels complémentaires
    if doctor_id_str:
        try:
            query = query.filter(Appointment.doctor_id == UUID(doctor_id_str))
        except ValueError:
            return jsonify({"error": "bad_request", "message": "doctor_id invalide."}), 400

    if patient_id_str:
        try:
            query = query.filter(Appointment.patient_id == UUID(patient_id_str))
        except ValueError:
            return jsonify({"error": "bad_request", "message": "patient_id invalide."}), 400

    if status_str:
        try:
            query = query.filter(Appointment.status == AppointmentStatus(status_str))
        except ValueError:
            return jsonify({"error": "bad_request", "message": "Statut de rendez-vous invalide."}), 400

    appts = query.order_by(Appointment.slot_start.asc()).all()
    return jsonify([serialize_appointment(a) for a in appts]), 200


@appointments_bp.route("/<string:id>/status", methods=["PATCH"])
@jwt_required()
def patch_appointment_status(id: str) -> Any:
    """Met à jour le statut d'un rendez-vous (annulation / confirmation)."""
    current_user_id = UUID(get_jwt_identity())
    claims = get_jwt()
    current_user_role = claims.get("role")

    try:
        uuid_id = UUID(id)
    except ValueError:
        raise NotFound("Rendez-vous introuvable.")

    json_data = request.get_json() or {}

    try:
        data = UpdateAppointmentStatusSchema().load(json_data, unknown=EXCLUDE)
    except ValidationError as err:
        return jsonify({"error": "validation_error", "messages": err.messages}), 422

    appt = update_appointment_status(
        uuid_id,
        data["status"],
        data.get("version_token"),
        current_user_id,
        current_user_role,
    )
    return jsonify(serialize_appointment(appt)), 200


@appointments_bp.route("/<string:id>", methods=["DELETE"])
@require_role("secretaire", "medecin")
def delete_appointment(id: str) -> Any:
    """Supprime définitivement un rendez-vous (secrétaire/médecin/admin uniquement)."""
    try:
        uuid_id = UUID(id)
    except ValueError:
        raise NotFound("Rendez-vous introuvable.")

    appt = db.session.get(Appointment, uuid_id)
    if not appt:
        raise NotFound("Rendez-vous introuvable.")

    doctor_id = appt.doctor_id

    # Si c'est une secrétaire, vérifier son lien avec le médecin du RDV
    claims = get_jwt()
    role = claims.get("role")
    if role == UserRole.SECRETAIRE.value:
        current_user_id = UUID(get_jwt_identity())
        link = SecretaryDoctor.query.filter_by(
            secretary_id=current_user_id,
            doctor_id=doctor_id,
            status=SecretaryDoctorStatus.ACTIVE,
        ).first()
        if not link:
            raise Forbidden("Vous n'êtes pas rattaché à ce médecin.")

    db.session.delete(appt)
    db.session.commit()

    # Vider le cache des disponibilités
    from app.agenda.services import clear_doctor_availability_cache
    clear_doctor_availability_cache(doctor_id)

    return "", 204
