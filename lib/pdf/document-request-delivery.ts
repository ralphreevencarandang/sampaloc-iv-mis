import prismaModule from '@/lib/prisma'
import { generateDocumentRequestPdfBuffer } from '@/lib/pdf/document-request-pdf'
import { lockDocumentRequestResident } from '@/lib/document-request-lock'
import { documentUnitPrice, isJobSeekerDocument, JOB_SEEKER_AVAILED_MESSAGE, wasDocumentIssued } from '@/lib/document-request-policy'

const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule

const PDF_ELIGIBLE_STATUSES = new Set(['APPROVED', 'GENERATED'])

type DocumentRequestPdfResident = {
  id: string
  email: string
  firstName: string
  middleName: string | null
  lastName: string
  birthDate: Date
  houseNumber: string
  street: string
  contactNumber: string | null
}

export type GeneratedDocumentRequestPdfRecord = {
  id: string
  documentTypeId: string
  type: string
  purpose: string | null
  quantity: number
  amount: number
  details: unknown
  yearsOfResidency: number
  placeOfBirth: string | null
  serialNumber: string
  generatedFileUrl: string | null
  generatedAt: Date
  status: 'GENERATED'
  requestedAt: Date
  resident: DocumentRequestPdfResident
}

export type GeneratedDocumentRequestPdfResult = {
  pdfBuffer: Buffer
  fileName: string
  serialNumber: string
  documentRequest: GeneratedDocumentRequestPdfRecord
}

export class DocumentRequestPdfGenerationError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'DocumentRequestPdfGenerationError'
    this.status = status
  }
}

function sanitizeFileNamePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function buildNextSerialNumber(
  year: number,
  currentSerialNumber: string | null,
  latestSerialNumber: string | null
) {
  if (currentSerialNumber) {
    return currentSerialNumber
  }

  const prefix = `BRGY-${year}-`
  const latestCounter = latestSerialNumber?.startsWith(prefix)
    ? Number.parseInt(latestSerialNumber.slice(prefix.length), 10)
    : 0
  const nextCounter = Number.isFinite(latestCounter) ? latestCounter + 1 : 1

  return `${prefix}${String(nextCounter).padStart(4, '0')}`
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}

export async function generateStoredDocumentRequestPdf(
  requestId: string
): Promise<GeneratedDocumentRequestPdfResult> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const documentRequest = await prisma.documentRequest.findUnique({
      where: {
        id: requestId,
      },
      select: {
        id: true,
        documentTypeId: true,
        type: true,
        purpose: true,
        quantity: true,
        amount: true,
        details: true,
        yearsOfResidency: true,
        placeOfBirth: true,
        serialNumber: true,
        generatedFileUrl: true,
        generatedAt: true,
        releasedAt: true,
        status: true,
        requestedAt: true,
        resident: {
          select: {
            id: true,
            email: true,
            firstName: true,
            middleName: true,
            lastName: true,
            birthDate: true,
            houseNumber: true,
            street: true,
            contactNumber: true,
          },
        },
      },
    })

    if (!documentRequest) {
      throw new DocumentRequestPdfGenerationError('Document request not found.', 404)
    }

    if (!PDF_ELIGIBLE_STATUSES.has(documentRequest.status)) {
      throw new DocumentRequestPdfGenerationError(
        'Only approved document requests can be generated as PDF.',
        400
      )
    }

    const now = new Date()
    const effectiveGeneratedAt = documentRequest.generatedAt ?? documentRequest.releasedAt ?? now
    const year = effectiveGeneratedAt.getFullYear()
    const latestWithYear = await prisma.documentRequest.findFirst({
      where: {
        serialNumber: {
          startsWith: `BRGY-${year}-`,
        },
      },
      select: {
        serialNumber: true,
      },
      orderBy: {
        serialNumber: 'desc',
      },
    })

    const serialNumber = buildNextSerialNumber(
      year,
      documentRequest.serialNumber,
      latestWithYear?.serialNumber ?? null
    )

    const pdfBuffer = await generateDocumentRequestPdfBuffer({
      ...documentRequest,
      amount: documentUnitPrice(documentRequest.documentTypeId, documentRequest.amount),
      serialNumber,
      generatedAt: effectiveGeneratedAt,
    })

    try {
      const saved = await prisma.$transaction(async (tx) => {
        await lockDocumentRequestResident(tx, documentRequest.resident.id)
        const current = await tx.documentRequest.findUnique({ where: { id: requestId } })
        if (!current || !PDF_ELIGIBLE_STATUSES.has(current.status)) {
          throw new DocumentRequestPdfGenerationError('This request is no longer eligible for issuance. Refresh the request list.', 409)
        }
        if (current.serialNumber && current.serialNumber !== serialNumber) return false
        if (isJobSeekerDocument(current.documentTypeId) && !wasDocumentIssued(current)) {
          const issued = await tx.documentRequest.findFirst({
            where: {
              residentId: current.residentId,
              id: { not: current.id },
              documentTypeId: { in: ['first-time-job-seeker', 'FIRST_TIME_JOB_SEEKER'] },
              OR: [{ status: 'GENERATED' }, { generatedAt: { not: null } }, { releasedAt: { not: null } }],
            },
            select: { id: true },
          })
          if (issued) throw new DocumentRequestPdfGenerationError(JOB_SEEKER_AVAILED_MESSAGE, 409)
        }
        await tx.documentRequest.update({
          where: {
            id: documentRequest.id,
          },
          data: {
            serialNumber,
            generatedAt: current.generatedAt ?? effectiveGeneratedAt,
            releasedAt: current.releasedAt ?? effectiveGeneratedAt,
            amount: documentUnitPrice(current.documentTypeId, current.amount),
            status: 'GENERATED',
          },
        })
        return true
      }, { isolationLevel: 'ReadCommitted', maxWait: 15000, timeout: 15000 })
      if (!saved) continue
    } catch (updateError) {
      if (!documentRequest.serialNumber && isUniqueConstraintError(updateError) && attempt < 2) {
        continue
      }

      throw updateError
    }

    return {
      pdfBuffer,
      fileName: `${sanitizeFileNamePart(documentRequest.type)}-${serialNumber}.pdf`,
      serialNumber,
      documentRequest: {
        ...documentRequest,
        amount: documentUnitPrice(documentRequest.documentTypeId, documentRequest.amount),
        serialNumber,
        generatedAt: effectiveGeneratedAt,
        status: 'GENERATED',
      },
    }
  }

  throw new DocumentRequestPdfGenerationError(
    'Unable to allocate a document serial number. Please try again.',
    409
  )
}
