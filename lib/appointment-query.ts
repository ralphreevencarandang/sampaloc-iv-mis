import { queryOptions } from '@tanstack/react-query'
import type { AppointmentItem, AvailableAppointmentSlot } from '@/lib/appointment-types'
import type { ClinicScheduleInput } from '@/validations/appointment.validation'

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error('Unable to load appointments. Please refresh or sign in again.')
  return response.json()
}
export function appointmentQuery(mode: 'staff' | 'resident') {
  return queryOptions({ queryKey: ['clinic-appointments', mode],
    queryFn: () => readJson<{ appointments: AppointmentItem[]; schedule: ClinicScheduleInput | null; canWrite: boolean }>(`/api/clinic/appointments?mode=${mode}`),
    refetchInterval: 15000, refetchOnWindowFocus: true,
  })
}
export const appointmentAvailabilityQuery = queryOptions({ queryKey: ['clinic-appointment-availability'],
  queryFn: () => readJson<{ enabled: boolean; dates: { date: string; slots: AvailableAppointmentSlot[] }[] }>('/api/clinic/appointments/availability'),
  refetchInterval: 15000, refetchOnWindowFocus: true,
})
