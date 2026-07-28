"""
MediRDV CI — Tests d'intégration pour le module ``notifications`` et Celery (BLOC 8).
"""

from __future__ import annotations

from datetime import datetime, timedelta
from unittest.mock import patch

import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.extensions import db
from app.models import Appointment, AppointmentStatus, ConsultationType, NotificationLog, User
from app.models.enums import NotificationStatus, NotificationTrigger, NotificationType
from app.notifications.tasks import (
    send_cancellation_task,
    send_confirmation_task,
    send_reminder_h1_video_task,
    send_reminder_j1_task,
)


class TestNotificationsIntegration:
    """Tests d'intégration des notifications et des tâches Celery."""

    def test_notification_logs_and_tasks(self, app: Flask) -> None:
        """Les tâches Celery s'exécutent avec succès et créent des logs d'envoi."""
        doctor = User(
            role="medecin",
            first_name="Paul",
            last_name="Eluard",
            phone="+22501010190",
            password_hash="...",
        )
        patient = User(
            role="patient",
            first_name="Gala",
            last_name="Dali",
            phone="+22502020290",
            password_hash="...",
        )
        db.session.add_all([doctor, patient])
        db.session.commit()

        slot_start = datetime.now() + timedelta(days=2)
        slot_end = slot_start + timedelta(minutes=30)
        appt = Appointment(
            doctor_id=doctor.id,
            patient_id=patient.id,
            slot_start=slot_start,
            slot_end=slot_end,
            type=ConsultationType.VIDEO,
            status=AppointmentStatus.CONFIRME,
            video_url="https://medirdv.daily.co/room-notif",
        )
        db.session.add(appt)
        db.session.commit()

        # 1. Tester send_confirmation_task (Email + SMS)
        send_confirmation_task(str(appt.id))

        logs = NotificationLog.query.filter_by(appointment_id=appt.id).all()
        assert len(logs) == 2
        triggers = [log.trigger for log in logs]
        statuses = [log.status for log in logs]
        assert NotificationTrigger.CONFIRM in triggers
        assert all(status == NotificationStatus.SENT for status in statuses)

        # 2. Tester send_reminder_j1_task
        send_reminder_j1_task(str(appt.id))
        j1_logs = NotificationLog.query.filter_by(
            appointment_id=appt.id, trigger=NotificationTrigger.J1
        ).all()
        assert len(j1_logs) == 2

        # 3. Tester send_reminder_h1_video_task
        send_reminder_h1_video_task(str(appt.id))
        h1_logs = NotificationLog.query.filter_by(
            appointment_id=appt.id, trigger=NotificationTrigger.H1
        ).all()
        assert len(h1_logs) == 2

    @patch("app.notifications.tasks.send_email")
    def test_notification_retry_behavior(self, mock_send_email, app: Flask) -> None:
        """En cas d'échec du provider, la tâche Celery effectue des retries, puis logue l'échec."""
        # Simuler un échec permanent
        mock_send_email.return_value = False

        doctor = User(
            role="medecin",
            first_name="Max",
            last_name="Ernst",
            phone="+22501010191",
            password_hash="...",
        )
        patient = User(
            role="patient",
            first_name="Luise",
            last_name="Straus",
            phone="+22502020291",
            password_hash="...",
        )
        db.session.add_all([doctor, patient])
        db.session.commit()

        slot_start = datetime.now() + timedelta(days=2)
        slot_end = slot_start + timedelta(minutes=30)
        appt = Appointment(
            doctor_id=doctor.id,
            patient_id=patient.id,
            slot_start=slot_start,
            slot_end=slot_end,
            type=ConsultationType.PRESENTIEL,
            status=AppointmentStatus.CONFIRME,
        )
        db.session.add(appt)
        db.session.commit()

        from celery.exceptions import Retry
        with pytest.raises(Retry):
            send_confirmation_task(str(appt.id))
