"""
MediRDV CI — Fixtures Pytest partagées.

Fournit les fixtures ``app``, ``client`` et ``db`` pour tous les tests.

En l'absence de PostgreSQL, utilise SQLite en mémoire comme fallback
pour permettre l'exécution des tests unitaires et des tests d'intégration
ne nécessitant pas de fonctionnalités spécifiques PostgreSQL.
"""

from __future__ import annotations

import os
from typing import Generator

# Forcer SQLite en mémoire si aucune base de test n'est configurée.
# Doit être fait AVANT l'import de l'app pour que la config lise la bonne URL.
if not os.environ.get("TEST_DATABASE_URL"):
    os.environ["TEST_DATABASE_URL"] = "sqlite:///file:memdb?mode=memory&cache=shared&uri=true"

import pytest  # noqa: E402
from flask import Flask  # noqa: E402
from flask.testing import FlaskClient  # noqa: E402

from app import create_app  # noqa: E402
from app.extensions import db as _db  # noqa: E402
from sqlalchemy import event  # noqa: E402
from sqlalchemy.engine import Engine  # noqa: E402


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record) -> None:
    """Enforce foreign key constraints in SQLite."""
    try:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
    except Exception:
        pass


@pytest.fixture(scope="session")
def app() -> Generator[Flask, None, None]:
    """Crée l'application Flask en mode ``testing``."""
    application = create_app("testing")

    with application.app_context():
        _db.create_all()
        yield application
        _db.drop_all()


@pytest.fixture()
def client(app: Flask) -> FlaskClient:
    """Fournit un client de test Flask."""
    return app.test_client()


@pytest.fixture(autouse=True)
def clean_db(app: Flask) -> Generator[None, None, None]:
    """Vide toutes les tables de la base de données avant chaque test."""
    with app.app_context():
        # Toujours rollback en premier pour effacer un état transactionnel corrompu
        _db.session.rollback()
        # Désactiver les contraintes de clés étrangères temporairement pour vider les tables
        # en évitant les erreurs d'intégrité
        _db.session.execute(_db.text("PRAGMA foreign_keys=OFF"))
        for table in reversed(_db.metadata.sorted_tables):
            _db.session.execute(table.delete())
        _db.session.execute(_db.text("PRAGMA foreign_keys=ON"))
        _db.session.commit()
    yield
    with app.app_context():
        _db.session.rollback()
        _db.session.remove()
