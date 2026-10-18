'use server'

import { revalidatePath } from 'next/cache'
import { AppointmentError } from '@/lib/appointment-policy'
import { lockAppointmentConsultation, appointmentTransactionOptions } from '@/lib/appointments'
import { DispensingError } from '@/lib/medicine-dispensing'
import { AdminRole } from '@/app/generated/prisma/enums'
import { getCurrentAdminFromSession } from '@/lib/admin-session'
import { getCurrentHealthWorkerFromSession } from '@/lib/health-worker-session'
import prismaModule from '@/lib/prisma'
import { serializeClinicMedicalRecord, type ClinicMedicalRecordListItem } from '@/lib/clinic-utils'
import { canAccessResource } from '@/lib/rbac'
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

  if (actor.role !== AdminRole.HEALTH_WORKER && !canAccessResource(actor.role, 'health', 'write')) {
    return {
      actor: null,
      result: {
        success: false,
        message: 'You do not have permission to update medical records.',
        fieldErrors: {
          submit: 'You do not have permission to update medical records.',
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
    visitType: true,
    appointmentId: true,
    symptoms: true,
    diagnosis: true,
    treatment: true,
    prescription: true,
    assignedNurse: true,
    medicinesGiven: true,
    dispensingTransactions: { select: { itemName: true, itemUnit: true, quantity: true }, orderBy: { date: 'asc' } },
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

  if ('result' in validation && validation.result) {
    return validation.result
  }

  try {
    const residentValidation = await validateResident(validation.parsed.data.patientId)

    if (residentValidation) {
      return residentValidation
    }

    const appointmentValue = formData.get('appointmentId')
    if (appointmentValue !== null && (typeof appointmentValue !== 'string' || !appointmentValue || appointmentValue.length > 100)) {
      return { success: false, message: 'Invalid appointment.' }
    }
    const appointmentId = typeof appointmentValue === 'string' ? appointmentValue : null
    const createdRecord = await prisma.$transaction(async tx => {
      const actualStartedAt = appointmentId ? await lockAppointmentConsultation(tx, appointmentId, validation.parsed.data.patientId, validation.actor.id) : null
      return tx.medicalRecord.create({
      data: {
        patientId: validation.parsed.data.patientId,
        visitType: appointmentId ? 'APPOINTMENT' : 'WALK_IN',
        appointmentId,
        symptoms: validation.parsed.data.notes,
        diagnosis: validation.parsed.data.diagnosis,
        treatment: validation.parsed.data.notes,
        assignedNurse: validation.parsed.data.assignedNurse || null,
        medicinesGiven: [],
        prescription:
          validation.parsed.data.attachments.length > 0
            ? JSON.stringify(validation.parsed.data.attachments)
            : null,
        checkedById: validation.actor.id,
        date: actualStartedAt ?? new Date(validation.parsed.data.date),
      },
      select: getMedicalRecordSelect(),
      })
    }, appointmentTransactionOptions)

    revalidatePath('/clinic')
    revalidatePath('/clinic/medical-records')
    revalidatePath('/clinic/appointments')
    revalidatePath('/my-account')
    revalidatePath('/admin/health')

    return {
      success: true,
      message: 'Medical record submitted successfully.',
      record: serializeClinicMedicalRecord(createdRecord),
    }
  } catch (error) {
    if (error instanceof AppointmentError) return { success: false, message: error.message }
    console.error('submit medical record failed')

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

  if ('result' in validation && validation.result) {
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

    const updatedRecord = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "MedicalRecord" WHERE "id" = ${id} FOR UPDATE`
      const current = await tx.medicalRecord.findUnique({ where: { id }, select: { patientId: true, appointmentId: true, date: true } })
      if (!current) throw new DispensingError('Medical record not found.')
      if (current.appointmentId && current.patientId !== validation.parsed.data.patientId) throw new DispensingError('The patient cannot be changed for an appointment consultation.')
      const hasDispensing = await tx.inventoryTransaction.count({ where: { medicalRecordId: id } })
      if (hasDispensing && current.patientId !== validation.parsed.data.patientId) {
        throw new DispensingError('The patient cannot be changed after medicines have been dispensed. Create a separate consultation instead.')
      }
      return tx.medicalRecord.update({
        where: { id },
        data: {
          patientId: validation.parsed.data.patientId,
          symptoms: validation.parsed.data.notes,
          diagnosis: validation.parsed.data.diagnosis,
          treatment: validation.parsed.data.notes,
          assignedNurse: validation.parsed.data.assignedNurse || null,
          prescription:
            validation.parsed.data.attachments.length > 0
              ? JSON.stringify(validation.parsed.data.attachments)
              : null,
          date: current.appointmentId ? current.date : new Date(validation.parsed.data.date),
        },
        select: getMedicalRecordSelect(),
      })
    }, { isolationLevel: 'ReadCommitted', maxWait: 15000, timeout: 15000 })

    revalidatePath('/clinic')
    revalidatePath('/clinic/medical-records')

    return {
      success: true,
      message: 'Medical record updated successfully.',
      record: serializeClinicMedicalRecord(updatedRecord),
    }
  } catch (error) {
    if (error instanceof DispensingError) return { success: false, message: error.message }
    console.error('update medical record failed')

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

  if (actor.role !== AdminRole.HEALTH_WORKER && !canAccessResource(actor.role, 'health', 'write')) {
    return {
      success: false,
      message: 'You do not have permission to archive medical records.',
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
