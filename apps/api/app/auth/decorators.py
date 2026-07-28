"""
MediRDV CI — Décorateurs pour la gestion des accès et rôles.
"""

from __future__ import annotations

from functools import wraps
from typing import Any, Callable

from flask import jsonify
from flask_jwt_extended import get_jwt, jwt_required


def require_role(*roles: str) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    """Décorateur pour restreindre l'accès à certains rôles d'utilisateurs.

    S'assure d'abord qu'un JWT valide est fourni, puis vérifie que le claim
    ``role`` fait partie des rôles autorisés.
    """

    def decorator(fn: Callable[..., Any]) -> Callable[..., Any]:
        @wraps(fn)
        @jwt_required()
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            claims = get_jwt()
            user_role = claims.get("role")
            if user_role not in roles:
                return (
                    jsonify(
                        {
                            "error": "forbidden",
                            "message": "Accès interdit pour ce rôle.",
                        }
                    ),
                    403,
                )
            return fn(*args, **kwargs)

        return wrapper

    return decorator
