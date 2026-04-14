'use client'

import React, { useState, useMemo } from 'react'
import { Search, Plus, Edit2, Trash2, Eye, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import CreateAnnouncementModal from '@/components/ui/Admin/CreateAnnouncementModal'

interface Announcement {
  id: number
  title: string
  content: string
  createdBy: string
  createdDate: string
  status: 'Active' | 'Archived'
  image?: string
}

const mockAnnouncements: Announcement[] = [
  { 
    id: 1, 
    title: 'Barangay Assembly Meeting', 
    content: 'Join us for the quarterly barangay assembly to discuss upcoming community projects, budget allocations, and to hear your suggestions for our community\'s development.',
    createdBy: 'Juan Dela Cruz',
    createdDate: '2026-04-14',
    status: 'Active',
    image: '🏛️'
  },
  { 
    id: 2, 
    title: 'Free Medical & Dental Mission', 
    content: 'Free medical checkups, dental extraction, and distribution of essential medicines for all registered residents. Please proceed to the Barangay Hall covered court.',
    createdBy: 'Maria Santos',
    createdDate: '2026-04-13',
    status: 'Active',
    image: '🏥'
  },
  { 
    id: 3, 
    title: 'Summer Sports League Registration', 
    content: 'Calling all youth! Registration for the Inter-Purok Basketball and Volleyball league is now open. Submit your requirements to the SK Council office.',
    createdBy: 'Mark Villanueva',
    createdDate: '2026-04-12',
    status: 'Active',
    image: '🏀'
  },
  { 
    id: 4, 
    title: 'Road Rehabilitation Project Update', 
    content: 'The rehabilitation of Sampaloc IV main road will commence next month. We appreciate your patience as we improve our barangay infrastructure.',
    createdBy: 'Luis Mendoza',
    createdDate: '2026-04-10',
    status: 'Active',
    image: '🛣️'
  },
  { 
    id: 5, 
    title: 'Environmental Cleanup Drive', 
    content: 'All residents are invited to our monthly environmental cleanup drive. Let\'s keep Sampaloc IV clean and green. Tools will be provided.',
    createdBy: 'Rosa Lim',
    createdDate: '2026-04-08',
    status: 'Active',
    image: '🌱'
  },
  { 
    id: 6, 
    title: 'Scholarship Opportunity', 
    content: 'Applications for the barangay scholarship program are now open. Interested high school and college students, please submit your requirements.',
    createdBy: 'Ana Garcia',
    createdDate: '2026-04-05',
    status: 'Active',
    image: '🎓'
  },
  { 
    id: 7, 
    title: 'Water Supply Maintenance', 
    content: 'Water supply will be temporarily halted on April 20 for system maintenance. We apologize for any inconvenience.',
    createdBy: 'Pedro Reyes',
    createdDate: '2026-04-01',
    status: 'Archived'
  },
  { 
    id: 8, 
    title: 'Community Fiesta Announcement', 
    content: 'Save the date! Our barangay fiesta will be held in June with various activities, games, and cultural presentations. More details coming soon.',
    createdBy: 'Juan Dela Cruz',
    createdDate: '2026-03-28',
    status: 'Archived',
    image: '🎉'
  },
]

const ITEMS_PER_PAGE = 10

export default function AnnouncementPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const filteredAnnouncements = useMemo(() => {
    return mockAnnouncements.filter(announcement =>
      announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      announcement.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      announcement.createdBy.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [searchTerm])

  const totalPages = Math.ceil(filteredAnnouncements.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedAnnouncements = filteredAnnouncements.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'Archived':
        return 'bg-slate-50 text-slate-700 border-slate-200'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Announcements</h1>
          <p className="text-slate-600 mt-1">Manage barangay announcements and updates</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold shadow-md shadow-blue-600/30 transition-all duration-300 hover:-translate-y-0.5 w-fit"
        >
          <Plus className="w-5 h-5" />
          Add Announcement
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-lg border border-gray-200">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, content, or created by..."
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-100">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Image</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Title</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Content</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Created By</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Status</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wide">Options</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAnnouncements.length > 0 ? (
                paginatedAnnouncements.map((announcement) => (
                  <tr key={announcement.id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-center text-xl">{announcement.image || '📄'}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{announcement.title}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-sm truncate" title={announcement.content}>{announcement.content}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{announcement.createdBy}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {new Date(announcement.createdDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(announcement.status)}`}>
                        {announcement.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-slate-600 font-medium">No announcements found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredAnnouncements.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-slate-50">
            <div className="text-sm text-slate-600">
              Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
              <span className="font-semibold">{Math.min(startIndex + ITEMS_PER_PAGE, filteredAnnouncements.length)}</span> of{' '}
              <span className="font-semibold">{filteredAnnouncements.length}</span> announcements
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

      {/* Add Announcement Modal */}
      <CreateAnnouncementModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}