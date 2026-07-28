"""
MediRDV CI — Mixins de base pour les modèles SQLAlchemy.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func


class TimestampMixin:
    """Ajoute ``created_at`` et ``updated_at`` à tout modèle.

    - ``created_at`` : renseigné automatiquement à l'insertion.
    - ``updated_at`` : renseigné automatiquement à chaque mise à jour.
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
