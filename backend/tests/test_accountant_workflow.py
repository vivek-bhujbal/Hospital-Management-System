from datetime import date, time
from decimal import Decimal

from app.models.all_models import (
    Appointment, AuditLog, Billing, Doctor, Expense,
    ExpenseCategory, FinancialTransaction, Patient,
)


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def finance_case(db, create_user):
    accountant = create_user("accountant")
    doctor_user = create_user("doctor")
    patient = Patient(name="Finance Patient", contact="9000000000")
    doctor = Doctor(user_id=doctor_user.id, name="Finance Doctor", status="active")
    db.add_all([patient, doctor])
    db.flush()
    appointment = Appointment(
        patient_id=patient.id, doctor_id=doctor.id,
        appt_date=date.today(), appt_time=time(10, 0), status="completed",
    )
    db.add(appointment)
    db.flush()
    invoice = Billing(
        patient_id=patient.id, appointment_id=appointment.id,
        amount=Decimal("1250.00"), status="pending",
    )
    db.add(invoice)
    db.commit()
    return accountant, patient, appointment, invoice


def test_dashboard_and_invoices_expose_finance_without_clinical_data(
    client, db, create_user, login,
):
    accountant, patient, appointment, invoice = finance_case(db, create_user)
    auth = headers(login(accountant))

    dashboard = client.get("/accountant/dashboard", headers=auth)
    assert dashboard.status_code == 200
    assert dashboard.json()["pending_invoices"] == 1
    assert Decimal(dashboard.json()["outstanding_amount"]) == Decimal("1250.00")

    response = client.get("/accountant/invoices?status=pending&search=Finance", headers=auth)
    assert response.status_code == 200
    record = response.json()[0]
    assert record["id"] == invoice.id
    assert record["patient_name"] == patient.name
    assert record["appointment_id"] == appointment.id
    assert not ({"diagnosis", "prescription", "clinical_notes"} & set(record))


def test_payment_is_invoice_backed_audited_and_duplicate_safe(
    client, db, create_user, login,
):
    accountant, _, _, invoice = finance_case(db, create_user)
    auth = headers(login(accountant))
    endpoint = f"/accountant/invoices/{invoice.id}/pay"

    first = client.post(endpoint, json={"payment_method": "card"}, headers=auth)
    assert first.status_code == 200, first.text
    duplicate = client.post(endpoint, json={"payment_method": "card"}, headers=auth)
    assert duplicate.status_code == 200
    assert duplicate.json()["id"] == first.json()["id"]
    assert client.post(
        endpoint, json={"payment_method": "cash"}, headers=auth,
    ).status_code == 409

    assert db.query(FinancialTransaction).filter_by(
        transaction_type="payment", reference_type="billing", reference_id=invoice.id,
    ).count() == 1
    assert db.query(AuditLog).filter_by(action="accounting.payment_recorded").count() == 1
    payments = client.get("/accountant/payments", headers=auth).json()
    assert payments[0]["invoice_id"] == invoice.id
    assert payments[0]["collector_name"] == accountant.name
    assert payments[0]["receipt_no"].startswith("REC-")


def test_expense_category_and_expense_are_audited_append_only_and_idempotent(
    client, db, create_user, login,
):
    accountant = create_user("accountant")
    auth = headers(login(accountant))
    category_response = client.post(
        "/accountant/expense-categories",
        json={"name": "Utilities", "description": "Hospital utilities"},
        headers=auth,
    )
    assert category_response.status_code == 201
    category_id = category_response.json()["id"]
    payload = {
        "category_id": category_id,
        "amount": "500.50",
        "description": "Electricity charge",
        "supporting_reference": "INV-UTILITY-42",
        "incurred_date": date.today().isoformat(),
        "idempotency_key": "expense-request-42",
    }
    first = client.post("/accountant/expenses", json=payload, headers=auth)
    second = client.post("/accountant/expenses", json=payload, headers=auth)
    assert first.status_code == second.status_code == 201
    assert first.json()["id"] == second.json()["id"]
    assert first.json()["supporting_reference"] == "INV-UTILITY-42"
    assert db.query(Expense).count() == 1
    assert db.query(FinancialTransaction).filter_by(transaction_type="expense").count() == 1
    assert db.query(AuditLog).filter_by(action="accounting.expense_recorded").count() == 1
    assert db.query(AuditLog).filter_by(action="accounting.expense_category_created").count() == 1
    assert client.delete(f"/accountant/expenses/{first.json()['id']}", headers=auth).status_code == 404


def test_reports_and_exact_role_cross_department_denial(client, db, create_user, login):
    accountant, _, _, invoice = finance_case(db, create_user)
    auth = headers(login(accountant))
    client.post(
        f"/accountant/invoices/{invoice.id}/pay",
        json={"payment_method": "upi"}, headers=auth,
    )
    report = client.get("/accountant/reports?period=monthly", headers=auth)
    assert report.status_code == 200
    assert Decimal(report.json()["revenue"]) == Decimal("1250.00")
    assert report.json()["period_summary"][0]["period"] == date.today().strftime("%Y-%m")

    for endpoint in (
        "/admin/overview", "/doctors/me", "/nurse/dashboard",
        "/pharmacy/dashboard", "/lab/dashboard", "/radiology/dashboard",
        "/insurance/dashboard", "/ambulance/dashboard", "/probes/patient-history",
    ):
        assert client.get(endpoint, headers=auth).status_code == 403

    doctor = create_user("doctor")
    assert client.get(
        "/accountant/dashboard", headers=headers(login(doctor)),
    ).status_code == 403


def test_accountant_module_has_no_default_financial_data(client, create_user, login):
    accountant = create_user("accountant")
    auth = headers(login(accountant))
    assert client.get("/accountant/invoices", headers=auth).json() == []
    assert client.get("/accountant/payments", headers=auth).json() == []
    assert client.get("/accountant/expenses", headers=auth).json() == []
    assert client.get("/accountant/expense-categories", headers=auth).json() == []
