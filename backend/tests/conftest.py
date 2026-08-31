import os
from typing import Callable, Dict, Optional

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-only-rbac-secret"

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import PermissionChecker, require_any_role, require_permission, require_role
from app.core.permissions import Permission
from app.core.security import get_password_hash
from app.database import Base, get_db
from app.models.all_models import Employee, EmployeePermission, User
from app.routers import (
    accountant, admin, ambulance, appointments, auth, billing, doctors, employees, insurance,
    lab, manager, nurse, patients, pharmacy, prescriptions, radiology, rbac, super_admin,
)


engine = create_engine(
    "sqlite+pysqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


test_app = FastAPI()
test_app.dependency_overrides[get_db] = override_get_db
test_app.include_router(auth.router, prefix="/auth")
test_app.include_router(patients.router, prefix="/patients")
test_app.include_router(admin.router, prefix="/admin")
test_app.include_router(employees.router, prefix="/admin/employees")
test_app.include_router(rbac.router, prefix="/rbac")
test_app.include_router(appointments.router, prefix="/appointments")
test_app.include_router(prescriptions.router, prefix="/prescriptions")
test_app.include_router(billing.router, prefix="/billing")
test_app.include_router(doctors.router, prefix="/doctors")
test_app.include_router(super_admin.router)
test_app.include_router(manager.router)
test_app.include_router(nurse.router)
test_app.include_router(pharmacy.router)
test_app.include_router(lab.router)
test_app.include_router(radiology.router)
test_app.include_router(accountant.router)
test_app.include_router(insurance.router)
test_app.include_router(ambulance.router)


@test_app.get("/probes/admin")
def admin_probe(user: User = Depends(require_role("admin"))):
    return {"role": user.role}


@test_app.get("/probes/patient-history")
def patient_history_probe(
    user: User = Depends(require_permission(Permission.patients_view_medical_history)),
):
    return {"role": user.role}


@test_app.get("/probes/checkin")
def checkin_probe(
    user: User = Depends(require_permission(Permission.appointments_checkin)),
):
    return {"role": user.role}


@test_app.get("/probes/clinical-role")
def clinical_role_probe(
    user: User = Depends(require_any_role("doctor", "nurse")),
):
    return {"role": user.role}


@test_app.get("/probes/legacy-checkin")
def legacy_checkin_probe(
    user: User = Depends(PermissionChecker("can_checkin_patient")),
):
    return {"role": user.role}


@pytest.fixture(autouse=True)
def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    with TestClient(test_app) as test_client:
        yield test_client


@pytest.fixture
def create_user(db: Session) -> Callable[..., User]:
    def factory(
        role: str,
        *,
        email: Optional[str] = None,
        password: str = "Strong1!Password",
        is_active: bool = True,
        is_email_verified: bool = True,
        receptionist_permissions: Optional[Dict[str, bool]] = None,
    ) -> User:
        suffix = db.query(User).count() + 1
        user = User(
            name=f"Test {role}",
            email=email or f"{role}-{suffix}@example.com",
            password_hash=get_password_hash(password),
            role=role,
            is_active=is_active,
            is_email_verified=is_email_verified,
        )
        db.add(user)
        db.flush()

        if role == "receptionist":
            employee = Employee(
                user_id=user.id,
                designation="Receptionist",
                status="active",
            )
            db.add(employee)
            db.flush()
            values = receptionist_permissions or {}
            db.add(EmployeePermission(
                employee_id=employee.id,
                can_register_patient=int(values.get("can_register_patient", True)),
                can_schedule_appointment=int(values.get("can_schedule_appointment", True)),
                can_checkin_patient=int(values.get("can_checkin_patient", True)),
                can_collect_billing=int(values.get("can_collect_billing", True)),
            ))

        db.commit()
        db.refresh(user)
        return user

    return factory


@pytest.fixture
def login(client: TestClient) -> Callable[[User, str], str]:
    def factory(user: User, password: str = "Strong1!Password") -> str:
        response = client.post(
            "/auth/login",
            json={"email": user.email, "password": password},
        )
        assert response.status_code == 200, response.text
        return response.json()["access_token"]

    return factory


def auth_header(token: str):
    return {"Authorization": f"Bearer {token}"}
