"""add supporting references to audited expenses

Revision ID: 20260901_0007
Revises: 20260901_0006
Create Date: 2026-09-01
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260901_0007"
down_revision: Union[str, None] = "20260901_0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "expenses",
        sa.Column("supporting_reference", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("expenses", "supporting_reference")
