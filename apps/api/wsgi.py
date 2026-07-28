"""
MediRDV CI — Point d'entrée WSGI.

Utilisé par :
- ``flask run`` en développement
- ``gunicorn wsgi:app`` en production
"""

from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()  # Charge le fichier .env à la racine de apps/api

from app import create_app  # noqa: E402

config_name: str = os.environ.get("FLASK_ENV", "development")
app = create_app(config_name)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
