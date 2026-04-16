import { redirect } from 'next/navigation';
import { getCurrentAdminFromSession } from '@/lib/admin-session';
import { AdminLoginForm } from './AdminLoginForm';

export default async function AdminLoginPage() {
  const admin = await getCurrentAdminFromSession();

  if (admin) {
    redirect('/admin');
  }

  return <AdminLoginForm />;
}
