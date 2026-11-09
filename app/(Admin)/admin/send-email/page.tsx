import { redirect } from 'next/navigation';
import { getCurrentAdminFromSession } from '@/lib/admin-session';
import { canAccessResource, getDefaultAdminRoute } from '@/lib/rbac';
import SendEmailForm from '@/components/ui/Admin/SendEmailForm';

export default async function SendEmailPage() {
  const admin = await getCurrentAdminFromSession();
  if (!admin) redirect('/AdminLogin');
  if (!canAccessResource(admin.role, 'email')) redirect(getDefaultAdminRoute(admin.role));
  return <div className="space-y-6">
    <header><h1 className="text-3xl font-bold text-content">Send Email</h1><p className="mt-2 text-sm text-content-muted">Send a message from the configured barangay email address.</p></header>
    <SendEmailForm />
  </div>;
}
