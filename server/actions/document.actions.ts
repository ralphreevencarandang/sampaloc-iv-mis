'use server'

import { revalidatePath } from 'next/cache'
import prismaModule from '@/lib/prisma'
import { getDocumentDefinition } from '@/lib/document-request-catalog'
import {
  serializeResidentDocumentRequest,
  type ResidentDocumentRequestRecord,
} from '@/lib/document-request-utils'
import { getCurrentResidentFromSession } from '@/lib/resident-session'
import {
  getZodFieldErrors,
  parseDocumentPaymentFormData,
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

export type SubmitResidentDocumentPaymentResult = {
  success: boolean
  message: string
  fieldErrors?: Record<string, string>
  request?: ResidentDocumentRequestRecord
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
    const createdRequest = await prisma.documentRequest.create({
      data: {
        residentId: resident.id,
        documentTypeId: definition.id,
        type: definition.label,
        purpose: parsed.data.purpose.trim() || null,
        requestedCopies: Number(parsed.data.requestedCopies),
        amount: definition.fee,
        details: relevantDetails,
        status: 'PENDING_PAYMENT',
      },
      select: {
        id: true,
        documentTypeId: true,
        type: true,
        purpose: true,
        requestedCopies: true,
        amount: true,
        details: true,
        paymentReferenceDigits: true,
        paymentProofFileName: true,
        status: true,
        requestedAt: true,
      },
    })

    revalidatePath('/request-documents')
    revalidatePath('/my-account')

    return {
      success: true,
      message: `${definition.label} request created. Continue to payment.`,
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

export async function submitResidentDocumentPaymentAction(
  formData: FormData
): Promise<SubmitResidentDocumentPaymentResult> {
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

  const parsed = parseDocumentPaymentFormData(formData)

  if (!parsed.success) {
    return {
      success: false,
      message: 'Please correct the highlighted payment fields.',
      fieldErrors: getZodFieldErrors(parsed.error),
    }
  }

  const existingRequest = await prisma.documentRequest.findFirst({
    where: {
      id: parsed.data.requestId,
      residentId: resident.id,
    },
    select: {
      id: true,
      documentTypeId: true,
      type: true,
      purpose: true,
      requestedCopies: true,
      amount: true,
      details: true,
      paymentReferenceDigits: true,
      paymentProofFileName: true,
      status: true,
      requestedAt: true,
    },
  })

  if (!existingRequest) {
    return {
      success: false,
      message: 'Document request not found.',
      fieldErrors: {
        requestId: 'Document request not found.',
      },
    }
  }

  if (existingRequest.status !== 'PENDING_PAYMENT') {
    return {
      success: false,
      message: 'This request is no longer awaiting payment.',
      fieldErrors: {
        requestId: 'This request is no longer awaiting payment.',
      },
    }
  }

  try {
    const updatedRequest = await prisma.documentRequest.update({
      where: { id: existingRequest.id },
      data: {
        paymentReferenceDigits: parsed.data.paymentReferenceDigits,
        paymentProofFileName: parsed.data.paymentProof.name,
        paymentProofMimeType: parsed.data.paymentProof.type || null,
        status: 'SUBMITTED',
      },
      select: {
        id: true,
        documentTypeId: true,
        type: true,
        purpose: true,
        requestedCopies: true,
        amount: true,
        details: true,
        paymentReferenceDigits: true,
        paymentProofFileName: true,
        status: true,
        requestedAt: true,
      },
    })

    revalidatePath('/request-documents')
    revalidatePath('/my-account')

    return {
      success: true,
      message: `${updatedRequest.type} payment submitted successfully.`,
      request: serializeResidentDocumentRequest(updatedRequest),
    }
  } catch (error) {
    console.error('submit resident document payment failed', error)

    return {
      success: false,
      message: 'An unexpected error occurred while submitting payment.',
      fieldErrors: {
        submit: 'An unexpected error occurred while submitting payment.',
      },
    }
  }
}
