# HMS Android Application — Product Requirements and Delivery Blueprint

> Product: Hospital Management System (HMS) Android application  
> Document status: Implementation-ready product definition  
> Last reconciled with the working tree: 2026-09-05  
> Existing system source of truth: `context.md`, FastAPI routers/models, and the current Next.js role portals

## 1. Product vision

Build one secure Android application that connects to the existing HMS backend and gives every hospital user a role-appropriate mobile workspace. The Android application must reuse the current Patient, Doctor, Appointment, Prescription, Billing, Nursing, Pharmacy, Laboratory, Radiology, Accounting, Insurance, Ambulance, Administration, and Super Administration records. It must not create a parallel backend, duplicate patient records, or use demo data.

The product should help hospital teams complete time-sensitive work from a phone or tablet while preserving the authorization and audit boundaries already enforced by FastAPI.

## 2. Product goals

1. Provide secure Android login and role-aware navigation for all thirteen HMS roles.
2. Reuse the existing FastAPI APIs and MySQL data without duplicating web business logic in a second server.
3. Preserve backend-enforced ownership, assignment, exact-role, and per-Receptionist permission rules.
4. Make high-frequency mobile workflows fast: appointments, patient lookup, consultation, nursing care, dispensing, tests, imaging, claims, finance, and transport.
5. Show real API data, explicit empty/error/loading states, and no hard-coded operational counts.
6. Protect patient and hospital information on the device, in transit, in logs, and in screenshots/background previews.
7. Keep Android and web workflows consistent so a record created on either client is immediately available to the other.

## 3. Non-goals for the first production release

- Replacing the existing Next.js web application.
- Creating a separate Android-only database or API.
- Allowing the app to decide authorization from the displayed role alone.
- Adding diagnosis automation, medical advice, or AI-generated clinical decisions.
- Claiming HIPAA, ABDM, or another regulatory certification without a formal legal/security assessment.
- Full offline mutation support for clinical or financial transactions.
- Introducing fake patients, staff, appointments, tasks, alerts, or dashboard metrics.
- Replacing existing guarded state machines with generic status editing.

## 4. Users and roles

The application must recognize the same backend role values used by HMS:

| Backend role | Android workspace | Primary mobile purpose |
|---|---|---|
| `patient` | Patient | Appointments, prescriptions, bills, profile |
| `doctor` | Doctor | Assigned care, consultation, prescriptions, nursing assignments |
| `receptionist` | Receptionist | Registration, scheduling, queue, payments according to employee permissions |
| `admin` | Administrator | Hospital overview and staff/doctor/patient/appointment/billing management |
| `super_admin` | Super Administrator | Platform administration, organizations, Admin accounts, grants, settings, flags, audit and health |
| `hospital_manager` | Hospital Manager | Read-only hospital operations, workforce, departments and reports |
| `nurse` | Nurse | Assignment-scoped patients, vitals, observations, tasks and own Patient History |
| `pharmacist` | Pharmacist | Prescription verification, inventory and dispensing |
| `lab_technician` | Lab Technician | Assigned laboratory orders, samples and results |
| `radiologist` | Radiologist | Assigned imaging orders, studies and reports |
| `accountant` | Accountant | Invoices, payments, expenses and financial reports |
| `insurance_officer` | Insurance Officer | Policies, claims, documents, decisions and settlements |
| `ambulance_staff` | Ambulance Staff | Vehicles, transport requests and owned trips |

One account has one active role. The Android client must open only the workspace returned by the live backend identity and must not provide a client-side role switcher.

## 5. Recommended delivery phases

The final product targets all roles, but implementation should be delivered in testable vertical slices.

### Phase 0 — Mobile foundation

- Android project structure, design system, environment configuration and CI.
- Login, logout, password recovery, email verification deep links, `/auth/me`, secure token storage and role routing.
- Shared networking, error parsing, connectivity state, date/time formatting, pagination support and test fixtures.
- Privacy controls, redacted logging and crash-report filtering.

### Phase 1 — Core care journey

- Patient, Receptionist, Doctor and Nurse workspaces.
- Patient registration/profile, 15-minute appointment choices, queue/check-in and consultation.
- Prescription and Patient billing views.
- Doctor-to-Nurse task assignment.
- Nurse assignment-scoped patients, appointments, vitals, observations, task transitions and read-only Patient History.

### Phase 2 — Specialist operations

- Pharmacist, Lab Technician, Radiologist and Ambulance Staff workspaces.
- Preserve all assignment, ownership, inventory-locking and guarded transition rules.

### Phase 3 — Management and finance

- Hospital Manager, Admin, Accountant and Insurance Officer workspaces.
- Optimize dense reports and tables for tablets while providing concise phone layouts.

### Phase 4 — Platform governance

- Super Admin workspace.
- Platform settings, organizations, role grants, feature flags, Admin lifecycle, audit history and health.
- Super Admin remains a standalone exact role and never inherits hospital operational access.

## 6. Authentication and session requirements

### 6.1 Login

1. Submit email and password to `POST /auth/login`.
2. Store the returned bearer JWT only in Android encrypted storage backed by the Android Keystore.
3. Call `GET /auth/me` after login and on every cold start to obtain the current live role/account state.
4. Route to the role home defined in section 7.
5. Never use an email, locally cached role, or decoded JWT claim as the final authorization decision.

### 6.2 Session behavior

The current backend default is `ACCESS_TOKEN_EXPIRE_MINUTES=0`, so a default JWT has no timed expiry. This is not an idle timeout. The mobile client must therefore:

- Retain the token until explicit logout or live backend rejection.
- Revalidate `/auth/me` when the app starts and when it returns after a meaningful background interval.
- Clear credentials and protected cached data on `401`.
- Clear credentials when a `403` explicitly reports a disabled account or missing required role profile.
- Provide a user-visible session-ended message before returning to Login.
- Never silently retry a request with another user's credentials.

Explicit logout deletes the local token but the backend currently has no token denylist or refresh-token rotation. Server-side account/profile deactivation remains the immediate revocation mechanism. A production security review should decide whether to add short-lived access tokens, refresh rotation and device-session revocation before public distribution.

### 6.3 Account recovery and verification

- Forgot password: `POST /auth/forgot-password`.
- Reset password: `POST /auth/reset-password` through an HTTPS App Link carrying the reset token.
- Patient email verification: `POST /auth/verify-email` through an HTTPS App Link.
- Resend verification: `POST /auth/resend-verification`.
- Never place reset/verification tokens in analytics, logs, notifications or crash reports.

## 7. Role home destinations

| Role | Android start destination |
|---|---|
| Patient | Patient Overview |
| Doctor | Clinical Overview |
| Receptionist | Front Desk |
| Admin | Hospital Overview |
| Super Admin | Platform Overview |
| Hospital Manager | Operations Center |
| Nurse | Nursing Overview |
| Pharmacist | Pharmacy Overview |
| Lab Technician | Laboratory Overview |
| Radiologist | Imaging Overview |
| Accountant | Finance Overview |
| Insurance Officer | Insurance Overview |
| Ambulance Staff | Transport Overview |

Unknown or unsupported roles must fail closed with a clear support message; they must not fall back to another portal.

## 8. Shared Android navigation

- Phone: top app bar plus role-specific bottom navigation for the three to five highest-frequency destinations; remaining destinations live under More.
- Tablet: permanent or collapsible navigation rail/drawer using the same grouping as the web sidebar.
- Never show a destination that the current role/permission response does not allow.
- Hiding navigation is only presentation. Backend authorization remains mandatory for every request.
- Show the current person's name, role, connection state, notifications entry when implemented, and explicit Sign out.

## 9. Screen and workflow requirements

### 9.1 Public and authentication

- Welcome/Login.
- Patient account registration.
- Email verification result and resend flow.
- Forgot password.
- Reset password.
- Session-ended state.
- Privacy policy, support details and app/version information.

### 9.2 Patient workspace

Screens:

- Overview: greeting, next appointment and real summary counts.
- Appointments: active Doctor selection, date selection, available 15-minute time slots, reason, booking and history.
- Prescriptions: read-only personal prescription history.
- Billing: own pending/paid bills, total dues and receipt detail.
- Profile: editable supported demographic/contact fields.

Rules:

- Patient can create appointments only for the Patient profile linked to the logged-in user.
- Do not send a client-selected patient owner when the backend derives ownership.
- Appointment slots must reflect Doctor hours and existing collisions; the backend response/error is authoritative.
- Past times, inactive Doctors and conflicting slots must show actionable validation messages.

### 9.3 Receptionist workspace

Screens:

- Front Desk dashboard.
- Basic Patient directory.
- Register walk-in Patient.
- Schedule appointment.
- Today's queue with confirm/check-in actions.
- Billing desk with cash/card/UPI collection and receipt.

Rules:

- Read live effective permissions from `/rbac/me/permissions`.
- Independently gate Register Patient, Schedule Appointment, Check-in Patient and Collect Billing.
- A hidden or stale button never replaces backend permission enforcement.
- Repeat payment collection must use the backend's idempotent result and never create a second receipt.

### 9.4 Doctor workspace

Screens:

- Clinical Overview with assigned queue and status-aware actions.
- Assigned Appointments.
- Assigned Patient directory.
- Patient detail with appointment, prescription and nursing history.
- Consultation with guarded start/completion flow.
- Doctor Profile.
- Assign Nursing Task modal/sheet.

Doctor-to-Nurse flow:

1. Doctor opens a Patient associated with that Doctor's appointment.
2. Doctor selects Assign Nursing Task.
3. Patient is preselected and cannot be replaced with an arbitrary ID.
4. App fetches active Nurses from `GET /doctors/nurses`.
5. Doctor enters title, description, Low/Medium/High/Urgent priority and optional due time.
6. App creates through `POST /doctors/nursing-tasks`; backend forces `pending`.
7. Patient detail shows assigned Nurse, creator, task status, vitals and nursing observations read-only.

Consultation must preserve `checked_in → in_progress → completed`, exactly one prescription and exactly one pending bill. The consultation fee is calculated by the backend from the Doctor profile.

### 9.5 Nurse workspace

Screens:

- Nursing Overview.
- Assigned Patients.
- Patient History.
- Patient History Detail.
- Assignment-authorized Patient Detail.
- Relevant Appointments.
- Record Vitals and Vital History.
- Nursing Tasks.

Central security rule:

```text
Task assigned to current Nurse
        +
Task status is pending or in_progress
        ↓
Active Patient access
```

- An active Patient page may show nursing-relevant basics, appointments, read-only diagnosis/prescriptions, task history, vital history and observations.
- Nurse can append vitals and factual observations but cannot edit/delete historical readings, diagnose, prescribe or bill.
- Allowed task transitions are only `pending → in_progress → completed`.
- Completing the last active task removes active Patient access and active dashboard counts.
- Patient History remains available afterward, but only when that Patient was assigned to the logged-in Nurse.
- History Detail shows only that Nurse's assigned tasks, that Nurse's recorded vitals/observations and related appointment context. It must not become permanent access to unrelated or future clinical records.
- Another Nurse must receive `403` for the same history ID unless that Patient also has a task history assigned to that other Nurse.

Dashboard priority:

1. Urgent/high-priority tasks.
2. Active and pending tasks.
3. Patients requiring vitals or immediate action.
4. Unique currently assigned Patients and waiting Patients.
5. Upcoming appointments within assignment scope.

### 9.6 Pharmacist workspace

Screens:

- Pharmacy Overview and alerts.
- Prescription queue/detail.
- Inventory and medicine batches.
- Dispensing workflow/history.

Rules:

- Doctor prescription content is read-only.
- Preserve `pending → verified → ready_for_dispensing` or reason-required rejection.
- Dispensing must use the atomic backend operation; never calculate or decrement stock locally as the source of truth.
- Block expired batches, unavailable quantity and duplicate dispensing based on API results.

### 9.7 Lab Technician workspace

Screens:

- Laboratory Overview.
- Authorized Lab Orders.
- Order Detail and sample workflow.
- Draft/Final Results.

Rules:

- Show unassigned orders until accepted and then only orders assigned to the current technician.
- Preserve `ordered → sample_collected → processing → completed`.
- Only the author can edit a draft result; finalized results are immutable.

### 9.8 Radiologist workspace

Screens:

- Imaging Overview.
- Authorized Imaging Orders.
- Order/Study Detail.
- Draft, Final and Amendment Reports.

Rules:

- Preserve assignment ownership and one study per order.
- Final reports are immutable.
- Amendment creates a new reason-attributed version and never overwrites a finalized report.

### 9.9 Accountant workspace

Screens:

- Finance Overview.
- Invoices.
- Payments.
- Expenses and categories.
- Financial Reports.

Rules:

- Money uses decimal-safe types and formatted currency; never binary floating-point calculations.
- Invoice payment is duplicate-safe and backend locked.
- Expenses are append-only and submitted with an idempotency key.
- Do not expose diagnosis, prescriptions or other unnecessary clinical fields.

### 9.10 Insurance Officer workspace

Screens:

- Insurance Overview.
- Patients and verified-policy setup.
- Claims and Claim Detail.
- Approvals queue.

Rules:

- Preserve one claim per invoice and unique settlement references.
- Respect guarded draft/submission/review/decision/settlement transitions.
- Document request and approve/reject actions require the backend-required reason.
- Show only insurance-relevant identity, policy and financial data; do not expose clinical content.

### 9.11 Ambulance Staff workspace

Screens:

- Transport Overview.
- Pending/Owned Requests.
- Request and Trip Detail.
- Trips.
- Assigned Ambulances.

Rules:

- Shared requests are visible only while unassigned; accepted work becomes staff-owned.
- Preserve `assigned → en_route → arrived → transporting → completed`.
- Only the responsible staff member can open or mutate an accepted request/trip.
- Completing a trip releases its vehicle through the atomic backend workflow.
- Location permission is optional until real location tracking is deliberately implemented.

### 9.12 Hospital Manager workspace

Screens remain read-only:

- Operations Center.
- Appointments, Patients, Doctors and Staff monitors.
- Departments.
- Reports and revenue summaries.

The Manager must not receive clinical mutation, payment collection, staff security, specialist operations or department mutation actions.

### 9.13 Admin workspace

Screens:

- Hospital Overview.
- Doctors and Doctor Detail/Edit.
- Staff Accounts and Staff Detail.
- Patients and Appointments.
- Billing Report.

Rules:

- Admin can create all non-administrator staff roles with contact and optional shift.
- Receptionist designation is fixed to Receptionist; page permissions are editable individually.
- Doctor deletion and every destructive action require a confirmation dialog naming the target and consequence.
- Doctor deletion disables the linked login, clears outstanding account tokens and removes the Doctor profile, subject to database references.
- Staff shifts support the existing Doctor/non-Doctor validation differences.

### 9.14 Super Admin workspace

Screens:

- Platform Overview and System Health.
- System Users read-only directory.
- Admin Accounts and password reset.
- Hospitals/Organizations.
- Role Grants.
- Settings.
- Feature Flags.
- Audit Logs.

Rules:

- Require exact `super_admin` role.
- Dynamic grants must respect backend restrictions on administrative permissions.
- Grant revocation and other destructive actions require confirmation.
- Passwords, secrets and tokens must never appear in audit views or mobile logs.

## 10. API integration contract

### 10.1 Base URLs

- Local Android emulator: `http://10.0.2.2:8000` when FastAPI runs on the development machine.
- Physical development device: an explicit LAN-accessible backend address.
- Staging/production: HTTPS only with a deployment-specific host.
- Cleartext HTTP must be permitted only in debug builds through a scoped network security configuration.

### 10.2 Request standards

- Send `Authorization: Bearer <token>` for authenticated APIs.
- Send and accept JSON unless an existing endpoint specifies otherwise.
- Use ISO-8601 date/time representations from the backend; render in the device locale/time zone but submit the required server format.
- Disable unintended HTTP response caching for live clinical/financial reads.
- Attach an idempotency value wherever the existing API supports it, especially expense creation.
- Do not blindly retry non-idempotent mutations after an unknown network result; reconcile server state first.

### 10.3 Existing API groups to reuse

| API group | Android use |
|---|---|
| `/auth` | Registration, login, verification, recovery and live identity |
| `/rbac` | Effective permissions and audit access |
| `/patients` | Own profile, authorized directories/history and walk-in registration |
| `/doctors` | Doctor profile, active Doctors, active Nurses and nursing assignments |
| `/appointments` | Self/staff/Doctor appointment workflows |
| `/prescriptions` | Patient reads and Doctor consultation completion |
| `/billing` | Patient bills and authorized collection |
| `/nurse` | Assignment-scoped nursing workspace and own Patient History |
| `/pharmacy` | Prescription review, stock and dispensing |
| `/lab` | Assignment-scoped laboratory workflow |
| `/radiology` | Assignment-scoped imaging workflow |
| `/accountant` | Invoices, payments, expenses and reports |
| `/insurance` | Providers, policies, claims, documents, decisions and settlement |
| `/ambulance` | Vehicles, requests, owned trips and transitions |
| `/admin` and `/admin/employees` | Hospital administration and staff security |
| `/super-admin` | Platform governance and system health |

FastAPI OpenAPI at `/openapi.json` should be used to generate or validate Android DTOs. Generated models must still be reviewed for decimal, date/time, enum, nullable and error-response handling.

### 10.4 Standard error behavior

| Response | Android behavior |
|---|---|
| `400` | Display the backend business-rule message near the relevant action |
| `401` | Clear secure session and protected cache, then open Session Ended/Login |
| `403` | Keep session unless account-disabled; show access/permission message and navigate back safely |
| `404` | Show not-found state without leaking whether an unrelated protected record exists |
| `409` | Show conflict/state-transition message and refresh the current resource |
| `422` | Map validation messages to fields where possible |
| `5xx`/network | Preserve unsent form state, show retry, and do not claim success |

## 11. Android technical architecture

Recommended native stack:

- Kotlin.
- Jetpack Compose with Material 3 and adaptive phone/tablet layouts.
- Single-activity architecture with Navigation Compose.
- MVVM or unidirectional data flow with immutable UI state.
- Coroutines and Flow.
- Retrofit/OkHttp plus a typed JSON serializer.
- Hilt for dependency injection.
- Android Keystore-backed encrypted session storage.
- Room only for deliberately approved, minimal encrypted/read-only cache data.
- WorkManager for safe background refresh/notification registration, not for unreviewed clinical mutations.

Suggested module layout:

```text
android-app/
├── app/                    # Application, navigation and role graph
├── core/
│   ├── auth/               # Session, token store, live identity
│   ├── network/            # API client, interceptors, errors
│   ├── designsystem/       # Theme, components, badges, states
│   ├── model/              # Shared domain models
│   ├── database/           # Approved local cache only
│   └── testing/            # Fakes and test utilities
└── feature/
    ├── patient/
    ├── doctor/
    ├── receptionist/
    ├── nurse/
    ├── pharmacy/
    ├── laboratory/
    ├── radiology/
    ├── accounting/
    ├── insurance/
    ├── ambulance/
    ├── manager/
    ├── admin/
    └── superadmin/
```

Each feature should separate API DTOs, repositories, use cases/view models and Compose screens. Business authorization and irreversible state rules stay in FastAPI; the Android layer mirrors them for UX only.

## 12. UI and design requirements

- Preserve the existing HMS visual identity: deep healthcare green/teal, clean white surfaces, calm status colors and clear clinical hierarchy.
- Meet accessible contrast, scalable text and minimum touch-target requirements.
- Use semantic labels for TalkBack on every icon-only action and status.
- Never communicate priority/status through color alone; include text and/or an icon.
- Use skeleton/progress loading for first load, pull-to-refresh for list pages and inline progress for mutations.
- Every list needs empty, filtered-empty, error and retry states.
- Forms preserve user input after recoverable errors.
- Destructive actions require confirmation; high-risk financial/clinical completion actions clearly state the result.
- Support dark theme only when all clinical/status colors remain accessible and screenshots are verified.

## 13. Privacy and security requirements

1. Production traffic is HTTPS only.
2. Store bearer tokens in Keystore-backed encrypted storage, never plain SharedPreferences.
3. Do not log authorization headers, cookies, passwords, reset tokens, patient names, diagnoses, notes or financial references.
4. Redact sensitive request/response bodies from crash and analytics tools.
5. Clear protected in-memory and local data on logout/session revocation.
6. Do not include PHI in push notification text; use a generic message and fetch details after authentication.
7. Avoid persistent PHI caching by default. Any approved cache must be minimal, encrypted, user-scoped and time-limited.
8. Prevent cross-account cache reuse on shared devices.
9. Consider `FLAG_SECURE` for clinical and financial screens after usability review to block screenshots and recent-app previews.
10. Request Android permissions only when a supported feature needs them; camera, files, notifications and location are not blanket startup permissions.
11. Certificate pinning is a deployment decision and must include a safe rotation strategy if enabled.
12. Backend role/permission checks and audit events remain the authoritative security boundary.

## 14. Offline and connectivity policy

- Read-only offline cache is optional and should start disabled for sensitive modules.
- Login, permission validation, task transitions, consultation completion, dispensing, payments, claims, results/reports and transport transitions require a confirmed server response.
- Do not show optimistic success for clinical or financial mutations.
- If connectivity fails after submission, query current server state before offering another attempt.
- Clearly label stale cached content with its last successful synchronization time.
- Never expose one user's cached records after another user logs in.

## 15. Notifications and real-time updates

The backend now persists role-scoped in-app notifications and exposes `/notifications/me`, owner-scoped read actions, a two-minute notification socket ticket, and `/ws/notifications` live refresh events. Patient appointment booking notifies the assigned Doctor and active Receptionists, Doctor-created nursing work notifies the selected Nurse, and the same event system covers relevant appointment, clinical-support, pharmacy, laboratory, radiology, payment, insurance, ambulance, staff-account, and access changes. A production Android OS-push adapter is not yet implemented.

Initial Android behavior:

- Fetch the latest notifications from `GET /notifications/me` and mark only the authenticated user's items through the owner-scoped read endpoints.
- Request a short-lived ticket from `POST /notifications/socket-ticket`, then connect to `/ws/notifications` with the `bearer` WebSocket subprotocol; re-fetch notifications when a `notifications.changed` event arrives.
- Refresh active work when the app resumes and on user pull-to-refresh.
- Use battery-safe foreground polling as a fallback when the WebSocket cannot connect.
- Do not invent local notifications for tasks that the server did not return.

Future push phase:

- Add server-side Firebase Cloud Messaging device registration and revocation.
- Notify without PHI for new Nurse tasks, appointment changes, lab/radiology work, claim actions and ambulance requests.
- Opening a notification must authenticate, re-fetch the record and re-check authorization.

## 16. Data and state integrity

The Android application must treat these backend workflows as state machines:

```text
Appointment: requested → confirmed → checked_in → in_progress → completed
                                      └────────────────────────→ cancelled

Nursing task: pending → in_progress → completed

Lab item: ordered → sample_collected → processing → completed

Radiology order: ordered → scheduled → performed → reviewing → reporting → completed

Insurance claim: draft → submitted → under_review → approved/rejected → settled

Ambulance trip: assigned → en_route → arrived → transporting → completed
```

The UI should show only sensible next actions, but all conflicts must be handled because another web/mobile client may change the record concurrently.

Historical records that are immutable/append-only in the backend must not expose Android edit/delete actions.

## 17. Testing strategy

### 17.1 Unit tests

- Role-to-navigation mapping.
- Permission-based action visibility.
- DTO/domain conversion, nullable values, Decimal and date/time parsing.
- State-machine next-action presentation.
- Error mapping and session-clear behavior.
- Nurse active versus historical access presentation.

### 17.2 Repository/API tests

- MockWebServer tests for success, validation, unauthorized, forbidden, conflict and server errors.
- Authorization interceptor never sends a token to an unapproved host.
- Mutation retry policy prevents duplicates.
- Logout clears token and user-scoped cache.

### 17.3 Compose UI tests

- Loading, empty, error and populated states for each role's core screens.
- Form validation and preserved input.
- TalkBack descriptions and large-font layouts.
- Destructive confirmations.
- Phone and tablet navigation.

### 17.4 End-to-end acceptance journeys

At minimum automate against a disposable backend database:

1. Patient registers/verifies, logs in, edits profile and books an available 15-minute appointment.
2. Receptionist registers a walk-in Patient, schedules, confirms/checks in and cannot use revoked actions.
3. Doctor opens an assigned Patient, starts consultation, completes prescription/bill and creates a Nurse task.
4. Assigned Nurse alone sees the Patient/task, records a new vital and note, starts/completes the task, loses active access and retains only own Patient History; Doctor sees the nursing record.
5. Pharmacist verifies and dispenses exactly once from valid stock.
6. Lab Technician and Radiologist see only authorized assignments and cannot edit finalized records.
7. Accountant collects an invoice once and records an expense once under retry.
8. Insurance Officer completes only valid claim transitions without receiving clinical fields.
9. Ambulance Staff owns only accepted work and releases the vehicle on completion.
10. Admin provisions roles/permissions/shifts and a disabled/deleted-profile user loses an existing mobile session.
11. Super Admin remains isolated from Admin/Manager portals and mutations are audited without secrets.

## 18. Observability and support

- Record technical telemetry using opaque request/correlation IDs, status codes, timings, app version and device class.
- Never attach PHI or secrets to analytics/crash events.
- Provide a Copy diagnostic ID action for errors.
- Monitor login failure rate, API latency/error rate, crash-free sessions and workflow completion—not clinical content.
- Support screen should display app version, environment label and contact instructions.

## 19. Product success measures

- Successful authenticated session rate.
- Median time from appointment check-in to consultation start.
- Median time from Nurse task assignment to start/completion.
- Percentage of failed mutations successfully reconciled without duplicates.
- Crash-free and ANR-free session rates.
- API error rate by endpoint family.
- Accessibility test pass rate.
- Reduction in unauthorized/cross-role request attempts from client defects.

Metrics must use anonymous operational identifiers and must not collect patient names, diagnoses, notes or prescription content.

## 20. Backend readiness and known dependencies

The existing backend already supports the core role workflows, including assignment-scoped Nurse/Lab/Radiology/Ambulance access, guarded transitions, audit events and the new Nurse Patient History.

Before production Android launch, explicitly decide or complete:

- Production session lifetime, refresh-token rotation and device-session revocation.
- Rate limiting for login, verification resend and password recovery.
- CSRF is mainly a web-cookie concern; Android bearer-token endpoints still require origin/host and token-leak review.
- Production HTTPS, secrets, CORS/web configuration and environment separation.
- Organization isolation, currently deferred in the existing HMS.
- A real push/email/SMS notification adapter and retry policy.
- Consistent pagination for potentially large mobile lists.
- Production monitoring, backups, retention rules and incident response.
- Dependency upgrades, including the known existing frontend audit findings; Android dependencies must also be pinned and scanned.
- Full legal/privacy review for the target hospitals and jurisdiction.

## 21. Release acceptance criteria

An Android release is acceptable only when:

- It connects to the existing FastAPI backend and displays real data.
- All supported roles land in the correct workspace.
- Direct navigation cannot open another role's screens.
- Backend `401`, `403`, `404`, `409`, `422` and network failures have safe UX.
- Patient ownership and Doctor/Nurse/Lab/Radiology/Ambulance assignment boundaries pass end-to-end tests.
- Receptionist permissions change mobile actions and backend access immediately after refresh/session validation.
- Clinical and financial state transitions cannot be skipped or repeated incorrectly.
- Historical vitals, notes, tasks, results, reports, payments and audit data are not silently overwritten.
- No secret or PHI appears in logs, analytics, notifications or another user's cache.
- Accessibility, phone/tablet layout, poor-network and process-recreation tests pass.
- The matching backend migration head is deployed before the Android build is released.
- Web regression tests and Android automated tests both pass in CI.

## 22. Implementation kickoff checklist

1. Confirm Android package name, signing ownership, supported device policy and store distribution model.
2. Confirm staging and production HTTPS API hosts.
3. Export/review `/openapi.json` and create the first typed Android API client.
4. Implement secure session storage and `/auth/me` role routing.
5. Build the shared HMS Compose design system and standard screen states.
6. Deliver Phase 1 one role at a time with backend integration tests.
7. Add privacy-safe CI, static analysis, unit/UI tests and signed internal builds.
8. Run clinical workflow review with real hospital representatives using non-production data.
9. Complete security/privacy review and operational monitoring before production rollout.

This document defines Android product behavior. When an API or data detail differs, the current FastAPI implementation and database migrations remain authoritative; update this file and `context.md` together when the product contract changes.
