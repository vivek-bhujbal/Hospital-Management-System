"""Explicit, MySQL-only application database reset.

This command never runs during application startup. It keeps the configured
database and Docker volume, removes every table/view inside that one schema,
runs Alembic to head, and bootstraps only the environment-owned Super Admin.
"""

import argparse
import re
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect
from sqlalchemy.engine import make_url

from app.core.config import settings
from app.database import SessionLocal, engine
from app.services.super_admin_bootstrap import bootstrap_super_admin_from_settings


PROTECTED_DATABASES = {
    "information_schema",
    "mysql",
    "performance_schema",
    "sys",
}
PRODUCTION_ENVIRONMENTS = {"prod", "production"}


def configured_database_name() -> str:
    url = make_url(settings.DATABASE_URL)
    if not url.drivername.startswith("mysql"):
        raise RuntimeError("The reset command only supports the configured MySQL database")
    name = url.database
    if not name or not re.fullmatch(r"[A-Za-z0-9_]+", name):
        raise RuntimeError("DATABASE_URL must contain a safe MySQL database name")
    if name.lower() in PROTECTED_DATABASES:
        raise RuntimeError("Refusing to reset a protected MySQL system database")
    return name


def validate_reset_target(confirmation: str) -> str:
    if settings.APP_ENV.strip().lower() in PRODUCTION_ENVIRONMENTS:
        raise RuntimeError("Database reset is disabled when APP_ENV is production")
    database_name = configured_database_name()
    if confirmation != database_name:
        raise RuntimeError(
            "Reset confirmation does not exactly match the configured database name"
        )
    return database_name


def _alembic_config() -> Config:
    backend_root = Path(__file__).resolve().parent
    config = Config(str(backend_root / "alembic.ini"))
    config.set_main_option("script_location", str(backend_root / "alembic"))
    return config


def drop_configured_schema_objects() -> tuple[list[str], list[str]]:
    """Drop all views and tables in the already-validated configured schema."""
    with engine.connect() as connection:
        schema_inspector = inspect(connection)
        views = schema_inspector.get_view_names()
        tables = schema_inspector.get_table_names()
        preparer = connection.dialect.identifier_preparer

        connection.exec_driver_sql("SET FOREIGN_KEY_CHECKS = 0")
        try:
            for view in views:
                connection.exec_driver_sql(f"DROP VIEW {preparer.quote(view)}")
            for table in tables:
                connection.exec_driver_sql(f"DROP TABLE {preparer.quote(table)}")
        finally:
            connection.exec_driver_sql("SET FOREIGN_KEY_CHECKS = 1")
    return tables, views


def reset_database(confirmation: str) -> tuple[list[str], list[str], int]:
    database_name = validate_reset_target(confirmation)
    tables, views = drop_configured_schema_objects()
    command.upgrade(_alembic_config(), "head")

    db = SessionLocal()
    try:
        result = bootstrap_super_admin_from_settings(db)
    finally:
        db.close()

    print(f"Reset completed for configured database '{database_name}'.")
    print(f"Dropped {len(tables)} table(s) and {len(views)} view(s).")
    print("Alembic migration status: head.")
    print("Super Admin bootstrap status: created.")
    return tables, views, result.user_id


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--confirm-database",
        required=True,
        help="Exact configured MySQL database name; required destructive confirmation",
    )
    args = parser.parse_args()
    reset_database(args.confirm_database)


if __name__ == "__main__":
    main()
