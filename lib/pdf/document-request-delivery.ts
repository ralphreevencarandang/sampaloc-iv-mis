import { randomUUID } from 'node:crypto'
import type { Prisma } from '@/app/generated/prisma/client'
import prismaModule from '@/lib/prisma'
import { generateDocumentRequestPdfBuffer } from '@/lib/pdf/document-request-pdf'
import { readReferencedDocumentPdf, validateStoredPdf } from '@/lib/pdf/stored-document'
import { lockDocumentRequestResident } from '@/lib/document-request-lock'
import { documentUnitPrice, isJobSeekerDocument, JOB_SEEKER_AVAILED_MESSAGE, wasDocumentIssued } from '@/lib/document-request-policy'

const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule
const LEASE_MS = 180000
const WAIT_MS = 45000
const transactionOptions = { isolationLevel: 'ReadCommitted' as const, maxWait: 15000, timeout: 15000 }

export class DocumentRequestPdfGenerationError extends Error {
  constructor(message: string, public status: number) {
    super(message)
    this.name = 'DocumentRequestPdfGenerationError'
  }
}

function readRequest(db: Prisma.TransactionClient, requestId: string, residentId?: string) {
  return db.documentRequest.findUnique({
    where: { id: requestId, ...(residentId ? { residentId, resident: { isArchived: false, status: 'APPROVED' as const } } : {}) },
    select: {
      id: true, residentId: true, documentTypeId: true, type: true, purpose: true, quantity: true,
      amount: true, details: true, yearsOfResidency: true, placeOfBirth: true, serialNumber: true,
      generatedFileUrl: true, generatedAt: true, releasedAt: true, status: true, requestedAt: true,
      generatedPdf: true, pdfGenerationToken: true, pdfGenerationExpiresAt: true,
      resident: { select: { id: true, email: true, firstName: true, middleName: true, lastName: true,
        birthDate: true, houseNumber: true, street: true, contactNumber: true } },
    },
  })
}

type PdfRecord = NonNullable<Awaited<ReturnType<typeof readRequest>>>
export type GeneratedDocumentRequestPdfRecord = Omit<PdfRecord, 'generatedPdf' | 'pdfGenerationToken' | 'pdfGenerationExpiresAt' | 'residentId' | 'serialNumber' | 'generatedAt'> & { serialNumber: string; generatedAt: Date }
export type GeneratedDocumentRequestPdfResult = {
  pdfBuffer: Buffer; fileName: string; serialNumber: string; documentRequest: GeneratedDocumentRequestPdfRecord
}

function assertEligible(record: PdfRecord | null, residentId?: string): asserts record is PdfRecord {
  if (!record) throw new DocumentRequestPdfGenerationError('Document request not found.', 404)
  if (residentId ? record.status !== 'APPROVED' : !['APPROVED', 'GENERATED'].includes(record.status)) {
    throw new DocumentRequestPdfGenerationError('Only approved document requests are available. Refresh the request list.', 409)
  }
}

function resultFor(record: PdfRecord): GeneratedDocumentRequestPdfResult {
  if (!record.serialNumber || !record.generatedAt || !record.generatedPdf) {
    throw new DocumentRequestPdfGenerationError('The saved document is incomplete. Please contact the barangay.', 503)
  }
  let pdfBuffer: Buffer
  try { pdfBuffer = validateStoredPdf(record.generatedPdf) } catch {
    throw new DocumentRequestPdfGenerationError('The saved document is unavailable. Please contact the barangay.', 503)
  }
  return {
    pdfBuffer,
    fileName: `${record.type.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${record.serialNumber.replace(/[^a-zA-Z0-9-]/g, '-')}.pdf`,
    serialNumber: record.serialNumber,
    documentRequest: {
      id: record.id, documentTypeId: record.documentTypeId, type: record.type, purpose: record.purpose,
      quantity: record.quantity, amount: record.amount, details: record.details, yearsOfResidency: record.yearsOfResidency,
      placeOfBirth: record.placeOfBirth, serialNumber: record.serialNumber, generatedFileUrl: record.generatedFileUrl,
      generatedAt: record.generatedAt, releasedAt: record.releasedAt, status: record.status,
      requestedAt: record.requestedAt, resident: record.resident,
    },
  }
}

async function checkJobSeeker(tx: Prisma.TransactionClient, record: PdfRecord, now: Date) {
  if (!isJobSeekerDocument(record.documentTypeId) || wasDocumentIssued(record)) return
  const issued = await tx.documentRequest.findFirst({
    where: { residentId: record.residentId, id: { not: record.id },
      documentTypeId: { in: ['first-time-job-seeker', 'FIRST_TIME_JOB_SEEKER'] },
      OR: [{ status: 'GENERATED' }, { generatedAt: { not: null } }, { releasedAt: { not: null } },
        { pdfGenerationToken: { not: null }, pdfGenerationExpiresAt: { gt: now } }],
    }, select: { id: true },
  })
  if (issued) throw new DocumentRequestPdfGenerationError(JOB_SEEKER_AVAILED_MESSAGE, 409)
}

async function claim(requestId: string, residentId?: string) {
  return prisma.$transaction(async (tx) => {
    const owner = await tx.documentRequest.findUnique({ where: { id: requestId, ...(residentId ? { residentId } : {}) }, select: { residentId: true } })
    if (!owner) throw new DocumentRequestPdfGenerationError('Document request not found.', 404)
    await lockDocumentRequestResident(tx, owner.residentId)
    const record = await readRequest(tx, requestId, residentId)
    assertEligible(record, residentId)
    if (record.generatedPdf) return { kind: 'ready' as const, record }
    const now = new Date()
    if (record.pdfGenerationToken && record.pdfGenerationExpiresAt && record.pdfGenerationExpiresAt > now) return { kind: 'busy' as const }
    await checkJobSeeker(tx, record, now)
    if (record.generatedFileUrl && !record.serialNumber) {
      throw new DocumentRequestPdfGenerationError('The saved document has no serial metadata. Please contact the barangay.', 503)
    }
    let serialNumber = record.serialNumber
    if (!serialNumber) {
      const year = Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Manila' }).format(now))
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(40510, ${year}::int)::text`
      const pattern = `^BRGY-${year}-([0-9]+)$`
      const counters = await tx.$queryRaw<Array<{ counter: bigint }>>`SELECT COALESCE(MAX(substring("serialNumber" from ${pattern})::bigint), 0) AS counter FROM "DocumentRequest" WHERE "serialNumber" ~ ${pattern}`
      serialNumber = `BRGY-${year}-${String(BigInt(counters[0].counter) + BigInt(1)).padStart(4, '0')}`
    }
    const token = randomUUID()
    await tx.documentRequest.update({ where: { id: record.id }, data: {
      ...(record.serialNumber ? {} : { serialNumber }),
      pdfGenerationToken: token, pdfGenerationExpiresAt: new Date(now.getTime() + LEASE_MS),
    } })
    return { kind: 'claimed' as const, record, serialNumber, token,
      generatedAt: record.generatedAt ?? record.releasedAt ?? now }
  }, transactionOptions)
}

export async function generateStoredDocumentRequestPdf(requestId: string, options?: { residentId: string }): Promise<GeneratedDocumentRequestPdfResult> {
  const residentId = options?.residentId
  const deadline = Date.now() + WAIT_MS
  for (;;) {
    const claimed = await claim(requestId, residentId)
    if (claimed.kind === 'ready') return resultFor(claimed.record)
    if (claimed.kind === 'busy') {
      if (Date.now() >= deadline) throw new DocumentRequestPdfGenerationError('Your document is being prepared. Please try again shortly.', 409)
      await new Promise((resolve) => setTimeout(resolve, 500))
      continue
    }
    try {
      let pdfBuffer: Buffer
      if (claimed.record.generatedFileUrl) {
        try { pdfBuffer = await readReferencedDocumentPdf(claimed.record.generatedFileUrl) } catch {
          throw new DocumentRequestPdfGenerationError('The saved document could not be retrieved. Please contact the barangay.', 503)
        }
      } else {
        pdfBuffer = validateStoredPdf(await generateDocumentRequestPdfBuffer({ ...claimed.record,
          amount: documentUnitPrice(claimed.record.documentTypeId, claimed.record.amount),
          serialNumber: claimed.serialNumber, generatedAt: claimed.generatedAt,
        }))
      }
      const saved = await prisma.$transaction(async (tx) => {
        await lockDocumentRequestResident(tx, claimed.record.residentId)
        const current = await readRequest(tx, requestId, residentId)
        assertEligible(current, residentId)
        if (current.generatedPdf) return current
        if (current.pdfGenerationToken !== claimed.token || !current.pdfGenerationExpiresAt || current.pdfGenerationExpiresAt <= new Date()) {
          throw new DocumentRequestPdfGenerationError('Document preparation expired. Please try again.', 409)
        }
        await checkJobSeeker(tx, current, new Date())
        await tx.documentRequest.update({ where: { id: requestId }, data: {
          generatedPdf: new Uint8Array(pdfBuffer), generatedAt: current.generatedAt ?? claimed.generatedAt,
          releasedAt: current.releasedAt ?? claimed.generatedAt, pdfGenerationToken: null, pdfGenerationExpiresAt: null,
        } })
        return (await readRequest(tx, requestId, residentId))!
      }, transactionOptions)
      return resultFor(saved)
    } catch (error) {
      await prisma.documentRequest.updateMany({ where: { id: requestId, pdfGenerationToken: claimed.token },
        data: { pdfGenerationToken: null, pdfGenerationExpiresAt: null } }).catch(() => {})
      throw error
    }
  }
}

export function downloadApprovedResidentDocumentPdf(requestId: string, residentId: string) {
  return generateStoredDocumentRequestPdf(requestId, { residentId })
}
