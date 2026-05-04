'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentAdminFromSession } from '@/lib/admin-session'
import { getCurrentHealthWorkerFromSession } from '@/lib/health-worker-session'
import prismaModule from '@/lib/prisma'
import { serializeClinicMedicalRecord, type ClinicMedicalRecordListItem } from '@/lib/clinic-utils'
import {
  getZodFieldErrors,
  parseMedicalRecordFormData,
} from '@/validations/clinic.validation'

const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule

export type SubmitMedicalRecordResult = {
  success: boolean
  message: string
  fieldErrors?: Record<string, string>
  record?: ClinicMedicalRecordListItem
}

async function getCurrentMedicalRecordsActor() {
  const [healthWorker, admin] = await Promise.all([
    getCurrentHealthWorkerFromSession(),
    getCurrentAdminFromSession(),
  ])

  if (healthWorker) {
    return {
      id: healthWorker.id,
      name: healthWorker.name,
      role: healthWorker.role,
    }
  }

  if (admin) {
    return {
      id: admin.id,
      name: admin.name,
      role: admin.role,
    }
  }

  return null
}

async function getValidatedMedicalRecordSubmission(formData: FormData) {
  const actor = await getCurrentMedicalRecordsActor()

  if (!actor) {
    return {
      actor: null,
      result: {
        success: false,
        message: 'Your session has expired. Please sign in again.',
        fieldErrors: {
          submit: 'Your session has expired. Please sign in again.',
        },
      },
    }
  }

  const parsed = parseMedicalRecordFormData(formData)

  if (!parsed.success) {
    return {
      actor,
      parsed: null,
      result: {
        success: false,
        message: 'Please correct the highlighted fields.',
        fieldErrors: getZodFieldErrors(parsed.error),
      },
    }
  }

  return {
    actor,
    parsed,
  }
}

async function validateResident(patientId: string): Promise<SubmitMedicalRecordResult | null> {
  const resident = await prisma.resident.findUnique({
    where: {
      id: patientId,
    },
    select: {
      id: true,
      isArchived: true,
    },
  })

  if (!resident || resident.isArchived) {
    return {
      success: false,
      message: 'Selected resident was not found.',
      fieldErrors: {
        patientId: 'Selected resident was not found.',
      },
    }
  }

  return null
}

function getMedicalRecordSelect() {
  return {
    id: true,
    patientId: true,
    symptoms: true,
    diagnosis: true,
    treatment: true,
    prescription: true,
    date: true,
    isArchive: true,
    patient: {
      select: {
        firstName: true,
        middleName: true,
        lastName: true,
      },
    },
    checkedBy: {
      select: {
        name: true,
      },
    },
  } as const
}

export async function submitMedicalRecordAction(
  formData: FormData
): Promise<SubmitMedicalRecordResult> {
  const validation = await getValidatedMedicalRecordSubmission(formData)

  if ('result' in validation) {
    return validation.result
  }

  try {
    const residentValidation = await validateResident(validation.parsed.data.patientId)

    if (residentValidation) {
      return residentValidation
    }

    const createdRecord = await prisma.medicalRecord.create({
      data: {
        patientId: validation.parsed.data.patientId,
        symptoms: validation.parsed.data.notes,
        diagnosis: validation.parsed.data.diagnosis,
        treatment: validation.parsed.data.notes,
        prescription:
          validation.parsed.data.attachments.length > 0
            ? JSON.stringify(validation.parsed.data.attachments)
            : null,
        checkedById: validation.actor.id,
        date: new Date(validation.parsed.data.date),
      },
      select: getMedicalRecordSelect(),
    })

    revalidatePath('/clinic')
    revalidatePath('/clinic/medical-records')

    return {
      success: true,
      message: 'Medical record submitted successfully.',
      record: serializeClinicMedicalRecord(createdRecord),
    }
  } catch (error) {
    console.error('submit medical record failed', error)

    return {
      success: false,
      message: 'An unexpected error occurred while creating the medical record.',
      fieldErrors: {
        submit: 'An unexpected error occurred while creating the medical record.',
      },
    }
  }
}

export async function updateMedicalRecordAction(
  id: string,
  formData: FormData
): Promise<SubmitMedicalRecordResult> {
  const validation = await getValidatedMedicalRecordSubmission(formData)

  if ('result' in validation) {
    return validation.result
  }

  try {
    const existingRecord = await prisma.medicalRecord.findUnique({
      where: { id },
      select: { id: true, isArchive: true },
    })

    if (!existingRecord) {
      return {
        success: false,
        message: 'Medical record not found.',
      }
    }

    const residentValidation = await validateResident(validation.parsed.data.patientId)

    if (residentValidation) {
      return residentValidation
    }

    const updatedRecord = await prisma.medicalRecord.update({
      where: { id },
      data: {
        patientId: validation.parsed.data.patientId,
        symptoms: validation.parsed.data.notes,
        diagnosis: validation.parsed.data.diagnosis,
        treatment: validation.parsed.data.notes,
        prescription:
          validation.parsed.data.attachments.length > 0
            ? JSON.stringify(validation.parsed.data.attachments)
            : null,
        date: new Date(validation.parsed.data.date),
      },
      select: getMedicalRecordSelect(),
    })

    revalidatePath('/clinic')
    revalidatePath('/clinic/medical-records')

    return {
      success: true,
      message: 'Medical record updated successfully.',
      record: serializeClinicMedicalRecord(updatedRecord),
    }
  } catch (error) {
    console.error('update medical record failed', error)

    return {
      success: false,
      message: 'An unexpected error occurred while updating the medical record.',
      fieldErrors: {
        submit: 'An unexpected error occurred while updating the medical record.',
      },
    }
  }
}

export async function archiveMedicalRecordAction(id: string): Promise<SubmitMedicalRecordResult> {
  return setMedicalRecordArchiveStatusAction(id, true)
}

export async function unarchiveMedicalRecordAction(id: string): Promise<SubmitMedicalRecordResult> {
  return setMedicalRecordArchiveStatusAction(id, false)
}

async function setMedicalRecordArchiveStatusAction(
  id: string,
  isArchive: boolean
): Promise<SubmitMedicalRecordResult> {
  const actor = await getCurrentMedicalRecordsActor()

  if (!actor) {
    return {
      success: false,
      message: 'Your session has expired. Please sign in again.',
    }
  }

  try {
    const existingRecord = await prisma.medicalRecord.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existingRecord) {
      return {
        success: false,
        message: 'Medical record not found.',
      }
    }

    const updatedRecord = await prisma.medicalRecord.update({
      where: { id },
      data: { isArchive },
      select: getMedicalRecordSelect(),
    })

    revalidatePath('/clinic')
    revalidatePath('/clinic/medical-records')

    return {
      success: true,
      message: isArchive
        ? 'Medical record archived successfully.'
        : 'Medical record restored successfully.',
      record: serializeClinicMedicalRecord(updatedRecord),
    }
  } catch (error) {
    console.error('toggle medical record archive status failed', error)

    return {
      success: false,
      message: isArchive
        ? 'An unexpected error occurred while archiving the medical record.'
        : 'An unexpected error occurred while restoring the medical record.',
    }
  }
}
