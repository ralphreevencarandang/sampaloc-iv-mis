import prismaModule from '@/lib/prisma'
import { generateDocumentRequestPdfBuffer } from '@/lib/pdf/document-request-pdf'

const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule

const PDF_ELIGIBLE_STATUSES = new Set(['APPROVED', 'GENERATED'])

type DocumentRequestPdfResident = {
  id: string
  email: string
  firstName: string
  middleName: string | null
  lastName: string
  houseNumber: string
  street: string
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
        status: true,
        requestedAt: true,
        resident: {
          select: {
            id: true,
            email: true,
            firstName: true,
            middleName: true,
            lastName: true,
            houseNumber: true,
            street: true,
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
    const effectiveGeneratedAt = documentRequest.generatedAt ?? now
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
      serialNumber,
      generatedAt: effectiveGeneratedAt,
    })

    try {
      await prisma.documentRequest.update({
        where: {
          id: documentRequest.id,
        },
        data: {
          serialNumber,
          generatedAt: effectiveGeneratedAt,
          releasedAt: effectiveGeneratedAt,
          status: 'GENERATED',
        },
      })
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
