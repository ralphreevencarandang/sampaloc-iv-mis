# Sampaloc IV BMIS Build Plan

Last verified: 2026-10-11

This roadmap starts from the existing implementation. It does not restart the project from scratch.

## Status Legend

- IMPLEMENTED: code and behavior are present enough to support the workflow.
- PARTIALLY IMPLEMENTED: substantial code exists, but gaps or risks remain.
- PLANNED: explicitly supported by current files/routes but not completed.
- PROPOSED: recommended improvement requiring developer approval.
- UNKNOWN: insufficient evidence.

## Feature 1 - Documentation Context System

### Objective
Create the AI context documentation system in `AGENTS.md` and `context/*.md`.

### Current Status
IMPLEMENTED by this documentation update.

### Verification
Confirm all required Markdown files exist and reference verified code paths.

## Feature 2 - Authentication and Sessions

### Objective
Maintain resident, admin, and health-worker session flows.

### Current Status
IMPLEMENTED with risks.

### Dependencies
`AUTH_SESSION_SECRET` or `SESSION_SECRET`, `Admin` and `Resident` records.

### UI
`/Login`, `/AdminLogin`, `/ClinicLogin`.

### Logic
Residents must be approved. Barangay admins exclude `HEALTH_WORKER`. Clinic login requires `HEALTH_WORKER`.

### Authorization
Sessions are separated by cookie: `resident_session`, `admin_session`, `health_worker_session`.

### Validation
Login schemas in `validations/auth.validation.ts` and `validations/clinic.validation.ts`.

### Acceptance Criteria
Invalid credentials fail safely. Archived/pending/declined residents cannot sign in. Admin and health-worker portals reject wrong roles.

### Files Affected
`server/actions/auth.actions.ts`, `lib/*-session.ts`, login pages.

## Feature 3 - Admin RBAC Hardening

### Objective
Ensure every admin mutation and sensitive API enforces server-side permissions.

### Current Status
PARTIALLY IMPLEMENTED.

### Dependencies
`lib/rbac.ts`, `lib/admin-authorization.ts`, `lib/api-authorization.ts`.

### UI
Admin sidebar and read-only provider already filter/disable controls.

### Logic
Protected server actions should call `hasAdminPermission(..., "write")`; protected route handlers should call `forbiddenUnlessAdminCan`.

### Database
No schema change required.

### Authorization
Use RBAC matrix in `context/architecture.md`.

### Acceptance Criteria
Direct POST/API calls cannot bypass UI restrictions.

### Verification
Audit all `server/actions/*.ts` and `app/api/**/*.ts`.

### Files Affected
All admin API/action modules.

## Feature 4 - Resident Registration and Verification

### Objective
Allow residents to register with valid ID proof and staff to approve or decline.

### Current Status
IMPLEMENTED.

### Dependencies
Cloudinary, Prisma, resident validation, email helper.

### UI
`/register`, `/admin/resident`, `/admin/resident/[id]`.

### Logic
Registration creates `PENDING`; admin updates status.

### Database
`Resident` fields include `validIDImage`, `status`, OTP fields, demographics, voter/4Ps/PWD flags.

### Authorization
Resident creation is public. Status updates require `residents` write permission.

### Verification
Manual form test with valid and invalid file input; admin approval update.

## Feature 5 - Resident Account and Self-Service

### Objective
Give approved residents profile, document, pet, and blotter self-service.

### Current Status
IMPLEMENTED.

### UI
`/my-account`, `/request-documents`, `/pet-registration`, `/blotter`.

### Logic
Resident layouts require a valid resident session. APIs compare route resident ID to session resident ID.

### Authorization
Resident-only, own-record access.

### Verification
Test approved resident can access own records and cannot fetch another resident ID.

## Feature 6 - Document Requests and PDF Delivery

### Objective
Residents request documents; admins review, approve, generate PDF, and email output.

### Current Status
PARTIALLY IMPLEMENTED.

### Dependencies
Document catalog, `Document` pricing records, Puppeteer, SMTP.

### UI
Resident `/request-documents`; admin `/admin/documents/*`; pricing `/admin/documents/manage`.

### Logic
Active catalog includes clearance, indigency, residency, cedula, and first-time job seeker. Barangay ID route exists but active catalog entry is commented out.

### Database
`DocumentRequest`, `Document`.

### Authorization
Residents create own requests. Admin document write permission updates/generates/sends.

### Acceptance Criteria
Requests preserve details JSON, status transitions, generated serial number/PDF, and email result.

### Verification
Submit resident request, approve/review, generate PDF, email PDF in configured environment.

## Feature 7 - Announcements and Officials

### Objective
Manage public announcements and barangay officials.

### Current Status
IMPLEMENTED.

### UI
`/admin/announcements`, `/admin/officials`, `/admin/officials/[id]`, public landing sections.

### Logic
Announcements are linked to officials; both support image/profile upload and archive workflows.

### Authorization
Announcements and officials write permission.

### Verification
Create, edit, archive, restore, and confirm public display where applicable.

## Feature 8 - Blotter and VAWC

### Objective
Track public safety blotters and VAWC case records.

### Current Status
PARTIALLY IMPLEMENTED.

### UI
Resident `/blotter`, admin `/admin/blotter`, `/admin/vawc`, `/admin/vawc/[id]`.

### Logic
Blotters can be filed by residents or admins. VAWC records include victim/respondent fields, abuse type, status, optional blotter linkage, status history, and schedules.

### Database
`Blotter`, `VawcRecord`, `VawcStatusHistory`, `VawcSchedule`.

### Authorization
Blotter/VAWC write permission for peace-and-order roles and admins.

### Missing / Risks
Audit history and schedule UI behavior require further verification. VAWC data is highly sensitive and should receive a focused security review.

### Verification
Create/edit/archive/restore blotter and VAWC; confirm restricted access by non-authorized roles.

## Feature 9 - Clinic and Health Records

### Objective
Allow health workers and authorized admins to manage resident medical records.

### Current Status
IMPLEMENTED with data-model caveats.

### UI
`/ClinicLogin`, `/clinic`, `/clinic/medical-records`, `/admin/health`.

### Logic
Medical records link patient residents to checking admins. `clinic.actions.ts` maps `notes` into both `symptoms` and `treatment`, which should be reviewed for business correctness.

### Authorization
Health worker session or admin `health` write permission.

### Verification
Create/update/archive/restore records from clinic and admin health views.

## Feature 10 - Pets

### Objective
Track resident pet registrations.

### Current Status
IMPLEMENTED.

### UI
Resident `/pet-registration`; admin `/admin/pets`.

### Authorization
Residents create own pets; admins need `pets` write permission.

### Verification
Create resident and admin pet records, archive/restore as admin.

## Feature 11 - Inventory

### Objective
Manage barangay inventory items and stock status.

### Current Status
PARTIALLY IMPLEMENTED.

2026-10-18: Clinic medicine dispensing is implemented using shared InventoryItem stock and InventoryTransaction history. Admin medicine/expiry controls, stock-version conflicts, health-worker-only dispensing, searchable multi-medicine selection, history and retry/concurrency tests are complete. The additive migration and live authenticated browser verification remain deployment steps. General non-clinic inventory transaction UI is still unverified.

### UI
`/admin/inventory`.

### Logic
Inventory items exist with quantity-derived status. `InventoryTransaction` model exists, but transaction UI/workflow was not verified.

### Authorization
Inventory write permission.

### Verification
Create/update/archive/restore items and validate stock status thresholds.

## Feature 12 - Archives

### Objective
Let authorized admins inspect and restore archived records.

### Current Status
IMPLEMENTED.

### UI
`/admin/archived`.

### Authorization
`archives` read/write permission.

### Verification
Archive and restore every supported entity type.

## Feature 13 - Audit Logging

### Objective
Record who changed sensitive records and when.

### Current Status
PROPOSED.

### Dependencies
New schema and policy decisions.

### Acceptance Criteria
Every sensitive admin mutation records actor, action, target, timestamp, and safe metadata.

## Feature 14 - Testing Baseline

### Objective
Add automated coverage for auth, RBAC, validation, and critical workflows.

### Current Status
PROPOSED.

### Dependencies
Developer approval for test framework and setup.

### Acceptance Criteria
Key server actions and route handlers have repeatable tests; build and lint remain green.

## Recommended Next Development Task

Run a focused security and authorization audit of all `server/actions/*.ts` and `app/api/**/*.ts`, then patch any direct-call authorization gaps before adding new features.
