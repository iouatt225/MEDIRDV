"""
MediRDV CI — Provider Twilio pour l'envoi de SMS.
"""

from __future__ import annotations

import logging
import os

try:
    from twilio.rest import Client
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False

logger = logging.getLogger(__name__)


def send_sms(to: str, body: str) -> bool:
    """Envoie un SMS via Twilio.

    Retourne True en cas de succès, False sinon.
    Si TESTING=True ou si les identifiants Twilio sont absents, simule l'envoi.
    """
    is_testing = (
        os.environ.get("FLASK_ENV") == "testing"
        or os.environ.get("TESTING") == "True"
        or os.environ.get("TESTING") is True
    )
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
    from_number = os.environ.get("TWILIO_FROM_NUMBER", "+1234567890")

    if is_testing or not TWILIO_AVAILABLE or not account_sid or not auth_token:
        logger.info("[MOCK SMS] To: %s | Body: %s", to, body)
        return True

    try:
        client = Client(account_sid, auth_token)
        client.messages.create(to=to, from_=from_number, body=body)
        logger.info("SMS envoyé avec succès via Twilio à %s", to)
        return True
    except Exception as exc:
        logger.error("Échec d'envoi de SMS Twilio à %s : %s", to, exc)
        return False
