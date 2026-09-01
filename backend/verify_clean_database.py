"""Verify migrated schema and the post-reset zero-business-data invariant."""

from pathlib import Path

from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import inspect, select, func
from sqlalchemy import UniqueConstraint

import app.models.all_models  # noqa: F401
from app.core.config import settings
from app.core.roles import UserRole
from app.core.security import verify_password
from app.database import Base, SessionLocal, engine
from app.models.all_models import User


def _alembic_head() -> str:
    backend_root = Path(__file__).resolve().parent
    config = Config(str(backend_root / "alembic.ini"))
    config.set_main_option("script_location", str(backend_root / "alembic"))
    return ScriptDirectory.from_config(config).get_current_head()


def _verify_table_structure(schema_inspector) -> dict[str, int]:
    totals = {"columns": 0, "foreign_keys": 0, "indexes": 0, "unique_constraints": 0}
    problems: list[str] = []

    for table_name, table in Base.metadata.tables.items():
        actual_columns = {
            column["name"]: column
            for column in schema_inspector.get_columns(table_name)
        }
        expected_column_names = set(table.columns.keys())
        if set(actual_columns) != expected_column_names:
            problems.append(f"{table_name}: column names differ")
            continue
        totals["columns"] += len(expected_column_names)
        for column in table.columns:
            if bool(actual_columns[column.name]["nullable"]) != bool(column.nullable):
                problems.append(f"{table_name}.{column.name}: nullable differs")

        expected_primary_key = tuple(column.name for column in table.primary_key.columns)
        actual_primary_key = tuple(
            schema_inspector.get_pk_constraint(table_name).get("constrained_columns") or ()
        )
        if actual_primary_key != expected_primary_key:
            problems.append(f"{table_name}: primary key differs")

        expected_foreign_keys = {
            (
                tuple(element.parent.name for element in constraint.elements),
                tuple(
                    (element.column.table.name, element.column.name)
                    for element in constraint.elements
                ),
            )
            for constraint in table.foreign_key_constraints
        }
        actual_foreign_keys = {
            (
                tuple(foreign_key["constrained_columns"]),
                tuple(
                    zip(
                        [foreign_key["referred_table"]]
                        * len(foreign_key["referred_columns"]),
                        foreign_key["referred_columns"],
                    )
                ),
            )
            for foreign_key in schema_inspector.get_foreign_keys(table_name)
        }
        if actual_foreign_keys != expected_foreign_keys:
            problems.append(f"{table_name}: foreign keys differ")
        totals["foreign_keys"] += len(expected_foreign_keys)

        actual_indexes = {
            (
                index["name"],
                tuple(index["column_names"]),
                bool(index.get("unique")),
            )
            for index in schema_inspector.get_indexes(table_name)
        }
        expected_indexes = {
            (index.name, tuple(column.name for column in index.columns), bool(index.unique))
            for index in table.indexes
        }
        if not expected_indexes.issubset(actual_indexes):
            problems.append(f"{table_name}: required indexes differ")
        totals["indexes"] += len(expected_indexes)

        expected_unique_columns = {
            tuple(column.name for column in constraint.columns)
            for constraint in table.constraints
            if isinstance(constraint, UniqueConstraint)
        }
        actual_unique_columns = {
            tuple(constraint["column_names"])
            for constraint in schema_inspector.get_unique_constraints(table_name)
        }
        # MySQL reflects unique indexes through both index and unique-constraint
        # APIs, so require every model constraint without double-counting the
        # model's explicitly unique indexes as drift.
        if not expected_unique_columns.issubset(actual_unique_columns):
            problems.append(f"{table_name}: unique constraints differ")
        totals["unique_constraints"] += len(expected_unique_columns)

    if problems:
        raise RuntimeError("Schema structure mismatch: " + "; ".join(problems))
    return totals


def verify_clean_database() -> dict[str, object]:
    expected_tables = set(Base.metadata.tables)
    with engine.connect() as connection:
        schema_inspector = inspect(connection)
        actual_tables = set(schema_inspector.get_table_names())
        missing_tables = expected_tables - actual_tables
        unexpected_tables = actual_tables - expected_tables - {"alembic_version"}
        if missing_tables or unexpected_tables:
            raise RuntimeError(
                f"Schema table mismatch: missing={sorted(missing_tables)}, "
                f"unexpected={sorted(unexpected_tables)}"
            )
        current_revision = MigrationContext.configure(connection).get_current_revision()
        expected_revision = _alembic_head()
        if current_revision != expected_revision:
            raise RuntimeError(
                f"Alembic revision mismatch: current={current_revision}, head={expected_revision}"
            )
        structure_totals = _verify_table_structure(schema_inspector)

    db = SessionLocal()
    try:
        users = db.query(User).all()
        if len(users) != 1 or users[0].role != UserRole.super_admin.value:
            raise RuntimeError("The only initial user must be the Super Admin")
        super_admin = users[0]
        if not super_admin.is_active or not super_admin.is_email_verified:
            raise RuntimeError("Super Admin must be active and verified")
        if super_admin.email.lower() != (settings.SUPER_ADMIN_EMAIL or "").lower():
            raise RuntimeError("Super Admin identity does not match SUPER_ADMIN_EMAIL")
        if super_admin.password_hash == settings.SUPER_ADMIN_PASSWORD:
            raise RuntimeError("Plaintext Super Admin password was stored")
        if not verify_password(settings.SUPER_ADMIN_PASSWORD or "", super_admin.password_hash):
            raise RuntimeError("Stored Super Admin hash does not match the configured password")

        nonempty_tables: dict[str, int] = {}
        for table_name, table in Base.metadata.tables.items():
            if table_name == User.__tablename__:
                continue
            count = db.execute(select(func.count()).select_from(table)).scalar_one()
            if count:
                nonempty_tables[table_name] = count
        if nonempty_tables:
            raise RuntimeError(
                f"Expected zero non-user application records: {nonempty_tables}"
            )
        return {
            "migration_revision": current_revision,
            "application_table_count": len(expected_tables),
            "super_admin_count": 1,
            "non_user_record_count": 0,
            **structure_totals,
        }
    finally:
        db.close()


def main() -> None:
    result = verify_clean_database()
    print(
        "Clean database verified: "
        f"{result['application_table_count']} application tables, "
        f"Alembic {result['migration_revision']}, one active Super Admin, "
        "zero non-user application records; "
        f"{result['columns']} columns, {result['foreign_keys']} foreign keys, "
        f"{result['unique_constraints']} unique constraints, and "
        f"{result['indexes']} model indexes match."
    )


if __name__ == "__main__":
    main()
