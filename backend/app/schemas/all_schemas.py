from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator
from typing import Dict, Literal, Optional, List
from datetime import date, time, datetime
from decimal import Decimal
from enum import Enum
from app.core.roles import UserRole
from app.core.permissions import Permission
from app.core.security import validate_password_strength

RoleEnum = UserRole

class GenderEnum(str, Enum):
    male = 'male'
    female = 'female'
    other = 'other'

class DoctorStatusEnum(str, Enum):
    active = 'active'
    on_leave = 'on_leave'

class ApptStatusEnum(str, Enum):
    requested = 'requested'
    confirmed = 'confirmed'
    checked_in = 'checked_in'
    in_progress = 'in_progress'
    completed = 'completed'
    cancelled = 'cancelled'

class BillingStatusEnum(str, Enum):
    pending = 'pending'
    paid = 'paid'

class PaymentMethodEnum(str, Enum):
    cash = 'cash'
    card = 'card'
    upi = 'upi'

# User Schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: RoleEnum

class UserCreate(UserBase):
    password: str

    _validate_password = field_validator('password')(validate_password_strength)

class UserResponse(UserBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class UserRoleUpdate(BaseModel):
    role: RoleEnum


class StaffAccountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str
    role: RoleEnum
    specialization: Optional[str] = Field(default=None, max_length=100)
    consultation_fee: Optional[Decimal] = Field(default=None, gt=0, decimal_places=2)
    contact: Optional[str] = Field(default=None, max_length=20)
    timing_start: Optional[time] = None
    timing_end: Optional[time] = None
    designation: Optional[str] = Field(default=None, max_length=100)
    joining_date: Optional[date] = None
    shift_start: Optional[time] = None
    shift_end: Optional[time] = None

    _validate_password = field_validator('password')(validate_password_strength)

    @field_validator('name')
    @classmethod
    def normalize_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError('Name is required')
        return normalized

    @model_validator(mode='after')
    def validate_role_profile(self):
        allowed_roles = {
            UserRole.hospital_manager,
            UserRole.doctor,
            UserRole.receptionist,
            UserRole.nurse,
            UserRole.pharmacist,
            UserRole.lab_technician,
            UserRole.radiologist,
            UserRole.accountant,
            UserRole.insurance_officer,
            UserRole.ambulance_staff,
        }
        if self.role not in allowed_roles:
            raise ValueError('Only non-administrator staff roles can be created here')
        if self.role == UserRole.doctor:
            if not self.specialization or self.consultation_fee is None:
                raise ValueError('Doctors require specialization and consultation_fee')
        if self.role == UserRole.receptionist and not self.designation:
            raise ValueError('Receptionists require a designation')
        if (self.timing_start is None) != (self.timing_end is None):
            raise ValueError('Both doctor timing fields must be supplied together')
        if self.timing_start and self.timing_end and self.timing_start >= self.timing_end:
            raise ValueError('Doctor timing_start must be before timing_end')
        if (self.shift_start is None) != (self.shift_end is None):
            raise ValueError('Both staff shift fields must be supplied together')
        if self.shift_start and self.shift_end and self.shift_start == self.shift_end:
            raise ValueError('Staff shift start and end times must be different')
        return self


class StaffAccountResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: RoleEnum
    is_active: bool
    profile_id: Optional[int] = None
    created_at: datetime


class StaffAccountDetail(StaffAccountResponse):
    is_email_verified: bool
    email_verified_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    profile: Optional[Dict[str, object]] = None


class StaffRoleUpdate(BaseModel):
    role: RoleEnum
    specialization: Optional[str] = Field(default=None, max_length=100)
    consultation_fee: Optional[Decimal] = Field(default=None, gt=0, decimal_places=2)
    contact: Optional[str] = Field(default=None, max_length=20)
    timing_start: Optional[time] = None
    timing_end: Optional[time] = None
    designation: Optional[str] = Field(default=None, max_length=100)
    joining_date: Optional[date] = None
    shift_start: Optional[time] = None
    shift_end: Optional[time] = None

    @model_validator(mode='after')
    def validate_staff_role(self):
        disallowed_roles = {UserRole.patient, UserRole.admin, UserRole.super_admin}
        if self.role in disallowed_roles:
            raise ValueError('Only staff roles can be assigned by a Hospital Admin')
        if (self.timing_start is None) != (self.timing_end is None):
            raise ValueError('Both doctor timing fields must be supplied together')
        if self.timing_start and self.timing_end and self.timing_start >= self.timing_end:
            raise ValueError('Doctor timing_start must be before timing_end')
        if (self.shift_start is None) != (self.shift_end is None):
            raise ValueError('Both staff shift fields must be supplied together')
        if self.shift_start and self.shift_end and self.shift_start == self.shift_end:
            raise ValueError('Staff shift start and end times must be different')
        return self


class StaffShiftUpdate(BaseModel):
    shift_start: time
    shift_end: time

    @model_validator(mode='after')
    def validate_shift(self):
        if self.shift_start == self.shift_end:
            raise ValueError('Shift start and end times must be different')
        return self


class AdminPasswordReset(BaseModel):
    new_password: str

    _validate_password = field_validator('new_password')(validate_password_strength)

class EffectivePermissionsResponse(BaseModel):
    role: RoleEnum
    permissions: List[str]

# Patient Schemas
class PatientBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    age: Optional[int] = Field(default=None, ge=0, le=130)
    gender: Optional[GenderEnum] = None
    contact: Optional[str] = Field(default=None, max_length=20)
    address: Optional[str] = Field(default=None, max_length=1000)
    blood_group: Optional[str] = Field(default=None, max_length=5)

class PatientCreate(PatientBase):
    user_id: Optional[int] = None

class PatientRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    contact: str
    gender: Optional[GenderEnum] = None
    age: Optional[int] = None
    blood_group: Optional[str] = None

    _validate_password = field_validator('password')(validate_password_strength)

class PatientResponse(PatientBase):
    id: int
    user_id: Optional[int]
    model_config = ConfigDict(from_attributes=True)

# Doctor Schemas
class DoctorBase(BaseModel):
    name: str
    specialization: Optional[str] = None
    department_id: Optional[int] = None
    consultation_fee: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)
    timing_start: Optional[time] = None
    timing_end: Optional[time] = None
    contact: Optional[str] = None
    status: Optional[DoctorStatusEnum] = DoctorStatusEnum.active

class DoctorCreate(DoctorBase):
    user_id: Optional[int] = None
    email: Optional[EmailStr] = None

class DoctorSelfUpdate(BaseModel):
    name: str
    specialization: Optional[str] = None
    timing_start: Optional[time] = None
    timing_end: Optional[time] = None
    contact: Optional[str] = None

class DoctorCreateWithAuth(DoctorBase):
    email: EmailStr
    password: str
    consultation_fee: Decimal = Field(gt=0, decimal_places=2)

    _validate_password = field_validator('password')(validate_password_strength)

class DoctorPasswordReset(BaseModel):
    new_password: str

    _validate_password = field_validator('new_password')(validate_password_strength)

class DoctorResponse(DoctorBase):
    id: int
    user_id: Optional[int]
    email: Optional[EmailStr] = None
    model_config = ConfigDict(from_attributes=True)

class EmployeeStatusEnum(str, Enum):
    active = 'active'
    inactive = 'inactive'

# Employee Schemas
class EmployeePermissionBase(BaseModel):
    can_register_patient: bool = True
    can_schedule_appointment: bool = True
    can_checkin_patient: bool = True
    can_collect_billing: bool = True

class EmployeePermissionUpdate(EmployeePermissionBase):
    pass

class EmployeePermissionResponse(EmployeePermissionBase):
    id: int
    employee_id: int
    model_config = ConfigDict(from_attributes=True)

class EmployeeBase(BaseModel):
    designation: str
    contact: Optional[str] = Field(default=None, max_length=20)
    joining_date: Optional[date] = None
    shift_start: Optional[time] = None
    shift_end: Optional[time] = None
    status: Optional[EmployeeStatusEnum] = EmployeeStatusEnum.active

class EmployeeCreate(EmployeeBase):
    name: str
    email: EmailStr
    password: str

    _validate_password = field_validator('password')(validate_password_strength)

class EmployeeUpdate(BaseModel):
    designation: Optional[str] = None
    contact: Optional[str] = Field(default=None, max_length=20)
    shift_start: Optional[time] = None
    shift_end: Optional[time] = None
    status: Optional[EmployeeStatusEnum] = None

class EmployeeResponse(EmployeeBase):
    id: int
    user_id: int
    added_by: Optional[int] = None
    created_at: datetime
    permissions: Optional[EmployeePermissionResponse] = None
    
    # Nested user data for convenience if needed
    name: Optional[str] = None
    email: Optional[EmailStr] = None

    model_config = ConfigDict(from_attributes=True)

# Appointment Schemas
class AppointmentBase(BaseModel):
    patient_id: int = Field(gt=0)
    doctor_id: int = Field(gt=0)
    appt_date: date
    appt_time: time
    reason: Optional[str] = Field(default=None, max_length=255)
    status: Optional[ApptStatusEnum] = ApptStatusEnum.requested

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentResponse(AppointmentBase):
    id: int
    checked_in_at: Optional[datetime] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Prescription Schemas
class PrescriptionBase(BaseModel):
    appointment_id: int
    diagnosis: Optional[str] = None
    medicine: Optional[str] = None
    dosage: Optional[str] = None
    notes: Optional[str] = None

class PrescriptionCreate(PrescriptionBase):
    appointment_id: int = Field(gt=0)
    diagnosis: str = Field(min_length=1, max_length=4000)
    medicine: str = Field(min_length=1, max_length=150)
    dosage: str = Field(min_length=1, max_length=2000)
    notes: Optional[str] = Field(default=None, max_length=8000)

class PrescriptionResponse(PrescriptionBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Billing Schemas
class BillingBase(BaseModel):
    patient_id: int
    appointment_id: int
    amount: Decimal
    status: Optional[BillingStatusEnum] = BillingStatusEnum.pending
    payment_method: Optional[PaymentMethodEnum] = None
    collected_by: Optional[int] = None
    receipt_no: Optional[str] = None

class BillingCreate(BillingBase):
    pass

class BillingResponse(BillingBase):
    id: int
    paid_at: Optional[datetime] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Hospital Setting Schemas
class HospitalSettingBase(BaseModel):
    hospital_name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    gstin: Optional[str] = None

class HospitalSettingCreate(HospitalSettingBase):
    pass

class HospitalSettingResponse(HospitalSettingBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# Audit Schemas
class AuditLogResponse(BaseModel):
    id: int
    actor_user_id: Optional[int] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    old_values: Optional[dict] = None
    new_values: Optional[dict] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Super Admin Feature Schemas
class SystemSettingBase(BaseModel):
    setting_key: str
    setting_value: Optional[str] = None
    description: Optional[str] = None

class SystemSettingCreate(SystemSettingBase):
    pass

class SystemSettingUpdate(BaseModel):
    setting_value: Optional[str] = None
    description: Optional[str] = None

class SystemSettingResponse(SystemSettingBase):
    id: int
    updated_at: datetime
    updated_by: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

class RolePermissionBase(BaseModel):
    role: UserRole
    permission: Permission
    description: Optional[str] = None

class RolePermissionCreate(RolePermissionBase):
    pass

class RolePermissionResponse(RolePermissionBase):
    id: int
    created_at: datetime
    created_by: int
    model_config = ConfigDict(from_attributes=True)

class FeatureFlagBase(BaseModel):
    feature_name: str
    is_enabled: bool = False
    description: Optional[str] = None

class FeatureFlagCreate(FeatureFlagBase):
    pass

class FeatureFlagUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    description: Optional[str] = None

class FeatureFlagResponse(FeatureFlagBase):
    id: int
    updated_at: datetime
    updated_by: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

class OrganizationBase(BaseModel):
    name: str
    address: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    is_active: bool = True

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    is_active: Optional[bool] = None

class OrganizationResponse(OrganizationBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Hospital Manager Feature Schemas
class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: Literal['active', 'inactive'] = 'active'

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[Literal['active', 'inactive']] = None

class DepartmentResponse(DepartmentBase):
    department_id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ManagerDepartmentSummary(BaseModel):
    department_id: int
    name: str
    active_doctors: int
    today_appointments: int


class ManagerOverview(BaseModel):
    today_appointments: int
    total_appointments: int
    total_patients: int
    active_doctors: int
    active_staff: int
    completed_consultations: int
    total_completed_consultations: int
    pending_appointments: int
    operational_alerts: List[str]
    patient_flow: Dict[str, int]
    department_summary: List[ManagerDepartmentSummary]


class ManagerAppointment(BaseModel):
    id: int
    patient_id: int
    patient_name: str
    doctor_id: int
    doctor_name: str
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    appt_date: date
    appt_time: time
    reason: Optional[str] = None
    status: ApptStatusEnum
    checked_in_at: Optional[datetime] = None


class ManagerPatient(BaseModel):
    id: int
    name: str
    age: Optional[int] = None
    gender: Optional[GenderEnum] = None
    contact: Optional[str] = None
    created_at: datetime
    appointment_count: int
    last_appointment_date: Optional[date] = None
    next_appointment_date: Optional[date] = None


class ManagerDoctor(BaseModel):
    id: int
    name: str
    specialization: Optional[str] = None
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    timing_start: Optional[time] = None
    timing_end: Optional[time] = None
    status: DoctorStatusEnum
    availability: str
    appointments_today: int
    appointments_pending: int
    appointments_completed: int


class ManagerStaff(BaseModel):
    id: int
    name: str
    role: RoleEnum
    designation: Optional[str] = None
    department_name: Optional[str] = None
    shift_start: Optional[time] = None
    shift_end: Optional[time] = None
    status: str
    availability: str


class ManagerBill(BaseModel):
    id: int
    appointment_id: int
    patient_id: int
    patient_name: str
    amount: Decimal
    status: Literal['pending', 'paid']
    payment_method: Optional[PaymentMethodEnum] = None
    paid_at: Optional[datetime] = None


class DailyReport(BaseModel):
    date: date
    patient_count: int
    appointment_count: int
    completed_consultations: int
    cancelled_appointments: int
    pending_bills: int
    paid_bills: int
    revenue_summary: Decimal
    total_appointment_count: int
    total_completed_consultations: int
    total_paid_bills: int
    total_revenue_summary: Decimal

class DepartmentStats(BaseModel):
    department_id: int
    name: str
    doctor_count: int
    appointment_count: int

class DoctorWorkload(BaseModel):
    doctor_id: int
    name: str
    appointments_completed: int
    appointments_pending: int

# Nurse Feature Schemas
class PatientVitalBase(BaseModel):
    patient_id: int
    appointment_id: Optional[int] = None
    temperature: Optional[Decimal] = Field(default=None, ge=25, le=50)
    blood_pressure_systolic: Optional[int] = Field(default=None, ge=40, le=300)
    blood_pressure_diastolic: Optional[int] = Field(default=None, ge=20, le=200)
    pulse: Optional[int] = Field(default=None, ge=20, le=300)
    respiratory_rate: Optional[int] = Field(default=None, ge=4, le=100)
    oxygen_saturation: Optional[Decimal] = Field(default=None, ge=0, le=100)
    weight: Optional[Decimal] = Field(default=None, gt=0, le=1000)
    height: Optional[Decimal] = Field(default=None, gt=0, le=300)
    notes: Optional[str] = None

class PatientVitalCreate(PatientVitalBase):
    @model_validator(mode='after')
    def require_observation(self):
        observation_fields = (
            self.temperature,
            self.blood_pressure_systolic,
            self.blood_pressure_diastolic,
            self.pulse,
            self.respiratory_rate,
            self.oxygen_saturation,
            self.weight,
            self.height,
            self.notes,
        )
        if not any(value is not None and value != '' for value in observation_fields):
            raise ValueError('At least one vital measurement or observation is required')
        return self

class PatientVitalResponse(PatientVitalBase):
    id: int
    recorded_by: int
    recorded_at: datetime
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class NursingNoteBase(BaseModel):
    patient_id: int
    appointment_id: Optional[int] = None
    note: str = Field(min_length=1, max_length=4000)

class NursingNoteCreate(NursingNoteBase):
    pass

class NursingNoteResponse(NursingNoteBase):
    id: int
    nurse_id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class NursingTaskBase(BaseModel):
    patient_id: int
    assigned_nurse_id: Optional[int] = None
    task_type: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=4000)
    priority: Literal['low', 'medium', 'high', 'emergency'] = 'medium'
    status: Literal['pending', 'in_progress', 'completed', 'cancelled'] = 'pending'
    due_at: Optional[datetime] = None

class NursingTaskCreate(NursingTaskBase):
    assigned_nurse_id: int
    status: Literal['pending'] = 'pending'

class NursingTaskUpdate(BaseModel):
    status: Literal['in_progress', 'completed']

class NursingTaskResponse(NursingTaskBase):
    id: int
    created_by_doctor_id: Optional[int] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class NurseAssignmentOption(BaseModel):
    id: int
    name: str

# Pharmacy Feature Schemas
class MedicineCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class MedicineCategoryCreate(MedicineCategoryBase):
    pass

class MedicineCategoryResponse(MedicineCategoryBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class SupplierBase(BaseModel):
    name: str
    contact_person: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierResponse(SupplierBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class MedicineBase(BaseModel):
    name: str
    sku: Optional[str] = Field(default=None, min_length=1, max_length=100)
    generic_name: Optional[str] = None
    category_id: int
    unit: Optional[str] = None
    description: Optional[str] = None
    status: Literal['active', 'inactive'] = 'active'

class MedicineCreate(MedicineBase):
    pass

class MedicineResponse(MedicineBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class MedicineBatchBase(BaseModel):
    medicine_id: int
    supplier_id: Optional[int] = None
    batch_number: str
    expiry_date: date
    purchase_price: Decimal = Field(ge=0, decimal_places=2)
    selling_price: Decimal = Field(ge=0, decimal_places=2)
    quantity: int = Field(gt=0)
    available_quantity: int = Field(ge=0)

    @model_validator(mode='after')
    def validate_available_quantity(self):
        if self.available_quantity > self.quantity:
            raise ValueError('available_quantity cannot exceed quantity')
        return self

class MedicineBatchCreate(MedicineBatchBase):
    pass

class MedicineBatchResponse(MedicineBatchBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class DispenseItemRequest(BaseModel):
    medicine_id: int
    batch_id: int
    quantity: int = Field(gt=0)

class DispenseRequest(BaseModel):
    prescription_id: int
    items: List[DispenseItemRequest] = Field(min_length=1, max_length=1)

    @model_validator(mode='after')
    def validate_unique_batches(self):
        batch_ids = [item.batch_id for item in self.items]
        if len(batch_ids) != len(set(batch_ids)):
            raise ValueError('Each medicine batch may appear only once')
        return self


class PharmacyPrescriptionAction(BaseModel):
    action: Literal['verify', 'reject', 'mark_for_dispensing']
    reason: Optional[str] = Field(default=None, max_length=1000)

    @model_validator(mode='after')
    def require_rejection_reason(self):
        if self.action == 'reject' and not (self.reason or '').strip():
            raise ValueError('A rejection reason is required')
        return self


class InventoryAdjustmentRequest(BaseModel):
    action: Literal['add_stock', 'update_stock', 'expired', 'damaged']
    quantity: int = Field(gt=0)
    reason: Optional[str] = Field(default=None, max_length=255)


class InventoryBatchCreate(BaseModel):
    medicine_id: int = Field(gt=0)
    supplier_id: Optional[int] = Field(default=None, gt=0)
    batch_number: str = Field(min_length=1, max_length=100)
    expiry_date: date
    quantity: int = Field(gt=0)
    purchase_price: Decimal = Field(ge=0, decimal_places=2)
    selling_price: Decimal = Field(ge=0, decimal_places=2)

class DispensingItemResponse(BaseModel):
    id: int
    medicine_id: int
    batch_id: int
    quantity: int
    selling_price: Decimal
    total_price: Decimal
    model_config = ConfigDict(from_attributes=True)

class DispensingResponse(BaseModel):
    id: int
    prescription_id: int
    patient_id: int
    total_amount: Decimal
    status: Literal['completed', 'voided']
    dispensed_at: datetime
    dispensed_by: int
    # omitting items for simplicity, or we can include them if needed
    model_config = ConfigDict(from_attributes=True)


class PurchaseItemCreate(BaseModel):
    medicine_id: int
    batch_number: str = Field(min_length=1, max_length=100)
    expiry_date: date
    quantity: int = Field(gt=0)
    purchase_price: Decimal = Field(ge=0, decimal_places=2)
    selling_price: Decimal = Field(ge=0, decimal_places=2)


class PurchaseCreate(BaseModel):
    supplier_id: int
    purchase_date: date
    items: List[PurchaseItemCreate] = Field(min_length=1)


class PurchaseResponse(BaseModel):
    id: int
    supplier_id: int
    purchase_date: date
    total_amount: Decimal
    status: Literal['pending', 'received', 'cancelled']
    created_by: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Laboratory Feature Schemas
class LabTestCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None


class LabTestCategoryCreate(LabTestCategoryBase):
    pass

class LabTestCategoryResponse(LabTestCategoryBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class LabTestBase(BaseModel):
    category_id: int
    name: str
    code: str
    description: Optional[str] = None
    price: Decimal = Field(ge=0, decimal_places=2)
    status: Literal['active', 'inactive'] = 'active'


class LabTestCreate(LabTestBase):
    pass

class LabTestResponse(LabTestBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class LabOrderBase(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_id: Optional[int] = None
    assigned_technician_id: Optional[int] = None
    instructions: Optional[str] = None
    priority: Literal['routine', 'urgent', 'stat'] = 'routine'
    status: Literal['ordered', 'sample_collected', 'processing', 'completed', 'cancelled'] = 'ordered'

class LabOrderResponse(LabOrderBase):
    id: int
    ordered_at: datetime
    model_config = ConfigDict(from_attributes=True)


class LabOrderCreate(BaseModel):
    patient_id: int
    appointment_id: Optional[int] = None
    instructions: Optional[str] = Field(default=None, max_length=2000)
    priority: Literal['routine', 'urgent', 'stat'] = 'routine'
    test_ids: List[int] = Field(min_length=1)

    @field_validator('test_ids')
    @classmethod
    def unique_test_ids(cls, value: List[int]) -> List[int]:
        if len(value) != len(set(value)):
            raise ValueError('test_ids must be unique')
        return value

class LabOrderItemBase(BaseModel):
    order_id: int
    test_id: int
    status: Literal['ordered', 'sample_collected', 'processing', 'completed', 'cancelled'] = 'ordered'

class LabOrderItemResponse(LabOrderItemBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class LabSampleBase(BaseModel):
    order_item_id: int
    sample_type: Optional[str] = None
    barcode: str
    status: Literal['collected', 'processing', 'rejected', 'completed'] = 'collected'

class LabSampleCreate(LabSampleBase):
    pass

class LabSampleResponse(LabSampleBase):
    id: int
    collected_by: int
    collected_at: datetime
    model_config = ConfigDict(from_attributes=True)

class LabResultBase(BaseModel):
    order_item_id: int
    result_value: Optional[str] = None
    numeric_value: Optional[Decimal] = None
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    remarks: Optional[str] = None
    status: Literal['draft', 'finalized'] = 'draft'

class LabResultCreate(LabResultBase):
    pass

class LabResultUpdate(BaseModel):
    result_value: Optional[str] = None
    numeric_value: Optional[Decimal] = None
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    remarks: Optional[str] = None

class LabResultResponse(LabResultBase):
    id: int
    technician_id: int
    finalized_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# Radiology Feature Schemas
class RadiologyModalityBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: Literal['active', 'inactive'] = 'active'


class RadiologyModalityCreate(RadiologyModalityBase):
    pass

class RadiologyModalityResponse(RadiologyModalityBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class RadiologyOrderBase(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_id: Optional[int] = None
    assigned_radiologist_id: Optional[int] = None
    modality_id: int
    body_part: Optional[str] = None
    clinical_notes: Optional[str] = None
    priority: Literal['routine', 'urgent', 'stat'] = 'routine'
    status: Literal['ordered', 'scheduled', 'performed', 'reviewing', 'reporting', 'completed', 'cancelled'] = 'ordered'

class RadiologyOrderResponse(RadiologyOrderBase):
    id: int
    ordered_at: datetime
    model_config = ConfigDict(from_attributes=True)


class RadiologyOrderCreate(BaseModel):
    patient_id: int
    appointment_id: Optional[int] = None
    modality_id: int
    body_part: str = Field(min_length=1, max_length=150)
    clinical_notes: Optional[str] = None
    priority: Literal['routine', 'urgent', 'stat'] = 'routine'

class RadiologyStudyBase(BaseModel):
    order_id: int
    study_identifier: str
    storage_reference: Optional[str] = None
    technician_id: Optional[int] = None


class RadiologyStudyCreate(BaseModel):
    order_id: int
    study_identifier: str = Field(min_length=1, max_length=150)
    storage_reference: Optional[str] = Field(default=None, max_length=255)

class RadiologyStudyResponse(RadiologyStudyBase):
    id: int
    performed_at: datetime
    model_config = ConfigDict(from_attributes=True)

class RadiologyReportBase(BaseModel):
    study_id: int
    findings: Optional[str] = None
    impression: Optional[str] = None
    recommendations: Optional[str] = None
    radiologist_notes: Optional[str] = None
    amendment_reason: Optional[str] = None
    status: Literal['draft', 'finalized'] = 'draft'
    version: Optional[int] = 1
    parent_report_id: Optional[int] = None

class RadiologyReportCreate(BaseModel):
    study_id: int
    findings: Optional[str] = None
    impression: Optional[str] = None
    recommendations: Optional[str] = None
    radiologist_notes: Optional[str] = None

class RadiologyReportUpdate(BaseModel):
    findings: Optional[str] = None
    impression: Optional[str] = None
    recommendations: Optional[str] = None
    radiologist_notes: Optional[str] = None


class RadiologyAmendmentCreate(RadiologyReportUpdate):
    amendment_reason: str = Field(min_length=3, max_length=2000)

class RadiologyReportResponse(RadiologyReportBase):
    id: int
    radiologist_id: int
    created_at: datetime
    updated_at: datetime
    finalized_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# Accountant / Financial Feature Schemas
class ExpenseCategoryBase(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: Optional[str] = Field(default=None, max_length=1000)

class ExpenseCategoryCreate(ExpenseCategoryBase):
    pass

class ExpenseCategoryResponse(ExpenseCategoryBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class ExpenseBase(BaseModel):
    category_id: int
    amount: Decimal = Field(gt=0, decimal_places=2)
    description: Optional[str] = Field(default=None, max_length=2000)
    supporting_reference: Optional[str] = Field(default=None, max_length=255)
    incurred_date: date
    idempotency_key: str = Field(min_length=8, max_length=191)

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseResponse(ExpenseBase):
    id: int
    recorded_by: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class FinancialTransactionBase(BaseModel):
    transaction_type: Literal['payment', 'refund', 'expense']
    amount: Decimal
    reference_id: Optional[int] = None
    reference_type: Optional[str] = None
    payment_method: Optional[str] = None

class FinancialTransactionResponse(FinancialTransactionBase):
    id: int
    transaction_date: datetime
    recorded_by: int
    model_config = ConfigDict(from_attributes=True)

class RefundBase(BaseModel):
    transaction_id: int
    amount: Decimal = Field(gt=0, decimal_places=2)
    reason: Optional[str] = None
    idempotency_key: str = Field(min_length=8, max_length=191)

class RefundCreate(RefundBase):
    pass

class RefundResponse(RefundBase):
    id: int
    processed_by: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class DailyClosingBase(BaseModel):
    closing_date: date
    total_revenue: Decimal
    total_expenses: Decimal
    total_refunds: Decimal
    net_amount: Decimal

class DailyClosingResponse(DailyClosingBase):
    id: int
    closed_by: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AccountantPaymentCreate(BaseModel):
    payment_method: PaymentMethodEnum

# Insurance Feature Schemas
class InsuranceProviderBase(BaseModel):
    name: str
    contact_info: Optional[str] = None
    status: Literal['active', 'inactive'] = 'active'


class InsuranceProviderCreate(InsuranceProviderBase):
    pass

class InsuranceProviderResponse(InsuranceProviderBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class InsurancePolicyBase(BaseModel):
    patient_id: int
    provider_id: int
    policy_number: str
    coverage_start: date
    coverage_end: date
    coverage_limit: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)
    status: Literal['active', 'expired', 'suspended'] = 'active'

    @model_validator(mode='after')
    def validate_coverage_dates(self):
        if self.coverage_end < self.coverage_start:
            raise ValueError('coverage_end cannot precede coverage_start')
        return self

class InsurancePolicyResponse(InsurancePolicyBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class InsurancePolicyCreate(InsurancePolicyBase):
    pass

class InsuranceClaimBase(BaseModel):
    policy_id: int
    billing_id: Optional[int] = None
    amount_claimed: Decimal = Field(gt=0, decimal_places=2)

class InsuranceClaimCreate(InsuranceClaimBase):
    billing_id: int

class InsuranceClaimStatusUpdate(BaseModel):
    status: Literal['draft', 'submitted', 'under_review', 'approved', 'rejected', 'settled']
    approved_amount: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)

class InsuranceDocumentRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=2000)

class InsuranceClaimDecision(BaseModel):
    decision: Literal['approved', 'rejected']
    reason: str = Field(min_length=3, max_length=2000)
    approved_amount: Optional[Decimal] = Field(default=None, gt=0, decimal_places=2)

class InsuranceSettlementCreate(BaseModel):
    amount_paid: Decimal = Field(gt=0, decimal_places=2)
    payment_date: date
    transaction_reference: str = Field(min_length=4, max_length=150)
    reason: str = Field(min_length=3, max_length=2000)

class InsuranceClaimResponse(InsuranceClaimBase):
    id: int
    status: str
    approved_amount: Optional[Decimal] = None
    officer_id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class InsuranceClaimItemBase(BaseModel):
    claim_id: int
    description: Optional[str] = None
    amount: Decimal = Field(gt=0, decimal_places=2)

class InsuranceClaimItemResponse(InsuranceClaimItemBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class InsuranceDocumentBase(BaseModel):
    claim_id: int
    document_reference: str


class InsuranceDocumentCreate(InsuranceDocumentBase):
    pass

class InsuranceDocumentResponse(InsuranceDocumentBase):
    id: int
    uploaded_at: datetime
    model_config = ConfigDict(from_attributes=True)

class InsurancePaymentBase(BaseModel):
    claim_id: int
    amount_paid: Decimal = Field(gt=0, decimal_places=2)
    payment_date: date
    transaction_reference: str = Field(min_length=4, max_length=150)

class InsurancePaymentCreate(InsurancePaymentBase):
    pass

class InsurancePaymentResponse(InsurancePaymentBase):
    id: int
    recorded_by: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Ambulance Feature Schemas
class AmbulanceBase(BaseModel):
    vehicle_number: str = Field(min_length=1, max_length=50)
    vehicle_type: Optional[str] = Field(default=None, max_length=100)
    status: Literal['available', 'assigned', 'en_route', 'arrived', 'transporting', 'maintenance', 'unavailable'] = 'available'
    capacity: Optional[int] = Field(default=None, gt=0)

class AmbulanceResponse(AmbulanceBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AmbulanceCreate(AmbulanceBase):
    status: Literal['available', 'maintenance', 'unavailable'] = 'available'


class AmbulanceAvailabilityUpdate(BaseModel):
    status: Literal['available', 'maintenance', 'unavailable']

class AmbulanceRequestBase(BaseModel):
    patient_id: Optional[int] = None
    requester_name: Optional[str] = Field(default=None, max_length=150)
    requester_contact: Optional[str] = Field(default=None, max_length=50)
    pickup_location: str = Field(min_length=3, max_length=2000)
    destination: str = Field(min_length=3, max_length=2000)
    priority: Literal['low', 'medium', 'high', 'critical'] = 'high'

class AmbulanceRequestCreate(AmbulanceRequestBase):
    pass

class AmbulanceRequestResponse(AmbulanceRequestBase):
    id: int
    status: str
    requested_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AmbulanceTripBase(BaseModel):
    request_id: int
    ambulance_id: int

class AmbulanceTripResponse(AmbulanceTripBase):
    id: int
    staff_id: int
    status: str
    accepted_at: datetime
    start_time: Optional[datetime]
    pickup_time: Optional[datetime]
    arrival_time: Optional[datetime]
    end_time: Optional[datetime]
    model_config = ConfigDict(from_attributes=True)

class AmbulanceTripStatusUpdate(BaseModel):
    status: Literal['en_route', 'arrived', 'transporting', 'completed']


class AmbulanceDispatchCreate(BaseModel):
    request_id: int
    ambulance_id: int
    staff_id: Optional[int] = None


class AmbulanceAcceptAssignment(BaseModel):
    ambulance_id: int


class NotificationPreferenceUpdate(BaseModel):
    email_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    whatsapp_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None
    appointment_reminder: Optional[bool] = None
    prescription_ready: Optional[bool] = None
    lab_result_ready: Optional[bool] = None
    radiology_report_ready: Optional[bool] = None
    payment_receipt: Optional[bool] = None
    insurance_status: Optional[bool] = None
    emergency_dispatch: Optional[bool] = None
