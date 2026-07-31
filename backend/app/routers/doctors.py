from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.all_models import Doctor, User
from app.schemas.all_schemas import DoctorResponse, DoctorCreate
from typing import List
from app.core.deps import get_current_user, RoleChecker

router = APIRouter()
allow_doctor = RoleChecker(["doctor"])

@router.get("/me", response_model=DoctorResponse)
def get_doctor_profile(db: Session = Depends(get_db), current_user: User = Depends(allow_doctor)):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    return doctor

@router.put("/me", response_model=DoctorResponse)
def update_doctor_profile(profile_data: DoctorCreate, db: Session = Depends(get_db), current_user: User = Depends(allow_doctor)):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    
    doctor.name = profile_data.name
    doctor.specialization = profile_data.specialization
    doctor.timing_start = profile_data.timing_start
    doctor.timing_end = profile_data.timing_end
    doctor.contact = profile_data.contact
    
    db.commit()
    db.refresh(doctor)
    return doctor

@router.get("/", response_model=List[DoctorResponse])
def get_all_doctors(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    doctors = db.query(Doctor).filter(Doctor.status == 'active').all()
    return doctors
