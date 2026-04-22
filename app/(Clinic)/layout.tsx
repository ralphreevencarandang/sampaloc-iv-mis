import React from 'react'
import { redirect } from 'next/navigation'
import ClinicSidebar from '@/components/ui/Clinic/ClinicSidebar'
import { getCurrentHealthWorkerFromSession } from '@/lib/health-worker-session'

export default async function ClinicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const healthWorker = await getCurrentHealthWorkerFromSession()

  if (!healthWorker) {
    redirect('/ClinicLogin')
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <ClinicSidebar healthWorker={healthWorker} />
      <main className="flex-1 overflow-auto md:ml-0">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  )
}
