# Sampaloc IV BMIS UI Rules

Last verified: 2026-10-11

## Design Philosophy

BMIS is an operational government information system. UI should be clear, fast to scan, and conservative. Resident pages may be friendlier and more welcoming; admin and clinic pages should prioritize dense tables, clear forms, obvious status, and low-friction repeated work.

## Layout Rules

- Root layout wraps all routes in `QueryProvider` and `ResidentAuthProvider`.
- Admin and clinic layouts use a left sidebar plus content area with `min-h-screen bg-slate-50`.
- Admin and clinic page content uses `p-4 md:p-8`.
- Landing page sections use `.max-container`, `.padding-x`, and `.padding-y`.
- Avoid nesting full page sections inside decorative cards. Use cards only for records, modals, tables, and compact tool panels.

## Navigation

- Resident landing navigation lives in `components/ui/ResidentNavbar.tsx` and uses anchor links plus `/Login` and `/my-account`.
- Admin navigation lives in `components/ui/AdminSidebar.tsx`; never add a visible admin link without adding the corresponding RBAC resource mapping when needed.
- Clinic navigation lives in `components/ui/Clinic/ClinicSidebar.tsx`.
- Hidden links or disabled buttons are not authorization. Always enforce server-side access.

## Typography

- Page titles: `text-3xl font-bold text-slate-900`.
- Section titles: `text-lg` to `text-2xl` with `font-semibold` or `font-bold`.
- Table headers: uppercase, `text-xs font-semibold tracking-wide`.
- Labels: `text-sm font-medium` or `font-semibold`.
- Helper text: `text-sm` or `text-xs`, muted.
- Do not use hero-scale type in admin tables, modals, or compact panels.

## Cards

- Admin cards usually use white background, subtle border, `shadow-sm`, and `rounded-lg`.
- Document request/resident self-service cards currently use larger radii. Match the local page when editing nearby UI.
- Do not put cards inside cards unless it is a repeated record inside a framed list.
- Empty states may use dashed borders and centered icon/text.

## Buttons

- Primary actions use `bg-primary-600 text-white hover:bg-primary-700`.
- Secondary actions use bordered neutral buttons.
- Destructive actions use red or rose classes where already established.
- Use icon buttons for row actions and add accessible `title` or `aria-label`.
- Disabled buttons must include visual disabled styling and actual `disabled` when using `<button>`.

## Forms

- Use `react-hook-form` and Zod schemas where the surrounding page already does.
- Labels should be visible and tied to inputs with `htmlFor`.
- Required fields should use the local `RequiredMark` pattern.
- Server-side validation is mandatory for all mutations.
- File inputs must show accepted image guidance and propagate Cloudinary validation errors.
- Submission errors should be user-safe and not expose stack traces or raw database errors.

## Tables

- Include search/filter controls when lists can grow.
- Use stable pagination patterns, typically `ITEMS_PER_PAGE = 10`.
- Keep row actions compact and icon-led.
- Use empty states for no records and loading skeletons/spinners for pending network state.
- Preserve bulk selection and bulk action bars where present.

## Dialogs and Modals

- Admin modal forms live under `components/ui/Admin`.
- Modal forms generally accept `isOpen`, `onClose`, and optional `initialData`.
- Confirmation dialogs should be used for bulk/archive/destructive operations.
- Sticky modal headers and footers are already used in several admin modal components.

## Status Indicators

- Document requests: `PENDING`, `REVIEW`, `APPROVED`, `GENERATED`.
- Residents: `PENDING`, `APPROVED`, `DECLINED`.
- Blotter: `OPEN`, `RESOLVED`.
- VAWC: `REPORTED`, `SUMMONED`, `RESOLVED`, `DISMISSED`.
- Inventory: calculated as `In Stock`, `Low Stock`, or `Out of Stock`.
- Medical records and many admin records use archive booleans rather than a visible status enum.

Use badges with text plus color. Do not rely on color alone.

## Feedback States

- Loading: skeleton rows/cards or lucide `Loader2` spinners.
- Success: toast or inline success message with green/emerald styling.
- Error: inline red/rose alert and field-level messages.
- Empty: centered message with a clear title and brief description.

## Accessibility

- Preserve semantic buttons for actions and links for navigation.
- Add `aria-label` or `title` to icon-only controls.
- Keep focus styles visible.
- Do not remove label text from forms.
- Maintain contrast for status badges and disabled controls.
- Keyboard users must be able to submit forms, close dialogs, and reach row actions.

## Responsive Design

- Use `sm`, `md`, and `lg` breakpoints already present in the repo.
- Tables should remain readable through horizontal overflow or responsive stacking.
- Sidebar collapse behavior should remain controlled by the existing sidebar components.
- Text must not overflow buttons, cards, or table cells.

## Do's and Don'ts

Do:

- Reuse existing modal, table, sidebar, badge, and empty-state patterns.
- Keep admin screens compact and scan-friendly.
- Use `primary-*` tokens for green brand actions.
- Add server permission checks before exposing new UI mutations.
- Update `ui-registry.md` after adding reusable UI.

Don't:

- Add hardcoded hex values or new raw Tailwind palette classes.
- Treat hidden navigation as security.
- Add a landing page where an operational screen is requested.
- Replace established layout or sidebar behavior without approval.
- Introduce decorative gradients/orbs into admin or clinic workflows.

## Proposed Improvements

- Promote repeated status colors into semantic theme tokens.
- Normalize admin card radius toward `rounded-lg`.
- Extract repeated table shells, empty states, status badges, and search bars into reusable components.
