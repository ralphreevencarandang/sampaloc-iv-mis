import { getDocumentDefinition, type DocumentTypeDefinition } from '@/lib/document-request-catalog'

export type MockDocumentRequestStatus = 'PENDING' | 'REVIEW' | 'APPROVED' | 'GENERATED'

export type DocumentDetailLine = {
  label: string
  value: string
}

export type MockResidentProfile = {
  id: string
  email: string
  firstName: string
  lastName: string
  contactNumber: string
  houseNumber: string
  street: string
}

export type MockDocumentRequestRecord = {
  id: string
  requesterName: string
  requesterEmail: string
  requesterPhone: string
  requesterAddress: string
  documentType: DocumentTypeDefinition['id']
  requestedCopies: string
  amount: number
  status: MockDocumentRequestStatus
  detailLines: DocumentDetailLine[]
  submittedAt: string
}

type DocumentInputShape = {
  purpose?: string
  requestedCopies: string
  yearsOfResidency?: string
  placeOfBirth?: string
  emergencyContactPerson?: string
  emergencyContactAddress?: string
  emergencyContactNumber?: string
}

export const fallbackResidentProfile: MockResidentProfile = {
  id: 'resident-preview',
  email: 'resident@sampaloc4.local',
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  contactNumber: '09171234567',
  houseNumber: '045',
  street: 'Purok Mahusay, Sampaloc IV',
}

export function formatResidentName(profile: Pick<MockResidentProfile, 'firstName' | 'lastName'>) {
  return `${profile.firstName} ${profile.lastName}`
}

export function buildDocumentDetailLines(
  documentType: string,
  values: DocumentInputShape
): DocumentDetailLine[] {
  const definition = getDocumentDefinition(documentType)

  if (!definition) {
    return []
  }

  const lines: DocumentDetailLine[] = []

  if (values.purpose?.trim()) {
    lines.push({ label: 'Purpose', value: values.purpose })
  }

  lines.push({ label: 'Requested Copies', value: values.requestedCopies })

  definition.fields.forEach((field) => {
    const fieldValue = values[field.name]

    if (fieldValue?.trim()) {
      lines.push({ label: field.label, value: fieldValue })
    }
  })

  return lines
}

function createMockRequest(
  resident: MockResidentProfile,
  documentType: DocumentTypeDefinition['id'],
  values: DocumentInputShape,
  status: MockDocumentRequestStatus,
  submittedAt: string
): MockDocumentRequestRecord {
  const definition = getDocumentDefinition(documentType)
  const requestedCopies = values.requestedCopies || '1'

  return {
    id: `${resident.id}-${documentType}-${submittedAt}`,
    requesterName: formatResidentName(resident),
    requesterEmail: resident.email,
    requesterPhone: resident.contactNumber,
    requesterAddress: `${resident.houseNumber}, ${resident.street}`,
    documentType,
    requestedCopies,
    amount: (definition?.fee ?? 0) * Number(requestedCopies),
    status,
    detailLines: buildDocumentDetailLines(documentType, values),
    submittedAt,
  }
}

function isoMinutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString()
}

const residentA = fallbackResidentProfile
const residentB: MockResidentProfile = {
  id: 'resident-business',
  email: 'business@sampaloc4.local',
  firstName: 'Maria',
  lastName: 'Santos',
  contactNumber: '09170000002',
  houseNumber: '112',
  street: 'Purok Pag-asa, Sampaloc IV',
}

export const mockAdminDocumentRequests: MockDocumentRequestRecord[] = [
  createMockRequest(
    residentA,
    'clearance',
    {
      purpose: 'Local employment requirement.',
      requestedCopies: '1',
      yearsOfResidency: '8',
    },
    'PENDING',
    isoMinutesAgo(24)
  ),
  createMockRequest(
    residentB,
    'barangay-id',
    {
      requestedCopies: '1',
      placeOfBirth: 'Manila City',
      emergencyContactPerson: 'Rica Cruz',
      emergencyContactAddress: '021 Purok Dos, Sampaloc IV',
      emergencyContactNumber: '09171230008',
    },
    'APPROVED',
    isoMinutesAgo(140)
  ),
]

export function getDocumentTypeLabel(documentType: string) {
  return getDocumentDefinition(documentType)?.label ?? documentType
}
