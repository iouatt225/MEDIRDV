"""
MediRDV CI — Provider Daily.co pour la visioconférence.
"""

from __future__ import annotations

import logging
import os

import requests

logger = logging.getLogger(__name__)


def create_daily_room(room_name: str, expiry_timestamp: int) -> str:
    """Crée une room de visioconférence privée chez Daily.co.

    Retourne l'URL de la room.
    Mocké en test/développement.
    """
    is_testing = (
        os.environ.get("FLASK_ENV") == "testing"
        or os.environ.get("TESTING") == "True"
        or os.environ.get("TESTING") is True
    )
    api_key = os.environ.get("DAILY_API_KEY")

    if is_testing or not api_key:
        logger.info("[MOCK DAILY ROOM] Room: %s | Exp: %d", room_name, expiry_timestamp)
        return f"https://medirdv.daily.co/{room_name}"

    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "name": room_name,
            "privacy": "private",
            "properties": {
                "exp": expiry_timestamp,
                "eject_at_room_exp": True,
            },
        }
        resp = requests.post(
            "https://api.daily.co/v1/rooms",
            json=payload,
            headers=headers,
            timeout=10,
        )
        resp.raise_for_status()
        return str(resp.json()["url"])
    except Exception as exc:
        logger.error("Échec de création de room Daily %s : %s", room_name, exc)
        # Fallback pour ne pas bloquer le parcours utilisateur
        return f"https://medirdv.daily.co/{room_name}"


def generate_meeting_token(
    room_name: str, is_owner: bool, user_name: str, expiry_timestamp: int
) -> str:
    """Génère un meeting token Daily.co pour accèder à une room privée.

    Retourne le token généré.
    Mocké en test/développement.
    """
    is_testing = (
        os.environ.get("FLASK_ENV") == "testing"
        or os.environ.get("TESTING") == "True"
        or os.environ.get("TESTING") is True
    )
    api_key = os.environ.get("DAILY_API_KEY")

    if is_testing or not api_key:
        logger.info(
            "[MOCK DAILY TOKEN] Room: %s | Owner: %s | User: %s",
            room_name,
            is_owner,
            user_name,
        )
        return f"mock_token_{room_name}_{'doctor' if is_owner else 'patient'}"

    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "properties": {
                "room_name": room_name,
                "is_owner": is_owner,
                "user_name": user_name,
                "exp": expiry_timestamp,
            }
        }
        resp = requests.post(
            "https://api.daily.co/v1/meeting-tokens",
            json=payload,
            headers=headers,
            timeout=10,
        )
        resp.raise_for_status()
        return str(resp.json()["token"])
    except Exception as exc:
        logger.error("Échec de génération de token Daily pour room %s : %s", room_name, exc)
        return f"fallback_token_{room_name}"
