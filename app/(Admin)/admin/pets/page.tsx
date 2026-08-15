'use client'

import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Archive,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Loader2,
  PawPrint,
  Plus,
  Search,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/axios'
import PetsFormModal from '@/components/ui/Admin/PetsFormModal'
import BulkActionBar from '@/components/ui/Admin/BulkActionBar'
import BulkConfirmModal from '@/components/ui/Admin/BulkConfirmModal'
import {
  archivePetAction,
  unarchivePetAction,
  bulkArchivePetsAction,
} from '@/server/actions/archive.actions'
import type { PetRecord } from '@/server/actions/pet.action'

const ITEMS_PER_PAGE = 10
const PETS_ALL_QUERY_KEY = ['pets', 'all'] as const

type PetsApiError = {
  message?: string
}

async function fetchPets(): Promise<PetRecord[]> {
  try {
    const response = await api.get<PetRecord[]>('/pets')
    return response.data
  } catch (error) {
    const apiError = error as { response?: { data?: PetsApiError } }
    throw new Error(apiError.response?.data?.message ?? 'Failed to fetch pets.')
  }
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Not provided'
  }

  return new Date(value).toLocaleDateString()
}

export default function PetsPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPet, setSelectedPet] = useState<PetRecord | null>(null)
  const [actionError, setActionError] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)

  const {
    data: pets = [],
    isLoading,
    error,
  } = useQuery<PetRecord[]>({
    queryKey: PETS_ALL_QUERY_KEY,
    queryFn: fetchPets,
  })

  const archiveMutation = useMutation({
    mutationFn: async (payload: { id: string; archived: boolean }) =>
      payload.archived ? archivePetAction(payload.id) : unarchivePetAction(payload.id),
    onSuccess: (result) => {
      if (!result.success) {
        setActionError(result.message)
        toast.error(result.message)
        return
      }

      setActionError('')
      toast.success(result.message)
      void queryClient.invalidateQueries({ queryKey: ['pets'] })
      void queryClient.invalidateQueries({ queryKey: ['archivedData', 'pets'] })
    },
    onError: (mutationError) => {
      const msg = mutationError instanceof Error ? mutationError.message : 'Failed to update pet archive state.'
      setActionError(msg)
      toast.error(msg)
    },
  })

  const bulkArchiveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return bulkArchivePetsAction(ids)
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
      void queryClient.invalidateQueries({ queryKey: ['pets'] })
      void queryClient.invalidateQueries({ queryKey: ['archivedData', 'pets'] })
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : 'Failed to bulk archive pets.'
      setActionError(msg)
      toast.error(msg)
    },
  })

  const filteredPets = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    if (!query) {
      return pets
    }

    return pets.filter((pet) =>
      [pet.name, pet.type, pet.breed ?? '', pet.color ?? '', pet.ownerName]
        .some((value) => value.toLowerCase().includes(query))
    )
  }, [pets, searchTerm])

  const totalPages = Math.max(1, Math.ceil(filteredPets.length / ITEMS_PER_PAGE))
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedPets = filteredPets.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const handleArchiveToggle = (pet: PetRecord) => {
    setActionError('')
    archiveMutation.mutate({
      id: pet.id,
      archived: !pet.isArchive,
    })
  }

  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSelectAllCurrentPage = () => {
    const pageIds = paginatedPets.map((p) => p.id)
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id))

    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])))
    }
  }

  const handleSelectAllFiltered = () => {
    const allIds = filteredPets.map((p) => p.id)
    setSelectedIds(allIds)
  }

  const isCurrentPageAllSelected =
    paginatedPets.length > 0 &&
    paginatedPets.every((p) => selectedIds.includes(p.id))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pets</h1>
          <p className="mt-1 text-slate-600">Manage registered resident pets and vaccination details</p>
        </div>
        <button
          onClick={() => {
            setSelectedPet(null)
            setIsModalOpen(true)
          }}
          className="flex w-fit items-center gap-2 rounded-lg bg-primary-600 px-6 py-2.5 font-semibold text-white shadow-md shadow-primary-600/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-700"
        >
          <Plus className="h-5 w-5" />
          Add Pet
        </button>
      </div>

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={filteredPets.length}
        onClearSelection={() => setSelectedIds([])}
        onSelectAll={handleSelectAllFiltered}
        isAllSelected={selectedIds.length === filteredPets.length}
        onBulkAction={() => setIsBulkModalOpen(true)}
        actionType="archive"
        actionLabel="Bulk Archive"
        isLoading={bulkArchiveMutation.isPending}
      />

      <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-slate-50 px-4 py-2.5">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by pet, type, breed, color, or owner..."
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-slate-50">
                <th className="w-12 px-4 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={isCurrentPageAllSelected}
                    onChange={handleSelectAllCurrentPage}
                    aria-label="Select all pets on this page"
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Pet Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Owner</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Breed</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Color</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Vaccination</th>
                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-700">Options</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                      <p className="font-medium text-slate-600">Loading pets...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="h-8 w-8 text-red-500" />
                      <p className="font-medium text-slate-600">
                        {error instanceof Error ? error.message : 'Failed to load pets.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : paginatedPets.length > 0 ? (
                paginatedPets.map((pet) => {
                  const isSelected = selectedIds.includes(pet.id)
                  return (
                    <tr
                      key={pet.id}
                      className={`border-b border-gray-100 transition-colors ${
                        isSelected ? 'bg-primary-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="w-12 px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(pet.id)}
                          aria-label={`Select ${pet.name}`}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                            <PawPrint className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{pet.name}</p>
                            <p className="text-xs text-slate-500">ID: {pet.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{pet.ownerName}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{pet.type}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{pet.breed ?? 'Not provided'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{pet.color ?? 'Not provided'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDate(pet.vaccinationDate)}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedPet(pet)
                              setIsModalOpen(true)
                            }}
                            className="rounded-lg p-1.5 text-amber-600 transition-colors hover:bg-amber-50"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleArchiveToggle(pet)}
                            disabled={archiveMutation.isPending}
                            className="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            title={pet.isArchive ? 'Unarchive' : 'Archive'}
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <p className="font-medium text-slate-600">No active pets found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredPets.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-slate-50 px-6 py-4">
            <div className="text-sm text-slate-600">
              Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
              <span className="font-semibold">{Math.min(startIndex + ITEMS_PER_PAGE, filteredPets.length)}</span> of{' '}
              <span className="font-semibold">{filteredPets.length}</span> pets
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
      </div>

      <PetsFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedPet(null)
        }}
        initialData={selectedPet}
      />

      {/* Confirmation Modal */}
      <BulkConfirmModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onConfirm={() => bulkArchiveMutation.mutate(selectedIds)}
        title="Archive Selected Pets"
        message={`Are you sure you want to archive ${selectedIds.length} selected pet${
          selectedIds.length !== 1 ? 's' : ''
        }? They will be moved to the archive section.`}
        confirmText="Archive Selected"
        variant="warning"
        isPending={bulkArchiveMutation.isPending}
      />
    </div>
  )
}
