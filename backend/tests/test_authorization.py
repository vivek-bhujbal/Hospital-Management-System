from app.core.permissions import Permission, get_role_permissions


def headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_unauthenticated_request_is_rejected(client):
    assert client.get("/rbac/me/permissions").status_code == 401


def test_platform_and_hospital_admin_roles_do_not_inherit_each_other(client, create_user, login):
    super_admin = create_user("super_admin")
    admin = create_user("admin")
    manager = create_user("hospital_manager")

    assert client.get(
        "/probes/admin", headers=headers(login(admin))
    ).status_code == 200
    assert client.get(
        "/probes/admin", headers=headers(login(super_admin))
    ).status_code == 403
    assert client.get(
        "/probes/admin", headers=headers(login(manager))
    ).status_code == 403

    super_permissions = get_role_permissions("super_admin")
    assert Permission.settings_manage.value in super_permissions
    assert Permission.doctors_manage.value not in super_permissions
    assert Permission.patients_view.value not in super_permissions


def test_operational_role_does_not_inherit_admin_permissions():
    nurse_permissions = get_role_permissions("nurse")
    assert Permission.nursing_view.value in nurse_permissions
    assert Permission.patients_view_medical_history.value not in nurse_permissions
    assert Permission.patients_update.value not in nurse_permissions
    assert Permission.consultations_update.value not in nurse_permissions
    assert Permission.prescriptions_view.value not in nurse_permissions
    assert Permission.staff_update.value not in nurse_permissions
    assert Permission.settings_manage.value not in nurse_permissions


def test_generic_patient_history_permission_is_denied_to_operational_roles(client, create_user, login):
    nurse = create_user("nurse")
    pharmacist = create_user("pharmacist")

    assert client.get(
        "/probes/patient-history", headers=headers(login(nurse))
    ).status_code == 403
    assert client.get(
        "/probes/patient-history", headers=headers(login(pharmacist))
    ).status_code == 403


def test_require_any_role_accepts_only_listed_operational_roles(
    client, create_user, login
):
    doctor = create_user("doctor")
    nurse = create_user("nurse")
    pharmacist = create_user("pharmacist")

    assert client.get(
        "/probes/clinical-role", headers=headers(login(doctor))
    ).status_code == 200
    assert client.get(
        "/probes/clinical-role", headers=headers(login(nurse))
    ).status_code == 200
    assert client.get(
        "/probes/clinical-role", headers=headers(login(pharmacist))
    ).status_code == 403


def test_receptionist_legacy_override_controls_granular_permission(
    client, create_user, login
):
    denied = create_user(
        "receptionist",
        receptionist_permissions={"can_checkin_patient": False},
    )
    approved = create_user(
        "receptionist",
        receptionist_permissions={"can_checkin_patient": True},
    )

    assert client.get(
        "/probes/checkin", headers=headers(login(denied))
    ).status_code == 403
    assert client.get(
        "/probes/checkin", headers=headers(login(approved))
    ).status_code == 200
    assert client.get(
        "/probes/legacy-checkin", headers=headers(login(approved))
    ).status_code == 200
