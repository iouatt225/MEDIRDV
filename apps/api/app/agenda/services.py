"""
MediRDV CI — Services métier du module ``agenda``.
"""

from __future__ import annotations

from datetime import datetime, timedelta
import json
import logging
from typing import Any
from uuid import UUID

from werkzeug.exceptions import Forbidden, NotFound

from app import extensions
from app.extensions import db
from app.models import (
    Appointment,
    AppointmentStatus,
    AvailabilitySlot,
    BlockedSlot,
    DoctorProfile,
)

logger = logging.getLogger(__name__)


def clear_doctor_availability_cache(doctor_id: UUID) -> None:
    """Invalide immédiatement tout le cache de disponibilités pour un médecin donné."""
    if extensions.redis_client is not None:
        try:
            pattern = f"doctor_availabilities:{doctor_id}:*"
            keys = extensions.redis_client.keys(pattern)
            if keys:
                extensions.redis_client.delete(*keys)
                logger.info(
                    "Cache de disponibilités invalidé pour le médecin %s (%d clés supprimées)",
                    doctor_id,
                    len(keys),
                )
        except Exception as exc:
            logger.error(
                "Échec de l'invalidation du cache Redis pour le médecin %s : %s",
                doctor_id,
                exc,
            )


def get_slots(doctor_id: UUID) -> list[AvailabilitySlot]:
    """Récupère tous les créneaux réguliers d'un médecin."""
    return AvailabilitySlot.query.filter_by(doctor_id=doctor_id).all()


def create_slot(doctor_id: UUID, data: dict[str, Any]) -> AvailabilitySlot:
    """Crée un nouveau créneau de disponibilité récurrent et invalide le cache."""
    slot = AvailabilitySlot(
        doctor_id=doctor_id,
        day_of_week=data["day_of_week"],
        start_time=data["start_time"],
        end_time=data["end_time"],
        consultation_type=data["consultation_type"],
        duration_min=data.get("duration_min", 30),
        is_recurring=data.get("is_recurring", True),
    )
    db.session.add(slot)
    db.session.commit()
    clear_doctor_availability_cache(doctor_id)
    return slot


def update_slot(
    slot_id: UUID, doctor_id: UUID, data: dict[str, Any]
) -> AvailabilitySlot:
    """Met à jour un créneau récurrent existant et invalide le cache."""
    slot = db.session.get(AvailabilitySlot, slot_id)
    if slot is None:
        raise NotFound("Créneau introuvable.")

    if slot.doctor_id != doctor_id:
        raise Forbidden("Vous n'êtes pas propriétaire de ce créneau.")

    if "day_of_week" in data:
        slot.day_of_week = data["day_of_week"]
    if "start_time" in data:
        slot.start_time = data["start_time"]
    if "end_time" in data:
        slot.end_time = data["end_time"]
    if "consultation_type" in data:
        slot.consultation_type = data["consultation_type"]
    if "duration_min" in data:
        slot.duration_min = data["duration_min"]
    if "is_recurring" in data:
        slot.is_recurring = data["is_recurring"]

    db.session.commit()
    clear_doctor_availability_cache(doctor_id)
    return slot


def delete_slot(slot_id: UUID, doctor_id: UUID) -> None:
    """Supprime un créneau récurrent et invalide le cache."""
    slot = db.session.get(AvailabilitySlot, slot_id)
    if slot is None:
        raise NotFound("Créneau introuvable.")

    if slot.doctor_id != doctor_id:
        raise Forbidden("Vous n'êtes pas propriétaire de ce créneau.")

    db.session.delete(slot)
    db.session.commit()
    clear_doctor_availability_cache(doctor_id)


def block_slots(doctor_id: UUID, data: dict[str, Any]) -> BlockedSlot:
    """Crée une plage horaire bloquée (congés/réunions) et invalide le cache."""
    blocked = BlockedSlot(
        doctor_id=doctor_id,
        start_datetime=data["start_datetime"],
        end_datetime=data["end_datetime"],
        reason=data.get("reason"),
    )
    db.session.add(blocked)
    db.session.commit()
    clear_doctor_availability_cache(doctor_id)
    return blocked


def calculate_availabilities(
    doctor_id: UUID, start_dt: datetime, end_dt: datetime
) -> list[datetime]:
    """Calcule les disponibilités réelles d'un médecin avec mise en cache Redis."""
    cache_key = (
        f"doctor_availabilities:{doctor_id}:{start_dt.isoformat()}:{end_dt.isoformat()}"
    )

    # 1. Tenter de lire depuis le cache Redis
    if extensions.redis_client is not None:
        try:
            cached = extensions.redis_client.get(cache_key)
            if cached:
                logger.info(
                    "Créneaux récupérés depuis le cache Redis pour le médecin %s",
                    doctor_id,
                )
                str_list = json.loads(cached)
                return [datetime.fromisoformat(s) for s in str_list]
        except Exception as exc:
            logger.error("Échec de lecture depuis le cache Redis : %s", exc)

    # 2. Calcul en temps réel (si raté de cache)
    recurrent_slots = AvailabilitySlot.query.filter_by(doctor_id=doctor_id).all()

    blocked_slots = BlockedSlot.query.filter(
        BlockedSlot.doctor_id == doctor_id,
        BlockedSlot.end_datetime >= start_dt,
        BlockedSlot.start_datetime <= end_dt,
    ).all()

    appointments = Appointment.query.filter(
        Appointment.doctor_id == doctor_id,
        Appointment.status == AppointmentStatus.CONFIRME,
        Appointment.slot_end >= start_dt,
        Appointment.slot_start <= end_dt,
    ).all()

    available_slots: list[datetime] = []
    now = datetime.now()

    # Calcul de l'écart en jours
    delta = end_dt.date() - start_dt.date()
    for d_offset in range(delta.days + 1):
        target_date = start_dt.date() + timedelta(days=d_offset)
        day_of_week = target_date.weekday()

        for slot in recurrent_slots:
            if slot.day_of_week != day_of_week:
                continue

            curr_time = datetime.combine(target_date, slot.start_time)
            end_time_limit = datetime.combine(target_date, slot.end_time)

            while curr_time + timedelta(minutes=slot.duration_min) <= end_time_limit:
                s_start = curr_time
                s_end = curr_time + timedelta(minutes=slot.duration_min)

                # Écarter les créneaux passés ou hors-plage demandée
                if s_start <= now or s_start < start_dt or s_end > end_dt:
                    curr_time += timedelta(minutes=slot.duration_min)
                    continue

                # Écarter si chevauchement avec une plage bloquée
                overlaps_blocked = False
                for bs in blocked_slots:
                    if s_start < bs.end_datetime and s_end > bs.start_datetime:
                        overlaps_blocked = True
                        break
                if overlaps_blocked:
                    curr_time += timedelta(minutes=slot.duration_min)
                    continue

                # Écarter si chevauchement avec un rendez-vous
                overlaps_appt = False
                for appt in appointments:
                    if s_start < appt.slot_end and s_end > appt.slot_start:
                        overlaps_appt = True
                        break
                if overlaps_appt:
                    curr_time += timedelta(minutes=slot.duration_min)
                    continue

                available_slots.append(s_start)
                curr_time += timedelta(minutes=slot.duration_min)

    available_slots.sort()

    # 3. Écrire le résultat en cache Redis (TTL = 30s)
    if extensions.redis_client is not None:
        try:
            str_list = [dt.isoformat() for dt in available_slots]
            extensions.redis_client.setex(cache_key, 30, json.dumps(str_list))
            logger.info("Cache Redis mis à jour pour le médecin %s (TTL 30s)", doctor_id)
        except Exception as exc:
            logger.error("Échec d'écriture dans le cache Redis : %s", exc)

    return available_slots
