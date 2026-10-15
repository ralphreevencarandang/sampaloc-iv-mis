import type { Prisma } from '@/app/generated/prisma/client'

// All request creation and status transitions use this lock. READ COMMITTED
// ensures queries after a waiting lock see the preceding transaction's commit.
export async function lockDocumentRequestResident(tx: Prisma.TransactionClient, residentId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Resident" WHERE "id" = ${residentId} FOR UPDATE`
}
