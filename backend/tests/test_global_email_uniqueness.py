import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.core.identity import EMAIL_ALREADY_REGISTERED


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def patient_payload(email: str) -> dict:
    return {
        "name": "Shared Identity Patient",
        "email": email,
        "password": "Strong1!Password",
        "contact": "1234567890",
    }


def staff_payload(role: str, email: str) -> dict:
    payload = {
        "name": f"Shared Identity {role}",
        "email": email,
        "password": "Strong1!Password",
        "role": role,
    }
    if role == "doctor":
        payload.update({
            "specialization": "Internal Medicine",
            "consultation_fee": "500.00",
            "timing_start": "09:00:00",
            "timing_end": "17:00:00",
        })
    if role == "receptionist":
        payload["designation"] = "Receptionist"
    return payload


@pytest.mark.parametrize(
    "role",
    [
        "hospital_manager",
        "doctor",
        "receptionist",
        "nurse",
        "pharmacist",
        "lab_technician",
        "radiologist",
        "accountant",
        "insurance_officer",
        "ambulance_staff",
    ],
)
def test_patient_email_cannot_be_reused_by_any_staff_role(
    client, create_user, login, monkeypatch, role,
):
    monkeypatch.setattr(
        "app.routers.auth.send_verification_email", lambda *_args: True
    )
    admin = create_user("admin")
    registered = client.post(
        "/auth/register",
        json=patient_payload(" Shared.Account@Example.COM "),
    )
    duplicate = client.post(
        "/admin/staff",
        json=staff_payload(role, "SHARED.ACCOUNT@example.com"),
        headers=headers(login(admin)),
    )

    assert registered.status_code == 201
    assert registered.json()["email"] == "shared.account@example.com"
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == EMAIL_ALREADY_REGISTERED


def test_doctor_email_cannot_be_reused_for_patient_registration(
    client, create_user, login, monkeypatch,
):
    monkeypatch.setattr(
        "app.routers.auth.send_verification_email", lambda *_args: True
    )
    admin = create_user("admin")
    created = client.post(
        "/admin/staff",
        json=staff_payload("doctor", "doctor@example.com"),
        headers=headers(login(admin)),
    )
    duplicate = client.post(
        "/auth/register",
        json=patient_payload(" DOCTOR@EXAMPLE.COM "),
    )

    assert created.status_code == 201
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == EMAIL_ALREADY_REGISTERED


def test_patient_email_cannot_be_reused_for_admin_account(
    client, create_user, login, monkeypatch,
):
    monkeypatch.setattr(
        "app.routers.auth.send_verification_email", lambda *_args: True
    )
    super_admin = create_user("super_admin")
    assert client.post(
        "/auth/register",
        json=patient_payload("one-owner@example.com"),
    ).status_code == 201

    duplicate = client.post(
        "/super-admin/admins",
        json={
            "name": "Duplicate Admin",
            "email": " ONE-OWNER@EXAMPLE.COM ",
            "password": "Strong1!Password",
        },
        headers=headers(login(super_admin)),
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == EMAIL_ALREADY_REGISTERED


def test_legacy_doctor_and_receptionist_creation_use_global_email_guard(
    client, create_user, login,
):
    admin = create_user("admin")
    create_user("patient", email="legacy-owner@example.com")
    auth = headers(login(admin))

    doctor = client.post(
        "/admin/doctors",
        json={
            "name": "Duplicate Doctor",
            "email": " LEGACY-OWNER@EXAMPLE.COM ",
            "password": "Strong1!Password",
            "specialization": "Internal Medicine",
            "consultation_fee": "500.00",
            "timing_start": "09:00:00",
            "timing_end": "17:00:00",
            "status": "active",
        },
        headers=auth,
    )
    receptionist = client.post(
        "/admin/employees/",
        json={
            "name": "Duplicate Receptionist",
            "email": " Legacy-Owner@example.com ",
            "password": "Strong1!Password",
            "designation": "Receptionist",
            "status": "active",
        },
        headers=auth,
    )

    for response in (doctor, receptionist):
        assert response.status_code == 409
        assert response.json()["detail"] == EMAIL_ALREADY_REGISTERED


def test_doctor_can_keep_own_email_but_cannot_take_another_users_email(
    client, create_user, login,
):
    admin = create_user("admin")
    auth = headers(login(admin))
    first = client.post(
        "/admin/staff",
        json=staff_payload("doctor", "first.doctor@example.com"),
        headers=auth,
    ).json()
    client.post(
        "/admin/staff",
        json=staff_payload("doctor", "second.doctor@example.com"),
        headers=auth,
    )
    update_payload = {
        "name": "First Doctor",
        "email": " FIRST.DOCTOR@EXAMPLE.COM ",
        "specialization": "Internal Medicine",
        "consultation_fee": "500.00",
        "timing_start": "09:00:00",
        "timing_end": "17:00:00",
        "status": "active",
    }

    unchanged = client.put(
        f"/admin/doctors/{first['profile_id']}",
        json=update_payload,
        headers=auth,
    )
    conflicting = client.put(
        f"/admin/doctors/{first['profile_id']}",
        json=update_payload | {"email": " SECOND.DOCTOR@EXAMPLE.COM "},
        headers=auth,
    )

    assert unchanged.status_code == 200
    assert unchanged.json()["email"] == "first.doctor@example.com"
    assert conflicting.status_code == 409
    assert conflicting.json()["detail"] == EMAIL_ALREADY_REGISTERED


def test_login_email_lookup_is_case_insensitive_and_trimmed(client, create_user):
    create_user("patient", email="mixed.case@example.com")
    response = client.post(
        "/auth/login",
        json={
            "email": " MIXED.CASE@EXAMPLE.COM ",
            "password": "Strong1!Password",
        },
    )
    assert response.status_code == 200


def test_database_generated_key_blocks_normalized_duplicates(db):
    insert = text(
        "INSERT INTO users "
        "(name, email, password_hash, role, is_active, is_email_verified) "
        "VALUES (:name, :email, :password_hash, :role, 1, 1)"
    )
    db.execute(insert, {
        "name": "Raw First",
        "email": "Raw.Owner@Example.com",
        "password_hash": "not-a-real-password-hash",
        "role": "patient",
    })
    db.commit()

    with pytest.raises(IntegrityError):
        db.execute(insert, {
            "name": "Raw Duplicate",
            "email": " raw.owner@example.COM ",
            "password_hash": "not-a-real-password-hash",
            "role": "doctor",
        })
        db.commit()
    db.rollback()
