'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import type { ClinicDispensingData } from '@/lib/medicine-inventory'
import { clinicMedicinesQueryOptions } from '@/lib/clinic-medicines-query'
import { medicineAvailability } from '@/lib/medicine-inventory'
import type { DispensingInput } from '@/validations/dispensing.validation'
import { dispenseMedicinesAction } from '@/server/actions/dispensing.actions'

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error('Unable to load medicine information. Please retry.')
  return response.json() as Promise<T>
}

const controlClass = 'rounded-lg border border-primary-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50'

export default function MedicineDispensingPanel({ recordId }: { recordId: string }) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const pendingKey = ['pending-medicine-dispensing', recordId]
  const [needsRetry, setNeedsRetry] = useState(() => Boolean(queryClient.getQueryData(pendingKey)))
  // Retain the exact request after an uncertain response. Retrying cannot create a second deduction.
  const attempt = useRef<DispensingInput | null>(queryClient.getQueryData<DispensingInput>(pendingKey) ?? null)
  const busy = useRef(false)
  const medicinesQuery = useQuery(clinicMedicinesQueryOptions)
  const historyQuery = useQuery({
    queryKey: ['medicine-dispensing', recordId],
    queryFn: () => getJson<ClinicDispensingData>(`/api/clinic/medical-records/${encodeURIComponent(recordId)}/dispensing`),
    refetchInterval: 15000, refetchOnWindowFocus: 'always',
  })
  const medicines = (medicinesQuery.data ?? []).map((item) => ({ ...item, ...medicineAvailability(item) }))
  const selected = Object.entries(quantities).filter(([, value]) => value !== '' && value !== '0')
  const invalid = selected.some(([id, value]) => {
    const item = medicines.find((medicine) => medicine.id === id)
    return !item || item.unavailableReason || !Number.isInteger(Number(value)) || Number(value) <= 0 || Number(value) > item.quantity
  })

  const mutation = useMutation({
    mutationFn: dispenseMedicinesAction,
    onSuccess: (result) => {
      setMessage(result.message)
      setNeedsRetry(result.retryable)
      if (!result.retryable) {
        attempt.current = null
        queryClient.removeQueries({ queryKey: pendingKey, exact: true })
      }
      if (result.success) setQuantities({})
      // Query refresh errors must never turn a committed dispense into a new request.
      void queryClient.invalidateQueries({ queryKey: ['clinic-medicines'] })
      void queryClient.invalidateQueries({ queryKey: ['inventory'] })
      void queryClient.invalidateQueries({ queryKey: ['medicine-dispensing', recordId] })
      void queryClient.invalidateQueries({ queryKey: ['medical-records'] })
    },
    onError: () => {
      setNeedsRetry(true)
      setMessage('The result could not be confirmed. Keep this window open and retry the same submission; stock will not be deducted twice.')
    },
    onSettled: () => { busy.current = false },
  })

  function submit() {
    if (busy.current) return
    if (!attempt.current) {
      if (invalid || selected.length === 0 || !historyQuery.data?.canDispense) return
      attempt.current = { medicalRecordId: recordId, dispenseKey: crypto.randomUUID(),
        medicines: selected.map(([itemId, value]) => ({ itemId, quantity: Number(value) })) }
      queryClient.setQueryData(pendingKey, attempt.current)
    }
    busy.current = true
    mutation.mutate(attempt.current)
  }

  const loading = medicinesQuery.isPending || historyQuery.isPending
  const failed = medicinesQuery.isError || historyQuery.isError
  const canDispense = historyQuery.data?.canDispense ?? false
  const locked = mutation.isPending || needsRetry
  const visible = medicines.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase()) || Boolean(quantities[item.id]))

  return (
    <section className="space-y-4 rounded-lg border border-primary-200 p-4" aria-label="Medicine inventory and dispensing">
      <h3 className="text-lg font-semibold">Medicine inventory & dispensing</h3>
      <p className="text-sm">Stock refreshes every 15 seconds. Quantities use the inventory unit shown.</p>
      {loading && <p role="status" className="text-sm">Loading medicines and dispensing history…</p>}
      {failed && <div role="alert" className="space-y-2 text-sm">
        <p>Unable to refresh medicine information. Dispensing is unavailable until stock and permissions can be checked.</p>
        <button type="button" className={controlClass} onClick={() => { void medicinesQuery.refetch(); void historyQuery.refetch() }}>Retry loading</button>
      </div>}
      {!loading && <>
        <label htmlFor={`medicine-search-${recordId}`} className="block text-sm font-medium">Search medicines</label>
        <input id={`medicine-search-${recordId}`} type="search" value={search} onChange={(event) => setSearch(event.target.value)} className={`${controlClass} w-full`} placeholder="Search by medicine name" />
        <div className="max-h-80 space-y-3 overflow-y-auto">
          {selected.filter(([id]) => !medicines.some((item) => item.id === id)).map(([id]) => (
            <div key={id} className="space-y-2 text-sm">
              <p>A selected medicine was removed or archived.</p>
              <button type="button" disabled={locked} className={controlClass} onClick={() => setQuantities((current) => ({ ...current, [id]: '' }))}>Clear unavailable selection</button>
            </div>
          ))}
          {visible.map((item) => {
            const value = quantities[item.id] ?? ''
            const invalidQuantity = value !== '' && (!Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) > item.quantity)
            return <div key={item.id} className="space-y-2 border-b border-primary-200 pb-3">
              <p className="text-sm font-semibold">{item.name}</p>
              <p className="text-sm">{item.quantity} {item.unit} · {item.status} · Expiry: {item.expiresOn ?? 'Not set'}</p>
              {item.unavailableReason && <p className="text-sm font-medium text-primary-700">Cannot dispense: {item.unavailableReason}</p>}
              {canDispense && <div className="flex flex-wrap items-center gap-2">
                <label className="text-sm" htmlFor={`quantity-${item.id}`}>Quantity to dispense</label>
                <input id={`quantity-${item.id}`} type="number" min={0} max={item.quantity} step={1} value={value}
                  disabled={locked || failed || Boolean(item.unavailableReason)}
                  aria-invalid={invalidQuantity} aria-describedby={invalidQuantity ? `quantity-error-${item.id}` : undefined}
                  onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: event.target.value }))}
                  className={`${controlClass} w-24`} />
                {value && !locked && <button type="button" className={controlClass} onClick={() => setQuantities((current) => ({ ...current, [item.id]: '' }))}>Clear</button>}
                {invalidQuantity && <p id={`quantity-error-${item.id}`} role="alert" className="text-sm">Enter a whole number from 0 to {item.quantity}.</p>}
              </div>}
            </div>
          })}
          {!visible.length && <p className="text-sm">No medicines found. Admin must mark inventory items as medicines to make them available here.</p>}
        </div>
        {(canDispense || needsRetry) && <button type="button" onClick={submit}
          disabled={mutation.isPending || (!needsRetry && (failed || invalid || selected.length === 0 || !canDispense))}
          className="rounded-lg border border-primary-600 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-50">
          {mutation.isPending ? 'Confirming dispensing…' : needsRetry ? 'Retry same dispensing' : `Dispense selected medicines (${selected.length})`}
        </button>}
        {needsRetry && <p className="text-sm">Retry checks the saved submission even if the available stock has changed. Review dispensing history before starting a separate dispensing.</p>}
        {invalid && <p role="alert" className="text-sm">A selected medicine or quantity is no longer available. Clear it or adjust the quantity.</p>}
        {!canDispense && !needsRetry && <p className="text-sm">Only signed-in health workers can dispense for an active consultation and patient.</p>}
      </>}
      {message && <p role="status" className="rounded-lg border border-primary-200 bg-primary-50 p-3 text-sm text-primary-700">{message}</p>}
      <h4 className="text-sm font-semibold">Dispensing history</h4>
      {historyQuery.data?.history.map((entry) => <div key={entry.id} className="border-t border-primary-200 pt-2 text-sm">
        <p className="font-medium">{entry.medicine} — {entry.quantity} {entry.unit}</p>
        <p>Patient: {entry.patient} · Dispensed by: {entry.healthWorker}</p>
        <p>{new Date(entry.date).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</p>
      </div>)}
      {historyQuery.data?.history.length === 0 && <p className="text-sm">No stock dispensing recorded for this consultation.</p>}
    </section>
  )
}
