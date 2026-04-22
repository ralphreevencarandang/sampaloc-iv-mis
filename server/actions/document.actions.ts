'use server'

import { revalidatePath } from 'next/cache'
import prismaModule from '@/lib/prisma'
import { getCurrentResidentFromSession } from '@/lib/resident-session'
import { getDocumentDefinition } from '@/lib/document-request-catalog'
import {
  getZodFieldErrors,
  parseDocumentRequestFormData,
  type DocumentRequestInput,
} from '@/validations/document.validation'

const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule

export type CreateResidentDocumentRequestResult = {
  success: boolean
  message: string
  fieldErrors?: Record<string, string>
}

function buildPurposeSummary(input: DocumentRequestInput) {
  const definition = getDocumentDefinition(input.documentType)
  const details: string[] = [`Purpose: ${input.purpose}`, `Copies: ${input.requestedCopies}`]

  if (input.documentType === 'clearance' && input.clearanceFor) {
    details.push(`Clearance for: ${input.clearanceFor}`)
  }

  if (input.documentType === 'indigency' && input.assistanceProgram) {
    details.push(`Program / institution: ${input.assistanceProgram}`)
  }

  if (input.documentType === 'residency' && input.yearsOfResidency) {
    details.push(`Years of residency: ${input.yearsOfResidency}`)
  }

  if (input.documentType === 'cedula') {
    if (input.cedulaYear) details.push(`Cedula year: ${input.cedulaYear}`)
    if (input.annualIncome) details.push(`Annual income: ${input.annualIncome}`)
  }

  if (input.documentType === 'barangay-id') {
    if (input.emergencyContactName) details.push(`Emergency contact: ${input.emergencyContactName}`)
    if (input.emergencyContactNumber) details.push(`Emergency number: ${input.emergencyContactNumber}`)
  }

  if (input.documentType === 'first-time-job-seeker') {
    if (input.schoolOrTraining) details.push(`School / training: ${input.schoolOrTraining}`)
    if (input.targetEmployer) details.push(`Target employer / industry: ${input.targetEmployer}`)
  }

  return `${definition?.label ?? input.documentType}\n${details.join('\n')}`
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
    await prisma.documentRequest.create({
      data: {
        residentId: resident.id,
        type: definition.label,
        purpose: buildPurposeSummary(parsed.data),
      },
    })

    revalidatePath('/request-documents')
    revalidatePath('/my-account')

    return {
      success: true,
      message: `${definition.label} request submitted successfully.`,
    }
  } catch (error) {
    console.error('create resident document request failed', error)

    return {
      success: false,
      message: 'An unexpected error occurred while submitting your request.',
      fieldErrors: {
        submit: 'An unexpected error occurred while submitting your request.',
      },
    }
  }
}
