"""
MediRDV CI — Schémas Marshmallow pour le module ``users``.
"""

from __future__ import annotations

from marshmallow import Schema, fields, validate


class UpdateUserSchema(Schema):
    """Schéma de mise à jour des informations de base d'un utilisateur."""

    first_name = fields.Str(required=False, validate=validate.Length(min=1, max=100))
    last_name = fields.Str(required=False, validate=validate.Length(min=1, max=100))
    email = fields.Email(required=False, allow_none=True)
    phone = fields.Str(required=False, allow_none=True, validate=validate.Length(min=6, max=30))


class UpdatePatientProfileSchema(Schema):
    """Schéma de mise à jour du profil d'un patient."""

    date_of_birth = fields.Date(required=False, allow_none=True)
    phone_secondary = fields.Str(required=False, allow_none=True)
    address = fields.Str(required=False, allow_none=True)


class UpdateDoctorProfileSchema(Schema):
    """Schéma de mise à jour du profil d'un médecin."""

    specialty = fields.Str(required=False, allow_none=True)
    cabinet_name = fields.Str(required=False, allow_none=True)
    address = fields.Str(required=False, allow_none=True)
    bio = fields.Str(required=False, allow_none=True)
    languages = fields.List(fields.Str(), required=False, allow_none=True)
    fee = fields.Decimal(required=False, allow_none=True)
    photo_url = fields.Str(required=False, allow_none=True)
    latitude = fields.Float(required=False, allow_none=True)
    longitude = fields.Float(required=False, allow_none=True)


class DoctorPublicProfileSchema(Schema):
    """Schéma de sérialisation publique du profil d'un médecin."""

    id = fields.UUID(dump_only=True)
    user_id = fields.UUID(dump_only=True)
    first_name = fields.Function(lambda obj: obj.user.first_name if obj.user else "")
    last_name = fields.Function(lambda obj: obj.user.last_name if obj.user else "")
    phone = fields.Function(lambda obj: obj.user.phone if obj.user else "")
    email = fields.Function(lambda obj: obj.user.email if obj.user else "")
    specialty = fields.Str()
    cabinet_name = fields.Str()
    address = fields.Str()
    bio = fields.Str()
    languages = fields.List(fields.Str())
    fee = fields.Decimal()
    photo_url = fields.Str()
    cancellation_delay_hours = fields.Int()
    latitude = fields.Float()
    longitude = fields.Float()

    # Liste des prochains créneaux disponibles calculés dynamiquement
    upcoming_availabilities = fields.List(fields.DateTime(), dump_only=True)


class DoctorSettingsSchema(Schema):
    """Schéma de validation des paramètres professionnels d'un médecin."""

    cancellation_delay_hours = fields.Int(
        required=True, validate=validate.Range(min=0)
    )
