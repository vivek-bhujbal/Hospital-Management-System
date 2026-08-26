"""Compatibility entry point for database setup using DATABASE_URL."""

from init_db import init_db


if __name__ == "__main__":
    init_db()
