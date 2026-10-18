import type { serializeAppointment } from './appointments'
export type AppointmentItem = ReturnType<typeof serializeAppointment>
export type AvailableAppointmentSlot = { startsAt: string; endsAt: string; remaining: number }
