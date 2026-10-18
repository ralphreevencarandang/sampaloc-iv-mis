'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Eye, Loader2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import AppointmentDialog from './AppointmentDialog'
import { appointmentQuery } from '@/lib/appointment-query'
import { appointmentLabel, appointmentTime, manilaDate, type AppointmentStatusValue } from '@/lib/appointment-policy'
import type { AppointmentItem } from '@/lib/appointment-types'
import { appointmentStatuses } from '@/validations/appointment.validation'
import { changeClinicAppointmentAction } from '@/server/actions/appointment.actions'

export const appointmentControl = 'rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-content focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50'
export const appointmentButton = `${appointmentControl} font-semibold hover:bg-primary-50`
export function AppointmentBadge({ status }: { status: AppointmentStatusValue }) {
  const tone = status === 'PENDING' ? 'border-stock-low-border bg-stock-low-surface text-stock-low-text'
    : ['REJECTED', 'CANCELLED', 'NO_SHOW'].includes(status) ? 'border-stock-empty-border bg-stock-empty-surface text-stock-empty-text'
      : 'border-primary-200 bg-primary-50 text-primary-700'
  return <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>{status.replaceAll('_', ' ')}</span>
}
export function ConsultationSummary({ records }: { records: { visitType?: string }[] }) {
  return <div className="grid gap-4 sm:grid-cols-3">{[
    ['Total Consultations', records.length], ['Walk-In Visits', records.filter(r => r.visitType !== 'APPOINTMENT').length],
    ['Appointment Visits', records.filter(r => r.visitType === 'APPOINTMENT').length],
  ].map(([label, count]) => <div key={label} className="rounded-lg border border-outline bg-surface p-4 shadow-sm"><p className="text-sm text-content-muted">{label}</p><p className="mt-2 text-2xl font-bold text-content">{count}</p></div>)}</div>
}
export default function AppointmentHistory({ mode, onConsult, onViewRecord, startingConsultation = false }: {
  mode: 'staff' | 'resident'; startingConsultation?: boolean; onConsult?: (appointment: AppointmentItem) => void; onViewRecord?: (id: string) => void
}) {
  const query = useQuery(appointmentQuery(mode))
  const client = useQueryClient()
  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [detailsId, setDetailsId] = useState<string | null>(null)
  const [change, setChange] = useState<{ appointment: AppointmentItem; status: 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'NO_SHOW' } | null>(null)
  const [reason, setReason] = useState('')
  const [actionError, setActionError] = useState('')
  const mutation = useMutation({ mutationFn: () => changeClinicAppointmentAction({ id: change?.appointment.id, status: change?.status, reason }, mode),
    onSuccess: async result => {
      if (!result.success) { setActionError(result.message); return }
      toast.success(result.message); setChange(null); setReason(''); setActionError('')
      await client.invalidateQueries({ queryKey: ['clinic-appointments'] })
      await client.invalidateQueries({ queryKey: ['clinic-appointment-availability'] })
    }, onError: () => setActionError('Unable to update the appointment. Refresh and try again.'),
  })
  const rows = query.data?.appointments ?? []
  const filtered = rows.filter(a => (!date || manilaDate(new Date(a.startsAt)) === date) && (!status || a.status === status)
    && `${a.residentName} ${a.reason}`.toLowerCase().includes(search.trim().toLowerCase()))
  const pages = Math.max(1, Math.ceil(filtered.length / 10))
  const currentPage = Math.min(page, pages)
  const details = rows.find(a => a.id === detailsId)
  const today = manilaDate()
  const todayRows = rows.filter(a => manilaDate(new Date(a.startsAt)) === today).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const canWrite = query.data?.canWrite
  const requestChange = (appointment: AppointmentItem, next: NonNullable<typeof change>['status']) => {
    setChange({ appointment, status: next }); setReason(''); setActionError('')
  }
  if (query.isPending) return <p role="status" className="flex gap-2 text-content-muted"><Loader2 className="h-5 w-5 animate-spin" />Loading appointments…</p>
  return <section className="space-y-4" aria-label="Clinic appointment history">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-xl font-semibold text-content"><CalendarDays className="h-5 w-5" />{mode === 'staff' ? 'Appointment Management' : 'My Clinic Appointments'}</h2>
      <div>
      {mode === 'resident' && <Link href="/clinic-appointment" className={appointmentButton}>Book an appointment</Link>}
      <button type="button" className={appointmentButton} onClick={() => void query.refetch()} disabled={query.isFetching}>Refresh</button>

      </div>
      
    </div>
    {query.isError && <p role="alert" className="rounded-lg border border-stock-empty-border bg-stock-empty-surface p-4 text-stock-empty-text">{query.error.message} {rows.length > 0 && 'Displayed information may be outdated. Actions are disabled until refreshed.'}</p>}
    {mode === 'staff' && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[
        ['Total Appointments', rows.length], ...(['PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'] as const).map(s => [s.replaceAll('_', ' '), rows.filter(a => a.status === s).length]),
      ].map(([label, count]) => <div key={label} className="rounded-lg border border-outline bg-surface p-4 shadow-sm"><p className="text-xs font-medium text-content-muted">{label}</p><p className="mt-2 text-2xl font-bold text-content">{count}</p></div>)}</div>
      <div className="rounded-lg border border-primary-200 bg-primary-50 p-4 text-primary-700"><h3 className="font-semibold">Today’s appointments — {today} (Philippine time)</h3>
        {todayRows.length ? <ul className="mt-2 space-y-2">{todayRows.map(a => <li key={a.id} className="flex flex-wrap items-center gap-2"><span>{appointmentTime(a.startsAt)} — {a.residentName}</span><AppointmentBadge status={a.status} /><button type="button" className="text-sm underline" onClick={() => setDetailsId(a.id)}>View details</button></li>)}</ul> : <p className="mt-2 text-sm">No appointments today.</p>}
      </div>
    </>}
    <div className="flex flex-wrap gap-3">
      <label className="flex flex-col gap-1 text-sm text-content-muted">Search<input className={appointmentControl} value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Name or reason for visit" /></label>
      <label className="flex flex-col gap-1 text-sm text-content-muted">Date (Philippine time)<input type="date" className={appointmentControl} value={date} onChange={e => { setDate(e.target.value); setPage(1) }} /></label>
      <label className="flex flex-col gap-1 text-sm text-content-muted">Status<select className={appointmentControl} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}><option value="">All statuses</option>{appointmentStatuses.map(s => <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>)}</select></label>
      <button type="button" className={`${appointmentButton} self-end`} onClick={() => { setSearch(''); setDate(''); setStatus(''); setPage(1) }}>Clear filters</button>
    </div>
    <div className="overflow-x-auto rounded-lg border border-outline bg-surface shadow-sm"><table className="w-full text-left text-sm text-content"><thead className="bg-surface-muted text-xs uppercase text-content-muted"><tr>{['Resident Name', 'Date & Time', 'Reason', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody>
      {filtered.slice((currentPage - 1) * 10, currentPage * 10).map(a => <tr key={a.id} className="border-t border-outline"><td className="px-4 py-3">{a.residentName}</td><td className="whitespace-nowrap px-4 py-3">{appointmentLabel(a.startsAt)}<br /><span className="text-xs text-content-muted">until {appointmentTime(a.endsAt)} · Philippine time</span></td><td className="max-w-xs break-words px-4 py-3">{a.reason}</td><td className="px-4 py-3"><AppointmentBadge status={a.status} /></td><td className="px-4 py-3"><div className="flex flex-wrap gap-2">
        <button type="button" aria-label={`View appointment for ${a.residentName}`} className={appointmentButton} onClick={() => setDetailsId(a.id)}><Eye className="h-4 w-4" /></button>
        {mode === 'resident' && ['PENDING', 'CONFIRMED'].includes(a.status) && new Date(a.startsAt) > new Date() && <button className={appointmentButton} disabled={query.isError} onClick={() => requestChange(a, 'CANCELLED')}>Cancel</button>}
        {mode === 'staff' && canWrite && !query.isError && <>
          {a.status === 'PENDING' && <><button className={appointmentButton} onClick={() => requestChange(a, 'CONFIRMED')}>Confirm</button><button className={appointmentButton} onClick={() => requestChange(a, 'REJECTED')}>Reject</button></>}
          {['PENDING', 'CONFIRMED'].includes(a.status) && <button className={appointmentButton} onClick={() => requestChange(a, 'CANCELLED')}>Cancel</button>}
          {a.status === 'CONFIRMED' && <><button className={appointmentButton} disabled={new Date(a.endsAt) > new Date() || Boolean(a.consultationStartedAt)} onClick={() => requestChange(a, 'NO_SHOW')}>No Show</button><button className={appointmentButton} disabled={startingConsultation} onClick={() => onConsult?.(a)}>{a.consultationStartedAt ? 'Resume Consultation' : 'Start Consultation'}</button></>}
        </>}
        {mode === 'staff' && a.medicalRecordId && <button className={appointmentButton} onClick={() => onViewRecord?.(a.medicalRecordId!)}>View Consultation</button>}
      </div></td></tr>)}
      {!filtered.length && <tr><td colSpan={5} className="p-8 text-center text-content-muted">{rows.length ? 'No appointments match your filters.' : 'No clinic appointments yet.'}</td></tr>}
    </tbody></table></div>
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-content-muted"><span>{filtered.length} appointments · Page {currentPage} of {pages}</span><div className="flex gap-2"><button className={appointmentButton} disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Previous</button><button className={appointmentButton} disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>Next</button></div></div>
    {details && <AppointmentDialog titleId="appointment-details-title" onClose={() => setDetailsId(null)}><div className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-lg border border-outline bg-surface p-6 text-content"><div className="flex justify-between"><h3 id="appointment-details-title" className="text-lg font-semibold">Appointment Details</h3><button aria-label="Close appointment details" onClick={() => setDetailsId(null)}><X className="h-5 w-5" /></button></div><p>{details.residentName} · {details.contactNumber || 'Contact not provided'}</p><p>{appointmentLabel(details.startsAt)} – {appointmentTime(details.endsAt)} (Philippine time)</p><AppointmentBadge status={details.status} />{details.consultationStartedAt && <p>Actual consultation started: {appointmentLabel(details.consultationStartedAt)}</p>}<p className="whitespace-pre-wrap break-words">Reason: {details.reason}</p><p className="whitespace-pre-wrap break-words">Notes: {details.notes || 'None'}</p><h4 className="font-semibold">Status History</h4><ol className="space-y-3">{details.history.map((h, i) => <li key={i} className="border-t border-outline pt-2 text-sm"><p>{appointmentLabel(h.createdAt)} · {h.actorType === 'STAFF' ? 'Clinic staff' : 'Resident'}</p><p>{h.fromStatus && `${h.fromStatus} → `}{h.status}</p>{h.reason && <p className="whitespace-pre-wrap break-words">{h.reason}</p>}</li>)}</ol><button className={appointmentButton} onClick={() => setDetailsId(null)}>Close</button></div></AppointmentDialog>}
    {change && <AppointmentDialog titleId="appointment-change-title" onClose={() => setChange(null)} busy={mutation.isPending}><form onSubmit={e => { e.preventDefault(); mutation.mutate() }} className="w-full max-w-lg space-y-4 rounded-lg border border-outline bg-surface p-6 text-content"><h3 id="appointment-change-title" className="text-lg font-semibold">{change.status.replaceAll('_', ' ')} appointment</h3><p>{change.appointment.residentName} · {appointmentLabel(change.appointment.startsAt)}</p>{['CANCELLED', 'REJECTED'].includes(change.status) && <label className="block text-sm">Reason (required)<textarea required maxLength={1000} className={`${appointmentControl} mt-2 w-full`} value={reason} onChange={e => setReason(e.target.value)} /></label>}{actionError && <p role="alert">{actionError}</p>}<div className="flex gap-3"><button className={appointmentButton} disabled={mutation.isPending}> {mutation.isPending ? 'Saving…' : 'Confirm change'}</button><button type="button" className={appointmentButton} disabled={mutation.isPending} onClick={() => setChange(null)}>Back</button></div></form></AppointmentDialog>}
  </section>
}
