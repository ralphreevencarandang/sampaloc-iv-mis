import React from 'react'
import { Archive, ArchiveRestore, Loader2 } from 'lucide-react'

type ArchiveCardProps = {
  title: string
  subtitle: string
  metadata?: string
  archivedDate: string
  onUnarchive?: () => void
  isUnarchiving?: boolean
}

export default function ArchiveCard({ title, subtitle, metadata, archivedDate, onUnarchive, isUnarchiving }: ArchiveCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h4 className="text-lg font-semibold text-slate-900">{title}</h4>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        {metadata && <p className="mt-1 text-xs font-medium text-slate-500">{metadata}</p>}
      </div>

      <div className="flex flex-col gap-3 text-sm sm:items-end">
        <div className="flex flex-col sm:items-end">
          <span className="flex items-center gap-1.5 text-slate-500">
            <Archive className="h-4 w-4" /> Archived On
          </span>
          <span className="mt-1 font-medium text-slate-900">
            {archivedDate !== 'N/A' ? new Date(archivedDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }) : 'N/A'}
          </span>
        </div>

        <button
          onClick={onUnarchive}
          disabled={isUnarchiving}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-primary-600 hover:bg-primary-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUnarchiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArchiveRestore className="h-4 w-4" />}
          {isUnarchiving ? 'Unarchiving...' : 'Unarchive'}
        </button>
      </div>
    </div>
  )
}
