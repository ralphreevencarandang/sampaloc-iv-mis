import { getDocumentDefinition } from '@/lib/document-request-catalog'

export type DocumentRequestStatus =
  | 'PENDING'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'RELEASED'

export type DocumentDetailLine = {
  label: string
  value: string
}

export type DocumentRequestDraftInput = {
  documentType: string
  requestedCopies?: string
  purpose?: string
  yearsOfResidency?: string
  placeOfBirth?: string
  emergencyContactPerson?: string
  emergencyContactAddress?: string
  emergencyContactNumber?: string
}

export type ResidentDocumentRequestRecord = {
  id: string
  documentType: string
  type: string
  purpose: string | null
  requestedCopies: string
  amount: number
  status: DocumentRequestStatus
  detailLines: DocumentDetailLine[]
  referenceLast4: string | null
  proofOfPaymentUrl: string | null
  submittedAt: string
}

export type AdminDocumentRequestRecord = ResidentDocumentRequestRecord & {
  residentId: string
  requesterName: string
  requesterEmail: string
  requesterAddress: string
}

export function buildRelevantDocumentRequestPayload(input: DocumentRequestDraftInput) {
  const definition = getDocumentDefinition(input.documentType)

  if (!definition) {
    return {
      documentType: input.documentType,
      requestedCopies: input.requestedCopies?.trim() || '1',
    }
  }

  const payload: Record<string, string> = {
    documentType: definition.id,
    requestedCopies: input.requestedCopies?.trim() || '1',
  }

  if (input.purpose?.trim()) {
    payload.purpose = input.purpose.trim()
  }

  definition.fields.forEach((field) => {
    const value = input[field.name]

    if (typeof value === 'string' && value.trim()) {
      payload[field.name] = value.trim()
    }
  })

  return payload
}

export function createDocumentRequestFormData(input: DocumentRequestDraftInput) {
  const payload = buildRelevantDocumentRequestPayload(input)
  const formData = new FormData()

  Object.entries(payload).forEach(([key, value]) => {
    formData.set(key, value)
  })

  return formData
}

export function buildDocumentDetailLines(
  documentType: string,
  values: Record<string, string | undefined>
): DocumentDetailLine[] {
  const definition = getDocumentDefinition(documentType)

  if (!definition) {
    return []
  }

  const lines: DocumentDetailLine[] = []

  if (values.purpose?.trim()) {
    lines.push({ label: 'Purpose', value: values.purpose })
  }

  lines.push({
    label: 'Requested Copies',
    value: values.requestedCopies?.trim() || '1',
  })

  definition.fields.forEach((field) => {
    const fieldValue = values[field.name]

    if (!fieldValue?.trim()) {
      return
    }

    lines.push({
      label: field.label,
      value: fieldValue,
    })
  })

  return lines
}

export function getDocumentTypeLabel(documentType: string) {
  return getDocumentDefinition(documentType)?.label ?? documentType
}

export function serializeResidentDocumentRequest(record: {
  id: string
  documentTypeId: string
  type: string
  purpose: string | null
  quantity: number
  amount: number
  status: DocumentRequestStatus
  details: unknown
  referenceLast4: string | null
  proofOfPaymentUrl: string | null
  requestedAt: Date
}): ResidentDocumentRequestRecord {
  const details = (record.details ?? {}) as Record<string, string | undefined>

  return {
    id: record.id,
    documentType: record.documentTypeId,
    type: record.type,
    purpose: record.purpose,
    requestedCopies: String(record.quantity),
    amount: record.amount,
    status: record.status,
    detailLines: buildDocumentDetailLines(record.documentTypeId, {
      ...details,
      requestedCopies: String(record.quantity),
      purpose: record.purpose ?? details.purpose,
    }),
    referenceLast4: record.referenceLast4,
    proofOfPaymentUrl: record.proofOfPaymentUrl,
    submittedAt: record.requestedAt.toISOString(),
  }
}

export function serializeAdminDocumentRequest(record: {
  id: string
  documentTypeId: string
  type: string
  purpose: string | null
  quantity: number
  amount: number
  status: DocumentRequestStatus
  details: unknown
  referenceLast4: string | null
  proofOfPaymentUrl: string | null
  requestedAt: Date
  resident: {
    id: string
    email: string
    firstName: string
    middleName: string | null
    lastName: string
    houseNumber: string
    street: string
  }
}): AdminDocumentRequestRecord {
  const residentRequest = serializeResidentDocumentRequest(record)
  const requesterName = [
    record.resident.firstName,
    record.resident.middleName,
    record.resident.lastName,
  ]
    .filter(Boolean)
    .join(' ')

  return {
    ...residentRequest,
    residentId: record.resident.id,
    requesterName,
    requesterEmail: record.resident.email,
    requesterAddress: [record.resident.houseNumber, record.resident.street].filter(Boolean).join(', '),
  }
}
