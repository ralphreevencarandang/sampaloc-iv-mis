'use client'

import Image from 'next/image'
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, User } from 'lucide-react'
import axios from 'axios'
import apiClient from '@/lib/axios'
import type { OfficialRecord } from '@/server/officials/officials'

async function fetchOfficials(): Promise<OfficialRecord[]> {
  try {
    const response = await apiClient.get<OfficialRecord[]>('/officials')
    return response.data
  } catch (error) {
    if (axios.isAxiosError<{ message?: string }>(error)) {
      throw new Error(error.response?.data?.message ?? 'Failed to fetch officials.')
    }

    throw error
  }
}

function getTermLabel(official: OfficialRecord) {
  const startYear = new Date(official.termStart).getFullYear()

  if (!official.termEnd) {
    return `${startYear} - Present`
  }

  return `${startYear} - ${new Date(official.termEnd).getFullYear()}`
}

function OfficialAvatar({
  official,
  size,
}: {
  official: OfficialRecord
  size: 'large' | 'small'
}) {
  const dimensions = size === 'large' ? 96 : 80

  if (official.officialProfile) {
    return (
      <Image
        src={official.officialProfile}
        alt={official.name}
        width={dimensions}
        height={dimensions}
        className={`${size === 'large' ? 'h-24 w-24' : 'h-20 w-20'} rounded-full object-cover`}
      />
    )
  }

  return (
    <div
      className={`${size === 'large' ? 'h-24 w-24' : 'h-20 w-20'} flex items-center justify-center rounded-full bg-slate-100`}
    >
      <User className={`${size === 'large' ? 'h-10 w-10' : 'h-8 w-8'} text-slate-400`} />
    </div>
  )
}

const ResidentOfficials = () => {
  const {
    data: officials = [],
    isLoading,
    isError,
    error,
  } = useQuery<OfficialRecord[]>({
    queryKey: ['officials'],
    queryFn: fetchOfficials,
  })

  const activeOfficials = officials.filter((official) => official.status === 'Active')
  const [captain, ...otherOfficials] = activeOfficials

  return (
    <section id="officials" className="w-full bg-white py-20">
      <div className="max-container padding-x">
        <div className="mb-16 text-center">
          <div className="mb-3 inline-flex items-center justify-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-blue-600">Leadership</h2>
          </div>
          <h3 className="mb-4 text-3xl font-extrabold text-slate-900 md:text-4xl">Barangay Officials</h3>
          <p className="mx-auto max-w-2xl text-lg text-slate-600">
            Meet the dedicated individuals serving our community. Together, we work towards a progressive and peaceful barangay.
          </p>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-gray-100 bg-slate-50 px-6 py-16 text-center text-slate-600">
            Loading officials...
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-16 text-center text-red-600">
            {error instanceof Error ? error.message : 'Failed to load officials.'}
          </div>
        ) : captain ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            <div className="mb-8 flex justify-center sm:col-span-2 lg:col-span-3 xl:col-span-3">
              <div className="group w-full max-w-sm overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="relative h-32 bg-gradient-to-r from-blue-600 to-blue-400">
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                      backgroundSize: '16px 16px',
                    }}
                  />
                </div>
                <div className="flex flex-col items-center px-6 pb-8">
                  <div className="-mt-12 z-10 mb-4 flex items-center justify-center rounded-full border-4 border-white bg-slate-100 shadow-md transition-transform duration-300 group-hover:scale-105">
                    <OfficialAvatar official={captain} size="large" />
                  </div>
                  <h4 className="mb-1 text-center text-xl font-bold text-slate-900">{captain.name}</h4>
                  <p className="mb-3 text-center font-semibold text-blue-600">{captain.position}</p>
                  <div className="rounded-full border border-gray-100 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
                    Term: {getTermLabel(captain)}
                  </div>
                </div>
              </div>
            </div>

            {otherOfficials.map((official) => (
              <div
                key={official.id}
                className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-100 hover:shadow-lg"
              >
                <div className="relative h-20 border-b border-gray-100 bg-slate-50 transition-colors duration-300 group-hover:bg-blue-50">
                  <div
                    className="absolute inset-0 opacity-10 transition-opacity group-hover:opacity-20"
                    style={{
                      backgroundImage: 'radial-gradient(circle at 2px 2px, blue 1px, transparent 0)',
                      backgroundSize: '16px 16px',
                    }}
                  />
                </div>
                <div className="flex flex-col items-center px-6 pb-6">
                  <div className="-mt-10 z-10 mb-4 flex items-center justify-center rounded-full border-4 border-white bg-slate-100 shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-md">
                    <OfficialAvatar official={official} size="small" />
                  </div>
                  <h4 className="mb-1 line-clamp-1 text-center text-lg font-bold text-slate-900" title={official.name}>
                    {official.name}
                  </h4>
                  <p className="mb-3 min-h-[40px] text-center text-sm font-medium text-slate-600">{official.position}</p>
                  <div className="rounded-full border border-gray-100 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500 transition-colors group-hover:bg-white">
                    Term: {getTermLabel(official)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-slate-50 px-6 py-16 text-center text-slate-600">
            No officials available right now.
          </div>
        )}
      </div>
    </section>
  )
}

export default ResidentOfficials
