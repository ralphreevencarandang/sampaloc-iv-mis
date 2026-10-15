'use server'

import { revalidatePath } from 'next/cache'
import type { Prisma } from '@/app/generated/prisma/client'
import { hasAdminPermission } from '@/lib/admin-authorization'
import { sendDocumentRequestPdfEmail } from '@/lib/nodemailer'
import prismaModule from '@/lib/prisma'
import { getDocumentDefinition } from '@/lib/document-request-catalog'
import { documentUnitPrice, getDocumentRequestBlock, isJobSeekerDocument, isActiveDocumentRequest, wasDocumentIssued } from '@/lib/document-request-policy'
import { lockDocumentRequestResident } from '@/lib/document-request-lock'
import { z } from 'zod'
import {
  serializeAdminDocumentRequest,
  serializeResidentDocumentRequest,
  type AdminDocumentRequestRecord,
  type ResidentDocumentRequestRecord,
} from '@/lib/document-request-utils'
import {
  DocumentRequestPdfGenerationError,
  generateStoredDocumentRequestPdf,
} from '@/lib/pdf/document-request-delivery'
import { getCurrentResidentFromSession } from '@/lib/resident-session'
import {
  getZodFieldErrors,
  parseDocumentRequestFormData,
  pickRelevantDocumentRequestData,
} from '@/validations/document.validation'

const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule

export type CreateResidentDocumentRequestResult = {
  success: boolean
  message: string
  fieldErrors?: Record<string, string>
  request?: ResidentDocumentRequestRecord
  existingRequestId?: string
}

type AdminDocumentRequestStatus = 'APPROVED' | 'REVIEW' | 'REJECTED'

const statusUpdateSchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(['APPROVED', 'REVIEW', 'REJECTED']),
})

export type UpdateAdminDocumentRequestStatusResult = {
  success: boolean
  message: string
  request?: AdminDocumentRequestRecord
}

export type SendAdminDocumentRequestEmailResult = {
  success: boolean
  message: string
  serialNumber?: string | null
  request?: AdminDocumentRequestRecord
}

export async function createResidentDocumentRequestAction(
  formData: FormData
): Promise<CreateResidentDocumentRequestResult> {
  const resident = await getCurrentResidentFromSession()

  if (!resident) {
    return {
      success: false,
      message: 'Your session has expired. Please sign in again.',
      fieldErrors: {
        submit: 'Your session has expired. Please sign in again.',
      },
    }
  }

  const parsed = parseDocumentRequestFormData(formData)

  if (!parsed.success) {
    return {
      success: false,
      message: 'Please correct the highlighted fields.',
      fieldErrors: getZodFieldErrors(parsed.error),
    }
  }

  const definition = getDocumentDefinition(parsed.data.documentType)

  if (!definition) {
    return {
      success: false,
      message: 'Selected document type is not supported.',
      fieldErrors: {
        documentType: 'Selected document type is not supported.',
      },
    }
  }

  try {
    const relevantDetails = pickRelevantDocumentRequestData(parsed.data)
    const requestedCopies = Number(parsed.data.requestedCopies)
    
    const result = await prisma.$transaction(async (tx) => {
      await lockDocumentRequestResident(tx, resident.id)
      const history = await tx.documentRequest.findMany({
        where: { residentId: resident.id, documentTypeId: isJobSeekerDocument(definition.id)
          ? { in: [definition.id, 'FIRST_TIME_JOB_SEEKER'] } : definition.id },
        select: { id: true, documentTypeId: true, status: true, generatedAt: true, releasedAt: true },
      })
      const block = getDocumentRequestBlock(definition.id, history.map((request) => ({ ...request, documentType: request.documentTypeId })))
      if (block) return { success: false, message: block.message, existingRequestId: block.requestId }

      const documentSetting = await tx.document.findUnique({
        where: { documentTypeId: definition.id },
        select: { price: true },
      })
      const unitPrice = documentUnitPrice(definition.id, documentSetting?.price ?? definition.fee)
      const totalAmount = Math.round(unitPrice * requestedCopies)

      const createdRequest = await tx.documentRequest.create({
        data: {
          residentId: resident.id,
          documentTypeId: definition.id,
          type: definition.label,
          purpose: parsed.data.purpose.trim() || null,
          quantity: requestedCopies,
          yearsOfResidency: parsed.data.yearsOfResidency ? parseInt(parsed.data.yearsOfResidency, 10) : 0,
          placeOfBirth: parsed.data.placeOfBirth || null,
          amount: totalAmount,
          details: relevantDetails as Prisma.InputJsonValue,
          status: 'PENDING',
        },
        select: {
          id: true,
          documentTypeId: true,
          type: true,
          purpose: true,
          quantity: true,
          amount: true,
          details: true,
          serialNumber: true,
          generatedFileUrl: true,
          generatedAt: true,
          status: true,
          requestedAt: true,
        },
      })

      return {
        success: true,
        message: `${definition.label} request submitted successfully.`,
        request: serializeResidentDocumentRequest(createdRequest),
      }
    }, { isolationLevel: 'ReadCommitted', maxWait: 15000, timeout: 15000 })
    revalidatePath('/request-documents')
    revalidatePath('/my-account')
    return result
  } catch (error) {
    console.error('create resident document request failed', error)

    return {
      success: false,
      message: 'An unexpected error occurred while creating your request.',
      fieldErrors: {
        submit: 'An unexpected error occurred while creating your request.',
      },
    }
  }
}

const adminDocumentRequestRevalidationPaths = [
  '/admin/documents',
  '/admin/documents/clearance',
  '/admin/documents/indigency',
  '/admin/documents/residency',
  '/admin/documents/cedula',
  '/admin/documents/barangay-id',
  '/admin/documents/job-seeker',
  '/my-account',
  '/request-documents',
]

export async function updateAdminDocumentRequestStatusAction(input: {
  requestId: string
  status: AdminDocumentRequestStatus
}): Promise<UpdateAdminDocumentRequestStatusResult> {
  if (!(await hasAdminPermission('documents', 'write'))) {
    return {
      success: false,
      message: 'You do not have permission to update document requests.',
    }
  }

  const parsed = statusUpdateSchema.safeParse(input)
  if (!parsed.success) return { success: false, message: 'Invalid document request status update.' }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const owner = await tx.documentRequest.findUnique({ where: { id: parsed.data.requestId }, select: { residentId: true } })
      if (!owner) return { success: false, message: 'Document request not found.' }
      await lockDocumentRequestResident(tx, owner.residentId)
      const existingRequest = await tx.documentRequest.findUnique({
        where: {
          id: input.requestId,
        },
        select: {
          id: true,
          documentTypeId: true,
          type: true,
          purpose: true,
          quantity: true,
          amount: true,
          details: true,
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
              houseNumber: true,
              street: true,
            },
          },
        },
      })

      if (!existingRequest) {
        return {
          success: false,
          message: 'Document request not found.',
        }
      }

      if (existingRequest.status === input.status) {
        return {
          success: true,
          message:
            `${existingRequest.type} request is already ${input.status.toLowerCase()}.`,
          request: serializeAdminDocumentRequest(existingRequest),
        }
      }

      if (!isActiveDocumentRequest(existingRequest.status) || wasDocumentIssued(existingRequest)) {
        return { success: false, message: 'Completed or rejected requests cannot be reopened or changed.' }
      }

      const updatedRequest = await tx.documentRequest.update({
        where: {
          id: input.requestId,
        },
        data: {
          status: input.status,
        },
        select: {
          id: true,
          documentTypeId: true,
          type: true,
          purpose: true,
          quantity: true,
          amount: true,
          details: true,
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

      return {
        success: true,
        message: `${updatedRequest.type} request ${input.status.toLowerCase()} successfully.`,
        request: serializeAdminDocumentRequest(updatedRequest),
      }
    }, { isolationLevel: 'ReadCommitted', maxWait: 15000, timeout: 15000 })
    for (const path of adminDocumentRequestRevalidationPaths) revalidatePath(path)
    return result
  } catch (error) {
    console.error('update admin document request status failed', error)

    return {
      success: false,
      message: 'An unexpected error occurred while updating the document request.',
    }
  }
}

export async function sendAdminDocumentRequestEmailAction(input: {
  requestId: string
}): Promise<SendAdminDocumentRequestEmailResult> {
  if (!(await hasAdminPermission('documents', 'write'))) {
    return {
      success: false,
      message: 'You do not have permission to generate document requests.',
    }
  }

  try {
    const generatedDocument = await generateStoredDocumentRequestPdf(input.requestId)
    const emailResult = await sendDocumentRequestPdfEmail({
      email: generatedDocument.documentRequest.resident.email,
      firstName: generatedDocument.documentRequest.resident.firstName,
      documentLabel: generatedDocument.documentRequest.type,
      serialNumber: generatedDocument.serialNumber,
      fileName: generatedDocument.fileName,
      pdfBuffer: generatedDocument.pdfBuffer,
    })
    const serializedRequest = serializeAdminDocumentRequest(generatedDocument.documentRequest)

    for (const path of adminDocumentRequestRevalidationPaths) {
      revalidatePath(path)
    }

    if (!emailResult.success) {
      return {
        success: false,
        message: 'The PDF was generated, but the email could not be sent.',
        serialNumber: generatedDocument.serialNumber,
        request: serializedRequest,
      }
    }

    return {
      success: true,
      message: `${generatedDocument.documentRequest.type} PDF sent to ${generatedDocument.documentRequest.resident.email}.`,
      serialNumber: generatedDocument.serialNumber,
      request: serializedRequest,
    }
  } catch (error) {
    if (error instanceof DocumentRequestPdfGenerationError) {
      return {
        success: false,
        message: error.message,
      }
    }

    console.error('send admin document request email failed', error)

    return {
      success: false,
      message: 'An unexpected error occurred while sending the document email.',
    }
  }
}
