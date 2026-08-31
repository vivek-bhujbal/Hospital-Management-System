from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DECIMAL,
    Enum,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    Time,
    TIMESTAMP,
    UniqueConstraint,
    func,
)
from app.database import Base
from app.core.roles import ROLE_VALUES

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(*ROLE_VALUES, name='user_role'), nullable=False)
    is_active = Column(Boolean, default=True)
    is_email_verified = Column(Boolean, default=False)
    email_verified_at = Column(TIMESTAMP, nullable=True)
    email_verification_token_hash = Column(String(255), nullable=True)
    email_verification_expires_at = Column(TIMESTAMP, nullable=True)
    password_reset_token_hash = Column(String(255), nullable=True)
    password_reset_expires_at = Column(TIMESTAMP, nullable=True)
    last_login_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class Patient(Base):
    __tablename__ = 'patients'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True)
    name = Column(String(100), nullable=False)
    age = Column(Integer)
    gender = Column(Enum('male','female','other'))
    contact = Column(String(20))
    address = Column(Text)
    blood_group = Column(String(5))
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class Doctor(Base):
    __tablename__ = 'doctors'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True)
    name = Column(String(100), nullable=False)
    specialization = Column(String(100))
    department_id = Column(Integer, ForeignKey('departments.department_id'), nullable=True)
    consultation_fee = Column(DECIMAL(10, 2), nullable=True)
    timing_start = Column(Time)
    timing_end = Column(Time)
    contact = Column(String(20))
    status = Column(Enum('active','on_leave'), default='active')
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class Employee(Base):
    __tablename__ = 'employees'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True, nullable=False)
    designation = Column(String(100), nullable=False)
    joining_date = Column(Date)
    shift_start = Column(Time)
    shift_end = Column(Time)
    status = Column(Enum('active','inactive'), default='active')
    added_by = Column(Integer, ForeignKey('users.id'))
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class EmployeePermission(Base):
    __tablename__ = 'employee_permissions'
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('employees.id'), nullable=False, unique=True)
    can_register_patient = Column(Integer, default=1)
    can_schedule_appointment = Column(Integer, default=1)
    can_checkin_patient = Column(Integer, default=1)
    can_collect_billing = Column(Integer, default=1)

class Appointment(Base):
    __tablename__ = 'appointments'
    __table_args__ = (
        Index('idx_appointments_doctor_id', 'doctor_id'),
        Index('idx_appointments_patient_id', 'patient_id'),
        Index('ix_appointments_doctor_slot', 'doctor_id', 'appt_date', 'appt_time'),
        Index('ix_appointments_patient_date', 'patient_id', 'appt_date'),
        Index('ix_appointments_status_date', 'status', 'appt_date'),
    )
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False)
    doctor_id = Column(Integer, ForeignKey('doctors.id'), nullable=False)
    appt_date = Column(Date, nullable=False)
    appt_time = Column(Time, nullable=False)
    reason = Column(String(255))
    status = Column(Enum('requested','confirmed','checked_in','in_progress','completed','cancelled'), default='requested')
    checked_in_at = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class Prescription(Base):
    __tablename__ = 'prescriptions'
    __table_args__ = (Index('idx_prescriptions_appointment_id', 'appointment_id'),)
    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey('appointments.id'), nullable=False, unique=True)
    diagnosis = Column(Text)
    medicine = Column(String(150))
    dosage = Column(String(100))
    notes = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())

class Billing(Base):
    __tablename__ = 'billing'
    __table_args__ = (
        Index('idx_billing_appointment_id', 'appointment_id'),
        Index('idx_billing_patient_id', 'patient_id'),
    )
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False)
    appointment_id = Column(Integer, ForeignKey('appointments.id'), nullable=False, unique=True)
    amount = Column(DECIMAL(10,2), nullable=False)
    status = Column(Enum('pending','paid'), default='pending')
    payment_method = Column(Enum('cash','card','upi'))
    collected_by = Column(Integer, ForeignKey('employees.id'))
    receipt_no = Column(String(30), unique=True)
    paid_at = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, server_default=func.now())

class HospitalSetting(Base):
    __tablename__ = 'hospital_settings'
    id = Column(Integer, primary_key=True, index=True)
    hospital_name = Column(String(150))
    address = Column(Text)
    phone = Column(String(20))
    gstin = Column(String(20))
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class AuditLog(Base):
    __tablename__ = 'audit_logs'
    __table_args__ = (
        Index('ix_audit_logs_actor_created_at', 'actor_user_id', 'created_at'),
        Index('ix_audit_logs_resource', 'resource_type', 'resource_id'),
        Index('ix_audit_logs_action_created_at', 'action', 'created_at'),
    )

    id = Column(Integer, primary_key=True)
    actor_user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(100), nullable=True)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())


class SystemSetting(Base):
    __tablename__ = 'system_settings'
    id = Column(Integer, primary_key=True, index=True)
    setting_key = Column(String(100), unique=True, nullable=False)
    setting_value = Column(Text)
    description = Column(Text)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    updated_by = Column(Integer, ForeignKey('users.id'))


class RolePermission(Base):
    __tablename__ = 'role_permissions'
    __table_args__ = (
        Index('unique_role_permission', 'role', 'permission', unique=True),
    )
    id = Column(Integer, primary_key=True, index=True)
    role = Column(String(50), nullable=False)
    permission = Column(String(100), nullable=False)
    description = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)


class FeatureFlag(Base):
    __tablename__ = 'feature_flags'
    id = Column(Integer, primary_key=True, index=True)
    feature_name = Column(String(100), unique=True, nullable=False)
    is_enabled = Column(Integer, default=0)
    description = Column(Text)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    updated_by = Column(Integer, ForeignKey('users.id'))


class Organization(Base):
    __tablename__ = 'organizations'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    address = Column(Text)
    contact_email = Column(String(150))
    contact_phone = Column(String(20))
    is_active = Column(Integer, default=1)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class Department(Base):
    __tablename__ = 'departments'
    __table_args__ = (UniqueConstraint('name', name='uq_departments_name'),)
    department_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text)
    status = Column(Enum('active', 'inactive'), default='active')
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class PatientVital(Base):
    __tablename__ = 'patient_vitals'
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False)
    recorded_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    appointment_id = Column(Integer, ForeignKey('appointments.id'), nullable=True)
    temperature = Column(DECIMAL(5, 2))
    blood_pressure_systolic = Column(Integer)
    blood_pressure_diastolic = Column(Integer)
    pulse = Column(Integer)
    respiratory_rate = Column(Integer)
    oxygen_saturation = Column(DECIMAL(5, 2))
    weight = Column(DECIMAL(5, 2))
    height = Column(DECIMAL(5, 2))
    notes = Column(Text)
    recorded_at = Column(TIMESTAMP, server_default=func.now())
    created_at = Column(TIMESTAMP, server_default=func.now())


class NursingNote(Base):
    __tablename__ = 'nursing_notes'
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False)
    nurse_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    appointment_id = Column(Integer, ForeignKey('appointments.id'), nullable=True)
    note = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class NursingTask(Base):
    __tablename__ = 'nursing_tasks'
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False)
    assigned_nurse_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    task_type = Column(String(100))
    description = Column(Text)
    priority = Column(Enum('low', 'medium', 'high', 'emergency'), default='medium')
    status = Column(Enum('pending', 'in_progress', 'completed', 'cancelled'), default='pending')
    due_at = Column(TIMESTAMP, nullable=True)
    completed_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class MedicineCategory(Base):
    __tablename__ = 'medicine_category'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class Supplier(Base):
    __tablename__ = 'supplier'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    contact_person = Column(String(100))
    email = Column(String(150))
    phone = Column(String(20))
    address = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class Medicine(Base):
    __tablename__ = 'medicine'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    sku = Column(String(100), unique=True, nullable=True)
    generic_name = Column(String(150))
    category_id = Column(Integer, ForeignKey('medicine_category.id'), nullable=False)
    unit = Column(String(50))
    description = Column(Text)
    status = Column(Enum('active', 'inactive'), default='active', nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class Purchase(Base):
    __tablename__ = 'purchase'
    __table_args__ = (CheckConstraint('total_amount >= 0', name='ck_purchase_total_nonnegative'),)
    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey('supplier.id'), nullable=False)
    purchase_date = Column(Date, nullable=False)
    total_amount = Column(DECIMAL(10, 2), nullable=False)
    status = Column(Enum('pending', 'received', 'cancelled'), default='pending')
    created_at = Column(TIMESTAMP, server_default=func.now())
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class PurchaseItem(Base):
    __tablename__ = 'purchase_item'
    __table_args__ = (
        CheckConstraint('quantity > 0', name='ck_purchase_item_quantity_positive'),
        CheckConstraint('purchase_price >= 0', name='ck_purchase_item_purchase_price_nonnegative'),
        CheckConstraint('selling_price >= 0', name='ck_purchase_item_selling_price_nonnegative'),
    )
    id = Column(Integer, primary_key=True, index=True)
    purchase_id = Column(Integer, ForeignKey('purchase.id'), nullable=False)
    medicine_id = Column(Integer, ForeignKey('medicine.id'), nullable=False)
    batch_number = Column(String(100), nullable=False)
    expiry_date = Column(Date, nullable=False)
    quantity = Column(Integer, nullable=False)
    purchase_price = Column(DECIMAL(10, 2), nullable=False)
    selling_price = Column(DECIMAL(10, 2), nullable=False)

class MedicineBatch(Base):
    __tablename__ = 'medicine_batch'
    __table_args__ = (
        UniqueConstraint('medicine_id', 'batch_number', name='uq_medicine_batch_number'),
        CheckConstraint('quantity >= 0', name='ck_medicine_batch_quantity_nonnegative'),
        CheckConstraint('available_quantity >= 0', name='ck_medicine_batch_available_nonnegative'),
        CheckConstraint('available_quantity <= quantity', name='ck_medicine_batch_available_lte_quantity'),
        Index('ix_medicine_batch_expiry_available', 'expiry_date', 'available_quantity'),
    )
    id = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, ForeignKey('medicine.id'), nullable=False)
    supplier_id = Column(Integer, ForeignKey('supplier.id'), nullable=True)
    batch_number = Column(String(100), nullable=False)
    expiry_date = Column(Date, nullable=False)
    purchase_price = Column(DECIMAL(10, 2), nullable=False)
    selling_price = Column(DECIMAL(10, 2), nullable=False)
    quantity = Column(Integer, nullable=False)
    available_quantity = Column(Integer, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class StockTransaction(Base):
    __tablename__ = 'stock_transaction'
    __table_args__ = (CheckConstraint('quantity > 0', name='ck_stock_transaction_quantity_positive'),)
    id = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, ForeignKey('medicine.id'), nullable=False)
    batch_id = Column(Integer, ForeignKey('medicine_batch.id'), nullable=False)
    transaction_type = Column(Enum('purchase', 'dispense', 'adjustment', 'return'), nullable=False)
    quantity = Column(Integer, nullable=False)
    reason = Column(String(255))
    reference_id = Column(Integer)
    created_at = Column(TIMESTAMP, server_default=func.now())
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)

class Dispensing(Base):
    __tablename__ = 'dispensing'
    __table_args__ = (
        UniqueConstraint('prescription_id', name='uq_dispensing_prescription'),
        CheckConstraint('total_amount >= 0', name='ck_dispensing_total_nonnegative'),
    )
    id = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(Integer, ForeignKey('prescriptions.id'), nullable=False)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False)
    total_amount = Column(DECIMAL(10, 2), nullable=False)
    status = Column(Enum('completed', 'voided'), nullable=False, default='completed')
    dispensed_at = Column(TIMESTAMP, server_default=func.now())
    dispensed_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class DispensingItem(Base):
    __tablename__ = 'dispensing_item'
    __table_args__ = (
        CheckConstraint('quantity > 0', name='ck_dispensing_item_quantity_positive'),
        CheckConstraint('selling_price >= 0', name='ck_dispensing_item_price_nonnegative'),
        CheckConstraint('total_price >= 0', name='ck_dispensing_item_total_nonnegative'),
    )
    id = Column(Integer, primary_key=True, index=True)
    dispensing_id = Column(Integer, ForeignKey('dispensing.id'), nullable=False)
    medicine_id = Column(Integer, ForeignKey('medicine.id'), nullable=False)
    batch_id = Column(Integer, ForeignKey('medicine_batch.id'), nullable=False)
    quantity = Column(Integer, nullable=False)
    selling_price = Column(DECIMAL(10, 2), nullable=False)
    total_price = Column(DECIMAL(10, 2), nullable=False)


class PharmacyPrescriptionReview(Base):
    """Pharmacy workflow metadata kept separate from the doctor's prescription."""
    __tablename__ = 'pharmacy_prescription_reviews'
    __table_args__ = (
        UniqueConstraint('prescription_id', name='uq_pharmacy_review_prescription'),
        Index('ix_pharmacy_review_status_updated', 'status', 'updated_at'),
    )
    id = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(Integer, ForeignKey('prescriptions.id'), nullable=False)
    status = Column(Enum(
        'verified', 'rejected', 'ready_for_dispensing', 'dispensed',
        name='pharmacy_prescription_status',
    ), nullable=False)
    rejection_reason = Column(Text)
    verified_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    verified_at = Column(TIMESTAMP, nullable=True)
    updated_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class LabTestCategory(Base):
    __tablename__ = 'lab_test_categories'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class LabTest(Base):
    __tablename__ = 'lab_tests'
    __table_args__ = (
        UniqueConstraint('code', name='uq_lab_tests_code'),
        CheckConstraint('price >= 0', name='ck_lab_tests_price_nonnegative'),
    )
    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey('lab_test_categories.id'), nullable=False)
    name = Column(String(150), nullable=False)
    code = Column(String(50), nullable=False)
    description = Column(Text)
    price = Column(DECIMAL(10,2), nullable=False)
    status = Column(Enum('active', 'inactive'), default='active')
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class LabOrder(Base):
    __tablename__ = 'lab_orders'
    __table_args__ = (
        Index('ix_lab_orders_patient_status', 'patient_id', 'status'),
        Index('ix_lab_orders_doctor_ordered', 'doctor_id', 'ordered_at'),
    )
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False)
    doctor_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    appointment_id = Column(Integer, ForeignKey('appointments.id'), nullable=True)
    assigned_technician_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    instructions = Column(Text)
    priority = Column(Enum('routine', 'urgent', 'stat'), nullable=False, default='routine')
    accepted_at = Column(TIMESTAMP, nullable=True)
    ordered_at = Column(TIMESTAMP, server_default=func.now())
    status = Column(Enum('ordered', 'sample_collected', 'processing', 'completed', 'cancelled'), default='ordered')
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class LabOrderItem(Base):
    __tablename__ = 'lab_order_items'
    __table_args__ = (UniqueConstraint('order_id', 'test_id', name='uq_lab_order_test'),)
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey('lab_orders.id'), nullable=False)
    test_id = Column(Integer, ForeignKey('lab_tests.id'), nullable=False)
    status = Column(Enum('ordered', 'sample_collected', 'processing', 'completed', 'verified', 'cancelled'), default='ordered')

class LabSample(Base):
    __tablename__ = 'lab_samples'
    __table_args__ = (UniqueConstraint('order_item_id', name='uq_lab_sample_order_item'),)
    id = Column(Integer, primary_key=True, index=True)
    order_item_id = Column(Integer, ForeignKey('lab_order_items.id'), nullable=False)
    sample_type = Column(String(100))
    barcode = Column(String(100), unique=True)
    collected_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    collected_at = Column(TIMESTAMP, server_default=func.now())
    status = Column(Enum('collected', 'processing', 'rejected', 'completed'), default='collected')

class LabResult(Base):
    __tablename__ = 'lab_results'
    __table_args__ = (UniqueConstraint('order_item_id', name='uq_lab_result_order_item'),)
    id = Column(Integer, primary_key=True, index=True)
    order_item_id = Column(Integer, ForeignKey('lab_order_items.id'), nullable=False)
    technician_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    result_value = Column(Text)
    numeric_value = Column(DECIMAL(18, 6))
    unit = Column(String(50))
    reference_range = Column(String(100))
    remarks = Column(Text)
    status = Column(Enum('draft', 'finalized'), default='draft')
    finalized_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class LabResultAttachment(Base):
    __tablename__ = 'lab_result_attachments'
    id = Column(Integer, primary_key=True, index=True)
    result_id = Column(Integer, ForeignKey('lab_results.id'), nullable=False)
    file_url = Column(String(255), nullable=False)
    uploaded_at = Column(TIMESTAMP, server_default=func.now())

class RadiologyModality(Base):
    __tablename__ = 'radiology_modalities'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    status = Column(Enum('active', 'inactive'), default='active')
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class RadiologyOrder(Base):
    __tablename__ = 'radiology_orders'
    __table_args__ = (
        Index('ix_radiology_orders_patient_status', 'patient_id', 'status'),
        Index('ix_radiology_orders_doctor_ordered', 'doctor_id', 'ordered_at'),
    )
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False)
    doctor_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    appointment_id = Column(Integer, ForeignKey('appointments.id'), nullable=True)
    modality_id = Column(Integer, ForeignKey('radiology_modalities.id'), nullable=False)
    body_part = Column(String(150))
    clinical_notes = Column(Text)
    priority = Column(Enum('routine', 'urgent', 'stat'), default='routine')
    status = Column(Enum('ordered', 'scheduled', 'performed', 'reporting', 'verified', 'cancelled'), default='ordered')
    ordered_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class RadiologyStudy(Base):
    __tablename__ = 'radiology_studies'
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey('radiology_orders.id'), nullable=False)
    study_identifier = Column(String(150), unique=True, nullable=False)
    storage_reference = Column(String(255))
    performed_at = Column(TIMESTAMP, server_default=func.now())
    technician_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

class RadiologyReport(Base):
    __tablename__ = 'radiology_reports'
    __table_args__ = (UniqueConstraint('study_id', 'version', name='uq_radiology_report_version'),)
    id = Column(Integer, primary_key=True, index=True)
    study_id = Column(Integer, ForeignKey('radiology_studies.id'), nullable=False)
    radiologist_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    findings = Column(Text)
    impression = Column(Text)
    recommendations = Column(Text)
    status = Column(Enum('draft', 'verified'), default='draft')
    version = Column(Integer, default=1)
    parent_report_id = Column(Integer, ForeignKey('radiology_reports.id'), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    verified_at = Column(TIMESTAMP, nullable=True)

class ExpenseCategory(Base):
    __tablename__ = 'expense_categories'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class Expense(Base):
    __tablename__ = 'expenses'
    __table_args__ = (CheckConstraint('amount > 0', name='ck_expenses_amount_positive'),)
    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey('expense_categories.id'), nullable=False)
    amount = Column(DECIMAL(10,2), nullable=False)
    description = Column(Text)
    incurred_date = Column(Date, nullable=False)
    recorded_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    idempotency_key = Column(String(191), nullable=False, unique=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class FinancialTransaction(Base):
    __tablename__ = 'financial_transactions'
    __table_args__ = (
        CheckConstraint('amount > 0', name='ck_financial_transactions_amount_positive'),
        UniqueConstraint('transaction_type', 'reference_type', 'reference_id', name='uq_financial_transaction_reference'),
        Index('ix_financial_transactions_date_type', 'transaction_date', 'transaction_type'),
    )
    id = Column(Integer, primary_key=True, index=True)
    transaction_type = Column(Enum('payment', 'refund', 'expense'), nullable=False)
    amount = Column(DECIMAL(10,2), nullable=False)
    reference_id = Column(Integer)
    reference_type = Column(String(50))
    payment_method = Column(String(50))
    transaction_date = Column(TIMESTAMP, server_default=func.now())
    recorded_by = Column(Integer, ForeignKey('users.id'), nullable=False)

class Refund(Base):
    __tablename__ = 'refunds'
    __table_args__ = (CheckConstraint('amount > 0', name='ck_refunds_amount_positive'),)
    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey('financial_transactions.id'), nullable=False)
    amount = Column(DECIMAL(10,2), nullable=False)
    reason = Column(Text)
    processed_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    idempotency_key = Column(String(191), nullable=False, unique=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

class DailyClosing(Base):
    __tablename__ = 'daily_closings'
    id = Column(Integer, primary_key=True, index=True)
    closing_date = Column(Date, unique=True, nullable=False)
    total_revenue = Column(DECIMAL(10,2), nullable=False, default=0.00)
    total_expenses = Column(DECIMAL(10,2), nullable=False, default=0.00)
    total_refunds = Column(DECIMAL(10,2), nullable=False, default=0.00)
    net_amount = Column(DECIMAL(10,2), nullable=False, default=0.00)
    closed_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

class InsuranceProvider(Base):
    __tablename__ = 'insurance_providers'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    contact_info = Column(Text)
    status = Column(Enum('active', 'inactive'), default='active')
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class InsurancePolicy(Base):
    __tablename__ = 'insurance_policies'
    __table_args__ = (
        UniqueConstraint('provider_id', 'policy_number', name='uq_insurance_provider_policy'),
        CheckConstraint('coverage_limit IS NULL OR coverage_limit >= 0', name='ck_insurance_coverage_nonnegative'),
        CheckConstraint('coverage_end >= coverage_start', name='ck_insurance_policy_dates'),
        Index('ix_insurance_policy_patient_status', 'patient_id', 'status'),
    )
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False)
    provider_id = Column(Integer, ForeignKey('insurance_providers.id'), nullable=False)
    policy_number = Column(String(100), nullable=False)
    coverage_start = Column(Date, nullable=False)
    coverage_end = Column(Date, nullable=False)
    coverage_limit = Column(DECIMAL(10,2))
    status = Column(Enum('active', 'expired', 'suspended'), default='active')
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class InsuranceClaim(Base):
    __tablename__ = 'insurance_claims'
    __table_args__ = (
        CheckConstraint('amount_claimed > 0', name='ck_insurance_claim_amount_positive'),
        CheckConstraint('approved_amount IS NULL OR approved_amount >= 0', name='ck_insurance_approved_nonnegative'),
        Index('ix_insurance_claim_status_updated', 'status', 'updated_at'),
    )
    id = Column(Integer, primary_key=True, index=True)
    policy_id = Column(Integer, ForeignKey('insurance_policies.id'), nullable=False)
    billing_id = Column(Integer, ForeignKey('billing.id'), nullable=True)
    amount_claimed = Column(DECIMAL(10,2), nullable=False)
    approved_amount = Column(DECIMAL(10,2), nullable=True)
    status = Column(Enum('draft', 'submitted', 'under_review', 'approved', 'partially_approved', 'rejected', 'settled', 'cancelled'), default='draft')
    officer_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class InsuranceClaimItem(Base):
    __tablename__ = 'insurance_claim_items'
    __table_args__ = (CheckConstraint('amount > 0', name='ck_insurance_claim_item_amount_positive'),)
    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey('insurance_claims.id', ondelete='CASCADE'), nullable=False)
    description = Column(Text)
    amount = Column(DECIMAL(10,2), nullable=False)

class InsuranceDocument(Base):
    __tablename__ = 'insurance_documents'
    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey('insurance_claims.id', ondelete='CASCADE'), nullable=False)
    document_reference = Column(String(255), nullable=False)
    uploaded_at = Column(TIMESTAMP, server_default=func.now())

class InsurancePayment(Base):
    __tablename__ = 'insurance_payments'
    __table_args__ = (
        CheckConstraint('amount_paid > 0', name='ck_insurance_payment_amount_positive'),
        UniqueConstraint('transaction_reference', name='uq_insurance_payment_reference'),
    )
    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey('insurance_claims.id'), nullable=False)
    amount_paid = Column(DECIMAL(10,2), nullable=False)
    payment_date = Column(Date, nullable=False)
    transaction_reference = Column(String(150))
    recorded_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

class Ambulance(Base):
    __tablename__ = 'ambulances'
    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String(50), nullable=False, unique=True)
    vehicle_type = Column(String(100))
    status = Column(Enum('available', 'dispatched', 'on_route', 'arrived', 'transporting', 'completed', 'maintenance', 'unavailable'), default='available')
    capacity = Column(Integer)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class AmbulanceStaffAssignment(Base):
    __tablename__ = 'ambulance_staff_assignments'
    __table_args__ = (UniqueConstraint('ambulance_id', 'staff_id', name='uq_ambulance_staff_assignment'),)
    id = Column(Integer, primary_key=True, index=True)
    ambulance_id = Column(Integer, ForeignKey('ambulances.id'), nullable=False)
    staff_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    status = Column(Enum('active', 'inactive'), default='active')
    assigned_at = Column(TIMESTAMP, server_default=func.now())

class AmbulanceRequest(Base):
    __tablename__ = 'ambulance_requests'
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=True)
    requester_name = Column(String(150))
    requester_contact = Column(String(50))
    pickup_location = Column(Text, nullable=False)
    priority = Column(Enum('low', 'medium', 'high', 'critical'), default='high')
    status = Column(Enum('requested', 'approved', 'dispatched', 'accepted', 'pickup', 'transporting', 'arrived', 'completed', 'cancelled'), default='requested')
    requested_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class AmbulanceTrip(Base):
    __tablename__ = 'ambulance_trips'
    __table_args__ = (UniqueConstraint('request_id', name='uq_ambulance_trip_request'),)
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey('ambulance_requests.id'), nullable=False)
    ambulance_id = Column(Integer, ForeignKey('ambulances.id'), nullable=False)
    status = Column(Enum('dispatched', 'accepted', 'on_route', 'pickup', 'transporting', 'arrived', 'completed', 'cancelled'), default='dispatched')
    start_time = Column(TIMESTAMP, nullable=True)
    pickup_time = Column(TIMESTAMP, nullable=True)
    arrival_time = Column(TIMESTAMP, nullable=True)
    end_time = Column(TIMESTAMP, nullable=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class AmbulanceStatusHistory(Base):
    __tablename__ = 'ambulance_status_history'
    id = Column(Integer, primary_key=True, index=True)
    ambulance_id = Column(Integer, ForeignKey('ambulances.id'), nullable=False)
    status = Column(String(50), nullable=False)
    recorded_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    recorded_at = Column(TIMESTAMP, server_default=func.now())

# Notification Infrastructure
class NotificationProvider(Base):
    __tablename__ = 'notification_providers'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    channel = Column(Enum('email','sms','whatsapp','in_app'), nullable=False)
    config = Column(JSON, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class NotificationPreference(Base):
    __tablename__ = 'notification_preferences'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    email_enabled = Column(Boolean, default=True)
    sms_enabled = Column(Boolean, default=False)
    whatsapp_enabled = Column(Boolean, default=False)
    in_app_enabled = Column(Boolean, default=True)
    appointment_reminder = Column(Boolean, default=True)
    prescription_ready = Column(Boolean, default=True)
    lab_result_ready = Column(Boolean, default=True)
    radiology_report_ready = Column(Boolean, default=True)
    payment_receipt = Column(Boolean, default=True)
    insurance_status = Column(Boolean, default=True)
    emergency_dispatch = Column(Boolean, default=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class Notification(Base):
    __tablename__ = 'notifications'
    __table_args__ = (
        Index('idx_notifications_user_status', 'user_id', 'status'),
        Index('idx_notifications_celery', 'celery_task_id'),
        UniqueConstraint('idempotency_key', name='uq_notifications_idempotency_key'),
    )
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    type = Column(String(100), nullable=False)
    channel = Column(Enum('email','sms','whatsapp','in_app'), nullable=False)
    subject = Column(String(255), nullable=True)
    body = Column(Text, nullable=False)
    status = Column(Enum('pending','sent','failed','read'), default='pending')
    retry_count = Column(Integer, default=0)
    celery_task_id = Column(String(255), nullable=True)
    entity_type = Column(String(100), nullable=True)
    entity_id = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    idempotency_key = Column(String(191), nullable=True)
    sent_at = Column(TIMESTAMP, nullable=True)
    read_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
