'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { appointmentAvailabilityQuery, appointmentQuery } from '@/lib/appointment-query'
import { appointmentTime, appointmentLabel } from '@/lib/appointment-policy'
import { bookingSchema } from '@/validations/appointment.validation'
import { bookClinicAppointmentAction } from '@/server/actions/appointment.actions'
import AppointmentHistory, { appointmentControl, appointmentButton } from './AppointmentHistory'

export default function ResidentAppointmentBooking({ residentName, contactNumber }: { residentName: string; contactNumber: string | null }) {
  const availability = useQuery(appointmentAvailabilityQuery)
  const history = useQuery(appointmentQuery('resident'))
  const client = useQueryClient()
  const [date, setDate] = useState('')
  const [success, setSuccess] = useState('')
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({ resolver: zodResolver(bookingSchema), defaultValues: { startsAt: '', reason: '', notes: '' } })
  const dates = availability.data?.dates ?? []
  const selectedDate = dates.find(d => d.date === date)
  const active = history.data?.appointments.find(a => ['PENDING', 'CONFIRMED'].includes(a.status))
  const booking = useMutation({ mutationFn: bookClinicAppointmentAction, onSuccess: async result => {
    if (!result.success) toast.error(result.message)
    else { setSuccess(result.message); reset(); setDate(''); toast.success(result.message) }
    await client.invalidateQueries({ queryKey: ['clinic-appointments'] })
    await client.invalidateQueries({ queryKey: ['clinic-appointment-availability'] })
  }, onError: () => toast.error('Unable to submit your appointment. Refresh your history before retrying.') })
  const blocked = Boolean(active) || history.isPending || history.isError || availability.isPending || availability.isError || !selectedDate || booking.isPending
  return <div className="space-y-8">
    <header><Link className="mb-3 inline-block text-sm font-semibold text-primary-700 underline" href="/my-account">Back to My Account</Link><h1 className="text-3xl font-bold text-content">Clinic Appointment</h1><p className="mt-2 text-content-muted">Request a clinic consultation. Times are shown in Philippine time (Asia/Manila).</p></header>
    <section className="rounded-lg border border-outline bg-surface p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-content">Book an Appointment</h2>
      {success && <p role="status" className="mt-4 rounded-lg border border-primary-200 bg-primary-50 p-4 text-primary-700">{success}</p>}
      {active && <p role="status" className="mt-4 text-primary-700">You already have an active appointment: {appointmentLabel(active.startsAt)} ({active.status}). View it below.</p>}
      {availability.isPending && <p role="status" className="mt-4 text-content-muted">Loading available dates and times…</p>}
      {availability.isError && <div role="alert" className="mt-4 text-stock-empty-text">Unable to load availability. <button className={appointmentButton} onClick={() => void availability.refetch()}>Retry</button></div>}
      {availability.data && !dates.length && <p className="mt-4 text-content-muted">{availability.data.enabled ? 'No slots are available in the next 90 days. Please check again or contact the clinic.' : 'Appointment booking is not open. Please contact the clinic for assistance.'}</p>}
      <form className="mt-5 space-y-4" onSubmit={handleSubmit(values => { setSuccess(''); booking.mutate(values) })}>
        <div className="grid gap-4 sm:grid-cols-2"><label className="flex flex-col gap-2 text-sm text-content">Resident Name<input readOnly className={appointmentControl} value={residentName} /></label><label className="flex flex-col gap-2 text-sm text-content">Contact Number<input readOnly className={appointmentControl} value={contactNumber ?? 'Not provided'} /></label></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="flex flex-col gap-2 text-sm text-content">Appointment Date (required)<select required className={appointmentControl} value={selectedDate ? date : ''} disabled={Boolean(active) || availability.isError || booking.isPending} onChange={e => { setDate(e.target.value); setValue('startsAt', '') }}><option value="">Select an available date</option>{dates.map(d => <option key={d.date} value={d.date}>{d.date}</option>)}</select></label>
          <label className="flex flex-col gap-2 text-sm text-content">Available Time Slot (required)<select required className={appointmentControl} disabled={!selectedDate || Boolean(active) || booking.isPending} {...register('startsAt')}><option value="">Select a time</option>{selectedDate?.slots.map(s => <option key={s.startsAt} value={s.startsAt}>{appointmentTime(s.startsAt)} – {appointmentTime(s.endsAt)} ({s.remaining} available)</option>)}</select>{errors.startsAt && <span role="alert">Select an available time.</span>}</label></div>
        <label className="flex flex-col gap-2 text-sm text-content">Reason for Visit / Symptoms (required)<textarea required maxLength={2000} rows={3} className={appointmentControl} {...register('reason')} />{errors.reason && <span role="alert">{errors.reason.message}</span>}</label>
        <label className="flex flex-col gap-2 text-sm text-content">Additional Notes (optional)<textarea maxLength={2000} rows={2} className={appointmentControl} {...register('notes')} /></label>
        <p className="text-sm text-content-muted">Only one pending or confirmed appointment is allowed at a time. Please wait for confirmation before attending. You may cancel before your appointment starts; a cancellation reason is required.</p>
        <button disabled={blocked} className={`${appointmentButton} border-primary-200 bg-primary-50 text-primary-700`}>{booking.isPending ? 'Submitting…' : 'Submit Appointment'}</button>
      </form>
    </section>
    <AppointmentHistory mode="resident" />
  </div>
}
