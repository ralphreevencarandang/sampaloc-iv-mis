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
import { calculateAge, getDemographicGroup } from '@/lib/resident-demographics'

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
  subdivision: string | null
  phase: string | null
  contactNumber: string | null
  occupation: string | null
  citizenship: string
  isVoter: boolean
  precinctNumber: string | null
  is4Ps: boolean
  isPwd: boolean
  pwdCondition: string | null
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
const civilStatusOptions = ['Single', 'Married', 'Widowed', 'Divorced', 'Separated', 'Solo Parent']

function formatResidentAddress(resident: Pick<ResidentRecord, 'houseNumber' | 'street' | 'subdivision' | 'phase'>) {
  return [resident.houseNumber, resident.street, resident.subdivision, resident.phase].filter(Boolean).join(', ')
}

export default function ResidentPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedResident, setSelectedResident] = useState<ResidentRecord | null>(null)
  const [actionError, setActionError] = useState('')
  const [demographicFilter, setDemographicFilter] = useState('All')
  const [voterFilter, setVoterFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [fourPsFilter, setFourPsFilter] = useState('All')
  const [pwdFilter, setPwdFilter] = useState('All')
  const [civilStatusFilter, setCivilStatusFilter] = useState('All')
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
      const address = formatResidentAddress(resident).toLowerCase()
      const search = searchTerm.toLowerCase()
      const demographic = getDemographicGroup(resident.birthDate)

      if (demographicFilter !== 'All' && demographic !== demographicFilter) return false
      if (voterFilter !== 'All' && (resident.isVoter ? 'Yes' : 'No') !== voterFilter) return false
      if (statusFilter !== 'All' && resident.status !== statusFilter) return false
      if (fourPsFilter !== 'All' && (resident.is4Ps ? 'Yes' : 'No') !== fourPsFilter) return false
      if (pwdFilter !== 'All' && (resident.isPwd ? 'Yes' : 'No') !== pwdFilter) return false
      if (civilStatusFilter !== 'All' && resident.civilStatus !== civilStatusFilter) return false

      return (
        fullName.includes(search) ||
        resident.email.toLowerCase().includes(search) ||
        address.includes(search)
      )
    })
  }, [
    civilStatusFilter,
    demographicFilter,
    fourPsFilter,
    pwdFilter,
    residents,
    searchTerm,
    statusFilter,
    voterFilter,
  ])

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

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>) => {
    return (event: React.ChangeEvent<HTMLSelectElement>) => {
      setter(event.target.value)
      setCurrentPage(1)
    }
  }

  const resetFilters = () => {
    setSearchTerm('')
    setDemographicFilter('All')
    setVoterFilter('All')
    setStatusFilter('All')
    setFourPsFilter('All')
    setPwdFilter('All')
    setCivilStatusFilter('All')
    setCurrentPage(1)
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
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
          
          <div>
            
            <select value={demographicFilter} onChange={handleFilterChange(setDemographicFilter)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="All">All Demographics</option>
              <option value="Minor">Minor</option>
              <option value="Adult">Adult</option>
              <option value="Senior">Senior</option>
            
            </select>

          </div>
          

          <select value={voterFilter} onChange={handleFilterChange(setVoterFilter)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="All">All Voters</option>
            <option value="Yes">Voter: Yes</option>
            <option value="No">Voter: No</option>
          </select>

          <select value={statusFilter} onChange={handleFilterChange(setStatusFilter)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="All">All Statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Pending</option>
            <option value="DECLINED">Declined</option>
          </select>
          <select value={fourPsFilter} onChange={handleFilterChange(setFourPsFilter)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="All">All 4Ps</option>
            <option value="Yes">4Ps: Yes</option>
            <option value="No">4Ps: No</option>
          </select>
          <select value={pwdFilter} onChange={handleFilterChange(setPwdFilter)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="All">All PWD</option>
            <option value="Yes">PWD: Yes</option>
            <option value="No">PWD: No</option>
          </select>
          <select value={civilStatusFilter} onChange={handleFilterChange(setCivilStatusFilter)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="All">All Civil Statuses</option>
            {civilStatusOptions.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Filters
          </button>
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
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">4Ps</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">PWD</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Address</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Status</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-700">Options</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedResidents.length > 0 ? (
                    paginatedResidents.map((resident) => {
                      const fullName = `${resident.firstName} ${resident.middleName ? `${resident.middleName} ` : ''}${resident.lastName}`
                      const address = formatResidentAddress(resident)
                      const age = calculateAge(resident.birthDate)

                      return (
                        <tr key={resident.id} className="border-b border-gray-100 transition-colors hover:bg-slate-50">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">{fullName}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{resident.email}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{age}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{resident.gender}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{resident.civilStatus}</td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className={`inline-flex items-center rounded-full  px-2.5 py-1 text-xs  `}
                            >
                              {resident.isVoter ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{resident.is4Ps ? 'Yes' : 'No'}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {resident.isPwd ? resident.pwdCondition || 'Yes' : 'No'}
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
                      <td colSpan={11} className="px-6 py-12 text-center">
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
