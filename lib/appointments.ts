import 'server-only'
import type { Prisma } from '@/app/generated/prisma/client'
import prisma from '@/lib/prisma'
import { ACTIVE_APPOINTMENT_STATUSES, OCCUPIED_APPOINTMENT_STATUSES, AppointmentError, slotsForDate, validateAppointmentTransition, manilaDate } from '@/lib/appointment-policy'
import type { ClinicScheduleInput } from '@/validations/appointment.validation'

export const appointmentSelect = {
  id: true, residentId: true, startsAt: true, endsAt: true, reason: true, notes: true, status: true,
  createdAt: true, updatedAt: true,
  consultationStartedAt: true,
  resident: { select: { firstName: true, middleName: true, lastName: true, contactNumber: true } },
  medicalRecord: { select: { id: true } },
  history: { select: { status: true, fromStatus: true, reason: true, createdAt: true, actorType: true }, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.ClinicAppointmentSelect
export type AppointmentRow = Prisma.ClinicAppointmentGetPayload<{ select: typeof appointmentSelect }>
export function serializeAppointment(row: AppointmentRow) {
  return {
    id: row.id, residentId: row.residentId,
    residentName: [row.resident.firstName, row.resident.middleName, row.resident.lastName].filter(Boolean).join(' '),
    contactNumber: row.resident.contactNumber,
    startsAt: row.startsAt.toISOString(), endsAt: row.endsAt.toISOString(), status: row.status,
    reason: row.reason, notes: row.notes, medicalRecordId: row.medicalRecord?.id ?? null,
    updatedAt: row.updatedAt.toISOString(),
    consultationStartedAt: row.consultationStartedAt?.toISOString() ?? null,
    history: row.history.map(h => ({ ...h, createdAt: h.createdAt.toISOString() })),
  }
}
export async function appointmentLock(tx: Prisma.TransactionClient) {
  // All appointment writers, including schedule edits and finalization, acquire this first.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(74120936)::text`
}
export const appointmentTransactionOptions = { isolationLevel: 'ReadCommitted' as const, maxWait: 30000, timeout: 30000 }

export async function availableSlots(date: string) {
  const schedule = await prisma.clinicSchedule.findUnique({ where: { id: 'clinic' } })
  const slots = slotsForDate(schedule, date)
  if (!schedule || !slots.length) return []
  const occupied = await prisma.clinicAppointment.findMany({
    where: { status: { in: [...OCCUPIED_APPOINTMENT_STATUSES] }, startsAt: { lt: slots[slots.length - 1].endsAt }, endsAt: { gt: slots[0].startsAt } },
    select: { startsAt: true, endsAt: true },
  })
  return slots.flatMap(slot => {
    const remaining = schedule.capacity - occupied.filter(a => a.startsAt < slot.endsAt && a.endsAt > slot.startsAt).length
    return remaining > 0 ? [{ startsAt: slot.startsAt.toISOString(), endsAt: slot.endsAt.toISOString(), remaining }] : []
  })
}
export async function bookAppointment(residentId: string, input: { startsAt: string; reason: string; notes: string }) {
  return prisma.$transaction(async tx => {
    await appointmentLock(tx)
    await tx.$queryRaw`SELECT "id" FROM "Resident" WHERE "id" = ${residentId} FOR UPDATE`
    const resident = await tx.resident.findUnique({ where: { id: residentId }, select: { status: true, isArchived: true } })
    if (!resident || resident.status !== 'APPROVED' || resident.isArchived) throw new AppointmentError('An active approved resident account is required.')
    if (await tx.clinicAppointment.count({ where: { residentId, status: { in: [...ACTIVE_APPOINTMENT_STATUSES] } } })) throw new AppointmentError('You already have an active appointment. Cancel it or wait for it to be finalized.')
    const schedule = await tx.clinicSchedule.findUnique({ where: { id: 'clinic' } })
    const start = new Date(input.startsAt)
    const slot = slotsForDate(schedule, manilaDate(start)).find(s => s.startsAt.getTime() === start.getTime())
    if (!slot || !schedule) throw new AppointmentError('This appointment slot is no longer available. Refresh availability.')
    const count = await tx.clinicAppointment.count({ where: {
      startsAt: { lt: slot.endsAt }, endsAt: { gt: slot.startsAt }, status: { in: [...OCCUPIED_APPOINTMENT_STATUSES] },
    } })
    if (count >= schedule.capacity) throw new AppointmentError('This slot is fully booked. Please choose another time.')
    return tx.clinicAppointment.create({ data: {
      residentId, ...slot, reason: input.reason, notes: input.notes || null,
      history: { create: { status: 'PENDING', actorId: residentId, actorType: 'RESIDENT' } },
    }, select: appointmentSelect })
  }, appointmentTransactionOptions)
}
export async function changeAppointment(input: { id: string; status: 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'NO_SHOW'; reason: string }, actor: { id: string; resident: boolean }) {
  return prisma.$transaction(async tx => {
    await appointmentLock(tx)
    const row = await tx.clinicAppointment.findUnique({ where: { id: input.id } })
    if (!row || (actor.resident && row.residentId !== actor.id)) throw new AppointmentError('Appointment not found.')
    if (actor.resident) {
      await tx.$queryRaw`SELECT "id" FROM "Resident" WHERE "id" = ${actor.id} FOR UPDATE`
      const resident = await tx.resident.findUnique({ where: { id: actor.id }, select: { isArchived: true, status: true } })
      if (!resident || resident.isArchived || resident.status !== 'APPROVED') throw new AppointmentError('An active approved resident account is required.')
    }
    validateAppointmentTransition(row.status, input.status, row.startsAt, row.endsAt, actor.resident)
    if (input.status === 'NO_SHOW' && row.consultationStartedAt) throw new AppointmentError('A consultation has already started. Finalize it or cancel the appointment instead.')
    return tx.clinicAppointment.update({ where: { id: row.id }, data: {
      status: input.status,
      history: { create: { fromStatus: row.status, status: input.status, reason: input.reason || null, actorId: actor.id, actorType: actor.resident ? 'RESIDENT' : 'STAFF' } },
    }, select: appointmentSelect })
  }, appointmentTransactionOptions)
}
export async function saveClinicSchedule(input: ClinicScheduleInput) {
  return prisma.$transaction(async tx => {
    await appointmentLock(tx)
    const old = await tx.clinicSchedule.findUnique({ where: { id: 'clinic' } })
    if ((old?.version ?? 0) !== input.version) throw new AppointmentError('Schedule changed by another staff member. Refresh before saving.')
    return tx.clinicSchedule.upsert({ where: { id: 'clinic' },
      create: { ...input, id: 'clinic', version: 1 }, update: { ...input, version: { increment: 1 } },
    })
  }, appointmentTransactionOptions)
}
export async function startAppointmentConsultation(id: string, actorId: string) {
  return prisma.$transaction(async tx => {
    await appointmentLock(tx)
    const row = await tx.clinicAppointment.findUnique({ where: { id }, include: { medicalRecord: { select: { id: true } } } })
    if (!row || row.status !== 'CONFIRMED' || row.medicalRecord) throw new AppointmentError('Only a confirmed appointment without a finalized consultation can be started.')
    await tx.$queryRaw`SELECT "id" FROM "Resident" WHERE "id" = ${row.residentId} FOR UPDATE`
    const resident = await tx.resident.findUnique({ where: { id: row.residentId }, select: { isArchived: true, status: true } })
    if (!resident || resident.isArchived || resident.status !== 'APPROVED') throw new AppointmentError('This patient account is no longer active.')
    // Reopening or concurrent starts resume the same consultation and timestamp.
    if (row.consultationStartedAt) return tx.clinicAppointment.findUniqueOrThrow({ where: { id }, select: appointmentSelect })
    return tx.clinicAppointment.update({ where: { id }, data: {
      consultationStartedAt: new Date(), consultationStartedById: actorId,
      history: { create: { fromStatus: 'CONFIRMED', status: 'CONFIRMED', reason: 'Consultation started', actorId, actorType: 'STAFF' } },
    }, select: appointmentSelect })
  }, appointmentTransactionOptions)
}

export async function lockAppointmentConsultation(tx: Prisma.TransactionClient, id: string, patientId: string, actorId: string) {
  await appointmentLock(tx)
  const row = await tx.clinicAppointment.findUnique({ where: { id }, include: { medicalRecord: { select: { id: true } } } })
  if (!row || row.residentId !== patientId) throw new AppointmentError('Appointment and patient do not match.')
  if (row.medicalRecord) throw new AppointmentError('A consultation already exists for this appointment. Open Medical Records to view it.')
  validateAppointmentTransition(row.status, 'COMPLETED', row.startsAt, row.endsAt, false)
  if (!row.consultationStartedAt) throw new AppointmentError('Start the consultation from the appointment before finalizing it.')
  await tx.$queryRaw`SELECT "id" FROM "Resident" WHERE "id" = ${patientId} FOR UPDATE`
  const resident = await tx.resident.findUnique({ where: { id: patientId }, select: { isArchived: true, status: true } })
  if (!resident || resident.isArchived || resident.status !== 'APPROVED') throw new AppointmentError('This patient account is no longer active.')
  await tx.clinicAppointment.update({ where: { id }, data: { status: 'COMPLETED', history: { create: {
    fromStatus: 'CONFIRMED', status: 'COMPLETED', actorId, actorType: 'STAFF',
  } } } })
  return row.consultationStartedAt
}
