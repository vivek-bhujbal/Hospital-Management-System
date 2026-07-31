from sqlalchemy import Column, Integer, String, Enum, Text, Time, Date, DECIMAL, ForeignKey, TIMESTAMP, func
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum('patient','doctor','receptionist','admin'), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

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

class Doctor(Base):
    __tablename__ = 'doctors'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True)
    name = Column(String(100), nullable=False)
    specialization = Column(String(100))
    timing_start = Column(Time)
    timing_end = Column(Time)
    contact = Column(String(20))
    status = Column(Enum('active','on_leave'), default='active')

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

class EmployeePermission(Base):
    __tablename__ = 'employee_permissions'
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('employees.id'), nullable=False)
    can_register_patient = Column(Integer, default=1)
    can_schedule_appointment = Column(Integer, default=1)
    can_checkin_patient = Column(Integer, default=1)
    can_collect_billing = Column(Integer, default=1)
    can_view_reports = Column(Integer, default=0)

class Appointment(Base):
    __tablename__ = 'appointments'
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False)
    doctor_id = Column(Integer, ForeignKey('doctors.id'), nullable=False)
    appt_date = Column(Date, nullable=False)
    appt_time = Column(Time, nullable=False)
    reason = Column(String(255))
    status = Column(Enum('requested','confirmed','checked_in','in_progress','completed','cancelled'), default='requested')
    checked_in_at = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, server_default=func.now())

class Prescription(Base):
    __tablename__ = 'prescriptions'
    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey('appointments.id'), nullable=False)
    diagnosis = Column(Text)
    medicine = Column(String(150))
    dosage = Column(String(100))
    notes = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())

class Billing(Base):
    __tablename__ = 'billing'
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False)
    appointment_id = Column(Integer, ForeignKey('appointments.id'), nullable=False)
    amount = Column(DECIMAL(10,2), nullable=False)
    status = Column(Enum('pending','paid'), default='pending')
    payment_method = Column(Enum('cash','card','upi'))
    collected_by = Column(Integer, ForeignKey('employees.id'))
    receipt_no = Column(String(30))
    paid_at = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, server_default=func.now())

class HospitalSetting(Base):
    __tablename__ = 'hospital_settings'
    id = Column(Integer, primary_key=True, index=True)
    hospital_name = Column(String(150))
    address = Column(Text)
    phone = Column(String(20))
    gstin = Column(String(20))
