"""
MediRDV CI — Alembic environment configuration.

Configuré pour fonctionner avec Flask-Migrate.
"""
from __future__ import annotations

import logging
from logging.config import fileConfig

from flask import current_app

from alembic import context

# Alembic Config object
config = context.config

# Interpret the config file for Python logging.
fileConfig(config.config_file_name)  # type: ignore[arg-type]
logger = logging.getLogger("alembic.env")


def get_engine():
    try:
        # Flask-Migrate ≥ 4.x
        return current_app.extensions["migrate"].db.get_engine()
    except (TypeError, AttributeError):
        # Fallback for older Flask-Migrate
        return current_app.extensions["migrate"].db.engine


def get_engine_url():
    try:
        return get_engine().url.render_as_string(hide_password=False).replace("%", "%%")
    except AttributeError:
        return str(get_engine().url).replace("%", "%%")


# Set the SQLAlchemy URL in the Alembic config
config.set_main_option("sqlalchemy.url", get_engine_url())
target_db = current_app.extensions["migrate"].db


def get_metadata():
    if hasattr(target_db, "metadatas"):
        return target_db.metadatas[None]
    return target_db.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=get_metadata(), literal_binds=True)

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""

    def process_revision_directives(context, revision, directives):  # type: ignore[no-untyped-def]
        if getattr(config.cmd_opts, "autogenerate", False):
            script = directives[0]
            if script.upgrade_ops.is_empty():
                directives[:] = []
                logger.info("No changes in schema detected.")

    connectable = get_engine()

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=get_metadata(),
            process_revision_directives=process_revision_directives,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
