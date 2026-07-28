"""
MediRDV CI — Schémas Marshmallow pour le module ``agenda``.
"""

from __future__ import annotations

from marshmallow import Schema, fields, validate

from app.models.enums import ConsultationType


class AvailabilitySlotSchema(Schema):
    """Schéma de validation pour un créneau de disponibilité récurrent."""

    day_of_week = fields.Int(required=True, validate=validate.Range(min=0, max=6))
    start_time = fields.Time(required=True)
    end_time = fields.Time(required=True)
    consultation_type = fields.Enum(ConsultationType, by_value=True, required=True)
    duration_min = fields.Int(required=False, load_default=30, validate=validate.Range(min=5))
    is_recurring = fields.Bool(required=False, load_default=True)


class BlockSlotSchema(Schema):
    """Schéma de validation pour bloquer une plage horaire."""

    start_datetime = fields.DateTime(required=True)
    end_datetime = fields.DateTime(required=True)
    reason = fields.Str(required=False, allow_none=True)


class AvailabilityQuerySchema(Schema):
    """Schéma pour valider la requête de disponibilités réelles."""

    from_date = fields.DateTime(data_key="from", required=True)
    to_date = fields.DateTime(data_key="to", required=True)
