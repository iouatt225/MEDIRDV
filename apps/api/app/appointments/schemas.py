"""
MediRDV CI — Schémas Marshmallow pour le module ``appointments``.
"""

from __future__ import annotations

from marshmallow import Schema, fields

from app.models.enums import AppointmentStatus, ConsultationType


class CreateAppointmentSchema(Schema):
    """Schéma de validation pour créer un rendez-vous."""

    doctor_id = fields.UUID(required=True)
    patient_id = fields.UUID(required=False, allow_none=True)
    slot_start = fields.DateTime(required=True)
    slot_end = fields.DateTime(required=True)
    type = fields.Enum(ConsultationType, by_value=True, required=True)


class UpdateAppointmentStatusSchema(Schema):
    """Schéma de validation pour modifier le statut d'un rendez-vous (optimistic locking)."""

    status = fields.Enum(AppointmentStatus, by_value=True, required=True)
    version_token = fields.Int(required=False, allow_none=True)
