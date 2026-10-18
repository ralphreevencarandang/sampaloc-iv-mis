"use client"

import type { LucideIcon } from 'lucide-react'
import { Loader2 } from 'lucide-react'

export type SummaryDashboardStat = {
  label: string
  value: number
  icon: LucideIcon
}

type SummaryDashboardCardsProps = {
  stats: SummaryDashboardStat[]
  isLoading: boolean
}

export default function SummaryDashboardCards({ stats, isLoading }: SummaryDashboardCardsProps) {
  return (
    <section aria-label="Record summary" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {stats.map(({ label, value, icon: Icon }) => (
        <article key={label} className="rounded-lg border border-outline bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-content-muted">{label}</p>
            <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-primary-600" />
          </div>
          {isLoading ? (
            <div className="mt-3 flex h-8 items-center" role="status" aria-label={`Loading ${label}`}>
              <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-primary-600" />
              <span className="sr-only">Loading {label}</span>
            </div>
          ) : (
            <p className="mt-2 text-2xl font-bold text-content" aria-live="polite">{value.toLocaleString()}</p>
          )}
        </article>
      ))}
    </section>
  )
}
