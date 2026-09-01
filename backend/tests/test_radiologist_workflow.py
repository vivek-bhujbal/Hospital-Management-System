from datetime import date, time

from app.core.permissions import Permission, get_role_permissions
from app.models.all_models import (
    Appointment, AuditLog, Doctor, Patient, RadiologyModality,
    RadiologyOrder, RadiologyReport, RadiologyStudy,
)


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def radiology_case(db, create_user):
    doctor_user = create_user("doctor")
    patient_user = create_user("patient")
    radiologist = create_user("radiologist")
    other_radiologist = create_user("radiologist")
    doctor = Doctor(user_id=doctor_user.id, name="Dr. Imaging", status="active")
    patient = Patient(user_id=patient_user.id, name="Imaging Patient", age=52, gender="male")
    modality = RadiologyModality(name="MRI", description="Magnetic resonance", status="active")
    db.add_all([doctor, patient, modality])
    db.flush()
    appointment = Appointment(
        patient_id=patient.id, doctor_id=doctor.id, appt_date=date.today(),
        appt_time=time(11, 0), status="in_progress",
    )
    db.add(appointment)
    db.commit()
    return {
        "doctor_user": doctor_user, "patient": patient, "modality": modality,
        "appointment": appointment, "radiologist": radiologist,
        "other_radiologist": other_radiologist,
    }


def create_order(client, login, records):
    response = client.post("/radiology/orders", json={
        "patient_id": records["patient"].id,
        "appointment_id": records["appointment"].id,
        "modality_id": records["modality"].id,
        "body_part": "Brain",
        "clinical_notes": "Persistent headache; exclude structural lesion",
        "priority": "urgent",
    }, headers=headers(login(records["doctor_user"])))
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_imaging_review_report_finalization_and_amendment(
    client, db, create_user, login
):
    records = radiology_case(db, create_user)
    order_id = create_order(client, login, records)
    auth = headers(login(records["radiologist"]))

    dashboard = client.get("/radiology/dashboard", headers=auth)
    assert dashboard.status_code == 200
    assert dashboard.json()["pending_imaging_orders"] == 1
    listed = client.get("/radiology/orders", headers=auth)
    assert listed.status_code == 200
    assert listed.json()[0]["modality_name"] == "MRI"
    assert listed.json()[0]["clinical_indication"].startswith("Persistent headache")

    assert client.post(f"/radiology/orders/{order_id}/start-review", headers=auth).status_code == 409
    study = client.post(f"/radiology/orders/{order_id}/study", json={
        "order_id": order_id, "study_identifier": "MRI-2026-0001",
        "storage_reference": "pacs://study/MRI-2026-0001",
    }, headers=auth)
    assert study.status_code == 201, study.text
    study_id = study.json()["study"]["id"]
    started = client.post(f"/radiology/orders/{order_id}/start-review", headers=auth)
    assert started.status_code == 200, started.text
    assert started.json()["status"] == "reviewing"
    assert started.json()["assigned_radiologist_id"] == records["radiologist"].id

    draft = client.post("/radiology/reports", json={
        "study_id": study_id, "findings": "No acute intracranial abnormality.",
        "impression": "Normal MRI brain.", "radiologist_notes": "Images reviewed in full.",
    }, headers=auth)
    assert draft.status_code == 201, draft.text
    report_id = draft.json()["id"]
    assert draft.json()["status"] == "draft"
    assert draft.json()["patient_id"] == records["patient"].id
    assert draft.json()["radiologist_id"] == records["radiologist"].id

    updated = client.put(f"/radiology/reports/{report_id}", json={
        "radiologist_notes": "Comparison imaging unavailable.",
    }, headers=auth)
    assert updated.status_code == 200
    finalized = client.post(f"/radiology/reports/{report_id}/finalize", headers=auth)
    assert finalized.status_code == 200, finalized.text
    assert finalized.json()["status"] == "finalized"
    assert finalized.json()["finalized_at"]
    db.expire_all()
    assert db.get(RadiologyOrder, order_id).status == "completed"

    assert client.put(
        f"/radiology/reports/{report_id}", json={"impression": "Silent change"}, headers=auth,
    ).status_code == 409
    assert client.delete(f"/radiology/reports/{report_id}", headers=auth).status_code == 405
    assert client.post(
        f"/radiology/reports/{report_id}/amend", json={}, headers=auth,
    ).status_code == 422

    amended = client.post(f"/radiology/reports/{report_id}/amend", json={
        "amendment_reason": "Additional clinical history received",
        "impression": "Normal MRI brain; no structural cause identified.",
    }, headers=auth)
    assert amended.status_code == 201, amended.text
    amendment_id = amended.json()["id"]
    assert amended.json()["parent_report_id"] == report_id
    assert amended.json()["version"] == 2
    assert amended.json()["status"] == "draft"
    assert client.post(
        f"/radiology/reports/{report_id}/amend",
        json={"amendment_reason": "Duplicate correction"}, headers=auth,
    ).status_code == 409
    assert client.post(
        f"/radiology/reports/{amendment_id}/finalize", headers=auth,
    ).status_code == 200
    db.expire_all()
    original = db.get(RadiologyReport, report_id)
    amendment = db.get(RadiologyReport, amendment_id)
    assert original.impression == "Normal MRI brain."
    assert original.status == "finalized"
    assert amendment.status == "finalized"
    assert amendment.amendment_reason == "Additional clinical history received"
    assert db.query(AuditLog).filter_by(action="radiology.report_finalized").count() == 2


def test_assigned_imaging_order_is_private_to_reviewing_radiologist(
    client, db, create_user, login
):
    records = radiology_case(db, create_user)
    order_id = create_order(client, login, records)
    owner = headers(login(records["radiologist"]))
    other = headers(login(records["other_radiologist"]))
    assert client.post(f"/radiology/orders/{order_id}/study", json={
        "order_id": order_id, "study_identifier": "MRI-PRIVATE-1",
    }, headers=owner).status_code == 201
    assert client.get(f"/radiology/orders/{order_id}", headers=other).status_code == 200
    assert client.post(f"/radiology/orders/{order_id}/start-review", headers=owner).status_code == 200
    assert client.get(f"/radiology/orders/{order_id}", headers=other).status_code == 403
    assert all(
        order["id"] != order_id
        for order in client.get("/radiology/orders", headers=other).json()
    )
    assert client.post(f"/radiology/orders/{order_id}/start-review", headers=other).status_code == 403


def test_radiologist_permissions_and_cross_department_denial(
    client, db, create_user, login
):
    records = radiology_case(db, create_user)
    auth = headers(login(records["radiologist"]))
    assert get_role_permissions("radiologist") == {
        Permission.radiology_view.value, Permission.radiology_report.value,
    }
    assert client.get(
        f"/patients/{records['patient'].id}/history", headers=auth,
    ).status_code == 403
    assert client.post(
        "/prescriptions/", json={"appointment_id": records["appointment"].id}, headers=auth,
    ).status_code == 403
    assert client.get("/lab/dashboard", headers=auth).status_code == 403
    assert client.get("/pharmacy/dashboard", headers=auth).status_code == 403
    assert client.get("/accountant/dashboard", headers=auth).status_code == 403
    assert client.get("/insurance/dashboard", headers=auth).status_code == 403
    assert client.get("/admin/overview", headers=auth).status_code == 403


def test_only_doctor_can_create_radiology_order(client, db, create_user, login):
    records = radiology_case(db, create_user)
    payload = {
        "patient_id": records["patient"].id,
        "modality_id": records["modality"].id,
        "body_part": "Chest",
    }
    assert client.post(
        "/radiology/orders", json=payload,
        headers=headers(login(records["radiologist"])),
    ).status_code == 403
