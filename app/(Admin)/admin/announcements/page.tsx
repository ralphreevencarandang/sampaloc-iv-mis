'use client'

import Image from 'next/image'
import React, { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, ChevronLeft, ChevronRight, Calendar, Megaphone } from 'lucide-react'
import CreateAnnouncementModal from '@/components/ui/Admin/CreateAnnouncementModal'
import type { AnnouncementRecord } from '@/server/announcements/announcements'

const ITEMS_PER_PAGE = 10
const ANNOUNCEMENTS_QUERY_KEY = ['announcements']

type AnnouncementsApiError = {
  message?: string
}

async function fetchAnnouncements(): Promise<AnnouncementRecord[]> {
  const response = await fetch('/api/announcements', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as AnnouncementsApiError | null
    throw new Error(error?.message ?? 'Failed to fetch announcements.')
  }

  return (await response.json()) as AnnouncementRecord[]
}

function getOfficialName(announcement: AnnouncementRecord) {
  return `${announcement.createdBy.firstName} ${announcement.createdBy.lastName}`.trim()
}

export default function AnnouncementPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const queryClient = useQueryClient()

  const {
    data: announcements = [],
    isLoading,
    isError,
    error,
  } = useQuery<AnnouncementRecord[]>({
    queryKey: ANNOUNCEMENTS_QUERY_KEY,
    queryFn: fetchAnnouncements,
  })

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((announcement) => {
      const query = searchTerm.toLowerCase()

      return (
        announcement.title.toLowerCase().includes(query) ||
        announcement.content.toLowerCase().includes(query) ||
        getOfficialName(announcement).toLowerCase().includes(query) ||
        announcement.createdBy.position.toLowerCase().includes(query)
      )
    })
  }, [announcements, searchTerm])

  const totalPages = Math.ceil(filteredAnnouncements.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedAnnouncements = filteredAnnouncements.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const handleAnnouncementCreated = () => {
    setCurrentPage(1)
    void queryClient.invalidateQueries({
      queryKey: ANNOUNCEMENTS_QUERY_KEY,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Announcements</h1>
          <p className="mt-1 text-slate-600">Manage barangay announcements and updates</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex w-fit items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 font-semibold text-white shadow-md shadow-blue-600/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Add Announcement
        </button>
      </div>

      <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-slate-50 px-4 py-2.5">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, content, official, or position..."
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value)
              setCurrentPage(1)
            }}
            className="flex-1 bg-transparent text-slate-700 outline-none placeholder-slate-500"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-slate-50">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Image</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Title</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Content</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Created By</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Position</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="font-medium text-slate-600">Loading announcements...</p>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-sm font-medium text-red-600">
                      {error instanceof Error ? error.message : 'Failed to load announcements.'}
                    </p>
                  </td>
                </tr>
              ) : paginatedAnnouncements.length > 0 ? (
                paginatedAnnouncements.map((announcement) => (
                  <tr key={announcement.id} className="border-b border-gray-100 transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4">
                      {announcement.image ? (
                        <Image
                          src={announcement.image}
                          alt={announcement.title}
                          width={56}
                          height={56}
                          className="h-14 w-14 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          <Megaphone className="h-5 w-5" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{announcement.title}</td>
                    <td className="max-w-sm px-6 py-4 text-sm text-slate-600" title={announcement.content}>
                      <p className="line-clamp-2">{announcement.content}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{getOfficialName(announcement)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{announcement.createdBy.position}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {new Date(announcement.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="font-medium text-slate-600">No announcements found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredAnnouncements.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-slate-50 px-6 py-4">
            <div className="text-sm text-slate-600">
              Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
              <span className="font-semibold">{Math.min(startIndex + ITEMS_PER_PAGE, filteredAnnouncements.length)}</span> of{' '}
              <span className="font-semibold">{filteredAnnouncements.length}</span> announcements
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
                className="rounded-lg border border-gray-200 p-2 text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateAnnouncementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAnnouncementCreated={handleAnnouncementCreated}
      />
    </div>
  )
}
