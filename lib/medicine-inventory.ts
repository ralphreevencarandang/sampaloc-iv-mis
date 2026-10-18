export type ClinicMedicine = {
  id: string
  name: string
  quantity: number
  unit: string
  expiresOn: string | null
  status: 'Available' | 'Low Stock' | 'Out of Stock'
  unavailableReason: string | null
}

export type DispensingHistoryEntry = {
  id: string
  medicine: string
  quantity: number
  unit: string
  patient: string
  healthWorker: string
  date: string
}

export type ClinicDispensingData = {
  canDispense: boolean
  history: DispensingHistoryEntry[]
}

// Barangay dates use Philippine local time, independent of the server timezone.
export function medicineDateToday(now = new Date()) {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export function medicineAvailability(item: {
  quantity: number
  expiresOn: string | null
}, today = medicineDateToday()): Pick<ClinicMedicine, 'status' | 'unavailableReason'> {
  return {
    status: item.quantity <= 0 ? 'Out of Stock' : item.quantity <= 10 ? 'Low Stock' : 'Available',
    unavailableReason: !item.expiresOn ? 'Expiry date required' : item.expiresOn < today
      ? 'Expired' : item.quantity <= 0 ? 'Out of stock' : null,
  }
}
