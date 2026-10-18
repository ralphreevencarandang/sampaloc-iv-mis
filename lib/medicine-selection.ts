import { medicineAvailability, type ClinicMedicine } from './medicine-inventory'

export function medicineSelectionOptions(medicines: ClinicMedicine[], selectedIds: string[], search = '') {
  const selected = new Set(selectedIds)
  const query = search.trim().toLowerCase()
  return medicines.filter(item => !selected.has(item.id)
    && medicineAvailability(item).unavailableReason !== 'Expired'
    && item.name.toLowerCase().includes(query))
}

export function selectMedicine(current: Record<string, string>, medicine: ClinicMedicine) {
  if (medicine.id in current || medicineAvailability(medicine).unavailableReason) return current
  return { ...current, [medicine.id]: '1' }
}
