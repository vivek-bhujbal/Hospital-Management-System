"""Compatibility entry point for older setup instructions.

Schema creation is intentionally delegated to Alembic. The legacy SQL dump is
not imported because it conflicts with the current ORM and migration history.
"""

import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from init_db import init_db  # noqa: E402


if __name__ == "__main__":
    print("Legacy SQL import is disabled; applying the Alembic migration chain.")
    init_db()
