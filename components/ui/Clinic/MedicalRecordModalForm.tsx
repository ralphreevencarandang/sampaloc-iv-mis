'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, FileUp, Loader2, UserCheck, X } from 'lucide-react'
import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import type { ClinicMedicalRecordListItem } from '@/lib/clinic-utils'
import { submitMedicalRecordAction, updateMedicalRecordAction } from '@/server/actions/clinic.actions'
import { medicalRecordSchema, type MedicalRecordFormInput } from '@/validations/clinic.validation'
import { manilaDate, appointmentLabel } from '@/lib/appointment-policy'

type PatientOption = {
  id: string
  name: string
  age: number
  barangayZone: string
}

type MedicalRecordModalFormProps = {
  isOpen: boolean
  onClose: () => void
  patients: PatientOption[]
  defaultPatientId?: string
  appointmentId?: string
  appointmentSchedule?: string
  consultationStartedAt?: string | null
  initialData?: ClinicMedicalRecordListItem | null
  onRecordCreated?: (recordId: string) => void
}

type MedicalRecordFormValues = MedicalRecordFormInput & {
  attachments?: FileList
}

export default function MedicalRecordModalForm({
  isOpen,
  onClose,
  patients,
  defaultPatientId,
  appointmentId,
  appointmentSchedule,
  consultationStartedAt,
  initialData,
  onRecordCreated,
}: MedicalRecordModalFormProps) {
  const isEditMode = Boolean(initialData)
  const today = manilaDate()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<MedicalRecordFormValues>({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: {
      patientId: defaultPatientId ?? '',
      diagnosis: '',
      notes: '',
      assignedNurse: '',
      medicinesGiven: [],
      date: today,
    },
  })
  const queryClient = useQueryClient()

  const submitMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return isEditMode && initialData
        ? updateMedicalRecordAction(initialData.id, formData)
        : submitMedicalRecordAction(formData)
    },
    onSuccess: async (result) => {
      if (!result.success) {
        const fieldErrors = result.fieldErrors ?? {}

        Object.entries(fieldErrors).forEach(([field, message]) => {
          if (
            field === 'patientId' ||
            field === 'diagnosis' ||
            field === 'notes' ||
            field === 'assignedNurse' ||
            field === 'medicinesGiven' ||
            field === 'date'
          ) {
            setError(field as keyof MedicalRecordFormValues, { type: 'server', message })
          }
        })

        if (fieldErrors.submit) {
          setError('root', { type: 'server', message: fieldErrors.submit })
        }

        toast.error(result.message)
        return
      }

      await queryClient.invalidateQueries({ queryKey: ['medical-records'] })
      await queryClient.invalidateQueries({ queryKey: ['clinic-appointments'] })
      await queryClient.invalidateQueries({ queryKey: ['clinic-appointment-availability'] })
      if (initialData?.id) {
        await queryClient.invalidateQueries({ queryKey: ['medical-record', initialData.id] })
      }
      reset({
        patientId: defaultPatientId ?? '',
        diagnosis: '',
        notes: '',
        assignedNurse: '',
        medicinesGiven: [],
        date: today,
        attachments: undefined,
      })
      toast.success(result.message)
      if (result.record) onRecordCreated?.(result.record.id)
      onClose()
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : isEditMode
            ? 'Failed to update the medical record.'
            : 'Failed to create the medical record.'

      setError('root', { type: 'server', message })
      toast.error(message)
    },
  })

  useEffect(() => {
    if (!isOpen) {
      return
    }

    reset({
      patientId: initialData?.patientId ?? defaultPatientId ?? '',
      diagnosis: initialData?.diagnosis ?? '',
      notes: initialData?.notes ?? '',
      assignedNurse: initialData?.assignedNurse ?? '',
      medicinesGiven: initialData?.medicinesGiven ? [...initialData.medicinesGiven] : [],
      date: initialData?.date ? manilaDate(new Date(initialData.date)) : consultationStartedAt ? manilaDate(new Date(consultationStartedAt)) : today,
      attachments: undefined,
    })
    clearErrors()
  }, [clearErrors, defaultPatientId, initialData, isOpen, reset, today, consultationStartedAt])

  const onSubmit = handleSubmit(async (values) => {
    clearErrors()

    const formData = new FormData()
    if (appointmentId) formData.append('appointmentId', appointmentId)
    formData.append('patientId', values.patientId)
    formData.append('diagnosis', values.diagnosis)
    formData.append('notes', values.notes)
    formData.append('date', values.date)
    if (values.assignedNurse) {
      formData.append('assignedNurse', values.assignedNurse.trim())
    }
    
    // Append medicines given
    const currentMedicines = values.medicinesGiven || []
    currentMedicines.forEach((med) => {
      if (med && typeof med === 'string' && med.trim()) {
        formData.append('medicinesGiven', med.trim())
      }
    })

    if (initialData?.attachments.length) {
      formData.append('existingAttachments', JSON.stringify(initialData.attachments))
    }

    const attachments = Array.from(values.attachments ?? []) as File[]

    attachments.forEach((file) => {
      if (file.size > 0) {
        formData.append('attachments', file)
      }
    })

    await submitMutation.mutateAsync(formData)
  })

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {isEditMode ? 'Edit Medical Record' : appointmentId ? 'Appointment Consultation' : 'Walk-In Consultation'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {isEditMode
                ? 'Update the consultation and treatment entry details below.'
                : 'Log a consultation entry, assigned nurse, and administered medicines.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitMutation.isPending}
            className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close medical record form"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto px-6 py-6" noValidate>
          <div className="space-y-5">
            {appointmentSchedule && <div className="rounded-lg border border-primary-200 bg-primary-50 p-4 text-sm text-primary-700"><p>Scheduled appointment: {appointmentLabel(appointmentSchedule)}</p>{consultationStartedAt && <p className="mt-1">Actual consultation started: {appointmentLabel(consultationStartedAt)}</p>}<p className="mt-2">Saving this consultation finalizes the medical record and completes the appointment. Closing the form leaves it available to resume.</p></div>}
            {errors.root?.message && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errors.root.message}
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="patientId" className="text-sm font-semibold text-slate-900">
                  Patient / Resident <span className="text-red-500">*</span>
                </label>
                <select
                  id="patientId"
                  disabled={Boolean(appointmentId || initialData?.appointmentId)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                  {...register('patientId')}
                >
                  <option value="">Select a resident</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {appointmentId ? patient.name : `${patient.name} - Age ${patient.age} - ${patient.barangayZone}`}
                    </option>
                  ))}
                </select>
                {errors.patientId && <p className="text-sm text-red-600">{errors.patientId.message}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="date" className="text-sm font-semibold text-slate-900">
                  Consultation Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="date"
                    readOnly={Boolean(appointmentId || initialData?.appointmentId)}
                    type="date"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-11 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    {...register('date')}
                  />
                  <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                </div>
                {errors.date && <p className="text-sm text-red-600">{errors.date.message}</p>}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="diagnosis" className="text-sm font-semibold text-slate-900">
                  Diagnosis / Clinical Impression <span className="text-red-500">*</span>
                </label>
                <input
                  id="diagnosis"
                  type="text"
                  placeholder="e.g., Upper Respiratory Tract Infection (URTI)"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                  {...register('diagnosis')}
                />
                {errors.diagnosis && <p className="text-sm text-red-600">{errors.diagnosis.message}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="assignedNurse" className="text-sm font-semibold text-slate-900">
                  Assigned Nurse
                  <span className="ml-2 text-xs font-normal text-slate-500">Optional</span>
                </label>
                <div className="relative">
                  <input
                    id="assignedNurse"
                    type="text"
                    placeholder="e.g., Nurse Maria Santos, RN"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-11 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    {...register('assignedNurse')}
                  />
                  <UserCheck className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                </div>
                {errors.assignedNurse && (
                  <p className="text-sm text-red-600">{errors.assignedNurse.message}</p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-primary-200 bg-primary-50 p-4 text-sm text-primary-700">
              <p>Save the consultation, then open its details to select and dispense medicines from inventory.</p>
              <p className="mt-1">Editing this record does not change previously dispensed stock.</p>
              {initialData?.medicinesGiven.length ? (
                <p className="mt-2">Previously recorded medicines: {initialData.medicinesGiven.join(', ')}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-semibold text-slate-900">
                Notes & Instructions <span className="text-red-500">*</span>
              </label>
              <textarea
                id="notes"
                rows={4}
                placeholder="Add consultation notes, vital signs, instructions, or follow-up schedule"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                {...register('notes')}
              />
              {errors.notes && <p className="text-sm text-red-600">{errors.notes.message}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="attachments" className="text-sm font-semibold text-slate-900">
                Attachments
                <span className="ml-2 text-xs font-medium text-slate-500">Optional</span>
              </label>
              {initialData?.attachments.length ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Existing Attachments
                  </p>
                  <div className="mt-2 space-y-1">
                    {initialData.attachments.map((attachment) => (
                      <p key={`${attachment.name}-${attachment.size}`} className="text-sm text-slate-600">
                        {attachment.name}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-3 text-slate-700">
                  <div className="rounded-xl bg-white p-2 shadow-sm">
                    <FileUp className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Upload supporting files</p>
                    <p className="text-xs text-slate-500">
                      {isEditMode
                        ? 'Uploading new files will append them to the current attachment list.'
                        : 'Photos, referral slips, or scanned notes can be attached.'}
                    </p>
                  </div>
                </div>
                <input
                  id="attachments"
                  type="file"
                  multiple
                  className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-teal-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-teal-700"
                  {...register('attachments')}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={submitMutation.isPending}
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitMutation.isPending}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isEditMode ? 'Saving changes...' : 'Saving record...'}
                </>
              ) : (
                isEditMode ? 'Save Changes' : 'Save Medical Record'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
