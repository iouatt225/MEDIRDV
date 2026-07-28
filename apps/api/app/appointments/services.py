"""
MediRDV CI — Logique métier du module ``appointments``.
"""

from __future__ import annotations

from datetime import datetime, timedelta
import logging
from uuid import UUID

from werkzeug.exceptions import Conflict, Forbidden, NotFound, UnprocessableEntity

from app.agenda.services import clear_doctor_availability_cache
from app.extensions import celery, db
from app.models import (
    Appointment,
    AppointmentStatus,
    ConsultationType,
    DoctorProfile,
    SecretaryDoctor,
    SecretaryDoctorStatus,
    User,
    UserRole,
)
from app.notifications.tasks import (
    send_cancellation_task,
    send_confirmation_task,
    send_reminder_h1_video_task,
    send_reminder_j1_task,
)
from app.teleconsult.providers.daily_client import create_daily_room

logger = logging.getLogger(__name__)


def create_appointment(
    current_user_id: UUID,
    current_user_role: str,
    data: dict,
) -> Appointment:
    """Crée un rendez-vous pour un patient (transaction isolée avec SELECT FOR UPDATE)."""
    doctor_id = data["doctor_id"]
    # Par défaut, si le patient n'est pas spécifié, on prend le patient connecté
    patient_id = data.get("patient_id") or current_user_id

    # 1. Droits d'accès
    if current_user_role == UserRole.PATIENT.value:
        if patient_id != current_user_id:
            raise Forbidden("Un patient ne peut réserver que pour lui-même.")
    elif current_user_role == UserRole.SECRETAIRE.value:
        # Une secrétaire doit être liée au médecin
        link = SecretaryDoctor.query.filter_by(
            secretary_id=current_user_id,
            doctor_id=doctor_id,
            status=SecretaryDoctorStatus.ACTIVE,
        ).first()
        if not link:
            raise Forbidden("Vous n'êtes pas rattaché à ce médecin.")
    elif current_user_role == UserRole.MEDECIN.value:
        if current_user_id != doctor_id:
            raise Forbidden("Un médecin ne peut réserver que pour son propre compte.")

    # 2. Verrouiller le profil médecin
    doc = (
        db.session.query(DoctorProfile)
        .filter_by(user_id=doctor_id)
        .with_for_update()
        .first()
    )
    if doc is None:
        raise NotFound("Médecin introuvable.")

    slot_start = data["slot_start"]
    slot_end = data["slot_end"]

    # 3. Vérifier s'il existe déjà un rendez-vous actif sur ce créneau
    existing = Appointment.query.filter_by(
        doctor_id=doctor_id,
        slot_start=slot_start,
        status=AppointmentStatus.CONFIRME,
    ).first()

    if existing:
        raise Conflict("Ce créneau est déjà réservé.")

    # 4. Gérer la visioconférence (Daily.co)
    video_url = None
    if data["type"] == ConsultationType.VIDEO:
        # Nom de salon unique déterministe
        room_name = f"room_{str(doctor_id)[:8]}_{str(patient_id)[:8]}_{int(slot_start.timestamp())}"
        # Expire 1h après la fin du rendez-vous
        expiry_ts = int(slot_end.timestamp()) + 3600
        video_url = create_daily_room(room_name, expiry_ts)

    # 5. Créer le rendez-vous
    appt = Appointment(
        doctor_id=doctor_id,
        patient_id=patient_id,
        slot_start=slot_start,
        slot_end=slot_end,
        type=data["type"],
        status=AppointmentStatus.CONFIRME,
        video_url=video_url,
        version_token=1,
    )
    db.session.add(appt)
    db.session.commit()

    # 6. Invalider le cache des disponibilités
    clear_doctor_availability_cache(doctor_id)

    # 7. Planifier les notifications asynchrones Celery
    appt_id_str = str(appt.id)
    # Confirmation immédiate
    send_confirmation_task.delay(appt_id_str)

    now = datetime.now()

    # Rappel J-1
    eta_j1 = slot_start - timedelta(days=1)
    if eta_j1 > now:
        send_reminder_j1_task.apply_async(
            (appt_id_str,),
            eta=eta_j1,
            task_id=f"reminder_j1_{appt_id_str}",
        )

    # Rappel H-1 (uniquement si téléconsultation)
    if appt.type == ConsultationType.VIDEO:
        eta_h1 = slot_start - timedelta(hours=1)
        if eta_h1 > now:
            send_reminder_h1_video_task.apply_async(
                (appt_id_str,),
                eta=eta_h1,
                task_id=f"reminder_h1_{appt_id_str}",
            )

    return appt


def update_appointment_status(
    appointment_id: UUID,
    new_status: AppointmentStatus,
    version_token: int | None,
    current_user_id: UUID,
    current_user_role: str,
) -> Appointment:
    """Modifie le statut d'un rendez-vous avec gestion du verrouillage optimiste."""
    appt = db.session.get(Appointment, appointment_id)
    if not appt:
        raise NotFound("Rendez-vous introuvable.")

    # 1. Vérification du verrouillage optimiste
    if version_token is not None and appt.version_token != version_token:
        raise Conflict("Le rendez-vous a été modifié par un autre utilisateur.")

    # 2. Droits d'accès
    if current_user_role == UserRole.PATIENT.value:
        if appt.patient_id != current_user_id:
            raise Forbidden("Vous n'êtes pas autorisé à modifier ce rendez-vous.")
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

    # 3. Règles d'annulation
    if new_status == AppointmentStatus.ANNULE and appt.status != AppointmentStatus.ANNULE:
        # Si initié par le patient, vérifier le délai minimum d'annulation (cancellation_delay_hours)
        if current_user_role == UserRole.PATIENT.value:
            doctor_profile = DoctorProfile.query.filter_by(user_id=appt.doctor_id).first()
            delay_hours = doctor_profile.cancellation_delay_hours if doctor_profile else 24
            limit_time = appt.slot_start - timedelta(hours=delay_hours)
            if datetime.now() > limit_time:
                raise UnprocessableEntity(
                    f"Délai d'annulation dépassé (limite de {delay_hours}h avant le rendez-vous)."
                )

        # Révolution des rappels planifiés Celery
        try:
            celery.control.revoke(f"reminder_j1_{str(appt.id)}")
            celery.control.revoke(f"reminder_h1_{str(appt.id)}")
            logger.info("Rappels Celery révoqués pour le rendez-vous annulé %s", appt.id)
        except Exception as exc:
            logger.error("Impossible de révoquer les tâches Celery : %s", exc)

        # Notification d'annulation immédiate
        send_cancellation_task.delay(str(appt.id))

    # 4. Enregistrer la mise à jour
    appt.status = new_status
    appt.version_token += 1
    db.session.commit()

    # 5. Invalider le cache des disponibilités
    clear_doctor_availability_cache(appt.doctor_id)

    return appt


def book_appointment(
    doctor_id: UUID,
    patient_id: UUID,
    slot_start: datetime,
    slot_end: datetime,
    type: ConsultationType,
) -> Appointment:
    """Helper de compatibilité conservé pour les tests bas niveau."""
    return create_appointment(
        current_user_id=patient_id,
        current_user_role=UserRole.PATIENT.value,
        data={
            "doctor_id": doctor_id,
            "patient_id": patient_id,
            "slot_start": slot_start,
            "slot_end": slot_end,
            "type": type,
        },
    )
