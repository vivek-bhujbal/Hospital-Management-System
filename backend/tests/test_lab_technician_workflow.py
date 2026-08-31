from datetime import date, time
from decimal import Decimal

from app.core.permissions import Permission, get_role_permissions
from app.models.all_models import (
    Appointment, AuditLog, Doctor, LabOrder, LabOrderItem, LabResult,
    LabSample, LabTest, LabTestCategory, Patient,
)


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def laboratory_case(db, create_user):
    doctor_user = create_user("doctor")
    patient_user = create_user("patient")
    technician = create_user("lab_technician")
    other_technician = create_user("lab_technician")
    doctor = Doctor(user_id=doctor_user.id, name="Dr. Path", status="active")
    patient = Patient(user_id=patient_user.id, name="Lab Patient", age=39, gender="female")
    category = LabTestCategory(name="Haematology")
    db.add_all([doctor, patient, category])
    db.flush()
    appointment = Appointment(
        patient_id=patient.id, doctor_id=doctor.id, appt_date=date.today(),
        appt_time=time(10, 0), status="in_progress",
    )
    test = LabTest(
        category_id=category.id, name="Complete Blood Count", code="CBC",
        price=Decimal("300.00"), status="active",
    )
    db.add_all([appointment, test])
    db.commit()
    return {
        "doctor_user": doctor_user, "patient": patient,
        "appointment": appointment, "test": test,
        "technician": technician, "other_technician": other_technician,
    }


def create_order(client, login, records):
    response = client.post("/lab/orders", json={
        "patient_id": records["patient"].id,
        "appointment_id": records["appointment"].id,
        "test_ids": [records["test"].id],
        "instructions": "Fasting sample; process urgently",
        "priority": "urgent",
    }, headers=headers(login(records["doctor_user"])))
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_guarded_lab_order_to_final_result_workflow(
    client, db, create_user, login
):
    records = laboratory_case(db, create_user)
    order_id = create_order(client, login, records)
    auth = headers(login(records["technician"]))

    dashboard = client.get("/lab/dashboard", headers=auth)
    assert dashboard.status_code == 200
    assert dashboard.json()["pending_lab_orders"] == 1
    listed = client.get("/lab/orders", headers=auth)
    assert listed.status_code == 200
    assert listed.json()[0]["priority"] == "urgent"
    assert listed.json()[0]["instructions"] == "Fasting sample; process urgently"

    accepted = client.post(f"/lab/orders/{order_id}/accept", headers=auth)
    assert accepted.status_code == 200, accepted.text
    item_id = accepted.json()["items"][0]["id"]
    assert accepted.json()["assigned_technician_id"] == records["technician"].id

    assert client.post(f"/lab/order-items/{item_id}/start", headers=auth).status_code == 409
    assert client.post("/lab/results", json={
        "order_item_id": item_id, "numeric_value": "12.4", "unit": "g/dL",
    }, headers=auth).status_code == 409

    sample = client.post(f"/lab/order-items/{item_id}/sample", json={
        "order_item_id": item_id, "sample_type": "Blood", "barcode": "CBC-0001",
    }, headers=auth)
    assert sample.status_code == 200, sample.text
    assert sample.json()["items"][0]["status"] == "sample_collected"

    started = client.post(f"/lab/order-items/{item_id}/start", headers=auth)
    assert started.status_code == 200
    assert started.json()["status"] == "processing"

    entered = client.post("/lab/results", json={
        "order_item_id": item_id,
        "result_value": "Within expected range",
        "numeric_value": "12.4", "unit": "g/dL",
        "reference_range": "12.0-16.0", "remarks": "No abnormal flags",
    }, headers=auth)
    assert entered.status_code == 201, entered.text
    result_id = entered.json()["id"]
    assert entered.json()["status"] == "draft"
    assert entered.json()["patient_id"] == records["patient"].id
    assert entered.json()["test_id"] == records["test"].id
    assert entered.json()["technician_id"] == records["technician"].id
    assert entered.json()["created_at"]

    updated = client.put(f"/lab/results/{result_id}", json={
        "remarks": "Reviewed before finalization",
    }, headers=auth)
    assert updated.status_code == 200

    finalized = client.post(f"/lab/results/{result_id}/finalize", headers=auth)
    assert finalized.status_code == 200, finalized.text
    assert finalized.json()["status"] == "finalized"
    assert finalized.json()["finalized_at"]
    db.expire_all()
    assert db.get(LabOrder, order_id).status == "completed"
    assert db.get(LabOrderItem, item_id).status == "completed"
    assert db.query(LabSample).filter_by(order_item_id=item_id).one().status == "completed"

    assert client.put(
        f"/lab/results/{result_id}", json={"result_value": "silently changed"}, headers=auth,
    ).status_code == 409
    assert client.post(f"/lab/results/{result_id}/finalize", headers=auth).status_code == 409
    assert client.delete(f"/lab/results/{result_id}", headers=auth).status_code == 405
    db.expire_all()
    assert db.get(LabResult, result_id).result_value == "Within expected range"
    assert db.query(AuditLog).filter_by(action="laboratory.result_finalized").count() == 1


def test_assigned_order_is_private_to_accepting_technician(
    client, db, create_user, login
):
    records = laboratory_case(db, create_user)
    order_id = create_order(client, login, records)
    owner_auth = headers(login(records["technician"]))
    other_auth = headers(login(records["other_technician"]))
    assert client.get(f"/lab/orders/{order_id}", headers=other_auth).status_code == 200
    assert client.post(f"/lab/orders/{order_id}/accept", headers=owner_auth).status_code == 200
    assert client.get(f"/lab/orders/{order_id}", headers=other_auth).status_code == 403
    assert all(
        order["id"] != order_id
        for order in client.get("/lab/orders", headers=other_auth).json()
    )
    assert client.post(f"/lab/orders/{order_id}/accept", headers=other_auth).status_code == 403


def test_lab_technician_permissions_and_cross_department_denial(
    client, db, create_user, login
):
    records = laboratory_case(db, create_user)
    auth = headers(login(records["technician"]))
    permissions = get_role_permissions("lab_technician")
    assert permissions == {
        Permission.laboratory_view.value,
        Permission.laboratory_sample.value,
        Permission.laboratory_result.value,
    }
    assert client.get(
        f"/patients/{records['patient'].id}/history", headers=auth,
    ).status_code == 403
    assert client.post(
        "/prescriptions/", json={"appointment_id": records["appointment"].id}, headers=auth,
    ).status_code == 403
    assert client.get("/pharmacy/dashboard", headers=auth).status_code == 403
    assert client.get("/radiology/dashboard", headers=auth).status_code == 403
    assert client.get("/billing/", headers=auth).status_code == 403
    assert client.get("/admin/overview", headers=auth).status_code == 403


def test_only_doctor_can_create_lab_order(client, db, create_user, login):
    records = laboratory_case(db, create_user)
    payload = {
        "patient_id": records["patient"].id,
        "test_ids": [records["test"].id],
    }
    technician_auth = headers(login(records["technician"]))
    assert client.post("/lab/orders", json=payload, headers=technician_auth).status_code == 403
