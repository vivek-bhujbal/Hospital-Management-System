"""separate pharmacy master data from stock operations

Revision ID: 20260908_0016
Revises: 20260908_0015
Create Date: 2026-09-08
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260908_0016"
down_revision: Union[str, None] = "20260908_0015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _assert_unique_normalized_names(bind, table_name: str) -> None:
    duplicates = bind.execute(sa.text(
        f"SELECT LOWER(TRIM(name)) AS normalized_name, COUNT(*) AS total "
        f"FROM {table_name} GROUP BY LOWER(TRIM(name)) HAVING COUNT(*) > 1"
    )).all()
    if duplicates:
        raise RuntimeError(
            f"Cannot enforce unique {table_name} names while normalized duplicates exist; "
            "no records were deleted or merged."
        )


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if not {"medicine", "medicine_category", "supplier"}.issubset(tables):
        return

    # Remove only the reference catalog introduced by the immediately previous
    # revision, and only when no clinical/inventory history references the row.
    bind.execute(sa.text(
        "DELETE FROM medicine WHERE sku LIKE 'FORM-%' "
        "AND NOT EXISTS (SELECT 1 FROM medicine_batch b WHERE b.medicine_id = medicine.id) "
        "AND NOT EXISTS (SELECT 1 FROM purchase_item p WHERE p.medicine_id = medicine.id) "
        "AND NOT EXISTS (SELECT 1 FROM dispensing_item d WHERE d.medicine_id = medicine.id)"
    ))
    bind.execute(sa.text(
        "DELETE FROM medicine_category "
        "WHERE description = 'Curated hospital formulary category.' "
        "AND NOT EXISTS (SELECT 1 FROM medicine m WHERE m.category_id = medicine_category.id)"
    ))

    _assert_unique_normalized_names(bind, "medicine_category")
    _assert_unique_normalized_names(bind, "supplier")
    _assert_unique_normalized_names(bind, "medicine")

    with op.batch_alter_table("medicine_category") as batch_op:
        batch_op.add_column(sa.Column(
            "status", sa.Enum("active", "inactive"), nullable=False,
            server_default="active",
        ))
        batch_op.create_unique_constraint("uq_medicine_category_name", ["name"])
    with op.batch_alter_table("supplier") as batch_op:
        batch_op.add_column(sa.Column(
            "status", sa.Enum("active", "inactive"), nullable=False,
            server_default="active",
        ))
        batch_op.create_unique_constraint("uq_supplier_name", ["name"])
    with op.batch_alter_table("medicine") as batch_op:
        batch_op.add_column(sa.Column(
            "minimum_stock_level", sa.Integer(), nullable=False,
            server_default="10",
        ))
        batch_op.create_unique_constraint("uq_medicine_name", ["name"])


def downgrade() -> None:
    with op.batch_alter_table("medicine") as batch_op:
        batch_op.drop_constraint("uq_medicine_name", type_="unique")
        batch_op.drop_column("minimum_stock_level")
    with op.batch_alter_table("supplier") as batch_op:
        batch_op.drop_constraint("uq_supplier_name", type_="unique")
        batch_op.drop_column("status")
    with op.batch_alter_table("medicine_category") as batch_op:
        batch_op.drop_constraint("uq_medicine_category_name", type_="unique")
        batch_op.drop_column("status")
