'use client'

import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FileText,
  Search,
  Edit2,
  DollarSign,
  CheckCircle,
  Clock,
  Sparkles,
  AlertCircle,
  FileCheck2,
  Layers,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react'
import EditDocumentPriceModal from '@/components/ui/Admin/EditDocumentPriceModal'
import {
  getAllDocumentsWithPricingAction,
  type DocumentSettingRecord,
} from '@/server/actions/document-settings.actions'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDateTime(isoString: string) {
  try {
    return new Date(isoString).toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return isoString
  }
}

export default function ManageDocumentsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDoc, setSelectedDoc] = useState<DocumentSettingRecord | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const {
    data: documents = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<DocumentSettingRecord[]>({
    queryKey: ['admin-documents-settings'],
    queryFn: async () => {
      return await getAllDocumentsWithPricingAction()
    },
  })

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const q = searchTerm.toLowerCase()
      return (
        doc.name.toLowerCase().includes(q) ||
        doc.documentTypeId.toLowerCase().includes(q) ||
        (doc.description && doc.description.toLowerCase().includes(q))
      )
    })
  }, [documents, searchTerm])

  const stats = useMemo(() => {
    const total = documents.length
    const active = documents.filter((d) => d.isActive).length
    const free = documents.filter((d) => d.price === 0).length
    const paid = documents.filter((d) => d.price > 0).length
    const avgFee =
      paid > 0
        ? documents.filter((d) => d.price > 0).reduce((acc, curr) => acc + curr.price, 0) / paid
        : 0

    return { total, active, free, paid, avgFee }
  }, [documents])

  const handleEditClick = (doc: DocumentSettingRecord) => {
    setSelectedDoc(doc)
    setIsEditModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary-600 text-sm font-semibold tracking-wide uppercase">
            <Layers className="w-4 h-4" />
            <span>Document Configuration</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mt-1">Manage Documents & Pricing</h1>
          <p className="text-slate-600 text-sm mt-1">
            Configure issuing fees, requirements, and dynamic pricing for all barangay certificates.
          </p>
        </div>

        {/* <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl shadow-xs transition-all w-fit disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-slate-500 ${isFetching ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button> */}
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Document Types</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Paid Documents</p>
            <p className="text-2xl font-bold text-emerald-700">{stats.paid}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Free Documents</p>
            <p className="text-2xl font-bold text-indigo-700">{stats.free}</p>
          </div>
        </div>

       
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by document name, type identifier, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent outline-none text-slate-800 placeholder-slate-400 text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium px-2 py-1 bg-slate-200/60 rounded-md"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="px-6 py-4">Document Details</th>
                <th className="px-6 py-4">Current Price</th>
                <th className="px-6 py-4">Last Updated</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary-600" />
                      <p className="text-sm font-medium">Loading document configurations...</p>
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-red-600">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-6 h-6 text-red-500" />
                      <p className="text-sm font-semibold">
                        {error instanceof Error ? error.message : 'Failed to load documents.'}
                      </p>
                      <button
                        onClick={() => refetch()}
                        className="mt-2 px-4 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold rounded-lg"
                      >
                        Try Again
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredDocuments.length > 0 ? (
                filteredDocuments.map((doc) => {
                  const isFree = doc.price === 0
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Document Details */}
                      <td className="px-6 py-4.5">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 bg-primary-50 text-primary-600 rounded-xl shrink-0 mt-0.5">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-base">{doc.name}</p>
                            <p className="text-xs text-slate-500 mt-1 max-w-md line-clamp-2 leading-relaxed">
                              {doc.description || 'No description provided.'}
                            </p>
                          </div>
                        </div>
                      </td>



                      {/* Current Price */}
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-3 py-1.5 rounded-xl text-sm font-bold border ${
                              isFree
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {isFree ? 'Free (₱0.00)' : formatCurrency(doc.price)}
                          </span>
                        </div>
                      </td>

                    

                      {/* Last Updated */}
                      <td className="px-6 py-4.5 text-xs text-slate-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDateTime(doc.updatedAt)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleEditClick(doc)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary-50 text-primary-700 hover:bg-primary-600 hover:text-white border border-primary-200/60 transition-all duration-200 shadow-xs hover:shadow-sm"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit Price</span>
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-slate-500 font-medium text-sm">
                      No documents match your search criteria.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-700">{filteredDocuments.length}</strong> of{' '}
            <strong className="text-slate-700">{documents.length}</strong> document types
          </span>
          <span>Prices update instantly across all resident request forms</span>
        </div>
      </div>

      {/* Edit Price Modal */}
      <EditDocumentPriceModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedDoc(null)
        }}
        document={selectedDoc}
      />
    </div>
  )
}
