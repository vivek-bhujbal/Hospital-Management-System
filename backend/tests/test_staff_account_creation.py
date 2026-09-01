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
    login_response = client.post(
        "/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    assert login_response.status_code == 200
    assert login_response.json()["role"] == "admin"
    event = db.query(AuditLog).filter_by(action="admin.created").one()
    assert event.actor_user_id == super_admin.id
    assert "password" not in event.new_values

    listed = client.get("/super-admin/admins", headers=headers(login(super_admin)))
    assert listed.status_code == 200
    assert payload["email"] in [item["email"] for item in listed.json()]


def test_only_admin_can_provision_and_deactivate_hospital_manager(
    client, db, create_user, login
):
    super_admin = create_user("super_admin")
    admin = create_user("admin")
    payload = account_payload("hospital_manager", "operations-manager")

    denied = client.post(
        "/admin/staff",
        json=payload,
        headers=headers(login(super_admin)),
    )
    created = client.post(
        "/admin/staff",
        json=payload,
        headers=headers(login(admin)),
    )

    assert denied.status_code == 403
    assert created.status_code == 201
    assert created.json()["role"] == "hospital_manager"
    manager = db.query(User).filter_by(email=payload["email"]).one()
    assert manager.is_active is True
    assert db.query(AuditLog).filter_by(action="staff.account_created").count() == 1

    listed = client.get(
        "/admin/staff",
        headers=headers(login(admin)),
    )
    assert listed.status_code == 200
    assert manager.id in [item["id"] for item in listed.json()]

    deactivated = client.put(
        f"/admin/hospital-managers/{manager.id}/deactivate",
        headers=headers(login(admin)),
    )
    assert deactivated.status_code == 200
    db.refresh(manager)
    assert manager.is_active is False
    assert client.post(
        "/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    ).status_code == 403
    assert db.query(AuditLog).filter_by(action="hospital_manager.deactivated").count() == 1

    reactivated = client.put(
        f"/admin/hospital-managers/{manager.id}/activate",
        headers=headers(login(admin)),
    )
    assert reactivated.status_code == 200
    db.refresh(manager)
    assert manager.is_active is True


def test_only_admin_can_create_operational_accounts(
    client, db, create_user, login
):
    admin = create_user("admin")
    super_admin = create_user("super_admin")

    nurse_response = client.post(
        "/admin/staff",
        json=account_payload("nurse", "nurse"),
        headers=headers(login(admin)),
    )
    denied_super_admin = client.post(
        "/admin/staff",
        json=account_payload("pharmacist", "pharmacist"),
        headers=headers(login(super_admin)),
    )

    assert nurse_response.status_code == 201
    assert nurse_response.json()["role"] == "nurse"
    assert denied_super_admin.status_code == 403
    assert db.query(AuditLog).filter_by(action="staff.account_created").count() == 1


def test_hospital_manager_cannot_create_staff_and_admin_role_is_rejected(
    client, create_user, login
):
    manager = create_user("hospital_manager")
    admin = create_user("admin")

    denied = client.post(
        "/admin/staff",
        json=account_payload("nurse", "denied"),
        headers=headers(login(manager)),
    )
    invalid_role = client.post(
        "/admin/staff",
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
        "/admin/staff", json=doctor_payload, headers=headers(login(admin))
    )
    receptionist_response = client.post(
        "/admin/staff", json=receptionist_payload, headers=headers(login(admin))
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


def test_staff_email_must_be_unique(client, create_user, login):
    admin = create_user("admin")
    payload = account_payload("nurse", "duplicate")
    auth = headers(login(admin))

    assert client.post("/admin/staff", json=payload, headers=auth).status_code == 201
    assert client.post("/admin/staff", json=payload, headers=auth).status_code == 409


def test_inactivating_receptionist_blocks_login_and_revokes_session(
    client, db, create_user, login
):
    admin = create_user("admin")
    receptionist = create_user("receptionist")
    receptionist_token = login(receptionist)
    employee = db.query(Employee).filter_by(user_id=receptionist.id).one()

    response = client.patch(
        f"/admin/employees/{employee.id}",
        json={"status": "inactive"},
        headers=headers(login(admin)),
    )

    assert response.status_code == 200
    db.refresh(receptionist)
    db.refresh(employee)
    assert employee.status == "inactive"
    assert receptionist.is_active is False
    assert client.post(
        "/auth/login",
        json={"email": receptionist.email, "password": "Strong1!Password"},
    ).status_code == 403
    assert client.get(
        "/auth/me", headers=headers(receptionist_token)
    ).status_code == 403


def test_inactive_receptionist_profile_is_authoritative_on_data_mismatch(
    client, db, create_user, login
):
    receptionist = create_user("receptionist")
    receptionist_token = login(receptionist)
    employee = db.query(Employee).filter_by(user_id=receptionist.id).one()
    employee.status = "inactive"
    db.commit()

    assert receptionist.is_active is True
    assert client.post(
        "/auth/login",
        json={"email": receptionist.email, "password": "Strong1!Password"},
    ).status_code == 403
    assert client.get(
        "/auth/me", headers=headers(receptionist_token)
    ).status_code == 403
