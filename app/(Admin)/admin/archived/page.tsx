'use client'

import { useQuery } from '@tanstack/react-query'
import React, { useState } from 'react'
import { Archive, Calendar, Megaphone, Scale, Search, Shield, Users } from 'lucide-react'
import ArchiveCard from '@/components/ui/Admin/ArchiveCard'
import api from '@/lib/axios'
import axios from 'axios'
import type { AnnouncementRecord } from '@/server/announcements/announcements'
import type { ResidentRecord } from '@/app/(Admin)/admin/resident/page'
import type { OfficialRecord } from '@/server/officials/officials'
import type { BlotterRecord } from '@/server/actions/blotter.actions'
import type { VawcRecordType } from '@/server/actions/vawc.actions'

async function fetchArchivedVawc(): Promise<VawcRecordType[]> {
  try {
    const response = await api.get<VawcRecordType[]>('/archives?type=vawc')
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as { message?: string } | undefined)?.message
      throw new Error(message ?? 'Failed to fetch archived VAWC records.')
    }
    throw error
  }
}

async function fetchArchivedBlotters(): Promise<BlotterRecord[]> {
  try {
    const response = await api.get<BlotterRecord[]>('/archives?type=blotters')
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as { message?: string } | undefined)?.message
      throw new Error(message ?? 'Failed to fetch archived blotters.')
    }
    throw error
  }
}

async function fetchArchivedOfficials(): Promise<OfficialRecord[]> {
  try {
    const response = await api.get<OfficialRecord[]>('/archives?type=officials')
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as { message?: string } | undefined)?.message
      throw new Error(message ?? 'Failed to fetch archived officials.')
    }
    throw error
  }
}

async function fetchArchivedResidents(): Promise<ResidentRecord[]> {
  try {
    const response = await api.get<ResidentRecord[]>('/archives?type=residents')
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as { message?: string } | undefined)?.message
      throw new Error(message ?? 'Failed to fetch archived residents.')
    }
    throw error
  }
}

async function fetchArchivedAnnouncements(): Promise<AnnouncementRecord[]> {
  try {
    const response = await api.get<AnnouncementRecord[]>('/archives?type=announcements')
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as { message?: string } | undefined)?.message
      throw new Error(message ?? 'Failed to fetch archived announcements.')
    }
    throw error
  }
}

const ARCHIVED_DATA = {
  Residents: [
    { id: 'RSD-2021-0042', name: 'Maria Clara Delos Santos', status: 'Relocated', archivedDate: '2024-05-12' },
    { id: 'RSD-2019-0188', name: 'Jose Rizalino', status: 'Deceased', archivedDate: '2025-01-08' },
  ],
  Officials: [
    { id: 'OFF-2018-01', name: 'Anita Dimaculangan', position: 'Barangay Kagawad', termEnded: '2023-11-30', archivedDate: '2023-12-05' },
    { id: 'OFF-2018-05', name: 'Carlos Agoncillo', position: 'SK Chairperson', termEnded: '2023-11-30', archivedDate: '2023-12-05' },
  ],
  Announcements: [
    { id: 'ANN-2022-89', title: 'Barangay Road Widening Project Schedule', postedDate: '2022-03-15', archivedDate: '2023-03-15' },
    { id: 'ANN-2022-104', title: 'Typhoon Karding Relief Operations', postedDate: '2022-09-26', archivedDate: '2023-09-26' },
  ],
  Blotters: [
    { id: 'BLT-2023-012', incident: 'Noise Complaint (Curfew Violation)', resolution: 'Resolved - Settled at Barangay Hall', archivedDate: '2024-02-20' },
    { id: 'BLT-2023-045', incident: 'Minor Property Dispute', resolution: 'Dismissed - Escalated to Police', archivedDate: '2024-04-11' },
  ],
} as const

type TabId = keyof typeof ARCHIVED_DATA | 'VAWC'

type TabDefinition = {
  id: TabId
  label: string
  icon: React.ComponentType<{ className?: string }>
}

type TabNavigationProps = {
  tabs: TabDefinition[]
  activeTab: TabId
  onTabChange: (tabId: TabId) => void
}

function TabNavigation({ tabs, activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
      <nav className="flex overflow-x-auto border-b border-gray-100 px-4" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-4 text-sm font-semibold transition-colors ${
                isActive
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-slate-500 hover:border-gray-300 hover:text-slate-700'
              }`}
            >
              <tab.icon className={`h-4 w-4 ${isActive ? 'text-primary-600' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

function ArchivedPage() {
  const [activeTab, setActiveTab] = useState<TabId>('Residents')

  const {
    data: archivedOfficials = [],
    isLoading: isOfficialsLoading,
    isError: isOfficialsError,
    error: officialsError,
  } = useQuery({
    queryKey: ['archivedData', 'officials'],
    queryFn: fetchArchivedOfficials,
    enabled: activeTab === 'Officials',
  })

  const {
    data: archivedResidents = [],
    isLoading: isResidentsLoading,
    isError: isResidentsError,
    error: residentsError,
  } = useQuery({
    queryKey: ['archivedData', 'residents'],
    queryFn: fetchArchivedResidents,
    enabled: activeTab === 'Residents',
  })

  const {
    data: archivedAnnouncements = [],
    isLoading: isAnnouncementsLoading,
    isError: isAnnouncementsError,
    error: announcementsError,
  } = useQuery({
    queryKey: ['archivedData', 'announcements'],
    queryFn: fetchArchivedAnnouncements,
    enabled: activeTab === 'Announcements',
  })

  const {
    data: archivedBlotters = [],
    isLoading: isBlottersLoading,
    isError: isBlottersError,
    error: blottersError,
  } = useQuery({
    queryKey: ['archivedData', 'blotters'],
    queryFn: fetchArchivedBlotters,
    enabled: activeTab === 'Blotters',
  })

  const {
    data: archivedVawc = [],
    isLoading: isVawcLoading,
    isError: isVawcError,
    error: vawcError,
  } = useQuery({
    queryKey: ['archivedData', 'vawc'],
    queryFn: fetchArchivedVawc,
    enabled: activeTab === 'VAWC',
  })

  const tabs: TabDefinition[] = [
    { id: 'Residents', label: 'Residents', icon: Users },
    { id: 'Officials', label: 'Officials', icon: Shield },
    { id: 'Announcements', label: 'Announcements', icon: Megaphone },
    { id: 'Blotters', label: 'Blotters', icon: Scale },
    { id: 'VAWC', label: 'VAWC', icon: ShieldAlert },
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'Residents':
        if (isResidentsLoading) {
          return [
            <div key="loading-residents" className="flex w-full flex-col items-center justify-center py-12 text-center">
              <p className="font-medium text-slate-600">Loading archived residents...</p>
            </div>
          ]
        }
        
        if (isResidentsError) {
          return [
            <div key="error-residents" className="flex w-full flex-col items-center justify-center py-12 text-center text-red-600">
              <p className="font-medium">
                {residentsError instanceof Error ? residentsError.message : 'Error loading residents'}
              </p>
            </div>
          ]
        }

        if (archivedResidents.length === 0) {
          return [] 
        }

        return archivedResidents.map((item) => (
          <ArchiveCard
            key={item.id}
            title={`${item.firstName} ${item.lastName}`}
            subtitle={`Resident ID: ${item.id}`}
            metadata={`Status: ${item.status}`}
            archivedDate={item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : 'N/A'}
          />
        ))
      case 'Officials':
        if (isOfficialsLoading) {
          return [
            <div key="loading-officials" className="flex w-full flex-col items-center justify-center py-12 text-center">
              <p className="font-medium text-slate-600">Loading archived officials...</p>
            </div>
          ]
        }
        
        if (isOfficialsError) {
          return [
            <div key="error-officials" className="flex w-full flex-col items-center justify-center py-12 text-center text-red-600">
              <p className="font-medium">
                {officialsError instanceof Error ? officialsError.message : 'Error loading officials'}
              </p>
            </div>
          ]
        }

        if (archivedOfficials.length === 0) {
          return [] 
        }

        return archivedOfficials.map((item) => (
          <ArchiveCard
            key={item.id}
            title={item.name}
            subtitle={`Official ID: ${item.id} • ${item.position}`}
            metadata={`Term Ended: ${item.termEnd ? new Date(item.termEnd).toLocaleDateString() : 'N/A'}`}
            archivedDate={'N/A'}
          />
        ))
      case 'Announcements':
        if (isAnnouncementsLoading) {
          return [
            <div key="loading" className="flex w-full flex-col items-center justify-center py-12 text-center">
              <p className="font-medium text-slate-600">Loading archived announcements...</p>
            </div>
          ]
        }
        
        if (isAnnouncementsError) {
          return [
            <div key="error" className="flex w-full flex-col items-center justify-center py-12 text-center text-red-600">
              <p className="font-medium">
                {announcementsError instanceof Error ? announcementsError.message : 'Error loading announcements'}
              </p>
            </div>
          ]
        }

        if (archivedAnnouncements.length === 0) {
          return [] 
        }

        return archivedAnnouncements.map((item) => (
          <ArchiveCard
            key={item.id}
            title={item.title}
            subtitle={`Announcement ID: ${item.id}`}
            metadata={`Posted on: ${new Date(item.createdAt).toLocaleDateString()}`}
            archivedDate={new Date(item.createdAt).toISOString().split('T')[0]}
          />
        ))
      case 'Blotters':
        if (isBlottersLoading) {
          return [
            <div key="loading" className="flex w-full flex-col items-center justify-center py-12 text-center">
              <p className="font-medium text-slate-600">Loading archived blotters...</p>
            </div>
          ]
        }
        
        if (isBlottersError) {
          return [
            <div key="error" className="flex w-full flex-col items-center justify-center py-12 text-center text-red-600">
              <p className="font-medium">
                {blottersError instanceof Error ? blottersError.message : 'Error loading blotters'}
              </p>
            </div>
          ]
        }

        if (archivedBlotters.length === 0) {
          return [] 
        }

        return archivedBlotters.map((item) => (
          <ArchiveCard
            key={item.id}
            title={item.incident}
            subtitle={`Case ID: ${item.id}`}
            metadata={`Status: ${item.status}`}
            archivedDate={item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : 'N/A'}
          />
        ))
      case 'VAWC':
        if (isVawcLoading) {
          return [
            <div key="loading" className="flex w-full flex-col items-center justify-center py-12 text-center">
              <p className="font-medium text-slate-600">Loading archived VAWC cases...</p>
            </div>
          ]
        }
        
        if (isVawcError) {
          return [
            <div key="error" className="flex w-full flex-col items-center justify-center py-12 text-center text-red-600">
              <p className="font-medium">
                {vawcError instanceof Error ? vawcError.message : 'Error loading VAWC cases'}
              </p>
            </div>
          ]
        }

        if (archivedVawc.length === 0) {
          return [] 
        }

        return archivedVawc.map((item) => (
          <ArchiveCard
            key={item.id}
            title={item.caseNumber}
            subtitle={`Victim: ${item.victimName}`}
            metadata={`Respondant: ${item.respondentName} | Status: ${item.status}`}
            archivedDate={item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : 'N/A'}
          />
        ))
      default:
        return []
    }
  }

  const content = renderContent()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Archives</h1>
          <p className="mt-1 text-slate-600">Manage archived barangay records</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-slate-50 px-4 py-2.5">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            type="text"
            className="flex-1 bg-transparent text-slate-700 outline-none placeholder-slate-500"
            placeholder={`Search archived ${activeTab.toLowerCase()}...`}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full">
          <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
        
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
        <div className="space-y-4 p-4 sm:p-6">
          {content.length > 0 ? (
            content
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-slate-50 px-6 py-12 text-center">
              <Archive className="h-12 w-12 text-slate-300" />
              <h3 className="mt-3 text-sm font-semibold text-slate-900">No records found</h3>
              <p className="mt-1 text-sm text-slate-500">
                There are no archived records in this category yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ArchivedPage
