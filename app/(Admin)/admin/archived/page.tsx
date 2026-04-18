'use client'

import React, { useState } from 'react'
import { Archive, Calendar, Megaphone, Scale, Search, Shield, Users } from 'lucide-react'
import ArchiveCard from '@/components/ui/Admin/ArchiveCard'

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

type TabId = keyof typeof ARCHIVED_DATA

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

  const tabs: TabDefinition[] = [
    { id: 'Residents', label: 'Residents', icon: Users },
    { id: 'Officials', label: 'Officials', icon: Shield },
    { id: 'Announcements', label: 'Announcements', icon: Megaphone },
    { id: 'Blotters', label: 'Blotters', icon: Scale },
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'Residents':
        return ARCHIVED_DATA.Residents.map((item) => (
          <ArchiveCard
            key={item.id}
            title={item.name}
            subtitle={`Resident ID: ${item.id}`}
            metadata={item.status}
            archivedDate={item.archivedDate}
          />
        ))
      case 'Officials':
        return ARCHIVED_DATA.Officials.map((item) => (
          <ArchiveCard
            key={item.id}
            title={item.name}
            subtitle={`Official ID: ${item.id} • ${item.position}`}
            metadata={`Term Ended: ${new Date(item.termEnded).toLocaleDateString()}`}
            archivedDate={item.archivedDate}
          />
        ))
      case 'Announcements':
        return ARCHIVED_DATA.Announcements.map((item) => (
          <ArchiveCard
            key={item.id}
            title={item.title}
            subtitle={`Announcement ID: ${item.id}`}
            metadata={`Posted on: ${new Date(item.postedDate).toLocaleDateString()}`}
            archivedDate={item.archivedDate}
          />
        ))
      case 'Blotters':
        return ARCHIVED_DATA.Blotters.map((item) => (
          <ArchiveCard
            key={item.id}
            title={item.incident}
            subtitle={`Case ID: ${item.id}`}
            metadata={`Status: ${item.resolution}`}
            archivedDate={item.archivedDate}
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
        <button className="inline-flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
          <Calendar className="h-4 w-4 text-slate-500" />
          Filter by Date
        </button>
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
