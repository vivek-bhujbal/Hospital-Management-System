"""record the doctor who creates each nursing task

Revision ID: 20260905_0014
Revises: 20260905_0013
Create Date: 2026-09-05
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260905_0014"
down_revision: Union[str, None] = "20260905_0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TABLE = "nursing_tasks"
COLUMN = "created_by_doctor_id"
FOREIGN_KEY = "fk_nursing_tasks_created_by_doctor_id"
INDEX = "ix_nursing_tasks_created_by_doctor_id"


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if TABLE not in inspector.get_table_names():
        return

    if COLUMN not in {column["name"] for column in inspector.get_columns(TABLE)}:
        op.add_column(TABLE, sa.Column(COLUMN, sa.Integer(), nullable=True))

    inspector = sa.inspect(bind)
    if "doctors" in inspector.get_table_names() and not any(
        foreign_key.get("constrained_columns") == [COLUMN]
        and foreign_key.get("referred_table") == "doctors"
        for foreign_key in inspector.get_foreign_keys(TABLE)
    ):
        with op.batch_alter_table(TABLE) as batch_op:
            batch_op.create_foreign_key(
                FOREIGN_KEY,
                "doctors",
                [COLUMN],
                ["id"],
            )

    inspector = sa.inspect(bind)
    if INDEX not in {index["name"] for index in inspector.get_indexes(TABLE)}:
        op.create_index(INDEX, TABLE, [COLUMN], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if TABLE not in inspector.get_table_names():
        return
    if COLUMN not in {column["name"] for column in inspector.get_columns(TABLE)}:
        return

    if INDEX in {index["name"] for index in inspector.get_indexes(TABLE)}:
        op.drop_index(INDEX, table_name=TABLE)

    inspector = sa.inspect(bind)
    foreign_key = next((
        item for item in inspector.get_foreign_keys(TABLE)
        if item.get("constrained_columns") == [COLUMN]
        and item.get("referred_table") == "doctors"
    ), None)
    if foreign_key:
        with op.batch_alter_table(TABLE) as batch_op:
            batch_op.drop_constraint(foreign_key["name"], type_="foreignkey")

    with op.batch_alter_table(TABLE) as batch_op:
        batch_op.drop_column(COLUMN)
