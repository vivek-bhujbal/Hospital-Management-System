"""remove unused receptionist reports permission

Revision ID: 20260831_0003
Revises: 20260826_0002
Create Date: 2026-08-31
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260831_0003"
down_revision: Union[str, None] = "20260826_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "employee_permissions" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("employee_permissions")}
    if "can_view_reports" in columns:
        with op.batch_alter_table("employee_permissions") as batch_op:
            batch_op.drop_column("can_view_reports")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "employee_permissions" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("employee_permissions")}
    if "can_view_reports" not in columns:
        with op.batch_alter_table("employee_permissions") as batch_op:
            batch_op.add_column(
                sa.Column("can_view_reports", sa.Integer(), server_default="0")
            )
