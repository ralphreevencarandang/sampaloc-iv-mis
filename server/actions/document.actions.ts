'use server'

import { revalidatePath } from 'next/cache'
import { uploadImageToCloudinary } from '@/lib/cloudinary'
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
        details: relevantDetails,
        referenceLast4: parsed.data.referenceLast4 || null,
        proofOfPaymentUrl,
        status: 'SUBMITTED',
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
