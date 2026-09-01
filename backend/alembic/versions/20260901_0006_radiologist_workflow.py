"""add assignment-scoped radiology review and finalized report amendments

Revision ID: 20260901_0006
Revises: 20260831_0005
Create Date: 2026-09-01
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260901_0006"
down_revision: Union[str, None] = "20260831_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _change_enum(table, column, old_values, new_values, updates, new_default) -> None:
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
            column, existing_type=sa.Enum(*old_values),
            type_=sa.Enum(*union_values), existing_nullable=True,
        )
    for old, new in updates:
        bind.execute(sa.text(
            f"UPDATE {table} SET {column} = :new WHERE {column} = :old"
        ), {"new": new, "old": old})
    with op.batch_alter_table(table) as batch_op:
        batch_op.alter_column(
            column, existing_type=sa.Enum(*union_values),
            type_=sa.Enum(*new_values), existing_nullable=True,
            server_default=new_default,
        )


def _assert_one_study_per_order() -> None:
    duplicate = op.get_bind().execute(sa.text(
        "SELECT order_id FROM radiology_studies GROUP BY order_id "
        "HAVING COUNT(*) > 1 LIMIT 1"
    )).first()
    if duplicate:
        raise RuntimeError(
            "Cannot enforce one radiology study per order while duplicate studies exist; "
            f"reconcile radiology order {duplicate[0]} first."
        )


def upgrade() -> None:
    bind = op.get_bind()
    columns = (
        sa.Column("assigned_radiologist_id", sa.Integer(), nullable=True),
        sa.Column("review_started_at", sa.TIMESTAMP(), nullable=True),
    )
    if bind.dialect.name == "sqlite":
        for column in columns:
            op.add_column("radiology_orders", column)
        op.create_index(
            "ix_radiology_orders_assignee_status", "radiology_orders",
            ["assigned_radiologist_id", "status"], unique=False,
        )
    else:
        with op.batch_alter_table("radiology_orders") as batch_op:
            for column in columns:
                batch_op.add_column(column)
            batch_op.create_foreign_key(
                "fk_radiology_orders_assigned_radiologist", "users",
                ["assigned_radiologist_id"], ["id"],
            )
            batch_op.create_index(
                "ix_radiology_orders_assignee_status",
                ["assigned_radiologist_id", "status"],
            )
    _change_enum(
        "radiology_orders", "status",
        ("ordered", "scheduled", "performed", "reporting", "verified", "cancelled"),
        ("ordered", "scheduled", "performed", "reviewing", "reporting", "completed", "cancelled"),
        (("verified", "completed"),), "ordered",
    )

    _assert_one_study_per_order()
    op.create_index(
        "uq_radiology_study_order", "radiology_studies", ["order_id"], unique=True,
    )

    op.add_column("radiology_reports", sa.Column("radiologist_notes", sa.Text(), nullable=True))
    op.add_column("radiology_reports", sa.Column("amendment_reason", sa.Text(), nullable=True))
    op.add_column("radiology_reports", sa.Column("finalized_at", sa.TIMESTAMP(), nullable=True))
    bind.execute(sa.text(
        "UPDATE radiology_reports SET radiologist_notes = recommendations "
        "WHERE radiologist_notes IS NULL AND recommendations IS NOT NULL"
    ))
    bind.execute(sa.text(
        "UPDATE radiology_reports SET finalized_at = verified_at WHERE status = 'verified'"
    ))
    _change_enum(
        "radiology_reports", "status",
        ("draft", "verified"), ("draft", "finalized"),
        (("verified", "finalized"),), "draft",
    )
    bind.execute(sa.text(
        "UPDATE radiology_orders SET assigned_radiologist_id = COALESCE(" 
        "(SELECT rr.radiologist_id FROM radiology_studies rs "
        " JOIN radiology_reports rr ON rr.study_id = rs.id "
        " WHERE rs.order_id = radiology_orders.id "
        " ORDER BY rr.version DESC LIMIT 1), "
        "(SELECT rs.technician_id FROM radiology_studies rs "
        " WHERE rs.order_id = radiology_orders.id LIMIT 1)) "
        "WHERE assigned_radiologist_id IS NULL AND EXISTS ("
        " SELECT 1 FROM radiology_studies rs WHERE rs.order_id = radiology_orders.id)"
    ))


def downgrade() -> None:
    _change_enum(
        "radiology_reports", "status",
        ("draft", "finalized"), ("draft", "verified"),
        (("finalized", "verified"),), "draft",
    )
    op.drop_column("radiology_reports", "finalized_at")
    op.drop_column("radiology_reports", "amendment_reason")
    op.drop_column("radiology_reports", "radiologist_notes")
    op.drop_index("uq_radiology_study_order", table_name="radiology_studies")
    _change_enum(
        "radiology_orders", "status",
        ("ordered", "scheduled", "performed", "reviewing", "reporting", "completed", "cancelled"),
        ("ordered", "scheduled", "performed", "reporting", "verified", "cancelled"),
        (("reviewing", "performed"), ("completed", "verified")), "ordered",
    )
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        op.drop_index("ix_radiology_orders_assignee_status", table_name="radiology_orders")
        op.drop_column("radiology_orders", "review_started_at")
        op.drop_column("radiology_orders", "assigned_radiologist_id")
    else:
        with op.batch_alter_table("radiology_orders") as batch_op:
            batch_op.drop_index("ix_radiology_orders_assignee_status")
            batch_op.drop_constraint(
                "fk_radiology_orders_assigned_radiologist", type_="foreignkey"
            )
            batch_op.drop_column("review_started_at")
            batch_op.drop_column("assigned_radiologist_id")
