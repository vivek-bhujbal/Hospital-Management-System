from datetime import date, time, timedelta
from decimal import Decimal

from app.models.all_models import (
    Appointment, AuditLog, Billing, Doctor, InsuranceClaim,
    InsuranceClaimAction, InsuranceDocument, InsurancePayment,
    InsurancePolicy, InsuranceProvider, Patient,
)


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def insurance_case(db, create_user):
    officer = create_user("insurance_officer")
    doctor_user = create_user("doctor")
    patient = Patient(name="Insured Patient", contact="9999999999")
    doctor = Doctor(user_id=doctor_user.id, name="Insurance Doctor", status="active")
    provider = InsuranceProvider(name="Secure Health", status="active")
    db.add_all([patient, doctor, provider])
    db.flush()
    policy = InsurancePolicy(
        patient_id=patient.id, provider_id=provider.id,
        policy_number="POLICY-100", coverage_start=date.today() - timedelta(days=30),
        coverage_end=date.today() + timedelta(days=365),
        coverage_limit=Decimal("50000.00"), status="active",
    )
    appointment = Appointment(
        patient_id=patient.id, doctor_id=doctor.id,
        appt_date=date.today(), appt_time=time(11, 0), status="completed",
    )
    db.add_all([policy, appointment])
    db.flush()
    invoice = Billing(
        patient_id=patient.id, appointment_id=appointment.id,
        amount=Decimal("2500.00"), status="pending",
    )
    db.add(invoice)
    db.commit()
    return officer, patient, provider, policy, invoice


def create_claim(client, auth, policy, invoice, amount="2000.00"):
    return client.post("/insurance/claims", json={
        "policy_id": policy.id,
        "billing_id": invoice.id,
        "amount_claimed": amount,
    }, headers=auth)


def test_insurance_patient_view_and_dashboard_exclude_clinical_data(
    client, db, create_user, login,
):
    officer, patient, provider, policy, _ = insurance_case(db, create_user)
    auth = headers(login(officer))
    response = client.get("/insurance/patients", headers=auth)
    assert response.status_code == 200
    record = response.json()[0]
    assert record["patient_id"] == patient.id
    assert record["provider_name"] == provider.name
    assert record["policy_number"] == policy.policy_number
    assert not ({"diagnosis", "prescription", "clinical_notes", "address", "blood_group"} & set(record))
    dashboard = client.get("/insurance/dashboard", headers=auth)
    assert dashboard.status_code == 200
    assert dashboard.json()["pending_claims"] == 0


def test_claim_duplicate_guard_document_review_approval_and_settlement(
    client, db, create_user, login,
):
    officer, _, _, policy, invoice = insurance_case(db, create_user)
    auth = headers(login(officer))
    created = create_claim(client, auth, policy, invoice)
    assert created.status_code == 201, created.text
    claim_id = created.json()["id"]
    assert create_claim(client, auth, policy, invoice).status_code == 409

    assert client.post(f"/insurance/claims/{claim_id}/submit", headers=auth).json()["status"] == "submitted"
    requested = client.post(
        f"/insurance/claims/{claim_id}/request-documents",
        json={"reason": "Please attach insurer authorization"}, headers=auth,
    )
    assert requested.status_code == 200
    assert requested.json()["documents_required"] is True
    assert client.post(f"/insurance/claims/{claim_id}/start-review", headers=auth).status_code == 409
    linked = client.post(
        f"/insurance/claims/{claim_id}/documents",
        json={"claim_id": claim_id, "document_reference": "DOC-AUTH-100"},
        headers=auth,
    )
    assert linked.status_code == 201
    assert client.post(f"/insurance/claims/{claim_id}/start-review", headers=auth).json()["status"] == "under_review"
    decision = client.post(
        f"/insurance/claims/{claim_id}/decision",
        json={
            "decision": "approved", "approved_amount": "1800.00",
            "reason": "Policy and invoice verified",
        }, headers=auth,
    )
    assert decision.status_code == 200
    assert decision.json()["status"] == "approved"
    settled = client.post(
        f"/insurance/claims/{claim_id}/settle",
        json={
            "amount_paid": "1800.00", "payment_date": date.today().isoformat(),
            "transaction_reference": "INS-SETTLE-100",
            "reason": "Insurer remittance received",
        }, headers=auth,
    )
    assert settled.status_code == 200
    assert settled.json()["status"] == "settled"

    detail = client.get(f"/insurance/claims/{claim_id}", headers=auth).json()
    assert detail["documents"][0]["document_reference"] == "DOC-AUTH-100"
    assert detail["payments"][0]["transaction_reference"] == "INS-SETTLE-100"
    decisions = [item for item in detail["history"] if item["action"] == "approved"]
    assert decisions[0]["officer_id"] == officer.id
    assert decisions[0]["reason"] == "Policy and invoice verified"
    assert db.query(InsuranceClaim).count() == 1
    assert db.query(InsuranceDocument).count() == 1
    assert db.query(InsurancePayment).count() == 1
    assert db.query(InsuranceClaimAction).count() == 7
    assert db.query(AuditLog).filter(AuditLog.action.like("insurance.claim_%")).count() == 7


def test_rejection_requires_guarded_state_and_records_reason(
    client, db, create_user, login,
):
    officer, _, _, policy, invoice = insurance_case(db, create_user)
    auth = headers(login(officer))
    claim_id = create_claim(client, auth, policy, invoice).json()["id"]
    assert client.post(
        f"/insurance/claims/{claim_id}/decision",
        json={"decision": "rejected", "reason": "Too early"}, headers=auth,
    ).status_code == 409
    client.post(f"/insurance/claims/{claim_id}/submit", headers=auth)
    client.post(f"/insurance/claims/{claim_id}/start-review", headers=auth)
    rejected = client.post(
        f"/insurance/claims/{claim_id}/decision",
        json={"decision": "rejected", "reason": "Coverage exclusion applies"}, headers=auth,
    )
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "rejected"
    assert client.post(f"/insurance/claims/{claim_id}/start-review", headers=auth).status_code == 409
    history = client.get(f"/insurance/claims/{claim_id}", headers=auth).json()["history"]
    assert history[0]["reason"] == "Coverage exclusion applies"


def test_insurance_exact_role_and_cross_department_denial(client, create_user, login):
    officer = create_user("insurance_officer")
    auth = headers(login(officer))
    for endpoint in (
        "/admin/overview", "/doctors/me", "/nurse/dashboard", "/pharmacy/dashboard",
        "/lab/dashboard", "/radiology/dashboard", "/accountant/dashboard",
        "/ambulance/dashboard", "/probes/patient-history",
    ):
        assert client.get(endpoint, headers=auth).status_code == 403
    doctor = create_user("doctor")
    assert client.get(
        "/insurance/dashboard", headers=headers(login(doctor)),
    ).status_code == 403


def test_insurance_module_has_no_default_business_data(client, create_user, login):
    officer = create_user("insurance_officer")
    auth = headers(login(officer))
    assert client.get("/insurance/patients", headers=auth).json() == []
    assert client.get("/insurance/claims", headers=auth).json() == []
    assert client.get("/insurance/approvals", headers=auth).json() == []
    assert client.get("/insurance/providers", headers=auth).json() == []
