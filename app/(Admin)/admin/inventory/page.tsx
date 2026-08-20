'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
  AlertCircle,
  Archive,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  Loader2,
  Package,
  Plus,
  Search,
  X,
} from 'lucide-react'
import React, { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import BulkConfirmModal from '@/components/ui/Admin/BulkConfirmModal'
import InventoryFormModal from '@/components/ui/Admin/InventoryFormModal'
import api from '@/lib/axios'
import { archiveInventoryItem, type InventoryRecord, type InventoryStatus } from '@/server/actions/inventory.actions'
import { INVENTORY_CATEGORIES } from '@/validations/inventory.validation'

const ITEMS_PER_PAGE = 10
const INVENTORY_QUERY_KEY = ['inventory'] as const
const STOCK_STATUSES: InventoryStatus[] = ['In Stock', 'Low Stock', 'Out of Stock']

async function fetchInventory(): Promise<InventoryRecord[]> {
  try {
    const response = await api.get<InventoryRecord[]>('/inventory')
    return response.data
  } catch (error) {
    if (axios.isAxiosError<{ message?: string }>(error)) {
      throw new Error(error.response?.data?.message ?? 'Failed to fetch inventory items.')
    }

    throw error
  }
}

function getStatusBadgeClass(status: InventoryStatus) {
  switch (status) {
    case 'In Stock':
      return 'border-green-200 bg-green-50 text-[#025c2a]'
    case 'Low Stock':
      return 'border-amber-200 bg-amber-50 text-[#0f172b]'
    case 'Out of Stock':
      return 'border-red-200 bg-red-50 text-[#0f172b]'
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function InventoryPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryRecord | null>(null)
  const [viewItem, setViewItem] = useState<InventoryRecord | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<InventoryRecord | null>(null)
  const [actionError, setActionError] = useState('')

  const {
    data: inventory = [],
    isLoading,
    isError,
    error,
  } = useQuery<InventoryRecord[]>({
    queryKey: INVENTORY_QUERY_KEY,
    queryFn: fetchInventory,
  })

  const archiveMutation = useMutation({
    mutationFn: archiveInventoryItem,
    onSuccess: (result) => {
      if (!result.success) {
        setActionError(result.message)
        toast.error(result.message)
        return
      }

      setActionError('')
      toast.success(result.message)
      setArchiveTarget(null)
      void queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: ['archivedData', 'inventory'] })
    },
    onError: (mutationError) => {
      const msg = mutationError instanceof Error ? mutationError.message : 'Failed to archive inventory item.'
      setActionError(msg)
      toast.error(msg)
    },
  })

  const filteredInventory = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return inventory.filter((item) => {
      const matchesSearch = !query || item.name.toLowerCase().includes(query)
      const matchesCategory = !categoryFilter || item.category === categoryFilter
      const matchesStatus = !statusFilter || item.status === statusFilter

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [categoryFilter, inventory, searchTerm, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredInventory.length / ITEMS_PER_PAGE))
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedInventory = filteredInventory.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const handleOpenAdd = () => {
    setSelectedItem(null)
    setIsFormModalOpen(true)
  }

  const handleOpenEdit = (item: InventoryRecord) => {
    setSelectedItem(item)
    setIsFormModalOpen(true)
  }

  const handleFilterChange = (update: () => void) => {
    update()
    setCurrentPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0f172b]">Inventory Management</h1>
          <p className="mt-1 text-slate-600">Track barangay supplies, stock levels, and storage locations</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex w-fit items-center gap-2 rounded-lg bg-[#025c2a] px-6 py-2.5 font-semibold text-white shadow-md shadow-primary-700/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#027032]"
        >
          <Plus className="h-5 w-5" />
          Add Item
        </button>
      </div>

      <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_14rem_14rem]">
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-[#f8fafc] px-4 py-2.5">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by product name..."
              value={searchTerm}
              onChange={(event) => handleFilterChange(() => setSearchTerm(event.target.value))}
              className="min-w-0 flex-1 bg-transparent text-slate-700 outline-none placeholder-slate-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(event) => handleFilterChange(() => setCategoryFilter(event.target.value))}
            className="rounded-lg border border-gray-200 bg-[#f8fafc] px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-[#0f172b] focus:ring-2 focus:ring-[#0f172b]/10"
          >
            <option value="">All Categories</option>
            {INVENTORY_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => handleFilterChange(() => setStatusFilter(event.target.value))}
            className="rounded-lg border border-gray-200 bg-[#f8fafc] px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-[#0f172b] focus:ring-2 focus:ring-[#0f172b]/10"
          >
            <option value="">All Stock Status</option>
            {STOCK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
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
              <tr className="border-b border-gray-100 bg-[#f8fafc]">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Product Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Category</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Quantity & Unit</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Storage Location</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Status</th>
                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                      <p className="font-medium text-slate-600">Loading inventory...</p>
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="h-8 w-8 text-red-500" />
                      <p className="font-medium text-slate-600">
                        {error instanceof Error ? error.message : 'Failed to load inventory.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : paginatedInventory.length > 0 ? (
                paginatedInventory.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-[#025c2a]">
                          <Package className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#0f172b]">{item.name}</p>
                          <p className="text-xs text-slate-500">ID: {item.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{item.category}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-[#0f172b]">
                      {item.quantity.toLocaleString()} {item.unit}
                    </td>
                    <td className="max-w-xs truncate px-6 py-4 text-sm text-slate-600" title={item.storageLocation}>
                      {item.storageLocation}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setViewItem(item)}
                          className="rounded-lg p-1.5 text-[#025c2a] transition-colors hover:bg-primary-50"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="rounded-lg p-1.5 text-amber-600 transition-colors hover:bg-amber-50"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setArchiveTarget(item)}
                          disabled={archiveMutation.isPending}
                          className="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Archive"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Boxes className="h-10 w-10 text-slate-300" />
                      <p className="font-medium text-slate-600">No inventory items found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredInventory.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-[#f8fafc] px-6 py-4">
            <div className="text-sm text-slate-600">
              Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
              <span className="font-semibold">{Math.min(startIndex + ITEMS_PER_PAGE, filteredInventory.length)}</span> of{' '}
              <span className="font-semibold">{filteredInventory.length}</span> items
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
                        ? 'bg-[#025c2a] text-white'
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

      <InventoryFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false)
          setSelectedItem(null)
        }}
        initialData={selectedItem}
      />

      <InventoryViewModal item={viewItem} onClose={() => setViewItem(null)} />

      <BulkConfirmModal
        isOpen={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => {
          if (archiveTarget) archiveMutation.mutate(archiveTarget.id)
        }}
        title="Archive Inventory Item"
        message={`Are you sure you want to archive ${archiveTarget?.name ?? 'this item'}? It will be moved to archived records.`}
        confirmText="Archive Item"
        variant="warning"
        isPending={archiveMutation.isPending}
      />
    </div>
  )
}

function InventoryViewModal({
  item,
  onClose,
}: {
  item: InventoryRecord | null
  onClose: () => void
}) {
  if (!item) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-100 bg-white p-6">
          <div>
            <h2 className="text-2xl font-bold text-[#0f172b]">{item.name}</h2>
            <p className="mt-1 text-sm text-slate-500">Inventory item summary</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <span className="sr-only">Close</span>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryTile label="Category" value={item.category} />
            <SummaryTile label="Stock" value={`${item.quantity.toLocaleString()} ${item.unit}`} />
            <div className="rounded-lg border border-gray-100 bg-[#f8fafc] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
              <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(item.status)}`}>
                {item.status}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-gray-100 bg-[#f8fafc] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Storage Location</p>
            <p className="mt-2 text-sm font-semibold text-[#0f172b]">{item.storageLocation}</p>
          </div>

          <div className="rounded-lg border border-gray-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {item.description || 'No description provided.'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SummaryTile label="Created" value={formatDate(item.createdAt)} />
            <SummaryTile label="Last Updated" value={formatDate(item.updatedAt)} />
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-[#f8fafc] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[#0f172b]">{value}</p>
    </div>
  )
}
