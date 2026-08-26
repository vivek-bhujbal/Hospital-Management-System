"""reconcile enterprise modules

Revision ID: 20260826_0002
Revises: 20260826_0001
Create Date: 2026-08-26 15:17:25.477619
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '20260826_0002'
down_revision: Union[str, None] = '20260826_0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Gemini's phase implementation shipped a SQL dump whose enterprise table names
# and columns do not match the ORM.  Those tables were never managed by Alembic.
# We may replace them only while they are empty; populated tables require an
# explicit data migration so that this revision can never silently lose data.
UNMANAGED_ENTERPRISE_TABLES = (
    "lab_result_attachments", "lab_results", "lab_samples", "lab_order_items",
    "lab_orders", "lab_tests", "lab_test_categories", "radiology_reports",
    "radiology_studies", "radiology_orders", "radiology_modalities",
    "dispensing_items", "dispensing_item", "dispensings", "dispensing",
    "stock_transactions", "stock_transaction", "purchase_items", "purchase_item",
    "medicine_batches", "medicine_batch", "purchases", "purchase", "medicines",
    "medicine", "suppliers", "supplier", "medicine_categories", "medicine_category",
    "insurance_payments", "insurance_documents", "insurance_claim_items",
    "insurance_claims", "insurance_policies", "insurance_providers",
    "ambulance_trips", "ambulance_requests", "ambulance_staff_assignments",
    "ambulance_status_history", "ambulances", "nursing_notes", "patient_vitals",
    "nursing_tasks", "refunds", "financial_transactions", "expenses",
    "expense_categories", "daily_closings", "notifications",
    "notification_preferences", "notification_providers", "feature_flags",
    "role_permissions", "system_settings", "organizations", "departments",
)


def _quote(bind, identifier: str) -> str:
    return bind.dialect.identifier_preparer.quote(identifier)


def _prepare_unmanaged_enterprise_tables(bind) -> None:
    inspector = sa.inspect(bind)
    existing = [
        table for table in UNMANAGED_ENTERPRISE_TABLES
        if table in set(inspector.get_table_names())
    ]
    populated = []
    for table in existing:
        count = bind.execute(
            sa.text(f"SELECT COUNT(*) FROM {_quote(bind, table)}")
        ).scalar_one()
        if count:
            populated.append(f"{table} ({count} rows)")
    if populated:
        raise RuntimeError(
            "Cannot automatically reconcile populated unmanaged enterprise tables: "
            + ", ".join(populated)
            + ". Preserve them and create an explicit data migration first."
        )

    if bind.dialect.name == "mysql":
        bind.exec_driver_sql("SET FOREIGN_KEY_CHECKS=0")
    try:
        for table in existing:
            bind.exec_driver_sql(f"DROP TABLE IF EXISTS {_quote(bind, table)}")
    finally:
        if bind.dialect.name == "mysql":
            bind.exec_driver_sql("SET FOREIGN_KEY_CHECKS=1")


def _columns(bind, table: str) -> set[str]:
    return {column["name"] for column in sa.inspect(bind).get_columns(table)}


def _add_column_if_missing(bind, table: str, column: sa.Column) -> None:
    if column.name not in _columns(bind, table):
        # SQLite cannot ALTER ADD a column whose default is CURRENT_TIMESTAMP.
        # Batch recreation preserves the existing rows and applies the default.
        if bind.dialect.name == "sqlite" and column.server_default is not None:
            with op.batch_alter_table(table, recreate="always") as batch_op:
                batch_op.add_column(column)
        else:
            op.add_column(table, column)


def _index_names(bind, table: str) -> set[str]:
    inspector = sa.inspect(bind)
    names = {index["name"] for index in inspector.get_indexes(table)}
    names.update(
        constraint["name"] for constraint in inspector.get_unique_constraints(table)
        if constraint.get("name")
    )
    return names


def _has_unique_columns(bind, table: str, columns: tuple[str, ...]) -> bool:
    inspector = sa.inspect(bind)
    target = list(columns)
    return any(
        item.get("unique") and item.get("column_names") == target
        for item in inspector.get_indexes(table)
    ) or any(
        item.get("column_names") == target
        for item in inspector.get_unique_constraints(table)
    )


def _assert_unique_data(bind, table: str, columns: tuple[str, ...]) -> None:
    fields = ", ".join(_quote(bind, column) for column in columns)
    null_filter = " AND ".join(
        f"{_quote(bind, column)} IS NOT NULL" for column in columns
    )
    duplicate = bind.execute(sa.text(
        f"SELECT 1 FROM {_quote(bind, table)} WHERE {null_filter} "
        f"GROUP BY {fields} HAVING COUNT(*) > 1 LIMIT 1"
    )).first()
    if duplicate:
        raise RuntimeError(
            f"Cannot add required uniqueness to {table}({', '.join(columns)}): "
            "duplicate records exist."
        )


def _reconcile_core_columns(bind) -> None:
    timestamp = lambda name: sa.Column(
        name, sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True
    )
    for table, column in (
        ("users", timestamp("updated_at")),
        ("patients", timestamp("created_at")),
        ("patients", timestamp("updated_at")),
        ("doctors", sa.Column("department_id", sa.Integer(), nullable=True)),
        ("doctors", sa.Column("consultation_fee", sa.DECIMAL(10, 2), nullable=True)),
        ("doctors", timestamp("created_at")),
        ("doctors", timestamp("updated_at")),
        ("employees", timestamp("updated_at")),
        ("appointments", timestamp("updated_at")),
        ("hospital_settings", timestamp("updated_at")),
    ):
        if table in set(sa.inspect(bind).get_table_names()):
            _add_column_if_missing(bind, table, column)

    for name, table, columns in (
        ("idx_appointments_doctor_id", "appointments", ("doctor_id",)),
        ("idx_appointments_patient_id", "appointments", ("patient_id",)),
        ("ix_appointments_doctor_slot", "appointments", ("doctor_id", "appt_date", "appt_time")),
        ("ix_appointments_patient_date", "appointments", ("patient_id", "appt_date")),
        ("ix_appointments_status_date", "appointments", ("status", "appt_date")),
        ("idx_prescriptions_appointment_id", "prescriptions", ("appointment_id",)),
        ("idx_billing_appointment_id", "billing", ("appointment_id",)),
        ("idx_billing_patient_id", "billing", ("patient_id",)),
    ):
        if table in set(sa.inspect(bind).get_table_names()) and name not in _index_names(bind, table):
            op.create_index(name, table, list(columns), unique=False)

    for name, table, columns in (
        ("uq_employee_permissions_employee_id", "employee_permissions", ("employee_id",)),
        ("uq_prescriptions_appointment_id", "prescriptions", ("appointment_id",)),
        ("uq_billing_appointment_id", "billing", ("appointment_id",)),
        ("uq_billing_receipt_no", "billing", ("receipt_no",)),
    ):
        if table in set(sa.inspect(bind).get_table_names()) and not _has_unique_columns(bind, table, columns):
            _assert_unique_data(bind, table, columns)
            op.create_index(name, table, list(columns), unique=True)


def _add_doctor_department_fk(bind) -> None:
    if "doctors" not in set(sa.inspect(bind).get_table_names()):
        return
    if any(
        fk.get("referred_table") == "departments"
        and fk.get("constrained_columns") == ["department_id"]
        for fk in sa.inspect(bind).get_foreign_keys("doctors")
    ):
        return
    with op.batch_alter_table("doctors") as batch_op:
        batch_op.create_foreign_key(
            "fk_doctors_department_id_departments",
            "departments",
            ["department_id"],
            ["department_id"],
        )


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    bind = op.get_bind()
    _prepare_unmanaged_enterprise_tables(bind)
    _reconcile_core_columns(bind)
    op.create_table('ambulances',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('vehicle_number', sa.String(length=50), nullable=False),
    sa.Column('vehicle_type', sa.String(length=100), nullable=True),
    sa.Column('status', sa.Enum('available', 'dispatched', 'on_route', 'arrived', 'transporting', 'completed', 'maintenance', 'unavailable'), nullable=True),
    sa.Column('capacity', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('vehicle_number')
    )
    with op.batch_alter_table('ambulances', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_ambulances_id'), ['id'], unique=False)

    op.create_table('departments',
    sa.Column('department_id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=150), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('status', sa.Enum('active', 'inactive'), nullable=True),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.PrimaryKeyConstraint('department_id'),
    sa.UniqueConstraint('name', name='uq_departments_name')
    )
    with op.batch_alter_table('departments', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_departments_department_id'), ['department_id'], unique=False)

    op.create_table('expense_categories',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('expense_categories', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_expense_categories_id'), ['id'], unique=False)

    op.create_table('insurance_providers',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=150), nullable=False),
    sa.Column('contact_info', sa.Text(), nullable=True),
    sa.Column('status', sa.Enum('active', 'inactive'), nullable=True),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('insurance_providers', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_insurance_providers_id'), ['id'], unique=False)

    op.create_table('lab_test_categories',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('lab_test_categories', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_lab_test_categories_id'), ['id'], unique=False)

    op.create_table('medicine_category',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('medicine_category', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_medicine_category_id'), ['id'], unique=False)

    op.create_table('notification_providers',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('channel', sa.Enum('email', 'sms', 'whatsapp', 'in_app'), nullable=False),
    sa.Column('config', sa.JSON(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name')
    )
    with op.batch_alter_table('notification_providers', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_notification_providers_id'), ['id'], unique=False)

    op.create_table('organizations',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=150), nullable=False),
    sa.Column('address', sa.Text(), nullable=True),
    sa.Column('contact_email', sa.String(length=150), nullable=True),
    sa.Column('contact_phone', sa.String(length=20), nullable=True),
    sa.Column('is_active', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('organizations', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_organizations_id'), ['id'], unique=False)

    op.create_table('radiology_modalities',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('status', sa.Enum('active', 'inactive'), nullable=True),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('radiology_modalities', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_radiology_modalities_id'), ['id'], unique=False)

    op.create_table('supplier',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=150), nullable=False),
    sa.Column('contact_person', sa.String(length=100), nullable=True),
    sa.Column('email', sa.String(length=150), nullable=True),
    sa.Column('phone', sa.String(length=20), nullable=True),
    sa.Column('address', sa.Text(), nullable=True),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('supplier', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_supplier_id'), ['id'], unique=False)

    op.create_table('ambulance_staff_assignments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('ambulance_id', sa.Integer(), nullable=False),
    sa.Column('staff_id', sa.Integer(), nullable=False),
    sa.Column('status', sa.Enum('active', 'inactive'), nullable=True),
    sa.Column('assigned_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.ForeignKeyConstraint(['ambulance_id'], ['ambulances.id'], ),
    sa.ForeignKeyConstraint(['staff_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('ambulance_id', 'staff_id', name='uq_ambulance_staff_assignment')
    )
    with op.batch_alter_table('ambulance_staff_assignments', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_ambulance_staff_assignments_id'), ['id'], unique=False)

    op.create_table('ambulance_status_history',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('ambulance_id', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=50), nullable=False),
    sa.Column('recorded_by', sa.Integer(), nullable=False),
    sa.Column('recorded_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.ForeignKeyConstraint(['ambulance_id'], ['ambulances.id'], ),
    sa.ForeignKeyConstraint(['recorded_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('ambulance_status_history', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_ambulance_status_history_id'), ['id'], unique=False)

    op.create_table('daily_closings',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('closing_date', sa.Date(), nullable=False),
    sa.Column('total_revenue', sa.DECIMAL(precision=10, scale=2), nullable=False),
    sa.Column('total_expenses', sa.DECIMAL(precision=10, scale=2), nullable=False),
    sa.Column('total_refunds', sa.DECIMAL(precision=10, scale=2), nullable=False),
    sa.Column('net_amount', sa.DECIMAL(precision=10, scale=2), nullable=False),
    sa.Column('closed_by', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.ForeignKeyConstraint(['closed_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('closing_date')
    )
    with op.batch_alter_table('daily_closings', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_daily_closings_id'), ['id'], unique=False)

    op.create_table('expenses',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('category_id', sa.Integer(), nullable=False),
    sa.Column('amount', sa.DECIMAL(precision=10, scale=2), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('incurred_date', sa.Date(), nullable=False),
    sa.Column('recorded_by', sa.Integer(), nullable=False),
    sa.Column('idempotency_key', sa.String(length=191), nullable=False),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.CheckConstraint('amount > 0', name='ck_expenses_amount_positive'),
    sa.ForeignKeyConstraint(['category_id'], ['expense_categories.id'], ),
    sa.ForeignKeyConstraint(['recorded_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('idempotency_key')
    )
    with op.batch_alter_table('expenses', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_expenses_id'), ['id'], unique=False)

    op.create_table('feature_flags',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('feature_name', sa.String(length=100), nullable=False),
    sa.Column('is_enabled', sa.Integer(), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_by', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('feature_name')
    )
    with op.batch_alter_table('feature_flags', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_feature_flags_id'), ['id'], unique=False)

    op.create_table('financial_transactions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('transaction_type', sa.Enum('payment', 'refund', 'expense'), nullable=False),
    sa.Column('amount', sa.DECIMAL(precision=10, scale=2), nullable=False),
    sa.Column('reference_id', sa.Integer(), nullable=True),
    sa.Column('reference_type', sa.String(length=50), nullable=True),
    sa.Column('payment_method', sa.String(length=50), nullable=True),
    sa.Column('transaction_date', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('recorded_by', sa.Integer(), nullable=False),
    sa.CheckConstraint('amount > 0', name='ck_financial_transactions_amount_positive'),
    sa.ForeignKeyConstraint(['recorded_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('transaction_type', 'reference_type', 'reference_id', name='uq_financial_transaction_reference')
    )
    with op.batch_alter_table('financial_transactions', schema=None) as batch_op:
        batch_op.create_index('ix_financial_transactions_date_type', ['transaction_date', 'transaction_type'], unique=False)
        batch_op.create_index(batch_op.f('ix_financial_transactions_id'), ['id'], unique=False)

    op.create_table('lab_tests',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('category_id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=150), nullable=False),
    sa.Column('code', sa.String(length=50), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('price', sa.DECIMAL(precision=10, scale=2), nullable=False),
    sa.Column('status', sa.Enum('active', 'inactive'), nullable=True),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.CheckConstraint('price >= 0', name='ck_lab_tests_price_nonnegative'),
    sa.ForeignKeyConstraint(['category_id'], ['lab_test_categories.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('code', name='uq_lab_tests_code')
    )
    with op.batch_alter_table('lab_tests', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_lab_tests_id'), ['id'], unique=False)

    op.create_table('medicine',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=150), nullable=False),
    sa.Column('generic_name', sa.String(length=150), nullable=True),
    sa.Column('category_id', sa.Integer(), nullable=False),
    sa.Column('unit', sa.String(length=50), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('status', sa.Enum('active', 'inactive'), nullable=False),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.ForeignKeyConstraint(['category_id'], ['medicine_category.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('medicine', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_medicine_id'), ['id'], unique=False)

    op.create_table('notification_preferences',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('email_enabled', sa.Boolean(), nullable=True),
    sa.Column('sms_enabled', sa.Boolean(), nullable=True),
    sa.Column('whatsapp_enabled', sa.Boolean(), nullable=True),
    sa.Column('in_app_enabled', sa.Boolean(), nullable=True),
    sa.Column('appointment_reminder', sa.Boolean(), nullable=True),
    sa.Column('prescription_ready', sa.Boolean(), nullable=True),
    sa.Column('lab_result_ready', sa.Boolean(), nullable=True),
    sa.Column('radiology_report_ready', sa.Boolean(), nullable=True),
    sa.Column('payment_receipt', sa.Boolean(), nullable=True),
    sa.Column('insurance_status', sa.Boolean(), nullable=True),
    sa.Column('emergency_dispatch', sa.Boolean(), nullable=True),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id')
    )
    with op.batch_alter_table('notification_preferences', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_notification_preferences_id'), ['id'], unique=False)

    op.create_table('notifications',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('type', sa.String(length=100), nullable=False),
    sa.Column('channel', sa.Enum('email', 'sms', 'whatsapp', 'in_app'), nullable=False),
    sa.Column('subject', sa.String(length=255), nullable=True),
    sa.Column('body', sa.Text(), nullable=False),
    sa.Column('status', sa.Enum('pending', 'sent', 'failed', 'read'), nullable=True),
    sa.Column('retry_count', sa.Integer(), nullable=True),
    sa.Column('celery_task_id', sa.String(length=255), nullable=True),
    sa.Column('entity_type', sa.String(length=100), nullable=True),
    sa.Column('entity_id', sa.Integer(), nullable=True),
    sa.Column('error_message', sa.Text(), nullable=True),
    sa.Column('idempotency_key', sa.String(length=191), nullable=True),
    sa.Column('sent_at', sa.TIMESTAMP(), nullable=True),
    sa.Column('read_at', sa.TIMESTAMP(), nullable=True),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('idempotency_key', name='uq_notifications_idempotency_key')
    )
    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.create_index('idx_notifications_celery', ['celery_task_id'], unique=False)
        batch_op.create_index('idx_notifications_user_status', ['user_id', 'status'], unique=False)
        batch_op.create_index(batch_op.f('ix_notifications_id'), ['id'], unique=False)

    op.create_table('purchase',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('supplier_id', sa.Integer(), nullable=False),
    sa.Column('purchase_date', sa.Date(), nullable=False),
    sa.Column('total_amount', sa.DECIMAL(precision=10, scale=2), nullable=False),
    sa.Column('status', sa.Enum('pending', 'received', 'cancelled'), nullable=True),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('created_by', sa.Integer(), nullable=False),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.CheckConstraint('total_amount >= 0', name='ck_purchase_total_nonnegative'),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['supplier_id'], ['supplier.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('purchase', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_purchase_id'), ['id'], unique=False)

    op.create_table('role_permissions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('role', sa.String(length=50), nullable=False),
    sa.Column('permission', sa.String(length=100), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('created_by', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('role_permissions', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_role_permissions_id'), ['id'], unique=False)
        batch_op.create_index('unique_role_permission', ['role', 'permission'], unique=True)

    op.create_table('system_settings',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('setting_key', sa.String(length=100), nullable=False),
    sa.Column('setting_value', sa.Text(), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_by', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('setting_key')
    )
    with op.batch_alter_table('system_settings', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_system_settings_id'), ['id'], unique=False)

    op.create_table('ambulance_requests',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('patient_id', sa.Integer(), nullable=True),
    sa.Column('requester_name', sa.String(length=150), nullable=True),
    sa.Column('requester_contact', sa.String(length=50), nullable=True),
    sa.Column('pickup_location', sa.Text(), nullable=False),
    sa.Column('priority', sa.Enum('low', 'medium', 'high', 'critical'), nullable=True),
    sa.Column('status', sa.Enum('requested', 'approved', 'dispatched', 'accepted', 'pickup', 'transporting', 'arrived', 'completed', 'cancelled'), nullable=True),
    sa.Column('requested_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('ambulance_requests', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_ambulance_requests_id'), ['id'], unique=False)

    op.create_table('insurance_policies',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('patient_id', sa.Integer(), nullable=False),
    sa.Column('provider_id', sa.Integer(), nullable=False),
    sa.Column('policy_number', sa.String(length=100), nullable=False),
    sa.Column('coverage_start', sa.Date(), nullable=False),
    sa.Column('coverage_end', sa.Date(), nullable=False),
    sa.Column('coverage_limit', sa.DECIMAL(precision=10, scale=2), nullable=True),
    sa.Column('status', sa.Enum('active', 'expired', 'suspended'), nullable=True),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.CheckConstraint('coverage_end >= coverage_start', name='ck_insurance_policy_dates'),
    sa.CheckConstraint('coverage_limit IS NULL OR coverage_limit >= 0', name='ck_insurance_coverage_nonnegative'),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.ForeignKeyConstraint(['provider_id'], ['insurance_providers.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('provider_id', 'policy_number', name='uq_insurance_provider_policy')
    )
    with op.batch_alter_table('insurance_policies', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_insurance_policies_id'), ['id'], unique=False)
        batch_op.create_index('ix_insurance_policy_patient_status', ['patient_id', 'status'], unique=False)

    op.create_table('medicine_batch',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('medicine_id', sa.Integer(), nullable=False),
    sa.Column('batch_number', sa.String(length=100), nullable=False),
    sa.Column('expiry_date', sa.Date(), nullable=False),
    sa.Column('purchase_price', sa.DECIMAL(precision=10, scale=2), nullable=False),
    sa.Column('selling_price', sa.DECIMAL(precision=10, scale=2), nullable=False),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('available_quantity', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.CheckConstraint('available_quantity <= quantity', name='ck_medicine_batch_available_lte_quantity'),
    sa.CheckConstraint('available_quantity >= 0', name='ck_medicine_batch_available_nonnegative'),
    sa.CheckConstraint('quantity >= 0', name='ck_medicine_batch_quantity_nonnegative'),
    sa.ForeignKeyConstraint(['medicine_id'], ['medicine.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('medicine_id', 'batch_number', name='uq_medicine_batch_number')
    )
    with op.batch_alter_table('medicine_batch', schema=None) as batch_op:
        batch_op.create_index('ix_medicine_batch_expiry_available', ['expiry_date', 'available_quantity'], unique=False)
        batch_op.create_index(batch_op.f('ix_medicine_batch_id'), ['id'], unique=False)

    op.create_table('nursing_tasks',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('patient_id', sa.Integer(), nullable=False),
    sa.Column('assigned_nurse_id', sa.Integer(), nullable=True),
    sa.Column('task_type', sa.String(length=100), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('priority', sa.Enum('low', 'medium', 'high', 'emergency'), nullable=True),
    sa.Column('status', sa.Enum('pending', 'in_progress', 'completed', 'cancelled'), nullable=True),
    sa.Column('due_at', sa.TIMESTAMP(), nullable=True),
    sa.Column('completed_at', sa.TIMESTAMP(), nullable=True),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.ForeignKeyConstraint(['assigned_nurse_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('nursing_tasks', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_nursing_tasks_id'), ['id'], unique=False)

    op.create_table('purchase_item',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('purchase_id', sa.Integer(), nullable=False),
    sa.Column('medicine_id', sa.Integer(), nullable=False),
    sa.Column('batch_number', sa.String(length=100), nullable=False),
    sa.Column('expiry_date', sa.Date(), nullable=False),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('purchase_price', sa.DECIMAL(precision=10, scale=2), nullable=False),
    sa.Column('selling_price', sa.DECIMAL(precision=10, scale=2), nullable=False),
    sa.CheckConstraint('purchase_price >= 0', name='ck_purchase_item_purchase_price_nonnegative'),
    sa.CheckConstraint('quantity > 0', name='ck_purchase_item_quantity_positive'),
    sa.CheckConstraint('selling_price >= 0', name='ck_purchase_item_selling_price_nonnegative'),
    sa.ForeignKeyConstraint(['medicine_id'], ['medicine.id'], ),
    sa.ForeignKeyConstraint(['purchase_id'], ['purchase.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('purchase_item', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_purchase_item_id'), ['id'], unique=False)

    op.create_table('refunds',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('transaction_id', sa.Integer(), nullable=False),
    sa.Column('amount', sa.DECIMAL(precision=10, scale=2), nullable=False),
    sa.Column('reason', sa.Text(), nullable=True),
    sa.Column('processed_by', sa.Integer(), nullable=False),
    sa.Column('idempotency_key', sa.String(length=191), nullable=False),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.CheckConstraint('amount > 0', name='ck_refunds_amount_positive'),
    sa.ForeignKeyConstraint(['processed_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['transaction_id'], ['financial_transactions.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('idempotency_key')
    )
    with op.batch_alter_table('refunds', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_refunds_id'), ['id'], unique=False)

    op.create_table('ambulance_trips',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('request_id', sa.Integer(), nullable=False),
    sa.Column('ambulance_id', sa.Integer(), nullable=False),
    sa.Column('status', sa.Enum('dispatched', 'accepted', 'on_route', 'pickup', 'transporting', 'arrived', 'completed', 'cancelled'), nullable=True),
    sa.Column('start_time', sa.TIMESTAMP(), nullable=True),
    sa.Column('pickup_time', sa.TIMESTAMP(), nullable=True),
    sa.Column('arrival_time', sa.TIMESTAMP(), nullable=True),
    sa.Column('end_time', sa.TIMESTAMP(), nullable=True),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.ForeignKeyConstraint(['ambulance_id'], ['ambulances.id'], ),
    sa.ForeignKeyConstraint(['request_id'], ['ambulance_requests.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('request_id', name='uq_ambulance_trip_request')
    )
    with op.batch_alter_table('ambulance_trips', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_ambulance_trips_id'), ['id'], unique=False)

    op.create_table('lab_orders',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('patient_id', sa.Integer(), nullable=False),
    sa.Column('doctor_id', sa.Integer(), nullable=False),
    sa.Column('appointment_id', sa.Integer(), nullable=True),
    sa.Column('ordered_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('status', sa.Enum('pending', 'in_progress', 'completed', 'cancelled'), nullable=True),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ),
    sa.ForeignKeyConstraint(['doctor_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('lab_orders', schema=None) as batch_op:
        batch_op.create_index('ix_lab_orders_doctor_ordered', ['doctor_id', 'ordered_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_lab_orders_id'), ['id'], unique=False)
        batch_op.create_index('ix_lab_orders_patient_status', ['patient_id', 'status'], unique=False)

    op.create_table('nursing_notes',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('patient_id', sa.Integer(), nullable=False),
    sa.Column('nurse_id', sa.Integer(), nullable=False),
    sa.Column('appointment_id', sa.Integer(), nullable=True),
    sa.Column('note', sa.Text(), nullable=True),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ),
    sa.ForeignKeyConstraint(['nurse_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('nursing_notes', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_nursing_notes_id'), ['id'], unique=False)

    op.create_table('patient_vitals',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('patient_id', sa.Integer(), nullable=False),
    sa.Column('recorded_by', sa.Integer(), nullable=False),
    sa.Column('appointment_id', sa.Integer(), nullable=True),
    sa.Column('temperature', sa.DECIMAL(precision=5, scale=2), nullable=True),
    sa.Column('blood_pressure_systolic', sa.Integer(), nullable=True),
    sa.Column('blood_pressure_diastolic', sa.Integer(), nullable=True),
    sa.Column('pulse', sa.Integer(), nullable=True),
    sa.Column('respiratory_rate', sa.Integer(), nullable=True),
    sa.Column('oxygen_saturation', sa.DECIMAL(precision=5, scale=2), nullable=True),
    sa.Column('weight', sa.DECIMAL(precision=5, scale=2), nullable=True),
    sa.Column('height', sa.DECIMAL(precision=5, scale=2), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('recorded_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.ForeignKeyConstraint(['recorded_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('patient_vitals', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_patient_vitals_id'), ['id'], unique=False)

    op.create_table('radiology_orders',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('patient_id', sa.Integer(), nullable=False),
    sa.Column('doctor_id', sa.Integer(), nullable=False),
    sa.Column('appointment_id', sa.Integer(), nullable=True),
    sa.Column('modality_id', sa.Integer(), nullable=False),
    sa.Column('body_part', sa.String(length=150), nullable=True),
    sa.Column('clinical_notes', sa.Text(), nullable=True),
    sa.Column('priority', sa.Enum('routine', 'urgent', 'stat'), nullable=True),
    sa.Column('status', sa.Enum('ordered', 'scheduled', 'performed', 'reporting', 'verified', 'cancelled'), nullable=True),
    sa.Column('ordered_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ),
    sa.ForeignKeyConstraint(['doctor_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['modality_id'], ['radiology_modalities.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('radiology_orders', schema=None) as batch_op:
        batch_op.create_index('ix_radiology_orders_doctor_ordered', ['doctor_id', 'ordered_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_radiology_orders_id'), ['id'], unique=False)
        batch_op.create_index('ix_radiology_orders_patient_status', ['patient_id', 'status'], unique=False)

    op.create_table('stock_transaction',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('medicine_id', sa.Integer(), nullable=False),
    sa.Column('batch_id', sa.Integer(), nullable=False),
    sa.Column('transaction_type', sa.Enum('purchase', 'dispense', 'adjustment', 'return'), nullable=False),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('reference_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('created_by', sa.Integer(), nullable=False),
    sa.CheckConstraint('quantity > 0', name='ck_stock_transaction_quantity_positive'),
    sa.ForeignKeyConstraint(['batch_id'], ['medicine_batch.id'], ),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['medicine_id'], ['medicine.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('stock_transaction', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_stock_transaction_id'), ['id'], unique=False)

    op.create_table('dispensing',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('prescription_id', sa.Integer(), nullable=False),
    sa.Column('patient_id', sa.Integer(), nullable=False),
    sa.Column('total_amount', sa.DECIMAL(precision=10, scale=2), nullable=False),
    sa.Column('status', sa.Enum('completed', 'voided'), nullable=False),
    sa.Column('dispensed_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('dispensed_by', sa.Integer(), nullable=False),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.CheckConstraint('total_amount >= 0', name='ck_dispensing_total_nonnegative'),
    sa.ForeignKeyConstraint(['dispensed_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.ForeignKeyConstraint(['prescription_id'], ['prescriptions.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('prescription_id', name='uq_dispensing_prescription')
    )
    with op.batch_alter_table('dispensing', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_dispensing_id'), ['id'], unique=False)

    op.create_table('insurance_claims',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('policy_id', sa.Integer(), nullable=False),
    sa.Column('billing_id', sa.Integer(), nullable=True),
    sa.Column('amount_claimed', sa.DECIMAL(precision=10, scale=2), nullable=False),
    sa.Column('approved_amount', sa.DECIMAL(precision=10, scale=2), nullable=True),
    sa.Column('status', sa.Enum('draft', 'submitted', 'under_review', 'approved', 'partially_approved', 'rejected', 'settled', 'cancelled'), nullable=True),
    sa.Column('officer_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.CheckConstraint('amount_claimed > 0', name='ck_insurance_claim_amount_positive'),
    sa.CheckConstraint('approved_amount IS NULL OR approved_amount >= 0', name='ck_insurance_approved_nonnegative'),
    sa.ForeignKeyConstraint(['billing_id'], ['billing.id'], ),
    sa.ForeignKeyConstraint(['officer_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['policy_id'], ['insurance_policies.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('insurance_claims', schema=None) as batch_op:
        batch_op.create_index('ix_insurance_claim_status_updated', ['status', 'updated_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_insurance_claims_id'), ['id'], unique=False)

    op.create_table('lab_order_items',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('order_id', sa.Integer(), nullable=False),
    sa.Column('test_id', sa.Integer(), nullable=False),
    sa.Column('status', sa.Enum('ordered', 'sample_collected', 'processing', 'completed', 'verified', 'cancelled'), nullable=True),
    sa.ForeignKeyConstraint(['order_id'], ['lab_orders.id'], ),
    sa.ForeignKeyConstraint(['test_id'], ['lab_tests.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('order_id', 'test_id', name='uq_lab_order_test')
    )
    with op.batch_alter_table('lab_order_items', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_lab_order_items_id'), ['id'], unique=False)

    op.create_table('radiology_studies',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('order_id', sa.Integer(), nullable=False),
    sa.Column('study_identifier', sa.String(length=150), nullable=False),
    sa.Column('storage_reference', sa.String(length=255), nullable=True),
    sa.Column('performed_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('technician_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.ForeignKeyConstraint(['order_id'], ['radiology_orders.id'], ),
    sa.ForeignKeyConstraint(['technician_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('study_identifier')
    )
    with op.batch_alter_table('radiology_studies', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_radiology_studies_id'), ['id'], unique=False)

    op.create_table('dispensing_item',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('dispensing_id', sa.Integer(), nullable=False),
    sa.Column('medicine_id', sa.Integer(), nullable=False),
    sa.Column('batch_id', sa.Integer(), nullable=False),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('selling_price', sa.DECIMAL(precision=10, scale=2), nullable=False),
    sa.Column('total_price', sa.DECIMAL(precision=10, scale=2), nullable=False),
    sa.CheckConstraint('quantity > 0', name='ck_dispensing_item_quantity_positive'),
    sa.CheckConstraint('selling_price >= 0', name='ck_dispensing_item_price_nonnegative'),
    sa.CheckConstraint('total_price >= 0', name='ck_dispensing_item_total_nonnegative'),
    sa.ForeignKeyConstraint(['batch_id'], ['medicine_batch.id'], ),
    sa.ForeignKeyConstraint(['dispensing_id'], ['dispensing.id'], ),
    sa.ForeignKeyConstraint(['medicine_id'], ['medicine.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('dispensing_item', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_dispensing_item_id'), ['id'], unique=False)

    op.create_table('insurance_claim_items',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('claim_id', sa.Integer(), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('amount', sa.DECIMAL(precision=10, scale=2), nullable=False),
    sa.CheckConstraint('amount > 0', name='ck_insurance_claim_item_amount_positive'),
    sa.ForeignKeyConstraint(['claim_id'], ['insurance_claims.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('insurance_claim_items', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_insurance_claim_items_id'), ['id'], unique=False)

    op.create_table('insurance_documents',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('claim_id', sa.Integer(), nullable=False),
    sa.Column('document_reference', sa.String(length=255), nullable=False),
    sa.Column('uploaded_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.ForeignKeyConstraint(['claim_id'], ['insurance_claims.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('insurance_documents', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_insurance_documents_id'), ['id'], unique=False)

    op.create_table('insurance_payments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('claim_id', sa.Integer(), nullable=False),
    sa.Column('amount_paid', sa.DECIMAL(precision=10, scale=2), nullable=False),
    sa.Column('payment_date', sa.Date(), nullable=False),
    sa.Column('transaction_reference', sa.String(length=150), nullable=True),
    sa.Column('recorded_by', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.CheckConstraint('amount_paid > 0', name='ck_insurance_payment_amount_positive'),
    sa.ForeignKeyConstraint(['claim_id'], ['insurance_claims.id'], ),
    sa.ForeignKeyConstraint(['recorded_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('transaction_reference', name='uq_insurance_payment_reference')
    )
    with op.batch_alter_table('insurance_payments', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_insurance_payments_id'), ['id'], unique=False)

    op.create_table('lab_results',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('order_item_id', sa.Integer(), nullable=False),
    sa.Column('technician_id', sa.Integer(), nullable=False),
    sa.Column('result_value', sa.Text(), nullable=True),
    sa.Column('unit', sa.String(length=50), nullable=True),
    sa.Column('reference_range', sa.String(length=100), nullable=True),
    sa.Column('remarks', sa.Text(), nullable=True),
    sa.Column('status', sa.Enum('completed', 'verified'), nullable=True),
    sa.Column('verified_by', sa.Integer(), nullable=True),
    sa.Column('verified_at', sa.TIMESTAMP(), nullable=True),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.ForeignKeyConstraint(['order_item_id'], ['lab_order_items.id'], ),
    sa.ForeignKeyConstraint(['technician_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['verified_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('order_item_id', name='uq_lab_result_order_item')
    )
    with op.batch_alter_table('lab_results', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_lab_results_id'), ['id'], unique=False)

    op.create_table('lab_samples',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('order_item_id', sa.Integer(), nullable=False),
    sa.Column('sample_type', sa.String(length=100), nullable=True),
    sa.Column('barcode', sa.String(length=100), nullable=True),
    sa.Column('collected_by', sa.Integer(), nullable=False),
    sa.Column('collected_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('status', sa.Enum('collected', 'processing', 'rejected', 'completed'), nullable=True),
    sa.ForeignKeyConstraint(['collected_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['order_item_id'], ['lab_order_items.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('barcode'),
    sa.UniqueConstraint('order_item_id', name='uq_lab_sample_order_item')
    )
    with op.batch_alter_table('lab_samples', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_lab_samples_id'), ['id'], unique=False)

    op.create_table('radiology_reports',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('study_id', sa.Integer(), nullable=False),
    sa.Column('radiologist_id', sa.Integer(), nullable=False),
    sa.Column('findings', sa.Text(), nullable=True),
    sa.Column('impression', sa.Text(), nullable=True),
    sa.Column('recommendations', sa.Text(), nullable=True),
    sa.Column('status', sa.Enum('draft', 'verified'), nullable=True),
    sa.Column('version', sa.Integer(), nullable=True),
    sa.Column('parent_report_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('verified_at', sa.TIMESTAMP(), nullable=True),
    sa.ForeignKeyConstraint(['parent_report_id'], ['radiology_reports.id'], ),
    sa.ForeignKeyConstraint(['radiologist_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['study_id'], ['radiology_studies.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('study_id', 'version', name='uq_radiology_report_version')
    )
    with op.batch_alter_table('radiology_reports', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_radiology_reports_id'), ['id'], unique=False)

    op.create_table('lab_result_attachments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('result_id', sa.Integer(), nullable=False),
    sa.Column('file_url', sa.String(length=255), nullable=False),
    sa.Column('uploaded_at', sa.TIMESTAMP(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.ForeignKeyConstraint(['result_id'], ['lab_results.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('lab_result_attachments', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_lab_result_attachments_id'), ['id'], unique=False)

    _add_doctor_department_fk(bind)
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('lab_result_attachments', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_lab_result_attachments_id'))

    op.drop_table('lab_result_attachments')
    with op.batch_alter_table('radiology_reports', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_radiology_reports_id'))

    op.drop_table('radiology_reports')
    with op.batch_alter_table('lab_samples', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_lab_samples_id'))

    op.drop_table('lab_samples')
    with op.batch_alter_table('lab_results', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_lab_results_id'))

    op.drop_table('lab_results')
    with op.batch_alter_table('insurance_payments', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_insurance_payments_id'))

    op.drop_table('insurance_payments')
    with op.batch_alter_table('insurance_documents', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_insurance_documents_id'))

    op.drop_table('insurance_documents')
    with op.batch_alter_table('insurance_claim_items', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_insurance_claim_items_id'))

    op.drop_table('insurance_claim_items')
    with op.batch_alter_table('dispensing_item', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_dispensing_item_id'))

    op.drop_table('dispensing_item')
    with op.batch_alter_table('radiology_studies', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_radiology_studies_id'))

    op.drop_table('radiology_studies')
    with op.batch_alter_table('lab_order_items', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_lab_order_items_id'))

    op.drop_table('lab_order_items')
    with op.batch_alter_table('insurance_claims', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_insurance_claims_id'))
        batch_op.drop_index('ix_insurance_claim_status_updated')

    op.drop_table('insurance_claims')
    with op.batch_alter_table('dispensing', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_dispensing_id'))

    op.drop_table('dispensing')
    with op.batch_alter_table('stock_transaction', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_stock_transaction_id'))

    op.drop_table('stock_transaction')
    with op.batch_alter_table('radiology_orders', schema=None) as batch_op:
        batch_op.drop_index('ix_radiology_orders_patient_status')
        batch_op.drop_index(batch_op.f('ix_radiology_orders_id'))
        batch_op.drop_index('ix_radiology_orders_doctor_ordered')

    op.drop_table('radiology_orders')
    with op.batch_alter_table('patient_vitals', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_patient_vitals_id'))

    op.drop_table('patient_vitals')
    with op.batch_alter_table('nursing_notes', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_nursing_notes_id'))

    op.drop_table('nursing_notes')
    with op.batch_alter_table('lab_orders', schema=None) as batch_op:
        batch_op.drop_index('ix_lab_orders_patient_status')
        batch_op.drop_index(batch_op.f('ix_lab_orders_id'))
        batch_op.drop_index('ix_lab_orders_doctor_ordered')

    op.drop_table('lab_orders')
    with op.batch_alter_table('ambulance_trips', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_ambulance_trips_id'))

    op.drop_table('ambulance_trips')
    with op.batch_alter_table('refunds', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_refunds_id'))

    op.drop_table('refunds')
    with op.batch_alter_table('purchase_item', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_purchase_item_id'))

    op.drop_table('purchase_item')
    with op.batch_alter_table('nursing_tasks', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_nursing_tasks_id'))

    op.drop_table('nursing_tasks')
    with op.batch_alter_table('medicine_batch', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_medicine_batch_id'))
        batch_op.drop_index('ix_medicine_batch_expiry_available')

    op.drop_table('medicine_batch')
    with op.batch_alter_table('insurance_policies', schema=None) as batch_op:
        batch_op.drop_index('ix_insurance_policy_patient_status')
        batch_op.drop_index(batch_op.f('ix_insurance_policies_id'))

    op.drop_table('insurance_policies')
    with op.batch_alter_table('ambulance_requests', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_ambulance_requests_id'))

    op.drop_table('ambulance_requests')
    with op.batch_alter_table('system_settings', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_system_settings_id'))

    op.drop_table('system_settings')
    with op.batch_alter_table('role_permissions', schema=None) as batch_op:
        batch_op.drop_index('unique_role_permission')
        batch_op.drop_index(batch_op.f('ix_role_permissions_id'))

    op.drop_table('role_permissions')
    with op.batch_alter_table('purchase', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_purchase_id'))

    op.drop_table('purchase')
    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_notifications_id'))
        batch_op.drop_index('idx_notifications_user_status')
        batch_op.drop_index('idx_notifications_celery')

    op.drop_table('notifications')
    with op.batch_alter_table('notification_preferences', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_notification_preferences_id'))

    op.drop_table('notification_preferences')
    with op.batch_alter_table('medicine', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_medicine_id'))

    op.drop_table('medicine')
    with op.batch_alter_table('lab_tests', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_lab_tests_id'))

    op.drop_table('lab_tests')
    with op.batch_alter_table('financial_transactions', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_financial_transactions_id'))
        batch_op.drop_index('ix_financial_transactions_date_type')

    op.drop_table('financial_transactions')
    with op.batch_alter_table('feature_flags', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_feature_flags_id'))

    op.drop_table('feature_flags')
    with op.batch_alter_table('expenses', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_expenses_id'))

    op.drop_table('expenses')
    with op.batch_alter_table('daily_closings', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_daily_closings_id'))

    op.drop_table('daily_closings')
    with op.batch_alter_table('ambulance_status_history', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_ambulance_status_history_id'))

    op.drop_table('ambulance_status_history')
    with op.batch_alter_table('ambulance_staff_assignments', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_ambulance_staff_assignments_id'))

    op.drop_table('ambulance_staff_assignments')
    with op.batch_alter_table('supplier', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_supplier_id'))

    op.drop_table('supplier')
    with op.batch_alter_table('radiology_modalities', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_radiology_modalities_id'))

    op.drop_table('radiology_modalities')
    with op.batch_alter_table('organizations', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_organizations_id'))

    op.drop_table('organizations')
    with op.batch_alter_table('notification_providers', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_notification_providers_id'))

    op.drop_table('notification_providers')
    with op.batch_alter_table('medicine_category', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_medicine_category_id'))

    op.drop_table('medicine_category')
    with op.batch_alter_table('lab_test_categories', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_lab_test_categories_id'))

    op.drop_table('lab_test_categories')
    with op.batch_alter_table('insurance_providers', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_insurance_providers_id'))

    op.drop_table('insurance_providers')
    with op.batch_alter_table('expense_categories', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_expense_categories_id'))

    op.drop_table('expense_categories')
    with op.batch_alter_table('departments', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_departments_department_id'))

    op.drop_table('departments')
    with op.batch_alter_table('ambulances', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_ambulances_id'))

    op.drop_table('ambulances')
    # ### end Alembic commands ###
