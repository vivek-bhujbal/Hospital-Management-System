from sqlalchemy.engine import make_url

from app.core.config import Settings


def test_database_host_override_preserves_database_credentials():
    settings = Settings(
        _env_file=None,
        DATABASE_URL="mysql+pymysql://app_user:encoded%21password@localhost/hospital_management",
        DATABASE_HOST_OVERRIDE="db",
        SECRET_KEY="test-secret",
    )

    url = make_url(settings.DATABASE_URL)
    assert url.host == "db"
    assert url.username == "app_user"
    assert url.password == "encoded!password"
    assert url.database == "hospital_management"


def test_database_url_is_unchanged_without_override():
    database_url = "sqlite+pysqlite:///:memory:"
    settings = Settings(
        _env_file=None,
        DATABASE_URL=database_url,
        SECRET_KEY="test-secret",
    )

    assert settings.DATABASE_URL == database_url
