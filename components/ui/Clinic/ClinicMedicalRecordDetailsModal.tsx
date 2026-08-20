'use client'

import { useQuery } from '@tanstack/react-query'
import { Loader2, Pill, RefreshCw, UserCheck, X } from 'lucide-react'
import React from 'react'
import { fetchClinicMedicalRecordById } from '@/lib/clinic-api'

type ClinicMedicalRecordDetailsModalProps = {
  isOpen: boolean
  recordId: string | null
  onClose: () => void
}

export default function ClinicMedicalRecordDetailsModal({
  isOpen,
  recordId,
  onClose,
}: ClinicMedicalRecordDetailsModalProps) {
  const recordQuery = useQuery({
    queryKey: ['medical-record', recordId],
    queryFn: () => fetchClinicMedicalRecordById(recordId as string),
    enabled: isOpen && Boolean(recordId),
  })

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Medical Record Details</h2>
            <p className="mt-1 text-sm text-slate-600">
              Review full consultation, assigned nurse, and administered medicines.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close medical record details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {recordQuery.isLoading ? (
            <div className="flex min-h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
          ) : recordQuery.isError ? (
            <div className="space-y-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
              <p className="text-sm text-red-700">
                {recordQuery.error instanceof Error
                  ? recordQuery.error.message
                  : 'Failed to load medical record.'}
              </p>
              <button
                type="button"
                onClick={() => void recordQuery.refetch()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          ) : recordQuery.data ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patient Name</p>
                  <p className="mt-1.5 text-base font-semibold text-slate-900">
                    {recordQuery.data.patientName}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Consultation Date</p>
                  <p className="mt-1.5 text-base font-semibold text-slate-900">
                    {new Date(recordQuery.data.date).toLocaleDateString('en-PH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Diagnosis</p>
                  <p className="mt-1.5 text-base font-semibold text-slate-900">
                    {recordQuery.data.diagnosis}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned Nurse</p>
                  <p className="mt-1.5 text-base font-semibold text-slate-900 flex items-center gap-1.5">
                    {recordQuery.data.assignedNurse ? (
                      <>
                        <UserCheck className="h-4 w-4 text-teal-600 shrink-0" />
                        <span>{recordQuery.data.assignedNurse}</span>
                      </>
                    ) : (
                      <span className="text-slate-400 font-normal">Not specified</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Medicines Given / Administered
                </p>
                {recordQuery.data.medicinesGiven && recordQuery.data.medicinesGiven.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recordQuery.data.medicinesGiven.map((med, index) => (
                      <span
                        key={`${med}-${index}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-800"
                      >
                        <Pill className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                        <span>{med}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500 italic">No medicines recorded for this visit.</p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes & Instructions</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {recordQuery.data.notes}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Recorded By: <strong className="text-slate-700">{recordQuery.data.createdByName}</strong></span>
                  <span>Status: <strong className="text-slate-700">{recordQuery.data.isArchive ? 'Archived' : 'Active'}</strong></span>
                </div>
              </div>

              {recordQuery.data.attachments && recordQuery.data.attachments.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Attachments</p>
                  <div className="mt-3 space-y-2">
                    {recordQuery.data.attachments.map((attachment) => (
                      <div
                        key={`${attachment.name}-${attachment.size}`}
                        className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700"
                      >
                        {attachment.name}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
