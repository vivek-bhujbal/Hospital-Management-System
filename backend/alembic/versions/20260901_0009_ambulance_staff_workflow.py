"""add assignment-scoped ambulance trip workflow

Revision ID: 20260901_0009
Revises: 20260901_0008
Create Date: 2026-09-01
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260901_0009"
down_revision: Union[str, None] = "20260901_0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


OLD_VEHICLE_STATUSES = (
    "available", "dispatched", "on_route", "arrived", "transporting",
    "completed", "maintenance", "unavailable",
)
NEW_VEHICLE_STATUSES = (
    "available", "assigned", "en_route", "arrived", "transporting",
    "maintenance", "unavailable",
)
OLD_REQUEST_STATUSES = (
    "requested", "approved", "dispatched", "accepted", "pickup",
    "transporting", "arrived", "completed", "cancelled",
)
NEW_REQUEST_STATUSES = (
    "requested", "assigned", "en_route", "arrived", "transporting",
    "completed", "cancelled",
)
OLD_TRIP_STATUSES = (
    "dispatched", "accepted", "on_route", "pickup", "transporting",
    "arrived", "completed", "cancelled",
)
NEW_TRIP_STATUSES = (
    "assigned", "en_route", "arrived", "transporting", "completed", "cancelled",
)


def _change_enum(table, column, old_values, new_values, updates, default) -> None:
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
            column, existing_type=sa.Enum(*old_values), type_=sa.Enum(*union_values),
            existing_nullable=False, server_default=default,
        )
    for old, new in updates:
        bind.execute(sa.text(
            f"UPDATE {table} SET {column} = :new WHERE {column} = :old"
        ), {"new": new, "old": old})
    with op.batch_alter_table(table) as batch_op:
        batch_op.alter_column(
            column, existing_type=sa.Enum(*union_values), type_=sa.Enum(*new_values),
            existing_nullable=False, server_default=default,
        )


def _backfill_responsible_staff() -> None:
    bind = op.get_bind()
    bind.execute(sa.text(
        "UPDATE ambulance_trips SET staff_id = ("
        "SELECT MIN(asa.staff_id) FROM ambulance_staff_assignments asa "
        "WHERE asa.ambulance_id = ambulance_trips.ambulance_id AND asa.status = 'active'"
        ") WHERE staff_id IS NULL"
    ))
    unresolved = bind.execute(sa.text(
        "SELECT id FROM ambulance_trips WHERE staff_id IS NULL LIMIT 1"
    )).first()
    if unresolved:
        raise RuntimeError(
            "Cannot assign responsible staff to existing ambulance trip "
            f"{unresolved[0]}; add an active vehicle/staff assignment before migrating."
        )


def upgrade() -> None:
    bind = op.get_bind()
    op.add_column("ambulance_requests", sa.Column("destination", sa.Text(), nullable=True))
    op.add_column("ambulance_trips", sa.Column("staff_id", sa.Integer(), nullable=True))
    op.add_column(
        "ambulance_trips",
        sa.Column("accepted_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
    )
    op.add_column("ambulance_status_history", sa.Column("request_id", sa.Integer(), nullable=True))
    op.add_column("ambulance_status_history", sa.Column("trip_id", sa.Integer(), nullable=True))
    op.add_column("ambulance_status_history", sa.Column("old_status", sa.String(length=50), nullable=True))

    if bind.dialect.name != "sqlite":
        op.create_check_constraint(
            "ck_ambulance_capacity_positive", "ambulances",
            "capacity IS NULL OR capacity > 0",
        )
        with op.batch_alter_table("ambulance_trips") as batch_op:
            batch_op.create_foreign_key(
                "fk_ambulance_trips_staff_id", "users", ["staff_id"], ["id"],
            )
        with op.batch_alter_table("ambulance_status_history") as batch_op:
            batch_op.create_foreign_key(
                "fk_ambulance_history_request_id", "ambulance_requests", ["request_id"], ["id"],
            )
            batch_op.create_foreign_key(
                "fk_ambulance_history_trip_id", "ambulance_trips", ["trip_id"], ["id"],
            )

    _backfill_responsible_staff()
    # SQLite's legacy-user migration fixture deliberately lacks some tables
    # referenced by the enterprise foreign keys, so reflecting/rebuilding this
    # table is not possible there. New runtime writes always provide staff_id.
    if bind.dialect.name != "sqlite":
        with op.batch_alter_table("ambulance_trips") as batch_op:
            batch_op.alter_column("staff_id", existing_type=sa.Integer(), nullable=False)
            batch_op.alter_column(
                "accepted_at", existing_type=sa.TIMESTAMP(), nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            )

    _change_enum(
        "ambulances", "status", OLD_VEHICLE_STATUSES, NEW_VEHICLE_STATUSES,
        (("dispatched", "assigned"), ("on_route", "en_route"), ("completed", "available")),
        "available",
    )
    _change_enum(
        "ambulance_requests", "status", OLD_REQUEST_STATUSES, NEW_REQUEST_STATUSES,
        (
            ("approved", "requested"), ("dispatched", "assigned"),
            ("accepted", "assigned"), ("arrived", "transporting"),
            ("pickup", "arrived"),
        ),
        "requested",
    )
    _change_enum(
        "ambulance_trips", "status", OLD_TRIP_STATUSES, NEW_TRIP_STATUSES,
        (
            ("dispatched", "assigned"), ("accepted", "assigned"),
            ("on_route", "en_route"), ("arrived", "transporting"),
            ("pickup", "arrived"),
        ),
        "assigned",
    )

    op.create_index(
        "ix_ambulance_assignment_staff_status", "ambulance_staff_assignments",
        ["staff_id", "status"], unique=False,
    )
    op.create_index(
        "ix_ambulance_request_status_priority", "ambulance_requests",
        ["status", "priority", "requested_at"], unique=False,
    )
    op.create_index(
        "ix_ambulance_trip_staff_status", "ambulance_trips",
        ["staff_id", "status"], unique=False,
    )
    op.create_index(
        "ix_ambulance_history_request_recorded", "ambulance_status_history",
        ["request_id", "recorded_at"], unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_ambulance_history_request_recorded", table_name="ambulance_status_history")
    op.drop_index("ix_ambulance_trip_staff_status", table_name="ambulance_trips")
    op.drop_index("ix_ambulance_request_status_priority", table_name="ambulance_requests")
    op.drop_index("ix_ambulance_assignment_staff_status", table_name="ambulance_staff_assignments")
    _change_enum(
        "ambulance_trips", "status", NEW_TRIP_STATUSES, OLD_TRIP_STATUSES,
        (("assigned", "dispatched"), ("en_route", "on_route"), ("arrived", "pickup")),
        "dispatched",
    )
    _change_enum(
        "ambulance_requests", "status", NEW_REQUEST_STATUSES, OLD_REQUEST_STATUSES,
        (("assigned", "dispatched"), ("en_route", "accepted"), ("arrived", "pickup")),
        "requested",
    )
    _change_enum(
        "ambulances", "status", NEW_VEHICLE_STATUSES, OLD_VEHICLE_STATUSES,
        (("assigned", "dispatched"), ("en_route", "on_route")),
        "available",
    )
    bind = op.get_bind()
    if bind.dialect.name != "sqlite":
        op.drop_constraint("ck_ambulance_capacity_positive", "ambulances", type_="check")
        with op.batch_alter_table("ambulance_status_history") as batch_op:
            batch_op.drop_constraint("fk_ambulance_history_trip_id", type_="foreignkey")
            batch_op.drop_constraint("fk_ambulance_history_request_id", type_="foreignkey")
        with op.batch_alter_table("ambulance_trips") as batch_op:
            batch_op.drop_constraint("fk_ambulance_trips_staff_id", type_="foreignkey")
    op.drop_column("ambulance_status_history", "old_status")
    op.drop_column("ambulance_status_history", "trip_id")
    op.drop_column("ambulance_status_history", "request_id")
    op.drop_column("ambulance_trips", "accepted_at")
    op.drop_column("ambulance_trips", "staff_id")
    op.drop_column("ambulance_requests", "destination")
