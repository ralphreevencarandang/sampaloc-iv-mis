import {
  getDocumentDefinition,
  type DocumentFieldDefinition,
  type DocumentTypeDefinition,
} from '@/lib/document-request-catalog'

export type MockDocumentRequestStatus =
  | 'PENDING_PAYMENT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'

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
  proofOfPaymentName: string | null
  proofOfPaymentPreview: string | null
  referenceDigits: string | null
  submittedAt: string
}

const MOCK_PROOF_PREVIEW =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220">
      <rect width="320" height="220" rx="24" fill="#ecfeff"/>
      <rect x="18" y="18" width="284" height="184" rx="18" fill="#ffffff" stroke="#bae6fd" stroke-width="2"/>
      <rect x="38" y="38" width="90" height="24" rx="12" fill="#0f766e" opacity="0.12"/>
      <rect x="38" y="82" width="244" height="12" rx="6" fill="#cbd5e1"/>
      <rect x="38" y="106" width="216" height="12" rx="6" fill="#cbd5e1"/>
      <rect x="38" y="130" width="168" height="12" rx="6" fill="#cbd5e1"/>
      <rect x="210" y="150" width="72" height="28" rx="14" fill="#14b8a6"/>
      <text x="246" y="169" text-anchor="middle" font-family="Arial" font-size="12" fill="#ffffff">GCash</text>
    </svg>`
  )

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

function getFieldDisplayValue(field: DocumentFieldDefinition, rawValue: string) {
  if (field.type !== 'select') {
    return rawValue
  }

  return field.options?.find((option) => option.value === rawValue)?.label ?? rawValue
}

export function buildDocumentDetailLines(
  documentType: string,
  values: DocumentInputShape
): DocumentDetailLine[] {
  const definition = getDocumentDefinition(documentType)

  if (!definition) {
    return []
  }

  const lines: DocumentDetailLine[] = [
    { label: 'Requested Copies', value: values.requestedCopies },
  ]

  if (values.purpose?.trim()) {
    lines.unshift({ label: 'Purpose', value: values.purpose })
  }

  definition.fields.forEach((field) => {
    const fieldValue = values[field.name]

    if (!fieldValue?.trim()) {
      return
    }

    lines.push({
      label: field.label,
      value: getFieldDisplayValue(field, fieldValue),
    })
  })

  return lines
}

function isoMinutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString()
}

function createMockRequest(
  resident: MockResidentProfile,
  documentType: DocumentTypeDefinition['id'],
  values: DocumentInputShape,
  status: MockDocumentRequestStatus,
  proofOfPaymentName: string,
  referenceDigits: string,
  submittedAt: string
): MockDocumentRequestRecord {
  const definition = getDocumentDefinition(documentType)

  return {
    id: `${documentType}-${submittedAt}`,
    requesterName: formatResidentName(resident),
    requesterEmail: resident.email,
    requesterPhone: resident.contactNumber,
    requesterAddress: `${resident.houseNumber}, ${resident.street}`,
    documentType,
    requestedCopies: values.requestedCopies,
    amount: definition?.fee ?? 0,
    status,
    detailLines: buildDocumentDetailLines(documentType, values),
    proofOfPaymentName,
    proofOfPaymentPreview: MOCK_PROOF_PREVIEW,
    referenceDigits,
    submittedAt,
  }
}

const residentA: MockResidentProfile = {
  id: 'resident-a',
  email: 'maria.santos@example.com',
  firstName: 'Maria',
  lastName: 'Santos',
  contactNumber: '09181234567',
  houseNumber: '112',
  street: 'Purok Uno, Sampaloc IV',
}

const residentB: MockResidentProfile = {
  id: 'resident-b',
  email: 'angelo.cruz@example.com',
  firstName: 'Angelo',
  lastName: 'Cruz',
  contactNumber: '09991230001',
  houseNumber: '021',
  street: 'Purok Dos, Sampaloc IV',
}

const residentC: MockResidentProfile = {
  id: 'resident-c',
  email: 'lyka.ramos@example.com',
  firstName: 'Lyka',
  lastName: 'Ramos',
  contactNumber: '09190004567',
  houseNumber: '078',
  street: 'Purok Tatlo, Sampaloc IV',
}

export const mockAdminDocumentRequests: MockDocumentRequestRecord[] = [
  createMockRequest(
    residentA,
    'clearance',
    {
      purpose: 'Employment requirements for a warehouse assistant application.',
      requestedCopies: '1',
      yearsOfResidency: '8',
    },
    'SUBMITTED',
    'gcash-clearance.png',
    '4821',
    isoMinutesAgo(35)
  ),
  createMockRequest(
    residentB,
    'clearance',
    {
      purpose: 'Business permit renewal for a sari-sari store.',
      requestedCopies: '2',
      yearsOfResidency: '14',
    },
    'APPROVED',
    'gcash-business.png',
    '1974',
    isoMinutesAgo(140)
  ),
  createMockRequest(
    residentC,
    'cedula',
    {
      purpose: 'Personal tax certificate for bank account update.',
      requestedCopies: '1',
      placeOfBirth: 'Pasig City',
    },
    'SUBMITTED',
    'gcash-cedula.png',
    '6402',
    isoMinutesAgo(18)
  ),
  createMockRequest(
    residentA,
    'cedula',
    {
      purpose: 'Cedula requirement for scholarship renewal.',
      requestedCopies: '1',
      placeOfBirth: 'Quezon City',
    },
    'REJECTED',
    'gcash-scholarship.png',
    '3580',
    isoMinutesAgo(280)
  ),
  createMockRequest(
    residentB,
    'barangay-id',
    {
      purpose: 'Primary barangay identification for daily transactions.',
      requestedCopies: '1',
      placeOfBirth: 'Manila City',
      emergencyContactPerson: 'Rica Cruz',
      emergencyContactAddress: '021 Purok Dos, Sampaloc IV',
      emergencyContactNumber: '09171230008',
    },
    'SUBMITTED',
    'gcash-id.png',
    '7744',
    isoMinutesAgo(52)
  ),
]

export function getDocumentTypeLabel(documentType: string) {
  return getDocumentDefinition(documentType)?.label ?? documentType
}
