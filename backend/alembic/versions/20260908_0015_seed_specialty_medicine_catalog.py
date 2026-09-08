"""add optional specialty metadata without seeding business data

Revision ID: 20260908_0015
Revises: 20260905_0014
Create Date: 2026-09-08
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260908_0015"
down_revision: Union[str, None] = "20260905_0014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "medicine" not in inspector.get_table_names():
        return

    if "specializations" not in {
        column["name"] for column in inspector.get_columns("medicine")
    }:
        op.add_column(
            "medicine",
            sa.Column("specializations", sa.JSON(), nullable=True),
        )

    metadata = sa.MetaData()
    medicine_table = sa.Table("medicine", metadata, autoload_with=bind)
    bind.execute(
        medicine_table.update()
        .where(medicine_table.c.specializations.is_(None))
        .values(specializations=[])
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "medicine" not in inspector.get_table_names():
        return
    if "specializations" in {
        column["name"] for column in inspector.get_columns("medicine")
    }:
        with op.batch_alter_table("medicine") as batch_op:
            batch_op.drop_column("specializations")
