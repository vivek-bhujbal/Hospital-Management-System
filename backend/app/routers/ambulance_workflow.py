from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import require_exact_role
from app.core.roles import UserRole
from app.database import get_db
from app.models.all_models import (
    Ambulance,
    AmbulanceRequest,
    AmbulanceStaffAssignment,
    AmbulanceStatusHistory,
    AmbulanceTrip,
    Patient,
    User,
)
from app.schemas.all_schemas import (
    AmbulanceAcceptAssignment,
    AmbulanceAvailabilityUpdate,
    AmbulanceCreate,
    AmbulanceRequestCreate,
)
from app.services.audit_service import record_audit_event, request_audit_metadata


router = APIRouter(
    prefix="/ambulance",
    tags=["ambulance"],
    dependencies=[Depends(require_exact_role(UserRole.ambulance_staff))],
)

ACTIVE_TRIP_STATUSES = ("assigned", "en_route", "arrived", "transporting")
TRANSITIONS = {
    "assigned": "en_route",
    "en_route": "arrived",
    "arrived": "transporting",
    "transporting": "completed",
}
ACTION_STATUS = {
    "start-trip": "en_route",
    "arrive": "arrived",
    "start-transport": "transporting",
    "complete": "completed",
}


def _assigned_vehicle_ids(db: Session, staff_id: int):
    return db.query(AmbulanceStaffAssignment.ambulance_id).filter(
        AmbulanceStaffAssignment.staff_id == staff_id,
        AmbulanceStaffAssignment.status == "active",
    )


def _request_query(db: Session):
    return db.query(
        AmbulanceRequest, Patient, AmbulanceTrip, Ambulance, User,
    ).outerjoin(
        Patient, AmbulanceRequest.patient_id == Patient.id,
    ).outerjoin(
        AmbulanceTrip, AmbulanceTrip.request_id == AmbulanceRequest.id,
    ).outerjoin(
        Ambulance, AmbulanceTrip.ambulance_id == Ambulance.id,
    ).outerjoin(
        User, AmbulanceTrip.staff_id == User.id,
    )


def _request_record(row, *, include_contact: bool = False) -> dict:
    ambulance_request, patient, trip, ambulance, staff = row
    record = {
        "id": ambulance_request.id,
        "patient_id": patient.id if patient else None,
        "patient_name": patient.name if patient else ambulance_request.requester_name,
        "pickup_location": ambulance_request.pickup_location,
        "destination": ambulance_request.destination,
        "priority": ambulance_request.priority,
        "status": ambulance_request.status,
        "requested_at": ambulance_request.requested_at,
        "updated_at": ambulance_request.updated_at,
        "trip_id": trip.id if trip else None,
        "ambulance_id": ambulance.id if ambulance else None,
        "vehicle_number": ambulance.vehicle_number if ambulance else None,
        "staff_id": staff.id if staff else None,
        "staff_name": staff.name if staff else None,
    }
    if include_contact:
        record["contact"] = patient.contact if patient and patient.contact else ambulance_request.requester_contact
    return record


def _trip_record(row) -> dict:
    trip, ambulance_request, patient, ambulance, staff = row
    return {
        "id": trip.id,
        "request_id": ambulance_request.id,
        "patient_id": patient.id if patient else None,
        "patient_name": patient.name if patient else ambulance_request.requester_name,
        "ambulance_id": ambulance.id,
        "vehicle_number": ambulance.vehicle_number,
        "staff_id": staff.id,
        "staff_name": staff.name,
        "pickup_location": ambulance_request.pickup_location,
        "destination": ambulance_request.destination,
        "priority": ambulance_request.priority,
        "status": trip.status,
        "accepted_at": trip.accepted_at,
        "start_time": trip.start_time,
        "arrival_time": trip.arrival_time,
        "transport_time": trip.pickup_time,
        "end_time": trip.end_time,
    }


def _get_request(db: Session, request_id: int, staff_id: int, *, lock: bool = False):
    query = _request_query(db).filter(AmbulanceRequest.id == request_id)
    if lock:
        query = query.with_for_update()
    row = query.first()
    if not row:
        raise HTTPException(status_code=404, detail="Ambulance request not found")
    ambulance_request, _, trip, _, _ = row
    if ambulance_request.status == "requested" and trip is None:
        return row
    if not trip or trip.staff_id != staff_id:
        raise HTTPException(status_code=403, detail="This request is assigned to another staff member")
    return row


def _trip_query(db: Session):
    return db.query(
        AmbulanceTrip, AmbulanceRequest, Patient, Ambulance, User,
    ).join(
        AmbulanceRequest, AmbulanceTrip.request_id == AmbulanceRequest.id,
    ).outerjoin(
        Patient, AmbulanceRequest.patient_id == Patient.id,
    ).join(
        Ambulance, AmbulanceTrip.ambulance_id == Ambulance.id,
    ).join(
        User, AmbulanceTrip.staff_id == User.id,
    )


def _record_transition(
    db: Session,
    request: Request,
    staff: User,
    ambulance_request: AmbulanceRequest,
    trip: AmbulanceTrip,
    ambulance: Ambulance,
    *,
    action: str,
    old_status: str | None,
    new_status: str,
) -> None:
    db.add(AmbulanceStatusHistory(
        ambulance_id=ambulance.id,
        request_id=ambulance_request.id,
        trip_id=trip.id,
        old_status=old_status,
        status=new_status,
        recorded_by=staff.id,
    ))
    record_audit_event(
        db,
        actor=staff,
        action=f"ambulance.{action}",
        resource_type="ambulance_trip",
        resource_id=str(trip.id),
        old_values={"status": old_status} if old_status else None,
        new_values={
            "request_id": ambulance_request.id,
            "ambulance_id": ambulance.id,
            "staff_id": staff.id,
            "status": new_status,
        },
        **request_audit_metadata(request),
    )


@router.get("/dashboard")
def get_dashboard(
    db: Session = Depends(get_db),
    staff: User = Depends(require_exact_role(UserRole.ambulance_staff)),
):
    assigned_ids = _assigned_vehicle_ids(db, staff.id)
    current_trip_ids = db.query(AmbulanceTrip.request_id).filter(
        AmbulanceTrip.staff_id == staff.id,
    )
    emergency_rows = _request_query(db).filter(
        AmbulanceRequest.priority == "critical",
        or_(
            AmbulanceRequest.status == "requested",
            AmbulanceRequest.id.in_(current_trip_ids),
        ),
        AmbulanceRequest.status.in_(("requested", *ACTIVE_TRIP_STATUSES)),
    ).order_by(AmbulanceRequest.requested_at).limit(5).all()
    return {
        "available_ambulances": db.query(Ambulance).filter(
            Ambulance.id.in_(assigned_ids), Ambulance.status == "available",
        ).count(),
        "active_trips": db.query(AmbulanceTrip).filter(
            AmbulanceTrip.staff_id == staff.id,
            AmbulanceTrip.status.in_(ACTIVE_TRIP_STATUSES),
        ).count(),
        "pending_requests": db.query(AmbulanceRequest).filter(
            AmbulanceRequest.status == "requested",
        ).count(),
        "assigned_requests": db.query(AmbulanceTrip).filter(
            AmbulanceTrip.staff_id == staff.id,
            AmbulanceTrip.status == "assigned",
        ).count(),
        "completed_trips": db.query(AmbulanceTrip).filter(
            AmbulanceTrip.staff_id == staff.id,
            AmbulanceTrip.status == "completed",
        ).count(),
        "emergency_alerts": [_request_record(row) for row in emergency_rows],
    }


@router.get("/vehicles")
def list_assigned_vehicles(
    db: Session = Depends(get_db),
    staff: User = Depends(require_exact_role(UserRole.ambulance_staff)),
):
    rows = db.query(Ambulance, AmbulanceStaffAssignment).join(
        AmbulanceStaffAssignment,
        AmbulanceStaffAssignment.ambulance_id == Ambulance.id,
    ).filter(
        AmbulanceStaffAssignment.staff_id == staff.id,
        AmbulanceStaffAssignment.status == "active",
    ).order_by(Ambulance.vehicle_number).all()
    return [{
        "id": vehicle.id,
        "vehicle_number": vehicle.vehicle_number,
        "vehicle_type": vehicle.vehicle_type,
        "capacity": vehicle.capacity,
        "status": vehicle.status,
        "maintenance_status": "maintenance" if vehicle.status == "maintenance" else "operational",
        "assigned_at": assignment.assigned_at,
    } for vehicle, assignment in rows]


@router.post("/vehicles", status_code=201)
def register_vehicle(
    payload: AmbulanceCreate,
    request: Request,
    db: Session = Depends(get_db),
    staff: User = Depends(require_exact_role(UserRole.ambulance_staff)),
):
    vehicle_number = payload.vehicle_number.strip()
    if db.query(Ambulance).filter(Ambulance.vehicle_number == vehicle_number).first():
        raise HTTPException(status_code=409, detail="Ambulance vehicle number already exists")
    vehicle = Ambulance(
        vehicle_number=vehicle_number,
        vehicle_type=payload.vehicle_type,
        status=payload.status,
        capacity=payload.capacity,
    )
    db.add(vehicle)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Ambulance vehicle number already exists")
    db.add(AmbulanceStaffAssignment(
        ambulance_id=vehicle.id, staff_id=staff.id, status="active",
    ))
    db.add(AmbulanceStatusHistory(
        ambulance_id=vehicle.id, status=vehicle.status, recorded_by=staff.id,
    ))
    record_audit_event(
        db,
        actor=staff,
        action="ambulance.vehicle_registered",
        resource_type="ambulance",
        resource_id=str(vehicle.id),
        new_values={
            "vehicle_number": vehicle.vehicle_number,
            "vehicle_type": vehicle.vehicle_type,
            "capacity": vehicle.capacity,
            "status": vehicle.status,
            "staff_id": staff.id,
        },
        **request_audit_metadata(request),
    )
    db.commit()
    return {
        "id": vehicle.id,
        "vehicle_number": vehicle.vehicle_number,
        "vehicle_type": vehicle.vehicle_type,
        "capacity": vehicle.capacity,
        "status": vehicle.status,
        "maintenance_status": "maintenance" if vehicle.status == "maintenance" else "operational",
    }


@router.patch("/vehicles/{vehicle_id}/availability")
def update_vehicle_availability(
    vehicle_id: int,
    payload: AmbulanceAvailabilityUpdate,
    request: Request,
    db: Session = Depends(get_db),
    staff: User = Depends(require_exact_role(UserRole.ambulance_staff)),
):
    assignment = db.query(AmbulanceStaffAssignment).filter(
        AmbulanceStaffAssignment.ambulance_id == vehicle_id,
        AmbulanceStaffAssignment.staff_id == staff.id,
        AmbulanceStaffAssignment.status == "active",
    ).first()
    if not assignment:
        raise HTTPException(status_code=403, detail="You are not assigned to this ambulance")
    vehicle = db.query(Ambulance).filter(Ambulance.id == vehicle_id).with_for_update().first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Ambulance not found")
    if db.query(AmbulanceTrip).filter(
        AmbulanceTrip.ambulance_id == vehicle.id,
        AmbulanceTrip.status.in_(ACTIVE_TRIP_STATUSES),
    ).first():
        raise HTTPException(status_code=409, detail="Active-trip ambulance availability cannot be changed")
    if vehicle.status == payload.status:
        return {
            "id": vehicle.id,
            "vehicle_number": vehicle.vehicle_number,
            "vehicle_type": vehicle.vehicle_type,
            "capacity": vehicle.capacity,
            "status": vehicle.status,
        }
    old_status = vehicle.status
    vehicle.status = payload.status
    db.add(AmbulanceStatusHistory(
        ambulance_id=vehicle.id,
        old_status=old_status,
        status=vehicle.status,
        recorded_by=staff.id,
    ))
    record_audit_event(
        db,
        actor=staff,
        action="ambulance.vehicle_availability_changed",
        resource_type="ambulance",
        resource_id=str(vehicle.id),
        old_values={"status": old_status},
        new_values={"status": vehicle.status, "staff_id": staff.id},
        **request_audit_metadata(request),
    )
    db.commit()
    return {
        "id": vehicle.id,
        "vehicle_number": vehicle.vehicle_number,
        "vehicle_type": vehicle.vehicle_type,
        "capacity": vehicle.capacity,
        "status": vehicle.status,
    }


@router.post("/requests", status_code=201)
def create_request(
    payload: AmbulanceRequestCreate,
    request: Request,
    db: Session = Depends(get_db),
    staff: User = Depends(require_exact_role(UserRole.ambulance_staff)),
):
    patient = db.get(Patient, payload.patient_id) if payload.patient_id else None
    if payload.patient_id and not patient:
        raise HTTPException(status_code=400, detail="Patient does not exist")
    if not patient and not payload.requester_name:
        raise HTTPException(status_code=422, detail="Patient or requester name is required")
    item = AmbulanceRequest(**payload.model_dump(), status="requested")
    db.add(item)
    db.flush()
    record_audit_event(
        db,
        actor=staff,
        action="ambulance.request_created",
        resource_type="ambulance_request",
        resource_id=str(item.id),
        new_values={
            "patient_id": item.patient_id,
            "pickup_location": item.pickup_location,
            "destination": item.destination,
            "priority": item.priority,
            "status": item.status,
        },
        **request_audit_metadata(request),
    )
    db.commit()
    return _request_record(_get_request(db, item.id, staff.id))


@router.get("/requests")
def list_requests(
    db: Session = Depends(get_db),
    staff: User = Depends(require_exact_role(UserRole.ambulance_staff)),
):
    own_request_ids = db.query(AmbulanceTrip.request_id).filter(
        AmbulanceTrip.staff_id == staff.id,
    )
    rows = _request_query(db).filter(or_(
        AmbulanceRequest.status == "requested",
        AmbulanceRequest.id.in_(own_request_ids),
    )).order_by(
        AmbulanceRequest.status != "requested",
        AmbulanceRequest.priority.desc(),
        AmbulanceRequest.requested_at,
    ).all()
    return [_request_record(row) for row in rows]


@router.get("/requests/{request_id}")
def get_request_detail(
    request_id: int,
    db: Session = Depends(get_db),
    staff: User = Depends(require_exact_role(UserRole.ambulance_staff)),
):
    row = _get_request(db, request_id, staff.id)
    ambulance_request, _, trip, _, _ = row
    history = []
    if trip:
        history = db.query(AmbulanceStatusHistory, User).join(
            User, AmbulanceStatusHistory.recorded_by == User.id,
        ).filter(
            AmbulanceStatusHistory.request_id == ambulance_request.id,
            AmbulanceStatusHistory.trip_id == trip.id,
        ).order_by(AmbulanceStatusHistory.recorded_at, AmbulanceStatusHistory.id).all()
    return {
        **_request_record(row, include_contact=True),
        "trip": _trip_record(_trip_query(db).filter(AmbulanceTrip.id == trip.id).first()) if trip else None,
        "history": [{
            "id": item.id,
            "old_status": item.old_status,
            "status": item.status,
            "staff_id": actor.id,
            "staff_name": actor.name,
            "recorded_at": item.recorded_at,
        } for item, actor in history],
    }


@router.post("/requests/{request_id}/accept", status_code=201)
def accept_assignment(
    request_id: int,
    payload: AmbulanceAcceptAssignment,
    request: Request,
    db: Session = Depends(get_db),
    staff: User = Depends(require_exact_role(UserRole.ambulance_staff)),
):
    ambulance_request = db.query(AmbulanceRequest).filter(
        AmbulanceRequest.id == request_id,
    ).with_for_update().first()
    if not ambulance_request:
        raise HTTPException(status_code=404, detail="Ambulance request not found")
    if ambulance_request.status != "requested":
        raise HTTPException(status_code=409, detail="Ambulance request is no longer available")
    assignment = db.query(AmbulanceStaffAssignment).filter(
        AmbulanceStaffAssignment.ambulance_id == payload.ambulance_id,
        AmbulanceStaffAssignment.staff_id == staff.id,
        AmbulanceStaffAssignment.status == "active",
    ).first()
    if not assignment:
        raise HTTPException(status_code=403, detail="You are not assigned to this ambulance")
    ambulance = db.query(Ambulance).filter(
        Ambulance.id == payload.ambulance_id,
    ).with_for_update().first()
    if not ambulance or ambulance.status != "available":
        raise HTTPException(status_code=409, detail="Ambulance is not available")
    if db.query(AmbulanceTrip).filter(
        AmbulanceTrip.ambulance_id == ambulance.id,
        AmbulanceTrip.status.in_(ACTIVE_TRIP_STATUSES),
    ).first():
        raise HTTPException(status_code=409, detail="Ambulance already has an active trip")
    trip = AmbulanceTrip(
        request_id=ambulance_request.id,
        ambulance_id=ambulance.id,
        staff_id=staff.id,
        status="assigned",
    )
    db.add(trip)
    ambulance_request.status = "assigned"
    ambulance.status = "assigned"
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Ambulance request is already assigned")
    _record_transition(
        db, request, staff, ambulance_request, trip, ambulance,
        action="assignment_accepted", old_status="requested", new_status="assigned",
    )
    db.commit()
    return _request_record(_get_request(db, request_id, staff.id), include_contact=True)


@router.post("/requests/{request_id}/{action}")
def advance_trip(
    request_id: int,
    action: str,
    request: Request,
    db: Session = Depends(get_db),
    staff: User = Depends(require_exact_role(UserRole.ambulance_staff)),
):
    if action not in ACTION_STATUS:
        raise HTTPException(status_code=404, detail="Ambulance action not found")
    trip = db.query(AmbulanceTrip).filter(
        AmbulanceTrip.request_id == request_id,
        AmbulanceTrip.staff_id == staff.id,
    ).with_for_update().first()
    if not trip:
        if db.query(AmbulanceTrip).filter(AmbulanceTrip.request_id == request_id).first():
            raise HTTPException(status_code=403, detail="This trip is assigned to another staff member")
        if not db.get(AmbulanceRequest, request_id):
            raise HTTPException(status_code=404, detail="Ambulance request not found")
        raise HTTPException(status_code=409, detail="Request has no accepted assignment")
    ambulance_request = db.query(AmbulanceRequest).filter(
        AmbulanceRequest.id == request_id,
    ).with_for_update().one()
    ambulance = db.query(Ambulance).filter(
        Ambulance.id == trip.ambulance_id,
    ).with_for_update().one()
    expected = TRANSITIONS.get(trip.status)
    new_status = ACTION_STATUS[action]
    if expected != new_status:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot move trip from '{trip.status}' to '{new_status}'",
        )
    old_status = trip.status
    trip.status = new_status
    ambulance_request.status = new_status
    now = datetime.now(timezone.utc)
    if new_status == "en_route":
        trip.start_time = now
        ambulance.status = "en_route"
    elif new_status == "arrived":
        trip.arrival_time = now
        ambulance.status = "arrived"
    elif new_status == "transporting":
        trip.pickup_time = now
        ambulance.status = "transporting"
    elif new_status == "completed":
        trip.end_time = now
        ambulance.status = "available"
    _record_transition(
        db, request, staff, ambulance_request, trip, ambulance,
        action=action.replace("-", "_"), old_status=old_status, new_status=new_status,
    )
    db.commit()
    return _request_record(_get_request(db, request_id, staff.id), include_contact=True)


@router.get("/trips")
def list_trips(
    db: Session = Depends(get_db),
    staff: User = Depends(require_exact_role(UserRole.ambulance_staff)),
):
    rows = _trip_query(db).filter(
        AmbulanceTrip.staff_id == staff.id,
    ).order_by(AmbulanceTrip.id.desc()).limit(200).all()
    return [_trip_record(row) for row in rows]
