"""Enterprise RBAC role expansion and audit foundation.

Revision ID: 20260826_0001
Revises: None
Create Date: 2026-08-26
"""
from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql


revision: str = "20260826_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

OLD_ROLES = ("patient", "doctor", "receptionist", "admin")
NEW_ROLES = OLD_ROLES + (
    "super_admin",
    "hospital_manager",
    "nurse",
    "pharmacist",
    "lab_technician",
    "radiologist",
    "accountant",
    "insurance_officer",
    "ambulance_staff",
)
ADDED_ROLES = NEW_ROLES[len(OLD_ROLES):]


def _role_type(values):
    return mysql.ENUM(*values, name="user_role")


def _create_core_schema_if_missing(bind) -> bool:
    """Create the legacy core on a blank database without inserting records."""
    if context.is_offline_mode() or "users" in sa.inspect(bind).get_table_names():
        return False
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(150), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum(*NEW_ROLES, name="user_role"), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=True, server_default=sa.true()),
        sa.Column("is_email_verified", sa.Boolean(), nullable=True, server_default=sa.false()),
        sa.Column("email_verified_at", sa.TIMESTAMP(), nullable=True),
        sa.Column("email_verification_token_hash", sa.String(255), nullable=True),
        sa.Column("email_verification_expires_at", sa.TIMESTAMP(), nullable=True),
        sa.Column("password_reset_token_hash", sa.String(255), nullable=True),
        sa.Column("password_reset_expires_at", sa.TIMESTAMP(), nullable=True),
        sa.Column("last_login_at", sa.TIMESTAMP(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_table(
        "patients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True, unique=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("age", sa.Integer(), nullable=True),
        sa.Column("gender", sa.Enum("male", "female", "other"), nullable=True),
        sa.Column("contact", sa.String(20), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("blood_group", sa.String(5), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_patients_id", "patients", ["id"])
    op.create_table(
        "doctors",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True, unique=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("specialization", sa.String(100), nullable=True),
        sa.Column("department_id", sa.Integer(), nullable=True),
        sa.Column("consultation_fee", sa.DECIMAL(10, 2), nullable=True),
        sa.Column("timing_start", sa.Time(), nullable=True),
        sa.Column("timing_end", sa.Time(), nullable=True),
        sa.Column("contact", sa.String(20), nullable=True),
        sa.Column("status", sa.Enum("active", "on_leave"), server_default="active"),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_doctors_id", "doctors", ["id"])
    op.create_table(
        "employees",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, unique=True),
        sa.Column("designation", sa.String(100), nullable=False),
        sa.Column("joining_date", sa.Date(), nullable=True),
        sa.Column("shift_start", sa.Time(), nullable=True),
        sa.Column("shift_end", sa.Time(), nullable=True),
        sa.Column("status", sa.Enum("active", "inactive"), server_default="active"),
        sa.Column("added_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_employees_id", "employees", ["id"])
    op.create_table(
        "employee_permissions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=False, unique=True),
        sa.Column("can_register_patient", sa.Integer(), server_default="1"),
        sa.Column("can_schedule_appointment", sa.Integer(), server_default="1"),
        sa.Column("can_checkin_patient", sa.Integer(), server_default="1"),
        sa.Column("can_collect_billing", sa.Integer(), server_default="1"),
        sa.Column("can_view_reports", sa.Integer(), server_default="0"),
    )
    op.create_index("ix_employee_permissions_id", "employee_permissions", ["id"])
    op.create_table(
        "appointments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id"), nullable=False),
        sa.Column("doctor_id", sa.Integer(), sa.ForeignKey("doctors.id"), nullable=False),
        sa.Column("appt_date", sa.Date(), nullable=False),
        sa.Column("appt_time", sa.Time(), nullable=False),
        sa.Column("reason", sa.String(255), nullable=True),
        sa.Column("status", sa.Enum("requested", "confirmed", "checked_in", "in_progress", "completed", "cancelled"), server_default="requested"),
        sa.Column("checked_in_at", sa.TIMESTAMP(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_appointments_id", "appointments", ["id"])
    op.create_index("ix_appointments_doctor_slot", "appointments", ["doctor_id", "appt_date", "appt_time"])
    op.create_index("ix_appointments_patient_date", "appointments", ["patient_id", "appt_date"])
    op.create_index("ix_appointments_status_date", "appointments", ["status", "appt_date"])
    op.create_table(
        "prescriptions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("appointment_id", sa.Integer(), sa.ForeignKey("appointments.id"), nullable=False, unique=True),
        sa.Column("diagnosis", sa.Text(), nullable=True),
        sa.Column("medicine", sa.String(150), nullable=True),
        sa.Column("dosage", sa.String(100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_prescriptions_id", "prescriptions", ["id"])
    op.create_table(
        "billing",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id"), nullable=False),
        sa.Column("appointment_id", sa.Integer(), sa.ForeignKey("appointments.id"), nullable=False, unique=True),
        sa.Column("amount", sa.DECIMAL(10, 2), nullable=False),
        sa.Column("status", sa.Enum("pending", "paid"), server_default="pending"),
        sa.Column("payment_method", sa.Enum("cash", "card", "upi"), nullable=True),
        sa.Column("collected_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("receipt_no", sa.String(30), nullable=True, unique=True),
        sa.Column("paid_at", sa.TIMESTAMP(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_billing_id", "billing", ["id"])
    op.create_table(
        "hospital_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("hospital_name", sa.String(150), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("gstin", sa.String(20), nullable=True),
        sa.Column("updated_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_hospital_settings_id", "hospital_settings", ["id"])
    return True


def upgrade() -> None:
    bind = op.get_bind()
    fresh = _create_core_schema_if_missing(bind)
    if bind.dialect.name == "mysql" and not fresh:
        op.alter_column(
            "users",
            "role",
            existing_type=_role_type(OLD_ROLES),
            type_=_role_type(NEW_ROLES),
            existing_nullable=False,
        )
    elif not fresh and bind.dialect.name != "sqlite":
        op.alter_column(
            "users",
            "role",
            existing_type=sa.String(length=50),
            type_=sa.String(length=50),
            existing_nullable=False,
        )

    existing_tables = set() if context.is_offline_mode() else set(sa.inspect(bind).get_table_names())
    if "audit_logs" not in existing_tables:
        op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("actor_user_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("resource_type", sa.String(length=100), nullable=False),
        sa.Column("resource_id", sa.String(length=100), nullable=True),
        sa.Column("old_values", sa.JSON(), nullable=True),
        sa.Column("new_values", sa.JSON(), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["actor_user_id"], ["users.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
        "ix_audit_logs_action_created_at",
        "audit_logs",
        ["action", "created_at"],
        )
        op.create_index(
        "ix_audit_logs_actor_created_at",
        "audit_logs",
        ["actor_user_id", "created_at"],
        )
        op.create_index(
        "ix_audit_logs_resource",
        "audit_logs",
        ["resource_type", "resource_id"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "mysql":
        placeholders = ", ".join(f"'{role}'" for role in ADDED_ROLES)
        count = bind.execute(
            sa.text(f"SELECT COUNT(*) FROM users WHERE role IN ({placeholders})")
        ).scalar_one()
        if count:
            raise RuntimeError(
                "Cannot downgrade RBAC migration while users have enterprise roles"
            )

    op.drop_index("ix_audit_logs_resource", table_name="audit_logs")
    op.drop_index("ix_audit_logs_actor_created_at", table_name="audit_logs")
    op.drop_index("ix_audit_logs_action_created_at", table_name="audit_logs")
    op.drop_table("audit_logs")

    if bind.dialect.name == "mysql":
        op.alter_column(
            "users",
            "role",
            existing_type=_role_type(NEW_ROLES),
            type_=_role_type(OLD_ROLES),
            existing_nullable=False,
        )
