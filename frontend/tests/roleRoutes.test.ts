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
    pharmacist: '/pharmacy/home',
    lab_technician: '/lab/home',
    radiologist: '/radiology/home',
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
  assert.equal(protectedPortalRedirect('/admin/home', 'admin'), null)
})
