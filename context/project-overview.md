# Sampaloc IV BMIS Project Overview

Last verified: 2026-10-11

## About the Project

Sampaloc IV MIS is a Barangay Management Information System for Barangay Sampaloc IV, Dasmarinas City, Cavite. It gives residents a public portal for registration, sign-in, profile access, barangay document requests, pet registration, and blotter filing. It gives authorized barangay staff separate administrative and clinic portals for managing resident records, officials, announcements, document requests, public safety records, VAWC cases, pets, inventory, archives, and medical records.

The application is implemented as a Next.js App Router project with route groups for resident-facing pages, barangay administration, and clinic operations.

## Problems It Solves

- Centralizes resident registration and approval instead of relying on scattered paper or spreadsheet records.
- Lets approved residents request barangay documents and track request status.
- Provides staff views for document queues, PDF generation, and email delivery.
- Records barangay officials, announcements, registered pets, blotters, VAWC cases, inventory, and medical encounters.
- Separates barangay administrator permissions from health-worker clinic access.
- Provides soft-archive and bulk restore workflows for several administrative records.

## Project Objectives

- Maintain a single source of truth for resident, administrative, health, document, and barangay service records.
- Protect sensitive resident, health, incident, and VAWC information with server-side session and permission checks.
- Keep barangay workflows traceable through clear statuses and archive states.
- Provide responsive public, admin, and clinic UI with reusable components and validation.
- Support production deployment with PostgreSQL, Prisma migrations, Cloudinary image storage, and email services.

## User Roles

| Role | Source | Responsibilities | Access limitations |
| --- | --- | --- | --- |
| Resident | `Resident` model and `resident_session` cookie | Register, sign in after approval, view account, request documents, register pets, file blotters, upload profile image | Must have `status = APPROVED` and not be archived for resident session. Can only access own resident-scoped API data. |
| ADMIN | `AdminRole.ADMIN` | Full barangay admin access to all resources and write operations | Excluded from clinic login unless role is `HEALTH_WORKER`; still may access admin health resource by RBAC. |
| CLERK | `AdminRole.CLERK` | Announcements, officials, voters, document workflows | No resident, blotter, VAWC, pets, inventory, archives, dashboard, or health access by `lib/rbac.ts`. |
| PEACE_AND_ORDER | `AdminRole.PEACE_AND_ORDER` | Blotter and VAWC workflows | No access to other admin modules by `lib/rbac.ts`. |
| PUNONG_BARANGAY | `AdminRole.PUNONG_BARANGAY` | Read access to all admin resources | `WRITABLE_RESOURCES_BY_ROLE` is empty; UI read-only behavior is enforced by `AdminRbacProvider`, and server actions using `hasAdminPermission(..., "write")` reject writes. |
| SK | `AdminRole.SK` | Announcement workflow | Only announcements are readable/writable. |
| HEALTH_WORKER | `AdminRole.HEALTH_WORKER` | Clinic login, dashboard, medical records | Not a barangay admin role. Uses `health_worker_session` and clinic routes. |

## Core Features

### Resident Portal

- Public landing page with hero, announcements, officials, services, about, and contact sections.
- Resident registration with valid ID image upload through Cloudinary.
- Resident login gated by approval status.
- Account page with resident profile, document requests, pet records, and blotter records.
- Resident document request form backed by `DocumentRequest`.
- Resident pet registration backed by `Pet`.
- Resident blotter filing backed by `Blotter`.

### Barangay Admin Portal

- Admin login for non-health-worker admin roles.
- Role-aware sidebar and route protection for `/admin`.
- Dashboard with demographic and summary charts.
- CRUD-style management screens for announcements, officials, residents, pets, blotter records, VAWC records, inventory, and document settings.
- Document request review, approval/review status updates, PDF generation, and email sending.
- Archives screen with bulk restore patterns.

### Clinic Portal

- Health worker login.
- Clinic dashboard and medical record management.
- Admin health records page under `/admin/health`.
- Medical record create, update, archive, and restore actions with health-worker or admin health permissions.

## Pages and Routes

### Public and Resident Routes

| Route | Purpose |
| --- | --- |
| `/` | Resident landing page. |
| `/Login` | Resident sign-in. |
| `/register` | Resident registration. |
| `/my-account` | Resident profile, documents, pets, and blotters. Requires resident session through layout. |
| `/request-documents` | Resident document request workflow. Requires resident session through layout. |
| `/pet-registration` | Resident pet self-registration. Requires resident session through layout. |
| `/blotter` | Resident blotter filing. Requires resident session through layout. |
| `/archives` | Redirect page to `/admin/archived`. |

### Admin Routes

| Route | Purpose |
| --- | --- |
| `/AdminLogin` | Barangay admin login. |
| `/admin` | Admin dashboard. |
| `/admin/announcements` | Announcement management. |
| `/admin/officials`, `/admin/officials/[id]` | Official list and details. |
| `/admin/resident`, `/admin/resident/[id]` | Resident list and details. |
| `/admin/voters` | Voter list. |
| `/admin/documents` | Document module entry. |
| `/admin/documents/manage` | Document type price settings. |
| `/admin/documents/clearance` | Barangay clearance requests. |
| `/admin/documents/indigency` | Certificate of indigency requests. |
| `/admin/documents/residency` | Certificate of residency requests. |
| `/admin/documents/cedula` | Cedula requests. |
| `/admin/documents/barangay-id` | Barangay ID page exists, but the active catalog entry is commented out. Requires confirmation. |
| `/admin/documents/job-seeker` | First-time job seeker certificate requests. |
| `/admin/blotter` | Blotter management. |
| `/admin/health` | Admin medical records page. |
| `/admin/vawc`, `/admin/vawc/[id]` | VAWC list and details. |
| `/admin/pets` | Pet registration management. |
| `/admin/inventory` | Inventory management. |
| `/admin/archived` | Archived records. |

### Clinic Routes

| Route | Purpose |
| --- | --- |
| `/ClinicLogin` | Health worker login. |
| `/clinic` | Clinic dashboard. |
| `/clinic/medical-records` | Clinic medical record list. |

## Navigation Structure

- `components/ui/ResidentNavbar.tsx` links to landing-page anchors and shows resident login/account controls.
- `components/ui/AdminSidebar.tsx` uses `canAccessResource` to filter admin navigation by role. Documents expand into document-specific pages.
- `components/ui/Clinic/ClinicSidebar.tsx` links to `/clinic` and `/clinic/medical-records`.
- `app/(Admin)/layout.tsx` redirects unauthenticated users to `/AdminLogin`.
- `app/(Clinic)/layout.tsx` redirects unauthenticated health workers to `/ClinicLogin`.

## Core User Flows

1. Resident registers at `/register`; the server validates fields and valid ID image, uploads the image to Cloudinary, hashes the password, and creates a `Resident` with default `PENDING` status.
2. Admin with resident write permission reviews and updates resident status in `/admin/resident`; approval can trigger an email via Nodemailer.
3. Approved resident signs in at `/Login`; session is stored in an HMAC-signed `resident_session` cookie.
4. Resident creates document requests at `/request-documents`; requests start as `PENDING`.
5. Admin document staff review requests, move them to `REVIEW` or `APPROVED`, generate PDFs, email generated PDFs, and mark generated records.
6. Resident files blotters and pet registrations from resident routes; staff can manage corresponding admin records.
7. Health worker signs into `/ClinicLogin`, records medical visits, and archives/restores medical records.

## Business Rules

- Resident login is allowed only when `Resident.status` is `APPROVED` and `isArchived` is false.
- Resident registration requires a valid ID image. Allowed image types and size are enforced by `lib/valid-id-image.ts`.
- Admin login excludes `HEALTH_WORKER`; health workers must use the clinic login.
- Admin route access uses `proxy.ts` for optimistic redirects plus server-side checks in server actions and API handlers.
- `PUNONG_BARANGAY` is read-only by RBAC.
- Document request statuses are `PENDING`, `REVIEW`, `APPROVED`, `GENERATED`, and `REJECTED`. Apply both document eligibility migrations, including `20261016010000_merge_cancelled_document_requests`, which merges cancelled requests into REJECTED. PDF generation is the issuance/release step; approval alone is active. One active request per resident/document type is allowed. First-Time Job Seeker is free, limited to one copy per new request, and unavailable after any prior issuance.
- Blotter statuses are `OPEN` and `RESOLVED`.
- VAWC statuses are `REPORTED`, `SUMMONED`, `RESOLVED`, and `DISMISSED`.
- Archive fields vary by model: `isArchive` and `isArchived` both exist. Preserve existing names.

## Features In Scope

Verified in code: resident auth and registration, admin auth and RBAC, health-worker auth, resident profile APIs, resident document requests, admin document requests, PDF generation, announcements, officials, residents, voters, pets, blotter, VAWC, inventory, clinic medical records, archives, image uploads, and email helpers.

## Features Out of Scope

Not verified as implemented: SMS notifications, online payment gateway verification, full audit trail model, household management, appointment scheduling UI for VAWC schedules, and real-time notifications.

## Success Criteria

- Approved residents can complete resident workflows without accessing other residents' data.
- Barangay staff can access only RBAC-approved admin modules.
- Health workers can manage medical records without entering the barangay admin portal.
- Document request records can progress through review, approval, generation, and email delivery.
- Sensitive resident, medical, blotter, and VAWC records are never exposed through unauthenticated endpoints.
- Future agents can update the project by reading this context directory before code changes.
