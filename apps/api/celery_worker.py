"""
MediRDV CI — Point d'entrée Celery worker.

Lancer avec :
    celery -A celery_worker.celery worker --loglevel=info
"""

from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()

from app import create_app  # noqa: E402
from app.extensions import celery  # noqa: E402

config_name: str = os.environ.get("FLASK_ENV", "development")
app = create_app(config_name)

# L'instance ``celery`` est déjà configurée par ``init_extensions``,
# mais on la rend accessible au module pour la CLI Celery.
__all__ = ["celery"]
