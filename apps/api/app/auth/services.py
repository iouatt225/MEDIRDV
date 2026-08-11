"""
MediRDV CI — Logique métier et services d'authentification.
"""

from __future__ import annotations

from datetime import datetime, timezone
import logging
import secrets
from typing import Any
from uuid import UUID

from flask_bcrypt import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, create_refresh_token
from werkzeug.exceptions import Conflict, Unauthorized, BadRequest

from app.extensions import db
from app import extensions
from app.models import (
    User,
    UserRole,
    DoctorProfile,
    PatientProfile,
    SecretaryDoctor,
    SecretaryDoctorStatus,
)

logger = logging.getLogger(__name__)


def register_user(data: dict[str, Any], role: UserRole) -> User:
    """Inscrit un nouvel utilisateur avec le rôle spécifié et crée son profil."""
    # 1. Vérification d'unicité
    phone = data["phone"]
    if User.query.filter_by(phone=phone).first() is not None:
        raise Conflict("Ce numéro de téléphone est déjà utilisé.")

    email = data.get("email")
    if email and User.query.filter_by(email=email).first() is not None:
        raise Conflict("Cette adresse e-mail est déjà utilisée.")

    # 2. Hashage du mot de passe
    password_hash = generate_password_hash(data["password"]).decode("utf-8")

    # 3. Création du User racine
    user = User(
        role=role,
        phone=phone,
        email=email,
        password_hash=password_hash,
        first_name=data["first_name"],
        last_name=data["last_name"],
    )

    if role == UserRole.PATIENT:
        if not data.get("gdpr_consent"):
            raise BadRequest("Le consentement RGPD est obligatoire pour s'inscrire.")
        user.gdpr_consent_at = datetime.now(timezone.utc).replace(tzinfo=None)

    db.session.add(user)
    db.session.flush()  # Pour obtenir user.id

    # 4. Création des profils associés
    if role == UserRole.PATIENT:
        profile = PatientProfile(
            user_id=user.id,
            date_of_birth=data.get("date_of_birth"),
            phone_secondary=data.get("phone_secondary"),
            address=data.get("address"),
        )
        db.session.add(profile)
    elif role == UserRole.MEDECIN:
        profile = DoctorProfile(
            user_id=user.id,
            specialty=data.get("specialty"),
            cabinet_name=data.get("cabinet_name"),
            address=data.get("address"),
            bio=data.get("bio"),
            languages=data.get("languages"),
            fee=data.get("fee"),
            cancellation_delay_hours=data.get("cancellation_delay_hours", 24),
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
        )
        db.session.add(profile)

    db.session.commit()
    logger.info("Utilisateur créé : %s avec le rôle %s", user.id, role.value)
    return user


def login_user(identifier: str, password: str) -> tuple[str, str, User]:
    """Connecte l'utilisateur en validant ses identifiants et génère les tokens JWT."""
    normalized = identifier.strip()
    user = (
        User.query.filter(User.phone == normalized).first()
        or User.query.filter(User.email == normalized).first()
    )
    if user is None or not check_password_hash(user.password_hash, password):
        raise Unauthorized("Identifiant ou mot de passe incorrect.")

    if not user.is_active:
        raise Unauthorized("Ce compte a été désactivé.")

    # Rôle de l'utilisateur inclus dans les claims
    additional_claims = {"role": user.role.value}
    access_token = create_access_token(
        identity=str(user.id), additional_claims=additional_claims
    )
    refresh_token = create_refresh_token(
        identity=str(user.id), additional_claims=additional_claims
    )

    return access_token, refresh_token, user


def initiate_password_reset(email: str) -> str | None:
    """Lance la réinitialisation de mot de passe en générant un token unique."""
    user = User.query.filter_by(email=email).first()
    if user is None:
        # Pour éviter l'énumération des utilisateurs, on ne lève pas d'erreur
        return None

    # Génération d'un token aléatoire sécurisé
    token = secrets.token_urlsafe(32)

    # Stockage temporaire dans Redis (1 heure)
    if extensions.redis_client is not None:
        extensions.redis_client.setex(f"password_reset:{token}", 3600, str(user.id))
    else:
        # Fallback de développement si Redis n'est pas prêt
        logger.warning("Redis non disponible, impossible de stocker le token de reset.")

    # Simulation d'envoi d'email
    logger.info(
        "EMAIL [RESET PASSWORD] Envoyé à %s. Token: %s (Lien: /reset-password?token=%s)",
        email,
        token,
        token,
    )
    return token


def confirm_password_reset(token: str, new_password: str) -> None:
    """Valide le token de reset, met à jour le mot de passe et l'invalide."""
    if extensions.redis_client is None:
        raise BadRequest("Service temporairement indisponible.")

    user_id = extensions.redis_client.get(f"password_reset:{token}")
    if user_id is None:
        raise BadRequest("Token de réinitialisation invalide ou expiré.")

    user_id_uuid = UUID(user_id) if isinstance(user_id, str) else user_id
    user = db.session.get(User, user_id_uuid)
    if user is None:
        raise BadRequest("Utilisateur introuvable.")

    # Mise à jour du mot de passe
    user.password_hash = generate_password_hash(new_password).decode("utf-8")
    db.session.commit()

    # Consommation immédiate à usage unique
    extensions.redis_client.delete(f"password_reset:{token}")
    logger.info("Mot de passe mis à jour pour l'utilisateur %s", user_id)


def generate_secretary_invitation(doctor_id: str) -> str:
    """Génère un code d'invitation secrétaire pour le médecin (expire sous 24h)."""
    if extensions.redis_client is None:
        raise BadRequest("Service temporairement indisponible.")

    # Code unique court alphanumérique
    code = secrets.token_hex(4).upper()
    # Expire dans 24 heures (86400 secondes)
    extensions.redis_client.setex(f"secretary_invitation:{code}", 86400, doctor_id)

    logger.info("Invitation secrétaire générée par médecin %s : %s", doctor_id, code)
    return code


def join_secretary(secretary_id: str, invitation_code: str) -> SecretaryDoctor:
    """Rattache une secrétaire à un médecin à l'aide du code d'invitation."""
    if extensions.redis_client is None:
        raise BadRequest("Service temporairement indisponible.")

    doctor_id = extensions.redis_client.get(f"secretary_invitation:{invitation_code}")
    if doctor_id is None:
        raise BadRequest("Code d'invitation invalide ou expiré.")

    sec_uuid = UUID(secretary_id) if isinstance(secretary_id, str) else secretary_id
    doc_uuid = UUID(doctor_id) if isinstance(doctor_id, str) else doctor_id

    # Vérification que l'association n'existe pas déjà
    existing = SecretaryDoctor.query.filter_by(
        secretary_id=sec_uuid, doctor_id=doc_uuid
    ).first()

    if existing:
        if existing.status == SecretaryDoctorStatus.REVOKED:
            existing.status = SecretaryDoctorStatus.ACTIVE
            db.session.commit()
            extensions.redis_client.delete(f"secretary_invitation:{invitation_code}")
            return existing
        return existing

    association = SecretaryDoctor(
        secretary_id=sec_uuid,
        doctor_id=doc_uuid,
        status=SecretaryDoctorStatus.ACTIVE,
    )
    db.session.add(association)
    db.session.commit()

    # Consommation à usage unique
    extensions.redis_client.delete(f"secretary_invitation:{invitation_code}")
    logger.info(
        "Secrétaire %s rattachée avec succès au médecin %s", secretary_id, doctor_id
    )
    return association
