"""
MediRDV CI — Factory Flask ``create_app``.

Point d'entrée de l'application. Charge la configuration, initialise les
extensions et enregistre les Blueprints de chaque module métier.
"""

from __future__ import annotations

from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException

from config import Config, config_by_name

from .extensions import db, init_extensions
from . import extensions


def create_app(config_name: str = "development") -> Flask:
    """Crée et configure l'application Flask.

    Args:
        config_name: Nom de la configuration (``development``, ``testing``,
            ``production``).

    Returns:
        Instance Flask configurée et prête.
    """
    app = Flask(__name__)

    # --- Configuration ---
    cfg: type[Config] = config_by_name.get(config_name, config_by_name["development"])
    app.config.from_object(cfg)

    # --- Extensions ---
    init_extensions(app)

    # --- Middleware d'audit (RGPD) ---
    from .middleware.audit import init_audit_middleware
    init_audit_middleware(app)

    # --- Import des modèles (nécessaire pour Alembic et db.create_all) ---
    with app.app_context():
        from app import models as _models  # noqa: F401

    # --- Blueprints ---
    _register_blueprints(app)

    # --- Error handlers ---
    _register_error_handlers(app)

    # --- Health endpoint ---
    _register_health(app)

    return app


# --------------------------------------------------------------------- #
#  Blueprints
# --------------------------------------------------------------------- #

def _register_blueprints(app: Flask) -> None:
    """Enregistre tous les Blueprints métier."""
    from .auth.routes import auth_bp
    from .users.routes import users_bp
    from .agenda.routes import agenda_bp
    from .appointments.routes import appointments_bp
    from .teleconsult.routes import teleconsult_bp
    from .notifications.routes import notifications_bp
    from .dashboard.routes import dashboard_bp
    from .admin.routes import admin_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(agenda_bp)
    app.register_blueprint(appointments_bp)
    app.register_blueprint(teleconsult_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(admin_bp)


# --------------------------------------------------------------------- #
#  Error handlers — format JSON uniforme
# --------------------------------------------------------------------- #

def _register_error_handlers(app: Flask) -> None:
    """Enregistre les handlers d'erreurs HTTP globaux.

    Toutes les erreurs sont renvoyées au format :
    ``{"error": "code_erreur", "message": "..."}``
    """

    @app.errorhandler(HTTPException)
    def handle_http_error(exc: HTTPException):  # type: ignore[return]
        return (
            jsonify({"error": exc.name.lower().replace(" ", "_"), "message": exc.description}),
            exc.code,
        )

    @app.errorhandler(Exception)
    def handle_generic_error(exc: Exception):  # type: ignore[return]
        app.logger.exception("Unhandled exception: %s", exc)
        return (
            jsonify({"error": "internal_server_error", "message": "Une erreur interne est survenue."}),
            500,
        )


# --------------------------------------------------------------------- #
#  Health check
# --------------------------------------------------------------------- #

def _register_health(app: Flask) -> None:
    """Enregistre l'endpoint ``/health`` pour le monitoring."""

    @app.route("/health")
    def health():  # type: ignore[return]
        status: dict[str, object] = {"status": "healthy"}
        overall_ok = True

        # --- PostgreSQL ---
        try:
            db.session.execute(db.text("SELECT 1"))
            status["database"] = "connected"
        except Exception as exc:
            app.logger.error("Health check DB failed: %s", exc)
            status["database"] = "disconnected"
            overall_ok = False

        # --- Redis ---
        try:
            if extensions.redis_client is not None:
                extensions.redis_client.ping()
                status["redis"] = "connected"
            else:
                status["redis"] = "not_configured"
                overall_ok = False
        except Exception as exc:
            app.logger.error("Health check Redis failed: %s", exc)
            status["redis"] = "disconnected"
            overall_ok = False

        if not overall_ok:
            status["status"] = "degraded"
            return jsonify(status), 503

        return jsonify(status), 200
