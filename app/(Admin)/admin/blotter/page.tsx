"use client"

import React, { useState, useMemo } from 'react'
import { Search, Plus, Edit2, Trash2, Eye, ChevronLeft, ChevronRight, Loader2, AlertCircle, Archive } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import CreateBlotterModal from '@/components/ui/Admin/CreateBlotterModal'
import axios from '@/lib/axios'

const ITEMS_PER_PAGE = 10

interface BlotterData {
  id: string
  complainant: string
  respondentName: string
  incident: string
  location: string
  date: string
  status: string
  handledBy?: string
  blotterImage: string | null
}

export default function BlotterPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data: blotters = [], isLoading, error } = useQuery<BlotterData[]>({
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Blotter</h1>
          <p className="text-slate-600 mt-1">Manage barangay blotter reports and incidents</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg font-semibold shadow-md shadow-primary-600/30 transition-all duration-300 hover:-translate-y-0.5 w-fit"
        >
          <Plus className="w-5 h-5" />
          Add Blotter
        </button>
      </div>

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

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-100">
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
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                       <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                       <p className="text-slate-600 font-medium">Loading blotters...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                       <AlertCircle className="w-8 h-8 text-red-500" />
                       <p className="text-slate-600 font-medium">Error loading blotters. Please try again.</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedBlotters.length > 0 ? (
                paginatedBlotters.map((blotter) => (
                  <tr key={blotter.id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
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
                        <button className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors" title="Delete">
                          <Archive className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
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

      <CreateBlotterModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}