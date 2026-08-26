"""Legacy command retained for compatibility; Alembic now owns migrations."""

from pathlib import Path

from alembic import command
from alembic.config import Config


def migrate() -> None:
    backend_root = Path(__file__).resolve().parent
    config = Config(str(backend_root / "alembic.ini"))
    config.set_main_option("script_location", str(backend_root / "alembic"))
    command.upgrade(config, "head")


if __name__ == "__main__":
    migrate()
