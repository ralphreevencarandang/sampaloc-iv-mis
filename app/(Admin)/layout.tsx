import React from 'react';
import { redirect } from 'next/navigation';
import AdminSidebar from '@/components/ui/AdminSidebar';
import { getCurrentAdminFromSession } from '@/lib/admin-session';
import { AdminRbacProvider } from '@/components/providers/admin-rbac-provider';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentAdmin = await getCurrentAdminFromSession();

  if (!currentAdmin) {
    redirect('/AdminLogin');
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminRbacProvider role={currentAdmin.role}>
        <AdminSidebar role={currentAdmin.role} />
        <main className="flex-1 overflow-auto md:ml-0">
          <div className="p-4 md:p-8">
            {children}
          </div>
        </main>
      </AdminRbacProvider>
    </div>
  );
}
