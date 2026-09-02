"""enforce normalized global account email uniqueness

Revision ID: 20260902_0012
Revises: 20260901_0011
Create Date: 2026-09-02
"""

from collections import defaultdict
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260902_0012"
down_revision: Union[str, None] = "20260901_0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _assert_no_normalized_duplicates(bind) -> None:
    grouped: dict[str, list[int]] = defaultdict(list)
    rows = bind.execute(sa.text("SELECT id, email FROM users ORDER BY id")).mappings()
    for row in rows:
        grouped[str(row["email"]).strip().lower()].append(int(row["id"]))

    duplicates = {
        email: user_ids for email, user_ids in grouped.items() if len(user_ids) > 1
    }
    if duplicates:
        summary = ", ".join(
            f"{email} (user IDs: {', '.join(map(str, user_ids))})"
            for email, user_ids in sorted(duplicates.items())
        )
        raise RuntimeError(
            "Cannot enforce global email uniqueness because normalized duplicate "
            f"accounts already exist: {summary}. Resolve these records manually; "
            "the migration did not delete or merge any user."
        )


def upgrade() -> None:
    bind = op.get_bind()
    _assert_no_normalized_duplicates(bind)

    # Canonicalize existing safe records before enforcing the generated unique key.
    bind.execute(sa.text("UPDATE users SET email = lower(trim(email))"))

    columns = {column["name"] for column in sa.inspect(bind).get_columns("users")}
    if "email_normalized" not in columns:
        persisted = False if bind.dialect.name == "sqlite" else True
        op.add_column(
            "users",
            sa.Column(
                "email_normalized",
                sa.String(length=150),
                sa.Computed("lower(trim(email))", persisted=persisted),
                nullable=True,
            ),
        )

    indexes = {index["name"] for index in sa.inspect(bind).get_indexes("users")}
    constraints = {
        constraint["name"]
        for constraint in sa.inspect(bind).get_unique_constraints("users")
    }
    if "uq_users_email_normalized" not in indexes | constraints:
        op.create_index(
            "uq_users_email_normalized",
            "users",
            ["email_normalized"],
            unique=True,
        )


def downgrade() -> None:
    bind = op.get_bind()
    indexes = {index["name"] for index in sa.inspect(bind).get_indexes("users")}
    if "uq_users_email_normalized" in indexes:
        op.drop_index("uq_users_email_normalized", table_name="users")

    columns = {column["name"] for column in sa.inspect(bind).get_columns("users")}
    if "email_normalized" in columns:
        op.drop_column("users", "email_normalized")
