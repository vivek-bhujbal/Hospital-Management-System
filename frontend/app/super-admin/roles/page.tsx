const ROLE_GROUPS = [
  {
    title: 'Platform ownership',
    roles: [
      ['Super Admin', 'Owns platform configuration, organizations, Admin accounts, feature flags, role grants, audit logs, and system health.'],
    ],
  },
  {
    title: 'Hospital administration',
    roles: [
      ['Admin', 'Runs hospital operations: doctors, receptionist employees, patients, appointments, and billing.'],
      ['Hospital Manager', 'Read-only hospital operations role provisioned by Admin; monitors appointments, patients, doctors, staff, departments, and reports.'],
    ],
  },
  {
    title: 'Clinical and operational roles',
    roles: [
      ['Doctor', 'Consultations, assigned patients, prescriptions, laboratory orders, and radiology orders.'],
      ['Receptionist', 'Permission-scoped patient registration, scheduling, check-in, and payment collection.'],
      ['Nurse', 'Assignment-scoped patient care, vitals, notes, and nursing tasks.'],
      ['Pharmacist', 'Medicine inventory, purchasing, dispensing, and pharmacy alerts.'],
      ['Lab Technician', 'Laboratory samples, results, verification, and reports.'],
      ['Radiologist', 'Radiology studies, reports, amendments, and verification.'],
      ['Accountant', 'Transactions, expenses, refunds, billing reports, and daily closing.'],
      ['Insurance Officer', 'Providers, policies, claims, documents, and insurer payments.'],
      ['Ambulance Staff', 'Assigned vehicle, dispatch requests, trips, and trip status.'],
      ['Patient', 'Self-service appointments, clinical records, billing, and profile management.'],
    ],
  },
] as const

export default function SuperAdminRoles() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Role hierarchy</h1>
        <p className="mt-1 text-gray-600">Super Admin manages Admin accounts; Admin provisions Hospital Managers and manages hospital staff. This view does not change user roles.</p>
      </div>
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-blue-900">
        <span className="font-semibold">Super Admin</span> <span aria-hidden>→</span> creates and manages <span className="font-semibold">Admin</span> <span aria-hidden>→</span> provisions <span className="font-semibold">Hospital Manager</span> and other hospital staff
      </div>
      {ROLE_GROUPS.map((group) => (
        <section key={group.title} className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">{group.title}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {group.roles.map(([role, description]) => (
              <div key={role} className="rounded-lg border p-4">
                <h3 className="font-semibold text-gray-900">{role}</h3>
                <p className="mt-1 text-sm text-gray-600">{description}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
