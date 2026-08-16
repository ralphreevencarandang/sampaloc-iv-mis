import { redirect } from 'next/navigation';
import { getCurrentAdminFromSession } from '@/lib/admin-session';
import { getDefaultAdminRoute } from '@/lib/rbac';
import { AdminLoginForm } from './AdminLoginForm';

export default async function AdminLoginPage() {
  const admin = await getCurrentAdminFromSession();

  if (admin) {
    redirect(getDefaultAdminRoute(admin.role));
  }

  return <AdminLoginForm />;
}
