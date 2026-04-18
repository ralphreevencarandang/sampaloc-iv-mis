'use client'

import Image from 'next/image'
import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Edit2, Trash2, Eye, ChevronLeft, ChevronRight, Archive, RotateCcw } from 'lucide-react'
import axios from 'axios'
import OfficialModalForm from '@/components/ui/Admin/OfficialModalForm'
import apiClient from '@/lib/axios'
import type { OfficialRecord } from '@/server/officials/officials'
import { archiveOfficialAction, unarchiveOfficialAction } from '@/server/actions/archive.actions'
import Link from 'next/link'

const ITEMS_PER_PAGE = 10
const OFFICIALS_QUERY_KEY = ['officials']

async function fetchOfficials(): Promise<OfficialRecord[]> {
  try {
    const response = await apiClient.get<OfficialRecord[]>('/officials')
    return response.data
  } catch (error) {
    if (axios.isAxiosError<{ message?: string }>(error)) {
      throw new Error(error.response?.data?.message ?? 'Failed to fetch officials.')
    }

    throw error
  }
}

export default function OfficialsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedOfficial, setSelectedOfficial] = useState<OfficialRecord | null>(null)
  const [actionError, setActionError] = useState('')
  const queryClient = useQueryClient()

  const {
    data: officials = [],
    isLoading,
    isError,
    error,
  } = useQuery<OfficialRecord[]>({
    queryKey: OFFICIALS_QUERY_KEY,
    queryFn: fetchOfficials,
  })

  const filteredOfficials = useMemo(() => {
    return officials.filter(official =>
      official.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      official.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      official.position.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [officials, searchTerm])

  const totalPages = Math.ceil(filteredOfficials.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedOfficials = filteredOfficials.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'Inactive':
        return 'bg-slate-50 text-slate-700 border-slate-200'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  const archiveMutation = useMutation({
    mutationFn: async (payload: { id: string; archived: boolean }) => {
      return payload.archived
        ? archiveOfficialAction(payload.id)
        : unarchiveOfficialAction(payload.id)
    },
    onSuccess: (result) => {
      if (!result.success) {
        setActionError(result.message)
        return
      }

      setActionError('')
      void queryClient.invalidateQueries({ queryKey: OFFICIALS_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: ['archivedData', 'officials'] })
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : 'Failed to update official archive state.')
    },
  })

  const handleArchiveToggle = (official: OfficialRecord) => {
    setActionError('')
    archiveMutation.mutate({
      id: official.id,
      archived: !official.isArchive,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Barangay Officials</h1>
          <p className="text-slate-600 mt-1">Manage barangay officials and their positions</p>
        </div>
        <button
          onClick={() => {
            setSelectedOfficial(null)
            setIsModalOpen(true)
          }}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg font-semibold shadow-md shadow-primary-600/30 transition-all duration-300 hover:-translate-y-0.5 w-fit"
        >
          <Plus className="w-5 h-5" />
          Add Official
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-lg border border-gray-200">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or position..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="flex-1 bg-transparent outline-none text-slate-700 placeholder-slate-500"
          />
        </div>
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-100">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Profile</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Email</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Position</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Term Start</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Term End</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Status</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wide">Options</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <p className="text-slate-600 font-medium">Loading officials...</p>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <p className="text-sm font-medium text-red-600">
                      {error instanceof Error ? error.message : 'Failed to load officials.'}
                    </p>
                  </td>
                </tr>
              ) : paginatedOfficials.length > 0 ? (
                paginatedOfficials.map((official) => (
                  <tr key={official.id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      {official.officialProfile ? (
                        <Image
                          src={official.officialProfile}
                          alt={official.name}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">
                          {official.name.charAt(0)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{official.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{official.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate" title={official.position}>{official.position}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{new Date(official.termStart).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{official.termEnd ? new Date(official.termEnd).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(official.status)}`}>
                        {official.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/admin/officials/${official.id}`}>
                          <button className="p-1.5 hover:bg-primary-50 text-primary-600 rounded-lg transition-colors" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>
                        <button 
                          onClick={() => {
                            setSelectedOfficial(official)
                            setIsModalOpen(true)
                          }}
                          className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors" 
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleArchiveToggle(official)}
                          disabled={archiveMutation.isPending}
                          className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={official.isArchive ? 'Unarchive' : 'Archive'}
                        >
                          {official.isArchive ? (
                            <RotateCcw className="w-4 h-4" />
                          ) : (
                            <Archive className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <p className="text-slate-600 font-medium">No officials found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredOfficials.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-slate-50">
            <div className="text-sm text-slate-600">
              Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
              <span className="font-semibold">{Math.min(startIndex + ITEMS_PER_PAGE, filteredOfficials.length)}</span> of{' '}
              <span className="font-semibold">{filteredOfficials.length}</span> officials
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-lg font-medium transition-colors ${
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
                className="p-2 rounded-lg border border-gray-200 text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Official Modal */}
      <OfficialModalForm
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedOfficial(null)
        }}
        initialData={selectedOfficial}
      />
    </div>
  )
}
