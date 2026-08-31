from datetime import date, datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.deps import require_exact_role, require_permission
from app.core.permissions import Permission
from app.core.roles import UserRole
from app.database import get_db
from app.models.all_models import (
    Appointment, Doctor, NursingNote, NursingTask, Patient, PatientVital,
    Prescription, User,
)
from app.schemas.all_schemas import (
    NursingNoteCreate, NursingNoteResponse, NursingTaskResponse,
    NursingTaskUpdate, PatientVitalCreate, PatientVitalResponse,
)
from app.services.audit_service import record_audit_event, request_audit_metadata


router = APIRouter(
    prefix="/nurse",
    tags=["nurse"],
    dependencies=[Depends(require_exact_role(UserRole.nurse))],
)

ACTIVE_TASK_STATUSES = ("pending", "in_progress")
TASK_TRANSITIONS = {
    "pending": {"in_progress"},
    "in_progress": {"completed"},
    "completed": set(),
    "cancelled": set(),
}


def _patient_or_404(db: Session, patient_id: int) -> Patient:
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


def _assigned_patient_ids(db: Session, nurse_id: int) -> list[int]:
    return [
        patient_id
        for (patient_id,) in db.query(NursingTask.patient_id).filter(
            NursingTask.assigned_nurse_id == nurse_id,
            NursingTask.status.in_(ACTIVE_TASK_STATUSES),
        ).distinct().all()
    ]


def _require_nurse_patient_assignment(db: Session, nurse_id: int, patient_id: int) -> None:
    assigned = db.query(NursingTask.id).filter(
        NursingTask.patient_id == patient_id,
        NursingTask.assigned_nurse_id == nurse_id,
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


def _task_payload(task: NursingTask, patient_name: str) -> dict:
    return {
        "id": task.id,
        "patient_id": task.patient_id,
        "patient_name": patient_name,
        "assigned_nurse_id": task.assigned_nurse_id,
        "task_type": task.task_type,
        "description": task.description,
        "priority": task.priority,
        "status": task.status,
        "due_at": task.due_at,
        "completed_at": task.completed_at,
        "created_at": task.created_at,
    }


def _appointment_payload(
    appointment: Appointment,
    patient_name: str,
    doctor_name: str,
    tasks: list[NursingTask],
) -> dict:
    return {
        "id": appointment.id,
        "patient_id": appointment.patient_id,
        "patient_name": patient_name,
        "doctor_id": appointment.doctor_id,
        "doctor_name": doctor_name,
        "appt_date": appointment.appt_date,
        "appt_time": appointment.appt_time,
        "reason": appointment.reason,
        "status": appointment.status,
        "checked_in_at": appointment.checked_in_at,
        "nursing_tasks": [
            {
                "id": task.id,
                "task_type": task.task_type,
                "priority": task.priority,
                "status": task.status,
            }
            for task in tasks
        ],
    }


@router.get("/dashboard")
def get_nurse_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.nursing_view)),
):
    today = date.today()
    tasks = db.query(NursingTask).filter(
        NursingTask.assigned_nurse_id == current_user.id,
        NursingTask.status.in_(ACTIVE_TASK_STATUSES),
    ).all()
    patient_ids = sorted({task.patient_id for task in tasks})
    patients = {
        patient.id: patient.name
        for patient in db.query(Patient).filter(Patient.id.in_(patient_ids)).all()
    } if patient_ids else {}
    appointments = db.query(Appointment).filter(
        Appointment.patient_id.in_(patient_ids),
        Appointment.appt_date >= today,
        Appointment.status.notin_(("completed", "cancelled")),
    ).order_by(Appointment.appt_date, Appointment.appt_time).all() if patient_ids else []
    today_appointments = [item for item in appointments if item.appt_date == today]
    today_patient_ids = {item.patient_id for item in today_appointments}
    due_today_ids = {
        task.patient_id for task in tasks
        if task.due_at is not None and task.due_at.date() == today
    }
    urgent_tasks = sorted(
        (task for task in tasks if task.priority in ("high", "emergency")),
        key=lambda item: (item.priority != "emergency", item.due_at or datetime.max),
    )
    doctors = {
        doctor.id: doctor.name
        for doctor in db.query(Doctor).filter(
            Doctor.id.in_({item.doctor_id for item in appointments}),
        ).all()
    } if appointments else {}
    return {
        "today_assigned_patients": len(today_patient_ids | due_today_ids),
        "waiting_patients": len({
            item.patient_id for item in today_appointments
            if item.status in ("confirmed", "checked_in")
        }),
        "patients_requiring_vitals": len({
            task.patient_id for task in tasks
            if "vital" in (task.task_type or "").lower()
        }),
        "patients_requiring_tasks": len(patient_ids),
        "active_tasks": len(tasks),
        "urgent_alerts": [
            {
                "task_id": task.id,
                "patient_id": task.patient_id,
                "patient_name": patients.get(task.patient_id, "Unknown patient"),
                "priority": task.priority,
                "description": task.description,
                "due_at": task.due_at,
            }
            for task in urgent_tasks[:8]
        ],
        "upcoming_appointments": [
            {
                "id": item.id,
                "patient_id": item.patient_id,
                "patient_name": patients.get(item.patient_id, "Unknown patient"),
                "doctor_name": doctors.get(item.doctor_id, "Unknown doctor"),
                "appt_date": item.appt_date,
                "appt_time": item.appt_time,
                "status": item.status,
            }
            for item in appointments[:8]
        ],
    }


@router.get("/patients")
def get_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.nursing_view)),
):
    patient_ids = _assigned_patient_ids(db, current_user.id)
    if not patient_ids:
        return []
    patients = db.query(Patient).filter(Patient.id.in_(patient_ids)).order_by(Patient.name).all()
    response = []
    for patient in patients:
        active_tasks = db.query(NursingTask).filter(
            NursingTask.patient_id == patient.id,
            NursingTask.assigned_nurse_id == current_user.id,
            NursingTask.status.in_(ACTIVE_TASK_STATUSES),
        ).all()
        appointment = db.query(Appointment).filter(
            Appointment.patient_id == patient.id,
        ).order_by(Appointment.appt_date.desc(), Appointment.appt_time.desc()).first()
        response.append({
            "id": patient.id,
            "name": patient.name,
            "age": patient.age,
            "gender": patient.gender,
            "contact": patient.contact,
            "blood_group": patient.blood_group,
            "active_task_count": len(active_tasks),
            "urgent_task_count": sum(task.priority in ("high", "emergency") for task in active_tasks),
            "latest_appointment_date": appointment.appt_date if appointment else None,
            "latest_appointment_status": appointment.status if appointment else None,
        })
    return response


@router.get("/patients/{patient_id}")
def get_patient_detail(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.nursing_view)),
):
    patient = _patient_or_404(db, patient_id)
    _require_nurse_patient_assignment(db, current_user.id, patient_id)
    appointments = db.query(Appointment).filter(
        Appointment.patient_id == patient_id,
    ).order_by(Appointment.appt_date.desc(), Appointment.appt_time.desc()).all()
    appointment_ids = [item.id for item in appointments]
    prescriptions = db.query(Prescription).filter(
        Prescription.appointment_id.in_(appointment_ids),
    ).order_by(Prescription.created_at.desc()).all() if appointment_ids else []
    tasks = db.query(NursingTask).filter(
        NursingTask.patient_id == patient_id,
        NursingTask.assigned_nurse_id == current_user.id,
    ).order_by(NursingTask.created_at.desc()).all()
    vitals = db.query(PatientVital).filter(
        PatientVital.patient_id == patient_id,
    ).order_by(PatientVital.recorded_at.desc()).all()
    notes = db.query(NursingNote).filter(
        NursingNote.patient_id == patient_id,
    ).order_by(NursingNote.created_at.desc()).all()
    doctors = {
        doctor.id: doctor.name
        for doctor in db.query(Doctor).filter(
            Doctor.id.in_({item.doctor_id for item in appointments}),
        ).all()
    } if appointments else {}
    clinical_user_ids = {item.recorded_by for item in vitals} | {item.nurse_id for item in notes}
    users = {
        user.id: user.name
        for user in db.query(User).filter(User.id.in_(clinical_user_ids)).all()
    } if clinical_user_ids else {}
    return {
        "patient": {
            "id": patient.id,
            "name": patient.name,
            "age": patient.age,
            "gender": patient.gender,
            "contact": patient.contact,
            "blood_group": patient.blood_group,
        },
        "appointments": [
            {
                "id": item.id,
                "doctor_name": doctors.get(item.doctor_id, "Unknown doctor"),
                "appt_date": item.appt_date,
                "appt_time": item.appt_time,
                "reason": item.reason,
                "status": item.status,
            }
            for item in appointments
        ],
        "prescriptions": [
            {
                "id": item.id,
                "appointment_id": item.appointment_id,
                "diagnosis": item.diagnosis,
                "medicine": item.medicine,
                "dosage": item.dosage,
                "notes": item.notes,
                "created_at": item.created_at,
            }
            for item in prescriptions
        ],
        "vitals": [
            {
                "id": item.id,
                "patient_id": item.patient_id,
                "appointment_id": item.appointment_id,
                "temperature": item.temperature,
                "blood_pressure_systolic": item.blood_pressure_systolic,
                "blood_pressure_diastolic": item.blood_pressure_diastolic,
                "pulse": item.pulse,
                "respiratory_rate": item.respiratory_rate,
                "oxygen_saturation": item.oxygen_saturation,
                "weight": item.weight,
                "height": item.height,
                "notes": item.notes,
                "recorded_by": item.recorded_by,
                "recorded_by_name": users.get(item.recorded_by, "Unknown user"),
                "recorded_at": item.recorded_at,
            }
            for item in vitals
        ],
        "nursing_notes": [
            {
                "id": item.id,
                "appointment_id": item.appointment_id,
                "note": item.note,
                "nurse_id": item.nurse_id,
                "nurse_name": users.get(item.nurse_id, "Unknown nurse"),
                "created_at": item.created_at,
            }
            for item in notes
        ],
        "tasks": [_task_payload(item, patient.name) for item in tasks],
    }


@router.get("/appointments")
def get_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.nursing_view)),
):
    patient_ids = _assigned_patient_ids(db, current_user.id)
    if not patient_ids:
        return []
    appointments = db.query(Appointment).filter(
        Appointment.patient_id.in_(patient_ids),
    ).order_by(Appointment.appt_date.desc(), Appointment.appt_time.desc()).all()
    patients = {
        patient.id: patient.name
        for patient in db.query(Patient).filter(Patient.id.in_(patient_ids)).all()
    }
    doctors = {
        doctor.id: doctor.name
        for doctor in db.query(Doctor).filter(
            Doctor.id.in_({item.doctor_id for item in appointments}),
        ).all()
    }
    tasks = db.query(NursingTask).filter(
        NursingTask.assigned_nurse_id == current_user.id,
        NursingTask.patient_id.in_(patient_ids),
    ).all()
    tasks_by_patient: dict[int, list[NursingTask]] = {}
    for task in tasks:
        tasks_by_patient.setdefault(task.patient_id, []).append(task)
    return [
        _appointment_payload(
            item,
            patients.get(item.patient_id, "Unknown patient"),
            doctors.get(item.doctor_id, "Unknown doctor"),
            tasks_by_patient.get(item.patient_id, []),
        )
        for item in appointments
    ]


@router.post("/vitals", response_model=PatientVitalResponse, status_code=201)
def record_vitals(
    vital: PatientVitalCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.nursing_record_vitals)),
):
    _patient_or_404(db, vital.patient_id)
    _require_nurse_patient_assignment(db, current_user.id, vital.patient_id)
    _validate_appointment_patient(db, vital.appointment_id, vital.patient_id)
    item = PatientVital(**vital.model_dump(), recorded_by=current_user.id)
    db.add(item)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="patient_vital.recorded",
        resource_type="patient_vital", resource_id=str(item.id),
        new_values=vital.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.get("/vitals")
def get_assigned_patient_vitals(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.nursing_view)),
):
    patient_ids = _assigned_patient_ids(db, current_user.id)
    if not patient_ids:
        return []
    patients = {
        patient.id: patient.name
        for patient in db.query(Patient).filter(Patient.id.in_(patient_ids)).all()
    }
    vitals = db.query(PatientVital).filter(
        PatientVital.patient_id.in_(patient_ids),
    ).order_by(PatientVital.recorded_at.desc()).all()
    nurses = {
        user.id: user.name
        for user in db.query(User).filter(User.id.in_({item.recorded_by for item in vitals})).all()
    } if vitals else {}
    return [
        {
            "id": item.id,
            "patient_id": item.patient_id,
            "patient_name": patients.get(item.patient_id, "Unknown patient"),
            "appointment_id": item.appointment_id,
            "temperature": item.temperature,
            "blood_pressure_systolic": item.blood_pressure_systolic,
            "blood_pressure_diastolic": item.blood_pressure_diastolic,
            "pulse": item.pulse,
            "respiratory_rate": item.respiratory_rate,
            "oxygen_saturation": item.oxygen_saturation,
            "weight": item.weight,
            "height": item.height,
            "notes": item.notes,
            "recorded_by": item.recorded_by,
            "recorded_by_name": nurses.get(item.recorded_by, "Unknown user"),
            "recorded_at": item.recorded_at,
        }
        for item in vitals
    ]


@router.get("/vitals/patient/{patient_id}", response_model=List[PatientVitalResponse])
def get_patient_vitals(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.nursing_view)),
):
    _patient_or_404(db, patient_id)
    _require_nurse_patient_assignment(db, current_user.id, patient_id)
    return db.query(PatientVital).filter_by(
        patient_id=patient_id,
    ).order_by(PatientVital.recorded_at.desc()).all()


@router.post("/notes", response_model=NursingNoteResponse, status_code=201)
def add_nursing_note(
    note: NursingNoteCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.nursing_record_notes)),
):
    _patient_or_404(db, note.patient_id)
    _require_nurse_patient_assignment(db, current_user.id, note.patient_id)
    _validate_appointment_patient(db, note.appointment_id, note.patient_id)
    item = NursingNote(**note.model_dump(), nurse_id=current_user.id)
    db.add(item)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="nursing_note.created",
        resource_type="nursing_note", resource_id=str(item.id),
        new_values=note.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.get("/tasks")
def get_nursing_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.nursing_view)),
):
    tasks = db.query(NursingTask).filter(
        NursingTask.assigned_nurse_id == current_user.id,
    ).order_by(NursingTask.created_at.desc()).all()
    patient_ids = {item.patient_id for item in tasks}
    patients = {
        patient.id: patient.name
        for patient in db.query(Patient).filter(Patient.id.in_(patient_ids)).all()
    } if patient_ids else {}
    return [_task_payload(item, patients.get(item.patient_id, "Unknown patient")) for item in tasks]


@router.put("/tasks/{task_id}", response_model=NursingTaskResponse)
def update_task(
    task_id: int,
    update: NursingTaskUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.nursing_manage_tasks)),
):
    item = db.get(NursingTask, task_id)
    if not item:
        raise HTTPException(status_code=404, detail="Task not found")
    if item.assigned_nurse_id != current_user.id:
        raise HTTPException(status_code=403, detail="Task is not assigned to this nurse")
    if update.status == item.status:
        return item
    if update.status not in TASK_TRANSITIONS[item.status]:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot transition task from {item.status} to {update.status}",
        )
    old_status = item.status
    item.status = update.status
    item.completed_at = datetime.now(timezone.utc) if update.status == "completed" else None
    record_audit_event(
        db, actor=current_user, action="nursing_task.status_changed",
        resource_type="nursing_task", resource_id=str(item.id),
        old_values={"status": old_status}, new_values={"status": item.status},
        **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item
