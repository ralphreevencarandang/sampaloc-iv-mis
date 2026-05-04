'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  Loader2,
  Search,
} from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import ClinicMedicalRecordDetailsModal from '@/components/ui/Clinic/ClinicMedicalRecordDetailsModal'
import MedicalRecordModalForm from '@/components/ui/Clinic/MedicalRecordModalForm'
import { fetchClinicMedicalRecords } from '@/lib/clinic-api'
import type { ClinicMedicalRecordListItem } from '@/lib/clinic-utils'
import { archiveMedicalRecordAction } from '@/server/actions/clinic.actions'

type PatientOption = {
  id: string
  name: string
  age: number
  barangayZone: string
}

type AdminHealthRecordsPageProps = {
  patients: PatientOption[]
}

const ITEMS_PER_PAGE = 10

function MedicalRecordsSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-slate-50">
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Patient Name</th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Diagnosis</th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Notes</th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Date</th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Created By</th>
            <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }, (_, index) => (
            <tr key={index} className="border-b border-gray-100">
              <td className="px-6 py-4"><div className="h-4 w-40 animate-pulse rounded bg-slate-200" /></td>
              <td className="px-6 py-4"><div className="h-4 w-32 animate-pulse rounded bg-slate-200" /></td>
              <td className="px-6 py-4"><div className="h-4 w-full max-w-md animate-pulse rounded bg-slate-200" /></td>
              <td className="px-6 py-4"><div className="h-4 w-24 animate-pulse rounded bg-slate-200" /></td>
              <td className="px-6 py-4"><div className="h-4 w-28 animate-pulse rounded bg-slate-200" /></td>
              <td className="px-6 py-4"><div className="ml-auto h-8 w-24 animate-pulse rounded bg-slate-200" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function AdminHealthRecordsPage({
  patients,
}: AdminHealthRecordsPageProps) {
  const queryClient = useQueryClient()
  const [selectedRecord, setSelectedRecord] = useState<ClinicMedicalRecordListItem | null>(null)
  const [viewRecordId, setViewRecordId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const medicalRecordsQuery = useQuery<ClinicMedicalRecordListItem[]>({
    queryKey: ['medical-records'],
    queryFn: () => fetchClinicMedicalRecords(false),
  })

  const archiveMutation = useMutation({
    mutationFn: archiveMedicalRecordAction,
    onSuccess: async (result, id) => {
      if (!result.success) {
        toast.error(result.message)
        return
      }

      await queryClient.invalidateQueries({ queryKey: ['medical-records'] })
      await queryClient.invalidateQueries({ queryKey: ['medical-record', id] })
      await queryClient.invalidateQueries({ queryKey: ['archivedData', 'medical-records'] })
      toast.success(result.message)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to archive medical record.')
    },
  })

  const filteredRecords = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()

    if (!search) {
      return medicalRecordsQuery.data ?? []
    }

    return (medicalRecordsQuery.data ?? []).filter((record) => {
      return (
        record.patientName.toLowerCase().includes(search) ||
        record.diagnosis.toLowerCase().includes(search) ||
        record.notes.toLowerCase().includes(search) ||
        record.createdByName.toLowerCase().includes(search)
      )
    })
  }, [medicalRecordsQuery.data, searchTerm])

  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  useEffect(() => {
    if (totalPages === 0) {
      if (currentPage !== 1) {
        queueMicrotask(() => setCurrentPage(1))
      }
      return
    }

    if (currentPage > totalPages) {
      queueMicrotask(() => setCurrentPage(totalPages))
    }
  }, [currentPage, totalPages])

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Health Records</h1>
            <p className="mt-1 text-slate-600">Manage active medical records logged by the clinic team.</p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-slate-50 px-4 py-2.5">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by patient, diagnosis, notes, or health worker..."
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value)
                setCurrentPage(1)
              }}
              className="flex-1 bg-transparent text-slate-700 outline-none placeholder-slate-500"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
          {medicalRecordsQuery.isLoading ? (
            <MedicalRecordsSkeleton />
          ) : medicalRecordsQuery.isError ? (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
              <p className="text-sm text-red-600">
                {medicalRecordsQuery.error instanceof Error
                  ? medicalRecordsQuery.error.message
                  : 'Failed to load medical records.'}
              </p>
              <button
                type="button"
                onClick={() => void medicalRecordsQuery.refetch()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <Loader2 className="h-4 w-4" />
                Retry
              </button>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="font-medium text-slate-700">No medical records found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-slate-50">
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Patient Name</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Diagnosis</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Notes</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Created By</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecords.map((record) => (
                      <tr key={record.id} className="border-b border-gray-100 transition-colors hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{record.patientName}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{record.diagnosis}</td>
                        <td className="max-w-md px-6 py-4 text-sm text-slate-600">
                          <p className="line-clamp-2">{record.notes}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {new Date(record.date).toLocaleDateString('en-PH')}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{record.createdByName}</td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setViewRecordId(record.id)}
                              className="rounded-lg p-1.5 text-primary-600 transition-colors hover:bg-primary-50"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedRecord(record)}
                              className="rounded-lg p-1.5 text-amber-600 transition-colors hover:bg-amber-50"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => archiveMutation.mutate(record.id)}
                              disabled={archiveMutation.isPending}
                              className="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Archive"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 bg-slate-50 px-6 py-4">
                <div className="text-sm text-slate-600">
                  Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
                  <span className="font-semibold">
                    {Math.min(startIndex + ITEMS_PER_PAGE, filteredRecords.length)}
                  </span>{' '}
                  of <span className="font-semibold">{filteredRecords.length}</span> records
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((previous) => Math.max(previous - 1, 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-gray-200 p-2 text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`h-10 w-10 rounded-lg font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-primary-600 text-white'
                            : 'border border-gray-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((previous) => Math.min(previous + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-gray-200 p-2 text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <MedicalRecordModalForm
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        patients={patients}
        initialData={selectedRecord}
      />

      <ClinicMedicalRecordDetailsModal
        isOpen={Boolean(viewRecordId)}
        recordId={viewRecordId}
        onClose={() => setViewRecordId(null)}
      />
    </>
  )
}
