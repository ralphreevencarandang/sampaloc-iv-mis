'use server'

import { revalidatePath } from 'next/cache'
import type { Prisma } from '@/app/generated/prisma/client'
import { getCurrentAdminFromSession } from '@/lib/admin-session'
import { uploadImageToCloudinary } from '@/lib/cloudinary'
import { sendDocumentRequestPdfEmail } from '@/lib/nodemailer'
import prismaModule from '@/lib/prisma'
import { getDocumentDefinition } from '@/lib/document-request-catalog'
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
}

type AdminDocumentRequestStatus = 'APPROVED' | 'REVIEW'

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
    
    let proofOfPaymentUrl = null

    if (parsed.data.paymentProof) {
      const uploadResult = await uploadImageToCloudinary(parsed.data.paymentProof, {
        folder: 'document-requests/payments',
        publicIdPrefix: resident.id,
        assetLabel: 'Proof of payment',
      })
      proofOfPaymentUrl = uploadResult.secure_url
    }

    const createdRequest = await prisma.documentRequest.create({
      data: {
        residentId: resident.id,
        documentTypeId: definition.id,
        type: definition.label,
        purpose: parsed.data.purpose.trim() || null,
        quantity: Number(parsed.data.requestedCopies),
        yearsOfResidency: parsed.data.yearsOfResidency ? parseInt(parsed.data.yearsOfResidency, 10) : 0,
        placeOfBirth: parsed.data.placeOfBirth || null,
        amount: definition.fee,
        details: relevantDetails as Prisma.InputJsonValue,
        referenceLast4: parsed.data.referenceLast4 || null,
        proofOfPaymentUrl,
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
        referenceLast4: true,
        proofOfPaymentUrl: true,
        serialNumber: true,
        generatedFileUrl: true,
        generatedAt: true,
        status: true,
        requestedAt: true,
      },
    })

    revalidatePath('/request-documents')
    revalidatePath('/my-account')

    return {
      success: true,
      message: `${definition.label} request submitted successfully.`,
      request: serializeResidentDocumentRequest(createdRequest),
    }
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
]

export async function updateAdminDocumentRequestStatusAction(input: {
  requestId: string
  status: AdminDocumentRequestStatus
}): Promise<UpdateAdminDocumentRequestStatusResult> {
  const currentAdmin = await getCurrentAdminFromSession()

  if (!currentAdmin) {
    return {
      success: false,
      message: 'Your admin session has expired. Please sign in again.',
    }
  }

  try {
    const existingRequest = await prisma.documentRequest.findUnique({
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
        referenceLast4: true,
        proofOfPaymentUrl: true,
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
          input.status === 'APPROVED'
            ? `${existingRequest.type} request is already approved.`
            : `${existingRequest.type} request is already under review.`,
        request: serializeAdminDocumentRequest(existingRequest),
      }
    }

    const updatedRequest = await prisma.documentRequest.update({
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
        referenceLast4: true,
        proofOfPaymentUrl: true,
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

    for (const path of adminDocumentRequestRevalidationPaths) {
      revalidatePath(path)
    }

    return {
      success: true,
      message:
        input.status === 'APPROVED'
          ? `${updatedRequest.type} request approved successfully.`
          : `${updatedRequest.type} request moved to review successfully.`,
      request: serializeAdminDocumentRequest(updatedRequest),
    }
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
  const currentAdmin = await getCurrentAdminFromSession()

  if (!currentAdmin) {
    return {
      success: false,
      message: 'Your admin session has expired. Please sign in again.',
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
