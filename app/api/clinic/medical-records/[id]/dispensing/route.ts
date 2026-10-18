import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentHealthWorkerFromSession } from '@/lib/health-worker-session'
import { getCurrentAdminFromSession } from '@/lib/admin-session'
import { canAccessResource } from '@/lib/rbac'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const [worker, admin] = await Promise.all([getCurrentHealthWorkerFromSession(), getCurrentAdminFromSession()])
    if (!worker && !admin) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
    if (!worker && (!admin || !canAccessResource(admin.role, 'health'))) {
      return NextResponse.json({ message: 'You do not have access to dispensing history.' }, { status: 403 })
    }
    const { id } = await context.params
    const record = await prisma.medicalRecord.findUnique({
      where: { id }, select: { isArchive: true, patient: { select: { isArchived: true } } },
    })
    if (!record) return NextResponse.json({ message: 'Medical record not found.' }, { status: 404 })
    const history = await prisma.inventoryTransaction.findMany({
      where: { medicalRecordId: id, dispenseKey: { not: null } },
      select: { id: true, itemName: true, itemUnit: true, quantity: true, date: true,
        dispensedBy: { select: { name: true } },
        distributedTo: { select: { firstName: true, middleName: true, lastName: true } } },
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
    })
    return NextResponse.json({ canDispense: Boolean(worker) && !record.isArchive && !record.patient.isArchived,
      history: history.map((entry) => ({
        id: entry.id, medicine: entry.itemName, unit: entry.itemUnit, quantity: entry.quantity,
        date: entry.date.toISOString(), healthWorker: entry.dispensedBy?.name ?? 'Unknown',
        patient: entry.distributedTo ? [entry.distributedTo.firstName, entry.distributedTo.middleName, entry.distributedTo.lastName].filter(Boolean).join(' ') : 'Unknown',
      })),
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ message: 'Unable to load dispensing history.' }, { status: 500 })
  }
}
