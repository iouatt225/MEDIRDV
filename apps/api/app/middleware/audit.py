"""
MediRDV CI — Middleware d'audit pour le suivi RGPD des accès aux données de santé.
"""

from __future__ import annotations

from uuid import UUID

from flask import Flask, request
from flask_jwt_extended import get_jwt_identity

from app.extensions import db
from app.models.audit import AuditLog


def init_audit_middleware(app: Flask) -> None:
    """Initialise le middleware d'audit après chaque requête GET."""

    @app.after_request
    def audit_log_after_request(response):
        # On ne logue que les succès sur les requêtes GET de lecture des données
        if response.status_code == 200 and request.method == "GET":
            path = request.path
            action = None
            resource_id = None

            # 1. Vérification des accès aux fiches de rendez-vous
            if path.startswith("/api/v1/appointments/"):
                parts = path.strip("/").split("/")
                # ex: ["api", "v1", "appointments", "<id>"]
                if len(parts) >= 4 and parts[3] != "export":
                    action = "GET_APPOINTMENT"
                    resource_id = parts[3]

            # 2. Vérification des accès au profil utilisateur (/users/me)
            elif path.startswith("/api/v1/users/me"):
                action = "GET_SELF_PROFILE"

            if action:
                try:
                    user_id_str = get_jwt_identity()
                    user_uuid = UUID(user_id_str) if user_id_str else None

                    # Créer une entrée dans le journal d'audit
                    log_entry = AuditLog(
                        user_id=user_uuid,
                        action=action,
                        resource_id=resource_id,
                    )
                    db.session.add(log_entry)
                    db.session.commit()
                except Exception:
                    # Ne pas faire échouer la requête en cas d'erreur de journalisation d'audit
                    db.session.rollback()

        return response
