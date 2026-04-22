'use server'

import { getCurrentHealthWorkerFromSession } from '@/lib/health-worker-session'
import {
  getZodFieldErrors,
  parseMedicalRecordFormData,
  type MedicalRecordSubmissionInput,
} from '@/validations/clinic.validation'

export type SubmitMedicalRecordResult = {
  success: boolean
  message: string
  fieldErrors?: Record<string, string>
  record?: MedicalRecordSubmissionInput & {
    id: string
    patientName: string
    createdAt: string
  }
}

export async function submitMedicalRecordAction(
  formData: FormData
): Promise<SubmitMedicalRecordResult> {
  const healthWorker = await getCurrentHealthWorkerFromSession()

  if (!healthWorker) {
    return {
      success: false,
      message: 'Your session has expired. Please sign in again.',
      fieldErrors: {
        submit: 'Your session has expired. Please sign in again.',
      },
    }
  }

  const parsed = parseMedicalRecordFormData(formData)

  if (!parsed.success) {
    return {
      success: false,
      message: 'Please correct the highlighted fields.',
      fieldErrors: getZodFieldErrors(parsed.error),
    }
  }

  const record = {
    ...parsed.data,
    id: `mock-record-${Date.now()}`,
    patientName: `Resident ${parsed.data.patientId.slice(-4).toUpperCase()}`,
    createdAt: new Date().toISOString(),
  }

  return {
    success: true,
    message: 'Medical record submitted successfully.',
    record,
  }
}
