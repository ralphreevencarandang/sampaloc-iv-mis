import React from 'react';
import AdminSidebar from '@/components/ui/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
