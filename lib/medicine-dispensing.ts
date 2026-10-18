import 'server-only'
import type { PrismaClient } from '@/app/generated/prisma/client'
import type { DispensingInput } from '@/validations/dispensing.validation'
import { medicineAvailability, medicineDateToday } from '@/lib/medicine-inventory'

export class DispensingError extends Error {}

// Called only after session/role validation. Keep every stock and history write atomic.
export async function dispenseInventory(prisma: PrismaClient, actorId: string, input: DispensingInput) {
  const lines = [...input.medicines].sort((a, b) => a.itemId.localeCompare(b.itemId))
  return prisma.$transaction(async (tx) => {
    // Serializes retries even when no history rows exist yet. Hash collisions only delay a request.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${input.dispenseKey}, 0))::text`
    const prior = await tx.inventoryTransaction.findMany({ where: { dispenseKey: input.dispenseKey } })
    if (prior.length) {
      if (prior.length !== lines.length || prior.some((row) =>
        row.medicalRecordId !== input.medicalRecordId || row.dispensedById !== actorId ||
        !lines.some((line) => line.itemId === row.itemId && line.quantity === row.quantity))) {
        throw new DispensingError('This submission was already used. Refresh the record before dispensing again.')
      }
      return { duplicate: true }
    }

    await tx.$queryRaw`SELECT "id" FROM "MedicalRecord" WHERE "id" = ${input.medicalRecordId} FOR UPDATE`
    const record = await tx.medicalRecord.findUnique({ where: { id: input.medicalRecordId } })
    if (!record || record.isArchive) throw new DispensingError('Select an active medical record.')
    await tx.$queryRaw`SELECT "id" FROM "Resident" WHERE "id" = ${record.patientId} FOR SHARE`
    const patient = await tx.resident.findUnique({ where: { id: record.patientId }, select: { isArchived: true } })
    if (!patient || patient.isArchived) throw new DispensingError('The patient is no longer active.')

    for (const line of lines) {
      await tx.$queryRaw`SELECT "id" FROM "InventoryItem" WHERE "id" = ${line.itemId} FOR UPDATE`
      const item = await tx.inventoryItem.findUnique({ where: { id: line.itemId } })
      if (!item || item.isArchived || !item.isMedicine) throw new DispensingError('A selected medicine is no longer available. Refresh the stock list.')
      const availability = medicineAvailability({ quantity: item.quantity, expiresOn: item.expiresOn?.toISOString().slice(0, 10) ?? null })
      if (availability.unavailableReason) throw new DispensingError(`${item.name}: ${availability.unavailableReason}.`)
      // The conditional decrement also protects against overselling if locking is later changed.
      const updated = await tx.inventoryItem.updateMany({
        where: { id: item.id, isArchived: false, isMedicine: true, quantity: { gte: line.quantity },
          expiresOn: { gte: new Date(`${medicineDateToday()}T00:00:00Z`) } },
        data: { quantity: { decrement: line.quantity }, stockVersion: { increment: 1 } },
      })
      if (updated.count !== 1) throw new DispensingError(`${item.name}: insufficient stock or expired medicine. Refresh and check the quantity.`)
      await tx.inventoryTransaction.create({ data: {
        itemId: item.id, quantity: line.quantity, type: 'OUT', distributedToId: record.patientId,
        medicalRecordId: record.id, dispensedById: actorId, dispenseKey: input.dispenseKey,
        itemName: item.name, itemUnit: item.unit,
      } })
    }
    return { duplicate: false }
  }, { isolationLevel: 'ReadCommitted', maxWait: 15000, timeout: 15000 })
}
