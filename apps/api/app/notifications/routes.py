"""
MediRDV CI — Routes du module ``notifications``.

Endpoints prévus (BLOC 8) :
- Endpoints internes / admin pour la gestion des notifications.
  La plupart des déclencheurs passent par les tâches Celery (pas par REST).
"""

from __future__ import annotations

from flask import Blueprint

notifications_bp = Blueprint("notifications", __name__, url_prefix="/api/v1/notifications")


# Les endpoints seront implémentés au BLOC 8.
