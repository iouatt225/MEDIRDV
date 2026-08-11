"""
MediRDV CI — Enums partagés par les modèles SQLAlchemy.

Tous les enums sont définis comme ``enum.Enum`` Python et mappés
via ``sa.Enum(EnumClass)`` pour compatibilité PostgreSQL et SQLite.
"""

from __future__ import annotations

import enum


class UserRole(str, enum.Enum):
    """Rôles utilisateurs de la plateforme."""

    ADMIN = "admin"
    MEDECIN = "medecin"
    SECRETAIRE = "secretaire"
    PATIENT = "patient"


class ConsultationType(str, enum.Enum):
    """Types de consultation proposés par un médecin."""

    PRESENTIEL = "presentiel"
    VIDEO = "video"


class AppointmentStatus(str, enum.Enum):
    """Statuts du cycle de vie d'un rendez-vous."""

    CONFIRME = "confirme"
    ANNULE = "annule"
    EFFECTUE = "effectue"
    MANQUE = "manque"


class SecretaryDoctorStatus(str, enum.Enum):
    """Statut du rattachement secrétaire ↔ médecin."""

    ACTIVE = "active"
    REVOKED = "revoked"


class NotificationType(str, enum.Enum):
    """Canal d'envoi de la notification."""

    SMS = "sms"
    EMAIL = "email"


class NotificationTrigger(str, enum.Enum):
    """Événement déclencheur de la notification."""

    CONFIRM = "confirm"
    J1 = "j1"
    H1 = "h1"
    J7 = "j7"
    POST_CONSULTATION = "post_consultation"
    CANCELLATION = "cancellation"


class NotificationStatus(str, enum.Enum):
    """Résultat de l'envoi de la notification."""

    SENT = "sent"
    FAILED = "failed"
