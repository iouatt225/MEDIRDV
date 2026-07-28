"""
MediRDV CI — Provider SendGrid pour l'envoi d'emails.
"""

from __future__ import annotations

import logging
import os

try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail
    SENDGRID_AVAILABLE = True
except ImportError:
    SENDGRID_AVAILABLE = False

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str) -> bool:
    """Envoie un email via SendGrid.

    Retourne True en cas de succès, False sinon.
    Si TESTING=True ou si la clé API SendGrid est absente, simule l'envoi.
    """
    is_testing = (
        os.environ.get("FLASK_ENV") == "testing"
        or os.environ.get("TESTING") == "True"
        or os.environ.get("TESTING") is True
    )
    api_key = os.environ.get("SENDGRID_API_KEY")
    from_email = os.environ.get("SENDGRID_FROM_EMAIL", "no-reply@medirdv.com")

    if is_testing or not SENDGRID_AVAILABLE or not api_key:
        logger.info("[MOCK EMAIL] To: %s | Subject: %s | Body: %s", to, subject, body)
        return True

    try:
        message = Mail(
            from_email=from_email,
            to_emails=to,
            subject=subject,
            plain_text_content=body,
        )
        sg = SendGridAPIClient(api_key)
        sg.send(message)
        logger.info("Email envoyé avec succès via SendGrid à %s", to)
        return True
    except Exception as exc:
        logger.error("Échec d'envoi d'email SendGrid à %s : %s", to, exc)
        return False
