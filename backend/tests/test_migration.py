from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

from app.core.config import settings


def _config(database_url: str) -> Config:
    settings.DATABASE_URL = database_url
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option(
        "script_location", str(Path(__file__).parents[1] / "alembic")
    )
    return config


def test_rbac_migration_preserves_existing_users(tmp_path):
    database_path = tmp_path / "legacy.db"
    database_url = f"sqlite:///{database_path.as_posix()}"
    engine = create_engine(database_url)
    with engine.begin() as connection:
        connection.execute(text(
            "CREATE TABLE users ("
            "id INTEGER PRIMARY KEY, name VARCHAR(100) NOT NULL, "
            "email VARCHAR(150) NOT NULL, password_hash VARCHAR(255) NOT NULL, "
            "role VARCHAR(50) NOT NULL)"
        ))
        connection.execute(text(
            "INSERT INTO users (id, name, email, password_hash, role) VALUES "
            "(1, 'Existing Patient', 'existing@example.com', 'hash', 'patient')"
        ))

    previous_url = settings.DATABASE_URL
    settings.DATABASE_URL = database_url
    try:
        command.upgrade(_config(database_url), "head")
    finally:
        settings.DATABASE_URL = previous_url

    with engine.connect() as connection:
        existing = connection.execute(
            text("SELECT id, role FROM users WHERE id = 1")
        ).one()
        assert existing == (1, "patient")
        assert "audit_logs" in inspect(connection).get_table_names()


def test_migration_refuses_to_drop_populated_unmanaged_enterprise_table(tmp_path):
    database_path = tmp_path / "populated-enterprise.db"
    database_url = f"sqlite:///{database_path.as_posix()}"
    previous_url = settings.DATABASE_URL
    try:
        config = _config(database_url)
        command.upgrade(config, "20260826_0001")
        engine = create_engine(database_url)
        with engine.begin() as connection:
            connection.execute(text(
                "CREATE TABLE medicine_categories (id INTEGER PRIMARY KEY, name VARCHAR(100))"
            ))
            connection.execute(text(
                "INSERT INTO medicine_categories (id, name) VALUES (1, 'Preserve me')"
            ))

        try:
            command.upgrade(config, "head")
            raise AssertionError("Migration should refuse a destructive automatic conversion")
        except RuntimeError as exc:
            assert "populated unmanaged enterprise tables" in str(exc)

        with engine.connect() as connection:
            assert connection.execute(
                text("SELECT name FROM medicine_categories WHERE id = 1")
            ).scalar_one() == "Preserve me"
    finally:
        settings.DATABASE_URL = previous_url
