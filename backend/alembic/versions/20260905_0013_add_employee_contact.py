"""add contact to employee profiles

Revision ID: 20260905_0013
Revises: 20260902_0012
Create Date: 2026-09-05
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260905_0013"
down_revision: Union[str, None] = "20260902_0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "employees" not in inspector.get_table_names():
        return
    if "contact" in {column["name"] for column in inspector.get_columns("employees")}:
        return
    with op.batch_alter_table("employees") as batch_op:
        batch_op.add_column(sa.Column("contact", sa.String(length=20), nullable=True))


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "employees" not in inspector.get_table_names():
        return
    if "contact" not in {column["name"] for column in inspector.get_columns("employees")}:
        return
    with op.batch_alter_table("employees") as batch_op:
        batch_op.drop_column("contact")
