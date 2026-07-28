"""
MediRDV CI — Tâches Celery pour le module ``notifications``.
"""

from __future__ import annotations

from datetime import datetime, timezone
import logging
from uuid import UUID

from app.extensions import celery, db
from app.models import Appointment, AppointmentStatus, NotificationLog
from app.models.enums import NotificationStatus, NotificationTrigger, NotificationType
from app.notifications.providers.sendgrid_client import send_email
from app.notifications.providers.twilio_client import send_sms

logger = logging.getLogger(__name__)


def log_notification(
    appointment_id: UUID,
    n_type: NotificationType,
    trigger: NotificationTrigger,
    status: NotificationStatus,
) -> None:
    """Enregistre un journal d'envoi de notification en base de données."""
    try:
        log_entry = NotificationLog(
            appointment_id=appointment_id,
            type=n_type,
            trigger=trigger,
            sent_at=datetime.now(timezone.utc).replace(tzinfo=None) if status == NotificationStatus.SENT else None,
            status=status,
        )
        db.session.add(log_entry)
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        logger.error("Impossible d'enregistrer le journal de notification : %s", exc)


@celery.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    retry_backoff=True,
)
def send_confirmation_task(self, appointment_id: str) -> None:
    """Tâche d'envoi de confirmation immédiate (Email + SMS)."""
    appt_uuid = UUID(appointment_id)
    appt = db.session.get(Appointment, appt_uuid)
    if not appt or appt.status != AppointmentStatus.CONFIRME:
        logger.info(
            "Annulation tâche de confirmation : rendez-vous %s inexistant ou non-confirmé.",
            appointment_id,
        )
        return

    patient = appt.patient
    doctor = appt.doctor

    email_body = (
        f"Bonjour {patient.first_name} {patient.last_name},\n\n"
        f"Votre rendez-vous avec le Dr. {doctor.first_name} {doctor.last_name} "
        f"le {appt.slot_start.strftime('%d/%m/%Y à %H:%M')} est bien confirmé."
    )
    sms_body = (
        f"MediRDV : RDV confirme avec le Dr. {doctor.last_name} le "
        f"{appt.slot_start.strftime('%d/%m/%Y a %H:%M')}."
    )

    email_ok = send_email(
        patient.email, "Confirmation de votre rendez-vous", email_body
    )
    sms_ok = send_sms(patient.phone, sms_body)

    if not email_ok or not sms_ok:
        try:
            raise self.retry()
        except self.MaxRetriesExceededError:
            log_notification(
                appt_uuid,
                NotificationType.EMAIL,
                NotificationTrigger.CONFIRM,
                NotificationStatus.FAILED,
            )
            log_notification(
                appt_uuid,
                NotificationType.SMS,
                NotificationTrigger.CONFIRM,
                NotificationStatus.FAILED,
            )
            raise

    log_notification(
        appt_uuid,
        NotificationType.EMAIL,
        NotificationTrigger.CONFIRM,
        NotificationStatus.SENT,
    )
    log_notification(
        appt_uuid,
        NotificationType.SMS,
        NotificationTrigger.CONFIRM,
        NotificationStatus.SENT,
    )


@celery.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    retry_backoff=True,
)
def send_reminder_j1_task(self, appointment_id: str) -> None:
    """Tâche de rappel à J-1 du rendez-vous (Email + SMS)."""
    appt_uuid = UUID(appointment_id)
    appt = db.session.get(Appointment, appt_uuid)
    if not appt or appt.status != AppointmentStatus.CONFIRME:
        logger.info("Annulation rappel J-1 pour le RDV %s (RDV annulé/inexistant).", appointment_id)
        return

    patient = appt.patient
    doctor = appt.doctor

    email_body = (
        f"Bonjour {patient.first_name},\n\n"
        f"Rappel : vous avez rendez-vous demain à {appt.slot_start.strftime('%H:%M')} "
        f"avec le Dr. {doctor.last_name}."
    )
    sms_body = (
        f"MediRDV Rappel : RDV demain a {appt.slot_start.strftime('%H:%M')} "
        f"avec le Dr. {doctor.last_name}."
    )

    email_ok = send_email(patient.email, "Rappel de votre rendez-vous demain", email_body)
    sms_ok = send_sms(patient.phone, sms_body)

    if not email_ok or not sms_ok:
        try:
            raise self.retry()
        except self.MaxRetriesExceededError:
            log_notification(
                appt_uuid,
                NotificationType.EMAIL,
                NotificationTrigger.J1,
                NotificationStatus.FAILED,
            )
            log_notification(
                appt_uuid,
                NotificationType.SMS,
                NotificationTrigger.J1,
                NotificationStatus.FAILED,
            )
            raise

    log_notification(
        appt_uuid,
        NotificationType.EMAIL,
        NotificationTrigger.J1,
        NotificationStatus.SENT,
    )
    log_notification(
        appt_uuid,
        NotificationType.SMS,
        NotificationTrigger.J1,
        NotificationStatus.SENT,
    )


@celery.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    retry_backoff=True,
)
def send_reminder_h1_video_task(self, appointment_id: str) -> None:
    """Tâche de rappel à H-1 pour les téléconsultations (Email + SMS avec lien)."""
    appt_uuid = UUID(appointment_id)
    appt = db.session.get(Appointment, appt_uuid)
    if not appt or appt.status != AppointmentStatus.CONFIRME:
        logger.info("Annulation rappel H-1 pour le RDV %s (RDV annulé/inexistant).", appointment_id)
        return

    patient = appt.patient
    doctor = appt.doctor

    email_body = (
        f"Bonjour {patient.first_name},\n\n"
        f"Votre téléconsultation commence dans 1 heure à {appt.slot_start.strftime('%H:%M')}.\n"
        f"Veuillez rejoindre la visioconférence via ce lien unique : {appt.video_url}"
    )
    sms_body = (
        f"MediRDV : Teleconsultation dans 1h. Rejoignez le salon : "
        f"{appt.video_url}"
    )

    email_ok = send_email(patient.email, "Votre téléconsultation dans 1 heure", email_body)
    sms_ok = send_sms(patient.phone, sms_body)

    if not email_ok or not sms_ok:
        try:
            raise self.retry()
        except self.MaxRetriesExceededError:
            log_notification(
                appt_uuid,
                NotificationType.EMAIL,
                NotificationTrigger.H1,
                NotificationStatus.FAILED,
            )
            log_notification(
                appt_uuid,
                NotificationType.SMS,
                NotificationTrigger.H1,
                NotificationStatus.FAILED,
            )
            raise

    log_notification(
        appt_uuid,
        NotificationType.EMAIL,
        NotificationTrigger.H1,
        NotificationStatus.SENT,
    )
    log_notification(
        appt_uuid,
        NotificationType.SMS,
        NotificationTrigger.H1,
        NotificationStatus.SENT,
    )


@celery.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    retry_backoff=True,
)
def send_cancellation_task(self, appointment_id: str) -> None:
    """Tâche d'envoi immédiat de notification d'annulation (Email + SMS)."""
    appt_uuid = UUID(appointment_id)
    appt = db.session.get(Appointment, appt_uuid)
    if not appt:
        logger.error("RDV %s introuvable pour notification d'annulation.", appointment_id)
        return

    patient = appt.patient
    doctor = appt.doctor

    email_body = (
        f"Bonjour,\n\n"
        f"Le rendez-vous prévu le {appt.slot_start.strftime('%d/%m/%Y à %H:%M')} "
        f"entre le patient {patient.first_name} {patient.last_name} "
        f"et le Dr. {doctor.first_name} {doctor.last_name} a été annulé."
    )
    sms_body = (
        f"MediRDV : Annulation du RDV prevu le "
        f"{appt.slot_start.strftime('%d/%m/%Y a %H:%M')}."
    )

    # Envoyer aux deux parties
    email_ok_p = send_email(patient.email, "Annulation de votre rendez-vous", email_body)
    email_ok_d = send_email(doctor.email, "Annulation de rendez-vous", email_body)
    sms_ok_p = send_sms(patient.phone, sms_body)

    if not email_ok_p or not email_ok_d or not sms_ok_p:
        try:
            raise self.retry()
        except self.MaxRetriesExceededError:
            log_notification(
                appt_uuid,
                NotificationType.EMAIL,
                NotificationTrigger.CANCELLATION,
                NotificationStatus.FAILED,
            )
            log_notification(
                appt_uuid,
                NotificationType.SMS,
                NotificationTrigger.CANCELLATION,
                NotificationStatus.FAILED,
            )
            raise

    log_notification(
        appt_uuid,
        NotificationType.EMAIL,
        NotificationTrigger.CANCELLATION,
        NotificationStatus.SENT,
    )
    log_notification(
        appt_uuid,
        NotificationType.SMS,
        NotificationTrigger.CANCELLATION,
        NotificationStatus.SENT,
    )


@celery.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    retry_backoff=True,
)
def send_post_consultation_summary_task(self, appointment_id: str) -> None:
    """Tâche d'envoi du récapitulatif post-consultation (sans données médicales)."""
    appt_uuid = UUID(appointment_id)
    appt = db.session.get(Appointment, appt_uuid)
    if not appt:
        return

    patient = appt.patient
    doctor = appt.doctor

    email_body = (
        f"Bonjour {patient.first_name},\n\n"
        f"Votre téléconsultation avec le Dr. {doctor.last_name} s'est terminée avec succès.\n"
        f"Vous recevrez vos ordonnances et documents via votre espace sécurisé."
    )

    email_ok = send_email(patient.email, "Compte-rendu de votre consultation", email_body)

    if not email_ok:
        try:
            raise self.retry()
        except self.MaxRetriesExceededError:
            log_notification(
                appt_uuid,
                NotificationType.EMAIL,
                NotificationTrigger.POST_CONSULTATION,
                NotificationStatus.FAILED,
            )
            raise

    log_notification(
        appt_uuid,
        NotificationType.EMAIL,
        NotificationTrigger.POST_CONSULTATION,
        NotificationStatus.SENT,
    )
