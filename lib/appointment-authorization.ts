import 'server-only'
import { getCurrentHealthWorkerFromSession } from '@/lib/health-worker-session'
import { getCurrentAdminFromSession } from '@/lib/admin-session'
import { canAccessResource } from '@/lib/rbac'
import { getCurrentResidentFromSession } from '@/lib/resident-session'
import prisma from '@/lib/prisma'

export async function appointmentResident() {
  const session = await getCurrentResidentFromSession()
  if (!session) return null
  return prisma.resident.findFirst({ where: { id: session.id, status: 'APPROVED', isArchived: false }, select: {
    id: true, firstName: true, middleName: true, lastName: true, contactNumber: true,
  } })
}

export async function appointmentStaff(action: 'read' | 'write' = 'read') {
  const worker = await getCurrentHealthWorkerFromSession()
  if (worker) return worker
  const admin = await getCurrentAdminFromSession()
  return admin && canAccessResource(admin.role, 'health', action) ? admin : null
}
