"use client"

import React, { useState, useMemo } from 'react'
import { Search, Plus, Edit2, Eye, ChevronLeft, ChevronRight, Loader2, AlertCircle, Archive, RotateCcw } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import BlotterModalForm from '@/components/ui/Admin/BlotterModalForm'
import BulkActionBar from '@/components/ui/Admin/BulkActionBar'
import BulkConfirmModal from '@/components/ui/Admin/BulkConfirmModal'
import axios from '@/lib/axios'
import type { BlotterRecord } from '@/server/actions/blotter.actions'
import {
  archiveBlotterAction,
  unarchiveBlotterAction,
  bulkArchiveBlottersAction,
} from '@/server/actions/archive.actions'

const ITEMS_PER_PAGE = 10

export default function BlotterPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedBlotter, setSelectedBlotter] = useState<BlotterRecord | null>(null)
  const [actionError, setActionError] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: blotters = [], isLoading, error } = useQuery<BlotterRecord[]>({
    queryKey: ['blotters'],
    queryFn: async () => {
      const response = await axios.get('/blotter')
      return response.data
    }
  })

  const filteredBlotters = useMemo(() => {
    return blotters.filter(blotter =>
      blotter.complainant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blotter.respondentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blotter.incident.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blotter.location.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [searchTerm, blotters])

  const totalPages = Math.ceil(filteredBlotters.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedBlotters = filteredBlotters.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Resolved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'Open':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  const archiveMutation = useMutation({
    mutationFn: async (payload: { id: string; archived: boolean }) => {
      return payload.archived
        ? archiveBlotterAction(payload.id)
        : unarchiveBlotterAction(payload.id)
    },
    onSuccess: (result) => {
      if (!result.success) {
        setActionError(result.message)
        toast.error(result.message)
        return
      }

      setActionError('')
      toast.success(result.message)
      void queryClient.invalidateQueries({ queryKey: ['blotters'] })
      void queryClient.invalidateQueries({ queryKey: ['archivedData', 'blotters'] })
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : 'Failed to update blotter archive state.'
      setActionError(msg)
      toast.error(msg)
    },
  })

  const bulkArchiveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return bulkArchiveBlottersAction(ids)
    },
    onSuccess: (result) => {
      if (!result.success) {
        setActionError(result.message)
        toast.error(result.message)
        return
      }

      setActionError('')
      toast.success(result.message)
      setSelectedIds([])
      setIsBulkModalOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['blotters'] })
      void queryClient.invalidateQueries({ queryKey: ['archivedData', 'blotters'] })
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : 'Failed to bulk archive blotter records.'
      setActionError(msg)
      toast.error(msg)
    },
  })

  const handleArchiveToggle = (blotter: BlotterRecord) => {
    setActionError('')
    archiveMutation.mutate({
      id: blotter.id,
      archived: !blotter.isArchive,
    })
  }

  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSelectAllCurrentPage = () => {
    const pageIds = paginatedBlotters.map((b) => b.id)
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id))

    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])))
    }
  }

  const handleSelectAllFiltered = () => {
    const allIds = filteredBlotters.map((b) => b.id)
    setSelectedIds(allIds)
  }

  const isCurrentPageAllSelected =
    paginatedBlotters.length > 0 &&
    paginatedBlotters.every((b) => selectedIds.includes(b.id))

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Blotter</h1>
          <p className="text-slate-600 mt-1">Manage barangay blotter reports and incidents</p>
        </div>
        <button
          onClick={() => {
            setSelectedBlotter(null)
            setIsModalOpen(true)
          }}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg font-semibold shadow-md shadow-primary-600/30 transition-all duration-300 hover:-translate-y-0.5 w-fit"
        >
          <Plus className="w-5 h-5" />
          Add Blotter
        </button>
      </div>

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={filteredBlotters.length}
        onClearSelection={() => setSelectedIds([])}
        onSelectAll={handleSelectAllFiltered}
        isAllSelected={selectedIds.length === filteredBlotters.length}
        onBulkAction={() => setIsBulkModalOpen(true)}
        actionType="archive"
        actionLabel="Bulk Archive"
        isLoading={bulkArchiveMutation.isPending}
      />

      <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-lg border border-gray-200">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by complainant, respondent, incident, or location..."
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

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-100">
                <th className="w-12 px-4 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={isCurrentPageAllSelected}
                    onChange={handleSelectAllCurrentPage}
                    aria-label="Select all blotters on this page"
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Complainant</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Respondent</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Incident</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Location</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Handled By</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wide">Options</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                       <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                       <p className="text-slate-600 font-medium">Loading blotters...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                       <AlertCircle className="w-8 h-8 text-red-500" />
                       <p className="text-slate-600 font-medium">Error loading blotters. Please try again.</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedBlotters.length > 0 ? (
                paginatedBlotters.map((blotter) => {
                  const isSelected = selectedIds.includes(blotter.id)
                  return (
                    <tr
                      key={blotter.id}
                      className={`border-b border-gray-100 transition-colors ${
                        isSelected ? 'bg-primary-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="w-12 px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(blotter.id)}
                          aria-label={`Select blotter for ${blotter.complainant}`}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{blotter.complainant}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{blotter.respondentName}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate" title={blotter.incident}>{blotter.incident}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{blotter.location}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{new Date(blotter.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(blotter.status)}`}>
                          {blotter.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{blotter.handledBy || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {blotter.blotterImage && (
                            <a href={blotter.blotterImage} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-primary-50 text-primary-600 rounded-lg transition-colors" title="View Image">
                              <Eye className="w-4 h-4" />
                            </a>
                          )}
                          <button 
                            onClick={() => {
                              setSelectedBlotter(blotter)
                              setIsModalOpen(true)
                            }}
                            className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleArchiveToggle(blotter)}
                            disabled={archiveMutation.isPending}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={blotter.isArchive ? 'Unarchive' : 'Archive'}
                          >
                            {blotter.isArchive ? (
                              <RotateCcw className="w-4 h-4" />
                            ) : (
                              <Archive className="w-4 h-4" />
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
                    <p className="text-slate-600 font-medium">No blotters found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredBlotters.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-slate-50">
            <div className="text-sm text-slate-600">
              Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
              <span className="font-semibold">{Math.min(startIndex + ITEMS_PER_PAGE, filteredBlotters.length)}</span> of{' '}
              <span className="font-semibold">{filteredBlotters.length}</span> blotters
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

      <BlotterModalForm 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false)
          setSelectedBlotter(null)
        }} 
        initialData={selectedBlotter} 
      />

      {/* Confirmation Modal */}
      <BulkConfirmModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onConfirm={() => bulkArchiveMutation.mutate(selectedIds)}
        title="Archive Selected Blotters"
        message={`Are you sure you want to archive ${selectedIds.length} selected blotter record${
          selectedIds.length !== 1 ? 's' : ''
        }? They will be moved to the archive section.`}
        confirmText="Archive Selected"
        variant="warning"
        isPending={bulkArchiveMutation.isPending}
      />
    </div>
  )
}