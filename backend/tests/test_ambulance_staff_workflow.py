from app.models.all_models import (
    Ambulance,
    AmbulanceRequest,
    AmbulanceStaffAssignment,
    AmbulanceStatusHistory,
    AmbulanceTrip,
    AuditLog,
    Patient,
)


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def ambulance_case(db, create_user):
    staff = create_user("ambulance_staff")
    other_staff = create_user("ambulance_staff")
    patient = Patient(
        name="Transport Patient", contact="9876543210", address="Private address",
        blood_group="O+",
    )
    own_vehicle = Ambulance(
        vehicle_number="AMB-OWN-01", vehicle_type="Basic life support",
        status="available", capacity=2,
    )
    other_vehicle = Ambulance(
        vehicle_number="AMB-OTHER-02", vehicle_type="Patient transport",
        status="available", capacity=2,
    )
    db.add_all([patient, own_vehicle, other_vehicle])
    db.flush()
    db.add_all([
        AmbulanceStaffAssignment(
            ambulance_id=own_vehicle.id, staff_id=staff.id, status="active",
        ),
        AmbulanceStaffAssignment(
            ambulance_id=other_vehicle.id, staff_id=other_staff.id, status="active",
        ),
    ])
    urgent = AmbulanceRequest(
        patient_id=patient.id,
        pickup_location="Emergency Gate A",
        destination="HMS Emergency Department",
        priority="critical",
        status="requested",
    )
    routine = AmbulanceRequest(
        requester_name="Outside Caller",
        requester_contact="9000000000",
        pickup_location="Community Clinic",
        destination="HMS Main Entrance",
        priority="medium",
        status="requested",
    )
    db.add_all([urgent, routine])
    db.commit()
    return staff, other_staff, patient, own_vehicle, other_vehicle, urgent, routine


def test_dashboard_requests_and_vehicle_scope_expose_transport_data_only(
    client, db, create_user, login,
):
    staff, _, patient, own_vehicle, _, urgent, _ = ambulance_case(db, create_user)
    auth = headers(login(staff))
    dashboard = client.get("/ambulance/dashboard", headers=auth)
    assert dashboard.status_code == 200
    assert dashboard.json()["available_ambulances"] == 1
    assert dashboard.json()["pending_requests"] == 2
    assert dashboard.json()["emergency_alerts"][0]["id"] == urgent.id
    vehicles = client.get("/ambulance/vehicles", headers=auth).json()
    assert [vehicle["id"] for vehicle in vehicles] == [own_vehicle.id]
    detail = client.get(f"/ambulance/requests/{urgent.id}", headers=auth).json()
    assert detail["patient_id"] == patient.id
    assert detail["patient_name"] == patient.name
    assert detail["contact"] == patient.contact
    assert detail["destination"] == "HMS Emergency Department"
    assert not ({"address", "blood_group", "diagnosis", "prescription", "medical_history"} & set(detail))


def test_assignment_scope_guarded_trip_workflow_and_audit(
    client, db, create_user, login,
):
    staff, other, _, vehicle, other_vehicle, urgent, _ = ambulance_case(db, create_user)
    auth = headers(login(staff))
    other_auth = headers(login(other))
    assert client.post(
        f"/ambulance/requests/{urgent.id}/accept",
        json={"ambulance_id": other_vehicle.id}, headers=auth,
    ).status_code == 403
    accepted = client.post(
        f"/ambulance/requests/{urgent.id}/accept",
        json={"ambulance_id": vehicle.id}, headers=auth,
    )
    assert accepted.status_code == 201, accepted.text
    assert accepted.json()["status"] == "assigned"
    assert accepted.json()["staff_id"] == staff.id
    assert client.post(
        f"/ambulance/requests/{urgent.id}/accept",
        json={"ambulance_id": vehicle.id}, headers=auth,
    ).status_code == 409
    assert client.get(f"/ambulance/requests/{urgent.id}", headers=other_auth).status_code == 403
    assert urgent.id not in {
        item["id"] for item in client.get("/ambulance/requests", headers=other_auth).json()
    }
    assert client.post(
        f"/ambulance/requests/{urgent.id}/start-transport", headers=auth,
    ).status_code == 409

    for action, expected in (
        ("start-trip", "en_route"),
        ("arrive", "arrived"),
        ("start-transport", "transporting"),
        ("complete", "completed"),
    ):
        response = client.post(
            f"/ambulance/requests/{urgent.id}/{action}", headers=auth,
        )
        assert response.status_code == 200, response.text
        assert response.json()["status"] == expected

    assert client.post(
        f"/ambulance/requests/{urgent.id}/complete", headers=auth,
    ).status_code == 409
    trip = db.query(AmbulanceTrip).filter_by(request_id=urgent.id).one()
    db.refresh(vehicle)
    assert trip.staff_id == staff.id
    assert trip.start_time and trip.arrival_time and trip.pickup_time and trip.end_time
    assert vehicle.status == "available"
    assert db.query(AmbulanceStatusHistory).filter_by(request_id=urgent.id).count() == 5
    assert db.query(AuditLog).filter(AuditLog.action.like("ambulance.%")).count() == 5
    detail = client.get(f"/ambulance/requests/{urgent.id}", headers=auth).json()
    assert len(detail["history"]) == 5
    assert detail["history"][-1]["status"] == "completed"
    trips = client.get("/ambulance/trips", headers=auth).json()
    assert trips[0]["staff_id"] == staff.id
    assert trips[0]["status"] == "completed"


def test_transport_request_creation_requires_destination_and_has_no_generic_mutation(
    client, db, create_user, login,
):
    staff = create_user("ambulance_staff")
    auth = headers(login(staff))
    missing_destination = client.post("/ambulance/requests", json={
        "requester_name": "Caller",
        "pickup_location": "Station Road",
        "priority": "high",
    }, headers=auth)
    assert missing_destination.status_code == 422
    created = client.post("/ambulance/requests", json={
        "requester_name": "Caller",
        "requester_contact": "911",
        "pickup_location": "Station Road",
        "destination": "HMS Emergency Department",
        "priority": "high",
    }, headers=auth)
    assert created.status_code == 201
    assert created.json()["status"] == "requested"
    assert client.post("/ambulance/dispatch", json={}, headers=auth).status_code == 404
    assert client.put("/ambulance/trips/1/status", json={"status": "completed"}, headers=auth).status_code == 404
    assert db.query(AmbulanceRequest).count() == 1
    assert db.query(AuditLog).filter_by(action="ambulance.request_created").count() == 1


def test_vehicle_registration_and_idle_availability_are_audited_without_delete(
    client, db, create_user, login,
):
    staff = create_user("ambulance_staff")
    auth = headers(login(staff))
    created = client.post("/ambulance/vehicles", json={
        "vehicle_number": "AMB-NEW-10",
        "vehicle_type": "Advanced life support",
        "capacity": 3,
        "status": "available",
    }, headers=auth)
    assert created.status_code == 201, created.text
    vehicle_id = created.json()["id"]
    assert client.post("/ambulance/vehicles", json={
        "vehicle_number": "AMB-NEW-10", "status": "available",
    }, headers=auth).status_code == 409
    changed = client.patch(
        f"/ambulance/vehicles/{vehicle_id}/availability",
        json={"status": "maintenance"}, headers=auth,
    )
    assert changed.status_code == 200
    assert changed.json()["status"] == "maintenance"
    assert client.delete(f"/ambulance/vehicles/{vehicle_id}", headers=auth).status_code in (404, 405)
    assert db.query(AmbulanceStaffAssignment).filter_by(
        ambulance_id=vehicle_id, staff_id=staff.id, status="active",
    ).count() == 1
    assert db.query(AuditLog).filter(
        AuditLog.action.in_((
            "ambulance.vehicle_registered", "ambulance.vehicle_availability_changed",
        )),
    ).count() == 2


def test_ambulance_exact_role_and_cross_department_denial(client, create_user, login):
    staff = create_user("ambulance_staff")
    auth = headers(login(staff))
    for endpoint in (
        "/admin/overview", "/doctors/me", "/nurse/dashboard", "/pharmacy/dashboard",
        "/lab/dashboard", "/radiology/dashboard", "/accountant/dashboard",
        "/insurance/dashboard", "/probes/patient-history",
    ):
        assert client.get(endpoint, headers=auth).status_code == 403
    doctor = create_user("doctor")
    assert client.get(
        "/ambulance/dashboard", headers=headers(login(doctor)),
    ).status_code == 403


def test_ambulance_module_has_no_default_business_data(client, create_user, login):
    staff = create_user("ambulance_staff")
    auth = headers(login(staff))
    dashboard = client.get("/ambulance/dashboard", headers=auth).json()
    assert dashboard["available_ambulances"] == 0
    assert dashboard["active_trips"] == 0
    assert dashboard["pending_requests"] == 0
    assert dashboard["emergency_alerts"] == []
    assert client.get("/ambulance/requests", headers=auth).json() == []
    assert client.get("/ambulance/trips", headers=auth).json() == []
    assert client.get("/ambulance/vehicles", headers=auth).json() == []
