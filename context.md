# Hospital Management System — Project Context

> Last reconciled with the authorization-separation working tree based on branch `main` at commit `a76521a` on 2026-09-01.
>
> This document describes the application as it currently exists in code. When this file conflicts with the README or older walkthrough notes, treat the implementation files named here as the source of truth.

## 1. Project summary

The Hospital Management System (HMS) is a role-based, full-stack web application for managing patient registration, appointments, consultations, prescriptions, billing, doctors, and receptionist employees.

The application supports thirteen user roles. The original roles remain backward compatible:

- `patient`: self-registers, verifies email, books appointments, and views personal clinical and billing information.
- `doctor`: views assigned appointments and patient history, updates a doctor profile, and completes consultations by issuing prescriptions.
- `receptionist`: registers walk-in patients, schedules and checks in appointments, and collects payments, subject to per-employee permissions.
- `admin`: views hospital-wide metrics and manages doctors, receptionist employees, permissions, patients, appointments, and billing reports.

Enterprise roles are `super_admin`, `hospital_manager`, `nurse`, `pharmacist`, `lab_technician`, `radiologist`, `accountant`, `insurance_officer`, and `ambulance_staff`. Hospital Manager is a read-only hospital-operations role; it monitors patient flow, appointments, staffing, doctors, departments, reports, and revenue summaries without accessing clinical, financial-transaction, or specialist operational modules. Pharmacist is an exact-role pharmacy operator with read-only access to doctor prescriptions, a separate verification state machine, batch inventory adjustments, and atomic dispensing. Lab Technician is an exact-role laboratory operator with assignment-scoped orders, guarded sample/test transitions, draft results, and immutable finalized results. Radiologist is an exact-role imaging operator with assignment-scoped orders, one study per order, guarded interpretation/report transitions, and immutable finalized report versions with explicit amendments. Accountant is an exact-role finance operator with appointment-backed invoices, duplicate-safe payments, append-only audited expenses, and non-clinical financial reporting. Insurance Officer is an exact-role insurance operator with policy verification, one claim per invoice, guarded review/decision/settlement transitions, required-document tracking, and immutable officer-attributed action history. Ambulance Staff is an exact-role transport operator with assigned vehicles, shared pending requests, staff-owned trips, guarded status transitions, and audited history. The other backend modules cover organizations/settings/audit and assignment-scoped nursing. The frontend exposes authenticated live-data portals for each role.

The active application is the nested repository at `Hospital-Management-System/`. Python files named `generate_*.py`, `setup_*.py`, and frontend refactoring scripts are development/scaffolding utilities; they are not part of the runtime request path.

### 1.1 Latest implemented changes

- `super_admin` is now a standalone platform role and no longer inherits Admin or Hospital Manager access. Exact backend role guards separate `/super-admin/*` from `/admin/*` and `/admin/employees/*`.
- Super Admin and Admin layouts and sidebars are separated. Middleware provides an early role-cookie redirect, while live layout checks and FastAPI dependencies remain authoritative.
- Login homes are centralized for all thirteen roles. An authenticated Admin visiting `/super-admin/*` is redirected to `/admin/home`; Super Admin is redirected away from `/admin/*`.
- The Super Admin dashboard now includes organization/Admin/user/grant/setting/feature counts, recent audit activity, and backend/database/Redis health. Admin details, a role reference, paginated audit table, organization editing, and feature-description editing are implemented.
- The Admin dashboard now includes collected revenue and recent appointment/billing activity. Patient and appointment filters and receptionist employee profile/status editing are implemented.
- Admin doctor create/update/password-reset/delete operations now write sanitized audit events. Existing employee creation/update/deactivation/permission audit events remain intact.
- A Super Admin can reset an Admin account password from `/super-admin/admins/[id]`. The backend enforces the shared password-strength policy, restricts targets to the `admin` role, clears outstanding password-reset tokens, hashes the replacement password, and writes a secret-free audit event.
- Organization isolation is intentionally deferred; `docs/organization-scoping-plan.md` defines an additive expand/backfill/validate/enforce rollout that preserves existing data.
- Radiologist now has a dedicated `/radiologist/*` portal and exact-role, assignment-scoped imaging APIs. One-study-per-order integrity, guarded review/report states, finalized-report locking, and audited reason-required amendment versions are enforced in the backend.
- Accountant now has a dedicated five-page `/accountant/*` portal and exact-role finance API. Invoice-backed payment locking, transaction uniqueness, expense idempotency/supporting references, append-only records, and audit events protect every financial mutation.
- Insurance Officer now has a dedicated `/insurance/*` portal and exact-role claim API. Database uniqueness blocks duplicate invoice claims; guarded submission, review, document, decision, and insurance-settlement actions record Officer, timestamp, status, and reason history without exposing clinical fields.
- Ambulance Staff now has a dedicated `/ambulance/*` portal and exact-role transport API. Pending requests form a shared dispatch queue, while accepted requests and trips are staff-owned; guarded assignment/trip transitions persist the responsible staff, vehicle, timing, status history, and audit events without exposing clinical data.

## 2. Technology stack

### Frontend

- Next.js `14.2.5`, using the App Router
- React 18
- TypeScript 5 with strict checking enabled
- Tailwind CSS 3.4
- Server Components for most data-backed pages
- Server Actions for authenticated mutations
- `lucide-react` is installed, although many screens use inline SVGs

### Backend

- Python 3.10 in Docker
- FastAPI
- SQLAlchemy ORM using synchronous sessions
- Pydantic and `pydantic-settings`
- Uvicorn
- JWT bearer authentication via `python-jose`
- Password hashing via Passlib/bcrypt
- SMTP email via the Python standard library

### Data and deployment

- MySQL through the PyMySQL driver
- Alembic for versioned schema migrations
- Dockerfiles for frontend and backend
- Docker Compose services for MySQL, Redis, a one-shot Alembic migrator, FastAPI, Celery, and Next.js

## 3. Repository layout

```text
Hospital-Management-System/
├── backend/
│   ├── app/
│   │   ├── core/              # Settings, JWT/password helpers, auth dependencies
│   │   ├── models/            # SQLAlchemy models
│   │   ├── routers/           # FastAPI route modules
│   │   ├── schemas/           # Pydantic request/response models
│   │   ├── services/          # SMTP email service
│   │   ├── database.py        # Engine, session factory, Base, get_db
│   │   └── main.py            # FastAPI app and router registration
│   ├── .env.example
│   ├── alembic/              # Versioned database migrations
│   ├── alembic.ini
│   ├── create_admin.py
│   ├── init_db.py
│   ├── migrate_auth.py
│   ├── reset_db.py
│   ├── setup_docker_db.py
│   ├── requirements.txt
│   └── Dockerfile
├── database/
│   └── schema.sql             # Baseline SQL schema; see migration caveat below
├── frontend/
│   ├── app/
│   │   ├── (auth)/            # Login, registration, verification, password reset
│   │   ├── actions/           # Next.js server actions grouped by role
│   │   ├── admin/
│   │   ├── doctor/
│   │   ├── patient/
│   │   └── receptionist/
│   ├── components/            # Shared dashboards, forms, polling, receipts, toasts
│   ├── lib/                   # Authenticated API helper and UI permission helper
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── import_schema.py
└── README.md
```

## 4. High-level architecture and request flow

```text
Browser
  │
  ├─ Public/auth client pages ──────────────┐
  │                                         │ HTTP JSON
  └─ Next.js Server Components/Actions      ▼
        │ reads HttpOnly `token` cookie   FastAPI :8000
        │ adds Authorization header          │
        └─────────────────────────────────────┤ SQLAlchemy/PyMySQL
                                              ▼
                                           MySQL
```

Most dashboard pages are Server Components. They call `frontend/lib/api.ts`, which:

1. Reads the `token` HttpOnly cookie.
2. Adds `Authorization: Bearer <token>`.
3. calls `API_INTERNAL_URL` from server code when configured, otherwise `NEXT_PUBLIC_API_URL`, defaulting to `http://localhost:8000`.
4. disables caching with `cache: 'no-store'`.
5. redirects to `/login` on a backend `401` response.
6. throws a generic error containing the backend status/body for other failures.

Mutations are implemented as role-specific Server Actions in `frontend/app/actions/`. Successful actions revalidate affected paths and sometimes redirect.

Some original dashboard pages still render `AutoRefresh`, which calls `router.refresh()` every five seconds. Authenticated WebSocket topics are also available at `/ws/{topic}`, with server-side topic permission checks.

## 5. Authentication and authorization

### 5.1 Patient registration and verification

Public patient registration is handled by `POST /auth/register`.

- The backend always assigns the `patient` role; it does not trust a role supplied by the browser.
- A `users` row and linked `patients` row are created.
- A random URL-safe verification token is generated.
- Only the SHA-256 hash of the token is stored.
- Verification tokens expire after 24 hours.
- The email link targets `${FRONTEND_URL}/verify-email?token=...`.
- Re-registering an unverified email rotates and resends its verification token, then returns `409`.
- Login is blocked until `is_email_verified` is true.

Registration, reset, and administrator bootstrap paths enforce at least eight characters with uppercase, lowercase, numeric, and special characters in the backend as well as the frontend.

### 5.2 Login and session storage

`POST /auth/login` verifies the email/password, active flag, and email verification state. The JWT contains:

- `sub`: user ID as a string
- `role`
- `email`
- `exp`

The Next.js login action stores the JWT in an HttpOnly, `SameSite=Lax` cookie named `token`. The cookie is marked `Secure` in production. Receptionist permissions, when present, are stored in a second HttpOnly cookie named `employee_permissions`.

JWT lifetime uses `ACCESS_TOKEN_EXPIRE_MINUTES`, and all frontend session cookies use the backend-provided `expires_in` value.

### 5.3 Password recovery

- `POST /auth/forgot-password` returns the same success-shaped response whether an account exists or not, reducing email enumeration.
- Reset tokens are random, stored as SHA-256 hashes, single-use, and expire after one hour.
- `POST /auth/reset-password` replaces the bcrypt hash and clears the reset token fields.

### 5.4 Backend authorization model

`get_current_user` decodes the bearer token, reloads the user by ID, and rejects a user deactivated after token issuance. Receptionists must also have a linked active `employees` row; missing or inactive employee profiles are rejected for new logins and existing sessions.

Two dependency types enforce access:

- `RoleChecker`: allows a fixed list of roles with the documented Admin operational inheritance.
- `ExactRoleChecker`: requires the stored role without inheritance; Hospital Manager APIs use this guard so an Admin cannot enter the Manager portal/API.
- `PermissionChecker`: evaluates the role's static and dynamic grants; for receptionists, it also applies the linked active employee's legacy permission overrides.

The public dependency factories are `require_role(...)`, `require_exact_role(...)`, `require_any_role(...)`, and `require_permission(...)`. Admin retains the legacy Hospital Manager capability baseline where applicable, but the dedicated Manager portal/API requires the exact Hospital Manager role. Super Admin is standalone and has only platform mutation permissions. Operational roles do not inherit administrative permissions.

Receptionist permissions are:

- `can_register_patient`
- `can_schedule_appointment`
- `can_checkin_patient`
- `can_collect_billing`

Login records permissions in an HttpOnly compatibility cookie, but role layouts fetch `/auth/me` on every server render and permission-specific pages fetch `/rbac/me/permissions`. Role and permission revocations therefore affect the shell immediately; backend permission checks remain the security boundary.

### 5.5 Frontend route protection

Every role layout validates the live backend role before rendering and redirects mismatches to the authenticated role home. Middleware handles session presence and public-route UX, blocks all cross-role portal access, and applies explicit route whitelists to the cleaned Receptionist, Doctor, Manager, Nurse, Pharmacist, and Lab Technician portals. Legacy `/pharmacy/*` browser routes redirect to `/pharmacist/home`; live layout checks and FastAPI dependencies remain the authorization boundary.

The frontend stores the backend-calculated effective permission list in an HttpOnly session cookie and uses centralized typed helpers for page redirects and menu visibility. This remains a presentation layer; FastAPI permission dependencies are authoritative.

## 6. Roles and current capabilities

| Capability | Patient | Doctor | Receptionist | Admin |
|---|---:|---:|---:|---:|
| Self-register account | Yes | No | No | No |
| View/update own profile | Yes | Yes | No | No dedicated profile screen |
| List active doctors | Yes | Yes | Yes | Yes |
| Book appointment | Own patient profile | No | With schedule permission | Yes |
| View own appointments | Yes | Assigned doctor only | All via staff endpoint | All |
| Register walk-in patient | No | No | With register permission | Yes |
| Check in patient | No | No | With check-in permission | Yes |
| View patient directory | No | Assigned patients only | Yes | Yes |
| View patient history | No | Assigned patients only | No | Yes |
| Create prescription/complete consultation | No | Assigned doctor only | No | No |
| View own prescriptions | Yes | No dedicated list | No | No dedicated list |
| Collect payment | No | No | With billing permission | Yes |
| Manage doctors/employees | No | No | No | Yes |
| View financial report | No | No | No current UI/API despite permission field | Yes |

Enterprise roles have dedicated route groups and backend APIs. Operational roles receive only their explicit permission sets and do not inherit administrative access. `/portal` remains only as a compatibility redirect for old bookmarks.

## 7. Core business workflows

### 7.1 Self-service patient onboarding

1. Patient submits `/register`.
2. Backend creates an unverified `User` and linked `Patient`.
3. SMTP service sends a verification link.
4. `/verify-email` posts the token to the backend.
5. Patient logs in and is redirected to `/patient/home`.

If SMTP credentials are absent, the email service logs a warning and returns false, but registration still succeeds. There is no background queue or retry mechanism.

### 7.2 Walk-in patient onboarding

1. Receptionist/admin calls `POST /patients/`.
2. A standalone `patients` row is created with no linked `users` row.
3. The patient can be selected when scheduling an appointment.

Walk-in patients cannot log in unless a separate linking/account-creation feature is added.

### 7.3 Appointment lifecycle

Defined statuses are:

```text
requested → confirmed → checked_in → in_progress → completed
      └────────────────────────────────────────────→ cancelled
```

New bookings are always stored as `requested`, regardless of an input status. Confirm, check-in, consultation start, completion, and cancellation enforce their allowed predecessor states. Booking rejects missing/inactive doctors, past dates/times, times outside doctor working hours, doctor slot collisions, and a patient being double-booked in the same slot.

Patients can only book for their own linked patient ID. Receptionist booking and confirmation require `can_schedule_appointment`; check-in requires `can_checkin_patient`.

### 7.4 Consultation and prescription

1. Doctor sees only assigned appointments using `/appointments/?doctor_id=me`; omitting the filter is still forced to the logged-in doctor.
2. Doctor starts an assigned `checked_in` appointment with `PATCH /appointments/{id}/start`, which changes it to `in_progress`.
3. Doctor reviews the patient/history and submits diagnosis, medicines, dosage, instructions, and clinical notes.
4. Backend verifies the exact Doctor role, doctor profile, appointment ownership, and `in_progress` state.
5. In one transaction, the backend creates one prescription, marks the appointment `completed`, and creates one pending bill.

Repeated completion safely returns the existing prescription and unique appointment constraints prevent duplicate prescriptions or bills. The bill amount comes from the assigned doctor's configured `consultation_fee`; it is never accepted from the frontend.

### 7.5 Billing and receipts

- Completing a consultation creates a pending invoice.
- Receptionist/admin collects it with `cash`, `card`, or `upi` supplied as a query parameter.
- Collection sets status to `paid`, records time and collector where applicable, and creates a receipt number such as `REC-1A2B3C4D`.
- The patient billing page calculates total pending dues.
- Paid patient bills can be displayed in a receipt modal.
- Receipt UI treats `50` as a registration charge and the balance as consultation fee; that split is presentation logic and is not persisted in the database.
- Hospital receipt identity comes from the first `hospital_settings` row. A default demo row is created on first authenticated read if none exists.

## 8. Backend API reference

All endpoints are under the FastAPI service at port `8000`. Except where marked public, authenticated calls use a bearer token.

### Authentication (`/auth`)

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Create an unverified patient account/profile and send verification email |
| POST | `/auth/login` | Public | Authenticate and return JWT, role, and receptionist permissions |
| POST | `/auth/verify-email` | Public | Verify a single-use email token |
| POST | `/auth/resend-verification` | Public | Rotate and resend verification token |
| POST | `/auth/forgot-password` | Public | Send password reset link without account enumeration |
| POST | `/auth/reset-password` | Public | Consume reset token and set new password |

### Patients (`/patients`)

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/patients/me` | Patient | Get own patient profile |
| PUT | `/patients/me` | Patient | Replace editable own-profile fields |
| GET | `/patients/{id}/history` | Doctor, admin | Return the patient plus appointment/prescription history; Doctor access requires an assignment |
| GET | `/patients/` | Receptionist, doctor, admin | List patient profiles; Doctor results are restricted to patients with assigned appointments |
| POST | `/patients/` | Admin or receptionist with register permission | Create a walk-in patient profile |

### Doctors (`/doctors`)

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/doctors/me` | Doctor | Get own doctor profile |
| PUT | `/doctors/me` | Doctor | Update own profile fields |
| GET | `/doctors/` | Any authenticated user | List active doctors |

### Appointments (`/appointments`)

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/appointments/` | Patient, receptionist, admin | Create requested appointment; patient ownership and receptionist permission are checked |
| GET | `/appointments/me` | Patient | List own appointments, newest first |
| GET | `/appointments/` | Receptionist, doctor, admin | List/filter appointments by `date` and `doctor_id`; Doctor requests are always scoped to their own profile |
| PATCH | `/appointments/{id}/confirm` | Admin or receptionist with schedule permission | Set status to confirmed |
| PATCH | `/appointments/{id}/checkin` | Admin or receptionist with check-in permission | Set status to checked in |
| PATCH | `/appointments/{id}/start` | Doctor | Start an assigned checked-in consultation; repeat start is idempotent |

### Prescriptions (`/prescriptions`)

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/prescriptions/me` | Patient | List prescriptions across own appointments |
| POST | `/prescriptions/` | Doctor | Complete an owned in-progress consultation and atomically create one prescription and pending bill |

### Billing (`/billing`)

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/billing/me` | Patient | List own bills |
| GET | `/billing/` | Receptionist, admin | List all bills |
| POST | `/billing/{id}/collect?payment_method=...` | Admin or receptionist with billing permission | Mark bill paid and issue receipt number |

### Administration (`/admin`)

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/admin/overview` | Admin | Counts for patients, doctors, today's appointments, pending bills |
| GET | `/admin/doctors` | Admin | List all doctors, including inactive/on-leave |
| POST | `/admin/doctors` | Admin | Create doctor user and profile |
| PUT | `/admin/doctors/{id}` | Admin | Update doctor profile and email |
| DELETE | `/admin/doctors/{id}` | Admin | Hard-delete doctor profile only |
| PATCH | `/admin/doctors/{id}/reset-password` | Admin | Replace doctor's password |
| GET | `/admin/patients` | Admin | List all patients |
| GET | `/admin/appointments` | Admin | List all appointments |
| GET | `/admin/billing/report` | Admin | Totals plus 50 most recent bills |
| GET | `/admin/settings` | Any authenticated user | Read/create hospital receipt settings |

### Employees (`/admin/employees`)

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/admin/employees/` | Admin | List receptionist employees and permissions |
| POST | `/admin/employees/` | Admin | Create receptionist user/profile with default permissions |
| PATCH | `/admin/employees/{id}` | Admin | Update designation, shift, or status |
| DELETE | `/admin/employees/{id}` | Admin | Soft-deactivate employee record |
| PATCH | `/admin/employees/{id}/permissions` | Admin | Replace permission flags |

The unused `/receptionists/` placeholder router has been removed.

### Nursing (`/nurse`)

Every endpoint in this router requires the exact `nurse` role. Patient, appointment, vital, note, and task reads are limited to patients with an active task assigned to the current Nurse.

| Method | Path | Purpose |
|---|---|---|
| GET | `/nurse/dashboard` | Assignment-scoped daily metrics, upcoming appointments, and urgent task alerts |
| GET | `/nurse/patients` | List patients with an active task assigned to the current Nurse |
| GET | `/nurse/patients/{patient_id}` | Return nursing-relevant patient basics, appointments, read-only prescriptions, vitals, observations, and tasks |
| GET | `/nurse/appointments` | List appointments for actively assigned patients |
| GET/POST | `/nurse/vitals` | List assigned-patient observations or append a timestamped vital record |
| GET | `/nurse/vitals/patient/{patient_id}` | Read the vital history of an assigned patient |
| POST | `/nurse/notes` | Append a nursing observation for an assigned patient |
| GET | `/nurse/tasks` | List only the current Nurse's tasks |
| PUT | `/nurse/tasks/{task_id}` | Start or complete an assigned task using guarded transitions |
| POST | `/doctors/nursing-tasks` | Allow a Doctor to assign a task for one of the Doctor's own patients to an active Nurse |

There are no Nurse vital update/delete endpoints. Historical vitals are append-only and every create/status mutation writes an audit event.

### Pharmacy (`/pharmacy` API)

Every endpoint requires the exact `pharmacist` role and a focused pharmacy permission. Pharmacy reads join prescriptions to the patient, appointment, and prescribing doctor without allowing mutation of the doctor's prescription row.

| Method | Path | Purpose |
|---|---|---|
| GET | `/pharmacy/dashboard` | Pending/ready prescription counts, stock alerts, today's dispensing, and recent prescriptions |
| GET | `/pharmacy/prescriptions` | Search/filter read-only doctor prescriptions with pharmacy workflow status |
| GET | `/pharmacy/prescriptions/{id}` | Read prescription, patient, doctor, dosage, instructions, and pharmacy status |
| POST | `/pharmacy/prescriptions/{id}/action` | Guarded `pending → verified → ready_for_dispensing` flow or rejection with a required reason |
| GET/POST | `/pharmacy/inventory` | List computed stock states or add a non-expired medicine batch |
| POST | `/pharmacy/inventory/{batch_id}/adjust` | Audited add/count/expired/damaged stock adjustment |
| GET | `/pharmacy/alerts` | Low-stock, expiring, and expired batch alerts |
| GET | `/pharmacy/dispensings` | Recent pharmacy dispensing records |
| POST | `/pharmacy/dispense` | Atomically lock stock, validate readiness/medicine/expiry/availability, reduce inventory, and finalize once |

`pharmacy_prescription_reviews` stores pharmacy metadata separately from `prescriptions`. A unique dispensing constraint and guarded API return `409` for duplicate attempts. Each dispensing audit includes pharmacist, prescription, medicine, batch, quantity, and time. Pharmacist has only `pharmacy.view`, `pharmacy.inventory`, and `pharmacy.dispense`; generic patient, prescription-writing, billing, insurance, laboratory, radiology, and administrative permissions are absent.

### Laboratory (`/lab` API)

Doctors retain only the ability to list active tests and create an order for their own patient/appointment. Laboratory processing endpoints require the exact `lab_technician` role. An unassigned order is visible to technicians until one accepts it; after acceptance, only the assigned technician can view or mutate it.

| Method | Path | Purpose |
|---|---|---|
| GET | `/lab/dashboard` | Pending orders, collected samples, in-progress/completed/urgent tests, and today's workload |
| GET | `/lab/orders` | List unassigned orders plus orders assigned to the current technician |
| GET | `/lab/orders/{id}` | Patient, doctor, instructions, priority, tests, samples, and results for an authorized order |
| POST | `/lab/orders/{id}/accept` | Atomically assign an open order to the current technician |
| POST | `/lab/order-items/{id}/sample` | Guarded `ordered → sample_collected` transition with barcode/sample audit |
| POST | `/lab/order-items/{id}/start` | Guarded `sample_collected → processing` transition |
| GET/POST | `/lab/results` | List assigned-order results or enter a timestamped draft result for a processing test |
| PUT | `/lab/results/{id}` | Edit only the entering technician's draft, with old/new audit values |
| POST | `/lab/results/{id}/finalize` | Validate and lock the result, then complete its test/order as applicable |

The allowed test states are `ordered`, `sample_collected`, `processing`, `completed`, and `cancelled`; clients cannot submit arbitrary status values. Finalized results record patient, order, test, technician, entry/finalization timestamps, and result content. No finalized-result update or delete endpoint exists. Lab Technician has only `laboratory.view`, `laboratory.sample`, and `laboratory.result` and has no generic patient, clinical mutation, payment, pharmacy, radiology, insurance, or administrative access.

### Radiology (`/radiology` API)

Doctors can list active modalities and create imaging orders only for their own patient/appointment. All processing endpoints require the exact `radiologist` role. Unassigned orders are visible until review starts; an assigned order and every related study/report are private to that Radiologist.

| Method | Path | Purpose |
|---|---|---|
| GET | `/radiology/dashboard` | Pending, scheduled, awaiting-interpretation, report, completed, and urgent metrics |
| GET | `/radiology/orders` | Search/filter unassigned orders plus those assigned to the current Radiologist |
| GET | `/radiology/orders/{id}` | Authorized patient, ordering Doctor, request, modality, study, and versioned reports |
| POST | `/radiology/orders/{id}/study` | Record the single imaging study and move the order to `performed` |
| POST | `/radiology/orders/{id}/start-review` | Atomically assign the order and begin interpretation |
| GET/POST | `/radiology/reports` | List authorized reports or create a draft for a reviewing study |
| PUT | `/radiology/reports/{id}` | Edit only the author's draft report |
| POST | `/radiology/reports/{id}/finalize` | Require findings and impression, finalize the version, and complete the order |
| POST | `/radiology/reports/{id}/amend` | Create an audited correction draft with a required reason; the finalized parent remains unchanged |

The guarded order states are `ordered`, `scheduled`, `performed`, `reviewing`, `reporting`, `completed`, and `cancelled`. There is no finalized-report update/delete endpoint. Radiologist has only `radiology.view` and `radiology.report`, with no generic patient, diagnosis, prescription, lab, pharmacy, billing, accounting, insurance, ambulance, reception, or administrative permission.

### Accounting (`/accountant` API)

Every endpoint requires the exact `accountant` role. Invoices reuse the appointment-backed `billing` record created by the consultation workflow; the Accountant cannot create arbitrary invoices or access clinical fields.

| Method | Path | Purpose |
|---|---|---|
| GET | `/accountant/dashboard` | Today's revenue/payments/expenses, invoice counts, outstanding amount, and financial summary |
| GET | `/accountant/invoices` | Search/filter invoice, patient name, appointment, amount, status, date, and receipt data |
| POST | `/accountant/invoices/{id}/pay` | Lock a pending invoice, record one payment transaction, generate a receipt, and audit the mutation |
| GET | `/accountant/payments` | Search/filter the immutable invoice-backed payment ledger with collector and receipt |
| GET/POST | `/accountant/expense-categories` | List categories or create an audited category without default/demo rows |
| GET/POST | `/accountant/expenses` | List enriched expenses or append an idempotent audited expense plus matching ledger transaction |
| GET | `/accountant/reports` | Date-filtered revenue, payment, outstanding-invoice, expense, and daily/monthly summaries |

The unique financial-transaction reference prevents duplicate invoice payments, while expense idempotency keys prevent retry duplication. There are no Accountant invoice amount/status edit, expense edit/delete, clinical, pharmacy, laboratory, radiology, insurance-claim, ambulance, employee-permission, or administrative-security endpoints.

### Insurance (`/insurance` API)

Every endpoint requires the exact `insurance_officer` role. Patient responses contain only patient identity and policy/provider/coverage fields. Claim invoice data is financial only; diagnosis, prescription, consultation, nursing, lab, and radiology content is never joined or returned.

| Method | Path | Purpose |
|---|---|---|
| GET | `/insurance/dashboard` | Pending, review, approval, rejection, document, claimed, and approved metrics |
| GET | `/insurance/patients` | Insurance-relevant patient, provider, policy number/status, and coverage data |
| GET/POST | `/insurance/providers` | List insurers or create an audited provider used by policy verification |
| POST | `/insurance/policies` | Record an audited verified policy for a patient |
| GET | `/insurance/claim-options` | Active policies and same-patient unclaimed invoices without clinical content |
| GET/POST | `/insurance/claims` | Search claims or create one guarded draft per invoice |
| GET | `/insurance/claims/{id}` | Policy/invoice summary, required documents, settlement entries, and immutable action history |
| POST | `/insurance/claims/{id}/submit` | Guarded `draft -> submitted` transition |
| POST | `/insurance/claims/{id}/start-review` | Guarded `submitted -> under_review` transition after document requirements are cleared |
| POST | `/insurance/claims/{id}/request-documents` | Record a reason-required document request without bypassing claim state |
| POST | `/insurance/claims/{id}/documents` | Link a unique document reference and attribute it to the Officer |
| POST | `/insurance/claims/{id}/decision` | Approve/reject only an under-review claim, with mandatory reason and timestamp |
| POST | `/insurance/claims/{id}/settle` | Record an insurance-only remittance; settle only when the approved amount is fully paid |
| GET | `/insurance/approvals` | Submitted and under-review claims requiring Officer action |

The final states are `draft`, `submitted`, `under_review`, `approved`, `rejected`, and `settled`. A unique claim billing reference prevents duplicate submissions, and unique settlement references prevent duplicate insurance remittances. Every claim mutation creates both claim history and an audit event.

### Ambulance operations (`/ambulance` API)

Every endpoint requires the exact `ambulance_staff` role. Staff can see the shared unassigned request queue, but once a request is accepted only its responsible staff member can list, open, or mutate the request/trip. Patient responses contain only transport-required identity and contact data.

| Method | Path | Purpose |
|---|---|---|
| GET | `/ambulance/dashboard` | Assigned available vehicles, own active/assigned/completed trips, pending requests, and critical alerts |
| GET/POST | `/ambulance/vehicles` | List assigned vehicles or register and self-assign an operational ambulance |
| PATCH | `/ambulance/vehicles/{id}/availability` | Change only an assigned idle vehicle between available, maintenance, and unavailable |
| GET/POST | `/ambulance/requests` | List pending plus own requests or record a transport request with pickup and destination |
| GET | `/ambulance/requests/{id}` | Authorized transport details, responsible staff/vehicle, timestamps, and status history |
| POST | `/ambulance/requests/{id}/accept` | Atomically accept an unassigned request with an available assigned ambulance |
| POST | `/ambulance/requests/{id}/start-trip` | Guarded `assigned -> en_route` transition |
| POST | `/ambulance/requests/{id}/arrive` | Guarded `en_route -> arrived` transition |
| POST | `/ambulance/requests/{id}/start-transport` | Guarded `arrived -> transporting` transition |
| POST | `/ambulance/requests/{id}/complete` | Guarded `transporting -> completed` transition and release the vehicle |
| GET | `/ambulance/trips` | List only trips owned by the current staff member |

There is no generic status mutation or vehicle deletion endpoint. Every accepted assignment and trip transition records staff, ambulance, request, old/new status, timestamp, and an audit event. Ambulance Staff has no clinical, pharmacy, laboratory, radiology, accounting, insurance, employee, or administrative permission.

FastAPI also exposes its normal interactive documentation at `/docs` and OpenAPI schema at `/openapi.json` unless configuration changes.

### RBAC and audit (`/rbac`)

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/rbac/me/permissions` | Any active authenticated user | Return current role and effective permissions |
| PATCH | `/rbac/users/{user_id}/role` | Super admin | Change another user's role and write an audit event |
| GET | `/rbac/audit-logs` | `audit.view` permission | Return paginated immutable audit records |

### Super Admin (`/super-admin`)

Every endpoint in this router requires the `super_admin` role. Mutations additionally declare their relevant permission dependency and write audit events where applicable.

| Method | Path | Purpose |
|---|---|---|
| GET | `/super-admin/overview` | Return platform counts, recent audit activity, and service health |
| GET/POST | `/super-admin/settings` | List or create platform-wide key/value settings |
| PUT | `/super-admin/settings/{setting_id}` | Update a system setting |
| GET/POST | `/super-admin/hospitals` | List or create hospital organizations |
| PUT | `/super-admin/hospitals/{org_id}` | Update organization details or active state |
| GET/POST | `/super-admin/roles-permissions` | List or create dynamic role-permission grants |
| DELETE | `/super-admin/roles-permissions/{grant_id}` | Revoke a dynamic role-permission grant |
| GET/POST | `/super-admin/features` | List or create feature flags |
| PUT | `/super-admin/features/{flag_id}` | Update a feature flag, including enabled state |
| GET | `/super-admin/audit-logs` | List audit records with `limit`/`skip` pagination |
| GET/POST | `/super-admin/admins` | List or create Admin accounts |
| GET | `/super-admin/admins/{admin_id}` | View one Admin account |
| PATCH | `/super-admin/admins/{admin_id}/reset-password` | Replace an Admin password, clear reset tokens, and write an audit event |
| PUT | `/super-admin/admins/{admin_id}/activate` | Reactivate an Admin account |
| PUT | `/super-admin/admins/{admin_id}/deactivate` | Deactivate an Admin account |
| GET | `/super-admin/system-health` | Check database and Redis availability |

Dynamic grants cannot assign administrative-only permissions to operational roles. Duplicate grants, setting keys, feature names, and administrator emails are rejected.

## 9. Frontend routes

### Public routes

- `/`: marketing/entry page with login and registration links
- `/login`: role-aware login redirect
- `/register`: patient self-registration
- `/verify-email`: consumes the verification token from the URL
- `/forgot-password`: requests a reset email
- `/reset-password`: consumes a reset token and sets a new password
- `/portal`: compatibility redirect for bookmarks created by the abandoned generic portal

### Patient portal

- `/patient/home`: greeting, next appointment, and quick stats
- `/patient/appointments`: create and review appointments
- `/patient/prescriptions`: prescription history
- `/patient/billing`: dues, bill history, and paid receipt viewer
- `/patient/profile`: edit demographic/contact information

### Doctor portal

- `/doctor/home`: clinical-only dashboard with today's totals, waiting/check-in/in-progress/completed counts, upcoming appointment, queue, and status-aware actions
- `/doctor/appointments`: named assigned appointments, reasons, check-in state, and status-aware view/start/continue actions
- `/doctor/patients`: searchable directory restricted to patients associated with the Doctor's appointments
- `/doctor/patients/[id]`: read-only patient basics, appointment history, and prescription history with assignment enforcement
- `/doctor/consultation`: select a ready appointment, review patient/history, start consultation, and submit diagnosis/medicines/dosage/instructions/notes
- `/doctor/profile`: edit only the Doctor's own professional/contact/schedule fields; role, account status, fees, and administrative settings are not editable

### Receptionist portal

- `/receptionist/home`: front-desk overview, pending-work counts, and permission-aware quick actions
- `/receptionist/patients`: searchable basic patient directory with appointment context
- `/receptionist/register-patient`: create a walk-in patient and continue to scheduling
- `/receptionist/schedule`: select a patient, active doctor, date, and unoccupied time slot
- `/receptionist/queue`: view today's named queue, confirm appointments, and check patients in
- `/receptionist/billing`: inspect invoices, collect cash/card/UPI payment, and show receipt data

Permission-specific receptionist links use live effective permissions. Register, Schedule, and Billing pages also call `requirePermission`; Queue remains visible while its confirm/check-in actions are independently permission-gated.

### Admin portal

- `/admin/home`: hospital overview cards
- `/admin/doctors`: list and add doctors
- `/admin/doctors/[id]`: doctor details
- `/admin/doctors/[id]/edit`: edit doctor and reset login password
- `/admin/employees`: list and add receptionist employees
- `/admin/employees/[id]/permissions`: edit permissions
- `/admin/staff`: create clinical and operational staff login accounts, including Hospital Managers; activate/deactivate Manager accounts
- `/admin/patients`: all patients
- `/admin/appointments`: all appointments
- `/admin/billing`: collected revenue, pending dues, recent transactions

### Super Admin portal

- `/super-admin/home`: live resource counts and database/Redis status
- `/super-admin/admins`: create, list, activate, and deactivate Admin accounts; detail pages can reset an Admin password
- `/super-admin/hospitals`: create organizations and toggle active state
- `/super-admin/roles`: read-only role hierarchy and responsibility reference
- `/super-admin/permissions`: create and revoke dynamic role grants
- `/super-admin/settings`: create and update platform-wide system settings
- `/super-admin/features`: create and toggle feature flags
- `/super-admin/audit-logs`: read audit history
- `/super-admin/system-health`: inspect database and Redis availability

The organization, settings, permissions, feature-flag, and administrator screens use Server Actions in `frontend/app/actions/superAdmin.ts` (with administrator creation shared from `staff.ts`), show inline success/error feedback, and revalidate affected pages after successful mutations. `/super-admin/admins/[id]` shows account details and a confirmed password-reset form; organization records and feature descriptions are editable.

### Hospital Manager portal

- `/manager/home`: read-only operational dashboard for daily appointments, patients, active doctors/staff, consultations, patient flow, alerts, and department summaries
- `/manager/appointments`: hospital-wide read-only appointment monitor with client-side date, doctor, department, and status filters
- `/manager/patients`: searchable operational patient directory; excludes clinical history, address, and blood group
- `/manager/doctors`: doctor status, availability, department, schedule, and workload monitor
- `/manager/staff`: read-only staff role, shift, status, and availability monitor
- `/manager/reports`: date-scoped appointment/patient/staff/department workload and read-only revenue summaries
- `/manager/departments`: optional supported department monitor; no Manager mutation actions

Manager APIs require the exact `hospital_manager` role plus a relevant read-only permission. The role has no clinical, prescription, payment collection, staff-account, permission/security, department-mutation, pharmacy, laboratory, radiology, accounting, insurance, or ambulance permissions. Admin provisions and activates/deactivates Hospital Manager identities through `/admin/staff`; Super Admin continues to manage Admin identities only. Provisioning never grants the Manager administrative access.

### Nurse portal

- `/nurse/home`: assignment-scoped dashboard with today's patients, waiting patients, vital/task needs, upcoming appointments, and urgent alerts
- `/nurse/patients`: searchable directory limited to patients with an active task assigned to the Nurse
- `/nurse/patient/[id]`: nursing-relevant patient detail with read-only appointments, diagnosis/prescriptions, vital history, observations, and tasks
- `/nurse/appointments`: read-only appointments and task context for actively assigned patients
- `/nurse/vitals`: append a timestamped vital/observation record and review immutable history
- `/nurse/tasks`: view assigned tasks and perform only `pending → in_progress → completed` transitions

The Nurse role has only focused nursing permissions (`nursing.view`, `nursing.record_vitals`, `nursing.record_notes`, and `nursing.manage_tasks`). It has no generic patient-history/update, appointment mutation, consultation mutation, prescription, billing, pharmacy, laboratory, radiology, insurance, ambulance, staff, settings, or administrative permissions. Exact API role checks and the frontend route whitelist block cross-role and removed Nurse URLs.

### Pharmacist portal

- `/pharmacist/home`: pending/ready prescriptions, low/out-of-stock medicine, today's dispensing, and pharmacy alerts
- `/pharmacist/prescriptions`: searchable, filterable prescription review queue
- `/pharmacist/prescriptions/[id]`: read-only patient/doctor/prescription detail with verify, reject-with-reason, and mark-for-dispensing actions
- `/pharmacist/inventory`: medicine SKU/category/supplier setup, batch creation, computed stock status, and audited stock adjustments
- `/pharmacist/dispensing`: ready-prescription stock selection and recent dispensing audit

The sidebar contains only Dashboard, Prescriptions, Dispensing, and Inventory. No diagnosis, prescription creation, consultation, patient registration, scheduling, hospital payment, accounting, insurance, lab, radiology, ambulance, or Admin pages are present. Exact live-role layout validation, middleware whitelisting, and exact-role API dependencies protect direct URLs.

### Lab Technician portal

- `/lab/home`: pending, collected, processing, completed, urgent, and daily workload metrics
- `/lab/orders`: searchable authorized order queue with patient, doctor, tests, priority, state, and order time
- `/lab/orders/[id]`: accept, collect sample, start processing, enter a draft result, and complete/finalize through guarded actions
- `/lab/results`: edit own draft results and review immutable finalized records

The sidebar contains only Dashboard, Lab Orders, and Results. Former `/lab/samples` and `/lab/reports` pages are removed and middleware whitelisting blocks them plus every non-laboratory workflow.

### Radiologist portal

- `/radiologist/home`: pending, scheduled, awaiting-interpretation, report, completed, and urgent workload metrics
- `/radiologist/orders`: searchable authorized imaging queue with patient, ordering Doctor, modality, priority, status, and date
- `/radiologist/orders/[id]`: patient/request/study detail with guarded study recording, review start, interpretation draft, and finalization
- `/radiologist/reports`: edit own drafts, review locked finalized versions, and create reason-required amendment versions

The sidebar contains only Dashboard, Imaging Orders, and Reports. Former `/radiology/*` pages are removed; exact live-role layout validation and middleware whitelisting block direct access to removed and cross-department workflows.

### Accountant portal

- `/accountant/home`: today's revenue/payments/expenses, invoice counts, outstanding balance, and all-time summary
- `/accountant/invoices`: searchable invoice ledger and duplicate-safe payment collection for pending invoices
- `/accountant/payments`: immutable payment, method, date, collector, and receipt ledger
- `/accountant/expenses`: audited category creation and append-only expenses with optional supporting references
- `/accountant/reports`: revenue, payments, outstanding invoices, expenses, and daily/monthly summaries

The sidebar contains only Dashboard, Invoices, Payments, Expenses, and Reports. Former `/accountant/billing`, `/accountant/transactions`, `/accountant/refunds`, and `/accountant/daily-closing` pages are removed and rejected by the frontend route whitelist.

### Insurance Officer portal

- `/insurance/home`: pending/review/approved/rejected/document metrics plus claimed and approved totals
- `/insurance/patients`: non-clinical patient/policy directory with provider and verified-policy setup
- `/insurance/claims`: searchable claim queue and one-invoice/one-claim draft creation
- `/insurance/claims/[id]`: guarded submission, document, review, decision, settlement, and full action-history workflow
- `/insurance/approvals`: review queue with reason-required approval/rejection actions

The sidebar contains only Dashboard, Patients, Claims, and Approvals. Former `/insurance/providers`, `/insurance/policies`, `/insurance/documents`, and `/insurance/payments` pages are removed and rejected by the frontend route whitelist; their required setup/actions are scoped into Patients or Claim Detail.

### Ambulance Staff portal

- `/ambulance/home`: assigned vehicle availability, active/assigned/completed counts, pending requests, and critical alerts
- `/ambulance/requests`: searchable pending/owned request queue, transport request recording, and assignment acceptance
- `/ambulance/requests/[id]`: transport-only patient/contact/route data plus guarded trip actions and audited history
- `/ambulance/trips`: responsible-staff-only trip, ambulance, route, timing, and status ledger
- `/ambulance/vehicles`: assigned fleet registration and idle availability/maintenance state without deletion

The sidebar contains only Dashboard, Requests, Trips, and Ambulances. Former `/ambulance/vehicle` and generic dispatch/status URLs are rejected by the route whitelist and backend; exact live-role layout validation protects all direct URLs.

## 10. Data model

The ORM models in `backend/app/models/all_models.py` are the current model source of truth.

### `users`

Central identity record.

- Unique email and bcrypt password hash
- Role enum: patient, doctor, receptionist, admin, super admin, hospital manager, nurse, pharmacist, lab technician, radiologist, accountant, insurance officer, ambulance staff
- Active and email-verification state
- Hashed verification/reset tokens with expiration timestamps
- Last login and creation timestamps

### `patients`

- Optional unique link to `users`; null for walk-ins
- Name, age, gender, contact, address, blood group

### `doctors`

- Optional unique link to `users`
- Name, specialization, working-time range, contact
- Status: active or on leave

### `employees`

- Required unique link to a receptionist `users` row
- Designation, joining date, working shift
- Status: active or inactive
- `added_by` references the admin user that created the employee

### `employee_permissions`

- References an employee
- Stores four focused permission flags as integer columns used as booleans: registration, scheduling, check-in, and payment collection
- `employee_id` is unique, so each receptionist employee has at most one permission row

### `appointments`

- Required patient and doctor foreign keys
- Appointment date, time, reason, status
- Check-in and creation timestamps

### `prescriptions`

- Required appointment foreign key
- Diagnosis, one medicine string, dosage, notes, creation timestamp
- The current structure supports one medicine/dosage pair per prescription row

### `billing`

- Required patient and appointment foreign keys
- Decimal amount, pending/paid status, payment method
- Optional collector employee, receipt number, paid timestamp

### `hospital_settings`

- Hospital name, address, phone, and GSTIN used by receipt UI
- Application code reads only the first row

### `audit_logs`

- Immutable actor, action, resource, before/after values, request metadata, and creation time
- Indexed by actor/time, action/time, and resource identity
- Sensitive key names such as passwords, secrets, hashes, tokens, cookies, and authorization values are removed before persistence

### Super Admin platform tables

- `system_settings`: unique setting key, nullable value/description, update timestamp, and updating user
- `role_permissions`: unique role/permission pair, description, creator, and creation timestamp; these grants augment the static role permission map
- `feature_flags`: unique feature name, integer-backed enabled flag, description, updater, and update timestamp
- `organizations`: hospital name and contact details with integer-backed active state and timestamps

SQLAlchemy relationships and explicit cascade rules are not defined; joins are performed manually using foreign-key IDs.

## 11. Configuration

### Backend environment variables

Create `backend/.env` from `backend/.env.example`:

```env
DATABASE_URL=mysql+pymysql://root:root@localhost/hospital_management
SECRET_KEY=replace-with-a-long-random-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
FRONTEND_URL=http://localhost:3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
SMTP_FROM_EMAIL=your_email@gmail.com
SMTP_FROM_NAME=Hospital Management System
CORS_ORIGINS=http://localhost:3000
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1
```

Important details:

- `DATABASE_URL` and `SECRET_KEY` are required; the backend no longer falls back to hard-coded credentials or an insecure JWT secret.
- Docker Compose uses the same `SECRET_KEY` and `ALGORITHM` names as runtime settings.
- Use a Gmail App Password rather than a normal Gmail password when Gmail SMTP is selected.
- Secrets and local environment files are ignored by Git; `.env.example` is intentionally tracked.

For the root Docker Compose `.env`, database credentials are accompanied by these optional published-port settings:

```env
FRONTEND_PORT=3000
BACKEND_PORT=8000
```

### Frontend environment variable

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Client-side auth uses `NEXT_PUBLIC_API_URL`. Server Components and Server Actions prefer `API_INTERNAL_URL`, allowing Docker to use `http://backend:8000` internally while the browser uses a public API URL.

## 12. Local development

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm
- MySQL, normally on port 3306

### Backend

From `Hospital-Management-System/backend`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python init_db.py
uvicorn app.main:app --reload --port 8000
```

Review `backend/.env` before initializing. `init_db.py` derives all connection details from `DATABASE_URL` and always applies the Alembic chain; it creates no users or demo data.

To bootstrap an administrator explicitly, set `ADMIN_NAME`, `ADMIN_ROLE` (`admin` or `super_admin`), `ADMIN_EMAIL`, and a strong `ADMIN_PASSWORD`, then run `python create_admin.py`. The script has no default credentials. It validates the email address, normalizes it to lowercase, and rejects duplicate users.

### Frontend

From `Hospital-Management-System/frontend`:

```powershell
npm install
Set-Content .env.local 'NEXT_PUBLIC_API_URL=http://localhost:8000'
npm run dev
```

Open `http://localhost:3000`; FastAPI runs at `http://localhost:8000`.

### Database initialization choices

- `python backend/init_db.py`: creates or upgrades the schema through Alembic without seed data.
- `python import_schema.py`: compatibility command that delegates to `init_db.py`; direct legacy SQL import is disabled.
- `python backend/migrate_auth.py`: compatibility alias for `alembic upgrade head`.
- `python backend/setup_docker_db.py`: compatibility alias for `init_db.py`; it does not seed an admin.
- `python backend/reset_db.py`: **destructive**; drops and recreates all ORM tables.

Importing or starting FastAPI does not perform schema DDL. Docker Compose runs a one-shot `migrate` service before the backend and worker.

## 13. Docker behavior

Run from the nested project root:

```powershell
docker compose up --build
```

Current Compose topology:

- frontend: `${FRONTEND_PORT:-3000}` on the host, container port 3000
- backend: `${BACKEND_PORT:-8000}` on the host, container port 8000, with readiness checks
- MySQL 8: internal `db` service with persistent `db_data`
- Redis: Celery broker/result backend
- migrate: one-shot `alembic upgrade head`
- worker: Celery notification worker

Before using Compose, copy `.env.example` to `.env`, provide strong `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`, and `SECRET_KEY` values, and keep `NEXT_PUBLIC_API_URL` browser-reachable.

## 14. Implementation conventions

When extending the project:

- Add SQLAlchemy entities to `backend/app/models/all_models.py` and Pydantic contracts to `backend/app/schemas/all_schemas.py` unless the project is deliberately refactored into per-domain modules.
- Add backend domain routes under `backend/app/routers/` and register new routers in `backend/app/main.py`.
- Apply authorization in the backend even if the frontend hides a page or button.
- Use `RoleChecker` for coarse role access and `PermissionChecker` for receptionist operations.
- Keep patient ownership and doctor-assignment checks close to the data mutation.
- Use `frontend/lib/api.ts` for authenticated Server Component reads.
- Put mutations in the matching file under `frontend/app/actions/`, revalidate all affected pages, and return a useful error shape.
- Keep secrets out of tracked files and document new variables in `.env.example`.
- Create every future production schema change as an Alembic revision.
- Treat `Decimal` money values as money; avoid floating-point calculations in backend financial logic.

## 15. Known gaps, risks, and technical debt

These are current implementation facts, not completed features:

### Security and authorization

- CORS uses the explicit comma-separated `CORS_ORIGINS` setting; production values still need deployment-specific review.
- No rate limiting exists for login, verification resend, or password-reset requests.
- There is no CSRF-specific protection for cookie-backed Next.js Server Actions beyond `SameSite=Lax` behavior and framework defaults.
- Existing JWTs are checked against the current `users.is_active` value on every request; employee deactivation also deactivates the linked user.
- Admin doctor deletion removes the doctor profile but not the linked user and may fail when appointments reference the doctor.

### Data integrity and business rules

- `database/schema.sql` is a legacy reference only and is no longer executed; the three-revision Alembic chain is authoritative.
- Core confirm/check-in/start/complete/cancel transitions are guarded, although a reusable state-machine abstraction is still absent.
- Doctor slot conflicts are rejected for non-cancelled appointments.
- Payment method is validated and repeat collection is idempotent for the original method.
- Prescription, appointment completion, and exactly one bill are committed atomically with uniqueness/idempotency protection.
- Consultation prices come from each doctor's configured `consultation_fee`; the legacy receipt line-item split remains presentation-only.
- Deleting or changing referenced records lacks an explicit retention/cascade policy.
- Receipt-oriented `hospital_settings` can be read/created but have no update endpoint or Admin settings page. This is separate from the editable Super Admin `system_settings` key/value store.

### Frontend and user experience

- Enterprise dashboard shells validate the live backend role and permission list before rendering. Super Admin, Admin, and Hospital Manager route groups require their exact live roles.
- Several older frontend values still use `any`, weakening the benefit of strict TypeScript.
- Most errors are reduced to generic messages, and some page-level data requests throw without a local error boundary.
- Some older screens still poll every five seconds. Doctor workload pages poll every 30 seconds and pause while the tab is hidden.
- Generated/scaffolding scripts remain mixed with maintained application code.
- Some source text shows mojibake for currency/symbol characters (for example `â‚¹`), indicating encoding cleanup is needed.

### Quality and operations

- Backend tests cover all role authentication, permission isolation, disabled sessions, role audit, migration preservation/refusal, Manager read-only operational scope and exact-role denial, Doctor appointment/patient assignment scope, consultation transitions and billing idempotency, slot conflicts, exact-role/assignment-scoped Nurse and Lab workflows, Pharmacist prescription/stock/dispensing safety, Radiologist order/report assignment and finalization, Accountant financial integrity, Insurance Officer claim integrity, and Ambulance Staff vehicle/request/trip ownership, transition, and audit integrity plus cross-role isolation. Full browser end-to-end coverage is still needed.
- No CI workflow is present.
- Dependencies are mostly unpinned in `requirements.txt`; frontend also uses `lucide-react: latest`.
- Explicit audit history and health/readiness endpoints are implemented. Production monitoring, backup automation, and a real outbound notification adapter remain outstanding.
- Schema DDL is isolated in the Compose migrator/Alembic command; the application service does not call `create_all()`.

## 16. Recommended development priorities

1. Add rate limits and a CSRF-focused review for public authentication and cookie-backed actions.
2. Implement the staged, data-preserving organization isolation design in `docs/organization-scoping-plan.md` before claiming true multi-hospital isolation.
3. Build typed interactive create/update forms for the remaining API-first enterprise portal screens; the core Super Admin management screens now have forms and Server Actions.
4. Add browser end-to-end tests for every role's complete journey.
5. Replace remaining broad `any` usage and Pydantic v1-style `Config` declarations.
6. Configure a real email/SMS/WhatsApp adapter instead of the fail-closed Celery placeholder.
7. Add production monitoring, backup automation, retention policies, and dependency pinning.

## 17. Minimum acceptance journeys for future changes

At minimum, regression testing should cover:

1. Patient registers, receives verification, verifies, logs in, and updates profile.
2. Patient books only for self and can see only own appointments, prescriptions, and bills.
3. Admin creates a doctor who can log in and see only assigned appointments.
4. Admin creates a receptionist, toggles each permission, and backend access changes accordingly.
5. Receptionist creates a walk-in patient, schedules an appointment, confirms/checks in, and cannot bypass revoked permissions.
6. Assigned doctor completes consultation; prescription, completed appointment, and exactly one pending bill are committed atomically.
7. Receptionist collects a pending bill once; patient sees the paid state and correct receipt.
8. Admin dashboards and billing totals match database records.
9. Expired, invalid, and reused verification/reset tokens are rejected.
10. Disabled users and inactive employees cannot continue to use existing or new sessions.
11. Super Admin creates and disables an Admin, resets the Admin password, manages an organization, setting, role grant, and feature flag, and each mutation is reflected in the UI and audit history without persisting password data in audit values.
12. Insurance Officer creates a policy-backed invoice claim once, follows only valid submission/review/decision/settlement transitions, records required documents and decision reasons, and cannot access clinical or other departmental workflows.
13. Ambulance Staff accepts one pending request with an assigned available vehicle, follows only assigned/en-route/arrived/transporting/completed transitions, sees no other staff member's owned trip, and releases the vehicle at completion.

## 18. Current verification status

- The working tree is based on branch `main` at `a76521a`; the authorization-separation changes are not yet committed.
- Backend: 115 tests pass. Coverage includes role login, exact cross-role denial, previous clinical/operational workflows, assignment-private Lab and Radiologist orders, immutable finalized results/reports, Accountant and Insurance integrity, plus Ambulance Staff transport-only patient responses, vehicle ownership/availability, duplicate-safe assignment, staff-private request/trip access, guarded transitions, audit history, and migration preservation.
- Frontend: 13 role-routing authorization tests and strict TypeScript checks pass; the optimized production build succeeds and contains exactly `/ambulance/home`, `/ambulance/requests`, `/ambulance/requests/[id]`, `/ambulance/trips`, and `/ambulance/vehicles` for the Ambulance Staff portal.
- Alembic revision `20260901_0009` adds destination data, responsible trip staff, accepted timestamps, final request/trip/vehicle states, ownership indexes, and status-history references without inserting business records. Fresh and legacy migration tests pass, and the live MySQL database is verified at `20260901_0009 (head)`.
- No default/demo Ambulance Staff, ambulance, request, trip, or patient data is created. Docker Compose backend, worker, frontend, MySQL, and Redis services were rebuilt/started; the backend readiness endpoint returns `200` and unauthenticated `/ambulance/home` access returns `307` to `/login`.
- `npm ci` reports 8 dependency vulnerabilities (7 high, 1 critical), including a warning that pinned Next.js `14.2.5` should be upgraded to a patched release. Dependency upgrades remain a separate compatibility/security task.
