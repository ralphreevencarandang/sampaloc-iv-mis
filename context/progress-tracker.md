# Sampaloc IV BMIS Progress Tracker

Last updated: 2026-10-26

## Current Status

- Current development phase: Existing BMIS implementation with new AI context documentation baseline.
- Last verified implementation: Local Vercel PDF runtime repair on 2026-10-26. Final production build, standalone TypeScript, focused ESLint, six real Chromium document renders and 14 isolated database lifecycle scenarios passed. Deployment and authenticated production verification remain outstanding.
- Current active feature: Registration name/mobile validation and accessible password visibility implemented and verified. No schema or dependency changes. Previous clinic rollout requirements remain: deploy additive migration `20261018030000_appointment_consultation_start` after the base appointments migration, regenerate Prisma and restart before using the changed appointment queries. Application tables were not changed by this implementation. Authenticated browser and actual SMTP delivery remain rollout checks for those earlier clinic features.
- Next recommended feature: Security and authorization audit of server actions and API route handlers.
- Known blockers: No automated test suite is configured; several sensitive workflows need manual verification in a configured environment.

## Progress Checklist

### Foundation

- [x] Next.js App Router project exists.
- [x] Prisma schema and migration history exist.
- [x] PostgreSQL connection through Prisma adapter exists.
- [x] AI context documentation baseline exists.
- [ ] Automated test suite is not configured.

### Authentication and Authorization

- [x] Resident session flow.
- [x] Admin session flow.
- [x] Health-worker session flow.
- [x] Admin RBAC matrix in code.
- [ ] Complete authorization audit for every server action and route handler.
- [ ] Audit log system.

### Resident Workflows

- [x] Public landing page.
- [x] Resident registration with valid ID image.
- [x] Shared Unicode name validation, Philippine mobile normalization, fixed +63 input and password visibility in public/Admin/Secretary registration; name/phone validation and legacy phone prefilling in resident editing.
- [x] Resident login gated by approval.
- [x] Resident account page.
- [x] Resident document request workflow.
- [x] Unified shared PDF service and processing guidance across form, history, success and document emails; migration applied and development server restarted.
- [x] Resident pet registration.
- [x] Resident blotter filing.
- [ ] Household management. Not verified.

### Admin Workflows

- [x] Dashboard.
- [x] Announcements.
- [x] Officials.
- [x] Resident management and verification.
- [x] Admin/Secretary resident creation from Resident Management with shared registration validation and secure account creation.
- [x] Voters list.
- [x] Document request queues.
- [x] Document pricing management.
- [x] Blotter management.
- [x] VAWC records.
- [x] Pet management.
- [x] Inventory item management.
- [x] Archives and restore workflows.
- [ ] Inventory transaction workflow UI. Not verified.

### Clinic Workflows

- [x] Clinic appointment implementation: Resident Services card, protected booking, My Account history, Clinic/Admin health management, schedule settings, status history and notifications without medical details.
- [x] Walk-In/Appointment medical records, classification filters/summaries, atomic one-consultation-per-appointment completion, same medicine dispensing workflow.
- [ ] Deploy `20261018020000_clinic_appointments`, regenerate Prisma, restart and configure the clinic operating schedule; verify authenticated resident/clinic browser flows and SMTP delivery.

- [x] Health worker login.
- [x] Clinic dashboard.
- [x] Medical records list.
- [x] Medical record create/update/archive/restore.
- [x] Admin health records view.
- [x] Shared inventory medicine selection, transactional dispensing and history; expiry, concurrency and duplicate-submission safeguards verified in an isolated database schema.
- [x] Dedicated read-only `/clinic/medicines` page and sidebar item, name search, stock-status filters, 10-row pagination, color-coded token badges, loading/error/empty states and shared automatic stock refresh. No additional database migration needed for this page.
- [ ] Deploy `20261018000000_clinic_inventory_dispensing`, regenerate Prisma, restart the application, and verify the authenticated browser flow. Existing inventory must be explicitly marked as medicine and assigned an expiry date; historical medicine notes do not trigger deductions.

### Integrations

- [x] Cloudinary image upload helper.
- [x] Nodemailer helper.
- [x] PDF generation helper.
- [ ] Resend route production usage. Not verified.
- [ ] SMS or push notifications. Not implemented.
- [ ] Payment gateway verification. Not implemented.

## Completed Features

- Created/updated `AGENTS.md`.
- Created/updated `context/project-overview.md`.
- Created/updated `context/architecture.md`.
- Created/updated `context/ui-tokens.md`.
- Created/updated `context/ui-rules.md`.
- Created/updated `context/ui-registry.md`.
- Created/updated `context/code-standards.md`.
- Created/updated `context/library-docs.md`.
- Created/updated `context/build-plan.md`.
- Created/updated `context/progress-tracker.md`.

## In-Progress Features

Clinic appointments are implemented and verified in source and synthetic database schemas. The new migration is not applied to application tables. Existing medical records retain data and default to WALK_IN because there was no prior appointment model/link. Clinic settings start unconfigured and booking stays closed until staff save an enabled operating schedule. Pending/Confirmed consume capacity and count as the resident’s one active booking. Status changes, actor identity and cancellation/rejection reasons are retained; appointment consultation save completes the appointment and creates a unique linked record atomically. Authentication, ownership and existing health RBAC protect every new entry point. The application rollout must apply both appointment migrations, including `20261018030000_appointment_consultation_start`, before serving the changed queries.


Unified PDF persistence is activated: after user confirmation, applied `20261018010000_shared_document_pdf`, regenerated Prisma and restarted the development server on 2026-10-18. Both download failures were caused by absent PDF storage/lease columns; all three columns now exist and the previously failing column selection succeeds. All 32 migrations are applied. The additive migration preserves existing rows and adds private PDF bytes/lease metadata plus immutable serial/PDF guards. All 18 focused checks passed again, including real Chromium rendering of six document types. Unauthenticated resident/admin PDF requests return 401/403. Prior production build, TypeScript and all 14 isolated PostgreSQL scenarios plus parent passed. Authenticated browser downloads and actual SMTP delivery remain manual checks; no real document was generated or email sent during recovery. Older pending-migration notes below are historical.

Follow-up consolidation: `REJECTED` is now the only unsuccessful terminal document outcome. Migration `20261016010000_merge_cancelled_document_requests` preserves existing cancelled records by converting their status to REJECTED and retaining timestamps. Apply both pending document migrations with `npx prisma migrate deploy`, regenerate the client, and restart the application; application tables have not been migrated by the agent.

Document migration `20261016000000_document_request_eligibility` is prepared and tested in an isolated PostgreSQL schema; it has not been applied to application tables. Deploy it with `npx prisma migrate deploy`, regenerate the client, and restart the application. Existing duplicate active records are retained and prevent additional requests until closed; legacy duplicate Job Seeker records cannot both be newly issued. An older migration mapped REJECTED to REVIEW and RELEASED to APPROVED; retained release timestamps preserve issuance, but lost historical rejection statuses cannot be reconstructed automatically.

The configured database reports all 28 migrations applied as of 2026-10-16. Verify a real Cloudinary-backed submission and login notice after the Prisma cache recovery; no real resident registration was submitted by the agent.

## Known Issues

- Existing UI uses raw Tailwind color classes and at least one hardcoded chart color array despite the project rule against new hardcoded colors.
- No test script exists beyond lint/build.
- VAWC records, medical records, resident identity images, and document request details require careful access review.
- Barangay ID admin document page exists, but active document catalog entry is commented out.
- `InventoryTransaction` model exists, but transaction workflow UI was not verified.
- Clinic medical record action maps `notes` into both `symptoms` and `treatment`; business correctness requires confirmation.
- `.env`, `.env.local`, and a credentials text file exist in the workspace. Their values were not read into documentation and should not be exposed.

## Decisions Made During Build

| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-10-18 | Clinic Medicines route/page, sidebar, shared query options, semantic CSS tokens, focused tests and context | Added a dedicated read-only list using the existing medicine inventory API and query key. Includes search/status filters, pagination, expiry/stock display, safe stale-data warnings, retry/manual refresh, 15-second polling and focus refresh. Dispensing remains in patient medical records; existing Admin-only inventory writes are unchanged. |
| 2026-10-11 | Treat existing source code as the source of truth for documentation. | The supplied request explicitly warned that example docs came from a different app. |
| 2026-10-11 | Mark unsupported or insufficiently verified items as partial, proposed, unknown, or requiring confirmation. | Avoids claiming completion without evidence. |
| 2026-10-11 | Preserve existing archive field names `isArchive` and `isArchived` in documentation. | They are both present in the Prisma schema and source code. |

## Changes Made

| Date | Files | Summary |
| --- | --- | --- |
| 2026-10-18 | Application database migration, generated Prisma client, development server and progress tracker | Recovered Admin/Resident download failures by applying the user-confirmed pending PDF migration, regenerating Prisma and restarting the project server. Confirmed the application's database now exposes all required PDF fields; no source workaround or request status changes were needed. |
| 2026-10-18 | Shared PDF delivery/storage helpers, Prisma additive migration/cache guard, Admin/Resident endpoints/client, two PDF templates, document actions/emails, reusable notice, tests and context | Unified Admin generation, Resident downloads and manual-ready emails around one stored PDF/immutable serial. Short resident/year-lock transactions reserve serials once; UUID leases coordinate rendering outside transactions, fenced persistence and retry recovery. Status remains APPROVED; generated/released timestamps retain issuance and Job Seeker safeguards. Stored PDFs never rerender; trusted legacy references import once and missing files fail safely. Serial labels added to Indigency and Job Seeker templates. Shared 24-working-hour notice appears before submission, in history/success and confirmation/status/manual-ready emails. New confirmation/status mail runs through Next.js after committed changes; unchanged statuses skip duplicate notifications. |
| 2026-10-18 | Existing resident download endpoint, shared PDF delivery/client, regression tests and context | Corrected resident downloads calling Admin issuance: the first download previously marked GENERATED and subsequent attempts failed approval validation. The endpoint now renders read-only using authoritative request/type/resident fields, checks ownership/approval before and after rendering, and leaves all request fields unchanged. Repeated downloads preserve APPROVED and the button across refreshed sessions. Existing serials are reused; unissued PDFs have no fabricated issuance serial. Existing GENERATED records are not reset. Client errors retain server messages with a safe download-specific fallback. Admin issuance/email behavior is unchanged. |
| 2026-10-18 | Resident account history, resident PDF download API, shared PDF delivery/client, admin document menu and UI context | Added an approved-only download column and icon/spinner with safe errors and history refresh. Session-derived ownership and active resident filtering protect PDF generation; approval/ownership are rechecked under the issuance lock. Existing templates, serial numbers and Job Seeker issuance safeguards are reused. Download records GENERATED, after which the strict status rule displays Not Available. Added shared Reject XCircle without altering rejection behavior. No schema/dependency changes. |
| 2026-10-18 | Pet admin/resident forms and validation, admin pet/VAWC/blotter dashboards, UI registry and progress tracker | Standardized pet registration to Dog/Cat/Bird/Fish/Other with required custom type handling, preserving existing free-text Pet.type records and preloading legacy values as Other during admin edits. Dashboard cards explicitly exclude archived records; pet types compare case-insensitively. VAWC labels match VawcStatus; blotter cards use only OPEN and RESOLVED. |
| 2026-10-18 | Admin resident creation modal, resident registration action, RBAC, and UI context | Added Admin/Secretary (`CLERK`) resident creation using the public registration schema, ID upload checks, hashed account password, existing Resident model, duplicate email/ID checks, and PENDING approval. Secretary can read the resident list and create residents; existing edit/archive controls remain Admin-only. |
| 2026-10-18 | VAWC, blotter and pets admin pages; `SummaryDashboardCards`; UI registry; progress tracker | Added responsive active-record summary cards above each existing table, derived from the pages' authorized list queries and refreshed through existing React Query invalidations. Blotter's Prisma status enum only has OPEN and RESOLVED, so OPEN contributes to Ongoing while Pending remains zero unless a pending status exists in returned records. Pet records use free-text type; Dog and Cat match case-insensitively and remaining types count as Other. |
| 2026-10-18 | Prisma inventory/transaction relations and migration; medicine policy/transaction helper; dispensing action and clinic APIs; Admin inventory and Clinic UI; focused tests; context | Reused InventoryItem as stock source and InventoryTransaction OUT entries as dispensing history. Added medicine flag, expiry and stock version; authenticated health-worker dispensing with atomic stock/history writes, stable retry keys and sorted row locks; protected admin edits against stale stock. Clinical edits preserve historical medicines and cannot change the patient after dispensing. Stock refetches every 15 seconds and on focus. No new dependencies. |
| 2026-10-16 | Document action/status type, admin document UI, Prisma schema/follow-up migration, focused tests, context | Consolidated duplicate Reject/Cancel behavior into Reject request at the user's request; removed CANCELLED from accepted mutations, filters, badges, and the final database enum. Existing cancelled requests migrate to REJECTED without deleting history. |
| 2026-10-16 | Document actions, policy/lock helpers, validation, PDF delivery, request APIs/serializer, resident/admin document UI, Prisma schema/migration, tests, context | Enforced free single-copy Job Seeker requests and permanent issuance history; serialized eligibility checks/creation/status transitions using a resident row lock; added rejected/cancelled outcomes, exact feedback and history links. Archive visibility is not part of eligibility. |
| 2026-10-16 | Local Next.js development cache (no application source changes) | Diagnosed `/Login` 404: stale dev manifest listed lowercase `login`, despite uppercase source folder and correct production manifest. Restart alone did not persist; stopped the project dev server, preserved `.next/dev` under `.next/dev-recovery-*`, and restarted on port 3000 with a fresh cache. |
| 2026-10-16 | Registration redirect, login page, auth action, registration test, UI registry | Removed `?registered=1` from navigation. A 60-second HttpOnly cookie scoped to `/Login` carries the fixed registration success notice without creating an authenticated session. |
| 2026-10-16 | `lib/prisma.ts`, `tests/prisma-cache.test.ts` | Fixed development hot-reload reuse of a client generated before resident ID fields existed. Cached resident scalar fields must match the current generated field enum before reuse. |
| 2026-10-15 | Registration/login pages, `lib/resident-registration.ts`, auth validation, resident action, Prisma schema/migration, focused tests, UI registry | Added login success redirect without session creation; required ID metadata with conditional Other field; shared calendar age and voting controls. Existing residents retain nullable ID metadata. |
| 2026-10-11 | `AGENTS.md`, `context/*.md` | Built the documentation system for future AI coding agents. |

## Verification History

| Date | Check | Result |
| --- | --- | --- |
| 2026-10-18 | Download recovery: migration deploy, Prisma generation, database column/query probe, HTTP authorization and focused PDF tests | Passed: all 32 migrations applied; all three PDF fields present in the database loaded with the application's `.env.local`/`.env` precedence; empty-result PDF column selection succeeds; resident/admin endpoints return 401/403 without authentication. All 18 focused tests pass, including actual Chromium rendering for six document types. Initial sandboxed rendering was blocked by browser process launch permissions; approved execution outside the sandbox passed. Authenticated browser downloads were not exercised. |
| 2026-10-18 | Unified PDF: source Prisma generation, TypeScript, production build, focused ESLint, real PDF/UI/email/storage tests and isolated database suite | Passed. 18 checks cover shared endpoint authorization/bytes/serials/status, reusable notices in UI and five document email variants, safe legacy-reference imports, cache refresh, template serial substitution and actual Chromium PDF bytes/page counts for all six types. All 14 PostgreSQL scenarios plus parent passed: existing eligibility rules, both generation orders, reprints after resident edits, eight simultaneous mixed-role requests rendering once, unique numeric serials above 9999, failures/expired leases, DB immutability, old/missing files, and after-commit notification hooks skipping unchanged statuses. Additional targeted preservation test passed with an existing legacy PDF/serial/date/status. Synthetic schemas were cleaned up; no application records or actual email delivery were used. |
| 2026-10-18 | Unified PDF: full source lint and migration status | Source lint excluding generated Prisma files reports the same 5 unrelated baseline errors and 25 warnings; focused feature lint has no errors and three existing unused admin review-control warnings. Migration status confirms only `20261018010000_shared_document_pdf` is pending; all 31 earlier migrations are applied. The new migration was not applied to application tables. |
| 2026-10-18 | Unified PDF: diagnostic test iterations | Initial database run exposed a missing text cast on the advisory-lock result (corrected). The temporary Resident fixture needed the real VerificationStatus enum; the test pool then experienced a connection termination during a long run. Bounded test query timeouts and dedicated tagged-schema cleanup allowed the full rerun to pass. A direct-pg fixture timestamp was changed to a UTC string to avoid local timezone conversion. All synthetic schemas left during interrupted runs were explicitly removed after verifying their test-only contents. These fixes do not bypass authorization or alter existing document records. |
| 2026-10-18 | Repeatable resident PDF download: 15 tests including real Chromium PDFs, production build, focused ESLint and whitespace check | Passed. Verified repeated read-only downloads for five active document types plus legacy Barangay ID, stored/missing serials, sign-out/sign-in, exact request-ID payload, safe JSON/blob errors, pre/post-render ownership/approval checks, unchanged request fields and rendered approved-only buttons. Real Chromium produced valid PDF bytes for all six types using synthetic data. Download requests allow 60 seconds for PDF rendering without changing the shared API timeout. Admin issuance remains separate. Full source lint was stopped after a prolonged run without diagnostics; no full-lint pass is claimed. Initial concurrent real-PDF run hit its 120-second test limit; the isolated rerun with per-type reporting completed in about one minute. No application database writes or live resident-account submissions were performed. |
| 2026-10-18 | Resident document download: 7 focused tests, production build, focused ESLint and whitespace check | Passed. Tests cover session/body rejection, ownership, archived residents, all request statuses, rejection during rendering, attachment headers, issuance, rendered responsive account history and existing template substitution for all five active document types. Focused ESLint has no errors and three existing unused review-control warnings. Full-project lint was stopped after a prolonged run without diagnostics; no full-lint pass is claimed. PDF bytes/browser are mocked in focused tests; no authenticated browser download or application database writes were performed. |
| 2026-10-18 | Dedicated Medicines page: 8 focused tests, TypeScript `--noEmit`, focused ESLint, production build and whitespace check | Passed. Four new page/query tests cover read-only inventory, badges/expiry, combined search/status filtering, 10-row pagination, refresh shrinkage, loading/error/stale/empty states and the shared no-store query. Existing dispensing UI and clinic API authorization regression tests also passed. Build includes `/clinic/medicines` and 66 generated pages. Generated CSS verified to include semantic stock tokens and palette references. |
| 2026-10-18 | Dedicated Medicines page: local production HTTP access checks | Unauthenticated `/clinic/medicines` returned 307 to `/ClinicLogin`; `/api/clinic/medicines` returned 401. Temporary server stopped after checks. No authenticated browser session or application database writes were used. |
| 2026-10-18 | Dedicated Medicines page: `npm run lint` | Same 6 existing errors and 25 warnings in unrelated files; focused new/changed UI and query files have no diagnostics. |
| 2026-10-18 | Clinic/inventory: policy, rendered UI, authorization and Prisma cache tests | 8 focused tests passed across `medicine-dispensing.test.ts`, `medicine-dispensing-ui.test.ts`, `medicine-dispensing-authorization.test.ts`, and `prisma-cache.test.ts`. UI checks use rendered components, not a live authenticated browser. |
| 2026-10-18 | `RUN_MEDICINE_DB_TESTS=1 node --import tsx --test tests/medicine-dispensing-database.test.ts` | 10 PostgreSQL scenarios plus parent passed. Covers migration preservation, multiple medicines, rollback, missing/expired/archived/non-medicine stock, eight concurrent retries, competing consultations, stale admin updates, clinical edits/archive, actor/patient identity, and DB constraints. Synthetic schema removed afterward. Initial sandbox DNS failure required network-approved execution; an initial edit test exposed the default transaction timeout, corrected with explicit 15-second bounds. Application tables were not migrated or mutated. |
| 2026-10-18 | Prisma generation, TypeScript `--noEmit`, `npm run build` | Passed; production build includes 65 generated pages and both new clinic APIs. Apply the additive migration before serving the changed app against the application database. |
| 2026-10-18 | `npm run lint` | Same 6 baseline errors in untouched files; 25 warnings (previously 26). No new feature errors. |
| 2026-10-18 | Focused ESLint and final `git diff --check` | Passed. The initial inventory-form `watch` warning was removed by using `useWatch`; changed feature files have no remaining lint diagnostics. UI patterns captured with imprint; review found no remaining implementation gaps, with migration deployment/live browser checks still pending. |
| 2026-10-18 | Admin resident creation: TypeScript, focused ESLint, production build, full lint, and diff check | TypeScript, focused ESLint, production build (66 pages), and `git diff --check` passed. Full lint remains failing with 5 existing errors in untouched ResidentContactUs, ResidentHero, EditDocumentPriceModal, and OfficialModalForm files; 26 warnings. No database schema changes or live account submissions were made. |
| 2026-10-16 | Rejected-only consolidation: policy/UI tests, isolated PostgreSQL suite, production build, focused ESLint, diff check | All 4 policy/UI tests and 8 database subtests plus parent passed. Verified cancelled-record conversion preserves release timestamps and the final enum rejects CANCELLED; retries and concurrent issuance protections remain intact. Build and diff check passed; focused ESLint has no errors and 3 pre-existing warnings. Both migrations remain unapplied to application tables. |
| 2026-10-16 | Document rules: `npm run build`, focused ESLint, `git diff --check` | Production build passed, including TypeScript and all 64 pages. Focused ESLint has no errors (three pre-existing unused review-control props in the admin document component). Diff whitespace check passed. UI verification used rendered-component tests, not a live authenticated browser session. |
| 2026-10-16 | `node --import tsx --test tests/document-request-policy.test.ts` | 4 tests passed: free pricing/copy validation, rendered resident form behavior, active per-type restrictions, and permanent/legacy issuance checks. |
| 2026-10-16 | `RUN_DOCUMENT_DB_TESTS=1 node --import tsx --test tests/document-request-database.test.ts` | 8 PostgreSQL subtests plus parent passed in a temporary schema, cleaned up afterward. Verified migration/data preservation and fee constraints, authenticated identity, eight concurrent submissions producing one active request, different types, unsuccessful retries, archive-independent checks, legacy release history, competing Job Seeker issuance, and cancellation during rendering. PDF bytes/email were mocked; real database transactions and application action/delivery logic were exercised. Initial stress run exposed the default transaction wait limit; explicit 15-second wait/transaction bounds fixed the rerun. |
| 2026-10-16 | Prisma generation and TypeScript `--noEmit` | Passed for document eligibility changes. |
| 2026-10-16 | `npm run lint` | Same baseline 6 errors and 26 warnings; errors remain in untouched pet registration, ResidentContactUs, ResidentHero, EditDocumentPriceModal, and OfficialModalForm. |
| 2026-10-16 | Live HTTP verification after dev cache recovery | `/Login` returned 200 with the login form; repeated request with `resident_registration_success=1` returned 200 and the exact success message. No resident session cookie set. Fresh dev manifest correctly lists `/(Resident)/Login/page`. No new production build needed for this cache-only recovery. |
| 2026-10-16 | Clean login redirect correction: six focused tests, TypeScript `--noEmit`, focused ESLint | All passed. Updated navigation assertion requires exactly `/Login`. |
| 2026-10-16 | `npx prisma migrate status` | All 28 migrations applied. Initial sandbox check returned a schema-engine error; network-approved retry succeeded. No database mutation performed. |
| 2026-10-16 | `node --import tsx --test tests/prisma-cache.test.ts tests/resident-registration.test.ts` | All 6 tests passed, including stale-client replacement and reuse of a current client. |
| 2026-10-16 | Prisma generation, TypeScript `--noEmit`, focused ESLint on `lib/prisma.ts` and cache regression test | All passed. No full production rebuild or live resident registration was performed for this targeted cache fix. |
| 2026-10-15 | `node --import tsx --test tests/resident-registration.test.ts` | 5 tests passed: birthdays including exactly 15, UI state transitions and success-only navigation, ID requirements, upload restrictions, and mocked action persistence without session dependencies. Live Cloudinary/database operations were not performed. |
| 2026-10-15 | `npx prisma generate` | Passed; generated Prisma 7.7.0 client. Migration `20261015000000_add_resident_id_details` is prepared and has not been applied to a database. |
| 2026-10-15 | `npm run build`, `node node_modules/typescript/bin/tsc --noEmit` | Passed. Production bundle, page generation, and TypeScript checks completed. |
| 2026-10-15 | Focused ESLint on changed registration/login code and the test file | Passed without diagnostics. |
| 2026-10-15 | `npm run lint` | Failed with 6 errors and 26 warnings in untouched files. Errors: unescaped JSX in pet registration, ResidentContactUs, ResidentHero; synchronous effect state updates in EditDocumentPriceModal and OfficialModalForm. No diagnostics in registration changes. |
| 2026-10-11 | Repository scan with `rg --files` | Confirmed app, components, lib, server, validations, prisma, public, and context structure. |
| 2026-10-11 | Package inspection with `npm list --depth=0` | Confirmed installed versions for core dependencies. |
| 2026-10-11 | Prisma schema review | Confirmed models, enums, relationships, and generated client output path. |
| 2026-10-11 | Next.js installed docs review | Confirmed App Router, route handlers, server actions, and `proxy.ts` conventions for Next.js 16. |
| 2026-10-11 | Source scan for auth/RBAC/session usage | Confirmed three session systems and role-resource matrix. |

## Next Steps

Recommended next task: audit every server action and route handler for direct-call authorization gaps, then patch missing checks and run `npm run lint` plus `npm run build`.

## Clinic Appointment Verification — 2026-10-18

- Prisma generation, schema validation, standalone TypeScript check and final production build passed. Build includes all 71 generated pages and the new Resident/Clinic/Admin routes and APIs. Final whitespace check passed.
- Nine policy/UI/API/action/email tests passed: Manila boundary and unavailable-slot generation; transition/cancellation/finalization restrictions; schema validation; owner-only private/no-store APIs; staff write checks; notification-after-commit hooks; email queries excluding medical details; rendered summaries, today queue, pagination and read-only/loading/stale/error/empty states.
- Appointment database suite: all 11 scenarios plus parent passed using a random temporary PostgreSQL schema, removed afterward. Verified migration/legacy medicines, no seeded schedule, capacity two under eight competing residents, one-active across concurrent retries/different slots, ownership and cancellation/rejection history, schedule-version/overlap rules, inactive/archived/past/invalid bookings, walk-in creation, pending/future consultation rejection, exactly one linked consultation and one completion history under eight simultaneous saves, rollback on failure, identity/visit immutability, archive persistence and elapsed-time no-show constraints.
- Final combined focused run: all 17 tests passed (nine appointment policy/UI/API/action/email checks, seven existing medicine policy/UI/authorization regressions and Prisma cache regression). Final medicine database suite: all 11 scenarios plus parent passed after applying the appointment migration in its synthetic schema, including appointment-linked dispensing, archive/restore and stock/history preservation. Both database suites cleaned up their synthetic schemas.
- Source-wide lint excluding generated Prisma files reports the same five baseline errors and 25 warnings in unrelated/pre-existing code. Focused changed-source lint has no errors and the two existing unused React-hook imports in ResidentServices. No full lint pass is claimed.
- Initial database execution could not resolve the database host in the sandbox; network-approved isolated execution succeeded. The first appointment database run exposed only a synthetic fixture selecting absent Resident columns; explicit fixture selects corrected it and the full rerun passed. Initial UI test Link mock required the correct CommonJS shape; corrected rendered tests passed. No application tables, resident accounts or actual emails were changed.

- Local production HTTP access checks passed: `/clinic-appointment`, `/clinic/appointments`, and `/admin/health/appointments` return 307 to their respective login pages; both appointment list modes and availability return 401 unauthenticated. Sandbox-local networking initially blocked access; approved execution starting/checking/stopping the temporary server together succeeded. Temporary servers were stopped. No authenticated browser flow or live SMTP was exercised.
- Imprint captured all new component patterns in ui-registry.md. Final review: plan alignment and system integrity pass; production activation requires migration deployment, Prisma regeneration/restart, an explicitly configured schedule, and authenticated browser/SMTP verification. Existing unrelated lint errors remain. See clinic-appointments-review.md.

## Medicine Combobox & Early Consultation Verification — 2026-10-18

- Replaced the expanding inventory chooser with a name-searchable, bounded Shadcn Base UI combobox; option labels show medicine name, available quantity and unit. Expired and selected medicines are excluded. Empty stock and missing expiry are disabled. Multi-medicine selection is keyed by inventory ID, with separate quantity/removal controls. Invalidated selections remain visible to clear; stable retry keys and existing server stock transactions are unchanged.
- CONFIRMED appointments now start regardless of scheduled date/time through an authenticated, Zod-validated server action. One canonical actual start/time/actor and audit entry are stored; simultaneous starts resume that same resource. The schedule is preserved and shown beside actual start. Appointment status stays CONFIRMED until the existing clinical save finalizes one linked MedicalRecord in the same transaction as COMPLETED. Closing allows resume. Pending/terminal appointments cannot start, direct saves without starting fail, and no-show after a start is blocked.
- Added only two nullable ClinicAppointment start fields and a metadata pair/immutability guard in follow-up migration `20261018030000_appointment_consultation_start`. Legacy completion records keep unknown start metadata null. MedicalRecord.date uses actual start for newly finalized appointment consultations. Prisma hot-reload checks now cover the appointment scalar fields. No application migration was applied.
- User approved adding Shadcn primitives after repository inspection found none installed. Added `@base-ui/react` 1.9.0 with its lockfile entries and small MIS-token wrappers; no global theme replacement or unrelated UI dependencies.
- Passed: Prisma generation/validation; standalone TypeScript and final production build (71 pages); focused changed-source ESLint without diagnostics; all 20 focused policy/UI/action/API/privacy/medicine/cache tests; real Chromium keyboard search/selection, disabled-stock, no-expired-option, multi-medicine, duplicate prevention, scroll and 390px mobile/touch checks using synthetic medicines.
- Appointment PostgreSQL suite: all 12 scenarios plus parent passed, including original booking constraints, tomorrow's early consultation, one canonical timestamp under eight simultaneous starts, exactly one finalized consultation under eight simultaneous saves, preserved schedule/actual time, pending/terminal rejection, immutable metadata and completion rollback. The first stress run exceeded the old 15-second transaction limit; bounded 30-second wait/execution limits corrected the rerun. The full suite took roughly four minutes against the remote synthetic schema.
- Medicine PostgreSQL suite: all 11 scenarios plus parent passed with the new migration, preserving atomic deductions, capacity/stock checks, stable retries, history, identity, edits/archive and appointment-linked dispensing. Both synthetic schemas were removed. Application records and actual emails were untouched.
- Source-wide lint excluding generated Prisma retains the same five pre-existing errors and 25 warnings. No project-wide lint pass is claimed. Initial npm registry attempts stalled; approved installation with bounded registry timeouts completed. Browser fixture iterations corrected Puppeteer keyboard shortcut syntax, document reloading during mobile emulation and an open/close gesture race; final Chromium checks passed without browser errors.
- Imprint updated ui-registry.md. Final review: approved scope and system integrity pass; rollout still requires migrations/regeneration/restart and live authenticated application verification. Existing memory.md working changes were untouched.

## Registration Validation and Password Visibility — 2026-10-26

- Shared resident Zod fields validate first/middle/last names using Unicode letters/combining marks, spaces, hyphens and apostrophes, normalize NFC and trim/collapse whitespace. Optional middle names remain optional. Invalid names display `Name must contain letters only.` on create and edit. All existing public/Admin create and Admin update actions already parse these schemas before persistence, so validation and normalization apply on the server too.
- Both create forms use React Hook Form's Zod resolver with their existing controlled state; submit callbacks receive normalized schema output. Existing ID uploads, age/voter rules, credentials policy, duplicate checks and authorization remain intact. Middle-name errors now display in public and edit forms. Edit server field errors bind back to RHF fields.
- Shared `PasswordInput` defaults to hidden, uses independent Lucide Eye/EyeOff toggles, semantic non-submit buttons, accessible Show/Hide labels/pressed state, visible keyboard focus and 44px touch targets. Strength and confirmation checks are unchanged.
- Shared `PhilippineMobileInput` shows a fixed +63, a numeric keyboard and ten-digit maximum; input sanitization removes nondigits and caps length. Zod requires a national number starting with 9 and persists +639XXXXXXXXX. Common existing local/international phone formats are recognized for edits and valid full-number paste. Invalid historical values require correction when saved; existing rows are not bulk migrated.
- Verification passed: `npm run build` (71 pages with TypeScript), 10 focused tests across `resident-registration.test.ts` and `resident-validation.test.ts`, focused ESLint for all changed feature source/tests, and `git diff --check`. Tests cover Unicode/separators/whitespace, all three name fields, valid/invalid/legacy phone formats, password policy and mismatch, registration server rejection before writes, normalized persistence, existing ID/age/voter controls and success-only login navigation.
- Real Chromium fixture passed for all three forms at desktop and 390px mobile/touch widths using the actual components, React Hook Form and Zod. Checked invalid-name/mobile feedback, digits/max length, fixed prefix, legacy edit prefill, hidden-by-default independent password toggles, keyboard/touch interaction, normalized captured submissions and no horizontal overflow/browser errors. Synthetic actions prevent live account writes, uploads and email. Browser launch required approved execution outside the sandbox. Fixture iterations corrected module resolution, ID-before-number ordering and TanStack's additional mutation context argument; no production workaround was needed.
- Source-wide lint (`npm run lint -- --ignore-pattern 'app/generated/**'`) still reports the same five baseline errors and 25 warnings in unrelated existing files. No full-lint pass is claimed. No database, dependency, route or authentication changes. Existing working changes to `lib/appointment-email.ts` and `lib/nodemailer.ts` were preserved.
- Imprint recorded the shared input patterns in `ui-registry.md`. Final review: requested scope, architecture/security boundaries and design-token requirements pass; no remaining feature issues identified. Authenticated live-account submission was not performed.

## Vercel Document PDF Repair — 2026-10-26

- User reported both PDF endpoints failing on Vercel and invoked recover. Diagnosis/targeted dependency changes were explicitly approved with "proceed". No prior Vercel fixes were reported. Existing PDF traces included all templates but no Chrome binary; the empty-cache launcher reproduced missing Chrome 147. The supplied logs contain only generic catches, so the exact production exception remains unknown.
- Added approved Chromium-min 147.0.0 and explicit Puppeteer Core 24.42.0. A pinned, SHA-256-verified x64/arm64 pack is downloaded at npm prebuild on Vercel; `.chromium/` is ignored by Git and explicitly included in relevant function traces. Chromium/fonts/library compressed assets are extracted only for runtime browser execution. Local/non-Vercel execution retains Puppeteer. Browser preparation is shared across simultaneous cold-start requests; failed preparation can retry.
- Both API routes, shared renderer and shared persistence path now emit safe operation/stage/error categories without raw resident data or Prisma errors. Rendering/browser-close failures preserve useful classifications. Storage, serial numbers, approval status, ownership checks, database schema and generation leases remain intact. No PDF files are saved in the ephemeral filesystem.
- Passed: pinned-pack download/checksum/extraction; 14 focused policy/runtime/template/client/notice/privacy checks; actual Chromium rendering of six document types (11 checks including parent and endpoint/UI checks); all 14 isolated PostgreSQL lifecycle scenarios plus parent, including Admin-first/Resident-first, eight mixed-role concurrent requests rendering once, repeat/refresh-equivalent fresh calls, retained bytes/serials/status, failed/expired generation retries and legacy artifacts. Temporary database schema was removed by the suite. No application records or email were changed.
- Final production build (71 pages), standalone TypeScript, focused ESLint without diagnostics and whitespace checks passed after all source changes. Final traces contain four Chromium/font/library assets and all three templates in both PDF endpoints (about 95 MiB each) and the Admin Indigency page/action (about 97 MiB). The existing account-history test fixture was updated for its appointment-component import; an earlier registration-test fixture needed explicit Record typing for standalone TypeScript.
- Vercel deployment/authenticated verification is outstanding. No Vercel connector or CLI project binding was available. User agreed to make connection/test sessions available, but no connection was confirmed. Computer Use stopped because it could not determine the Windows browser URL with policy-required confidence; no further UI interaction was attempted in that turn. Local Linux execution was unavailable (Docker daemon not running; WSL access denied). Do not claim the Vercel runtime is fixed without a successful deployment and real Admin/Resident endpoint verification.
- Existing unrelated working changes, including registration UI, appointment-email.ts and nodemailer.ts, were preserved. Deployment must use npm run build, existing database/auth environment configuration and the already-required shared PDF migration; no new environment variables are required.

## Hydration Warning Investigation — 2026-10-26

- User provided React's generic hydration-attribute warning without a page or mismatch/component trace. Requested the affected URL and expanded plus/minus attribute comparison. No speculative rendering changes or additional suppression were applied.
- Inspected the shared layout/providers, new registration controls and render-time browser/date/locale usage. Root html/body already have hydration suppression; the new password control starts deterministically hidden. Source contains locale-dependent date formatting, but that alone does not identify the reported attribute mismatch.
- Clean headless Chromium checks against production `/`, `/register`, `/Login`, `/AdminLogin` and `/ClinicLogin` returned HTTP 200 with no hydration/page errors observed. Production React may omit development diagnostics; these checks do not establish that signed-in pages or extension-modified browsers are unaffected. User subsequently reported the warning disappeared after reloading. No hydration code changes were made; if it recurs, capture the specific page/component/attribute mismatch before choosing a fix.
