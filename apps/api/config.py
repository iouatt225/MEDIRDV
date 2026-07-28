"""
MediRDV CI — Configuration multi-environnement.

Toutes les valeurs sensibles sont lues depuis les variables d'environnement.
Ne jamais hard-coder de secrets ici.
"""

from __future__ import annotations

import os
from datetime import timedelta


class Config:
    """Configuration de base, partagée par tous les environnements."""

    # --- Flask ---
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "change-me-in-production")
    DEBUG: bool = False
    TESTING: bool = False

    # --- SQLAlchemy ---
    SQLALCHEMY_DATABASE_URI: str = os.environ.get(
        "DATABASE_URL",
        "postgresql://medirdv:medirdv@localhost:5432/medirdv",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    SQLALCHEMY_ENGINE_OPTIONS: dict = {
        "pool_pre_ping": True,
        "pool_size": 10,
        "max_overflow": 20,
    }

    # --- JWT ---
    JWT_SECRET_KEY: str = os.environ.get("JWT_SECRET_KEY", "change-me-jwt-secret")
    JWT_ACCESS_TOKEN_EXPIRES: timedelta = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES: timedelta = timedelta(days=30)
    JWT_TOKEN_LOCATION: list[str] = ["headers", "cookies"]
    JWT_COOKIE_SECURE: bool = True
    JWT_COOKIE_HTTPONLY: bool = True
    JWT_COOKIE_SAMESITE: str = "Strict"
    JWT_COOKIE_CSRF_PROTECT: bool = True

    # --- Redis ---
    REDIS_URL: str = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

    # --- Celery ---
    CELERY_BROKER_URL: str = os.environ.get(
        "CELERY_BROKER_URL", "redis://localhost:6379/1"
    )
    CELERY_RESULT_BACKEND: str = os.environ.get(
        "CELERY_RESULT_BACKEND", "redis://localhost:6379/2"
    )

    # --- CORS ---
    FRONTEND_URL: str = os.environ.get("FRONTEND_URL", "http://localhost:3000")

    # --- Minio ---
    MINIO_ENDPOINT: str = os.environ.get("MINIO_ENDPOINT", "localhost:9000")
    MINIO_ACCESS_KEY: str = os.environ.get("MINIO_ACCESS_KEY", "minioadmin")
    MINIO_SECRET_KEY: str = os.environ.get("MINIO_SECRET_KEY", "minioadmin")
    MINIO_BUCKET: str = os.environ.get("MINIO_BUCKET", "medirdv")

    # --- Twilio ---
    TWILIO_ACCOUNT_SID: str = os.environ.get("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.environ.get("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER: str = os.environ.get("TWILIO_PHONE_NUMBER", "")

    # --- SendGrid ---
    SENDGRID_API_KEY: str = os.environ.get("SENDGRID_API_KEY", "")
    SENDGRID_FROM_EMAIL: str = os.environ.get(
        "SENDGRID_FROM_EMAIL", "noreply@medirdv.ci"
    )

    # --- Daily.co ---
    DAILY_API_KEY: str = os.environ.get("DAILY_API_KEY", "")
    DAILY_API_URL: str = os.environ.get("DAILY_API_URL", "https://api.daily.co/v1")

    # --- Sentry ---
    SENTRY_DSN: str = os.environ.get("SENTRY_DSN", "")


class DevelopmentConfig(Config):
    """Configuration de développement local."""

    DEBUG = True
    JWT_COOKIE_SECURE = False  # Pas de HTTPS en local


class TestingConfig(Config):
    """Configuration pour les tests Pytest — base de données isolée."""

    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "TEST_DATABASE_URL",
        "postgresql://medirdv:medirdv@localhost:5432/medirdv_test",
    )
    # SQLite ne supporte pas pool_size/max_overflow — on vide les options.
    # En CI avec PostgreSQL, on peut les redéfinir via les variables d'env.
    SQLALCHEMY_ENGINE_OPTIONS: dict = {
        "connect_args": {"check_same_thread": False}
    }
    JWT_COOKIE_SECURE = False
    JWT_COOKIE_CSRF_PROTECT = False
    # Désactiver le rate limiting pendant les tests
    RATELIMIT_ENABLED = False


class ProductionConfig(Config):
    """Configuration de production — toutes les valeurs depuis l'environnement."""

    DEBUG = False
    SQLALCHEMY_ENGINE_OPTIONS: dict = {
        "pool_pre_ping": True,
        "pool_size": 20,
        "max_overflow": 40,
    }


# Mapping nom → classe pour la factory create_app
config_by_name: dict[str, type[Config]] = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}
