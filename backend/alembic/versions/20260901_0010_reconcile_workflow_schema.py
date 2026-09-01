"""reconcile workflow migrations with current model metadata

Revision ID: 20260901_0010
Revises: 20260901_0009
Create Date: 2026-09-01
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260901_0010"
down_revision: Union[str, None] = "20260901_0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _sqlite_reconciliation() -> None:
    """Apply constraints skipped by legacy-compatible workflow migrations."""
    with op.batch_alter_table("lab_orders") as batch_op:
        batch_op.alter_column(
            "status",
            existing_type=sa.String(length=11),
            type_=sa.Enum(
                "ordered", "sample_collected", "processing", "completed", "cancelled"
            ),
            existing_nullable=True,
        )
        batch_op.create_foreign_key(
            "fk_lab_orders_assigned_technician",
            "users",
            ["assigned_technician_id"],
            ["id"],
        )

    with op.batch_alter_table("radiology_orders") as batch_op:
        batch_op.create_foreign_key(
            "fk_radiology_orders_assigned_radiologist",
            "users",
            ["assigned_radiologist_id"],
            ["id"],
        )

    with op.batch_alter_table("radiology_reports") as batch_op:
        batch_op.alter_column(
            "status",
            existing_type=sa.String(length=8),
            type_=sa.Enum("draft", "finalized"),
            existing_nullable=True,
        )

    with op.batch_alter_table("insurance_documents") as batch_op:
        batch_op.create_foreign_key(
            "fk_insurance_documents_linked_by", "users", ["linked_by"], ["id"]
        )

    op.drop_index("uq_insurance_claim_billing", table_name="insurance_claims")
    with op.batch_alter_table("insurance_claims") as batch_op:
        batch_op.alter_column(
            "status",
            existing_type=sa.String(length=18),
            type_=sa.Enum(
                "draft", "submitted", "under_review", "approved", "rejected", "settled"
            ),
            existing_nullable=True,
        )
        batch_op.create_unique_constraint(
            "uq_insurance_claim_billing", ["billing_id"]
        )

    op.drop_index("uq_radiology_study_order", table_name="radiology_studies")
    with op.batch_alter_table("radiology_studies") as batch_op:
        batch_op.create_unique_constraint("uq_radiology_study_order", ["order_id"])

    with op.batch_alter_table("ambulances") as batch_op:
        batch_op.alter_column(
            "status",
            existing_type=sa.String(length=12),
            type_=sa.Enum(
                "available", "assigned", "en_route", "arrived", "transporting",
                "maintenance", "unavailable",
            ),
            existing_nullable=True,
            nullable=False,
        )
        batch_op.create_check_constraint(
            "ck_ambulance_capacity_positive", "capacity IS NULL OR capacity > 0"
        )

    with op.batch_alter_table("ambulance_requests") as batch_op:
        batch_op.alter_column(
            "status",
            existing_type=sa.String(length=12),
            type_=sa.Enum(
                "requested", "assigned", "en_route", "arrived", "transporting",
                "completed", "cancelled",
            ),
            existing_nullable=True,
            nullable=False,
        )

    with op.batch_alter_table("ambulance_trips") as batch_op:
        batch_op.alter_column(
            "staff_id", existing_type=sa.Integer(), existing_nullable=True, nullable=False
        )
        batch_op.alter_column(
            "status",
            existing_type=sa.String(length=12),
            type_=sa.Enum(
                "assigned", "en_route", "arrived", "transporting", "completed", "cancelled"
            ),
            existing_nullable=True,
            nullable=False,
        )
        batch_op.alter_column(
            "accepted_at",
            existing_type=sa.TIMESTAMP(),
            existing_nullable=True,
            nullable=False,
            existing_server_default=sa.text("CURRENT_TIMESTAMP"),
        )
        batch_op.create_foreign_key(
            "fk_ambulance_trips_staff_id", "users", ["staff_id"], ["id"]
        )

    with op.batch_alter_table("ambulance_status_history") as batch_op:
        batch_op.create_foreign_key(
            "fk_ambulance_history_request_id",
            "ambulance_requests",
            ["request_id"],
            ["id"],
        )
        batch_op.create_foreign_key(
            "fk_ambulance_history_trip_id",
            "ambulance_trips",
            ["trip_id"],
            ["id"],
        )


def upgrade() -> None:
    bind = op.get_bind()
    legacy_sqlite = (
        bind.dialect.name == "sqlite"
        and "appointments" not in sa.inspect(bind).get_table_names()
    )
    if bind.dialect.name == "sqlite" and not legacy_sqlite:
        _sqlite_reconciliation()

    # The replacement workflow fields were backfilled in revisions 0005/0006;
    # these legacy columns are no longer represented or used by the models.
    if not legacy_sqlite:
        if bind.dialect.name != "sqlite":
            for foreign_key in sa.inspect(bind).get_foreign_keys("lab_results"):
                if foreign_key["constrained_columns"] == ["verified_by"]:
                    op.drop_constraint(
                        foreign_key["name"], "lab_results", type_="foreignkey"
                    )
        with op.batch_alter_table("lab_results") as batch_op:
            batch_op.drop_column("verified_at")
            batch_op.drop_column("verified_by")
        with op.batch_alter_table("radiology_reports") as batch_op:
            batch_op.drop_column("verified_at")

    op.create_index(
        "ix_insurance_claim_actions_id",
        "insurance_claim_actions",
        ["id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_insurance_claim_actions_id", table_name="insurance_claim_actions"
    )
    with op.batch_alter_table("radiology_reports") as batch_op:
        batch_op.add_column(sa.Column("verified_at", sa.TIMESTAMP(), nullable=True))
    with op.batch_alter_table("lab_results") as batch_op:
        batch_op.add_column(sa.Column("verified_by", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("verified_at", sa.TIMESTAMP(), nullable=True))
        batch_op.create_foreign_key(
            "fk_lab_results_verified_by", "users", ["verified_by"], ["id"]
        )

    if op.get_bind().dialect.name == "sqlite":
        with op.batch_alter_table("ambulance_status_history") as batch_op:
            batch_op.drop_constraint(
                "fk_ambulance_history_trip_id", type_="foreignkey"
            )
            batch_op.drop_constraint(
                "fk_ambulance_history_request_id", type_="foreignkey"
            )
        with op.batch_alter_table("ambulance_trips") as batch_op:
            batch_op.drop_constraint("fk_ambulance_trips_staff_id", type_="foreignkey")
        with op.batch_alter_table("insurance_documents") as batch_op:
            batch_op.drop_constraint(
                "fk_insurance_documents_linked_by", type_="foreignkey"
            )
        with op.batch_alter_table("radiology_orders") as batch_op:
            batch_op.drop_constraint(
                "fk_radiology_orders_assigned_radiologist", type_="foreignkey"
            )
        with op.batch_alter_table("lab_orders") as batch_op:
            batch_op.drop_constraint(
                "fk_lab_orders_assigned_technician", type_="foreignkey"
            )
