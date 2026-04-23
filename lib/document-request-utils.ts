import { getDocumentDefinition } from '@/lib/document-request-catalog'

export type DocumentRequestStatus =
  | 'PENDING_PAYMENT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'RELEASED'

export type DocumentDetailLine = {
  label: string
  value: string
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
  referenceDigits: string | null
  proofOfPaymentName: string | null
  proofOfPaymentPreview: string | null
  submittedAt: string
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
  requestedCopies: number
  amount: number
  status: DocumentRequestStatus
  details: unknown
  paymentReferenceDigits: string | null
  paymentProofFileName: string | null
  requestedAt: Date
}): ResidentDocumentRequestRecord {
  const details = (record.details ?? {}) as Record<string, string | undefined>

  return {
    id: record.id,
    documentType: record.documentTypeId,
    type: record.type,
    purpose: record.purpose,
    requestedCopies: String(record.requestedCopies),
    amount: record.amount,
    status: record.status,
    detailLines: buildDocumentDetailLines(record.documentTypeId, {
      ...details,
      requestedCopies: String(record.requestedCopies),
      purpose: record.purpose ?? details.purpose,
    }),
    referenceDigits: record.paymentReferenceDigits,
    proofOfPaymentName: record.paymentProofFileName,
    proofOfPaymentPreview: null,
    submittedAt: record.requestedAt.toISOString(),
  }
}
