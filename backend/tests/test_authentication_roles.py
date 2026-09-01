import pytest

from app.core.roles import UserRole
from app.models.all_models import Patient, User


EXISTING_ROLES = ["patient", "doctor", "receptionist", "admin"]
NEW_ROLES = [
    "super_admin",
    "hospital_manager",
    "nurse",
    "pharmacist",
    "lab_technician",
    "radiologist",
    "accountant",
    "insurance_officer",
    "ambulance_staff",
]


@pytest.mark.parametrize("role", EXISTING_ROLES)
def test_existing_roles_can_authenticate(client, create_user, role):
    user = create_user(role)
    response = client.post(
        "/auth/login",
        json={"email": user.email, "password": "Strong1!Password"},
    )

    assert response.status_code == 200
    assert response.json()["role"] == role
    assert isinstance(response.json()["effective_permissions"], list)


@pytest.mark.parametrize("role", NEW_ROLES)
def test_enterprise_roles_can_authenticate(client, create_user, role):
    user = create_user(role)
    response = client.post(
        "/auth/login",
        json={"email": user.email, "password": "Strong1!Password"},
    )

    assert response.status_code == 200
    assert response.json()["role"] == role


def test_all_declared_roles_are_covered():
    assert {role.value for role in UserRole} == set(EXISTING_ROLES + NEW_ROLES)


def test_disabled_user_cannot_login(client, create_user):
    user = create_user("doctor", is_active=False)
    response = client.post(
        "/auth/login",
        json={"email": user.email, "password": "Strong1!Password"},
    )
    assert response.status_code == 403


def test_backend_rejects_weak_registration_password(client):
    response = client.post(
        "/auth/register",
        json={
            "name": "Weak Password",
            "email": "weak-password@example.com",
            "password": "password",
            "contact": "1234567890",
        },
    )
    assert response.status_code == 422


def test_patient_registration_still_creates_linked_profile(client, db, monkeypatch):
    monkeypatch.setattr(
        "app.routers.auth.send_verification_email", lambda *_args: True
    )
    response = client.post(
        "/auth/register",
        json={
            "name": "Registered Patient",
            "email": "registered-patient@example.com",
            "password": "Strong1!Password",
            "contact": "1234567890",
        },
    )
    assert response.status_code == 201

    user = db.query(User).filter(User.email == "registered-patient@example.com").one()
    profile = db.query(Patient).filter(Patient.user_id == user.id).one()
    assert user.role == "patient"
    assert profile.name == user.name


def test_registration_reports_verification_delivery_failure(client, monkeypatch):
    monkeypatch.setattr(
        "app.routers.auth.send_verification_email", lambda *_args: False
    )
    response = client.post(
        "/auth/register",
        json={
            "name": "Mail Delivery Test",
            "email": "mail-delivery-test@example.com",
            "password": "Strong1!Password",
            "contact": "1234567890",
        },
    )
    assert response.status_code == 503
    assert "could not send" in response.json()["detail"].lower()


def test_disabling_user_revokes_existing_token(client, db, create_user, login):
    user = create_user("doctor")
    token = login(user)
    user.is_active = False
    db.commit()

    response = client.get(
        "/rbac/me/permissions",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_receptionist_without_employee_profile_cannot_login_or_keep_session(
    client, db, create_user, login
):
    user = create_user("doctor")
    token = login(user)
    user.role = "receptionist"
    db.commit()

    denied_login = client.post(
        "/auth/login",
        json={"email": user.email, "password": "Strong1!Password"},
    )
    denied_session = client.get(
        "/auth/me", headers={"Authorization": f"Bearer {token}"}
    )

    assert denied_login.status_code == 403
    assert denied_session.status_code == 403
