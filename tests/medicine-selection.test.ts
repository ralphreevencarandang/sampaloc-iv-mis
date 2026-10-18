import assert from 'node:assert/strict'
import { test } from 'node:test'
import { medicineSelectionOptions, selectMedicine } from '../lib/medicine-selection'
import type { ClinicMedicine } from '../lib/medicine-inventory'

const medicines: ClinicMedicine[] = [
  { id: 'a', name: 'Synthetic Tablet', quantity: 12, unit: 'tablets', expiresOn: '2099-01-01', status: 'Available', unavailableReason: null },
  { id: 'b', name: 'Synthetic Syrup', quantity: 4, unit: 'bottles', expiresOn: '2099-01-01', status: 'Low Stock', unavailableReason: null },
  { id: 'c', name: 'Expired Tablet', quantity: 8, unit: 'tablets', expiresOn: '2000-01-01', status: 'Low Stock', unavailableReason: 'Expired' },
  { id: 'd', name: 'Empty Tablet', quantity: 0, unit: 'tablets', expiresOn: '2099-01-01', status: 'Out of Stock', unavailableReason: 'Out of stock' },
  { id: 'e', name: 'Unknown Tablet', quantity: 5, unit: 'tablets', expiresOn: null, status: 'Low Stock', unavailableReason: 'Expiry date required' },
]
test('medicine options search names, exclude expired/selected entries and retain unavailable labels for disabled options', () => {
  assert.deepEqual(medicineSelectionOptions(medicines, [], '  TABLET ').map(m => m.id), ['a', 'd', 'e'])
  assert.deepEqual(medicineSelectionOptions(medicines, ['a']).map(m => m.id), ['b', 'd', 'e'])
  assert.equal(medicineSelectionOptions(medicines, [], 'not found').length, 0)
})
test('multiple medicine selection is unique by inventory ID and cannot add expired, empty or unknown-expiry entries', () => {
  const first = selectMedicine({}, medicines[0])
  const second = selectMedicine(first, medicines[1])
  assert.deepEqual(second, { a: '1', b: '1' })
  assert.equal(selectMedicine(second, medicines[0]), second)
  for (const medicine of medicines.slice(2)) assert.equal(selectMedicine(second, medicine), second)
})
