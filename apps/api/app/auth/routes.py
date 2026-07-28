"""
MediRDV CI — Endpoints et contrôleurs du module ``auth``.
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    get_jwt,
    get_jwt_identity,
    jwt_required,
    set_refresh_cookies,
)
from marshmallow import EXCLUDE, ValidationError
from werkzeug.exceptions import BadRequest

from app.auth.decorators import require_role
from app.auth.schemas import (
    JoinSecretarySchema,
    LoginSchema,
    RegisterDoctorSchema,
    RegisterPatientSchema,
    RegisterSecretarySchema,
    ResetPasswordConfirmSchema,
    ResetPasswordRequestSchema,
)
from app.auth.services import (
    confirm_password_reset,
    generate_secretary_invitation,
    initiate_password_reset,
    join_secretary,
    login_user,
    register_user,
)
from app.models.enums import UserRole
from app.extensions import limiter

# Blueprint configuré pour le préfixe général de l'API v1
auth_bp = Blueprint("auth", __name__, url_prefix="/api/v1")


@auth_bp.route("/auth/register", methods=["POST"])
def register() -> Any:
    """Endpoint pour inscrire un utilisateur (patient, médecin ou secrétaire)."""
    json_data = request.get_json() or {}
    role_str = json_data.get("role")

    if not role_str:
        return (
            jsonify(
                {"error": "bad_request", "message": "Le rôle est obligatoire."}
            ),
            400,
        )

    try:
        role_enum = UserRole(role_str)
    except ValueError:
        return (
            jsonify({"error": "bad_request", "message": "Rôle invalide."}),
            400,
        )

    # Validation selon le rôle
    try:
        if role_enum == UserRole.PATIENT:
            data = RegisterPatientSchema().load(json_data, unknown=EXCLUDE)
        elif role_enum == UserRole.MEDECIN:
            data = RegisterDoctorSchema().load(json_data, unknown=EXCLUDE)
        elif role_enum == UserRole.SECRETAIRE:
            data = RegisterSecretarySchema().load(json_data, unknown=EXCLUDE)
        else:
            raise BadRequest("Rôle non supporté pour l'inscription.")
    except ValidationError as err:
        return (
            jsonify({"error": "validation_error", "messages": err.messages}),
            422,
        )

    user = register_user(data, role_enum)
    return (
        jsonify({"message": "Inscription réussie.", "user_id": str(user.id)}),
        201,
    )


@auth_bp.route("/auth/login", methods=["POST"])
@limiter.limit("5 per minute")
def login() -> Any:
    """Endpoint de connexion. Retourne l'access token et pose le refresh token dans un cookie."""
    json_data = request.get_json() or {}
    try:
        data = LoginSchema().load(json_data, unknown=EXCLUDE)
    except ValidationError as err:
        return (
            jsonify({"error": "validation_error", "messages": err.messages}),
            422,
        )

    access_token, refresh_token, user = login_user(
        data["phone"], data["password"]
    )

    response = jsonify(
        {
            "message": "Connexion réussie.",
            "access_token": access_token,
            "user": {
                "id": str(user.id),
                "role": user.role.value,
                "first_name": user.first_name,
                "last_name": user.last_name,
            },
        }
    )
    # Pose le cookie httpOnly Secure SameSite="Strict" en production
    set_refresh_cookies(response, refresh_token)
    return response, 200


@auth_bp.route("/auth/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh() -> Any:
    """Endpoint de rafraîchissement d'access token à l'aide du refresh token."""
    identity = get_jwt_identity()
    claims = get_jwt()
    role = claims.get("role")

    from flask_jwt_extended import create_access_token

    access_token = create_access_token(
        identity=identity, additional_claims={"role": role}
    )
    return jsonify({"access_token": access_token}), 200


@auth_bp.route("/auth/reset-password", methods=["POST"])
@limiter.limit("5 per minute")
def reset_password() -> Any:
    """Endpoint pour demander la réinitialisation de mot de passe."""
    json_data = request.get_json() or {}
    try:
        data = ResetPasswordRequestSchema().load(json_data, unknown=EXCLUDE)
    except ValidationError as err:
        return (
            jsonify({"error": "validation_error", "messages": err.messages}),
            422,
        )

    initiate_password_reset(data["email"])
    # Réponse générique pour éviter le user enumeration
    return (
        jsonify(
            {
                "message": "Si l'adresse email existe, un lien de réinitialisation a été envoyé."
            }
        ),
        200,
    )


@auth_bp.route("/auth/reset-password/confirm", methods=["POST"])
@limiter.limit("5 per minute")
def reset_password_confirm() -> Any:
    """Endpoint pour confirmer et appliquer la réinitialisation de mot de passe."""
    json_data = request.get_json() or {}
    try:
        data = ResetPasswordConfirmSchema().load(json_data, unknown=EXCLUDE)
    except ValidationError as err:
        return (
            jsonify({"error": "validation_error", "messages": err.messages}),
            422,
        )

    confirm_password_reset(data["token"], data["new_password"])
    return (
        jsonify({"message": "Votre mot de passe a été réinitialisé avec succès."}),
        200,
    )


@auth_bp.route("/secretary/invite", methods=["POST"])
@require_role("medecin")
def invite_secretary() -> Any:
    """Endpoint médecin : génère un code d'invitation pour rattacher une secrétaire."""
    doctor_id = get_jwt_identity()
    code = generate_secretary_invitation(doctor_id)
    return jsonify({"invitation_code": code}), 200


@auth_bp.route("/secretary/join", methods=["POST"])
@require_role("secretaire")
def join_doctor() -> Any:
    """Endpoint secrétaire : s'associe à un médecin via le code d'invitation."""
    secretary_id = get_jwt_identity()
    json_data = request.get_json() or {}
    try:
        data = JoinSecretarySchema().load(json_data, unknown=EXCLUDE)
    except ValidationError as err:
        return (
            jsonify({"error": "validation_error", "messages": err.messages}),
            422,
        )

    join_secretary(secretary_id, data["invitation_code"])
    return jsonify({"message": "Rattachement effectué avec succès."}), 200
