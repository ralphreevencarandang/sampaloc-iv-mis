'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Edit2, Eye, Archive, RotateCcw, Search } from 'lucide-react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import ResidentFormModal from '@/components/ui/Admin/ResidentFormModal'
import {
  archiveResidentAction,
  unarchiveResidentAction,
} from '@/server/actions/resident.actions'

export interface ResidentRecord {
  id: string
  email: string
  firstName: string
  lastName: string
  middleName: string | null
  birthDate: string
  gender: string
  civilStatus: string
  street: string
  houseNumber: string
  contactNumber: string | null
  occupation: string | null
  citizenship: string
  isVoter: boolean
  precinctNumber: string | null
  isArchived: boolean
  status: 'PENDING' | 'APPROVED' | 'DECLINED'
  createdAt?: string
}

async function fetchResidents(): Promise<ResidentRecord[]> {
  const response = await fetch(`/api/residents`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(error?.message ?? 'Failed to fetch residents.')
  }

  return (await response.json()) as ResidentRecord[]
}

const ITEMS_PER_PAGE = 10

export default function ResidentPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedResident, setSelectedResident] = useState<ResidentRecord | null>(null)
  const [actionError, setActionError] = useState('')
  const queryClient = useQueryClient()

  const {
    data: residents = [],
    isLoading,
    isError,
    error,
  } = useQuery<ResidentRecord[]>({
    queryKey: ['residents'],
    queryFn: fetchResidents,
  })

  const filteredResidents = useMemo(() => {
    return residents.filter((resident) => {
      const fullName = `${resident.firstName} ${resident.lastName}`.toLowerCase()
      const address = `${resident.houseNumber} ${resident.street}`.toLowerCase()
      const search = searchTerm.toLowerCase()

      return (
        fullName.includes(search) ||
        resident.email.toLowerCase().includes(search) ||
        address.includes(search)
      )
    })
  }, [searchTerm, residents])

  const totalPages = Math.ceil(filteredResidents.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedResidents = filteredResidents.slice(startIndex, startIndex + ITEMS_PER_PAGE)

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



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'DECLINED':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  const computeAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()

    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--
    }

    return age
  }

  const archiveMutation = useMutation({
    mutationFn: async (payload: { id: string; archived: boolean }) => {
      return payload.archived
        ? archiveResidentAction(payload.id)
        : unarchiveResidentAction(payload.id)
    },
    onSuccess: (result) => {
      if (!result.success) {
        setActionError(result.message)
        toast.error(result.message)
        return
      }

      setActionError('')
      toast.success(result.message)
      void queryClient.invalidateQueries({ queryKey: ['residents'] })
      void queryClient.invalidateQueries({ queryKey: ['archivedData', 'residents'] })
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to update resident archive state.'
      setActionError(message)
      toast.error(message)
    },
  })

  const handleArchiveToggle = (resident: ResidentRecord) => {
    setActionError('')
    archiveMutation.mutate({
      id: resident.id,
      archived: !resident.isArchived,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Residents</h1>
          <p className="mt-1 text-slate-600">Manage barangay residents and their information</p>
        </div>

        <div className="flex flex-wrap gap-3">
        </div>
      </div>

      <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-slate-50 px-4 py-2.5">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search active residents..."
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value)
              setCurrentPage(1)
            }}
            className="flex-1 bg-transparent text-slate-700 outline-none placeholder-slate-500"
          />
        </div>
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="px-6 py-12 text-center text-slate-500">Loading residents...</div>
        ) : isError ? (
          <div className="px-6 py-12 text-center text-red-500">
            Error loading residents: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-slate-50">
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Age</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Gender</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Civil Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Voters</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Address</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Status</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-700">Options</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedResidents.length > 0 ? (
                    paginatedResidents.map((resident) => {
                      const fullName = `${resident.firstName} ${resident.middleName ? `${resident.middleName} ` : ''}${resident.lastName}`
                      const address = `${resident.houseNumber} ${resident.street}`
                      const age = computeAge(resident.birthDate)

                      return (
                        <tr key={resident.id} className="border-b border-gray-100 transition-colors hover:bg-slate-50">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">{fullName}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{resident.email}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{age}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{resident.gender}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{resident.civilStatus}</td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                                resident.isVoter
                                  ? 'border-primary-200 bg-primary-50 text-primary-700'
                                  : 'border-slate-200 bg-slate-50 text-slate-700'
                              }`}
                            >
                              {resident.isVoter ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="max-w-xs truncate px-6 py-4 text-sm text-slate-600">{address}</td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusColor(resident.status)}`}
                            >
                              {resident.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Link
                                href={`/admin/resident/${resident.id}`}
                                className="rounded-lg p-1.5 text-primary-600 transition-colors hover:bg-primary-50"
                                title="View"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                              <button
                                onClick={() => {
                                  setSelectedResident(resident)
                                  setIsModalOpen(true)
                                }}
                                className="rounded-lg p-1.5 text-amber-600 transition-colors hover:bg-amber-50"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleArchiveToggle(resident)}
                                disabled={archiveMutation.isPending}
                                className="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                title={resident.isArchived ? 'Unarchive' : 'Archive'}
                              >
                                {resident.isArchived ? (
                                  <RotateCcw className="h-4 w-4" />
                                ) : (
                                  <Archive className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
                        <p className="font-medium text-slate-600">
                          No active residents found matching your criteria
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredResidents.length > 0 && (
              <div className="flex items-center justify-between border-t border-gray-100 bg-slate-50 px-6 py-4">
                <div className="text-sm text-slate-600">
                  Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
                  <span className="font-semibold">{Math.min(startIndex + ITEMS_PER_PAGE, filteredResidents.length)}</span> of{' '}
                  <span className="font-semibold">{filteredResidents.length}</span> residents
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-gray-200 p-2 text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                      <button
                        key={page}
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
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-gray-200 p-2 text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ResidentFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedResident(null)
        }}
        initialData={selectedResident}
      />
    </div>
  )
}
