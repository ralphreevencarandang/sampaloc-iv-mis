# Sampaloc IV BMIS Progress Tracker

Last updated: 2026-10-18

## Current Status

- Current development phase: Existing BMIS implementation with new AI context documentation baseline.
- Last verified implementation: Dedicated Clinic Medicines page added on 2026-10-18, reusing the shared medicine API/query. The earlier stock-dispensing integration is also verified with isolated PostgreSQL tests.
- Current active feature: Clinic/inventory integration is implemented; application migration and authenticated browser verification remain deployment steps. Earlier document migrations were also previously recorded as pending; verify current migration status before deployment.
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
- [x] Resident login gated by approval.
- [x] Resident account page.
- [x] Resident document request workflow.
- [x] Resident pet registration.
- [x] Resident blotter filing.
- [ ] Household management. Not verified.

### Admin Workflows

- [x] Dashboard.
- [x] Announcements.
- [x] Officials.
- [x] Resident management and verification.
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
| 2026-10-18 | Pet admin/resident forms and validation, admin pet/VAWC/blotter dashboards, UI registry and progress tracker | Standardized pet registration to Dog/Cat/Bird/Fish/Other with required custom type handling, preserving existing free-text Pet.type records and preloading legacy values as Other during admin edits. Dashboard cards explicitly exclude archived records; pet types compare case-insensitively. VAWC labels match VawcStatus; blotter cards use only OPEN and RESOLVED. |
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
| 2026-10-18 | Dedicated Medicines page: 8 focused tests, TypeScript `--noEmit`, focused ESLint, production build and whitespace check | Passed. Four new page/query tests cover read-only inventory, badges/expiry, combined search/status filtering, 10-row pagination, refresh shrinkage, loading/error/stale/empty states and the shared no-store query. Existing dispensing UI and clinic API authorization regression tests also passed. Build includes `/clinic/medicines` and 66 generated pages. Generated CSS verified to include semantic stock tokens and palette references. |
| 2026-10-18 | Dedicated Medicines page: local production HTTP access checks | Unauthenticated `/clinic/medicines` returned 307 to `/ClinicLogin`; `/api/clinic/medicines` returned 401. Temporary server stopped after checks. No authenticated browser session or application database writes were used. |
| 2026-10-18 | Dedicated Medicines page: `npm run lint` | Same 6 existing errors and 25 warnings in unrelated files; focused new/changed UI and query files have no diagnostics. |
| 2026-10-18 | Clinic/inventory: policy, rendered UI, authorization and Prisma cache tests | 8 focused tests passed across `medicine-dispensing.test.ts`, `medicine-dispensing-ui.test.ts`, `medicine-dispensing-authorization.test.ts`, and `prisma-cache.test.ts`. UI checks use rendered components, not a live authenticated browser. |
| 2026-10-18 | `RUN_MEDICINE_DB_TESTS=1 node --import tsx --test tests/medicine-dispensing-database.test.ts` | 10 PostgreSQL scenarios plus parent passed. Covers migration preservation, multiple medicines, rollback, missing/expired/archived/non-medicine stock, eight concurrent retries, competing consultations, stale admin updates, clinical edits/archive, actor/patient identity, and DB constraints. Synthetic schema removed afterward. Initial sandbox DNS failure required network-approved execution; an initial edit test exposed the default transaction timeout, corrected with explicit 15-second bounds. Application tables were not migrated or mutated. |
| 2026-10-18 | Prisma generation, TypeScript `--noEmit`, `npm run build` | Passed; production build includes 65 generated pages and both new clinic APIs. Apply the additive migration before serving the changed app against the application database. |
| 2026-10-18 | `npm run lint` | Same 6 baseline errors in untouched files; 25 warnings (previously 26). No new feature errors. |
| 2026-10-18 | Focused ESLint and final `git diff --check` | Passed. The initial inventory-form `watch` warning was removed by using `useWatch`; changed feature files have no remaining lint diagnostics. UI patterns captured with imprint; review found no remaining implementation gaps, with migration deployment/live browser checks still pending. |
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
