'use client'

import React, { useState, useMemo } from 'react'
import { Search, ChevronLeft, ChevronRight, Eye, Edit2, Trash2 } from 'lucide-react'

interface Voter {
  id: number
  fullName: string
  email: string
  dateOfBirth: string
  address: string
  gender: string
  registrationDate: string
}

const mockVoters: Voter[] = [
  { id: 1, fullName: 'Juan Dela Cruz', email: 'juan@email.com', dateOfBirth: '1988-05-15', address: 'Blk 1 L2 Sampaloc IV', gender: 'Male', registrationDate: '2023-06-30' },
  { id: 2, fullName: 'Maria Santos', email: 'maria@email.com', dateOfBirth: '1995-08-22', address: 'Blk 2 L5 Sampaloc IV', gender: 'Female', registrationDate: '2023-07-10' },
  { id: 3, fullName: 'Pedro Reyes', email: 'pedro@email.com', dateOfBirth: '1980-03-10', address: 'Blk 3 L1 Sampaloc IV', gender: 'Male', registrationDate: '2023-06-30' },
  { id: 4, fullName: 'Ana Garcia', email: 'ana@email.com', dateOfBirth: '1992-11-28', address: 'Blk 1 L3 Sampaloc IV', gender: 'Female', registrationDate: '2023-08-15' },
  { id: 5, fullName: 'Luis Mendoza', email: 'luis@email.com', dateOfBirth: '1999-02-14', address: 'Blk 2 L4 Sampaloc IV', gender: 'Male', registrationDate: '2023-07-20' },
  { id: 6, fullName: 'Rosa Lim', email: 'rosa@email.com', dateOfBirth: '1987-09-05', address: 'Blk 3 L2 Sampaloc IV', gender: 'Female', registrationDate: '2023-06-30' },
  { id: 7, fullName: 'Carlos Bautista', email: 'carlos@email.com', dateOfBirth: '1978-12-20', address: 'Blk 1 L4 Sampaloc IV', gender: 'Male', registrationDate: '2023-09-01' },
  { id: 8, fullName: 'Elena Castro', email: 'elena@email.com', dateOfBirth: '1996-06-12', address: 'Blk 2 L1 Sampaloc IV', gender: 'Female', registrationDate: '2023-07-25' },
  { id: 9, fullName: 'Michael Torres', email: 'michael@email.com', dateOfBirth: '1985-04-18', address: 'Blk 3 L3 Sampaloc IV', gender: 'Male', registrationDate: '2023-08-05' },
  { id: 10, fullName: 'Jessica Morales', email: 'jessica@email.com', dateOfBirth: '1993-07-30', address: 'Blk 1 L5 Sampaloc IV', gender: 'Female', registrationDate: '2023-08-20' },
  { id: 11, fullName: 'David Fernandez', email: 'david@email.com', dateOfBirth: '1986-01-25', address: 'Blk 2 L2 Sampaloc IV', gender: 'Male', registrationDate: '2023-06-30' },
  { id: 12, fullName: 'Patricia Lopez', email: 'patricia@email.com', dateOfBirth: '1991-10-08', address: 'Blk 3 L4 Sampaloc IV', gender: 'Female', registrationDate: '2023-09-10' },
]

const ITEMS_PER_PAGE = 10

export default function VotersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const filteredVoters = useMemo(() => {
    return mockVoters.filter(voter =>
      voter.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      voter.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      voter.address.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [searchTerm])

  const totalPages = Math.ceil(filteredVoters.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedVoters = filteredVoters.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Registered Voters</h1>
          <p className="text-slate-600 mt-1">View and manage registered voters in the barangay</p>
        </div>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
          <p className="text-slate-600 text-sm font-medium">Total Voters</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{mockVoters.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
          <p className="text-slate-600 text-sm font-medium">Male Voters</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{mockVoters.filter(v => v.gender === 'Male').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
          <p className="text-slate-600 text-sm font-medium">Female Voters</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{mockVoters.filter(v => v.gender === 'Female').length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-100">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Full Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Email</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Date of Birth</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Age</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Address</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Gender</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wide">Options</th>
              </tr>
            </thead>
            <tbody>
              {paginatedVoters.length > 0 ? (
                paginatedVoters.map((voter) => (
                  <tr key={voter.id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{voter.fullName}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{voter.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{new Date(voter.dateOfBirth).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{calculateAge(voter.dateOfBirth)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{voter.address}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                        voter.gender === 'Male' 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : 'bg-pink-50 text-pink-700 border-pink-200'
                      }`}>
                        {voter.gender}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-slate-600 font-medium">No voters found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredVoters.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-slate-50">
            <div className="text-sm text-slate-600">
              Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
              <span className="font-semibold">{Math.min(startIndex + ITEMS_PER_PAGE, filteredVoters.length)}</span> of{' '}
              <span className="font-semibold">{filteredVoters.length}</span> voters
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
                        ? 'bg-blue-600 text-white'
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
    </div>
  )
}