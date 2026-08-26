from app.models.all_models import AuditLog, Doctor, Employee, EmployeePermission, User


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def account_payload(role: str, suffix: str) -> dict:
    return {
        "name": f"Staff {suffix}",
        "email": f"staff-{suffix}@example.com",
        "password": "Strong1!Password",
        "role": role,
    }


def test_only_super_admin_can_create_admin_and_creation_is_audited(
    client, db, create_user, login
):
    super_admin = create_user("super_admin")
    admin = create_user("admin")
    payload = {
        "name": "Hospital Admin",
        "email": "hospital-admin@example.com",
        "password": "Strong1!Password",
    }

    denied = client.post(
        "/super-admin/admins", json=payload, headers=headers(login(admin))
    )
    assert denied.status_code == 403

    created = client.post(
        "/super-admin/admins", json=payload, headers=headers(login(super_admin))
    )
    assert created.status_code == 201
    assert created.json()["role"] == "admin"
    assert created.json()["is_active"] is True

    account = db.query(User).filter_by(email=payload["email"]).one()
    assert account.is_email_verified is True
    assert account.password_hash != payload["password"]
    event = db.query(AuditLog).filter_by(action="admin.created").one()
    assert event.actor_user_id == super_admin.id
    assert "password" not in event.new_values

    listed = client.get("/super-admin/admins", headers=headers(login(super_admin)))
    assert listed.status_code == 200
    assert payload["email"] in [item["email"] for item in listed.json()]


def test_admin_and_super_admin_can_create_operational_accounts(
    client, db, create_user, login
):
    admin = create_user("admin")
    super_admin = create_user("super_admin")

    nurse_response = client.post(
        "/manager/staff",
        json=account_payload("nurse", "nurse"),
        headers=headers(login(admin)),
    )
    pharmacist_response = client.post(
        "/manager/staff",
        json=account_payload("pharmacist", "pharmacist"),
        headers=headers(login(super_admin)),
    )

    assert nurse_response.status_code == 201
    assert nurse_response.json()["role"] == "nurse"
    assert pharmacist_response.status_code == 201
    assert pharmacist_response.json()["role"] == "pharmacist"
    assert db.query(AuditLog).filter_by(action="staff.account_created").count() == 2


def test_hospital_manager_cannot_create_staff_and_admin_role_is_rejected(
    client, create_user, login
):
    manager = create_user("hospital_manager")
    admin = create_user("admin")

    denied = client.post(
        "/manager/staff",
        json=account_payload("nurse", "denied"),
        headers=headers(login(manager)),
    )
    invalid_role = client.post(
        "/manager/staff",
        json=account_payload("admin", "invalid-admin"),
        headers=headers(login(admin)),
    )

    assert denied.status_code == 403
    assert invalid_role.status_code == 422


def test_doctor_and_receptionist_profiles_are_created_transactionally(
    client, db, create_user, login
):
    admin = create_user("admin")
    doctor_payload = account_payload("doctor", "doctor") | {
        "specialization": "Cardiology",
        "consultation_fee": "1250.00",
        "contact": "5550101",
        "timing_start": "09:00:00",
        "timing_end": "17:00:00",
    }
    receptionist_payload = account_payload("receptionist", "receptionist") | {
        "designation": "Front Desk",
        "shift_start": "08:00:00",
        "shift_end": "16:00:00",
    }

    doctor_response = client.post(
        "/manager/staff", json=doctor_payload, headers=headers(login(admin))
    )
    receptionist_response = client.post(
        "/manager/staff", json=receptionist_payload, headers=headers(login(admin))
    )

    assert doctor_response.status_code == 201
    assert receptionist_response.status_code == 201
    doctor_user = db.query(User).filter_by(email=doctor_payload["email"]).one()
    receptionist_user = db.query(User).filter_by(email=receptionist_payload["email"]).one()
    doctor = db.query(Doctor).filter_by(user_id=doctor_user.id).one()
    employee = db.query(Employee).filter_by(user_id=receptionist_user.id).one()
    permissions = db.query(EmployeePermission).filter_by(employee_id=employee.id).one()
    assert doctor_response.json()["profile_id"] == doctor.id
    assert receptionist_response.json()["profile_id"] == employee.id
    assert permissions.can_register_patient == 0
    assert permissions.can_schedule_appointment == 0
    assert permissions.can_checkin_patient == 0
    assert permissions.can_collect_billing == 0
    assert permissions.can_view_reports == 0


def test_staff_email_must_be_unique(client, create_user, login):
    admin = create_user("admin")
    payload = account_payload("nurse", "duplicate")
    auth = headers(login(admin))

    assert client.post("/manager/staff", json=payload, headers=auth).status_code == 201
    assert client.post("/manager/staff", json=payload, headers=auth).status_code == 409
