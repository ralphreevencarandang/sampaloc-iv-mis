import React from 'react';
import { redirect } from 'next/navigation';
import AdminSidebar from '@/components/ui/AdminSidebar';
import { getCurrentAdminFromSession } from '@/lib/admin-session';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await getCurrentAdminFromSession())) {
    redirect('/AdminLogin');
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar />
      <main className="flex-1 overflow-auto md:ml-0">
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
