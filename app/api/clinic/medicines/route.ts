import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentHealthWorkerFromSession } from '@/lib/health-worker-session'
import { getCurrentAdminFromSession } from '@/lib/admin-session'
import { canAccessResource } from '@/lib/rbac'
import { medicineAvailability } from '@/lib/medicine-inventory'

export async function GET() {
  try {
    const [worker, admin] = await Promise.all([getCurrentHealthWorkerFromSession(), getCurrentAdminFromSession()])
    if (!worker && !admin) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
    if (!worker && (!admin || !canAccessResource(admin.role, 'health'))) {
      return NextResponse.json({ message: 'You do not have access to clinic medicines.' }, { status: 403 })
    }
    const items = await prisma.inventoryItem.findMany({
      where: { isMedicine: true, isArchived: false },
      select: { id: true, name: true, quantity: true, unit: true, expiresOn: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    })
    return NextResponse.json(items.map((item) => {
      const medicine = { ...item, expiresOn: item.expiresOn?.toISOString().slice(0, 10) ?? null }
      return { ...medicine, ...medicineAvailability(medicine) }
    }), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ message: 'Unable to load medicine stock.' }, { status: 500 })
  }
}
