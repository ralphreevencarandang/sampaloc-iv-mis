export const JOB_SEEKER_DOCUMENT = 'first-time-job-seeker'
export const ACTIVE_REQUEST_STATUSES = ['PENDING', 'REVIEW', 'APPROVED'] as const
export const ACTIVE_REQUEST_MESSAGE = 'You already have an active request for this document. Please wait until it is completed before submitting another request.'
export const JOB_SEEKER_AVAILED_MESSAGE = 'You have already availed of your free First-Time Job Seeker Certificate. This certificate can only be availed of once.'

export function isJobSeekerDocument(documentType: string) {
  return documentType === JOB_SEEKER_DOCUMENT || documentType === 'FIRST_TIME_JOB_SEEKER'
}

export function documentUnitPrice(documentType: string, configuredPrice: number) {
  return isJobSeekerDocument(documentType) ? 0 : configuredPrice
}

export function isActiveDocumentRequest(status: string) {
  return (ACTIVE_REQUEST_STATUSES as readonly string[]).includes(status)
}

export type EligibilityRequest = {
  id: string
  documentType: string
  status: string
  generatedAt?: string | Date | null
  releasedAt?: string | Date | null
}

export function wasDocumentIssued(request: Pick<EligibilityRequest, 'status' | 'generatedAt' | 'releasedAt'>) {
  return request.status === 'GENERATED' || Boolean(request.generatedAt || request.releasedAt)
}

// Intentionally includes every record, regardless of visibility or archive state.
export function getDocumentRequestBlock(documentType: string, history: readonly EligibilityRequest[]) {
  const sameType = history.filter((request) => request.documentType === documentType ||
    (isJobSeekerDocument(documentType) && isJobSeekerDocument(request.documentType)))
  const issued = isJobSeekerDocument(documentType) ? sameType.find(wasDocumentIssued) : undefined
  if (issued) return { message: JOB_SEEKER_AVAILED_MESSAGE, requestId: issued.id }
  const active = sameType.find((request) => isActiveDocumentRequest(request.status) && !wasDocumentIssued(request))
  return active ? { message: ACTIVE_REQUEST_MESSAGE, requestId: active.id } : null
}
