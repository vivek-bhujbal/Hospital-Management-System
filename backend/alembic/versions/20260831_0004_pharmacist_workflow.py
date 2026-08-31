"""add pharmacist prescription workflow and audited inventory metadata

Revision ID: 20260831_0004
Revises: 20260831_0003
Create Date: 2026-08-31
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260831_0004"
down_revision: Union[str, None] = "20260831_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("medicine") as batch_op:
        batch_op.add_column(sa.Column("sku", sa.String(length=100), nullable=True))
        batch_op.create_unique_constraint("uq_medicine_sku", ["sku"])
    with op.batch_alter_table("medicine_batch") as batch_op:
        batch_op.add_column(sa.Column("supplier_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_medicine_batch_supplier", "supplier", ["supplier_id"], ["id"]
        )
    with op.batch_alter_table("stock_transaction") as batch_op:
        batch_op.add_column(sa.Column("reason", sa.String(length=255), nullable=True))

    op.create_table(
        "pharmacy_prescription_reviews",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("prescription_id", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "verified", "rejected", "ready_for_dispensing", "dispensed",
                name="pharmacy_prescription_status",
            ),
            nullable=False,
        ),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("verified_by", sa.Integer(), nullable=True),
        sa.Column("verified_at", sa.TIMESTAMP(), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.TIMESTAMP(), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["prescription_id"], ["prescriptions.id"]),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["verified_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("prescription_id", name="uq_pharmacy_review_prescription"),
    )
    op.create_index(
        "ix_pharmacy_prescription_reviews_id",
        "pharmacy_prescription_reviews", ["id"], unique=False,
    )
    op.create_index(
        "ix_pharmacy_review_status_updated",
        "pharmacy_prescription_reviews", ["status", "updated_at"], unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_pharmacy_review_status_updated", table_name="pharmacy_prescription_reviews")
    op.drop_index("ix_pharmacy_prescription_reviews_id", table_name="pharmacy_prescription_reviews")
    op.drop_table("pharmacy_prescription_reviews")
    with op.batch_alter_table("stock_transaction") as batch_op:
        batch_op.drop_column("reason")
    with op.batch_alter_table("medicine_batch") as batch_op:
        batch_op.drop_constraint("fk_medicine_batch_supplier", type_="foreignkey")
        batch_op.drop_column("supplier_id")
    with op.batch_alter_table("medicine") as batch_op:
        batch_op.drop_constraint("uq_medicine_sku", type_="unique")
        batch_op.drop_column("sku")
