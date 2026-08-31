"""add assignment-scoped laboratory workflow and finalized result integrity

Revision ID: 20260831_0005
Revises: 20260831_0004
Create Date: 2026-08-31
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260831_0005"
down_revision: Union[str, None] = "20260831_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _change_enum(table: str, column: str, old_values, new_values, updates, new_default: str) -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        for old, new in updates:
            bind.execute(sa.text(
                f"UPDATE {table} SET {column} = :new WHERE {column} = :old"
            ), {"new": new, "old": old})
        return
    union_values = tuple(dict.fromkeys((*old_values, *new_values)))
    with op.batch_alter_table(table) as batch_op:
        batch_op.alter_column(
            column,
            existing_type=sa.Enum(*old_values),
            type_=sa.Enum(*union_values),
            existing_nullable=True,
        )
    for old, new in updates:
        bind.execute(sa.text(
            f"UPDATE {table} SET {column} = :new WHERE {column} = :old"
        ), {"new": new, "old": old})
    with op.batch_alter_table(table) as batch_op:
        batch_op.alter_column(
            column,
            existing_type=sa.Enum(*union_values),
            type_=sa.Enum(*new_values),
            existing_nullable=True,
            server_default=new_default,
        )


def upgrade() -> None:
    bind = op.get_bind()
    order_columns = (
        sa.Column("assigned_technician_id", sa.Integer(), nullable=True),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column(
            "priority", sa.Enum("routine", "urgent", "stat"),
            nullable=False, server_default="routine",
        ),
        sa.Column("accepted_at", sa.TIMESTAMP(), nullable=True),
    )
    if bind.dialect.name == "sqlite":
        for column in order_columns:
            op.add_column("lab_orders", column)
        op.create_index(
            "ix_lab_orders_assignee_status", "lab_orders",
            ["assigned_technician_id", "status"], unique=False,
        )
    else:
        with op.batch_alter_table("lab_orders") as batch_op:
            for column in order_columns:
                batch_op.add_column(column)
            batch_op.create_foreign_key(
                "fk_lab_orders_assigned_technician", "users",
                ["assigned_technician_id"], ["id"],
            )
            batch_op.create_index(
                "ix_lab_orders_assignee_status", ["assigned_technician_id", "status"]
            )
    _change_enum(
        "lab_orders", "status",
        ("pending", "in_progress", "completed", "cancelled"),
        ("ordered", "sample_collected", "processing", "completed", "cancelled"),
        (("pending", "ordered"), ("in_progress", "processing")),
        "ordered",
    )
    _change_enum(
        "lab_order_items", "status",
        ("ordered", "sample_collected", "processing", "completed", "verified", "cancelled"),
        ("ordered", "sample_collected", "processing", "completed", "cancelled"),
        (("verified", "completed"),),
        "ordered",
    )
    op.add_column("lab_results", sa.Column("numeric_value", sa.DECIMAL(18, 6), nullable=True))
    op.add_column("lab_results", sa.Column("finalized_at", sa.TIMESTAMP(), nullable=True))
    op.execute(sa.text(
        "UPDATE lab_results SET finalized_at = verified_at WHERE status = 'verified'"
    ))
    _change_enum(
        "lab_results", "status",
        ("completed", "verified"),
        ("draft", "finalized"),
        (("completed", "draft"), ("verified", "finalized")),
        "draft",
    )


def downgrade() -> None:
    _change_enum(
        "lab_results", "status",
        ("draft", "finalized"),
        ("completed", "verified"),
        (("draft", "completed"), ("finalized", "verified")),
        "completed",
    )
    with op.batch_alter_table("lab_results") as batch_op:
        batch_op.drop_column("finalized_at")
        batch_op.drop_column("numeric_value")
    _change_enum(
        "lab_order_items", "status",
        ("ordered", "sample_collected", "processing", "completed", "cancelled"),
        ("ordered", "sample_collected", "processing", "completed", "verified", "cancelled"),
        (),
        "ordered",
    )
    _change_enum(
        "lab_orders", "status",
        ("ordered", "sample_collected", "processing", "completed", "cancelled"),
        ("pending", "in_progress", "completed", "cancelled"),
        (("ordered", "pending"), ("sample_collected", "in_progress"), ("processing", "in_progress")),
        "pending",
    )
    with op.batch_alter_table("lab_orders") as batch_op:
        batch_op.drop_index("ix_lab_orders_assignee_status")
        batch_op.drop_constraint("fk_lab_orders_assigned_technician", type_="foreignkey")
        batch_op.drop_column("accepted_at")
        batch_op.drop_column("priority")
        batch_op.drop_column("instructions")
        batch_op.drop_column("assigned_technician_id")
