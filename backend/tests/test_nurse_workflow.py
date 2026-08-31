from datetime import date, datetime, time, timedelta

from app.core.permissions import Permission, get_role_permissions
from app.models.all_models import (
    Appointment,
    AuditLog,
    Doctor,
    NursingNote,
    NursingTask,
    Patient,
    PatientVital,
    Prescription,
)


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def seed_nursing_care(db, create_user):
    nurse = create_user("nurse", email="primary-nurse@example.com")
    other_nurse = create_user("nurse", email="other-nurse@example.com")
    doctor_user = create_user("doctor", email="nurse-workflow-doctor@example.com")
    doctor = Doctor(user_id=doctor_user.id, name="Care Doctor", status="active")
    assigned = Patient(name="Assigned Patient", age=41, blood_group="O+")
    unassigned = Patient(name="Unassigned Patient", age=29)
    other_assigned = Patient(name="Other Nurse Patient", age=35)
    db.add_all([doctor, assigned, unassigned, other_assigned])
    db.flush()
    assigned_appointment = Appointment(
        patient_id=assigned.id,
        doctor_id=doctor.id,
        appt_date=date.today(),
        appt_time=time(10, 0),
        reason="Observation",
        status="checked_in",
    )
    unassigned_appointment = Appointment(
        patient_id=unassigned.id,
        doctor_id=doctor.id,
        appt_date=date.today(),
        appt_time=time(11, 0),
        reason="Private",
        status="confirmed",
    )
    db.add_all([assigned_appointment, unassigned_appointment])
    db.flush()
    assigned_task = NursingTask(
        patient_id=assigned.id,
        assigned_nurse_id=nurse.id,
        task_type="Record vitals",
        description="Record observations before consultation",
        priority="emergency",
        status="pending",
        due_at=datetime.now() + timedelta(hours=1),
    )
    other_task = NursingTask(
        patient_id=other_assigned.id,
        assigned_nurse_id=other_nurse.id,
        task_type="Monitor",
        description="Monitor patient",
        priority="medium",
        status="pending",
    )
    prescription = Prescription(
        appointment_id=assigned_appointment.id,
        diagnosis="Read-only diagnosis",
        medicine="Medicine A",
        dosage="Once daily",
        notes="Doctor instruction",
    )
    historical_vital = PatientVital(
        patient_id=assigned.id,
        appointment_id=assigned_appointment.id,
        recorded_by=other_nurse.id,
        pulse=76,
    )
    note = NursingNote(
        patient_id=assigned.id,
        appointment_id=assigned_appointment.id,
        nurse_id=other_nurse.id,
        note="Existing observation",
    )
    db.add_all([assigned_task, other_task, prescription, historical_vital, note])
    db.commit()
    return {
        "nurse": nurse,
        "other_nurse": other_nurse,
        "doctor_user": doctor_user,
        "doctor": doctor,
        "assigned": assigned,
        "unassigned": unassigned,
        "other_assigned": other_assigned,
        "assigned_appointment": assigned_appointment,
        "unassigned_appointment": unassigned_appointment,
        "assigned_task": assigned_task,
        "other_task": other_task,
    }


def test_nurse_apis_require_exact_role_and_role_is_clinical_support_only(
    client, db, create_user, login
):
    records = seed_nursing_care(db, create_user)
    nurse_auth = headers(login(records["nurse"]))
    assert client.get("/nurse/dashboard", headers=nurse_auth).status_code == 200
    for role in ("admin", "doctor", "hospital_manager", "receptionist", "pharmacist"):
        user = create_user(role)
        assert client.get("/nurse/dashboard", headers=headers(login(user))).status_code == 403

    permissions = get_role_permissions("nurse")
    assert {
        Permission.nursing_view.value,
        Permission.nursing_record_vitals.value,
        Permission.nursing_record_notes.value,
        Permission.nursing_manage_tasks.value,
    }.issubset(permissions)
    forbidden = {
        Permission.patients_update.value,
        Permission.patients_view_medical_history.value,
        Permission.appointments_create.value,
        Permission.appointments_checkin.value,
        Permission.consultations_update.value,
        Permission.prescriptions_create.value,
        Permission.billing_collect.value,
        Permission.pharmacy_dispense.value,
        Permission.laboratory_result.value,
        Permission.radiology_report.value,
        Permission.insurance_claim.value,
        Permission.ambulance_dispatch.value,
        Permission.staff_update.value,
        Permission.settings_manage.value,
    }
    assert permissions.isdisjoint(forbidden)
    assert client.get(
        f"/patients/{records['assigned'].id}/history", headers=nurse_auth,
    ).status_code == 403
    assert client.post(
        "/prescriptions/",
        json={"appointment_id": records["assigned_appointment"].id, "diagnosis": "Denied"},
        headers=nurse_auth,
    ).status_code == 403


def test_dashboard_patients_appointments_and_detail_are_assignment_scoped(
    client, db, create_user, login
):
    records = seed_nursing_care(db, create_user)
    auth = headers(login(records["nurse"]))
    dashboard = client.get("/nurse/dashboard", headers=auth)
    patients = client.get("/nurse/patients", headers=auth)
    appointments = client.get("/nurse/appointments", headers=auth)
    detail = client.get(f"/nurse/patients/{records['assigned'].id}", headers=auth)

    assert dashboard.status_code == 200
    assert dashboard.json()["waiting_patients"] == 1
    assert dashboard.json()["patients_requiring_vitals"] == 1
    assert dashboard.json()["urgent_alerts"][0]["patient_id"] == records["assigned"].id
    assert patients.status_code == 200
    assert [item["id"] for item in patients.json()] == [records["assigned"].id]
    assert appointments.status_code == 200
    assert [item["patient_id"] for item in appointments.json()] == [records["assigned"].id]
    assert detail.status_code == 200
    assert detail.json()["patient"]["blood_group"] == "O+"
    assert "address" not in detail.json()["patient"]
    assert detail.json()["prescriptions"][0]["diagnosis"] == "Read-only diagnosis"
    assert detail.json()["vitals"][0]["pulse"] == 76
    assert detail.json()["nursing_notes"][0]["note"] == "Existing observation"
    assert client.get(
        f"/nurse/patients/{records['unassigned'].id}", headers=auth,
    ).status_code == 403
    assert client.get(
        f"/nurse/vitals/patient/{records['other_assigned'].id}", headers=auth,
    ).status_code == 403


def test_vitals_are_validated_append_only_assignment_scoped_and_audited(
    client, db, create_user, login
):
    records = seed_nursing_care(db, create_user)
    auth = headers(login(records["nurse"]))
    created = client.post(
        "/nurse/vitals",
        json={
            "patient_id": records["assigned"].id,
            "appointment_id": records["assigned_appointment"].id,
            "temperature": "37.4",
            "blood_pressure_systolic": 118,
            "blood_pressure_diastolic": 76,
            "pulse": 79,
            "respiratory_rate": 17,
            "oxygen_saturation": "98.5",
            "weight": "66.2",
            "height": "168.0",
            "notes": "Stable",
        },
        headers=auth,
    )
    assert created.status_code == 201
    assert created.json()["recorded_by"] == records["nurse"].id
    assert db.query(AuditLog).filter_by(action="patient_vital.recorded").count() == 1
    assert client.post(
        "/nurse/vitals",
        json={"patient_id": records["assigned"].id},
        headers=auth,
    ).status_code == 422
    assert client.post(
        "/nurse/vitals",
        json={"patient_id": records["unassigned"].id, "temperature": "37.0"},
        headers=auth,
    ).status_code == 403
    assert client.post(
        "/nurse/vitals",
        json={
            "patient_id": records["assigned"].id,
            "appointment_id": records["unassigned_appointment"].id,
            "temperature": "37.0",
        },
        headers=auth,
    ).status_code == 400
    vital_id = created.json()["id"]
    assert client.put(
        f"/nurse/vitals/{vital_id}", json={"pulse": 10}, headers=auth,
    ).status_code in (404, 405)
    assert client.delete(f"/nurse/vitals/{vital_id}", headers=auth).status_code in (404, 405)


def test_nurse_can_only_start_and_complete_own_tasks_and_add_observations(
    client, db, create_user, login
):
    records = seed_nursing_care(db, create_user)
    auth = headers(login(records["nurse"]))
    task_id = records["assigned_task"].id
    assert client.put(
        f"/nurse/tasks/{task_id}", json={"status": "completed"}, headers=auth,
    ).status_code == 409
    started = client.put(
        f"/nurse/tasks/{task_id}", json={"status": "in_progress"}, headers=auth,
    )
    assert started.status_code == 200
    assert started.json()["status"] == "in_progress"
    assert client.put(
        f"/nurse/tasks/{records['other_task'].id}",
        json={"status": "in_progress"},
        headers=auth,
    ).status_code == 403
    assert client.put(
        f"/nurse/tasks/{task_id}", json={"status": "cancelled"}, headers=auth,
    ).status_code == 422
    completed = client.put(
        f"/nurse/tasks/{task_id}", json={"status": "completed"}, headers=auth,
    )
    assert completed.status_code == 200
    assert completed.json()["completed_at"] is not None
    assert db.query(AuditLog).filter_by(action="nursing_task.status_changed").count() == 2

    second_task = NursingTask(
        patient_id=records["assigned"].id,
        assigned_nurse_id=records["nurse"].id,
        task_type="Observe",
        description="Keep assignment active",
        status="pending",
    )
    db.add(second_task)
    db.commit()
    note = client.post(
        "/nurse/notes",
        json={
            "patient_id": records["assigned"].id,
            "appointment_id": records["assigned_appointment"].id,
            "note": "Patient comfortable after observation.",
        },
        headers=auth,
    )
    assert note.status_code == 201
    assert note.json()["nurse_id"] == records["nurse"].id
    assert client.post(
        "/nurse/notes",
        json={"patient_id": records["unassigned"].id, "note": "Denied"},
        headers=auth,
    ).status_code == 403


def test_doctor_assigns_nursing_task_only_for_own_patient(
    client, db, create_user, login
):
    records = seed_nursing_care(db, create_user)
    doctor_auth = headers(login(records["doctor_user"]))
    payload = {
        "patient_id": records["assigned"].id,
        "assigned_nurse_id": records["nurse"].id,
        "task_type": "Medication observation",
        "description": "Observe after scheduled medicine",
        "priority": "high",
        "due_at": (datetime.now() + timedelta(hours=2)).isoformat(),
    }
    created = client.post("/doctors/nursing-tasks", json=payload, headers=doctor_auth)
    assert created.status_code == 201
    assert created.json()["status"] == "pending"
    assert created.json()["assigned_nurse_id"] == records["nurse"].id
    assert db.query(AuditLog).filter_by(action="nursing_task.assigned").count() == 1

    foreign_payload = payload | {"patient_id": records["other_assigned"].id}
    assert client.post(
        "/doctors/nursing-tasks", json=foreign_payload, headers=doctor_auth,
    ).status_code == 403
    assert client.post(
        "/doctors/nursing-tasks",
        json=payload,
        headers=headers(login(records["nurse"])),
    ).status_code == 403
    assert client.post("/nurse/tasks", json=payload, headers=headers(login(records["nurse"]))).status_code == 405
