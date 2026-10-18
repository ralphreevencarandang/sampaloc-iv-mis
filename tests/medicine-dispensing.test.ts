import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomUUID } from 'node:crypto'
import { medicineAvailability, medicineDateToday } from '../lib/medicine-inventory'
import { dispensingSchema } from '../validations/dispensing.validation'
import { inventorySchema } from '../validations/inventory.validation'

test('medicine availability uses local expiry dates, existing low-stock threshold, and blocks missing expiry', () => {
  assert.equal(medicineDateToday(new Date('2026-10-18T16:00:00Z')), '2026-10-19')
  assert.equal(medicineAvailability({ quantity: 11, expiresOn: '2026-10-18' }, '2026-10-18').status, 'Available')
  assert.equal(medicineAvailability({ quantity: 10, expiresOn: '2026-10-18' }, '2026-10-18').status, 'Low Stock')
  assert.equal(medicineAvailability({ quantity: 0, expiresOn: '2026-10-18' }, '2026-10-18').status, 'Out of Stock')
  assert.equal(medicineAvailability({ quantity: 10, expiresOn: '2026-10-18' }, '2026-10-18').unavailableReason, null)
  assert.equal(medicineAvailability({ quantity: 10, expiresOn: '2026-10-18' }, '2026-10-19').unavailableReason, 'Expired')
  assert.equal(medicineAvailability({ quantity: 10, expiresOn: null }).unavailableReason, 'Expiry date required')
})

test('dispensing validation rejects negative, zero, fractional, duplicate and oversized requests', () => {
  const input = { medicalRecordId: 'record', dispenseKey: randomUUID(), medicines: [{ itemId: 'medicine', quantity: 1 }] }
  assert.equal(dispensingSchema.safeParse(input).success, true)
  for (const quantity of [-1, 0, 1.5, Infinity, NaN, 2147483648]) {
    assert.equal(dispensingSchema.safeParse({ ...input, medicines: [{ itemId: 'medicine', quantity }] }).success, false)
  }
  assert.equal(dispensingSchema.safeParse({ ...input, medicines: [...input.medicines, ...input.medicines] }).success, false)
  assert.equal(dispensingSchema.safeParse({ ...input, medicines: [] }).success, false)
  assert.equal(dispensingSchema.safeParse({ ...input, dispenseKey: '' }).success, false)
})

test('inventory validates actual calendar dates and nonnegative integer stock', () => {
  const input = { name: 'Medicine', category: 'Medical Supplies', quantity: '10', unit: 'tablets', storageLocation: 'Clinic', isMedicine: true }
  assert.equal(inventorySchema.safeParse({ ...input, expiresOn: '2026-02-30' }).success, false)
  assert.equal(inventorySchema.safeParse({ ...input, expiresOn: '2028-02-29' }).success, true)
  assert.equal(inventorySchema.safeParse({ ...input, expiresOn: '' }).success, true)
  assert.equal(inventorySchema.safeParse({ ...input, quantity: '-1' }).success, false)
})
