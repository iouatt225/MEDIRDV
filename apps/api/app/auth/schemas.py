"""
MediRDV CI — Schémas de validation Marshmallow pour le module ``auth``.
"""

from __future__ import annotations

import re

from marshmallow import Schema, ValidationError, fields, validate


def validate_password(password: str) -> None:
    """Valide la complexité du mot de passe côté serveur."""
    if len(password) < 8:
        raise ValidationError("Le mot de passe doit contenir au moins 8 caractères.")
    if not re.search(r"\d", password):
        raise ValidationError("Le mot de passe doit contenir au moins un chiffre.")
    if not re.search(r"[A-Z]", password):
        raise ValidationError(
            "Le mot de passe doit contenir au moins une lettre majuscule."
        )
    if not re.search(r"[a-z]", password):
        raise ValidationError(
            "Le mot de passe doit contenir au moins une lettre minuscule."
        )


class RegisterPatientSchema(Schema):
    """Schéma de validation pour l'inscription d'un patient."""

    first_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    last_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    phone = fields.Str(required=True, validate=validate.Length(min=8, max=20))
    email = fields.Email(required=False, allow_none=True)
    password = fields.Str(required=True, validate=validate_password)

    # Profil Patient
    date_of_birth = fields.Date(required=False, allow_none=True)
    phone_secondary = fields.Str(required=False, allow_none=True)
    address = fields.Str(required=False, allow_none=True)

    # RGPD
    gdpr_consent = fields.Bool(
        required=True,
        validate=validate.Equal(
            True, error="Le consentement RGPD est obligatoire pour s'inscrire."
        ),
    )


class RegisterDoctorSchema(Schema):
    """Schéma de validation pour l'inscription d'un médecin."""

    first_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    last_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    phone = fields.Str(required=True, validate=validate.Length(min=8, max=20))
    email = fields.Email(required=False, allow_none=True)
    password = fields.Str(required=True, validate=validate_password)

    # Profil Médecin
    specialty = fields.Str(required=False, allow_none=True)
    cabinet_name = fields.Str(required=False, allow_none=True)
    address = fields.Str(required=False, allow_none=True)
    bio = fields.Str(required=False, allow_none=True)
    languages = fields.List(fields.Str(), required=False, allow_none=True)
    fee = fields.Decimal(required=False, allow_none=True)
    cancellation_delay_hours = fields.Int(
        required=False, validate=validate.Range(min=0)
    )
    latitude = fields.Float(required=False, allow_none=True)
    longitude = fields.Float(required=False, allow_none=True)


class RegisterSecretarySchema(Schema):
    """Schéma de validation pour l'inscription d'une secrétaire."""

    first_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    last_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    phone = fields.Str(required=True, validate=validate.Length(min=8, max=20))
    email = fields.Email(required=False, allow_none=True)
    password = fields.Str(required=True, validate=validate_password)


class LoginSchema(Schema):
    """Schéma de validation pour la connexion."""

    phone = fields.Str(required=True)
    password = fields.Str(required=True)


class ResetPasswordRequestSchema(Schema):
    """Schéma de demande de réinitialisation de mot de passe."""

    email = fields.Email(required=True)


class ResetPasswordConfirmSchema(Schema):
    """Schéma de confirmation de réinitialisation de mot de passe."""

    token = fields.Str(required=True)
    new_password = fields.Str(required=True, validate=validate_password)


class JoinSecretarySchema(Schema):
    """Schéma d'association de secrétaire via code d'invitation."""

    invitation_code = fields.Str(required=True)
