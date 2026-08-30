# Organization Scoping Migration Plan

## Decision

Organization scoping is intentionally not enabled in the current authorization change. The existing `organizations` table is not connected to users or clinical/financial records, and assigning existing rows to organizations without a verified mapping could expose or strand production data.

The Super Admin/Admin boundary is enforced now with exact backend roles. Organization isolation should follow as a separate, staged Alembic rollout.

## Target ownership graph

```text
Organization
├── Admin users
├── Doctors
├── Receptionist employees
├── Patients
├── Appointments
└── Billing
```

Appointments already reference patients and doctors, and billing already references patients and appointments. The safest design makes those relationships prove a consistent organization instead of independently trusting many client-supplied `organization_id` values.

## Staged migration

### 1. Add nullable ownership roots

Create an additive Alembic revision that adds nullable, indexed foreign keys:

- `users.organization_id` for hospital-bound roles, including Admin
- `patients.organization_id`
- `doctors.organization_id`
- `employees.organization_id`

Keep `super_admin.organization_id` null. Do not add a default organization and do not make columns non-null in this phase.

### 2. Backfill with an explicit mapping

Before deployment, produce a report of unassigned users, patients, doctors, employees, appointments, and bills. Require an operator-approved mapping from existing records to real organizations. Backfill in bounded batches and record counts before and after each batch.

Walk-in patients need an organization derived from their creating hospital or an explicit operator assignment; they cannot be inferred from a linked user because their `user_id` is null.

### 3. Validate dependent consistency

Add migration checks and application diagnostics that verify:

- each doctor's user and doctor profile have the same organization;
- each employee's user and employee profile have the same organization;
- each appointment's patient and doctor belong to the same organization;
- each bill matches both its patient and appointment organization.

If historical conflicts exist, stop and report them instead of rewriting ownership automatically.

### 4. Enforce request scoping

Introduce a backend organization context derived only from the authenticated database user, never from a browser-supplied organization ID. Apply reusable query helpers to Admin reads and mutations. Super Admin platform endpoints remain global and must not reuse Admin-scoped query helpers.

Creation rules should set organization ownership from the current Admin automatically. Updates must reject cross-organization foreign keys with `404` or `403` without revealing unrelated record details.

### 5. Add database constraints

After the backfill and consistency checks pass in production-like data:

- make required ownership columns non-null for hospital-bound records;
- add composite uniqueness where identifiers are organization-local;
- consider composite foreign keys or database triggers only after measuring their operational cost;
- retain nullable ownership only for genuinely platform-global records.

Appointments and billing may use a denormalized `organization_id` for query performance, but it must be server-derived and consistency-checked against their parent records.

### 6. Roll out safely

Use expand/backfill/enforce/contract releases rather than one destructive migration. Each revision must have an upgrade test against a preserved data snapshot, row-count assertions, a documented rollback boundary, and no `create_all()` or database reset.

## Required tests before enforcement

- Admin can read and mutate records only in the assigned organization.
- IDs from another organization return a non-disclosing denial.
- Super Admin can manage organizations but cannot enter hospital-operational APIs.
- Doctor, receptionist, patient, appointment, prescription, billing, and enterprise workflows remain organization-consistent.
- Backfill preserves every user, patient, appointment, prescription, and billing row.
- Unassigned or conflicting legacy rows block the enforcement migration with an actionable report.
