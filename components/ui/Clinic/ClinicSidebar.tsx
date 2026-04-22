'use client'

import { Activity, LayoutDashboard, LogOut, Menu, Stethoscope, UserRound, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React, { useState, useTransition } from 'react'
import type { AuthenticatedHealthWorker } from '@/lib/health-worker-session'
import { logoutHealthWorkerAction } from '@/server/actions/auth.actions'

type ClinicSidebarProps = {
  healthWorker: AuthenticatedHealthWorker
}

const navItems = [
  {
    label: 'Dashboard',
    href: '/clinic',
    icon: LayoutDashboard,
  },
]

export default function ClinicSidebar({ healthWorker }: ClinicSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(true)
  const [isPending, startTransition] = useTransition()

  const isActive = (href: string) => {
    if (href === '/clinic') {
      return pathname === '/clinic' || pathname === '/clinic/'
    }

    return pathname.startsWith(href)
  }

  const handleLogout = () => {
    startTransition(async () => {
      await logoutHealthWorkerAction()
      router.replace('/ClinicLogin')
      router.refresh()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-teal-600 p-2 text-white shadow-lg md:hidden"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen flex-col bg-slate-900 text-white transition-all duration-300 ${
          isOpen ? 'w-72' : '-translate-x-full md:translate-x-0 md:w-20'
        }`}
      >
        <div className="flex h-20 items-center gap-3 border-b border-slate-700 px-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-500/15 text-teal-300">
            <Stethoscope className="h-6 w-6" />
          </div>
          {isOpen && (
            <div>
              <p className="text-sm font-bold text-white">Sampaloc IV Clinic</p>
              <p className="text-xs text-slate-400">Health Worker Workspace</p>
            </div>
          )}
        </div>

        <div className="border-b border-slate-700 px-4 py-5">
          <div className="rounded-2xl bg-slate-800/80 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/15 text-teal-300">
                <UserRound className="h-5 w-5" />
              </div>
              {isOpen && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{healthWorker.name}</p>
                  <p className="truncate text-xs text-slate-400">{healthWorker.email}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-6">
          {navItems.map((item) => {
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive(item.href)
                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-teal-300'
                }`}
                title={!isOpen ? item.label : ''}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {isOpen && <span>{item.label}</span>}
              </Link>
            )
          })}

          {isOpen && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="mb-2 flex items-center gap-2 text-teal-300">
                <Activity className="h-4 w-4" />
                <span className="text-sm font-semibold">Today&apos;s Focus</span>
              </div>
              <p className="text-sm leading-6 text-slate-300">
                Review follow-up patients, encode consultations, and prepare attachment-ready records.
              </p>
            </div>
          )}
        </nav>

        <div className="border-t border-slate-700 p-4">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isPending}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-60 ${
              !isOpen ? 'justify-center' : ''
            }`}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {isOpen && <span>{isPending ? 'Signing out...' : 'Logout'}</span>}
          </button>
        </div>
      </aside>

      {isOpen && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setIsOpen(false)} />}

      <div className={`hidden transition-all duration-300 md:block ${isOpen ? 'w-72' : 'w-20'}`} />
    </>
  )
}
