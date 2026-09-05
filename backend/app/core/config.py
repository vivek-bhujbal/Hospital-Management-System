from pydantic import ConfigDict, model_validator
from pydantic_settings import BaseSettings
from sqlalchemy.engine import make_url

class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", extra="allow")

    DATABASE_URL: str
    DATABASE_HOST_OVERRIDE: str | None = None
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    # Set to 0 to keep authenticated sessions active until explicit logout.
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 0

    FRONTEND_URL: str = "http://localhost:3000"
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "Hospital Management System"
    CORS_ORIGINS: str = "http://localhost:3000"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"
    APP_ENV: str = "development"
    HOSPITAL_TIMEZONE: str = "Asia/Kolkata"

    SUPER_ADMIN_EMAIL: str | None = None
    SUPER_ADMIN_PASSWORD: str | None = None
    SUPER_ADMIN_NAME: str | None = None

    @model_validator(mode="after")
    def apply_database_host_override(self):
        """Allow containers to replace only the host without duplicating credentials."""
        if self.DATABASE_HOST_OVERRIDE:
            url = make_url(self.DATABASE_URL)
            if url.host is not None:
                self.DATABASE_URL = url.set(
                    host=self.DATABASE_HOST_OVERRIDE,
                ).render_as_string(hide_password=False)
        return self

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

settings = Settings()
