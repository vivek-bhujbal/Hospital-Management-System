# Hospital Management System — Project Context

> Last reconciled with the authorization-separation working tree based on branch `main` at commit `a76521a` on 2026-08-30.
>
> This document describes the application as it currently exists in code. When this file conflicts with the README or older walkthrough notes, treat the implementation files named here as the source of truth.

## 1. Project summary

The Hospital Management System (HMS) is a role-based, full-stack web application for managing patient registration, appointments, consultations, prescriptions, billing, doctors, and receptionist employees.

The application supports thirteen user roles. The original roles remain backward compatible:

- `patient`: self-registers, verifies email, books appointments, and views personal clinical and billing information.
- `doctor`: views assigned appointments and patient history, updates a doctor profile, and completes consultations by issuing prescriptions.
- `receptionist`: registers walk-in patients, schedules and checks in appointments, and collects payments, subject to per-employee permissions.
- `admin`: views hospital-wide metrics and manages doctors, receptionist employees, permissions, patients, appointments, and billing reports.

Enterprise roles are `super_admin`, `hospital_manager`, `nurse`, `pharmacist`, `lab_technician`, `radiologist`, `accountant`, `insurance_officer`, and `ambulance_staff`. Their backend modules cover organizations/settings/audit, departmental reporting, assignment-scoped nursing, pharmacy stock and dispensing, laboratory orders/results, radiology studies/reports, accounting, insurance claims, and ambulance dispatch. The frontend exposes authenticated live-data portals for each role. Super Admin now has interactive management workflows; create/update workflows remain API-first in several other enterprise screens.

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

`get_current_user` decodes the bearer token, reloads the user by ID, and rejects a user deactivated after token issuance.

Two dependency types enforce access:

- `RoleChecker`: allows a fixed list of roles.
- `PermissionChecker`: evaluates the role's static and dynamic grants; for receptionists, it also applies the linked active employee's legacy permission overrides.

The public dependency factories are `require_role(...)`, `require_any_role(...)`, and `require_permission(...)`. Admin retains the legacy Hospital Manager capability baseline, but Super Admin is standalone and has only platform mutation permissions. This prevents Super Admin from entering hospital-operational APIs and prevents Admin from entering platform APIs. Operational roles do not inherit administrative permissions.

Receptionist permissions are:

- `can_register_patient`
- `can_schedule_appointment`
- `can_checkin_patient`
- `can_collect_billing`
- `can_view_reports`

Login records permissions in an HttpOnly compatibility cookie, but role layouts fetch `/auth/me` on every server render. Role and permission revocations therefore affect the shell immediately; backend permission checks remain the security boundary.

### 5.5 Frontend route protection

Every role layout validates the live backend role before rendering and redirects mismatches to the authenticated role home. Middleware handles session presence and public-route UX; it intentionally does not act as the authorization boundary.

The frontend stores the backend-calculated effective permission list in an HttpOnly session cookie and uses centralized typed helpers for page redirects and menu visibility. This remains a presentation layer; FastAPI permission dependencies are authoritative.

## 6. Roles and current capabilities

| Capability | Patient | Doctor | Receptionist | Admin |
|---|---:|---:|---:|---:|
| Self-register account | Yes | No | No | No |
| View/update own profile | Yes | Yes | No | No dedicated profile screen |
| List active doctors | Yes | Yes | Yes | Yes |
| Book appointment | Own patient profile | No | With schedule permission | Yes |
| View own appointments | Yes | Assigned via staff endpoint | All via staff endpoint | All |
| Register walk-in patient | No | No | With register permission | Yes |
| Check in patient | No | No | With check-in permission | Yes |
| View patient directory | No | Yes | Yes | Yes |
| View patient history | No | Yes | No | Yes |
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

This is the conceptual lifecycle, but current endpoints do not strictly enforce it:

- New bookings are always stored as `requested`, regardless of an input status.
- A receptionist/admin can set any existing appointment to `confirmed`.
- A receptionist/admin can set any existing appointment to `checked_in` and record `checked_in_at`.
- There is no endpoint that sets `in_progress` or `cancelled`.
- Creating a prescription sets the appointment directly to `completed`.
- Transition preconditions are not validated, so confirm/check-in can overwrite other statuses.
- There is no prevention of doctor time-slot collisions or duplicate bookings.

Patients can only book for their own linked patient ID. A receptionist's schedule permission is manually checked in the booking route; admins bypass it by role.

### 7.4 Consultation and prescription

1. Doctor sees assigned appointments using `/appointments/?doctor_id=me`.
2. Doctor selects an appointment and submits diagnosis, medicine, dosage, and notes.
3. Backend verifies that the appointment belongs to the logged-in doctor's profile.
4. In one transaction, the backend creates a prescription, marks the appointment `completed`, and creates a pending bill.

The bill amount is currently hard-coded to `500.00`.

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
| GET | `/patients/{id}/history` | Doctor, admin | Return appointments and prescriptions for a patient |
| GET | `/patients/` | Receptionist, doctor, admin | List all patient profiles |
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
| GET | `/appointments/` | Receptionist, doctor, admin | List/filter appointments by `date` and `doctor_id`; doctors may use `doctor_id=me` |
| PATCH | `/appointments/{id}/confirm` | Admin or receptionist with schedule permission | Set status to confirmed |
| PATCH | `/appointments/{id}/checkin` | Admin or receptionist with check-in permission | Set status to checked in |

### Prescriptions (`/prescriptions`)

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/prescriptions/me` | Patient | List prescriptions across own appointments |
| POST | `/prescriptions/` | Doctor | Create prescription for own appointment, complete it, and create a bill |

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

`GET /receptionists/` is an unauthenticated placeholder that only returns a message and is not used by the frontend.

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

- `/doctor/home`: today's assigned queue and completion counts
- `/doctor/appointments`: all assigned appointments
- `/doctor/patients`: patient directory
- `/doctor/patients/[id]`: a patient's appointment and prescription history
- `/doctor/consultation`: select an appointment or complete a selected consultation
- `/doctor/profile`: edit doctor details and schedule

### Receptionist portal

- `/receptionist/home`: appointment/check-in overview
- `/receptionist/register-patient`: create walk-in patient
- `/receptionist/schedule`: select patient/doctor and create appointment
- `/receptionist/queue`: view today's queue and check patients in
- `/receptionist/billing`: list invoices, collect payment, and show receipt data

Permission-specific receptionist links are hidden when the login-cached permission value is explicitly false. The corresponding pages also call `requirePermission`.

### Admin portal

- `/admin/home`: hospital overview cards
- `/admin/doctors`: list and add doctors
- `/admin/doctors/[id]`: doctor details
- `/admin/doctors/[id]/edit`: edit doctor and reset login password
- `/admin/employees`: list and add receptionist employees
- `/admin/employees/[id]/permissions`: edit permissions
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

### Other enterprise portals

- `/manager`: home, staff, departments, doctors, appointments, reports, and analytics
- `/nurse`: home, assigned patients and patient detail, vitals, notes, and tasks
- `/pharmacy`: home, prescriptions, medicines, inventory, alerts, dispensing, purchases, and suppliers
- `/lab`: home, orders, samples, results, and reports
- `/radiology`: home, orders, studies, and reports
- `/accountant`: home, billing, transactions, expenses, refunds, daily closing, and reports
- `/insurance`: home, providers, policies, claims, documents, and payments
- `/ambulance`: home, requests, trips, and vehicle

These layouts validate the live role and effective permission set. Most pages read live API data through the shared enterprise resource renderer; several non-Super-Admin create/update workflows still require direct API use.

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
- Stores five permission flags as integer columns used as booleans
- There is no database uniqueness constraint on `employee_id`, although application code assumes one permission row per employee

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

- `database/schema.sql` is a legacy reference only and is no longer executed; the two-revision Alembic chain is authoritative.
- Core confirm/check-in/start/complete/cancel transitions are guarded, although a reusable state-machine abstraction is still absent.
- Doctor slot conflicts are rejected for non-cancelled appointments.
- Payment method is validated and repeat collection is idempotent for the original method.
- Prescription, appointment completion, and exactly one bill are committed atomically with uniqueness/idempotency protection.
- Consultation prices come from each doctor's configured `consultation_fee`; the legacy receipt line-item split remains presentation-only.
- Deleting or changing referenced records lacks an explicit retention/cascade policy.
- Receipt-oriented `hospital_settings` can be read/created but have no update endpoint or Admin settings page. This is separate from the editable Super Admin `system_settings` key/value store.
- `can_view_reports` exists but has no matching receptionist report route/UI.

### Frontend and user experience

- Enterprise dashboard shells validate the live backend role and permission list before rendering. Super Admin and Admin route groups require their exact live roles.
- Several older frontend values still use `any`, weakening the benefit of strict TypeScript.
- Most errors are reduced to generic messages, and some page-level data requests throw without a local error boundary.
- Polling every five seconds can create unnecessary load as usage grows.
- Some checked-in screens show a “waiting for doctor” state, but there is no explicit start-consultation status mutation.
- Generated/scaffolding scripts remain mixed with maintained application code.
- Some source text shows mojibake for currency/symbol characters (for example `â‚¹`), indicating encoding cleanup is needed.

### Quality and operations

- Backend tests cover all role authentication, permission isolation, disabled sessions, role audit, migration preservation/refusal, slot conflicts, consultation billing idempotency, and nursing assignment scope. Full browser end-to-end coverage is still needed.
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

## 18. Current verification status

- The working tree is based on branch `main` at `a76521a`; the authorization-separation changes are not yet committed.
- Backend: 63 tests pass. Coverage includes role login, public patient registration, exact Super Admin/Admin API denial, forced Admin creation, Super Admin-driven Admin password reset, self-promotion denial, deactivated sessions, legacy receptionist permissions, enterprise workflows, audit sanitization, and migration preservation/refusal.
- Frontend: 3 role-routing authorization tests pass; TypeScript and Next.js ESLint pass; the optimized production build succeeds and generates 87 routes, including `/super-admin/admins/[id]`.
- No database model or Alembic change was required. The last recorded database verification remains `20260826_0002 (head)` with no pending model operations.
- Docker Compose was not started during this change. It still requires non-empty `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`, and `SECRET_KEY` values in the untracked root `.env`; secret values were not inspected.
- `npm ci` reports 8 dependency vulnerabilities (7 high, 1 critical), including a warning that pinned Next.js `14.2.5` should be upgraded to a patched release. Dependency upgrades remain a separate compatibility/security task.
