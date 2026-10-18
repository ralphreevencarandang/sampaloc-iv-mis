import { z } from 'zod'

export const appointmentStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW'] as const
export const appointmentIdSchema = z.string().trim().min(1).max(100)
export const bookingSchema = z.object({
  startsAt: z.iso.datetime({ offset: true }),
  reason: z.string().trim().min(1, 'Reason for visit is required.').max(2000),
  notes: z.string().trim().max(2000).optional().default(''),
})
export const appointmentChangeSchema = z.object({
  id: z.string().min(1).max(100),
  status: z.enum(['CONFIRMED', 'CANCELLED', 'REJECTED', 'NO_SHOW']),
  reason: z.string().trim().max(1000).optional().default(''),
}).refine(v => !['CANCELLED', 'REJECTED'].includes(v.status) || v.reason.length > 0, {
  message: 'A reason is required for cancellation or rejection.', path: ['reason'],
})
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
export const clinicScheduleSchema = z.object({
  operatingDays: z.array(z.number().int().min(0).max(6)).min(1).max(7).refine(v => new Set(v).size === v.length),
  opensAt: time,
  closesAt: time,
  slotMinutes: z.number().int().min(5).max(240),
  capacity: z.number().int().min(1).max(100),
  enabled: z.boolean(),
  version: z.number().int().nonnegative(),
}).refine(v => v.opensAt < v.closesAt, { message: 'Closing time must follow opening time.', path: ['closesAt'] })
  .refine(v => {
    const minutes = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3))
    return minutes(v.closesAt) - minutes(v.opensAt) >= v.slotMinutes
  }, { message: 'Operating hours must contain at least one full slot.', path: ['slotMinutes'] })

export type ClinicScheduleInput = z.infer<typeof clinicScheduleSchema>
