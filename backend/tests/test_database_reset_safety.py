import pytest

from app.core.config import settings
from reset_db import configured_database_name, validate_reset_target


def test_reset_requires_exact_database_confirmation(monkeypatch):
    monkeypatch.setattr(
        settings,
        "DATABASE_URL",
        "mysql+pymysql://user:secret@db/hospital_management",
    )
    monkeypatch.setattr(settings, "APP_ENV", "development")

    assert configured_database_name() == "hospital_management"
    assert validate_reset_target("hospital_management") == "hospital_management"
    with pytest.raises(RuntimeError, match="does not exactly match"):
        validate_reset_target("another_database")


@pytest.mark.parametrize(
    "database_url",
    [
        "sqlite:///hospital.db",
        "mysql+pymysql://user:secret@db/mysql",
        "mysql+pymysql://user:secret@db/information_schema",
    ],
)
def test_reset_rejects_non_mysql_and_system_databases(monkeypatch, database_url):
    monkeypatch.setattr(settings, "DATABASE_URL", database_url)
    monkeypatch.setattr(settings, "APP_ENV", "development")
    with pytest.raises(RuntimeError):
        configured_database_name()


@pytest.mark.parametrize("environment", ["prod", "production", "PRODUCTION"])
def test_reset_is_disabled_in_production(monkeypatch, environment):
    monkeypatch.setattr(
        settings,
        "DATABASE_URL",
        "mysql+pymysql://user:secret@db/hospital_management",
    )
    monkeypatch.setattr(settings, "APP_ENV", environment)
    with pytest.raises(RuntimeError, match="disabled"):
        validate_reset_target("hospital_management")
