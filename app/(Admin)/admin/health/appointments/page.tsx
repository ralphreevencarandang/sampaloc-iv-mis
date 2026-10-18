import { redirect } from 'next/navigation'
import { getCurrentAdminFromSession } from '@/lib/admin-session'
import { canAccessResource } from '@/lib/rbac'
import ClinicAppointmentsPage from '@/components/ui/Clinic/ClinicAppointmentsPage'
export default async function AdminAppointmentsPage() {
  const admin = await getCurrentAdminFromSession()
  if (!admin || !canAccessResource(admin.role, 'health')) redirect('/AdminLogin')
  return <ClinicAppointmentsPage />
}
