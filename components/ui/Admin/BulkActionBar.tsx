'use client'

import React from 'react'
import { Archive, RotateCcw, X, CheckSquare, Loader2 } from 'lucide-react'

export interface BulkActionBarProps {
  selectedCount: number
  totalCount?: number
  onClearSelection: () => void
  onSelectAll?: () => void
  isAllSelected?: boolean
  onBulkAction: () => void
  actionLabel?: string
  actionType?: 'archive' | 'unarchive'
  isLoading?: boolean
}

export default function BulkActionBar({
  selectedCount,
  totalCount,
  onClearSelection,
  onSelectAll,
  isAllSelected,
  onBulkAction,
  actionLabel,
  actionType = 'archive',
  isLoading = false,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null

  const isArchive = actionType === 'archive'
  const defaultLabel = isArchive ? 'Bulk Archive' : 'Bulk Unarchive'
  const displayLabel = actionLabel ?? defaultLabel

  return (
    <div className="sticky top-4 z-30 mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary-200/80 bg-white px-5 py-3.5 shadow-lg shadow-primary-950/5 ring-1 ring-primary-500/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 px-2.5 items-center justify-center rounded-full bg-primary-100 text-primary-800 text-xs font-bold ring-1 ring-primary-200">
              {selectedCount}
            </span>
            <span className="text-sm font-semibold text-slate-800">
              {selectedCount === 1 ? 'item' : 'items'} selected
            </span>
          </div>

          {onSelectAll && typeof totalCount === 'number' && totalCount > selectedCount && (
            <button
              type="button"
              onClick={onSelectAll}
              className="ml-2 hidden text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline underline-offset-2 sm:inline-block transition-colors"
            >
              Select all {totalCount}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClearSelection}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>

          <button
            type="button"
            onClick={onBulkAction}
            disabled={isLoading}
            className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 disabled:cursor-not-allowed ${
              isArchive
                ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 shadow-amber-600/30'
                : 'bg-primary-600 hover:bg-primary-700 active:bg-primary-800 shadow-primary-600/30'
            }`}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isArchive ? (
              <Archive className="h-4 w-4" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            <span>{displayLabel}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
