import re
from pathlib import Path

import pymysql
from alembic import command
from alembic.config import Config
from sqlalchemy.engine import make_url

from app.core.config import settings


def _database_name() -> str:
    name = make_url(settings.DATABASE_URL).database
    if not name or not re.fullmatch(r"[A-Za-z0-9_]+", name):
        raise ValueError("DATABASE_URL must contain a safe MySQL database name")
    return name


def _ensure_database_exists() -> None:
    url = make_url(settings.DATABASE_URL)
    connection = pymysql.connect(
        host=url.host or "localhost",
        user=url.username,
        password=url.password,
        port=url.port or 3306,
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{_database_name()}`")
        connection.commit()
    finally:
        connection.close()


def _alembic_config() -> Config:
    backend_root = Path(__file__).resolve().parent
    config = Config(str(backend_root / "alembic.ini"))
    config.set_main_option("script_location", str(backend_root / "alembic"))
    return config


def init_db() -> None:
    _ensure_database_exists()
    command.upgrade(_alembic_config(), "head")
    print("Database migration completed successfully; no seed data was added.")


if __name__ == "__main__":
    init_db()
