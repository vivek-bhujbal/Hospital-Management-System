from datetime import date, datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.permissions import Permission
from app.core.roles import UserRole
from app.database import get_db
from app.models.all_models import Appointment, NursingNote, NursingTask, Patient, PatientVital, User
from app.schemas.all_schemas import (
    NursingNoteCreate, NursingNoteResponse, NursingTaskCreate, NursingTaskResponse,
    NursingTaskUpdate, PatientVitalCreate, PatientVitalResponse,
)
from app.services.audit_service import record_audit_event, request_audit_metadata


router = APIRouter(prefix="/nurse", tags=["nurse"])

ACTIVE_TASK_STATUSES = ("pending", "in_progress")
TASK_TRANSITIONS = {
    "pending": {"in_progress", "cancelled"},
    "in_progress": {"completed", "cancelled"},
    "completed": set(),
    "cancelled": set(),
}


def _patient_or_404(db: Session, patient_id: int) -> Patient:
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


def _require_nurse_patient_assignment(db: Session, user: User, patient_id: int) -> None:
    if user.role != UserRole.nurse.value:
        return
    assigned = db.query(NursingTask.id).filter(
        NursingTask.patient_id == patient_id,
        NursingTask.assigned_nurse_id == user.id,
        NursingTask.status.in_(ACTIVE_TASK_STATUSES),
    ).first()
    if not assigned:
        raise HTTPException(status_code=403, detail="Patient is not assigned to this nurse")


def _validate_appointment_patient(db: Session, appointment_id: int | None, patient_id: int) -> None:
    if appointment_id is None:
        return
    appointment = db.get(Appointment, appointment_id)
    if not appointment or appointment.patient_id != patient_id:
        raise HTTPException(status_code=400, detail="Appointment does not belong to this patient")


@router.get("/dashboard")
def get_nurse_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.nursing_view)),
):
    tasks = db.query(NursingTask).filter(NursingTask.status.in_(ACTIVE_TASK_STATUSES))
    if current_user.role == UserRole.nurse.value:
        tasks = tasks.filter(NursingTask.assigned_nurse_id == current_user.id)
    return {
        "assigned_tasks": tasks.count(),
        "emergency_tasks": tasks.filter(NursingTask.priority == "emergency").count(),
        "today_appointments": db.query(Appointment).filter(Appointment.appt_date == date.today()).count(),
    }


@router.get("/patients")
def get_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.nursing_view)),
):
    query = db.query(Patient)
    if current_user.role == UserRole.nurse.value:
        assigned_ids = db.query(NursingTask.patient_id).filter(
            NursingTask.assigned_nurse_id == current_user.id,
            NursingTask.status.in_(ACTIVE_TASK_STATUSES),
        )
        query = query.filter(Patient.id.in_(assigned_ids))
    return [
        {"id": item.id, "name": item.name, "age": item.age, "gender": item.gender, "contact": item.contact}
        for item in query.order_by(Patient.name)
    ]


@router.post("/vitals", response_model=PatientVitalResponse, status_code=201)
def record_vitals(
    vital: PatientVitalCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.nursing_record_vitals)),
):
    _patient_or_404(db, vital.patient_id)
    _require_nurse_patient_assignment(db, current_user, vital.patient_id)
    _validate_appointment_patient(db, vital.appointment_id, vital.patient_id)
    item = PatientVital(**vital.model_dump(), recorded_by=current_user.id)
    db.add(item)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="patient_vital.recorded", resource_type="patient_vital",
        resource_id=str(item.id), new_values=vital.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.get("/vitals/patient/{patient_id}", response_model=List[PatientVitalResponse])
def get_patient_vitals(
    patient_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.nursing_view)),
):
    _patient_or_404(db, patient_id)
    _require_nurse_patient_assignment(db, current_user, patient_id)
    return db.query(PatientVital).filter_by(patient_id=patient_id).order_by(PatientVital.recorded_at.desc()).all()


@router.post("/notes", response_model=NursingNoteResponse, status_code=201)
def add_nursing_note(
    note: NursingNoteCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.nursing_record_notes)),
):
    _patient_or_404(db, note.patient_id)
    _require_nurse_patient_assignment(db, current_user, note.patient_id)
    _validate_appointment_patient(db, note.appointment_id, note.patient_id)
    item = NursingNote(**note.model_dump(), nurse_id=current_user.id)
    db.add(item)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="nursing_note.created", resource_type="nursing_note",
        resource_id=str(item.id), new_values=note.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.get("/notes/patient/{patient_id}", response_model=List[NursingNoteResponse])
def get_nursing_notes(
    patient_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.nursing_view)),
):
    _patient_or_404(db, patient_id)
    _require_nurse_patient_assignment(db, current_user, patient_id)
    return db.query(NursingNote).filter_by(patient_id=patient_id).order_by(NursingNote.created_at.desc()).all()


@router.get("/tasks", response_model=List[NursingTaskResponse])
def get_nursing_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.nursing_view)),
):
    query = db.query(NursingTask)
    if current_user.role == UserRole.nurse.value:
        query = query.filter(NursingTask.assigned_nurse_id == current_user.id)
    return query.order_by(NursingTask.created_at.desc()).all()


@router.post("/tasks", response_model=NursingTaskResponse, status_code=201)
def create_task(
    task: NursingTaskCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.nursing_assign_tasks)),
):
    _patient_or_404(db, task.patient_id)
    nurse = db.query(User).filter(
        User.id == task.assigned_nurse_id,
        User.role == UserRole.nurse.value,
        User.is_active.is_(True),
    ).first()
    if not nurse:
        raise HTTPException(status_code=400, detail="Assigned nurse is invalid or inactive")
    item = NursingTask(**task.model_dump(exclude={"status"}), status="pending")
    db.add(item)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="nursing_task.assigned", resource_type="nursing_task",
        resource_id=str(item.id), new_values=task.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.put("/tasks/{task_id}", response_model=NursingTaskResponse)
def update_task(
    task_id: int, update: NursingTaskUpdate, request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.nursing_manage_tasks)),
):
    item = db.get(NursingTask, task_id)
    if not item:
        raise HTTPException(status_code=404, detail="Task not found")
    if current_user.role == UserRole.nurse.value and item.assigned_nurse_id != current_user.id:
        raise HTTPException(status_code=403, detail="Task is not assigned to this nurse")
    if update.status is None or update.status == item.status:
        return item
    if update.status not in TASK_TRANSITIONS[item.status]:
        raise HTTPException(status_code=409, detail=f"Cannot transition task from {item.status} to {update.status}")
    old_status = item.status
    item.status = update.status
    item.completed_at = datetime.now(timezone.utc) if update.status == "completed" else None
    record_audit_event(
        db, actor=current_user, action="nursing_task.status_changed", resource_type="nursing_task",
        resource_id=str(item.id), old_values={"status": old_status},
        new_values={"status": item.status}, **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item
