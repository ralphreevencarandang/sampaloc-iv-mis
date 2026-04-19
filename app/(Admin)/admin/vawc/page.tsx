"use client"

import React, { useState, useMemo } from 'react'
import { Search, Plus, Edit2, Eye, ChevronLeft, ChevronRight, Loader2, AlertCircle, ShieldAlert } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import VawcModalForm from '@/components/ui/Admin/VawcModalForm'
import axios from '@/lib/axios'
import type { VawcRecordType } from '@/server/actions/vawc.actions'
import { archiveVawcAction } from '@/server/actions/archive.actions'
import Link from 'next/link'
import { Archive } from 'lucide-react'
import toast from 'react-hot-toast'

const ITEMS_PER_PAGE = 10

export default function VawcPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedVawc, setSelectedVawc] = useState<VawcRecordType | null>(null)

  const queryClient = useQueryClient();

  const { data: vawcs = [], isLoading, error } = useQuery<VawcRecordType[]>({
    queryKey: ['vawcs'],
    queryFn: async () => {
      const response = await axios.get('/vawc')
      return response.data
    }
  })

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await archiveVawcAction(id);
      if (!result.success) throw new Error(result.message);
      return result;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["vawcs"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to archive VAWC record.");
    }
  });

  const filteredVawcs = useMemo(() => {
    return vawcs.filter(vawc =>
      vawc.victimName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vawc.respondentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vawc.caseNumber.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [searchTerm, vawcs])

  const totalPages = Math.ceil(filteredVawcs.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedVawcs = filteredVawcs.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'REPORTED':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'SUMMONED':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'DISMISSED':
        return 'bg-slate-100 text-slate-700 border-slate-300'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  const getAbuseTypeBadge = (type: string) => {
    switch (type) {
        case 'PHYSICAL': return 'text-red-700 bg-red-50';
        case 'SEXUAL': return 'text-purple-700 bg-purple-50';
        case 'PSYCHOLOGICAL': return 'text-orange-700 bg-orange-50';
        case 'ECONOMIC': return 'text-green-700 bg-green-50';
        default: return 'text-slate-700 bg-slate-50';
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
             <ShieldAlert className="w-8 h-8 text-red-500" />
             VAWC Reporting System
          </h1>
          <p className="text-slate-600 mt-1">Manage incidents of Violence Against Women and Children under RA 9262</p>
        </div>
        <button
          onClick={() => {
            setSelectedVawc(null)
            setIsModalOpen(true)
          }}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-semibold shadow-md shadow-red-600/30 transition-all duration-300 hover:-translate-y-0.5 w-fit"
        >
          <Plus className="w-5 h-5" />
          File VAWC Case
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-lg border border-gray-200">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Case Number, Victim, or Respondent name..."
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
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Case / Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Complainant</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Respondent</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Abuse Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Status</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wide">Options</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                       <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                       <p className="text-slate-600 font-medium">Loading VAWC Cases...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                       <AlertCircle className="w-8 h-8 text-red-500" />
                       <p className="text-slate-600 font-medium">Error loading cases. Please try again.</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedVawcs.length > 0 ? (
                paginatedVawcs.map((vawc) => (
                  <tr key={vawc.id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-900">{vawc.caseNumber}</p>
                        <p className="text-xs text-slate-500">{new Date(vawc.incidentDate).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-900">{vawc.victimName}</p>
                        {vawc.isMinor && <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] rounded font-bold tracking-wide">MINOR</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{vawc.respondentName}</td>
                    <td className="px-6 py-4 text-sm">
                       <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-bold ${getAbuseTypeBadge(vawc.abuseType)}`}>
                         {vawc.abuseType}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(vawc.status)}`}>
                        {vawc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link 
                          href={`/admin/vawc/${vawc.id}`}
                          className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors" title="View Case">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button 
                          onClick={() => {
                            setSelectedVawc(vawc)
                            setIsModalOpen(true)
                          }}
                          className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors" title="Edit Case">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                             if(confirm('Are you sure you want to archive this VAWC case?')) {
                               archiveMutation.mutate(vawc.id);
                             }
                          }}
                          disabled={archiveMutation.isPending}
                          className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors disabled:opacity-50" title="Archive Case">
                          <Archive className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-slate-600 font-medium">No VAWC cases found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredVawcs.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-slate-50">
            <div className="text-sm text-slate-600">
              Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
              <span className="font-semibold">{Math.min(startIndex + ITEMS_PER_PAGE, filteredVawcs.length)}</span> of{' '}
              <span className="font-semibold">{filteredVawcs.length}</span> cases
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
                         ? 'bg-red-600 text-white'
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

      <VawcModalForm 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false)
          setSelectedVawc(null)
        }} 
        initialData={selectedVawc} 
      />
    </div>
  )
}