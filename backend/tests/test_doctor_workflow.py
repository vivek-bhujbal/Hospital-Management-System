from datetime import date, time
from decimal import Decimal

from app.models.all_models import Appointment, Billing, Doctor, Patient, Prescription


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def create_clinical_records(db, create_user):
    doctor_user = create_user("doctor", email="doctor-one@example.com")
    other_doctor_user = create_user("doctor", email="doctor-two@example.com")
    doctor = Doctor(
        user_id=doctor_user.id,
        name="Doctor One",
        status="active",
        consultation_fee=Decimal("950.00"),
    )
    other_doctor = Doctor(
        user_id=other_doctor_user.id,
        name="Doctor Two",
        status="active",
        consultation_fee=Decimal("700.00"),
    )
    assigned_patient = Patient(name="Assigned Patient", age=31, gender="female")
    other_patient = Patient(name="Other Patient", age=45, gender="male")
    db.add_all([doctor, other_doctor, assigned_patient, other_patient])
    db.flush()
    assigned_appointment = Appointment(
        patient_id=assigned_patient.id,
        doctor_id=doctor.id,
        appt_date=date.today(),
        appt_time=time(9, 0),
        reason="Review",
        status="checked_in",
    )
    other_appointment = Appointment(
        patient_id=other_patient.id,
        doctor_id=other_doctor.id,
        appt_date=date.today(),
        appt_time=time(10, 0),
        reason="Follow-up",
        status="checked_in",
    )
    db.add_all([assigned_appointment, other_appointment])
    db.commit()
    return {
        "doctor_user": doctor_user,
        "other_doctor_user": other_doctor_user,
        "doctor": doctor,
        "other_doctor": other_doctor,
        "assigned_patient": assigned_patient,
        "other_patient": other_patient,
        "assigned_appointment": assigned_appointment,
        "other_appointment": other_appointment,
    }


def test_doctor_appointment_listing_is_always_scoped_to_own_profile(
    client, db, create_user, login
):
    records = create_clinical_records(db, create_user)
    auth = headers(login(records["doctor_user"]))

    unfiltered = client.get("/appointments/", headers=auth)
    mine = client.get("/appointments/?doctor_id=me", headers=auth)
    other = client.get(
        f'/appointments/?doctor_id={records["other_doctor"].id}', headers=auth
    )

    assert unfiltered.status_code == 200
    assert [item["id"] for item in unfiltered.json()] == [records["assigned_appointment"].id]
    assert [item["id"] for item in mine.json()] == [records["assigned_appointment"].id]
    assert other.status_code == 403


def test_doctor_patient_directory_and_history_are_assignment_scoped(
    client, db, create_user, login
):
    records = create_clinical_records(db, create_user)
    auth = headers(login(records["doctor_user"]))

    directory = client.get("/patients/", headers=auth)
    assigned_history = client.get(
        f'/patients/{records["assigned_patient"].id}/history', headers=auth
    )
    other_history = client.get(
        f'/patients/{records["other_patient"].id}/history', headers=auth
    )
    missing_history = client.get("/patients/999999/history", headers=auth)

    assert directory.status_code == 200
    assert [patient["id"] for patient in directory.json()] == [records["assigned_patient"].id]
    assert assigned_history.status_code == 200
    assert assigned_history.json()["patient"]["id"] == records["assigned_patient"].id
    assert other_history.status_code == 403
    assert missing_history.status_code == 404


def test_only_own_confirmed_or_checked_in_appointment_can_be_started(
    client, db, create_user, login
):
    records = create_clinical_records(db, create_user)
    doctor_auth = headers(login(records["doctor_user"]))
    other_doctor_auth = headers(login(records["other_doctor_user"]))
    appointment = records["assigned_appointment"]

    assert client.patch(
        f"/appointments/{appointment.id}/start", headers=other_doctor_auth
    ).status_code == 403
    appointment.status = "requested"
    db.commit()
    assert client.patch(
        f"/appointments/{appointment.id}/start", headers=doctor_auth
    ).status_code == 409
    appointment.status = "confirmed"
    db.commit()
    assert client.patch(
        f"/appointments/{appointment.id}/start", headers=doctor_auth
    ).status_code == 200
    db.refresh(appointment)
    assert appointment.status == "in_progress"
    appointment.status = "checked_in"
    db.commit()
    assert client.patch(
        f"/appointments/{appointment.id}/start", headers=doctor_auth
    ).status_code == 200
    assert client.patch(
        f"/appointments/{appointment.id}/start", headers=doctor_auth
    ).status_code == 200
    db.refresh(appointment)
    assert appointment.status == "in_progress"


def test_doctor_can_confirm_and_check_in_only_an_assigned_appointment(
    client, db, create_user, login
):
    records = create_clinical_records(db, create_user)
    doctor_auth = headers(login(records["doctor_user"]))
    assigned = records["assigned_appointment"]
    other = records["other_appointment"]
    assigned.status = "requested"
    other.status = "requested"
    db.commit()

    assert client.patch(
        f"/appointments/{other.id}/confirm", headers=doctor_auth
    ).status_code == 403
    assert client.patch(
        f"/appointments/{assigned.id}/confirm", headers=doctor_auth
    ).status_code == 200
    assert client.patch(
        f"/appointments/{other.id}/checkin", headers=doctor_auth
    ).status_code == 403
    assert client.patch(
        f"/appointments/{assigned.id}/checkin", headers=doctor_auth
    ).status_code == 200

    db.refresh(assigned)
    db.refresh(other)
    assert assigned.status == "checked_in"
    assert other.status == "requested"


def test_consultation_requires_in_progress_and_creates_exactly_one_bill(
    client, db, create_user, login
):
    records = create_clinical_records(db, create_user)
    appointment = records["assigned_appointment"]
    auth = headers(login(records["doctor_user"]))
    payload = {
        "appointment_id": appointment.id,
        "diagnosis": "Viral infection",
        "medicine": "Medicine A",
        "dosage": "Twice daily",
        "notes": "After food",
    }

    assert client.post("/prescriptions/", json=payload, headers=auth).status_code == 409
    assert client.patch(f"/appointments/{appointment.id}/start", headers=auth).status_code == 200
    first = client.post("/prescriptions/", json=payload, headers=auth)
    repeated = client.post("/prescriptions/", json=payload, headers=auth)

    assert first.status_code == 201
    assert repeated.status_code == 201
    assert first.json()["id"] == repeated.json()["id"]
    db.refresh(appointment)
    assert appointment.status == "completed"
    assert db.query(Prescription).filter_by(appointment_id=appointment.id).count() == 1
    bills = db.query(Billing).filter_by(appointment_id=appointment.id).all()
    assert len(bills) == 1
    assert bills[0].status == "pending"
    assert bills[0].amount == Decimal("950.00")


def test_non_doctor_cannot_start_or_complete_consultation(
    client, db, create_user, login
):
    records = create_clinical_records(db, create_user)
    receptionist = create_user("receptionist")
    admin = create_user("admin")
    appointment = records["assigned_appointment"]
    payload = {
        "appointment_id": appointment.id,
        "diagnosis": "Diagnosis",
        "medicine": "Medicine",
        "dosage": "Daily",
    }

    assert client.patch(
        f"/appointments/{appointment.id}/start", headers=headers(login(receptionist))
    ).status_code == 403
    assert client.post(
        "/prescriptions/", json=payload, headers=headers(login(admin))
    ).status_code == 403
