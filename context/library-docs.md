# Sampaloc IV BMIS Library Docs

Last verified: 2026-10-11

This file records project-specific usage for installed libraries that matter to future development. Before adding or changing a third-party library, inspect actual imports and the installed documentation where available.

## Next.js 16.2.3

- Purpose: App Router, route groups, layouts, route handlers, server actions, proxy, image configuration, fonts.
- Used in: `app/**`, `proxy.ts`, `next.config.ts`.
- Patterns:
  - Route groups organize resident/admin/clinic without URL segments.
  - `proxy.ts` protects `/admin/:path*` with optimistic session/RBAC checks.
  - Server actions live in `server/actions/*.ts`.
  - Route handlers live in `app/api/**/route.ts`.
- Boundary rules:
  - Server Components by default.
  - Add `"use client"` only for interactivity.
  - Server actions must perform their own auth checks.
- Official local docs reviewed: `node_modules/next/dist/docs/01-app/01-getting-started/*.md`.
- Common mistake: treating proxy as full authorization. The installed docs warn proxy is not intended as full session management or authorization.

## React 19.2.4

- Purpose: UI rendering, client state, context providers.
- Used in: all TSX files.
- Patterns:
  - Context providers: `ResidentAuthProvider`, `AdminRbacProvider`, `QueryProvider`.
  - Client components use hooks and event handlers.
- Common mistake: importing server-only helpers into client components.

## Prisma 7.7.0, @prisma/adapter-pg 7.7.0, pg 8.20.0

- Purpose: PostgreSQL ORM.
- Used in: `lib/prisma.ts`, `server/actions/**`, `app/api/**`, `prisma/seed.ts`.
- Configuration:
  - `prisma/schema.prisma` datasource provider is PostgreSQL.
  - Generated client output is `app/generated/prisma`.
  - `lib/prisma.ts` uses `PrismaPg(process.env.DATABASE_URL)`.
  - Development client caching compares cached `resident.fields` with `Prisma.ResidentScalarFieldEnum` before reuse, preventing stale resident schema clients after hot reload. Run `npx prisma generate` after schema changes; restart the development server if an older generated module remains loaded.
  - Clinic integration also checks cached inventory-item and inventory-transaction scalar fields. Its ReadCommitted transactions use explicit 15-second max-wait and execution limits; tagged raw SQL provides advisory retry locks and ordered row locks. Admin quantity edits use `updateManyAndReturn` with the expected `stockVersion`.
- Server/client boundary: Prisma must be server-only.
- Security: never return passwords, OTPs, or broad sensitive records.
- Common mistake: importing generated Prisma client directly in client components.

## Tailwind CSS 4.2.2 and DaisyUI 5.5.19

- Purpose: styling and light theme plugin.
- Used in: `app/globals.css` and component class names.
- Configuration:
  - `postcss.config.mjs` uses `@tailwindcss/postcss`.
  - `app/globals.css` defines `primary-*` theme tokens and DaisyUI light theme.
- Common mistake: adding raw color classes or hardcoded hex values. Existing code has them; new work should not expand them.

## Zod 4.3.6

- Purpose: validation schemas.
- Used in: `validations/*.ts`, server actions.
- Patterns:
  - `safeParse` inputs.
  - Convert field errors with module-specific helpers.
  - FormData parsing functions exist for document and clinic workflows.
- Common mistake: trusting client validation without server validation.

## React Hook Form 7.72.1 and @hookform/resolvers 5.2.2

- Purpose: client form state and Zod integration.
- Used in: login, registration, admin modal, clinic, resident self-service forms.
- Patterns:
  - Use `register`, `handleSubmit`, `formState.errors`.
  - Keep server action result handling for authoritative messages.
- Common mistake: duplicating validation rules that conflict with Zod schema.

## TanStack React Query 5.99.0

- Purpose: client-side query and mutation state.
- Used in: admin list pages, clinic/resident pages, provider in `components/providers/query-provider.tsx`.
- Patterns:
  - Query keys are local constants such as `['announcements']`, `['inventory']`, and `['pets', 'all']`.
  - Use invalidation/refetch after mutations.
- Common mistake: caching data that includes sensitive resident/health data without correct access checks on the API.

## Cloudinary 2.9.0

- Purpose: image upload storage.
- Used in: `lib/cloudinary.ts` and actions for resident registration, announcements, officials, blotters, VAWC image handling where applicable.
- Configuration: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- Patterns:
  - `uploadImageToCloudinary(file, { folder, publicIdPrefix, assetLabel })`.
  - Throws `CloudinaryUploadError` for configuration, validation, and upload failures.
- Security: validate type/size, avoid exposing API secrets, and avoid trusting client-supplied URLs without ownership checks.

## Nodemailer 8.0.5

- Purpose: SMTP email delivery.
- Used in: `lib/nodemailer.ts`.
- Configuration: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, app URL variables.
- Existing uses:
  - Resident approval email.
  - Document request PDF email.
- Common mistake: blocking critical writes on email delivery. Resident approval currently launches email asynchronously.

## Resend 6.12.0 and React Email

- Purpose: email API route/template support.
- Used in: `app/api/send/route.ts`, `components/templates/email-template.tsx`.
- Configuration: `RESEND_API_KEY`.
- Status: route exists, but production workflow reliance was not fully verified. Requires confirmation before expanding.

## Puppeteer 24.42.0

- Purpose: PDF generation for document requests.
- Used in: `lib/pdf/document-request-delivery.ts`, `lib/pdf/document-request-pdf.tsx`, HTML templates under `lib/pdf/templates`.
- Boundary: route `app/api/document/generate/route.ts` forces `runtime = 'nodejs'` and `dynamic = 'force-dynamic'`.
- Common mistake: running PDF generation on Edge runtime or without production browser dependencies.
- Admin generation, Resident download and manual document-ready email now share `generateStoredDocumentRequestPdf`: reserve one immutable serial, coordinate a generation lease, persist private PDF bytes and reuse them thereafter. Generation preserves approval status. Puppeteer launch/content/PDF operations have explicit time bounds, and both PDF client calls allow 120 seconds. Legacy saved files are imported through a bounded trusted-reference reader, never regenerated silently when unavailable.
- Document confirmation/status emails use Next.js 16 `after` (installed API guide reviewed) after successful commits; SMTP failures return safely without reverting document actions. UI, success messages and emails share `lib/document-processing-notice.ts`.

## Recharts 3.8.1

- Purpose: dashboard charts.
- Used in: `app/(Admin)/admin/page.tsx`.
- Known issue: chart colors are hardcoded hex values in that page. Do not copy that pattern.

## Lucide React 1.3.0

- Purpose: icons for navigation, buttons, empty states, and forms.
- Used in: sidebars, admin pages, resident pages, clinic pages.
- Pattern: prefer lucide icons in icon buttons and navigation.

## Axios 1.15.0

- Purpose: HTTP client helper.
- Used in: `lib/axios.ts`.
- Status: fetch is also used directly in several pages. Follow local page pattern unless consolidating with approval.

## bcryptjs 3.0.3

- Purpose: password hashing and verification.
- Used in: resident account creation and admin/health-worker login.
- Pattern:
  - Hash with cost 10.
  - Compare with `bcrypt.compare`.
- Security: never log password input or hashes.

## Zustand 5.0.12 and Yup 1.7.1

- Installed but usage was not verified in the scanned source. Do not introduce them into new work unless a concrete local use or developer approval exists.

## Clinic appointment integration — 2026-10-18

No dependencies added. Uses installed Next.js 16 server actions, route handlers and after (local guides reviewed), existing PrismaPg/Prisma ReadCommitted transactions and advisory/resident locks, Zod 4 validation, React Hook Form, TanStack Query polling/invalidation, lucide icons and Nodemailer/React Email. Calendar math and formatting use built-in Intl with Asia/Manila. AppointmentDialog uses the browser's native modal dialog focus/Escape behavior. The Prisma development-cache guard now requires appointment/schedule delegates and current MedicalRecord scalar fields.

## Shadcn Base UI combobox — 2026-10-18

User approved adding the required dependency after inspection confirmed no existing Shadcn primitives. Added `@base-ui/react` 1.9.0 and a small manually composed `components/ui/combobox.tsx` following the official current Shadcn Base UI structure, adapted to existing MIS tokens. References reviewed: https://ui.shadcn.com/docs/components/base/combobox and https://base-ui.com/react/components/combobox; installed README and Combobox root/list/positioner declarations were read. Root items are medicine objects with name-label and ID-equality functions; bounded List/Popup and disabled Items provide filtering, keyboard navigation and touch-friendly options. No global theme or unrelated UI dependencies added. Browser fixture uses existing esbuild (from tsx) and Puppeteer, with synthetic medicines only.
