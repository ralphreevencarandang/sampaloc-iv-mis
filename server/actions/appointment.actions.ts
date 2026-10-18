'use server'

import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { appointmentResident, appointmentStaff } from '@/lib/appointment-authorization'
import { bookAppointment, changeAppointment, saveClinicSchedule, startAppointmentConsultation, serializeAppointment } from '@/lib/appointments'
import { AppointmentError } from '@/lib/appointment-policy'
import { bookingSchema, appointmentChangeSchema, clinicScheduleSchema, appointmentIdSchema } from '@/validations/appointment.validation'
import { sendAppointmentNotification } from '@/lib/appointment-email'

function refreshAppointments() {
  for (const path of ['/clinic', '/clinic/appointments', '/my-account', '/clinic-appointment', '/admin/health/appointments']) revalidatePath(path)
}
function failure(error: unknown) {
  if (error instanceof AppointmentError) return { success: false, message: error.message }
  console.error('Clinic appointment operation failed')
  return { success: false, message: 'Unable to update the appointment. Refresh and try again.' }
}
export async function bookClinicAppointmentAction(input: unknown) {
  const resident = await appointmentResident()
  if (!resident) return { success: false, message: 'Please sign in with an approved resident account.' }
  const parsed = bookingSchema.safeParse(input)
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message }
  try {
    const row = await bookAppointment(resident.id, parsed.data)
    after(() => sendAppointmentNotification(row.id, row.status))
    refreshAppointments()
    return { success: true, message: 'Appointment submitted. Please wait for clinic confirmation.' }
  } catch (error) { return failure(error) }
}
export async function changeClinicAppointmentAction(input: unknown, mode: 'resident' | 'staff') {
  const actor = mode === 'resident' ? await appointmentResident() : mode === 'staff' ? await appointmentStaff('write') : null
  if (!actor) return { success: false, message: 'You do not have permission to update this appointment.' }
  const parsed = appointmentChangeSchema.safeParse(input)
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message }
  try {
    const row = await changeAppointment(parsed.data, { id: actor.id, resident: mode === 'resident' })
    if (row.status !== 'NO_SHOW') after(() => sendAppointmentNotification(row.id, row.status))
    refreshAppointments()
    return { success: true, message: 'Appointment status updated.' }
  } catch (error) { return failure(error) }
}
export async function saveClinicScheduleAction(input: unknown) {
  if (!await appointmentStaff('write')) return { success: false, message: 'You do not have permission to change the clinic schedule.' }
  const parsed = clinicScheduleSchema.safeParse(input)
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message }
  try {
    await saveClinicSchedule(parsed.data)
    refreshAppointments()
    return { success: true, message: 'Schedule saved. Existing bookings retain their original times.' }
  } catch (error) { return failure(error) }
}

export async function startAppointmentConsultationAction(input: unknown) {
  const actor = await appointmentStaff('write')
  if (!actor) return { success: false as const, message: 'You do not have permission to start a consultation.' }
  const parsed = appointmentIdSchema.safeParse(input)
  if (!parsed.success) return { success: false as const, message: 'Invalid appointment.' }
  try {
    const row = await startAppointmentConsultation(parsed.data, actor.id)
    refreshAppointments()
    return { success: true as const, message: 'Consultation ready.', appointment: serializeAppointment(row) }
  } catch (error) { return { ...failure(error), success: false as const } }
}
