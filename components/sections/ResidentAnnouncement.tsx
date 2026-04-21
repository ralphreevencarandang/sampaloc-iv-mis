'use client'

import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ChevronLeft, ChevronRight, Calendar, Megaphone } from 'lucide-react'
import axios from 'axios'
import apiClient from '@/lib/axios'
import type { AnnouncementRecord } from '@/server/announcements/announcements'

async function fetchAnnouncements(): Promise<AnnouncementRecord[]> {
  try {
    const response = await apiClient.get<AnnouncementRecord[]>('/announcements')
    return response.data
  } catch (error) {
    if (axios.isAxiosError<{ message?: string }>(error)) {
      throw new Error(error.response?.data?.message ?? 'Failed to fetch announcements.')
    }

    throw error
  }
}

function getOfficialName(announcement: AnnouncementRecord) {
  return `${announcement.createdBy.firstName} ${announcement.createdBy.lastName}`.trim()
}

const ResidentAnnouncement = () => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const {
    data: announcements = [],
    isLoading,
    isError,
    error,
  } = useQuery<AnnouncementRecord[]>({
    queryKey: ['announcements'],
    queryFn: fetchAnnouncements,
  })
  const activeSlide = currentSlide >= announcements.length ? 0 : currentSlide

  useEffect(() => {
    if (announcements.length <= 1) {
      return
    }

    const timer = window.setInterval(() => {
      setCurrentSlide((prev) => (prev === announcements.length - 1 ? 0 : prev + 1))
    }, 5000)

    return () => window.clearInterval(timer)
  }, [announcements.length])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev >= announcements.length - 1 ? 0 : prev + 1))
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev <= 0 ? announcements.length - 1 : prev - 1))
  }

  return (
    <section id="announcements" className="relative w-full border-t border-gray-100 bg-slate-50 py-16 max-container">
      <div className="padding-x">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary-600" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-primary-600">Barangay Board</h2>
            </div>
            <h3 className="text-3xl font-extrabold text-slate-900">Latest Announcements</h3>
          </div>

          {announcements.length > 1 && (
            <div className="hidden gap-3 md:flex">
              <button
                onClick={prevSlide}
                className="rounded-full border border-gray-200 bg-white p-2 text-slate-600 transition-all hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={nextSlide}
                className="rounded-full border border-gray-200 bg-white p-2 text-slate-600 transition-all hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {isLoading ? (
            <div className="flex min-h-80 items-center justify-center p-8 text-slate-600">
              Loading announcements...
            </div>
          ) : isError ? (
            <div className="flex min-h-80 items-center justify-center p-8 text-center text-red-600">
              {error instanceof Error ? error.message : 'Failed to load announcements.'}
            </div>
          ) : announcements.length > 0 ? (
            <>
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${activeSlide * 100}%)` }}
              >
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="flex min-w-full flex-col md:flex-row">
                    <div className="relative h-56 w-full overflow-hidden bg-slate-200 md:h-auto md:w-2/5">
                      {announcement.image ? (
                        <Image
                          src={announcement.image}
                          alt={announcement.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 40vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full min-h-56 items-center justify-center bg-gradient-to-br from-primary-500 to-cyan-400 p-8">
                          <Megaphone className="h-20 w-20 text-white/25" />
                        </div>
                      )}
                    </div>

                    <div className="flex w-full flex-col justify-center p-8 md:w-3/5 md:p-10">
                      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm font-semibold text-primary-600">
                        <span className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {new Date(announcement.createdAt).toLocaleDateString()}
                        </span>
                        <span>{getOfficialName(announcement)}</span>
                        <span>{announcement.createdBy.position}</span>
                      </div>

                      <h3 className="mb-4 text-2xl font-bold text-slate-900">{announcement.title}</h3>
                      <p className="mb-8 whitespace-pre-line text-slate-600">{announcement.content}</p>

                      {/* <div className="mt-auto flex items-center gap-1 font-semibold text-primary-600">
                        Announcement details
                        <ArrowRight className="h-4 w-4" />
                      </div> */}
                    </div>
                  </div>
                ))}
              </div>

              {announcements.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 md:hidden">
                  {announcements.map((announcement, index) => (
                    <button
                      key={announcement.id}
                      onClick={() => setCurrentSlide(index)}
                      className={`h-2 rounded-full transition-all ${
                        activeSlide === index ? 'w-4 bg-primary-600' : 'w-2 bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex min-h-80 items-center justify-center p-8 text-slate-600">
              No announcements available right now.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default ResidentAnnouncement
