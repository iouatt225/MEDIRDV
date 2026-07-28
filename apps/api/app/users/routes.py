"""
MediRDV CI — Routes et contrôleurs du module ``users``.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import EXCLUDE, ValidationError
from werkzeug.exceptions import Forbidden, NotFound

from app.auth.decorators import require_role
from app.extensions import db
from app.models import DoctorProfile, PatientProfile, User, UserRole
from app.users.schemas import (
    DoctorPublicProfileSchema,
    DoctorSettingsSchema,
    UpdateDoctorProfileSchema,
    UpdatePatientProfileSchema,
    UpdateUserSchema,
)
from app.users.services import get_upcoming_slots, search_doctors, update_user_profile

users_bp = Blueprint("users", __name__, url_prefix="/api/v1")


@users_bp.route("/users/me", methods=["GET"])
@jwt_required()
def get_me() -> Any:
    """Récupère les informations de l'utilisateur connecté."""
    user_id = get_jwt_identity()
    user = db.session.get(User, UUID(user_id))

    if user is None:
        raise NotFound("Utilisateur introuvable.")

    response_data = {
        "id": str(user.id),
        "role": user.role.value,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "phone": user.phone,
        "email": user.email,
    }

    # Données spécifiques au rôle
    if user.role == UserRole.PATIENT and user.patient_profile:
        response_data["patient_profile"] = {
            "date_of_birth": (
                user.patient_profile.date_of_birth.isoformat()
                if user.patient_profile.date_of_birth
                else None
            ),
            "phone_secondary": user.patient_profile.phone_secondary,
            "address": user.patient_profile.address,
        }
    elif user.role == UserRole.MEDECIN and user.doctor_profile:
        response_data["doctor_profile"] = {
            "specialty": user.doctor_profile.specialty,
            "cabinet_name": user.doctor_profile.cabinet_name,
            "address": user.doctor_profile.address,
            "bio": user.doctor_profile.bio,
            "languages": user.doctor_profile.languages,
            "fee": (
                float(user.doctor_profile.fee)
                if user.doctor_profile.fee is not None
                else None
            ),
            "photo_url": user.doctor_profile.photo_url,
            "cancellation_delay_hours": user.doctor_profile.cancellation_delay_hours,
            "latitude": user.doctor_profile.latitude,
            "longitude": user.doctor_profile.longitude,
        }

    return jsonify(response_data), 200


@users_bp.route("/users/me", methods=["PUT"])
@jwt_required()
def update_me() -> Any:
    """Met à jour les informations de l'utilisateur connecté."""
    user_id = get_jwt_identity()
    user = db.session.get(User, UUID(user_id))

    if user is None:
        raise NotFound("Utilisateur introuvable.")

    json_data = request.get_json() or {}

    try:
        # 1. Valider les données utilisateur de base
        base_data = UpdateUserSchema().load(json_data, unknown=EXCLUDE)

        # 2. Valider les données du profil selon le rôle
        profile_data = {}
        if user.role == UserRole.PATIENT:
            profile_data = UpdatePatientProfileSchema().load(
                json_data, unknown=EXCLUDE
            )
        elif user.role == UserRole.MEDECIN:
            profile_data = UpdateDoctorProfileSchema().load(
                json_data, unknown=EXCLUDE
            )

        merged_data = {**base_data, **profile_data}
    except ValidationError as err:
        return (
            jsonify({"error": "validation_error", "messages": err.messages}),
            422,
        )

    updated_user = update_user_profile(UUID(user_id), merged_data)
    return (
        jsonify(
            {
                "message": "Profil mis à jour avec succès.",
                "user_id": str(updated_user.id),
            }
        ),
        200,
    )


@users_bp.route("/doctors", methods=["GET"])
def get_doctors() -> Any:
    """Recherche publique paginée de médecins actifs."""
    # Extraction des filtres
    filters: dict[str, Any] = {}

    specialty = request.args.get("specialty")
    if specialty:
        filters["specialty"] = specialty

    city = request.args.get("city")
    if city:
        filters["city"] = city

    lat_str = request.args.get("lat")
    lng_str = request.args.get("lng")
    if lat_str and lng_str:
        try:
            filters["lat"] = float(lat_str)
            filters["lng"] = float(lng_str)
        except ValueError:
            return (
                jsonify(
                    {
                        "error": "bad_request",
                        "message": "Coordonnées lat/lng invalides.",
                    }
                ),
                400,
            )

        radius_str = request.args.get("radius")
        if radius_str:
            try:
                filters["radius"] = float(radius_str)
            except ValueError:
                pass

    # Pagination
    try:
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 10))
    except ValueError:
        page = 1
        per_page = 10

    doctors, total = search_doctors(filters, page, per_page)
    serialized = DoctorPublicProfileSchema(many=True).dump(doctors)

    return (
        jsonify(
            {
                "doctors": serialized,
                "total": total,
                "page": page,
                "per_page": per_page,
            }
        ),
        200,
    )


@users_bp.route("/doctors/<string:id>", methods=["GET"])
def get_doctor_by_id(id: str) -> Any:
    """Récupère le profil public d'un médecin."""
    try:
        uuid_id = UUID(id)
    except ValueError:
        raise NotFound("Médecin introuvable.")

    # Recherche par profile ID ou user ID
    doc = db.session.get(DoctorProfile, uuid_id)
    if doc is None:
        doc = DoctorProfile.query.filter_by(user_id=uuid_id).first()

    if doc is None or not doc.user.is_active:
        raise NotFound("Médecin introuvable.")

    # Calculer les créneaux
    doc.upcoming_availabilities = get_upcoming_slots(doc.user_id)  # type: ignore[attr-defined]
    serialized = DoctorPublicProfileSchema().dump(doc)

    return jsonify(serialized), 200


@users_bp.route("/doctors/<string:id>/settings", methods=["PUT"])
@require_role("medecin")
def update_doctor_settings(id: str) -> Any:
    """Met à jour les paramètres de consultation d'un médecin (accès médecin unique)."""
    try:
        uuid_id = UUID(id)
    except ValueError:
        raise NotFound("Médecin introuvable.")

    # Recherche par profile ID ou user ID
    doc = db.session.get(DoctorProfile, uuid_id)
    if doc is None:
        doc = DoctorProfile.query.filter_by(user_id=uuid_id).first()

    if doc is None:
        raise NotFound("Médecin introuvable.")

    # Restriction de sécurité : Seul le médecin concerné peut éditer ses paramètres
    current_user_id = get_jwt_identity()
    if str(doc.user_id) != current_user_id:
        raise Forbidden("Vous n'avez pas l'autorisation d'éditer ce profil.")

    json_data = request.get_json() or {}
    try:
        data = DoctorSettingsSchema().load(json_data, unknown=EXCLUDE)
    except ValidationError as err:
        return (
            jsonify({"error": "validation_error", "messages": err.messages}),
            422,
        )

    doc.cancellation_delay_hours = data["cancellation_delay_hours"]
    db.session.commit()

    return jsonify({"message": "Paramètres mis à jour avec succès."}), 200


@users_bp.route("/users/me", methods=["DELETE"])
@jwt_required()
def delete_me() -> Any:
    """RGPD : Droit à l'oubli (anonymisation et suppression des profils)."""
    user_id = UUID(get_jwt_identity())
    user = db.session.get(User, user_id)
    if user is None:
        raise NotFound("Utilisateur introuvable.")

    # 1. Supprimer le profil spécifique (PatientProfile ou DoctorProfile)
    if user.role == UserRole.PATIENT:
        profile = PatientProfile.query.filter_by(user_id=user_id).first()
        if profile:
            db.session.delete(profile)
    elif user.role == UserRole.MEDECIN:
        profile = DoctorProfile.query.filter_by(user_id=user_id).first()
        if profile:
            db.session.delete(profile)

    # 2. Anonymiser les données personnelles de la table User
    user.first_name = "Anonyme"
    user.last_name = "Patient" if user.role == UserRole.PATIENT else "Medecin"
    user.email = f"anonyme_{user.id.hex[:12]}@medirdv.com"
    # S'assurer d'un numéro de téléphone anonyme unique
    user.phone = f"+0000000{user.id.int % 100000000:08d}"
    user.password_hash = "ANONYMIZED_PASSWORD_HASH"

    db.session.commit()
    return jsonify({"message": "Vos données ont été anonymisées avec succès."}), 200

