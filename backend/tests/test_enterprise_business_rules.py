from datetime import date, time, timedelta
from decimal import Decimal

import pytest

from app.models.all_models import (
    Appointment,
    Billing,
    Doctor,
    NursingTask,
    Patient,
    PatientVital,
    Prescription,
)


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.parametrize(
    ("role", "endpoint"),
    [
        ("super_admin", "/super-admin/hospitals"),
        ("hospital_manager", "/manager/overview"),
        ("nurse", "/nurse/dashboard"),
        ("pharmacist", "/pharmacy/medicines"),
        ("lab_technician", "/lab/dashboard"),
        ("radiologist", "/radiology/dashboard"),
        ("accountant", "/accountant/dashboard"),
        ("insurance_officer", "/insurance/dashboard"),
        ("ambulance_staff", "/ambulance/dashboard"),
    ],
)
def test_operational_endpoints_allow_owner_role_and_deny_patient(
    client, create_user, login, role, endpoint
):
    owner = create_user(role)
    patient = create_user("patient")

    assert client.get(endpoint, headers=headers(login(owner))).status_code == 200
    assert client.get(endpoint, headers=headers(login(patient))).status_code == 403


@pytest.mark.parametrize(
    "endpoint",
    [
        "/nurse/dashboard",
        "/pharmacy/medicines",
        "/lab/dashboard",
        "/radiology/dashboard",
        "/accountant/dashboard",
        "/insurance/dashboard",
        "/ambulance/dashboard",
    ],
)
def test_manager_can_view_enterprise_module_dashboards(
    client, create_user, login, endpoint
):
    manager = create_user("hospital_manager")

    assert client.get(endpoint, headers=headers(login(manager))).status_code == 200


def test_appointment_booking_rejects_doctor_slot_collision(
    client, db, create_user, login
):
    patient_user = create_user("patient")
    doctor_user = create_user("doctor")
    patient = Patient(user_id=patient_user.id, name="Patient One")
    doctor = Doctor(
        user_id=doctor_user.id,
        name="Doctor One",
        status="active",
        timing_start=time(8, 0),
        timing_end=time(18, 0),
        consultation_fee=Decimal("750.00"),
    )
    db.add_all([patient, doctor])
    db.commit()
    payload = {
        "patient_id": patient.id,
        "doctor_id": doctor.id,
        "appt_date": str(date.today() + timedelta(days=1)),
        "appt_time": "10:30:00",
        "reason": "Follow-up",
    }
    auth = headers(login(patient_user))

    assert client.post("/appointments/", json=payload, headers=auth).status_code == 201
    collision = client.post("/appointments/", json=payload, headers=auth)
    assert collision.status_code == 409


def test_consultation_uses_configured_decimal_fee_and_is_idempotent(
    client, db, create_user, login
):
    patient_user = create_user("patient")
    doctor_user = create_user("doctor")
    patient = Patient(user_id=patient_user.id, name="Patient One")
    doctor = Doctor(
        user_id=doctor_user.id,
        name="Doctor One",
        status="active",
        consultation_fee=Decimal("875.50"),
    )
    db.add_all([patient, doctor])
    db.flush()
    appointment = Appointment(
        patient_id=patient.id,
        doctor_id=doctor.id,
        appt_date=date.today(),
        appt_time=time(10, 0),
        status="checked_in",
    )
    db.add(appointment)
    db.commit()
    payload = {
        "appointment_id": appointment.id,
        "diagnosis": "Stable",
        "medicine": "Medicine A",
        "dosage": "Once daily",
    }
    auth = headers(login(doctor_user))

    first = client.post("/prescriptions/", json=payload, headers=auth)
    second = client.post("/prescriptions/", json=payload, headers=auth)
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] == second.json()["id"]
    assert db.query(Prescription).filter_by(appointment_id=appointment.id).count() == 1
    bill = db.query(Billing).filter_by(appointment_id=appointment.id).one()
    assert bill.amount == Decimal("875.50")


def test_nurse_can_only_access_assigned_patient(
    client, db, create_user, login
):
    nurse = create_user("nurse")
    assigned = Patient(name="Assigned Patient")
    unassigned = Patient(name="Unassigned Patient")
    db.add_all([assigned, unassigned])
    db.flush()
    db.add(NursingTask(
        patient_id=assigned.id,
        assigned_nurse_id=nurse.id,
        task_type="vitals",
        description="Record observations",
        priority="medium",
        status="pending",
    ))
    db.commit()
    auth = headers(login(nurse))

    visible = client.get("/nurse/patients", headers=auth)
    assert visible.status_code == 200
    assert [record["id"] for record in visible.json()] == [assigned.id]
    assert client.post(
        "/nurse/vitals",
        json={"patient_id": assigned.id, "temperature": "37.2"},
        headers=auth,
    ).status_code == 201
    assert client.post(
        "/nurse/vitals",
        json={"patient_id": unassigned.id, "temperature": "37.2"},
        headers=auth,
    ).status_code == 403


def test_doctor_clinical_data_requires_patient_assignment(
    client, db, create_user, login
):
    doctor_user = create_user("doctor")
    doctor = Doctor(user_id=doctor_user.id, name="Doctor One", status="active")
    assigned = Patient(name="Assigned Patient")
    unassigned = Patient(name="Unassigned Patient")
    db.add_all([doctor, assigned, unassigned])
    db.flush()
    db.add_all([
        Appointment(
            patient_id=assigned.id,
            doctor_id=doctor.id,
            appt_date=date.today(),
            appt_time=time(9, 0),
            status="confirmed",
        ),
        PatientVital(patient_id=assigned.id, recorded_by=doctor_user.id, pulse=72),
        PatientVital(patient_id=unassigned.id, recorded_by=doctor_user.id, pulse=80),
    ])
    db.commit()
    auth = headers(login(doctor_user))

    assigned_response = client.get(
        f"/doctors/patients/{assigned.id}/vitals", headers=auth
    )
    assert assigned_response.status_code == 200
    assert [record["patient_id"] for record in assigned_response.json()] == [assigned.id]
    assert client.get(
        f"/doctors/patients/{unassigned.id}/vitals", headers=auth
    ).status_code == 403
