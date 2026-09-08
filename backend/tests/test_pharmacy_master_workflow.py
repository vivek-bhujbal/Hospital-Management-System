from datetime import date, timedelta

from app.models.all_models import Medicine, MedicineBatch, MedicineCategory, StockTransaction, Supplier


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_admin_stock_is_shared_with_pharmacist_without_second_receipt(client, db, create_user, login):
    admin = create_user('admin')
    admin_auth = headers(login(admin))
    pharmacist_auth = headers(login(create_user('pharmacist')))
    category = MedicineCategory(name='Shared category', status='active')
    supplier = Supplier(name='Shared supplier', status='active')
    db.add_all([category, supplier])
    db.flush()
    medicine = Medicine(name='Shared medicine', category_id=category.id, status='active', minimum_stock_level=100)
    db.add(medicine)
    db.commit()
    assert client.get('/pharmacy/inventory/summary', headers=pharmacist_auth).json()['total_stock_quantity'] == 0
    payload = {
        'medicine_id': medicine.id, 'supplier_id': supplier.id, 'batch_number': 'ADMIN-100',
        'expiry_date': str(date.today() + timedelta(days=180)),
        'quantity': 100, 'purchase_price': '2.00', 'selling_price': '3.00',
    }
    saved = client.post('/admin/pharmacy/inventory', headers=admin_auth, json=payload)
    assert saved.status_code == 201, saved.text
    assert saved.json()['available_quantity'] == 100
    for attempt in range(2):
        inventory = client.get('/pharmacy/inventory?include_empty=true', headers=pharmacist_auth).json()
        assert len(inventory) == 1
        assert inventory[0]['id'] == saved.json()['id']
        assert inventory[0]['available_quantity'] == 100
        assert inventory[0]['supplier_id'] == supplier.id
        assert client.get('/pharmacy/inventory/summary', headers=pharmacist_auth).json()['total_stock_quantity'] == 100
    assert client.post('/pharmacy/inventory', headers=pharmacist_auth, json=payload).status_code == 409
    assert client.post('/admin/pharmacy/inventory', headers=admin_auth, json=payload).status_code == 409
    assert client.post('/admin/pharmacy/inventory', headers=pharmacist_auth, json=payload).status_code == 403
    doctor_auth = headers(login(create_user('doctor')))
    assert client.post('/admin/pharmacy/inventory', headers=doctor_auth, json=payload).status_code == 403
    assert db.query(StockTransaction).count() == 1
    assert db.query(StockTransaction).one().created_by == admin.id
    assert db.query(MedicineBatch).one().available_quantity == 100
    payload.update(batch_number='BAD-EXPIRY', expiry_date=str(date.today() - timedelta(days=1)))
    assert client.post('/admin/pharmacy/inventory', headers=admin_auth, json=payload).status_code == 400
    payload.update(batch_number='BAD-QUANTITY', quantity=0)
    assert client.post('/admin/pharmacy/inventory', headers=admin_auth, json=payload).status_code == 422
    assert db.query(MedicineBatch).count() == 1


def test_admin_master_data_to_pharmacist_multi_batch_workflow(client, db, create_user, login):
    admin = create_user("admin")
    pharmacist = create_user("pharmacist")
    admin_auth = headers(login(admin))
    pharmacist_auth = headers(login(pharmacist))

    category_response = client.post(
        "/admin/pharmacy/categories",
        json={"name": "Analgesics", "description": "Pain medicines", "status": "active"},
        headers=admin_auth,
    )
    assert category_response.status_code == 201, category_response.text
    category_id = category_response.json()["id"]

    supplier_response = client.post(
        "/admin/pharmacy/suppliers",
        json={
            "name": "ABC Pharmaceuticals Pvt Ltd", "contact_person": "Rahul Mehta",
            "phone": "+91 9876543210", "email": "supplier@example.com",
            "address": "Mumbai, Maharashtra", "status": "active",
        },
        headers=admin_auth,
    )
    assert supplier_response.status_code == 201, supplier_response.text
    supplier_id = supplier_response.json()["id"]

    medicine_response = client.post(
        "/admin/pharmacy/medicines",
        json={
            "name": "Paracetamol 500mg", "generic_name": "Paracetamol",
            "sku": "PCM-500", "category_id": category_id, "unit": "Tablet",
            "minimum_stock_level": 20, "status": "active",
        },
        headers=admin_auth,
    )
    assert medicine_response.status_code == 201, medicine_response.text
    medicine_id = medicine_response.json()["id"]

    assert client.post(
        "/admin/pharmacy/suppliers",
        json={"name": "Denied Supplier", "status": "active"},
        headers=pharmacist_auth,
    ).status_code == 403
    assert client.post(
        "/pharmacy/suppliers",
        json={"name": "Legacy route is gone", "status": "active"},
        headers=pharmacist_auth,
    ).status_code == 405

    for batch_number, quantity in (("A123", 50), ("B456", 100)):
        response = client.post(
            "/pharmacy/inventory",
            json={
                "medicine_id": medicine_id, "supplier_id": supplier_id,
                "batch_number": batch_number,
                "expiry_date": str(date.today() + timedelta(days=180)),
                "quantity": quantity, "purchase_price": "2.00",
                "selling_price": "3.00",
            },
            headers=pharmacist_auth,
        )
        assert response.status_code == 201, response.text

    assert db.query(Medicine).count() == 1
    assert db.query(MedicineBatch).filter_by(medicine_id=medicine_id).count() == 2
    summary = client.get("/pharmacy/inventory/summary", headers=pharmacist_auth)
    assert summary.status_code == 200
    assert summary.json()["total_medicines"] == 1
    assert summary.json()["total_stock_quantity"] == 150

    deactivated = client.patch(
        f"/admin/pharmacy/suppliers/{supplier_id}",
        json={"status": "inactive"}, headers=admin_auth,
    )
    assert deactivated.status_code == 200
    assert client.get(
        "/pharmacy/suppliers?active_only=true", headers=pharmacist_auth,
    ).json() == []
    blocked = client.post(
        "/pharmacy/inventory",
        json={
            "medicine_id": medicine_id, "supplier_id": supplier_id,
            "batch_number": "C789",
            "expiry_date": str(date.today() + timedelta(days=180)),
            "quantity": 10, "purchase_price": "2.00", "selling_price": "3.00",
        },
        headers=pharmacist_auth,
    )
    assert blocked.status_code == 400
    history = client.get("/pharmacy/inventory?include_empty=true", headers=pharmacist_auth).json()
    assert {item["supplier_name"] for item in history} == {"ABC Pharmaceuticals Pvt Ltd"}
    assert all(item["supplier_status"] == "inactive" for item in history)


def test_master_data_validation_and_soft_status_controls(client, db, create_user, login):
    admin = create_user("admin")
    auth = headers(login(admin))
    payload = {"name": "Antibiotics", "status": "active"}
    assert client.post("/admin/pharmacy/categories", json=payload, headers=auth).status_code == 201
    duplicate = client.post(
        "/admin/pharmacy/categories",
        json={"name": "  antibiotics  ", "status": "active"}, headers=auth,
    )
    assert duplicate.status_code == 409
    invalid_phone = client.post(
        "/admin/pharmacy/suppliers",
        json={"name": "Invalid Phone Supplier", "phone": "call-me", "status": "active"},
        headers=auth,
    )
    assert invalid_phone.status_code == 422
    assert db.query(MedicineCategory).count() == 1
    assert db.query(Supplier).count() == 0


def test_catalog_save_creates_category_and_preserves_specialty_on_edit(client, db, create_user, login):
    auth = headers(login(create_user('admin')))
    response = client.post('/admin/pharmacy/medicines', headers=auth, json={
        'name': 'Amlodipine tablet', 'generic_name': 'Amlodipine',
        'category_name': 'Antihypertensives', 'unit': 'Tablet',
        'specializations': ['Cardiologist'],
    })
    assert response.status_code == 201, response.text
    medicine = response.json()
    assert medicine['category_name'] == 'Antihypertensives'
    assert medicine['specializations'] == ['Cardiologist']
    second = client.post('/admin/pharmacy/medicines', headers=auth, json={
        'name': 'Losartan tablet', 'category_name': '  antihypertensives  ', 'unit': 'Tablet',
    })
    assert second.status_code == 201, second.text
    assert second.json()['category_id'] == medicine['category_id']
    assert db.query(MedicineCategory).count() == 1
    updated = client.patch(f"/admin/pharmacy/medicines/{medicine['id']}", headers=auth, json={
        'category_name': 'Cardiovascular medicines', 'specializations': ['Cardiologist', 'General Practitioner'],
    })
    assert updated.status_code == 200, updated.text
    assert updated.json()['category_name'] == 'Cardiovascular medicines'
    assert updated.json()['specializations'] == ['Cardiologist', 'General Practitioner']


def test_catalog_category_rejects_inactive_and_rolls_back_on_duplicate_sku(client, db, create_user, login):
    auth = headers(login(create_user('admin')))
    category = MedicineCategory(name='Inactive category', status='inactive')
    db.add(category)
    db.commit()
    blocked = client.post('/admin/pharmacy/medicines', headers=auth, json={
        'name': 'Blocked medicine', 'category_name': 'inactive category',
    })
    assert blocked.status_code == 400
    payload = {'name': 'First medicine', 'sku': 'SAME-SKU', 'category_name': 'Existing category'}
    assert client.post('/admin/pharmacy/medicines', headers=auth, json=payload).status_code == 201
    payload.update(name='Second medicine', category_name='Must roll back')
    assert client.post('/admin/pharmacy/medicines', headers=auth, json=payload).status_code == 409
    assert db.query(MedicineCategory).filter_by(name='Must roll back').count() == 0
    pharmacist_auth = headers(login(create_user('pharmacist')))
    assert client.get('/admin/pharmacy/specializations', headers=pharmacist_auth).status_code == 403
    assert client.post('/admin/pharmacy/medicines', headers=pharmacist_auth, json=payload).status_code == 403
