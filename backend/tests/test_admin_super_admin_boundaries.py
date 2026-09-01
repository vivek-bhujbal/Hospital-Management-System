from app.core.security import verify_password
from app.models.all_models import AuditLog, User


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def admin_payload(**extra):
    return {
        "name": "Hospital Admin",
        "email": "new-admin@example.com",
        "password": "Strong1!Password",
        **extra,
    }


def test_admin_is_forbidden_from_every_super_admin_read_api(client, create_user, login):
    admin = create_user("admin")
    auth = headers(login(admin))
    paths = [
        "/super-admin/overview",
        "/super-admin/users",
        "/super-admin/admins",
        "/super-admin/hospitals",
        "/super-admin/roles-permissions",
        "/super-admin/settings",
        "/super-admin/features",
        "/super-admin/audit-logs",
        "/super-admin/system-health",
    ]
    for path in paths:
        assert client.get(path, headers=auth).status_code == 403, path


def test_super_admin_can_list_all_users_without_secret_fields(
    client, create_user, login
):
    super_admin = create_user("super_admin")
    admin = create_user("admin")
    doctor = create_user("doctor")

    response = client.get(
        "/super-admin/users", headers=headers(login(super_admin))
    )

    assert response.status_code == 200
    payload = response.json()
    assert {item["id"] for item in payload} == {
        super_admin.id,
        admin.id,
        doctor.id,
    }
    assert {item["role"] for item in payload} == {
        "super_admin",
        "admin",
        "doctor",
    }
    assert all("password" not in item for item in payload)
    assert all("token" not in item for item in payload)


def test_admin_is_forbidden_from_super_admin_mutations(client, create_user, login):
    admin = create_user("admin")
    auth = headers(login(admin))
    requests = [
        client.post("/super-admin/admins", json=admin_payload(), headers=auth),
        client.patch(
            f"/super-admin/admins/{admin.id}/reset-password",
            json={"new_password": "Replacement1!Password"},
            headers=auth,
        ),
        client.post("/super-admin/hospitals", json={"name": "Denied"}, headers=auth),
        client.post("/super-admin/settings", json={"setting_key": "denied"}, headers=auth),
        client.post("/super-admin/features", json={"feature_name": "denied"}, headers=auth),
        client.post(
            "/super-admin/roles-permissions",
            json={"role": "doctor", "permission": "settings.manage"},
            headers=auth,
        ),
    ]
    assert all(response.status_code == 403 for response in requests)


def test_super_admin_can_reset_admin_password_without_auditing_secret(
    client, db, create_user, login
):
    super_admin = create_user("super_admin")
    admin = create_user("admin")
    admin.password_reset_token_hash = "stale-reset-token-hash"
    db.commit()

    response = client.patch(
        f"/super-admin/admins/{admin.id}/reset-password",
        json={"new_password": "Replacement1!Password"},
        headers=headers(login(super_admin)),
    )

    assert response.status_code == 200
    db.refresh(admin)
    assert verify_password("Replacement1!Password", admin.password_hash)
    assert admin.password_reset_token_hash is None
    assert admin.password_reset_expires_at is None
    event = db.query(AuditLog).filter_by(action="admin.password_reset").one()
    assert event.actor_user_id == super_admin.id
    assert event.resource_id == str(admin.id)
    assert "password" not in str(event.new_values).lower()


def test_admin_password_reset_rejects_weak_password_and_non_admin_target(
    client, db, create_user, login
):
    super_admin = create_user("super_admin")
    admin = create_user("admin")
    doctor = create_user("doctor")
    original_hash = admin.password_hash
    auth = headers(login(super_admin))

    weak = client.patch(
        f"/super-admin/admins/{admin.id}/reset-password",
        json={"new_password": "weak"},
        headers=auth,
    )
    wrong_role = client.patch(
        f"/super-admin/admins/{doctor.id}/reset-password",
        json={"new_password": "Replacement1!Password"},
        headers=auth,
    )

    assert weak.status_code == 422
    assert wrong_role.status_code == 404
    db.refresh(admin)
    assert admin.password_hash == original_hash


def test_super_admin_creation_api_forces_admin_and_rejects_role_input(
    client, db, create_user, login
):
    super_admin = create_user("super_admin")
    response = client.post(
        "/super-admin/admins",
        json=admin_payload(role="super_admin"),
        headers=headers(login(super_admin)),
    )
    assert response.status_code == 422
    assert db.query(User).filter(User.email == "new-admin@example.com").count() == 0

    created = client.post(
        "/super-admin/admins",
        json=admin_payload(),
        headers=headers(login(super_admin)),
    )
    assert created.status_code == 201
    assert created.json()["role"] == "admin"


def test_admin_cannot_self_promote_or_change_any_role(client, create_user, login):
    admin = create_user("admin")
    target = create_user("doctor")
    auth = headers(login(admin))
    assert client.patch(
        f"/rbac/users/{admin.id}/role",
        json={"role": "super_admin"},
        headers=auth,
    ).status_code == 403
    assert client.patch(
        f"/rbac/users/{target.id}/role",
        json={"role": "super_admin"},
        headers=auth,
    ).status_code == 403


def test_super_admin_role_is_environment_owned_and_not_assignable_via_api(
    client, create_user, login
):
    super_admin = create_user("super_admin")
    target = create_user("doctor")
    auth = headers(login(super_admin))

    assert client.patch(
        f"/rbac/users/{target.id}/role",
        json={"role": "super_admin"},
        headers=auth,
    ).status_code == 409
    assert client.patch(
        f"/rbac/users/{super_admin.id}/role",
        json={"role": "admin"},
        headers=auth,
    ).status_code == 409


def test_super_admin_cannot_access_admin_operational_apis(client, create_user, login):
    super_admin = create_user("super_admin")
    auth = headers(login(super_admin))
    assert client.get("/admin/overview", headers=auth).status_code == 403
    assert client.get("/admin/doctors", headers=auth).status_code == 403
    assert client.get("/admin/employees/", headers=auth).status_code == 403


def test_deactivated_admin_loses_existing_api_access(client, db, create_user, login):
    admin = create_user("admin")
    token = login(admin)
    assert client.get("/admin/overview", headers=headers(token)).status_code == 200
    admin.is_active = False
    db.commit()
    assert client.get("/admin/overview", headers=headers(token)).status_code == 403


def test_admin_doctor_creation_is_audited_without_password_data(
    client, db, create_user, login
):
    admin = create_user("admin")
    response = client.post(
        "/admin/doctors",
        json={
            "name": "Audit Doctor",
            "email": "audit-doctor@example.com",
            "password": "Strong1!Password",
            "specialization": "General Medicine",
            "consultation_fee": "500.00",
            "status": "active",
        },
        headers=headers(login(admin)),
    )
    assert response.status_code == 200
    event = db.query(AuditLog).filter_by(action="doctor.created").one()
    assert event.actor_user_id == admin.id
    assert "password" not in str(event.new_values).lower()
