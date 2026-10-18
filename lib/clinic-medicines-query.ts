import type { ClinicMedicine } from '@/lib/medicine-inventory'

async function fetchClinicMedicines(): Promise<ClinicMedicine[]> {
  const response = await fetch('/api/clinic/medicines', { cache: 'no-store' })
  if (!response.ok) throw new Error('Unable to load medicine stock. Please try again.')
  return response.json() as Promise<ClinicMedicine[]>
}

// Both the medicine list and dispensing controls observe the same cache entry.
export const clinicMedicinesQueryOptions = {
  queryKey: ['clinic-medicines'],
  queryFn: fetchClinicMedicines,
  refetchInterval: 15000,
  refetchOnWindowFocus: 'always',
} as const
