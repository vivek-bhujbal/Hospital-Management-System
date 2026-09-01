import assert from 'node:assert/strict'
import test from 'node:test'

import { protectedPortalRedirect, roleHome } from '../lib/roleRoutes.ts'

test('login homes cover every role', () => {
  const homes = {
    patient: '/patient/home',
    doctor: '/doctor/home',
    receptionist: '/receptionist/home',
    admin: '/admin/home',
    super_admin: '/super-admin/home',
    hospital_manager: '/manager/home',
    nurse: '/nurse/home',
    pharmacist: '/pharmacist/home',
    lab_technician: '/lab/home',
    radiologist: '/radiologist/home',
    accountant: '/accountant/home',
    insurance_officer: '/insurance/home',
    ambulance_staff: '/ambulance/home',
  } as const
  for (const [role, home] of Object.entries(homes)) {
    assert.equal(roleHome(role), home)
  }
  assert.equal(roleHome('unknown'), '/login')
})

test('Admin is redirected away from every Super Admin route', () => {
  const paths = [
    '/super-admin/home',
    '/super-admin/users',
    '/super-admin/admins',
    '/super-admin/hospitals',
    '/super-admin/roles',
    '/super-admin/permissions',
    '/super-admin/settings',
    '/super-admin/features',
    '/super-admin/audit-logs',
    '/super-admin/system-health',
  ]
  for (const path of paths) {
    assert.equal(protectedPortalRedirect(path, 'admin'), '/admin/home')
  }
})

test('Super Admin is redirected away from hospital Admin routes', () => {
  assert.equal(protectedPortalRedirect('/admin/home', 'super_admin'), '/super-admin/home')
  assert.equal(protectedPortalRedirect('/super-admin/home', 'super_admin'), null)
  assert.equal(protectedPortalRedirect('/super-admin/users', 'super_admin'), null)
  assert.equal(protectedPortalRedirect('/admin/home', 'admin'), null)
  assert.equal(protectedPortalRedirect('/admin/staff', 'admin'), null)
  assert.equal(protectedPortalRedirect('/admin/employees', 'admin'), '/admin/home')
  assert.equal(protectedPortalRedirect('/admin/employees/12/permissions', 'admin'), '/admin/home')
})

test('Receptionist routes are role-protected and limited to the final module', () => {
  const allowed = [
    '/receptionist/home',
    '/receptionist/patients',
    '/receptionist/register-patient',
    '/receptionist/schedule',
    '/receptionist/queue',
    '/receptionist/billing',
  ]
  for (const path of allowed) {
    assert.equal(protectedPortalRedirect(path, 'receptionist'), null)
  }
  assert.equal(protectedPortalRedirect('/receptionist/reports', 'receptionist'), '/receptionist/home')
  assert.equal(protectedPortalRedirect('/receptionist/prescriptions', 'receptionist'), '/receptionist/home')
  assert.equal(protectedPortalRedirect('/receptionist/consultation', 'receptionist'), '/receptionist/home')
  assert.equal(protectedPortalRedirect('/receptionist/unknown-page', 'receptionist'), '/receptionist/home')
  assert.equal(protectedPortalRedirect('/receptionist/unknown-page', undefined), '/login')
  assert.equal(protectedPortalRedirect('/doctor/home', 'receptionist'), '/receptionist/home')
  assert.equal(protectedPortalRedirect('/admin/home', 'receptionist'), '/receptionist/home')
  assert.equal(protectedPortalRedirect('/receptionist/home', 'doctor'), '/doctor/home')
})

test('Doctor routes are role-protected and limited to the clinical module', () => {
  const allowed = [
    '/doctor/home',
    '/doctor/appointments',
    '/doctor/patients',
    '/doctor/patients/42',
    '/doctor/consultation',
    '/doctor/profile',
  ]
  for (const path of allowed) {
    assert.equal(protectedPortalRedirect(path, 'doctor'), null)
  }
  for (const path of [
    '/doctor/billing',
    '/doctor/checkin',
    '/doctor/register-patient',
    '/doctor/employees',
    '/doctor/reports',
    '/doctor/patients/not-an-id',
  ]) {
    assert.equal(protectedPortalRedirect(path, 'doctor'), '/doctor/home')
  }
  assert.equal(protectedPortalRedirect('/doctor/home', 'receptionist'), '/receptionist/home')
  assert.equal(protectedPortalRedirect('/admin/home', 'doctor'), '/doctor/home')
  assert.equal(protectedPortalRedirect('/receptionist/home', 'doctor'), '/doctor/home')
  assert.equal(protectedPortalRedirect('/doctor/home', undefined), '/login')
})

test('Hospital Manager routes are read-only operational pages and cross-role URLs are blocked', () => {
  const allowed = [
    '/manager/home',
    '/manager/appointments',
    '/manager/patients',
    '/manager/doctors',
    '/manager/staff',
    '/manager/reports',
    '/manager/departments',
  ]
  for (const path of allowed) {
    assert.equal(protectedPortalRedirect(path, 'hospital_manager'), null)
  }
  for (const path of [
    '/manager/analytics',
    '/manager/settings',
    '/manager/billing',
    '/manager/permissions',
    '/manager/unknown',
  ]) {
    assert.equal(protectedPortalRedirect(path, 'hospital_manager'), '/manager/home')
  }
  for (const path of [
    '/admin/home',
    '/doctor/home',
    '/receptionist/home',
    '/nurse/home',
    '/pharmacist/home',
    '/lab/home',
    '/radiology/home',
    '/accountant/home',
    '/insurance/home',
    '/ambulance/home',
  ]) {
    assert.equal(protectedPortalRedirect(path, 'hospital_manager'), '/manager/home')
  }
  assert.equal(protectedPortalRedirect('/manager/home', 'admin'), '/admin/home')
  assert.equal(protectedPortalRedirect('/manager/home', undefined), '/login')
})

test('Nurse routes are assignment-scoped clinical-support pages and cross-role URLs are blocked', () => {
  const allowed = [
    '/nurse/home',
    '/nurse/patients',
    '/nurse/patient/42',
    '/nurse/appointments',
    '/nurse/vitals',
    '/nurse/tasks',
  ]
  for (const path of allowed) {
    assert.equal(protectedPortalRedirect(path, 'nurse'), null)
  }
  for (const path of [
    '/nurse/notes',
    '/nurse/patients/42',
    '/nurse/patient/not-an-id',
    '/nurse/billing',
    '/nurse/pharmacy',
    '/nurse/unknown',
  ]) {
    assert.equal(protectedPortalRedirect(path, 'nurse'), '/nurse/home')
  }
  for (const path of [
    '/admin/home',
    '/doctor/home',
    '/receptionist/home',
    '/pharmacist/home',
    '/lab/home',
    '/radiology/home',
    '/accountant/home',
    '/insurance/home',
    '/ambulance/home',
  ]) {
    assert.equal(protectedPortalRedirect(path, 'nurse'), '/nurse/home')
  }
  assert.equal(protectedPortalRedirect('/nurse/home', 'doctor'), '/doctor/home')
  assert.equal(protectedPortalRedirect('/nurse/home', undefined), '/login')
})

test('Pharmacist routes are pharmacy-only and legacy routes are closed', () => {
  for (const path of [
    '/pharmacist/home', '/pharmacist/prescriptions',
    '/pharmacist/prescriptions/42', '/pharmacist/inventory',
    '/pharmacist/dispensing',
  ]) assert.equal(protectedPortalRedirect(path, 'pharmacist'), null)
  for (const path of [
    '/pharmacist/prescriptions/not-an-id', '/pharmacist/patients',
    '/pharmacist/billing', '/pharmacist/diagnosis', '/pharmacy/home',
  ]) assert.equal(protectedPortalRedirect(path, 'pharmacist'), '/pharmacist/home')
  assert.equal(protectedPortalRedirect('/doctor/home', 'pharmacist'), '/pharmacist/home')
  assert.equal(protectedPortalRedirect('/admin/home', 'pharmacist'), '/pharmacist/home')
  assert.equal(protectedPortalRedirect('/pharmacist/home', 'doctor'), '/doctor/home')
  assert.equal(protectedPortalRedirect('/pharmacist/home', undefined), '/login')
})

test('Lab Technician routes are laboratory-only and removed pages are blocked', () => {
  for (const path of ['/lab/home', '/lab/orders', '/lab/orders/42', '/lab/results']) {
    assert.equal(protectedPortalRedirect(path, 'lab_technician'), null)
  }
  for (const path of [
    '/lab/orders/not-an-id', '/lab/samples', '/lab/reports',
    '/lab/prescriptions', '/lab/billing', '/lab/radiology', '/lab/unknown',
  ]) assert.equal(protectedPortalRedirect(path, 'lab_technician'), '/lab/home')
  assert.equal(protectedPortalRedirect('/pharmacist/home', 'lab_technician'), '/lab/home')
  assert.equal(protectedPortalRedirect('/radiology/home', 'lab_technician'), '/lab/home')
  assert.equal(protectedPortalRedirect('/admin/home', 'lab_technician'), '/lab/home')
  assert.equal(protectedPortalRedirect('/lab/home', 'doctor'), '/doctor/home')
  assert.equal(protectedPortalRedirect('/lab/home', undefined), '/login')
})

test('Radiologist routes are imaging-only, assignment-ready pages and legacy routes are closed', () => {
  for (const path of [
    '/radiologist/home', '/radiologist/orders',
    '/radiologist/orders/42', '/radiologist/reports',
  ]) assert.equal(protectedPortalRedirect(path, 'radiologist'), null)
  for (const path of [
    '/radiologist/orders/not-an-id', '/radiologist/studies',
    '/radiologist/lab', '/radiologist/pharmacy', '/radiologist/billing',
    '/radiologist/insurance', '/radiologist/admin', '/radiologist/unknown',
  ]) assert.equal(protectedPortalRedirect(path, 'radiologist'), '/radiologist/home')
  assert.equal(protectedPortalRedirect('/radiology/home', 'radiologist'), '/radiologist/home')
  assert.equal(protectedPortalRedirect('/lab/home', 'radiologist'), '/radiologist/home')
  assert.equal(protectedPortalRedirect('/pharmacist/home', 'radiologist'), '/radiologist/home')
  assert.equal(protectedPortalRedirect('/admin/home', 'radiologist'), '/radiologist/home')
  assert.equal(protectedPortalRedirect('/radiologist/home', 'doctor'), '/doctor/home')
  assert.equal(protectedPortalRedirect('/radiologist/home', undefined), '/login')
})

test('Accountant routes are finance-only and legacy or cross-department pages are blocked', () => {
  for (const path of [
    '/accountant/home', '/accountant/invoices', '/accountant/payments',
    '/accountant/expenses', '/accountant/reports',
  ]) assert.equal(protectedPortalRedirect(path, 'accountant'), null)
  for (const path of [
    '/accountant/billing', '/accountant/transactions', '/accountant/refunds',
    '/accountant/daily-closing', '/accountant/prescriptions', '/accountant/lab',
    '/accountant/radiology', '/accountant/insurance', '/accountant/admin',
    '/accountant/unknown',
  ]) assert.equal(protectedPortalRedirect(path, 'accountant'), '/accountant/home')
  for (const path of [
    '/admin/home', '/doctor/home', '/receptionist/home', '/nurse/home',
    '/pharmacist/home', '/lab/home', '/radiologist/home',
    '/insurance/home', '/ambulance/home',
  ]) assert.equal(protectedPortalRedirect(path, 'accountant'), '/accountant/home')
  assert.equal(protectedPortalRedirect('/accountant/home', 'doctor'), '/doctor/home')
  assert.equal(protectedPortalRedirect('/accountant/home', undefined), '/login')
})

test('Insurance Officer routes expose only policy and claim workflows', () => {
  for (const path of [
    '/insurance/home', '/insurance/patients', '/insurance/claims',
    '/insurance/claims/42', '/insurance/approvals',
  ]) assert.equal(protectedPortalRedirect(path, 'insurance_officer'), null)
  for (const path of [
    '/insurance/claims/not-an-id', '/insurance/providers', '/insurance/policies',
    '/insurance/documents', '/insurance/payments', '/insurance/prescriptions',
    '/insurance/lab', '/insurance/radiology', '/insurance/nursing',
    '/insurance/ambulance', '/insurance/admin', '/insurance/unknown',
  ]) assert.equal(protectedPortalRedirect(path, 'insurance_officer'), '/insurance/home')
  for (const path of [
    '/admin/home', '/doctor/home', '/receptionist/home', '/nurse/home',
    '/pharmacist/home', '/lab/home', '/radiologist/home',
    '/accountant/home', '/ambulance/home',
  ]) assert.equal(protectedPortalRedirect(path, 'insurance_officer'), '/insurance/home')
  assert.equal(protectedPortalRedirect('/insurance/home', 'doctor'), '/doctor/home')
  assert.equal(protectedPortalRedirect('/insurance/home', undefined), '/login')
})

test('Ambulance Staff routes expose only assignment-scoped transport workflows', () => {
  for (const path of [
    '/ambulance/home', '/ambulance/requests', '/ambulance/requests/42',
    '/ambulance/trips', '/ambulance/vehicles',
  ]) assert.equal(protectedPortalRedirect(path, 'ambulance_staff'), null)
  for (const path of [
    '/ambulance/requests/not-an-id', '/ambulance/vehicle', '/ambulance/dispatch',
    '/ambulance/patients', '/ambulance/prescriptions', '/ambulance/pharmacy',
    '/ambulance/lab', '/ambulance/radiology', '/ambulance/billing',
    '/ambulance/accounting', '/ambulance/insurance', '/ambulance/admin',
    '/ambulance/unknown',
  ]) assert.equal(protectedPortalRedirect(path, 'ambulance_staff'), '/ambulance/home')
  for (const path of [
    '/admin/home', '/doctor/home', '/receptionist/home', '/nurse/home',
    '/pharmacist/home', '/lab/home', '/radiologist/home',
    '/accountant/home', '/insurance/home',
  ]) assert.equal(protectedPortalRedirect(path, 'ambulance_staff'), '/ambulance/home')
  assert.equal(protectedPortalRedirect('/ambulance/home', 'doctor'), '/doctor/home')
  assert.equal(protectedPortalRedirect('/ambulance/home', undefined), '/login')
})
