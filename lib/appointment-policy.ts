import type { appointmentStatuses, ClinicScheduleInput } from '../validations/appointment.validation'

export type AppointmentStatusValue = typeof appointmentStatuses[number]
export const ACTIVE_APPOINTMENT_STATUSES = ['PENDING', 'CONFIRMED'] as const
export const OCCUPIED_APPOINTMENT_STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'] as const
export class AppointmentError extends Error {}
export function manilaDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}
export function appointmentTime(value: string | Date) {
  return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}
export function appointmentLabel(value: string | Date) {
  return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
export function slotsForDate(schedule: Pick<ClinicScheduleInput, 'enabled' | 'operatingDays' | 'opensAt' | 'closesAt' | 'slotMinutes'> | null, date: string, now = new Date()) {
  if (!schedule?.enabled || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return []
  const midnight = new Date(`${date}T00:00:00+08:00`)
  if (Number.isNaN(midnight.getTime()) || manilaDate(midnight) !== date || date < manilaDate(now)) return []
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay()
  if (!schedule.operatingDays.includes(weekday)) return []
  const minute = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3))
  const slots: { startsAt: Date; endsAt: Date }[] = []
  for (let m = minute(schedule.opensAt); m + schedule.slotMinutes <= minute(schedule.closesAt); m += schedule.slotMinutes) {
    const startsAt = new Date(midnight.getTime() + m * 60000)
    if (startsAt > now) slots.push({ startsAt, endsAt: new Date(startsAt.getTime() + schedule.slotMinutes * 60000) })
  }
  return slots
}
export function validateAppointmentTransition(from: AppointmentStatusValue, to: AppointmentStatusValue, startsAt: Date, endsAt: Date, resident: boolean, now = new Date()) {
  if (!ACTIVE_APPOINTMENT_STATUSES.some(s => s === from)) throw new AppointmentError('This appointment has already been finalized. Refresh the list.')
  if (resident) {
    if (to !== 'CANCELLED' || now >= startsAt) throw new AppointmentError('You can cancel only before the appointment starts.')
    return
  }
  const allowed = from === 'PENDING' ? ['CONFIRMED', 'REJECTED', 'CANCELLED'] : ['COMPLETED', 'CANCELLED', 'NO_SHOW']
  if (!allowed.includes(to)) throw new AppointmentError('This status change is not allowed.')
  if (to === 'CONFIRMED' && now >= endsAt) throw new AppointmentError('This appointment time has already passed.')
  if (to === 'NO_SHOW' && now < endsAt) throw new AppointmentError('Mark no-show only after the appointment slot ends.')
}
