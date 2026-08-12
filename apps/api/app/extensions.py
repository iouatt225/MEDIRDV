"""
MediRDV CI — Initialisation lazy des extensions Flask.

Chaque extension est instanciée ici sans app, puis initialisée
dans la factory ``create_app`` via ``init_extensions(app)``.
"""

from __future__ import annotations

from celery import Celery
from flask import Flask
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate
from flask_smorest import Api
from flask_sqlalchemy import SQLAlchemy
from redis import Redis

# --- Extensions Flask (lazy) ---
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
bcrypt = Bcrypt()
cors = CORS()
limiter = Limiter(key_func=get_remote_address, default_limits=["200 per minute"])
smorest_api = Api()

# --- Redis (initialisé manuellement) ---
redis_client: Redis | None = None

# --- Celery ---
celery = Celery(__name__)


def init_extensions(app: Flask) -> None:
    """Initialise toutes les extensions avec l'application Flask."""
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config["FRONTEND_URL"]}},
        supports_credentials=True,
    )
    limiter.init_app(app)

    # Flask-Smorest (OpenAPI / Swagger)
    app.config.setdefault("API_TITLE", "MediRDV CI API")
    app.config.setdefault("API_VERSION", "v1")
    app.config.setdefault("OPENAPI_VERSION", "3.0.3")
    app.config.setdefault("OPENAPI_URL_PREFIX", "/api/docs")
    app.config.setdefault("OPENAPI_SWAGGER_UI_PATH", "/swagger")
    app.config.setdefault(
        "OPENAPI_SWAGGER_UI_URL",
        "https://cdn.jsdelivr.net/npm/swagger-ui-dist/",
    )
    smorest_api.init_app(app)

    # Redis
    global redis_client  # noqa: PLW0603
    if app.config.get("TESTING"):
        class MockRedis:
            def __init__(self) -> None:
                self.data: dict[str, str] = {}

            def ping(self) -> bool:
                return True

            def keys(self, pattern: str) -> list[str]:
                prefix = pattern.replace("*", "")
                return [k for k in self.data.keys() if k.startswith(prefix)]

            def get(self, name: str) -> str | None:
                return self.data.get(name)

            def setex(self, name: str, time: int, value: str) -> None:
                self.data[name] = str(value)

            def delete(self, *names: str) -> int:
                count = 0
                for name in names:
                    if self.data.pop(name, None) is not None:
                        count += 1
                return count

        redis_client = MockRedis()  # type: ignore[assignment]
    else:
        redis_client = Redis.from_url(app.config["REDIS_URL"], decode_responses=True)

    # Celery
    _init_celery(app)


def _init_celery(app: Flask) -> None:
    """Configure Celery pour fonctionner avec le contexte Flask."""
    celery.conf.broker_url = app.config["CELERY_BROKER_URL"]
    celery.conf.result_backend = app.config["CELERY_RESULT_BACKEND"]
    celery.conf.task_serializer = "json"
    celery.conf.result_serializer = "json"
    celery.conf.accept_content = ["json"]
    celery.conf.timezone = "Africa/Abidjan"
    celery.conf.enable_utc = True
    if app.config.get("TESTING"):
        celery.conf.task_always_eager = True

    class ContextTask(celery.Task):  # type: ignore[name-defined]
        """Assure que chaque tâche Celery s'exécute dans le contexte Flask."""

        def __call__(self, *args: object, **kwargs: object) -> object:
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask  # type: ignore[assignment]
