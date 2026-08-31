from datetime import date, time, timedelta
from decimal import Decimal

from app.models.all_models import Appointment, Billing, Doctor, Patient


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_revoked_receptionist_permissions_block_mutation_apis(
    client, db, create_user, login
):
    receptionist = create_user(
        "receptionist",
        receptionist_permissions={
            "can_register_patient": False,
            "can_schedule_appointment": False,
            "can_checkin_patient": False,
            "can_collect_billing": False,
        },
    )
    doctor_user = create_user("doctor")
    doctor = Doctor(user_id=doctor_user.id, name="Dr Front Desk", status="active")
    patient = Patient(name="Walk In", contact="5550102")
    db.add_all([doctor, patient])
    db.flush()
    appointment = Appointment(
        patient_id=patient.id,
        doctor_id=doctor.id,
        appt_date=date.today(),
        appt_time=time(23, 59),
        status="confirmed",
    )
    db.add(appointment)
    db.flush()
    bill = Billing(
        patient_id=patient.id,
        appointment_id=appointment.id,
        amount=Decimal("500.00"),
        status="pending",
    )
    db.add(bill)
    db.commit()
    auth = headers(login(receptionist))

    assert client.get("/patients/", headers=auth).status_code == 200
    assert client.post(
        "/patients/", json={"name": "Blocked"}, headers=auth
    ).status_code == 403
    assert client.post(
        "/appointments/",
        json={
            "patient_id": patient.id,
            "doctor_id": doctor.id,
            "appt_date": str(date.today() + timedelta(days=1)),
            "appt_time": "10:00:00",
        },
        headers=auth,
    ).status_code == 403
    assert client.patch(
        f"/appointments/{appointment.id}/confirm", headers=auth
    ).status_code == 403
    assert client.patch(
        f"/appointments/{appointment.id}/checkin", headers=auth
    ).status_code == 403
    assert client.post(
        f"/billing/{bill.id}/collect?payment_method=cash", headers=auth
    ).status_code == 403


def test_receptionist_booking_rejects_past_time_and_patient_collision(
    client, db, create_user, login
):
    receptionist = create_user(
        "receptionist",
        receptionist_permissions={"can_schedule_appointment": True},
    )
    first_doctor_user = create_user("doctor")
    second_doctor_user = create_user("doctor")
    first_doctor = Doctor(user_id=first_doctor_user.id, name="Dr One", status="active")
    second_doctor = Doctor(user_id=second_doctor_user.id, name="Dr Two", status="active")
    patient = Patient(name="Collision Patient")
    db.add_all([first_doctor, second_doctor, patient])
    db.commit()
    auth = headers(login(receptionist))

    past = client.post(
        "/appointments/",
        json={
            "patient_id": patient.id,
            "doctor_id": first_doctor.id,
            "appt_date": str(date.today()),
            "appt_time": "00:00:00",
        },
        headers=auth,
    )
    assert past.status_code == 400
    assert past.json()["detail"] == "Appointment time cannot be in the past"

    future_date = date.today() + timedelta(days=1)
    db.add(Appointment(
        patient_id=patient.id,
        doctor_id=first_doctor.id,
        appt_date=future_date,
        appt_time=time(10, 0),
        status="requested",
    ))
    db.commit()
    duplicate = client.post(
        "/appointments/",
        json={
            "patient_id": patient.id,
            "doctor_id": second_doctor.id,
            "appt_date": str(future_date),
            "appt_time": "10:00:00",
        },
        headers=auth,
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "Patient already has an appointment in this time slot"
