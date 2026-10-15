# Sampaloc IV BMIS Architecture

Last verified: 2026-10-11

## Technology Stack

| Layer | Technology | Version | Purpose |
| --- | --- | --- | --- |
| Framework | Next.js | 16.2.3 | App Router, pages, route handlers, proxy, server actions. |
| UI | React / React DOM | 19.2.4 | Component rendering and client interactivity. |
| Language | TypeScript | 5.9.3 | Strict application typing. |
| Styling | Tailwind CSS | 4.2.2 | Utility classes and `@theme` tokens in `app/globals.css`. |
| UI helper | DaisyUI | 5.5.19 | Tailwind plugin. Direct component usage is not consistently verified. |
| Icons | lucide-react | 1.3.0 | Admin, clinic, and page icons. |
| Forms | react-hook-form | 7.72.1 | Client form state. |
| Validation | zod | 4.3.6 | Server and client schemas under `validations/`. |
| Validation bridge | @hookform/resolvers | 5.2.2 | Hook-form resolver support. |
| Data fetching | @tanstack/react-query | 5.99.0 | Client-side admin/resident/clinic list queries. |
| HTTP client | axios | 1.15.0 | Shared API client in `lib/axios.ts`. |
| Database ORM | Prisma | 7.7.0 | PostgreSQL schema, migrations, generated client. |
| DB adapter | @prisma/adapter-pg / pg | 7.7.0 / 8.20.0 | Prisma PostgreSQL adapter. |
| Password hashing | bcryptjs | 3.0.3 | Resident and admin password verification. |
| Image storage | Cloudinary | 2.9.0 | Valid ID, profile, announcement, official, blotter, and VAWC image uploads. |
| Email | nodemailer / Resend / React Email | 8.0.5 / 6.12.0 / 1.0.12 | Approval and document email helpers; Resend route exists. |
| PDF | puppeteer | 24.42.0 | Document request PDF rendering. |
| Charts | recharts | 3.8.1 | Admin dashboard charts. |
| State | zustand | 5.0.12 | Installed; usage not verified in current source scan. |

## High-Level Architecture

The app uses the Next.js App Router with route groups:

- `app/(Resident)` contains public and authenticated resident pages.
- `app/(Admin)` contains protected barangay admin pages.
- `app/(Clinic)` contains protected health-worker pages.
- `app/api` contains route handlers for list reads, uploads, bulk operations, and PDF generation.
- `server/actions` contains server actions for mutations and some DB reads.
- `lib` contains sessions, RBAC, Prisma, Cloudinary, document request utilities, PDF helpers, and email helpers.
- `validations` contains Zod schemas shared by forms and server actions.

Prisma connects to PostgreSQL through `@prisma/adapter-pg` and a generated Prisma client under `app/generated/prisma`.

## Actual Folder Structure

```text
/
  app/
    (Admin)/admin/...           Admin UI routes
    (Clinic)/clinic/...         Clinic UI routes
    (Resident)/...              Public and resident routes
    api/...                     Next.js route handlers
    generated/prisma/           Generated Prisma client output
    globals.css                 Tailwind theme and global classes
    layout.tsx                  Root layout and providers
  components/
    document-requests/          Admin and mock document request pages
    providers/                  React Query, resident auth, admin RBAC providers
    sections/                   Public landing page sections
    templates/                  Email templates
    ui/                         Sidebar, footer, navbar, admin and clinic UI
  context/                      AI agent documentation
  lib/                          Sessions, RBAC, Prisma, Cloudinary, APIs, PDFs
  prisma/
    migrations/                 SQL migration history
    schema.prisma               Database schema
    seed.ts                     Seed script
  public/                       Logos, gallery images, static icons
  server/
    actions/                    Server actions
    announcements/              Announcement DB mappers
    officials/                  Official DB mappers
  validations/                  Zod validation schemas
```

## System Boundaries

- `app` should stay focused on routing, layouts, pages, and route handlers.
- `components` contains reusable and page-level UI. Several page-level helper components are colocated in page files.
- `server/actions` performs mutations and selected server reads. Every protected mutation must verify identity and permissions inside the action.
- `lib` contains server-only infrastructure and shared serializers. Files that access secrets or cookies should keep `import "server-only"`.
- `validations` owns Zod schemas and field-error mapping.
- `prisma` owns schema and migrations. Do not edit the generated client directly.

## Data Flow

Resident registration:

```text
/register form -> registerResidentAction -> resident.validation.ts
  -> Cloudinary upload -> bcrypt hash -> Prisma Resident create -> PENDING status
```

Admin access:

```text
/AdminLogin -> loginAdminAction -> createAdminSession
  -> proxy.ts checks /admin paths -> app/(Admin)/layout.tsx session check
  -> page/API/server action permission checks
```

Document request:

```text
resident form -> createResidentDocumentRequestAction
  -> DocumentRequest PENDING -> admin document page
  -> updateAdminDocumentRequestStatusAction -> generateStoredDocumentRequestPdf
  -> sendDocumentRequestPdfEmail
```

Clinic record:

```text
/ClinicLogin -> createHealthWorkerSession
  -> app/(Clinic)/layout.tsx session check
  -> submitMedicalRecordAction/updateMedicalRecordAction
  -> MedicalRecord linked to Resident and Admin health worker
```

## Authentication Architecture

- Resident sessions use `resident_session`, HMAC-signed payload `{ residentId, exp }`, 7-day max age, httpOnly, sameSite lax, secure in production.
- Admin sessions use `admin_session`, HMAC-signed payload `{ adminId, exp, role }`, 7-day max age.
- Clinic sessions use `health_worker_session`, HMAC-signed payload `{ adminId, exp }`, 7-day max age.
- Session secret is `AUTH_SESSION_SECRET` or `SESSION_SECRET`. Development fallback secrets exist; production throws or rejects when missing.
- `getCurrentResidentFromSession` returns only approved residents.
- `getCurrentAdminFromSession` returns only non-health-worker barangay admin roles.
- `getCurrentHealthWorkerFromSession` returns only `AdminRole.HEALTH_WORKER`.

## Authorization Architecture

Primary RBAC is in `lib/rbac.ts`.

| Resource | ADMIN | CLERK | PEACE_AND_ORDER | PUNONG_BARANGAY | SK | HEALTH_WORKER |
| --- | --- | --- | --- | --- | --- | --- |
| dashboard | read/write | no | no | read only | no | no |
| announcements | read/write | read/write | no | read only | read/write | no |
| officials | read/write | read/write | no | read only | no | no |
| residents | read/write | no | no | read only | no | no |
| voters | read/write | read/write | no | read only | no | no |
| documents | read/write | read/write | no | read only | no | no |
| blotter | read/write | no | read/write | read only | no | no |
| health | read/write | no | no | read only | no | clinic-specific |
| vawc | read/write | no | read/write | read only | no | no |
| pets | read/write | no | no | read only | no | no |
| inventory | read/write | no | no | read only | no | no |
| archives | read/write | no | no | read only | no | no |

`proxy.ts` performs optimistic admin route redirects. It must not be treated as the only authorization layer. Server actions and route handlers must use `hasAdminPermission`, `requireAdminPermission`, `forbiddenUnlessAdminCan`, resident ownership checks, or health-worker session checks.

## Database Architecture

Datasource provider is PostgreSQL. Prisma client output is `app/generated/prisma`.

### Models

| Model | Purpose | Important relationships |
| --- | --- | --- |
| `Admin` | Admin and health-worker accounts | Has `role`; checks `MedicalRecord[]`. |
| `Resident` | Resident account and profile | Owns pets, document requests, medical records, filed blotters, inventory distributions. |
| `Official` | Barangay officials | Creates announcements and handles blotters. |
| `Announcement` | Public announcements | Required `createdBy` official. |
| `Pet` | Resident pets | Belongs to resident, cascades on resident delete. |
| `Blotter` | Incident/blotter records | Optional complainant resident, optional handling official, optional VAWC record. |
| `InventoryItem` | Inventory stock item | Has transactions. |
| `InventoryTransaction` | IN/OUT history | Belongs to inventory item, optional resident recipient. |
| `DocumentRequest` | Resident document requests | Belongs to resident, stores details JSON, serial/PDF fields. |
| `Document` | Document type pricing/settings | Unique `documentTypeId`. |
| `MedicalRecord` | Clinic health record | Belongs to patient resident and checking admin, cascades on resident delete. |
| `VawcRecord` | VAWC case record | Optional one-to-one blotter link, status history, schedules. |
| `VawcStatusHistory` | VAWC status audit entries | Cascades on VAWC record delete. |
| `VawcSchedule` | VAWC scheduled follow-ups | Cascades on VAWC record delete. |

### Enums

`AdminRole`, `BlotterStatus`, `TransactionType`, `RequestStatus`, `VerificationStatus`, `VawcStatus`, `AbuseType`, `RelationshipType`, and `ScheduleStatus` are defined in `prisma/schema.prisma`.

### Sensitive Data Boundaries

Sensitive fields include passwords, OTP fields, valid ID images, resident contact and demographic data, medical records, blotter narratives/images, VAWC narratives/images, and document request details. Do not log or expose these broadly.

## Module Architecture

- Authentication: `server/actions/auth.actions.ts`, `lib/*-session.ts`, login pages.
- RBAC: `lib/rbac.ts`, `lib/admin-authorization.ts`, `lib/api-authorization.ts`, `components/providers/admin-rbac-provider.tsx`.
- Residents: resident pages, `server/actions/resident.actions.ts`, resident APIs.
- Documents: `lib/document-request-catalog.ts`, `server/actions/document.actions.ts`, `server/actions/document-settings.actions.ts`, `lib/pdf/*`, document APIs and pages.
- Announcements/officials: mappers in `server/announcements` and `server/officials`, actions and admin pages.
- Blotter/VAWC: `server/actions/blotter.actions.ts`, `server/actions/vawc.actions.ts`, related APIs and admin/resident pages.
- Clinic: `server/actions/clinic.actions.ts`, `lib/clinic-*`, clinic components and APIs.
- Archive: `server/actions/archive.actions.ts` and bulk archive route handlers.
- Inventory/pets: action modules, admin pages, APIs.

## API and Server Actions

Route handlers use `NextResponse` and app route conventions. Important handlers include:

- `/api/residents`, `/api/residents/[id]`, nested resident pets/documents/blotters, profile image upload.
- `/api/documents`, `/api/documents/types`, `/api/document/generate`.
- `/api/announcements`, `/api/officials`, `/api/pets`, `/api/blotter`, `/api/vawc`, `/api/inventory`, `/api/archives`, `/api/dashboard/stats`, `/api/voters`.
- Bulk archive/unarchive endpoints for several modules.
- `/api/clinic/medical-records` and related medical record archive endpoints.

Server actions are all top-level `"use server"` files under `server/actions`.

## File Storage

Cloudinary is configured in `lib/cloudinary.ts`. The default folder is `uploads`; module-specific folders include `residents/valid-id`, `residents/profile-pictures`, `announcements`, `officials/profile`, and `blotters`. Upload validation currently reuses valid-ID image restrictions, so all image upload paths inherit the same type and size constraints.

Document PDFs are generated by `lib/pdf/document-request-delivery.ts` and `lib/pdf/document-request-pdf.tsx`. The storage mechanism records `generatedFileUrl`; verify current delivery behavior before changing PDF retention.

## Deployment Architecture

Required environment variables by code reference:

- `DATABASE_URL`
- `AUTH_SESSION_SECRET` or `SESSION_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
- `NEXT_PUBLIC_APP_URL`, `APP_URL`, or `NEXTAUTH_URL`
- `RESEND_API_KEY` for `/api/send`

Supported scripts: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`, `npm run prisma:generate`, `npm run db:push`, and `npm run db:seed`.

## Architectural Decisions

- Next.js 16 uses `proxy.ts`, not legacy `middleware.ts`. The installed docs state proxy is for pre-request checks and should not be the full authorization solution.
- Prisma 7 generated client is committed under `app/generated/prisma`; imports use `@/app/generated/prisma/client` and `@/app/generated/prisma/enums`.
- The project favors server actions for mutations and route handlers for API-style reads and bulk operations.
- There are three separate session cookies for resident, admin, and health-worker contexts.
- The UI currently mixes tokenized `primary-*` classes with raw Tailwind palette classes. This is an existing inconsistency, not a pattern to expand.
