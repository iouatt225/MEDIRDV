"""
MediRDV CI — Import central de tous les modèles SQLAlchemy.

Ce module réexporte tous les modèles pour qu'Alembic les détecte
via ``db.metadata``. Il est importé dans la factory ``create_app``.

Usage :
    from app.models import User, DoctorProfile, Appointment, ...
"""

from __future__ import annotations

# --- Enums ---
from app.models.enums import (  # noqa: F401
    AppointmentStatus,
    ConsultationType,
    NotificationStatus,
    NotificationTrigger,
    NotificationType,
    SecretaryDoctorStatus,
    UserRole,
)

# --- Modèles ---
from app.auth.models import User  # noqa: F401
from app.users.models import (  # noqa: F401
    DoctorProfile,
    PatientProfile,
    SecretaryDoctor,
)
from app.agenda.models import AvailabilitySlot, BlockedSlot  # noqa: F401
from app.appointments.models import Appointment  # noqa: F401
from app.notifications.models import NotificationLog  # noqa: F401
from app.models.audit import AuditLog  # noqa: F401
from app.models.admin_action import AdminActionLog  # noqa: F401

__all__ = [
    # Enums
    "UserRole",
    "ConsultationType",
    "AppointmentStatus",
    "SecretaryDoctorStatus",
    "NotificationType",
    "NotificationTrigger",
    "NotificationStatus",
    # Modèles
    "User",
    "DoctorProfile",
    "PatientProfile",
    "SecretaryDoctor",
    "AvailabilitySlot",
    "BlockedSlot",
    "Appointment",
    "NotificationLog",
    "AuditLog",
    "AdminActionLog",
]
