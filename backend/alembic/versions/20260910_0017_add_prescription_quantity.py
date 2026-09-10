"""add prescribed quantity for safe pharmacy dispensing

Revision ID: 20260910_0017
Revises: 20260908_0016
Create Date: 2026-09-10
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260910_0017"
down_revision: Union[str, None] = "20260908_0016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if "prescriptions" not in sa.inspect(op.get_bind()).get_table_names():
        return
    with op.batch_alter_table("prescriptions") as batch_op:
        batch_op.add_column(sa.Column("quantity", sa.Integer(), nullable=True))
        batch_op.create_check_constraint(
            "ck_prescriptions_quantity_positive",
            "quantity IS NULL OR quantity > 0",
        )


def downgrade() -> None:
    if "prescriptions" not in sa.inspect(op.get_bind()).get_table_names():
        return
    with op.batch_alter_table("prescriptions") as batch_op:
        batch_op.drop_constraint("ck_prescriptions_quantity_positive", type_="check")
        batch_op.drop_column("quantity")
