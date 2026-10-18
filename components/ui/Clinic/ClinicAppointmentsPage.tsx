'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import toast from 'react-hot-toast'
import AppointmentHistory, { appointmentButton, appointmentControl } from './AppointmentHistory'
import MedicalRecordModalForm from './MedicalRecordModalForm'
import ClinicMedicalRecordDetailsModal from './ClinicMedicalRecordDetailsModal'
import { appointmentQuery } from '@/lib/appointment-query'
import type { AppointmentItem } from '@/lib/appointment-types'
import { saveClinicScheduleAction, startAppointmentConsultationAction } from '@/server/actions/appointment.actions'

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export default function ClinicAppointmentsPage() {
  const query = useQuery(appointmentQuery('staff'))
  const client = useQueryClient()
  const [consultation, setConsultation] = useState<AppointmentItem | null>(null)
  const [viewId, setViewId] = useState<string | null>(null)
  const schedule = query.data?.schedule
  const start = useMutation({ mutationFn: startAppointmentConsultationAction, onSuccess: async result => {
    if (!result.success) { toast.error(result.message); return }
    setConsultation(result.appointment)
    await client.invalidateQueries({ queryKey: ['clinic-appointments'] })
  }, onError: () => toast.error('Unable to start the consultation. Refresh and try again.') })
  const save = useMutation({ mutationFn: saveClinicScheduleAction, onSuccess: async result => {
    if (!result.success) { toast.error(result.message); return }
    toast.success(result.message)
    await client.invalidateQueries({ queryKey: ['clinic-appointments'] })
    await client.invalidateQueries({ queryKey: ['clinic-appointment-availability'] })
  }, onError: () => toast.error('Unable to save the clinic schedule.') })
  return <div className="space-y-6">
    <header><h1 className="text-3xl font-bold text-content">Clinic Appointments</h1><p className="mt-1 text-content-muted">Manage bookings and consultations. All appointment times use Philippine time (Asia/Manila).</p></header>
    <AppointmentHistory mode="staff" onConsult={appointment => start.mutate(appointment.id)} startingConsultation={start.isPending} onViewRecord={setViewId} />
    {query.data?.canWrite && !query.isError && <details className="rounded-lg border border-outline bg-surface p-5"><summary className="cursor-pointer font-semibold text-content">Clinic Schedule Settings</summary><p className="mt-3 text-sm text-content-muted">Set the operating days, hours, slot duration, and patients per slot. Existing appointments retain their times. Pending and confirmed bookings reserve capacity. Completed and no-show visits retain their slot allocation.</p>
      <form key={schedule?.version ?? 0} className="mt-4 space-y-4" onSubmit={e => {
        e.preventDefault(); const data = new FormData(e.currentTarget)
        save.mutate({ operatingDays: data.getAll('operatingDays').map(Number), opensAt: data.get('opensAt'), closesAt: data.get('closesAt'), slotMinutes: Number(data.get('slotMinutes')), capacity: Number(data.get('capacity')), enabled: data.get('enabled') === 'on', version: schedule?.version ?? 0 })
      }}>
        <fieldset disabled={save.isPending} className="space-y-4"><legend className="sr-only">Clinic operating schedule</legend>
          <label className="flex items-center gap-2 text-sm text-content"><input type="checkbox" name="enabled" defaultChecked={schedule?.enabled ?? false} />Enable resident appointment booking</label>
          <fieldset><legend className="mb-2 text-sm font-medium text-content">Operating days (required)</legend><div className="flex flex-wrap gap-4">{weekdays.map((day, i) => <label key={day} className="flex gap-2 text-sm text-content"><input type="checkbox" name="operatingDays" value={i} defaultChecked={schedule?.operatingDays.includes(i) ?? false} />{day}</label>)}</div></fieldset>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
            ['opensAt', 'Opening time', 'time', schedule?.opensAt], ['closesAt', 'Closing time', 'time', schedule?.closesAt],
            ['slotMinutes', 'Slot duration (minutes)', 'number', schedule?.slotMinutes], ['capacity', 'Patients per slot', 'number', schedule?.capacity],
          ].map(([name, label, type, value]) => <label key={name} className="flex flex-col gap-2 text-sm text-content">{label}<input required className={appointmentControl} name={String(name)} type={String(type)} defaultValue={value} min={name === 'slotMinutes' ? 5 : name === 'capacity' ? 1 : undefined} max={name === 'slotMinutes' ? 240 : name === 'capacity' ? 100 : undefined} /></label>)}</div>
          <button className={appointmentButton} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save Schedule'}</button>
        </fieldset>
      </form>
    </details>}
    {consultation && <MedicalRecordModalForm isOpen onClose={() => setConsultation(null)} appointmentId={consultation.id} appointmentSchedule={consultation.startsAt} consultationStartedAt={consultation.consultationStartedAt} defaultPatientId={consultation.residentId} patients={[{ id: consultation.residentId, name: consultation.residentName, age: 0, barangayZone: 'Appointment patient' }]} onRecordCreated={setViewId} />}
    <ClinicMedicalRecordDetailsModal isOpen={Boolean(viewId)} recordId={viewId} onClose={() => setViewId(null)} />
  </div>
}
