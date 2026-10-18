'use client'

import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Loader2, Pill, RefreshCw, Search } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { clinicMedicinesQueryOptions } from '@/lib/clinic-medicines-query'
import { medicineAvailability, type ClinicMedicine } from '@/lib/medicine-inventory'

const ITEMS_PER_PAGE = 10
const STOCK_STATUSES = ['Available', 'Low Stock', 'Out of Stock'] as const
const badgeClasses: Record<ClinicMedicine['status'], string> = {
  Available: 'border-primary-200 bg-primary-50 text-primary-700',
  'Low Stock': 'border-stock-low-border bg-stock-low-surface text-stock-low-text',
  'Out of Stock': 'border-stock-empty-border bg-stock-empty-surface text-stock-empty-text',
}
const controlClass = 'rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-content focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50'

export default function ClinicMedicinesPage() {
  const [search, setSearch] = useState('')
  const [stockStatus, setStockStatus] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const medicinesQuery = useQuery(clinicMedicinesQueryOptions)
  const medicines = (medicinesQuery.data ?? []).map((item) => ({ ...item, ...medicineAvailability(item) }))
  const filtered = medicines.filter((item) =>
    item.name.toLowerCase().includes(search.trim().toLowerCase()) && (!stockStatus || item.status === stockStatus))
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  // A stock refresh can shrink the filtered result while a later page is open.
  const page = Math.min(currentPage, totalPages)
  const start = (page - 1) * ITEMS_PER_PAGE
  const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE)
  const hasData = medicinesQuery.data !== undefined

  function resetFilters() {
    setSearch('')
    setStockStatus('')
    setCurrentPage(1)
  }

  return (
    <div className="space-y-6 text-content">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Medicines</h1>
          <p className="mt-1 text-content-muted">View medicine availability from Admin Inventory.</p>
          <p className="mt-2 text-sm text-content-muted">Admin manages stock. Dispense medicines through a patient&apos;s medical record.</p>
        </div>
        <Link href="/clinic/medical-records" className={`${controlClass} font-semibold hover:bg-primary-50`}>Open Medical Records</Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-outline bg-surface shadow-sm">
        <div className="flex flex-wrap items-end gap-4 border-b border-outline p-4">
          <div className="min-w-48 flex-1 space-y-1.5">
            <label htmlFor="medicine-search" className="block text-sm font-medium">Search medicines</label>
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-content-muted" />
              <input id="medicine-search" type="search" placeholder="Search by medicine name" value={search}
                onChange={(event) => { setSearch(event.target.value); setCurrentPage(1) }}
                className={`${controlClass} w-full pl-10`} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="medicine-stock-status" className="block text-sm font-medium">Stock status</label>
            <select id="medicine-stock-status" value={stockStatus}
              onChange={(event) => { setStockStatus(event.target.value); setCurrentPage(1) }} className={controlClass}>
              <option value="">All stock statuses</option>
              {STOCK_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
          <button type="button" onClick={() => void medicinesQuery.refetch()} disabled={medicinesQuery.isFetching}
            className={`${controlClass} inline-flex items-center gap-2 hover:bg-primary-50`}>
            <RefreshCw aria-hidden="true" className={`h-4 w-4 ${medicinesQuery.isFetching ? 'animate-spin' : ''}`} />
            {medicinesQuery.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <div className="border-b border-outline px-4 py-3 text-xs text-content-muted" role="status">
          Stock refreshes every 15 seconds and when you return to this page.
          {medicinesQuery.dataUpdatedAt > 0 && <> Last updated: {new Date(medicinesQuery.dataUpdatedAt).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila' })}.</>}
        </div>

        {medicinesQuery.isError && <div role="alert" className="space-y-2 border-b border-stock-empty-border bg-stock-empty-surface p-4 text-sm text-stock-empty-text">
          <p>{hasData ? 'Stock could not be refreshed. The quantities below may be outdated.' : 'Unable to load medicine inventory. Please try again.'}</p>
          <button type="button" disabled={medicinesQuery.isFetching} onClick={() => void medicinesQuery.refetch()} className={`${controlClass} font-medium`}>Retry</button>
        </div>}

        {medicinesQuery.isPending ? <div role="status" className="flex items-center justify-center gap-3 p-12 text-content-muted">
          <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-primary-600" />
          Loading medicine inventory…
        </div> : hasData && pageItems.length === 0 ? <div className="space-y-3 px-6 py-12 text-center">
          <Pill aria-hidden="true" className="mx-auto h-9 w-9 text-primary-600" />
          <h2 className="text-lg font-semibold">{medicines.length === 0 ? 'No medicines available' : 'No matching medicines'}</h2>
          <p className="text-sm text-content-muted">{medicines.length === 0
            ? 'Medicines added and enabled by Admin will appear here.'
            : 'Try another medicine name or stock status.'}</p>
          {medicines.length > 0 && <button type="button" onClick={resetFilters} className={`${controlClass} hover:bg-primary-50`}>Clear filters</button>}
        </div> : hasData ? <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Medicine stock shared with Admin Inventory. This list is read-only.</caption>
              <thead className="border-b border-outline bg-surface-muted text-xs uppercase tracking-wide text-content-muted">
                <tr>{['Medicine', 'Available stock', 'Unit', 'Stock status', 'Expiry / dispensing availability'].map((heading) => <th key={heading} scope="col" className="px-6 py-4 font-semibold">{heading}</th>)}</tr>
              </thead>
              <tbody>
                {pageItems.map((item) => <tr key={item.id} className="border-b border-outline last:border-b-0">
                  <th scope="row" className="px-6 py-4 font-semibold">{item.name}</th>
                  <td className="px-6 py-4 tabular-nums">{item.quantity.toLocaleString('en-PH')}</td>
                  <td className="px-6 py-4 text-content-muted">{item.unit}</td>
                  <td className="px-6 py-4"><span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClasses[item.status]}`}>{item.status}</span></td>
                  <td className="px-6 py-4 text-content-muted">
                    <p>{item.expiresOn ?? 'Expiry date not set'}</p>
                    <p className="mt-1 text-xs">{item.unavailableReason ? `Cannot dispense: ${item.unavailableReason}` : 'Eligible for dispensing'}</p>
                  </td>
                </tr>)}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline p-4 text-sm text-content-muted">
            <p aria-live="polite">Showing {start + 1}–{Math.min(start + ITEMS_PER_PAGE, filtered.length)} of {filtered.length} medicines</p>
            <nav aria-label="Medicine pagination" className="flex items-center gap-3">
              <button type="button" disabled={page <= 1} aria-label="Previous page" className={controlClass} onClick={() => setCurrentPage(Math.max(1, page - 1))}><ChevronLeft aria-hidden="true" className="h-4 w-4" /></button>
              <span>Page {page} of {totalPages}</span>
              <button type="button" disabled={page >= totalPages} aria-label="Next page" className={controlClass} onClick={() => setCurrentPage(Math.min(totalPages, page + 1))}><ChevronRight aria-hidden="true" className="h-4 w-4" /></button>
            </nav>
          </div>
        </> : null}
      </div>
    </div>
  )
}
