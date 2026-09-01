from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timezone

from app.database import get_db
from app.models.all_models import (
    User, Ambulance, AmbulanceStaffAssignment, AmbulanceRequest, AmbulanceTrip, AmbulanceStatusHistory, AuditLog
)
from app.schemas.all_schemas import (
    AmbulanceCreate, AmbulanceDispatchCreate, AmbulanceResponse,
    AmbulanceRequestCreate, AmbulanceRequestResponse,
    AmbulanceTripResponse, AmbulanceTripStatusUpdate
)
from app.core.deps import require_any_role, require_permission
from app.core.permissions import Permission
from app.core.roles import UserRole
from app.services.audit_service import record_audit_event, request_audit_metadata

router = APIRouter(
    prefix="/ambulance",
    tags=["ambulance"],
    dependencies=[Depends(require_any_role(UserRole.ambulance_staff, UserRole.hospital_manager))]
)

TRIP_TRANSITIONS = {
    "dispatched": {"accepted", "cancelled"},
    "accepted": {"on_route", "cancelled"},
    "on_route": {"pickup", "cancelled"},
    "pickup": {"transporting", "cancelled"},
    "transporting": {"arrived", "cancelled"},
    "arrived": {"completed"},
    "completed": set(),
    "cancelled": set(),
}

def log_audit(db: Session, actor_id: int, action: str, resource_type: str, resource_id: str, old_val: dict = None, new_val: dict = None):
    log = AuditLog(
        actor_user_id=actor_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        old_values=old_val,
        new_values=new_val
    )
    db.add(log)

def log_ambulance_status(db: Session, ambulance_id: int, status: str, user_id: int):
    history = AmbulanceStatusHistory(
        ambulance_id=ambulance_id,
        status=status,
        recorded_by=user_id
    )
    db.add(history)


@router.get("/vehicles", response_model=List[AmbulanceResponse])
def list_vehicles(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.ambulance_view)),
):
    return db.query(Ambulance).order_by(Ambulance.vehicle_number).all()


@router.post("/vehicles", response_model=AmbulanceResponse, status_code=201)
def create_vehicle(
    payload: AmbulanceCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.ambulance_dispatch)),
):
    if db.query(Ambulance).filter_by(vehicle_number=payload.vehicle_number).first():
        raise HTTPException(status_code=409, detail="Ambulance vehicle number already exists")
    item = Ambulance(**payload.model_dump())
    db.add(item)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="ambulance.vehicle_created", resource_type="ambulance",
        resource_id=str(item.id), new_values=payload.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.post("/requests", response_model=AmbulanceRequestResponse, status_code=201)
def create_request(
    payload: AmbulanceRequestCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.ambulance_dispatch)),
):
    if payload.patient_id is not None:
        from app.models.all_models import Patient
        if not db.get(Patient, payload.patient_id):
            raise HTTPException(status_code=400, detail="Patient does not exist")
    item = AmbulanceRequest(**payload.model_dump(), status="requested")
    db.add(item)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="ambulance.request_created",
        resource_type="ambulance_request", resource_id=str(item.id),
        new_values=payload.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.get("/trips", response_model=List[AmbulanceTripResponse])
def list_trips(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.ambulance_view)),
):
    query = db.query(AmbulanceTrip)
    if current_user.role == UserRole.ambulance_staff.value:
        assigned_ids = db.query(AmbulanceStaffAssignment.ambulance_id).filter(
            AmbulanceStaffAssignment.staff_id == current_user.id,
            AmbulanceStaffAssignment.status == "active",
        )
        query = query.filter(AmbulanceTrip.ambulance_id.in_(assigned_ids))
    return query.order_by(AmbulanceTrip.id.desc()).limit(200).all()


@router.post("/dispatch", response_model=AmbulanceTripResponse, status_code=201)
def dispatch_ambulance(
    payload: AmbulanceDispatchCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.ambulance_dispatch)),
):
    existing = db.query(AmbulanceTrip).filter_by(request_id=payload.request_id).first()
    if existing:
        return existing
    ambulance_request = db.query(AmbulanceRequest).filter(
        AmbulanceRequest.id == payload.request_id,
    ).with_for_update().first()
    ambulance = db.query(Ambulance).filter(
        Ambulance.id == payload.ambulance_id,
    ).with_for_update().first()
    staff = db.query(User).filter(
        User.id == payload.staff_id, User.role == UserRole.ambulance_staff.value,
        User.is_active.is_(True),
    ).first()
    if not ambulance_request or ambulance_request.status not in ("requested", "approved"):
        raise HTTPException(status_code=409, detail="Ambulance request is not dispatchable")
    if not ambulance or ambulance.status != "available":
        raise HTTPException(status_code=409, detail="Ambulance is not available")
    if not staff:
        raise HTTPException(status_code=400, detail="Ambulance staff member is invalid or inactive")
    assignment = db.query(AmbulanceStaffAssignment).filter_by(
        ambulance_id=ambulance.id, staff_id=staff.id,
    ).first()
    if assignment:
        assignment.status = "active"
    else:
        db.add(AmbulanceStaffAssignment(
            ambulance_id=ambulance.id, staff_id=staff.id, status="active",
        ))
    trip = AmbulanceTrip(
        request_id=ambulance_request.id, ambulance_id=ambulance.id, status="dispatched",
    )
    db.add(trip)
    ambulance.status = "dispatched"
    ambulance_request.status = "dispatched"
    db.flush()
    log_ambulance_status(db, ambulance.id, ambulance.status, current_user.id)
    record_audit_event(
        db, actor=current_user, action="ambulance.dispatched", resource_type="ambulance_trip",
        resource_id=str(trip.id), new_values=payload.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(trip)
    return trip

@router.get("/dashboard")
def get_ambulance_dashboard(db: Session = Depends(get_db), current_user: User = Depends(require_permission(Permission.ambulance_view))):
    assignment = db.query(AmbulanceStaffAssignment).filter(
        AmbulanceStaffAssignment.staff_id == current_user.id,
        AmbulanceStaffAssignment.status == 'active'
    ).first()
    
    if not assignment:
        return {"message": "No active ambulance assignment"}
        
    ambulance = db.query(Ambulance).filter(Ambulance.id == assignment.ambulance_id).first()
    
    active_trip = db.query(AmbulanceTrip).filter(
        AmbulanceTrip.ambulance_id == ambulance.id,
        AmbulanceTrip.status.in_(['dispatched', 'accepted', 'on_route', 'pickup', 'transporting', 'arrived'])
    ).first()
    
    return {
        "vehicle_number": ambulance.vehicle_number,
        "vehicle_status": ambulance.status,
        "active_trip_id": active_trip.id if active_trip else None,
        "active_trip_status": active_trip.status if active_trip else None
    }

@router.get("/requests", response_model=List[AmbulanceRequestResponse])
def get_ambulance_requests(db: Session = Depends(get_db), _: User = Depends(require_permission(Permission.ambulance_view))):
    # Ambulance staff can see all active requests
    return db.query(AmbulanceRequest).filter(AmbulanceRequest.status.in_(['requested', 'approved', 'dispatched'])).all()

@router.put("/trips/{trip_id}/status", response_model=AmbulanceTripResponse)
def update_trip_status(
    trip_id: int, status_update: AmbulanceTripStatusUpdate, request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.ambulance_update_status)),
):
    trip = db.query(AmbulanceTrip).filter(AmbulanceTrip.id == trip_id).with_for_update().first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    assignment = db.query(AmbulanceStaffAssignment).filter(
        AmbulanceStaffAssignment.staff_id == current_user.id,
        AmbulanceStaffAssignment.ambulance_id == trip.ambulance_id,
        AmbulanceStaffAssignment.status == 'active'
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=403, detail="Not assigned to this ambulance trip")
        
    ambulance = db.query(Ambulance).filter(Ambulance.id == trip.ambulance_id).first()
    ambulance_request = db.query(AmbulanceRequest).filter(AmbulanceRequest.id == trip.request_id).first()
    
    if status_update.status == trip.status:
        return trip
    if status_update.status not in TRIP_TRANSITIONS[trip.status]:
        raise HTTPException(status_code=409, detail=f"Cannot transition trip from {trip.status} to {status_update.status}")
        
    old_status = trip.status
    trip.status = status_update.status
    
    # Update timestamps based on status
    if trip.status == 'accepted':
        trip.start_time = datetime.now(timezone.utc)
        ambulance.status = 'dispatched'
        ambulance_request.status = 'accepted'
    elif trip.status == 'on_route':
        ambulance.status = 'on_route'
        ambulance_request.status = 'accepted'
    elif trip.status == 'pickup':
        trip.pickup_time = datetime.now(timezone.utc)
        ambulance.status = 'arrived'
        ambulance_request.status = 'pickup'
    elif trip.status == 'transporting':
        ambulance.status = 'transporting'
        ambulance_request.status = 'transporting'
    elif trip.status == 'arrived':
        trip.arrival_time = datetime.now(timezone.utc)
        ambulance.status = 'arrived'
        ambulance_request.status = 'arrived'
    elif trip.status in ['completed', 'cancelled']:
        trip.end_time = datetime.now(timezone.utc)
        ambulance.status = 'available'
        ambulance_request.status = trip.status
        
    log_ambulance_status(db, ambulance.id, ambulance.status, current_user.id)
    record_audit_event(
        db, actor=current_user, action="ambulance.trip_status_changed",
        resource_type="ambulance_trip", resource_id=str(trip.id),
        old_values={"status": old_status}, new_values={"status": trip.status},
        **request_audit_metadata(request),
    )
    
    db.commit()
    db.refresh(trip)
    
    return trip


# Export the finalized exact-role Ambulance Staff workflow.
from app.routers.ambulance_workflow import router as router
