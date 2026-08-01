from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date, time, datetime
from decimal import Decimal
from enum import Enum

class RoleEnum(str, Enum):
    patient = 'patient'
    doctor = 'doctor'
    receptionist = 'receptionist'
    admin = 'admin'

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

class UserResponse(UserBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

# Patient Schemas
class PatientBase(BaseModel):
    name: str
    age: Optional[int] = None
    gender: Optional[GenderEnum] = None
    contact: Optional[str] = None
    address: Optional[str] = None
    blood_group: Optional[str] = None

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

class PatientResponse(PatientBase):
    id: int
    user_id: Optional[int]
    class Config:
        from_attributes = True

# Doctor Schemas
class DoctorBase(BaseModel):
    name: str
    specialization: Optional[str] = None
    timing_start: Optional[time] = None
    timing_end: Optional[time] = None
    contact: Optional[str] = None
    status: Optional[DoctorStatusEnum] = DoctorStatusEnum.active

class DoctorCreate(DoctorBase):
    user_id: Optional[int] = None
    email: Optional[EmailStr] = None

class DoctorCreateWithAuth(DoctorBase):
    email: EmailStr
    password: str

class DoctorPasswordReset(BaseModel):
    new_password: str

class DoctorResponse(DoctorBase):
    id: int
    user_id: Optional[int]
    email: Optional[EmailStr] = None
    class Config:
        from_attributes = True

class EmployeeStatusEnum(str, Enum):
    active = 'active'
    inactive = 'inactive'

# Employee Schemas
class EmployeePermissionBase(BaseModel):
    can_register_patient: bool = True
    can_schedule_appointment: bool = True
    can_checkin_patient: bool = True
    can_collect_billing: bool = True
    can_view_reports: bool = False

class EmployeePermissionUpdate(EmployeePermissionBase):
    pass

class EmployeePermissionResponse(EmployeePermissionBase):
    id: int
    employee_id: int
    class Config:
        from_attributes = True

class EmployeeBase(BaseModel):
    designation: str
    joining_date: Optional[date] = None
    shift_start: Optional[time] = None
    shift_end: Optional[time] = None
    status: Optional[EmployeeStatusEnum] = EmployeeStatusEnum.active

class EmployeeCreate(EmployeeBase):
    name: str
    email: EmailStr
    password: str

class EmployeeUpdate(BaseModel):
    designation: Optional[str] = None
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

    class Config:
        from_attributes = True

# Appointment Schemas
class AppointmentBase(BaseModel):
    patient_id: int
    doctor_id: int
    appt_date: date
    appt_time: time
    reason: Optional[str] = None
    status: Optional[ApptStatusEnum] = ApptStatusEnum.requested

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentResponse(AppointmentBase):
    id: int
    checked_in_at: Optional[datetime] = None
    created_at: datetime
    class Config:
        from_attributes = True

# Prescription Schemas
class PrescriptionBase(BaseModel):
    appointment_id: int
    diagnosis: Optional[str] = None
    medicine: Optional[str] = None
    dosage: Optional[str] = None
    notes: Optional[str] = None

class PrescriptionCreate(PrescriptionBase):
    pass

class PrescriptionResponse(PrescriptionBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

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
    class Config:
        from_attributes = True

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
    class Config:
        from_attributes = True
