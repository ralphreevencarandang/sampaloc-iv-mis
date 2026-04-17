'use client'

import React, { useState, useMemo } from 'react'
import { Search, Plus, Edit2, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import ResidentFormModal from '@/components/ui/Admin/ResidentFormModal'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/axios'
import Link from 'next/link'
interface ResidentRecord {
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
  status: 'PENDING' | 'APPROVED' | 'DECLINED'
}

async function fetchResidents(): Promise<ResidentRecord[]> {
  const { data } = await apiClient.get<ResidentRecord[]>('/residents')
  return data
}

const ITEMS_PER_PAGE = 10

export default function ResidentPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedResident, setSelectedResident] = useState<ResidentRecord | null>(null)

  const {
    data: residents = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['residents'],
    queryFn: fetchResidents,
  })

  const filteredResidents = useMemo(() => {
    return residents.filter((resident) => {
      const fullName = `${resident.firstName} ${resident.lastName}`.toLowerCase()
      const address = `${resident.houseNumber} ${resident.street}`.toLowerCase()
      const search = searchTerm.toLowerCase()
      
      return fullName.includes(search) || 
             resident.email.toLowerCase().includes(search) || 
             address.includes(search)
    })
  }, [searchTerm, residents])

  const totalPages = Math.ceil(filteredResidents.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedResidents = filteredResidents.slice(startIndex, startIndex + ITEMS_PER_PAGE)

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Residents</h1>
          <p className="text-slate-600 mt-1">Manage barangay residents and their information</p>
        </div>

        {/* Create Resident Button */}
        {/* <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg font-semibold shadow-md shadow-primary-600/30 transition-all duration-300 hover:-translate-y-0.5 w-fit"
        >
          <Plus className="w-5 h-5" />
          Add Resident
        </button> */}
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-lg border border-gray-200">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or address..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="flex-1 bg-transparent outline-none text-slate-700 placeholder-slate-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="px-6 py-12 text-center text-slate-500">
            Loading residents...
          </div>
        ) : isError ? (
          <div className="px-6 py-12 text-center text-red-500">
            Error loading residents: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Age</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Gender</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Civil Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Voters</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Address</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Status</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wide">Options</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedResidents.length > 0 ? (
                    paginatedResidents.map((resident) => {
                      const fullName = `${resident.firstName} ${resident.middleName ? resident.middleName + ' ' : ''}${resident.lastName}`
                      const address = `${resident.houseNumber} ${resident.street}`
                      const age = computeAge(resident.birthDate)

                      return (
                        <tr key={resident.id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">{fullName}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{resident.email}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{age}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{resident.gender}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{resident.civilStatus}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${resident.isVoter ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'bg-slate-50 text-slate-700 border border-slate-200'}`}>
                              {resident.isVoter ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{address}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(resident.status)}`}>
                              {resident.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Link href={`/admin/resident/${resident.id}`} className="p-1.5 hover:bg-primary-50 text-primary-600 rounded-lg transition-colors" title="View">
                              
                                  <Eye className="w-4 h-4" />
                             
                              </Link>
                              <button 
                                onClick={() => {
                                  setSelectedResident(resident)
                                  setIsModalOpen(true)
                                }}
                                className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors" title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors" title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
                        <p className="text-slate-600 font-medium">No residents found matching your criteria</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredResidents.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-slate-50">
                <div className="text-sm text-slate-600">
                  Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
                  <span className="font-semibold">{Math.min(startIndex + ITEMS_PER_PAGE, filteredResidents.length)}</span> of{' '}
                  <span className="font-semibold">{filteredResidents.length}</span> residents
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
          </>
        )}
      </div>

      {/* Resident Form Modal */}
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