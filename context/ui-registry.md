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
| `BlotterModalForm` | `components/ui/Admin/BlotterModalForm.tsx` | Create/edit blotter records. | `BlotterModalFormProps` | Blotter page | Optional image. |
| `VawcModalForm` | `components/ui/Admin/VawcModalForm.tsx` | Create/edit VAWC records. | `VawcModalFormProps` | VAWC page | Sensitive case data. |
| `PetsFormModal` | `components/ui/Admin/PetsFormModal.tsx` | Create/edit pet records. | `PetsFormModalProps` | Pets page | Owner dropdown. |
| `InventoryFormModal` | `components/ui/Admin/InventoryFormModal.tsx` | Create/edit inventory items. | `InventoryFormModalProps` | Inventory page | Uses inventory validation schema. |

## Admin Shared Components

| Component | Path | Purpose | Props / Types | Used By | Notes |
| --- | --- | --- | --- | --- | --- |
| `BulkActionBar` | `components/ui/Admin/BulkActionBar.tsx` | Bulk selected-items toolbar. | `BulkActionBarProps` | Admin list pages | Reusable. |
| `BulkConfirmModal` | `components/ui/Admin/BulkConfirmModal.tsx` | Confirm bulk archive/unarchive. | `BulkConfirmModalProps` | Admin list pages | Reusable confirmation pattern. |
| `ArchiveCard` | `components/ui/Admin/ArchiveCard.tsx` | Archived item card with restore action. | `ArchiveCardProps` | Archived page | Reusable archive pattern. |
| `AdminHealthRecordsPage` | `components/ui/Admin/AdminHealthRecordsPage.tsx` | Admin-facing medical record table. | `AdminHealthRecordsPageProps` | `/admin/health` | Uses clinic API serialization. |

## Clinic Components

| Component | Path | Purpose | Props / Types | Used By | Notes |
| --- | --- | --- | --- | --- | --- |
| `ClinicDashboard` | `components/ui/Clinic/ClinicDashboard.tsx` | Clinic stats and recent records UI. | `ClinicDashboardProps` | `/clinic` | Client component. |
| `ClinicMedicalRecordsPage` | `components/ui/Clinic/ClinicMedicalRecordsPage.tsx` | Medical record table and actions. | `ClinicMedicalRecordsPageProps` | `/clinic/medical-records` | Client component. |
| `MedicalRecordModalForm` | `components/ui/Clinic/MedicalRecordModalForm.tsx` | Create/edit medical record form. | `MedicalRecordModalFormProps` | Clinic/admin health pages | Uses medical record actions. |
| `ClinicMedicalRecordDetailsModal` | `components/ui/Clinic/ClinicMedicalRecordDetailsModal.tsx` | Medical record detail dialog. | `ClinicMedicalRecordDetailsModalProps` | Clinic/admin health pages | Read/detail view. |

## Resident Account and Self-Service Pages

| Component | Path | Purpose | Props / Types | Used By | Notes |
| --- | --- | --- | --- | --- | --- |
| `MyAccountPage` | `app/(Resident)/my-account/page.tsx` | Resident dashboard/profile/documents/pets/blotters. | Page component with local helpers | `/my-account` | Local `Badge`, `InfoTile`, `SectionCard`, tables. |
| `ResidentPetRegistrationPage` | `app/(Resident)/pet-registration/page.tsx` | Resident pet self-registration and list. | Page component with local helpers | `/pet-registration` | Uses `createResidentPet`. |
| `ResidentBlotterPage` | `app/(Resident)/blotter/page.tsx` | Resident blotter filing and recent filings. | Page component with local helpers | `/blotter` | Uses `createResidentBlotter`. |

## Templates

| Component | Path | Purpose | Props / Types | Used By | Notes |
| --- | --- | --- | --- | --- | --- |
| `EmailTemplate` | `components/templates/email-template.tsx` | React Email template. | `EmailTemplateProps { firstName }` | Email route/helper | Verify usage before changing. |

## Registry Maintenance

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
