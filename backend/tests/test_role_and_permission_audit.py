from app.models.all_models import AuditLog, Employee


def headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_only_super_admin_can_modify_roles_and_change_is_audited(
    client, db, create_user, login
):
    super_admin = create_user("super_admin")
    admin = create_user("admin")
    target = create_user("pharmacist")
    target_token = login(target)
    assert client.get(
        "/probes/patient-history", headers=headers(target_token)
    ).status_code == 403

    denied = client.patch(
        f"/rbac/users/{target.id}/role",
        json={"role": "nurse"},
        headers=headers(login(admin)),
    )
    assert denied.status_code == 403

    approved = client.patch(
        f"/rbac/users/{target.id}/role",
        json={"role": "nurse"},
        headers=headers(login(super_admin)),
    )
    assert approved.status_code == 200
    assert approved.json()["role"] == "nurse"

    db.expire_all()
    event = db.query(AuditLog).filter(AuditLog.action == "user.role.updated").one()
    assert event.actor_user_id == super_admin.id
    assert event.resource_id == str(target.id)
    assert event.old_values == {"role": "pharmacist"}
    assert event.new_values == {"role": "nurse"}
    assert client.get(
        "/probes/patient-history", headers=headers(target_token)
    ).status_code == 200


def test_receptionist_permission_change_is_audited(client, db, create_user, login):
    admin = create_user("admin")
    receptionist = create_user("receptionist")
    employee = db.query(Employee).filter(Employee.user_id == receptionist.id).one()

    response = client.patch(
        f"/admin/employees/{employee.id}/permissions",
        json={
            "can_register_patient": True,
            "can_schedule_appointment": True,
            "can_checkin_patient": False,
            "can_collect_billing": True,
            "can_view_reports": False,
        },
        headers=headers(login(admin)),
    )
    assert response.status_code == 200
    assert response.json()["can_checkin_patient"] is False

    db.expire_all()
    event = db.query(AuditLog).filter(
        AuditLog.action == "staff.permissions.updated"
    ).one()
    assert event.actor_user_id == admin.id
    assert event.new_values["can_checkin_patient"] is False


def test_audit_reader_requires_permission(client, create_user, login):
    patient = create_user("patient")
    admin = create_user("admin")
    super_admin = create_user("super_admin")

    assert client.get(
        "/rbac/audit-logs", headers=headers(login(patient))
    ).status_code == 403
    assert client.get(
        "/rbac/audit-logs", headers=headers(login(admin))
    ).status_code == 403
    assert client.get(
        "/rbac/audit-logs", headers=headers(login(super_admin))
    ).status_code == 200
