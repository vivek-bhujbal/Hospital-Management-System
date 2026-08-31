from datetime import date, time, timedelta
from decimal import Decimal

from app.core.permissions import Permission, get_role_permissions
from app.models.all_models import (
    Appointment, AuditLog, Dispensing, Doctor, Medicine, MedicineBatch,
    MedicineCategory, Patient, PharmacyPrescriptionReview, Prescription,
    StockTransaction,
)


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def pharmacy_case(db, create_user):
    pharmacist = create_user("pharmacist")
    doctor_user = create_user("doctor")
    patient_user = create_user("patient")
    doctor = Doctor(user_id=doctor_user.id, name="Dr. Test", status="active")
    patient = Patient(user_id=patient_user.id, name="Patient Test")
    category = MedicineCategory(name="Tablets")
    db.add_all([doctor, patient, category])
    db.flush()
    appointment = Appointment(
        patient_id=patient.id, doctor_id=doctor.id, appt_date=date.today(),
        appt_time=time(10, 0), status="completed",
    )
    medicine = Medicine(
        name="Amoxicillin", sku="AMOX-500", category_id=category.id,
        unit="tablet", status="active",
    )
    db.add_all([appointment, medicine])
    db.flush()
    prescription = Prescription(
        appointment_id=appointment.id, diagnosis="Infection",
        medicine="Amoxicillin", dosage="One tablet twice daily",
        notes="After food",
    )
    batch = MedicineBatch(
        medicine_id=medicine.id, batch_number="BATCH-1",
        expiry_date=date.today() + timedelta(days=180),
        purchase_price=Decimal("5.00"), selling_price=Decimal("8.00"),
        quantity=20, available_quantity=20,
    )
    db.add_all([prescription, batch])
    db.commit()
    return pharmacist, prescription, medicine, batch


def test_pharmacist_verifies_without_mutating_doctor_prescription(
    client, db, create_user, login
):
    pharmacist, prescription, _, _ = pharmacy_case(db, create_user)
    original = (prescription.diagnosis, prescription.medicine, prescription.dosage, prescription.created_at)
    auth = headers(login(pharmacist))

    verified = client.post(
        f"/pharmacy/prescriptions/{prescription.id}/action",
        json={"action": "verify"}, headers=auth,
    )
    assert verified.status_code == 200, verified.text
    assert verified.json()["pharmacy_status"] == "verified"
    ready = client.post(
        f"/pharmacy/prescriptions/{prescription.id}/action",
        json={"action": "mark_for_dispensing"}, headers=auth,
    )
    assert ready.status_code == 200
    db.refresh(prescription)
    assert (prescription.diagnosis, prescription.medicine, prescription.dosage, prescription.created_at) == original


def test_rejection_requires_reason_and_cannot_be_dispensed(
    client, db, create_user, login
):
    pharmacist, prescription, medicine, batch = pharmacy_case(db, create_user)
    auth = headers(login(pharmacist))
    assert client.post(
        f"/pharmacy/prescriptions/{prescription.id}/action",
        json={"action": "reject"}, headers=auth,
    ).status_code == 422
    rejected = client.post(
        f"/pharmacy/prescriptions/{prescription.id}/action",
        json={"action": "reject", "reason": "Unreadable instructions"}, headers=auth,
    )
    assert rejected.status_code == 200
    dispense = client.post("/pharmacy/dispense", json={
        "prescription_id": prescription.id,
        "items": [{"medicine_id": medicine.id, "batch_id": batch.id, "quantity": 1}],
    }, headers=auth)
    assert dispense.status_code == 409


def test_atomic_dispensing_reduces_stock_and_blocks_duplicate(
    client, db, create_user, login
):
    pharmacist, prescription, medicine, batch = pharmacy_case(db, create_user)
    auth = headers(login(pharmacist))
    for action in ("verify", "mark_for_dispensing"):
        response = client.post(
            f"/pharmacy/prescriptions/{prescription.id}/action",
            json={"action": action}, headers=auth,
        )
        assert response.status_code == 200, response.text
    payload = {
        "prescription_id": prescription.id,
        "items": [{"medicine_id": medicine.id, "batch_id": batch.id, "quantity": 3}],
    }
    first = client.post("/pharmacy/dispense", json=payload, headers=auth)
    assert first.status_code == 201, first.text
    db.refresh(batch)
    assert batch.available_quantity == 17
    assert db.query(Dispensing).filter_by(prescription_id=prescription.id).count() == 1
    assert db.query(PharmacyPrescriptionReview).filter_by(
        prescription_id=prescription.id, status="dispensed"
    ).count() == 1
    duplicate = client.post("/pharmacy/dispense", json=payload, headers=auth)
    assert duplicate.status_code == 409
    db.refresh(batch)
    assert batch.available_quantity == 17
    assert db.query(AuditLog).filter_by(action="pharmacy.prescription_dispensed").count() == 1


def test_expired_stock_and_cross_role_access_are_blocked(
    client, db, create_user, login
):
    pharmacist, prescription, medicine, batch = pharmacy_case(db, create_user)
    patient = create_user("patient")
    assert client.get(
        "/pharmacy/dashboard", headers=headers(login(patient))
    ).status_code == 403
    auth = headers(login(pharmacist))
    permissions = get_role_permissions("pharmacist")
    assert permissions == {
        Permission.pharmacy_view.value,
        Permission.pharmacy_inventory.value,
        Permission.pharmacy_dispense.value,
    }
    assert client.get(
        f"/patients/{prescription.appointment_id}/history", headers=auth
    ).status_code == 403
    assert client.post(
        "/prescriptions/", json={"appointment_id": prescription.appointment_id},
        headers=auth,
    ).status_code == 403
    batch.expiry_date = date.today() - timedelta(days=1)
    db.commit()
    for action in ("verify", "mark_for_dispensing"):
        assert client.post(
            f"/pharmacy/prescriptions/{prescription.id}/action",
            json={"action": action}, headers=auth,
        ).status_code == 200
    response = client.post("/pharmacy/dispense", json={
        "prescription_id": prescription.id,
        "items": [{"medicine_id": medicine.id, "batch_id": batch.id, "quantity": 1}],
    }, headers=auth)
    assert response.status_code == 400
    db.refresh(batch)
    assert batch.available_quantity == 20


def test_damaged_stock_adjustment_is_audited(
    client, db, create_user, login
):
    pharmacist, _, _, batch = pharmacy_case(db, create_user)
    response = client.post(
        f"/pharmacy/inventory/{batch.id}/adjust",
        json={"action": "damaged", "quantity": 2, "reason": "Broken seal"},
        headers=headers(login(pharmacist)),
    )
    assert response.status_code == 200, response.text
    assert response.json()["available_quantity"] == 18
    transaction = db.query(StockTransaction).filter_by(batch_id=batch.id).one()
    assert transaction.reason == "Broken seal"
    assert db.query(AuditLog).filter_by(action="pharmacy.stock_damaged").count() == 1
