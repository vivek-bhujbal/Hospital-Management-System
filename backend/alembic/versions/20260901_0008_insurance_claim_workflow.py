"""add guarded insurance claim decisions and history

Revision ID: 20260901_0008
Revises: 20260901_0007
Create Date: 2026-09-01
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260901_0008"
down_revision: Union[str, None] = "20260901_0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


OLD_STATUSES = (
    "draft", "submitted", "under_review", "approved",
    "partially_approved", "rejected", "settled", "cancelled",
)
NEW_STATUSES = ("draft", "submitted", "under_review", "approved", "rejected", "settled")


def _change_status_enum(old_values, new_values, updates, default="draft") -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        for old, new in updates:
            bind.execute(sa.text(
                "UPDATE insurance_claims SET status = :new WHERE status = :old"
            ), {"new": new, "old": old})
        return
    union_values = tuple(dict.fromkeys((*old_values, *new_values)))
    with op.batch_alter_table("insurance_claims") as batch_op:
        batch_op.alter_column(
            "status", existing_type=sa.Enum(*old_values),
            type_=sa.Enum(*union_values), existing_nullable=True,
        )
    for old, new in updates:
        bind.execute(sa.text(
            "UPDATE insurance_claims SET status = :new WHERE status = :old"
        ), {"new": new, "old": old})
    with op.batch_alter_table("insurance_claims") as batch_op:
        batch_op.alter_column(
            "status", existing_type=sa.Enum(*union_values),
            type_=sa.Enum(*new_values), existing_nullable=True,
            server_default=default,
        )


def _assert_unique_invoice_claims() -> None:
    duplicate = op.get_bind().execute(sa.text(
        "SELECT billing_id FROM insurance_claims WHERE billing_id IS NOT NULL "
        "GROUP BY billing_id HAVING COUNT(*) > 1 LIMIT 1"
    )).first()
    if duplicate:
        raise RuntimeError(
            "Cannot enforce one insurance claim per invoice while duplicate claims exist; "
            f"reconcile billing record {duplicate[0]} first."
        )


def upgrade() -> None:
    bind = op.get_bind()
    op.add_column(
        "insurance_claims",
        sa.Column("documents_required", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("insurance_claims", sa.Column("submitted_at", sa.TIMESTAMP(), nullable=True))
    op.add_column("insurance_claims", sa.Column("decided_at", sa.TIMESTAMP(), nullable=True))
    op.add_column("insurance_claims", sa.Column("settled_at", sa.TIMESTAMP(), nullable=True))
    op.add_column("insurance_documents", sa.Column("linked_by", sa.Integer(), nullable=True))
    if bind.dialect.name != "sqlite":
        with op.batch_alter_table("insurance_documents") as batch_op:
            batch_op.create_foreign_key(
                "fk_insurance_documents_linked_by", "users", ["linked_by"], ["id"],
            )

    _change_status_enum(
        OLD_STATUSES, NEW_STATUSES,
        (("partially_approved", "approved"), ("cancelled", "rejected")),
    )
    bind.execute(sa.text(
        "UPDATE insurance_claims SET submitted_at = created_at "
        "WHERE status <> 'draft' AND submitted_at IS NULL"
    ))
    bind.execute(sa.text(
        "UPDATE insurance_claims SET decided_at = updated_at "
        "WHERE status IN ('approved', 'rejected', 'settled') AND decided_at IS NULL"
    ))
    bind.execute(sa.text(
        "UPDATE insurance_claims SET settled_at = updated_at "
        "WHERE status = 'settled' AND settled_at IS NULL"
    ))
    _assert_unique_invoice_claims()
    op.create_index(
        "uq_insurance_claim_billing", "insurance_claims", ["billing_id"], unique=True,
    )

    op.create_table(
        "insurance_claim_actions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("claim_id", sa.Integer(), sa.ForeignKey("insurance_claims.id", ondelete="CASCADE"), nullable=False),
        sa.Column("officer_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("from_status", sa.String(length=30), nullable=True),
        sa.Column("to_status", sa.String(length=30), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index(
        "ix_insurance_claim_actions_claim_created", "insurance_claim_actions",
        ["claim_id", "created_at"], unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_insurance_claim_actions_claim_created", table_name="insurance_claim_actions")
    op.drop_table("insurance_claim_actions")
    op.drop_index("uq_insurance_claim_billing", table_name="insurance_claims")
    _change_status_enum(
        NEW_STATUSES, OLD_STATUSES, (),
    )
    bind = op.get_bind()
    if bind.dialect.name != "sqlite":
        with op.batch_alter_table("insurance_documents") as batch_op:
            batch_op.drop_constraint("fk_insurance_documents_linked_by", type_="foreignkey")
    op.drop_column("insurance_documents", "linked_by")
    op.drop_column("insurance_claims", "settled_at")
    op.drop_column("insurance_claims", "decided_at")
    op.drop_column("insurance_claims", "submitted_at")
    op.drop_column("insurance_claims", "documents_required")
