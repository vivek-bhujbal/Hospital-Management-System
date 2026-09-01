import pytest

from app.core.security import verify_password
from app.models.all_models import User
from app.services.super_admin_bootstrap import bootstrap_super_admin


EMAIL = "bootstrap-super-admin@example.com"
PASSWORD = "Bootstrap1!Password"
NAME = "Bootstrap Super Admin"


def run_bootstrap(db, **overrides):
    values = {"email": EMAIL, "password": PASSWORD, "name": NAME} | overrides
    return bootstrap_super_admin(db, **values)


def test_bootstrap_creates_only_active_verified_hashed_super_admin(db):
    result = run_bootstrap(db)

    account = db.query(User).one()
    assert result.created is True
    assert account.id == result.user_id
    assert account.email == EMAIL
    assert account.role == "super_admin"
    assert account.is_active is True
    assert account.is_email_verified is True
    assert account.email_verified_at is not None
    assert account.password_hash != PASSWORD
    assert verify_password(PASSWORD, account.password_hash)


def test_bootstrap_is_idempotent_and_securely_synchronizes_credentials(db):
    first = run_bootstrap(db)
    account = db.get(User, first.user_id)
    original_hash = account.password_hash

    second = run_bootstrap(db)
    assert second.created is False
    assert second.password_synchronized is False
    assert second.user_id == first.user_id
    assert db.query(User).count() == 1
    assert db.get(User, first.user_id).password_hash == original_hash

    account.name = "Old Name"
    account.is_active = False
    account.is_email_verified = False
    account.password_hash = "$2b$12$invalid"
    db.commit()

    synchronized = run_bootstrap(db, password="Replacement1!Password")
    db.refresh(account)
    assert synchronized.password_synchronized is True
    assert account.name == NAME
    assert account.is_active is True
    assert account.is_email_verified is True
    assert verify_password("Replacement1!Password", account.password_hash)
    assert db.query(User).count() == 1


def test_bootstrap_rejects_identity_conflicts_and_multiple_super_admins(
    db, create_user
):
    create_user("super_admin", email="different-super-admin@example.com")
    with pytest.raises(RuntimeError, match="does not match"):
        run_bootstrap(db)

    db.query(User).delete()
    db.commit()
    create_user("super_admin", email=EMAIL)
    create_user("super_admin", email="second-super-admin@example.com")
    with pytest.raises(RuntimeError, match="Multiple Super Admin"):
        run_bootstrap(db)


@pytest.mark.parametrize(
    ("overrides", "error"),
    [
        ({"email": None}, RuntimeError),
        ({"email": "not-an-email"}, ValueError),
        ({"password": "weak"}, ValueError),
        ({"name": "   "}, ValueError),
    ],
)
def test_bootstrap_validates_all_environment_credentials(db, overrides, error):
    with pytest.raises(error):
        run_bootstrap(db, **overrides)
    assert db.query(User).count() == 0


def test_bootstrapped_super_admin_login_and_invalid_logins_are_indistinguishable(
    client, db
):
    run_bootstrap(db)

    authenticated = client.post(
        "/auth/login", json={"email": EMAIL, "password": PASSWORD}
    )
    wrong_password = client.post(
        "/auth/login", json={"email": EMAIL, "password": "Wrong1!Password"}
    )
    wrong_email = client.post(
        "/auth/login",
        json={"email": "missing@example.com", "password": PASSWORD},
    )

    assert authenticated.status_code == 200
    assert authenticated.json()["role"] == "super_admin"
    assert wrong_password.status_code == wrong_email.status_code == 401
    assert wrong_password.json()["detail"] == wrong_email.json()["detail"]
