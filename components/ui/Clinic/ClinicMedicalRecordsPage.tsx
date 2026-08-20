'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Edit2,
  Eye,
  Loader2,
  Pill,
  RotateCcw,
  Search,
  UserCheck,
} from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import BulkActionBar from '@/components/ui/Admin/BulkActionBar'
import BulkConfirmModal from '@/components/ui/Admin/BulkConfirmModal'
import ClinicMedicalRecordDetailsModal from '@/components/ui/Clinic/ClinicMedicalRecordDetailsModal'
import MedicalRecordModalForm from '@/components/ui/Clinic/MedicalRecordModalForm'
import { fetchClinicMedicalRecords } from '@/lib/clinic-api'
import type { ClinicMedicalRecordListItem } from '@/lib/clinic-utils'
import {
  archiveMedicalRecordAction,
  unarchiveMedicalRecordAction,
} from '@/server/actions/clinic.actions'
import {
  bulkArchiveMedicalRecordsAction,
  bulkUnarchiveMedicalRecordsAction,
} from '@/server/actions/archive.actions'

type PatientOption = {
  id: string
  name: string
  age: number
  barangayZone: string
}

type ClinicMedicalRecordsPageProps = {
  patients: PatientOption[]
}

type RecordTab = 'active' | 'archived'

const ITEMS_PER_PAGE = 10

function MedicalRecordsSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-slate-50">
            <th className="w-12 px-4 py-4 text-center">
              <div className="h-4 w-4 mx-auto animate-pulse rounded bg-slate-200" />
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Patient Name</th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Diagnosis</th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Notes</th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Assigned Nurse</th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Medicines Given</th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Date</th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Created By</th>
            <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }, (_, index) => (
            <tr key={index} className="border-b border-gray-100">
              <td className="w-12 px-4 py-4 text-center"><div className="h-4 w-4 mx-auto animate-pulse rounded bg-slate-200" /></td>
              <td className="px-6 py-4"><div className="h-4 w-36 animate-pulse rounded bg-slate-200" /></td>
              <td className="px-6 py-4"><div className="h-4 w-28 animate-pulse rounded bg-slate-200" /></td>
              <td className="px-6 py-4"><div className="h-4 w-36 animate-pulse rounded bg-slate-200" /></td>
              <td className="px-6 py-4"><div className="h-4 w-24 animate-pulse rounded bg-slate-200" /></td>
              <td className="px-6 py-4"><div className="h-4 w-32 animate-pulse rounded bg-slate-200" /></td>
              <td className="px-6 py-4"><div className="h-4 w-20 animate-pulse rounded bg-slate-200" /></td>
              <td className="px-6 py-4"><div className="h-4 w-24 animate-pulse rounded bg-slate-200" /></td>
              <td className="px-6 py-4"><div className="ml-auto h-8 w-24 animate-pulse rounded bg-slate-200" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ClinicMedicalRecordsPage({
  patients,
}: ClinicMedicalRecordsPageProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<RecordTab>('active')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<ClinicMedicalRecordListItem | null>(null)
  const [viewRecordId, setViewRecordId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)

  const archived = activeTab === 'archived'

  const medicalRecordsQuery = useQuery<ClinicMedicalRecordListItem[]>({
    queryKey: ['medical-records', activeTab],
    queryFn: () => fetchClinicMedicalRecords(archived),
  })

  const archiveMutation = useMutation({
    mutationFn: async (payload: { id: string; archived: boolean }) => {
      return payload.archived
        ? archiveMedicalRecordAction(payload.id)
        : unarchiveMedicalRecordAction(payload.id)
    },
    onSuccess: async (result, variables) => {
      if (!result.success) {
        toast.error(result.message)
        return
      }

      await queryClient.invalidateQueries({ queryKey: ['medical-records'] })
      await queryClient.invalidateQueries({ queryKey: ['medical-record', variables.id] })
      toast.success(result.message)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update medical record status.')
    },
  })

  const bulkActionMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return archived
        ? bulkUnarchiveMedicalRecordsAction(ids)
        : bulkArchiveMedicalRecordsAction(ids)
    },
    onSuccess: async (result) => {
      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      setSelectedIds([])
      setIsBulkModalOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['medical-records'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to perform bulk action.')
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
        record.createdByName.toLowerCase().includes(search) ||
        (record.assignedNurse && record.assignedNurse.toLowerCase().includes(search)) ||
        (record.medicinesGiven && record.medicinesGiven.some((m) => m.toLowerCase().includes(search)))
      )
    })
  }, [medicalRecordsQuery.data, searchTerm])

  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  // Selection handlers
  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSelectAllFiltered = () => {
    setSelectedIds(filteredRecords.map((item) => item.id))
  }

  const isAllPageSelected =
    paginatedRecords.length > 0 &&
    paginatedRecords.every((item) => selectedIds.includes(item.id))

  const handleToggleSelectAllPage = () => {
    if (isAllPageSelected) {
      const pageIds = paginatedRecords.map((item) => item.id)
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)))
    } else {
      const pageIds = paginatedRecords.map((item) => item.id)
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])))
    }
  }

  const handleTabChange = (newTab: RecordTab) => {
    setActiveTab(newTab)
    setCurrentPage(1)
    setSelectedIds([])
  }

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

  const emptyMessage = archived ? 'No archived medical records found' : 'No medical records found'

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Medical Records</h1>
            <p className="mt-1 text-slate-600">
              Review, update, and archive clinic consultation records and medications.
            </p>
          </div>

          {!archived ? (
            <button
              type="button"
              onClick={() => {
                setSelectedRecord(null)
                setIsFormOpen(true)
              }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 font-semibold text-white transition hover:bg-teal-700 shadow-md shadow-teal-900/10"
            >
              <CirclePlus className="h-5 w-5" />
              Add Medical Record
            </button>
          ) : null}
        </div>

        {/* Floating Bulk Action Bar */}
        <BulkActionBar
          selectedCount={selectedIds.length}
          totalCount={filteredRecords.length}
          onClearSelection={() => setSelectedIds([])}
          onSelectAll={handleSelectAllFiltered}
          isAllSelected={selectedIds.length === filteredRecords.length && filteredRecords.length > 0}
          onBulkAction={() => setIsBulkModalOpen(true)}
          actionType={archived ? 'unarchive' : 'archive'}
          actionLabel={archived ? 'Bulk Unarchive' : 'Bulk Archive'}
          isLoading={bulkActionMutation.isPending}
        />

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <nav className="flex border-b border-slate-200 px-4" aria-label="Medical record tabs">
            {[
              { id: 'active', label: 'Active Records' },
              { id: 'archived', label: 'Archived Records' },
            ].map((tab) => {
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id as RecordTab)}
                  className={`border-b-2 px-4 py-4 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-slate-500 hover:border-gray-300 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </nav>

          <div className="p-4">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by patient, diagnosis, notes, assigned nurse, or medicines..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value)
                  setCurrentPage(1)
                }}
                className="flex-1 bg-transparent text-slate-700 outline-none placeholder-slate-400"
              />
            </div>
          </div>

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
              <p className="font-medium text-slate-700">{emptyMessage}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="w-12 px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isAllPageSelected}
                          onChange={handleToggleSelectAllPage}
                          aria-label="Select all medical records on this page"
                          className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-700">Patient Name</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-700">Diagnosis</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-700">Notes</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-700">Assigned Nurse</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-700">Medicines Given</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-700">Date</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-700">Created By</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedRecords.map((record) => {
                      const isSelected = selectedIds.includes(record.id)
                      return (
                        <tr
                          key={record.id}
                          className={`transition-colors ${
                            isSelected ? 'bg-teal-50/50' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="w-12 px-4 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectRow(record.id)}
                              aria-label={`Select record for ${record.patientName}`}
                              className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 whitespace-nowrap">
                            {record.patientName}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-800">
                            {record.diagnosis}
                          </td>
                          <td className="max-w-xs px-6 py-4 text-sm text-slate-600">
                            <p className="line-clamp-2">{record.notes}</p>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">
                            {record.assignedNurse ? (
                              <div className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                                <UserCheck className="h-4 w-4 text-teal-600 shrink-0" />
                                <span>{record.assignedNurse}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 max-w-xs">
                            {record.medicinesGiven && record.medicinesGiven.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {record.medicinesGiven.map((med, idx) => (
                                  <span
                                    key={`${med}-${idx}`}
                                    className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800"
                                  >
                                    <Pill className="h-3 w-3 text-teal-600 shrink-0" />
                                    <span>{med}</span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                            {new Date(record.date).toLocaleDateString('en-PH')}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{record.createdByName}</td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setViewRecordId(record.id)}
                                className="rounded-lg p-2 text-teal-600 transition-colors hover:bg-teal-50"
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {!archived ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedRecord(record)
                                    setIsFormOpen(true)
                                  }}
                                  className="rounded-lg p-2 text-amber-600 transition-colors hover:bg-amber-50"
                                  title="Edit record"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() =>
                                  archiveMutation.mutate({
                                    id: record.id,
                                    archived: !record.isArchive,
                                  })
                                }
                                disabled={archiveMutation.isPending}
                                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                title={record.isArchive ? 'Unarchive' : 'Archive'}
                              >
                                {record.isArchive ? (
                                  <RotateCcw className="h-4 w-4" />
                                ) : (
                                  <Archive className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
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
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`h-9 w-9 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'border border-slate-200 text-slate-600 hover:bg-slate-100'
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
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
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
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setSelectedRecord(null)
        }}
        patients={patients}
        initialData={selectedRecord}
      />

      <ClinicMedicalRecordDetailsModal
        isOpen={Boolean(viewRecordId)}
        recordId={viewRecordId}
        onClose={() => setViewRecordId(null)}
      />

      {/* Bulk Confirm Modal */}
      <BulkConfirmModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onConfirm={() => bulkActionMutation.mutate(selectedIds)}
        title={archived ? 'Restore Selected Medical Records' : 'Archive Selected Medical Records'}
        message={`Are you sure you want to ${archived ? 'restore' : 'archive'} ${selectedIds.length} selected medical record${
          selectedIds.length !== 1 ? 's' : ''
        }?`}
        confirmText={archived ? 'Restore Selected' : 'Archive Selected'}
        variant={archived ? 'primary' : 'warning'}
        isPending={bulkActionMutation.isPending}
      />
    </>
  )
}
