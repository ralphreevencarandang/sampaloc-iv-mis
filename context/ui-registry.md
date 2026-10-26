# Sampaloc IV BMIS UI Registry

Last verified: 2026-10-11

Before creating a new component, inspect this registry and the existing components directory. Reuse or extend an existing component when appropriate.

## Layout and Providers

| Component | Path | Purpose | Props / Types | Used By | Notes |
| --- | --- | --- | --- | --- | --- |
| `RootLayout` | `app/layout.tsx` | Global HTML/body, fonts, React Query, resident auth, toaster. | `children: React.ReactNode` | All routes | Server component reads current resident session. |
| `AdminLayout` | `app/(Admin)/layout.tsx` | Protects `/admin`, renders admin sidebar and RBAC provider. | `children: React.ReactNode` | Admin route group | Redirects to `/AdminLogin`. |
| `ClinicLayout` | `app/(Clinic)/layout.tsx` | Protects `/clinic`, renders clinic sidebar. | `children: React.ReactNode` | Clinic route group | Redirects to `/ClinicLogin`. |
| `QueryProvider` | `components/providers/query-provider.tsx` | Provides TanStack Query client. | `children: ReactNode` | Root layout | Client component. |
| `ResidentAuthProvider`, `useResidentAuth` | `components/providers/resident-auth-provider.tsx` | Client context for current resident and auth refresh. | `initialResident`, `children` | Root layout, resident navbar/pages | Client component. |
| `AdminRbacProvider`, `useAdminRbac` | `components/providers/admin-rbac-provider.tsx` | Client RBAC helper and read-only UI disabling for Punong Barangay. | `role`, `children` | Admin layout/pages | UI guard only; server checks still required. |

## Navigation

| Component | Path | Purpose | Props / Types | Used By | Notes |
| --- | --- | --- | --- | --- | --- |
| `ResidentNavbar` | `components/ui/ResidentNavbar.tsx` | Public/resident navbar with profile menu. | No exported prop type | Resident pages/layouts | Uses `useResidentAuth`; links to landing anchors and account/login. |
| `ResidentFooter` | `components/ui/ResidentFooter.tsx` | Footer for resident-facing pages. | None | Resident layouts/pages | Static content. |
| `AdminSidebar` | `components/ui/AdminSidebar.tsx` | Role-filtered admin sidebar. | `{ role?: AdminRole | null }` | `AdminLayout` | Uses lucide icons and `canAccessResource`. |
| `ClinicSidebar` | `components/ui/Clinic/ClinicSidebar.tsx` | Clinic sidebar with dashboard and medical records links. | `ClinicSidebarProps { healthWorker }` | `ClinicLayout` | Client component. |

## Authentication

| Component | Path | Purpose | Props / Types | Used By | Notes |
| --- | --- | --- | --- | --- | --- |
| `AdminLoginForm` | `app/AdminLogin/AdminLoginForm.tsx` | Admin login UI. | None | `/AdminLogin` | Calls `loginAdminAction`. |
| `ClinicLoginForm` | `app/ClinicLogin/ClinicLoginForm.tsx` | Health worker login UI. | None | `/ClinicLogin` | Calls `loginHealthWorkerAction`. |
| `LoginPage`, `LoginForm` | `app/(Resident)/Login/page.tsx`, `app/(Resident)/Login/LoginForm.tsx` | Server page reads temporary registration notice cookie; client form handles login. | `registered?: boolean` | `/Login` | Clean login URL; fixed success copy comes from a 60-second HttpOnly notice cookie scoped to `/Login`. Session creation stays in login action. |
| `RegisterPage` | `app/(Resident)/register/page.tsx` | Resident registration form. | Page component | `/register` | Uses Cloudinary-backed server action. |

### Resident registration controls

Last updated: 2026-10-15. Files: `app/(Resident)/register/page.tsx`, `app/(Resident)/Login/LoginForm.tsx`.

| Property | Pattern |
| --- | --- |
| Controls | `rounded-lg border px-4 py-2`; `text-sm font-medium` labels; existing `RequiredMark` |
| Focus | `focus:outline-none focus:ring-2 focus:ring-primary-500`; upload has `peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500` |
| Disabled | `disabled:cursor-not-allowed disabled:opacity-50`; upload uses matching `peer-disabled` states |
| Field spacing | `space-y-4`, `mb-2` labels, `mt-1 text-sm` error messages |
| Login success | `rounded-lg border border-primary-200 bg-primary-50 p-4 text-sm text-primary-700`, `role="status"` |

ID controls follow type, conditional Other specification, number, then upload. ID number/upload unlock after selecting a type. Voting stays disabled without a valid birthdate or below age 15; younger residents are set to No and precinct details are cleared. Registration success navigates to login with fixed success copy and does not create a session.

## Public Resident Sections

| Component | Path | Purpose | Props / Types | Used By | Notes |
| --- | --- | --- | --- | --- | --- |
| `ResidentHero` | `components/sections/ResidentHero.tsx` | Landing hero. | None | `/` | Static visual section. |
| `ResidentAnnouncement` | `components/sections/ResidentAnnouncement.tsx` | Announcement section. | None | `/` | Client component. |
| `ResidentOfficials` | `components/sections/ResidentOfficials.tsx` | Officials section. | Local `OfficialAvatar`, `OfficialSection` | `/` | Client component. |
| `ResidentServices` | `components/sections/ResidentServices.tsx` | Services section. | None | `/` | Client component. |
| `ResidentAboutUs` | `components/sections/ResidentAboutUs.tsx` | About/gallery/contact facts. | None | `/` | Client component. |
| `ResidentContactUs` | `components/sections/ResidentContactUs.tsx` | Contact section. | None | `/` | Static/client section. |

## Document Requests

| Component | Path | Purpose | Props / Types | Used By | Notes |
| --- | --- | --- | --- | --- | --- |
| `RequestDocumentsClient` | `app/(Resident)/request-documents/request-documents-client.tsx` | Resident request flow and request history. | `resident`, `initialRequests`, price map props | `/request-documents` | Includes local `RequestStatusBadge`, `TextField`, `TextAreaField`, tables. |
| `AdminDocumentRequestsPage` | `components/document-requests/admin-document-requests-page.tsx` | Admin request queue by document type. | `PageProps { documentType }` | Admin document type pages | Includes local status badge, empty/error states, row action menu. |
| `MockResidentDocumentRequestPage` | `components/document-requests/mock-resident-document-request-page.tsx` | Mock resident document page. | mock props | Not primary workflow; usage not verified | Keep out of production flows unless confirmed. |
| `MockAdminDocumentRequestsPage` | `components/document-requests/mock-admin-document-requests-page.tsx` | Mock admin document page. | `PageProps { documentType }` | Not primary workflow; usage not verified | Keep out of production flows unless confirmed. |
| `EditDocumentPriceModal` | `components/ui/Admin/EditDocumentPriceModal.tsx` | Manage document pricing. | `EditDocumentPriceModalProps` | `/admin/documents/manage` | Uses preset prices. |

## Admin Modal Forms

| Component | Path | Purpose | Props / Types | Used By | Notes |
| --- | --- | --- | --- | --- | --- |
| `AnnouncementModalForm` | `components/ui/Admin/AnnouncementModalForm.tsx` | Create/edit announcements. | `AnnouncementModalFormProps` | Announcements page | Uploads optional image. |
| `OfficialModalForm` | `components/ui/Admin/OfficialModalForm.tsx` | Create/edit officials. | `OfficialModalFormProps` | Officials page | Uploads optional profile. |
| `ResidentFormModal` | `components/ui/Admin/ResidentFormModal.tsx` | Edit resident and verification status. | `ModalProps` | Resident page | Includes approval fields. |
| `CreateResidentModal` | `components/ui/Admin/CreateResidentModal.tsx` | Create residents from admin management using public registration fields, validation, valid ID upload, and account credentials. | `{ isOpen, onClose }` | Resident page | Uses `residentRegistrationSchema`, shared age/voting helpers and the authorized resident creation action; invalidates the resident query after success. |

### Admin resident creation modal

Last updated: 2026-10-18. Files: `components/ui/Admin/CreateResidentModal.tsx`, `app/(Admin)/admin/resident/page.tsx`.

| Property | Pattern |
| --- | --- |
| Surface | Fixed, dimmed overlay with a centered, scrollable white dialog; closes with the close/cancel buttons or backdrop click |
| Sections | Credentials, personal information, contact/address, identity verification |
| Validation | Shared `residentRegistrationSchema`; shared Manila age/voting helper; shared valid ID image file validator |
| Account | Password and confirmation use the public registration policy; server hashes before saving |
| Permissions | Admin and Secretary (`CLERK`) can create; Secretary has resident-list read access; existing resident write controls stay Admin-only |
| Feedback | Field-level messages and success/error toast; resident query invalidated after success |
| `BlotterModalForm` | `components/ui/Admin/BlotterModalForm.tsx` | Create/edit blotter records. | `BlotterModalFormProps` | Blotter page | Optional image. |
| `VawcModalForm` | `components/ui/Admin/VawcModalForm.tsx` | Create/edit VAWC records. | `VawcModalFormProps` | VAWC page | Sensitive case data. |
| `PetsFormModal` | `components/ui/Admin/PetsFormModal.tsx` | Create/edit pet records. | `PetsFormModalProps` | Pets page | Owner dropdown; standardized pet type select with conditional required custom type. Existing unlisted types load through Other for compatibility. |
| `InventoryFormModal` | `components/ui/Admin/InventoryFormModal.tsx` | Create/edit inventory items. | `InventoryFormModalProps` | Inventory page | Uses inventory validation schema. |

## Admin Shared Components

| Component | Path | Purpose | Props / Types | Used By | Notes |
| --- | --- | --- | --- | --- | --- |
| `BulkActionBar` | `components/ui/Admin/BulkActionBar.tsx` | Bulk selected-items toolbar. | `BulkActionBarProps` | Admin list pages | Reusable. |
| `BulkConfirmModal` | `components/ui/Admin/BulkConfirmModal.tsx` | Confirm bulk archive/unarchive. | `BulkConfirmModalProps` | Admin list pages | Reusable confirmation pattern. |
| `ArchiveCard` | `components/ui/Admin/ArchiveCard.tsx` | Archived item card with restore action. | `ArchiveCardProps` | Archived page | Reusable archive pattern. |
| `AdminHealthRecordsPage` | `components/ui/Admin/AdminHealthRecordsPage.tsx` | Admin-facing medical record table. | `AdminHealthRecordsPageProps` | `/admin/health` | Uses clinic API serialization. |
| `SummaryDashboardCards` | `components/ui/Admin/SummaryDashboardCards.tsx` | Compact responsive statistic cards with icon, label, count, and loading spinner. | `{ stats: SummaryDashboardStat[]; isLoading: boolean }` | `/admin/vawc`, `/admin/blotter`, `/admin/pets` | Client UI only; counts come from each page's existing active-record query. |

## Clinic Components

| Component | Path | Purpose | Props / Types | Used By | Notes |
| --- | --- | --- | --- | --- | --- |
| `ClinicDashboard` | `components/ui/Clinic/ClinicDashboard.tsx` | Clinic stats and recent records UI. | `ClinicDashboardProps` | `/clinic` | Client component. |
| `ClinicMedicalRecordsPage` | `components/ui/Clinic/ClinicMedicalRecordsPage.tsx` | Medical record table and actions. | `ClinicMedicalRecordsPageProps` | `/clinic/medical-records` | Client component. |
| `ClinicMedicinesPage` | `components/ui/Clinic/ClinicMedicinesPage.tsx` | Read-only shared medicine inventory with search, stock filters, pagination and refresh. | None | `/clinic/medicines` | Reuses the authenticated medicine API/query; no inventory mutations or dispensing controls. |
| `MedicalRecordModalForm` | `components/ui/Clinic/MedicalRecordModalForm.tsx` | Create/edit medical record form. | `MedicalRecordModalFormProps` | Clinic/admin health pages | Uses medical record actions. |
| `ClinicMedicalRecordDetailsModal` | `components/ui/Clinic/ClinicMedicalRecordDetailsModal.tsx` | Medical record detail dialog. | `ClinicMedicalRecordDetailsModalProps` | Clinic/admin health pages | Read/detail view. |

## Resident Account and Self-Service Pages

| Component | Path | Purpose | Props / Types | Used By | Notes |
| --- | --- | --- | --- | --- | --- |
| `MyAccountPage` | `app/(Resident)/my-account/page.tsx` | Resident dashboard/profile/documents/pets/blotters. | Page component with local helpers | `/my-account` | Local `Badge`, `InfoTile`, `SectionCard`, tables. |
| `ResidentPetRegistrationPage` | `app/(Resident)/pet-registration/page.tsx` | Resident pet self-registration and list. | Page component with local helpers | `/pet-registration` | Uses `createResidentPet`; pet type select provides Dog, Cat, Bird, Fish and required custom Other type. |

### Pet type controls

Last updated: 2026-10-18. Files: `components/ui/Admin/PetsFormModal.tsx`, `app/(Resident)/pet-registration/page.tsx`.

| Property | Pattern |
| --- | --- |
| Admin input | `rounded-lg border border-gray-200 px-4 py-2`; `focus:border-primary-500 focus:outline-none` |
| Resident input | `rounded-2xl border border-slate-200 px-4 py-3 text-sm`; `focus:border-primary-500` |
| Options | Dog, Cat, Bird, Fish, Other |
| Custom type | Show a required text field only when Other is selected; value is saved to the existing `Pet.type` string |
| Legacy edit | Known values select their standard option case-insensitively; any other saved type selects Other and pre-fills the custom field |
| `ResidentBlotterPage` | `app/(Resident)/blotter/page.tsx` | Resident blotter filing and recent filings. | Page component with local helpers | `/blotter` | Uses `createResidentBlotter`. |

## Templates

| Component | Path | Purpose | Props / Types | Used By | Notes |
| --- | --- | --- | --- | --- | --- |
| `EmailTemplate` | `components/templates/email-template.tsx` | React Email template. | `EmailTemplateProps { firstName }` | Email route/helper | Verify usage before changing. |

## Registry Maintenance

### Resident transaction document download and admin rejection

Files: `app/(Resident)/my-account/page.tsx`, `components/document-requests/admin-document-requests-page.tsx`. Updated: 2026-10-18.

- History adds a Download Document column within the existing horizontally scrolling table. Only APPROVED rows show the button; all other statuses display Not Available.
- Download button: `rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700`, `gap-2`, `hover:bg-primary-100`, `focus:ring-2 focus:ring-primary-500`, and disabled opacity/cursor. Download/spinner icons use `h-4 w-4`; accessible label includes the document type. Errors use the existing toast.
- Shared admin Reject request menu entry adds an inherited-color `XCircle`, `h-4 w-4 shrink-0`, within the existing `gap-2` row. Rejection permissions, confirmation and behavior remain unchanged across document pages.
- Admin/Resident downloads and manual document-ready email use a shared persisted PDF and immutable serial. First generation saves the PDF and issuance metadata while preserving approval status; subsequent downloads reuse its exact bytes. History refreshes and the button remains available while APPROVED. Legacy GENERATED rows remain unavailable to residents and remain downloadable to authorized Admins. Admin buttons use Generate & Download PDF until generatedAt is present, then Download PDF.

### DocumentProcessingNotice

File: `components/document-requests/document-processing-notice.tsx`. Updated: 2026-10-18.

| Property | Pattern |
| --- | --- |
| Surface/border | `bg-primary-50 border border-primary-200` |
| Radius/spacing | `rounded-lg p-4`; `mt-2` between paragraphs |
| Text | `text-sm text-primary-700` |
| Semantics | `role="note"`; estimate plus working-hour exclusions in visible text |
| Shadow | None |

Used before document submission and in My Account document transaction history. Both paragraphs come from `lib/document-processing-notice.ts`, also used by submission success and confirmation/status/manual-ready emails. No schedule or specific completion date is invented. Existing page/table styling and the Reject icon remain unchanged.

### ClinicMedicinesPage

File: `components/ui/Clinic/ClinicMedicinesPage.tsx`. Last updated: 2026-10-18.

| Property | Pattern |
| --- | --- |
| Table surface | `bg-surface border border-outline rounded-lg shadow-sm` |
| Header surface | `bg-surface-muted`; uppercase `text-xs tracking-wide font-semibold` |
| Text | `text-content` for headings/rows; `text-content-muted` for secondary copy |
| Controls | `rounded-lg border border-outline bg-surface px-3 py-2 text-sm`; `focus:ring-2 focus:ring-primary-500 focus:outline-none` |
| Status badges | `rounded-full border px-2.5 py-1 text-xs font-medium`; existing primary tokens for Available, semantic `stock-low-*` for Low Stock and `stock-empty-*` for Out of Stock |
| Spacing | `space-y-6` page, `p-4` toolbar/footer, `px-6 py-4` table cells |
| States | Spinner with status text; retry alert; stale-data warning after refresh failure; distinct no-stock and no-matches copy |
| Interactive | `hover:bg-primary-50`; `disabled:cursor-not-allowed disabled:opacity-50` |

Sidebar entry uses the existing ClinicSidebar navigation and lucide Pill icon. The page uses the same `clinicMedicinesQueryOptions` as the dispensing panel, polls every 15 seconds, refetches on focus and has a manual Refresh button. Search and status changes return to page 1; the displayed page clamps when refreshed results shrink. The table scrolls horizontally on small screens. Quantity/unit/status/expiry are display-only; the only workflow link opens Medical Records. No new raw palette classes or hex values were added.

### MedicineDispensingPanel and inventory medicine controls

Files: `components/ui/Clinic/MedicineDispensingPanel.tsx`, `components/ui/Clinic/ClinicMedicalRecordDetailsModal.tsx`, `components/ui/Clinic/MedicalRecordModalForm.tsx`, `components/ui/Admin/InventoryFormModal.tsx`.
Last updated: 2026-10-18.

| Property | Pattern |
| --- | --- |
| Container | `rounded-lg border border-primary-200 p-4`, `space-y-4`; inherits the existing modal surface |
| Feedback | `rounded-lg border border-primary-200 bg-primary-50 p-3 text-sm text-primary-700`; `role="status"` or `role="alert"` |
| Controls | `rounded-lg border border-primary-200 px-3 py-2 text-sm`; inventory expiry uses `px-4` |
| Focus | `focus:outline-none focus:ring-2 focus:ring-primary-500` |
| Action | `border-primary-600 bg-primary-50 text-primary-700 hover:bg-primary-100`, `font-semibold` |
| Disabled | `disabled:cursor-not-allowed disabled:opacity-50` and actual disabled attributes |
| Typography | `text-lg font-semibold` section title; `text-sm` rows, labels and history |
| Spacing | `space-y-2` row details, `space-y-3` medicine list, `gap-2` wrapping quantity controls |
| Shadow | None added |

`MedicineDispensingPanel({ recordId })` is reused in consultation details for Clinic and Admin health views. It provides searchable name/stock/unit/status/expiry rows, multiple integer quantities, explicit dispensing, and patient/worker/date history. Permissions come from the authenticated history API; Admin viewers receive read-only controls. Selected rows stay visible during search; removed stock can be cleared. Failed refreshes block new dispensing. Uncertain submissions retain the exact request and retry UUID in the existing query cache across modal reopenings until confirmed; a full browser reload is not persisted. New consultations open details after save. Legacy medicine notes remain visible and read-only.

Admin medicine controls add an explicit checkbox and expiry input, with `useWatch` for the conditional section. Existing inventory entries are edited in place. Date-less and expired medicine stock stays visible but cannot be dispensed. This addition uses existing primary tokens and no new raw palette or hex values.

### Document request eligibility feedback

Last updated: 2026-10-16. Files: `app/(Resident)/request-documents/request-documents-client.tsx`, `components/document-requests/admin-document-requests-page.tsx`.

| Property | Pattern |
| --- | --- |
| Blocking notice | `rounded-lg border border-primary-200 bg-primary-50 p-4 text-sm text-primary-700`, `role="status"` |
| Existing request link | `mt-2 inline-block font-semibold underline`, targets the request row's stable `request-{id}` anchor |
| Submit state | Existing `disabled:cursor-not-allowed disabled:opacity-60`; blocked until history loads and while an active/lifetime restriction applies |
| Job Seeker quantity | Disabled input fixed to 1, with `mt-2 text-sm text-primary-700` explanation; total displays ₱0.00 |
| Admin terminal action | Single Reject request action: `rounded-lg px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50`, disabled on final/issued requests; confirmation before rejection |

The document selector remains usable to inspect requirements. The selected document's Submit Request button enforces eligibility. History refreshes on focus and every 30 seconds; the server remains authoritative. Admin filters and badges include REJECTED as the single unsuccessful outcome. No new palette colors were introduced.

After implementing a new reusable component, update this file with the component name, path, purpose, props, usage, dependencies, variants, and verification date.

### Clinic appointment components

Files: `components/ui/Clinic/AppointmentHistory.tsx`, `ClinicAppointmentsPage.tsx`, `ResidentAppointmentBooking.tsx`, `AppointmentDialog.tsx`. Last updated: 2026-10-18.

| Property | Pattern |
| --- | --- |
| Surface / border | `bg-surface`, `bg-surface-muted`, `border-outline` |
| Radius / shadow | `rounded-lg`, `shadow-sm`; dialog `shadow-lg` |
| Text | `text-content`, `text-content-muted`; page heading `text-3xl font-bold`, section `text-xl font-semibold`, controls/body `text-sm` |
| Controls | `rounded-lg border border-outline bg-surface px-3 py-2 text-sm` |
| Focus / hover | `focus:ring-2 focus:ring-primary-500 focus:outline-none`, `hover:bg-primary-50` |
| Spacing | `space-y-4` / `space-y-6`; cards `p-4`, forms/dialog contents `p-6` |
| Status | Text badges, `rounded-full border px-2.5 py-1 text-xs font-medium`; primary tokens for Confirmed/Completed, stock-low tokens for Pending, stock-empty tokens for Cancelled/Rejected/No Show |
| Disabled | Actual disabled controls plus `disabled:cursor-not-allowed disabled:opacity-50` |

`AppointmentHistory({ mode, onConsult?, onViewRecord? })` is shared by clinic/admin management, resident booking and My Account. It provides ten-row pagination, combined name/reason/date/status filters, refresh, status details/history and reason-required cancellation/rejection. Read-only roles see no mutation controls. Failed refreshes show stale-data feedback and block mutations. Staff get total/status cards and today's appointments; resident data comes only from their authenticated owner query. Queries refresh every 15 seconds and on focus.

`AppointmentDialog` uses native modal dialogs for focus containment, Escape and focus restoration; saving prevents dismissal. `ConsultationSummary({ records })` shows Total Consultations, Walk-In Visits and Appointment Visits on Clinic/Admin records pages. Existing medical-record forms accept an optional appointmentId, fix the patient and date for linked visits, invalidate appointment caches after save and open the same medicine-dispensing details workflow. Classification is visible in lists and details.

Resident booking uses existing React Hook Form/Zod patterns and lists only dates/times with capacity in a rolling 90-day display. All appointment times use Asia/Manila. The Resident Services card follows the existing card geometry using semantic/primary tokens. No raw palette or hex values were added.

### MedicineCombobox and early appointment consultation

Files: `components/ui/combobox.tsx`, `components/ui/Clinic/MedicineCombobox.tsx`, `MedicineDispensingPanel.tsx`, `AppointmentHistory.tsx`, `ClinicAppointmentsPage.tsx`, `MedicalRecordModalForm.tsx`. Updated: 2026-10-18.

| Property | Pattern |
| --- | --- |
| Input / popup | `rounded-lg border border-outline bg-surface text-content`; popup `shadow-lg` |
| Input size | `px-3 py-2 text-base sm:text-sm` to keep mobile input legible |
| Focus / highlight | `focus-within:ring-2 focus-within:ring-primary-500`; options `data-[highlighted]:bg-primary-50`, `data-[highlighted]:text-primary-700` |
| Option spacing | `px-3 py-3 text-sm`; stock/unit detail `text-xs` |
| Disabled | Real disabled options and controls, `data-[disabled]:opacity-50`, `disabled:opacity-50` |
| Scroll | List `max-h-[min(20rem,var(--available-height))] overflow-y-auto overscroll-contain`; selected-quantity list retains `max-h-80 overflow-y-auto` |
| Responsive popup | Anchor-width popup constrained to viewport width; portal above existing detail modals |

`MedicineCombobox({ id, medicines, selectedIds, disabled, onSelect })` uses Shadcn's Base UI composition with accessible keyboard navigation, name search, live stock/unit labels and a bounded dropdown. Selecting adds one medicine to the existing ID-keyed quantity map; already selected IDs and expired entries are excluded. Empty stock or missing expiry disables an option. Multiple selections, removed stock cleanup, server-authoritative validation and stable dispensing retry UUIDs are preserved. Read-only viewers get no selection controls.

Confirmed appointments show Start Consultation regardless of scheduled date/time, switching to Resume Consultation once a canonical server start is stored. The form shows Scheduled appointment and Actual consultation started as separate Manila timestamps. The original date/time stays visible in the table/details, and save remains the finalization command.

### Resident registration inputs

File: `components/ui/resident-inputs.tsx`. Updated: 2026-10-26.

`PasswordInput` and `PhilippineMobileInput` accept native input props and React 19 input refs. Both create forms reuse them; resident editing reuses the phone control through React Hook Form Controller. Existing page-local input borders, surfaces, text and padding are passed as className.

| Property | Pattern |
| --- | --- |
| Toggle / prefix text | `text-content-muted`; toggle `hover:text-primary-700` |
| Toggle radius / focus | `rounded-lg`, `focus-visible:ring-2 focus-visible:ring-primary-500` |
| Input spacing | `pr-12` for password actions, `pl-12` for the fixed phone prefix |
| Toggle target | At least 44px; keyboard button with Show/Hide label, aria-pressed and aria-controls |
| Shadow | None added |

Passwords start hidden with independent Eye/EyeOff toggles and preserve the existing strength/confirmation policy. Phone inputs display a fixed +63, numeric keyboard and at most ten numeric national digits; valid local/international pasted numbers can populate the national input. Server/shared Zod validation requires 9 followed by nine digits and persists +639XXXXXXXXX. Edit prefills recognize existing 09, 639 and +639 formats, including common spacing/separators. Invalid legacy values require correction when saved; no bulk data rewrite occurs.

Both create forms use the existing Zod resolver through React Hook Form with reactive values from their controlled form state. Name validation covers first/middle/last names, Unicode letters/combining marks, spaces, hyphens and straight/curly apostrophes, with NFC normalization and collapsed whitespace. Optional middle names may remain empty; all three fields display validation feedback. No schema or dependency changes.
