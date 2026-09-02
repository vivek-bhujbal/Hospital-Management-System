"""expand prescription dosage for complete clinical directions

Revision ID: 20260901_0011
Revises: 20260901_0010
Create Date: 2026-09-01
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260901_0011"
down_revision: Union[str, None] = "20260901_0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if "prescriptions" not in sa.inspect(op.get_bind()).get_table_names():
        return
    with op.batch_alter_table("prescriptions") as batch_op:
        batch_op.alter_column(
            "dosage",
            existing_type=sa.String(length=100),
            type_=sa.Text(),
            existing_nullable=True,
        )


def downgrade() -> None:
    if "prescriptions" not in sa.inspect(op.get_bind()).get_table_names():
        return
    with op.batch_alter_table("prescriptions") as batch_op:
        batch_op.alter_column(
            "dosage",
            existing_type=sa.Text(),
            type_=sa.String(length=100),
            existing_nullable=True,
        )
