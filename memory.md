# Memory — Shared Document PDFs and Download Recovery

Last updated: 2026-10-18 20:21 Asia/Singapore

## What was built

Completed shared Admin/Resident document PDF delivery, persistent approved-only Resident downloads, consistent Admin Reject icons, serial numbers in all templates and reusable 24-working-hour processing guidance across the request form, transaction history, success message and document emails.

Main entry points:
- `lib/pdf/document-request-delivery.ts`: shared persisted PDF generation/download service.
- `lib/pdf/stored-document.ts`: validated PDF bytes and restricted legacy reference imports.
- Existing Admin endpoint `app/api/document/generate/route.ts` and Resident endpoint `app/api/document/download/route.ts`.
- `lib/document-requests-api.ts`, `app/(Resident)/my-account/page.tsx` and `components/document-requests/admin-document-requests-page.tsx`.
- `lib/document-processing-notice.ts`, its reusable UI component, document actions and Nodemailer templates.
- Migration `prisma/migrations/20261018010000_shared_document_pdf/migration.sql`.

Architecture, UI patterns and detailed verification are documented in the context files. Follow AGENTS.md reading order before further implementation.

## Decisions made

Admin and Resident reuse one database-stored PDF and serial regardless of who generates first. Downloads leave approval status unchanged. Residents may download only their own APPROVED requests; existing Admin permissions apply. Stored bytes and assigned serials cannot be replaced. Missing legacy files fail safely rather than silently generating a different document. Existing legacy GENERATED requests are not reset to APPROVED.

Working-hours guidance does not promise a completion date. Detailed locking, lease, storage and email decisions are already recorded in `context/architecture.md` and `context/progress-tracker.md`.

## Problems solved

Both roles reported generic download errors after the feature was built. A read-only database probe confirmed all three required fields were absent: `generatedPdf`, `pdfGenerationToken`, `pdfGenerationExpiresAt`. The sole pending migration was `20261018010000_shared_document_pdf`.

The user explicitly confirmed the recover diagnosis and fix. Applied that migration with Prisma migrate deploy, regenerated Prisma and restarted only the verified project development processes. Verified all three fields exist in the database selected using the application's environment-file precedence, and the formerly failing field selection now succeeds. No source workaround was needed.

Chromium rendering initially failed under filesystem sandbox restrictions. The approved run outside the sandbox passed; do not mistake that execution restriction for a template bug.

## Current state

- All 32 application migrations are applied, including the PDF migration and earlier Clinic/document migrations. The former Clinic memory's unknown deployment state is superseded.
- Development server was restarted successfully at `http://localhost:3000`; its continuing availability should be checked next session rather than assumed.
- All 18 focused PDF/UI/email/authorization/cache checks passed again after recovery, including actual Chromium PDFs for all six supported/legacy document types.
- Prior feature verification also passed TypeScript, production build and all 14 isolated PostgreSQL scenarios plus parent, including both generation orders, concurrent generation, repeated downloads, serial consistency, failure recovery and legacy file handling. Synthetic schemas were cleaned up.
- Full source lint previously reported five unrelated baseline errors and 25 warnings; no full-lint pass is claimed. Recovery changed deployment state and documentation, not implementation source.
- Live unauthenticated checks returned 401 for Resident download and 403 for Admin generation. Authenticated browser downloads and actual SMTP delivery remain unverified. No real resident document or live email was generated during recovery.
- Existing requests/serials were preserved by the additive migration. Download buttons remain available for APPROVED requests; downloads do not change approval status.
- The agent created no commit or push. `git status --short` returned no changes immediately before this memory write; do not assume the earlier feature files remain uncommitted. Preserve any subsequent user changes.

## Next session starts with

Run `/remember restore`, follow AGENTS.md and inspect `context/progress-tracker.md`. If continuing this feature, verify an authorized Admin and Resident browser download of an approved request, repeat the downloads and refresh the page. Confirm identical serial/PDF bytes and unchanged APPROVED status. Do not apply the migration again as a proposed fix without checking current status.

No additional implementation is currently requested. Do not automatically begin the security roadmap or create real resident records/emails for testing.

Focused checks: `RUN_DOCUMENT_PDF_TESTS=1 node --import tsx --test tests/document-processing-notice.test.ts tests/resident-document-download.test.ts tests/document-request-policy.test.ts tests/prisma-cache.test.ts` (set the variable using PowerShell syntax on Windows). Real Chromium execution may require approved execution outside the sandbox. Isolated database scenarios are in `tests/document-request-database.test.ts` and require `RUN_DOCUMENT_DB_TESTS=1`; consult the tracker before rerunning.

## Open questions

- Has the user successfully downloaded an approved PDF in both authenticated portals since the migration/restart?
- Does actual document notification email delivery work in the configured environment?
- Prior Clinic authenticated dispensing/browser walkthrough remains unverified, although its migration is now applied. That is separate from the completed PDF recovery.
