from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

from app.models.all_models import (
    Appointment,
    Billing,
    Department,
    Doctor,
    Employee,
    FinancialTransaction,
    Patient,
)


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def create_operational_records(db, create_user):
    manager = create_user("hospital_manager", email="manager@example.com")
    admin = create_user("admin", email="manager-admin@example.com")
    doctor_user = create_user("doctor", email="manager-doctor@example.com")
    receptionist = create_user("receptionist", email="manager-reception@example.com")
    nurse = create_user("nurse", email="manager-nurse@example.com")
    department = Department(name="General Medicine", description="General care", status="active")
    patient = Patient(name="Operations Patient", age=38, gender="female", contact="5550100", address="Private address", blood_group="O+")
    db.add_all([department, patient])
    db.flush()
    doctor = Doctor(
        user_id=doctor_user.id,
        name="Operations Doctor",
        specialization="General Medicine",
        department_id=department.department_id,
        consultation_fee=Decimal("800.00"),
        timing_start=time(8, 0),
        timing_end=time(18, 0),
        status="active",
    )
    db.add(doctor)
    db.flush()
    completed = Appointment(
        patient_id=patient.id,
        doctor_id=doctor.id,
        appt_date=date.today(),
        appt_time=time(9, 0),
        reason="Completed review",
        status="completed",
    )
    checked_in = Appointment(
        patient_id=patient.id,
        doctor_id=doctor.id,
        appt_date=date.today(),
        appt_time=time(10, 0),
        reason="Waiting review",
        status="checked_in",
        checked_in_at=datetime.now(),
    )
    db.add_all([completed, checked_in])
    db.flush()
    bill = Billing(
        patient_id=patient.id,
        appointment_id=completed.id,
        amount=Decimal("800.00"),
        status="paid",
        payment_method="cash",
        paid_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(bill)
    db.flush()
    db.add(FinancialTransaction(
        transaction_type="payment",
        amount=bill.amount,
        reference_id=bill.id,
        reference_type="billing",
        payment_method="cash",
        recorded_by=receptionist.id,
        transaction_date=datetime.now(timezone.utc).replace(tzinfo=None),
    ))
    employee = db.query(Employee).filter(Employee.user_id == receptionist.id).one()
    employee.shift_start = time(8, 0)
    employee.shift_end = time(16, 0)
    db.commit()
    return {
        "manager": manager,
        "admin": admin,
        "doctor": doctor,
        "department": department,
        "patient": patient,
        "completed": completed,
        "checked_in": checked_in,
        "receptionist": receptionist,
        "nurse": nurse,
    }


def test_manager_operational_endpoints_require_exact_manager_role(
    client, db, create_user, login
):
    records = create_operational_records(db, create_user)
    manager_auth = headers(login(records["manager"]))
    for endpoint in (
        "/manager/overview",
        "/manager/appointments",
        "/manager/patients",
        "/manager/doctors",
        "/manager/staff",
        "/manager/bills",
        "/manager/departments",
        "/manager/reports",
        "/manager/analytics/doctors",
        "/manager/analytics/departments",
    ):
        assert client.get(endpoint, headers=manager_auth).status_code == 200

    assert client.get(
        "/manager/overview", headers=headers(login(records["admin"]))
    ).status_code == 403
    patient_user = create_user("patient")
    assert client.get(
        "/manager/overview", headers=headers(login(patient_user))
    ).status_code == 403


def test_manager_dashboard_and_appointment_filters_return_operational_data(
    client, db, create_user, login
):
    records = create_operational_records(db, create_user)
    auth = headers(login(records["manager"]))
    overview = client.get("/manager/overview", headers=auth)
    filtered = client.get(
        f'/manager/appointments?target_date={date.today()}&doctor_id={records["doctor"].id}'
        f'&department_id={records["department"].department_id}&status=checked_in',
        headers=auth,
    )

    assert overview.status_code == 200
    assert overview.json()["today_appointments"] == 2
    assert overview.json()["total_appointments"] == 2
    assert overview.json()["completed_consultations"] == 1
    assert overview.json()["total_completed_consultations"] == 1
    assert overview.json()["patient_flow"]["checked_in"] == 1
    assert overview.json()["active_doctors"] == 1
    assert filtered.status_code == 200
    assert [item["id"] for item in filtered.json()] == [records["checked_in"].id]
    assert filtered.json()[0]["patient_name"] == "Operations Patient"
    assert filtered.json()[0]["department_name"] == "General Medicine"


def test_manager_reports_separate_selected_date_metrics_from_overall_totals(
    client, db, create_user, login
):
    records = create_operational_records(db, create_user)
    future_completed = Appointment(
        patient_id=records["patient"].id,
        doctor_id=records["doctor"].id,
        appt_date=date.today() + timedelta(days=1),
        appt_time=time(11, 0),
        reason="Future scheduled appointment completed early",
        status="completed",
    )
    db.add(future_completed)
    db.flush()
    future_bill = Billing(
        patient_id=records["patient"].id,
        appointment_id=future_completed.id,
        amount=Decimal("700.00"),
        status="paid",
        payment_method="upi",
        paid_at=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=1),
    )
    db.add(future_bill)
    db.flush()
    db.add(FinancialTransaction(
        transaction_type="payment",
        amount=future_bill.amount,
        reference_id=future_bill.id,
        reference_type="billing",
        payment_method="upi",
        recorded_by=records["receptionist"].id,
        transaction_date=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=1),
    ))
    db.commit()

    auth = headers(login(records["manager"]))
    overview = client.get("/manager/overview", headers=auth).json()
    report = client.get(f"/manager/reports?target_date={date.today()}", headers=auth).json()
    dated_doctors = client.get(
        f"/manager/analytics/doctors?target_date={date.today()}", headers=auth,
    ).json()
    all_doctors = client.get("/manager/analytics/doctors", headers=auth).json()
    dated_departments = client.get(
        f"/manager/analytics/departments?target_date={date.today()}", headers=auth,
    ).json()
    bills = client.get(
        f"/manager/bills?target_date={date.today()}", headers=auth,
    ).json()
    new_patients = client.get(
        f"/manager/patients?registered_on={date.today()}", headers=auth,
    ).json()

    assert overview["today_appointments"] == 2
    assert overview["total_appointments"] == 3
    assert overview["completed_consultations"] == 1
    assert overview["total_completed_consultations"] == 2
    assert report["appointment_count"] == 2
    assert report["completed_consultations"] == 1
    assert report["revenue_summary"] == "800.00"
    assert report["total_revenue_summary"] == "1500.00"
    assert report["paid_bills"] == 1
    assert report["total_paid_bills"] == 2
    assert dated_doctors[0]["appointments_completed"] == 1
    assert all_doctors[0]["appointments_completed"] == 2
    assert dated_departments[0]["appointment_count"] == 2
    assert len(bills) == 1
    assert bills[0]["patient_name"] == "Operations Patient"
    assert bills[0]["amount"] == "800.00"
    assert "receipt_no" not in bills[0]
    assert "collected_by" not in bills[0]
    assert len(new_patients) == 1
    assert new_patients[0]["created_at"]


def test_manager_patient_view_excludes_clinical_and_private_profile_fields(
    client, db, create_user, login
):
    records = create_operational_records(db, create_user)
    auth = headers(login(records["manager"]))
    response = client.get("/manager/patients", headers=auth)

    assert response.status_code == 200
    patient = response.json()[0]
    assert patient["id"] == records["patient"].id
    assert patient["appointment_count"] == 2
    assert "address" not in patient
    assert "blood_group" not in patient
    assert "user_id" not in patient
    assert client.get(
        f'/patients/{records["patient"].id}/history', headers=auth
    ).status_code == 403


def test_manager_doctor_and_staff_views_are_read_only_operational_summaries(
    client, db, create_user, login
):
    records = create_operational_records(db, create_user)
    additional_roles = {
        "pharmacist",
        "lab_technician",
        "radiologist",
        "accountant",
        "insurance_officer",
        "ambulance_staff",
    }
    for role in additional_roles:
        create_user(role, email=f"manager-{role}@example.com")
    create_user("super_admin", email="manager-super-admin@example.com")
    create_user("patient", email="manager-patient@example.com")
    auth = headers(login(records["manager"]))
    doctors = client.get("/manager/doctors", headers=auth)
    staff = client.get("/manager/staff", headers=auth)

    assert doctors.status_code == 200
    assert doctors.json()[0]["appointments_today"] == 2
    assert doctors.json()[0]["department_name"] == "General Medicine"
    assert staff.status_code == 200
    staff_roles = {member["role"] for member in staff.json()}
    assert staff_roles == {
        "hospital_manager",
        "doctor",
        "receptionist",
        "nurse",
        *additional_roles,
    }
    doctor_staff = next(member for member in staff.json() if member["role"] == "doctor")
    assert doctor_staff["designation"] == "General Medicine"
    assert doctor_staff["department_name"] == "General Medicine"
    assert doctor_staff["shift_start"] == "08:00:00"
    assert {"admin", "super_admin", "patient"}.isdisjoint(staff_roles)
    assert all("email" not in member for member in staff.json())


def test_manager_staff_view_shows_shift_assigned_by_admin_for_other_roles(
    client, db, create_user, login
):
    manager = create_user("hospital_manager")
    admin = create_user("admin")
    nurse = create_user("nurse")

    updated = client.patch(
        f"/admin/staff/{nurse.id}/shift",
        json={"shift_start": "22:00:00", "shift_end": "06:00:00"},
        headers=headers(login(admin)),
    )
    staff = client.get("/manager/staff", headers=headers(login(manager)))

    assert updated.status_code == 200
    nurse_summary = next(item for item in staff.json() if item["id"] == nurse.id)
    assert nurse_summary["shift_start"] == "22:00:00"
    assert nurse_summary["shift_end"] == "06:00:00"


def test_manager_cannot_mutate_clinical_financial_staff_or_department_data(
    client, db, create_user, login
):
    records = create_operational_records(db, create_user)
    auth = headers(login(records["manager"]))
    appointment = records["checked_in"]

    assert client.patch(f"/appointments/{appointment.id}/checkin", headers=auth).status_code == 403
    assert client.patch(f"/appointments/{appointment.id}/start", headers=auth).status_code == 403
    assert client.post(
        "/prescriptions/",
        json={"appointment_id": appointment.id, "diagnosis": "No", "medicine": "No", "dosage": "No"},
        headers=auth,
    ).status_code == 403
    assert client.post(
        "/admin/staff",
        json={"name": "Denied", "email": "denied@example.com", "password": "Strong1!Password", "role": "nurse"},
        headers=auth,
    ).status_code == 403
    assert client.post(
        "/manager/departments",
        json={"name": "Denied", "status": "active"},
        headers=auth,
    ).status_code in (404, 405)


def test_manager_permissions_exclude_specialized_and_security_operations(
    client, db, create_user, login
):
    records = create_operational_records(db, create_user)
    response = client.get("/auth/me", headers=headers(login(records["manager"])))
    permissions = set(response.json()["effective_permissions"])

    assert {
        "patients.view",
        "doctors.view",
        "appointments.view",
        "staff.view",
        "reports.view",
        "billing.report",
        "departments.view",
    }.issubset(permissions)
    assert not permissions.intersection({
        "appointments.update",
        "appointments.checkin",
        "consultations.update",
        "prescriptions.create",
        "billing.collect",
        "staff.create",
        "staff.manage_roles",
        "departments.manage",
        "pharmacy.view",
        "laboratory.view",
        "radiology.view",
        "accounting.view",
        "insurance.view",
        "ambulance.view",
        "ambulance.dispatch",
    })
