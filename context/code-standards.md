# Sampaloc IV BMIS Code Standards

Last verified: 2026-10-11

## Engineering Mindset

- Understand before implementing.
- Respect existing architecture and route groups.
- Prefer readable, maintainable, narrowly scoped code.
- Avoid unnecessary abstractions.
- Complete and verify one feature at a time.
- Do not claim a feature or check is complete unless verified against code or an executed command.

## TypeScript Standards

- `strict` mode is enabled in `tsconfig.json`.
- Avoid `any`; prefer types from Prisma generated client, local record types, or Zod-inferred types.
- Validate untrusted input with Zod before database writes.
- Return predictable `{ success, message, fieldErrors? }` shapes from server actions.
- Catch and log unexpected server errors with safe user-facing messages.
- Do not expose passwords, OTPs, session payloads, or stack traces to users.

## Next.js Standards

This project uses Next.js 16.2.3. Local installed docs reviewed:

- `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`
- `05-server-and-client-components.md`
- `07-mutating-data.md`
- `15-route-handlers.md`
- `16-proxy.md`

Standards:

- Use App Router file conventions in `app/`.
- Route groups such as `(Resident)`, `(Admin)`, and `(Clinic)` do not affect URLs.
- Pages and layouts are Server Components by default. Add `"use client"` only when state, event handlers, effects, or browser APIs are required.
- Server actions must be async and live in `"use server"` files when imported by client components.
- Server actions are reachable through POST requests, so authenticate and authorize inside every protected action.
- Route handlers belong in `app/api/**/route.ts` and should use `NextResponse` for JSON responses.
- Next.js 16 uses `proxy.ts` instead of legacy middleware. Use proxy for lightweight route checks only.
- Use `revalidatePath` after server mutations when affected pages cache or display stale data.

## Folder and File Naming

- Keep route files in `app`.
- Keep reusable UI in `components`.
- Keep server actions in `server/actions`.
- Keep database and infrastructure helpers in `lib`.
- Keep Zod schemas in `validations`.
- Keep Prisma schema and migrations in `prisma`.
- Preserve existing route casing: `/Login`, `/AdminLogin`, and `/ClinicLogin` are capitalized.

## Component Standards

- Use client components only for interactive UI.
- Keep server-only utilities out of client imports. Add `import "server-only"` to secret/cookie/database helpers.
- Prefer existing modal form patterns under `components/ui/Admin` and `components/ui/Clinic`.
- For icons, use `lucide-react`.
- Do not add hardcoded hex values or new raw Tailwind color classes. If a new semantic color is necessary, add a token deliberately.
- Update `context/ui-registry.md` after adding reusable UI.

## API Standards

- Use HTTP status codes consistently: `401` unauthenticated, `403` forbidden, `400` validation/body errors, `404` missing resources, `500` unexpected errors.
- Protected admin APIs should call `forbiddenUnlessAdminCan`.
- Resident-scoped APIs must compare `currentResident.id` to the route `id` unless admin access is explicitly allowed.
- Never return password, OTP, or secret fields.
- Return serialized dates as ISO strings for client APIs when the surrounding module expects strings.

## Database Standards

- Use `lib/prisma.ts` for Prisma access.
- Do not edit `app/generated/prisma` manually.
- Prisma migrations live in `prisma/migrations`.
- Evaluate cascade behavior before deleting records. Resident delete currently manually deletes related pets, blotters, inventory transactions, document requests, and medical records.
- Use transactions for multi-step writes that must remain consistent.
- Preserve field naming inconsistencies such as `isArchive` vs `isArchived` unless a migration intentionally changes them.

## Authentication and Authorization

- Always check identity and permissions on the server before protected operations.
- Do not rely on navigation hiding, disabled buttons, or client read-only behavior as authorization.
- Use `getCurrentResidentFromSession`, `getCurrentAdminFromSession`, and `getCurrentHealthWorkerFromSession` for session reads.
- Use `hasAdminPermission`, `requireAdminPermission`, or `forbiddenUnlessAdminCan` for admin RBAC.
- Use health-worker session or admin health permission for medical records.

## Form Validation

- Use existing schemas in `validations/`.
- Convert `FormData` to plain objects before schema parsing.
- Map Zod errors through existing `get...FieldErrors` helpers.
- Validate files with `lib/valid-id-image.ts` or an approved file-specific validator.
- Apply both client-side UX validation and server-side authoritative validation.

## Error Handling

- Log unexpected errors on the server with context.
- Return safe, user-oriented messages.
- Catch Cloudinary upload failures and map them to file field errors.
- Avoid leaking raw Prisma errors, secrets, internal stack traces, or sensitive record values.

## Security

- Treat resident data, valid ID images, health records, blotter records, VAWC records, and document request details as sensitive.
- Keep cookies httpOnly and secure in production.
- Production must configure `AUTH_SESSION_SECRET` or `SESSION_SECRET`.
- File uploads must remain type and size restricted.
- VAWC and health features require extra care; do not add broad public APIs for these records.
- No audit log model is currently verified. Add one only with explicit scope and migration planning.

## Testing Standards

No dedicated test runner is configured in `package.json`.

Available checks:

- `npm run lint`
- `npm run build`
- `npm run prisma:generate`

For feature work, also manually verify the affected route and server action/API behavior.

## Code Quality

- ESLint uses `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`.
- Prefer project import alias `@/*`.
- Keep comments rare and useful.
- Do not refactor unrelated modules during a feature change.
- Update `context/progress-tracker.md` after completing and verifying a feature.

## Production Readiness

- Confirm all required environment variables are set without exposing values.
- Run Prisma generation after schema changes.
- Use migrations for production schema changes; do not rely on `db:push` for production without approval.
- Run build and lint before release.
- Verify Cloudinary, SMTP/Resend, PDF generation, and database connectivity in the target environment.
