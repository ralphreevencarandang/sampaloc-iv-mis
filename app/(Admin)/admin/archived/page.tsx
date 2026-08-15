'use client'

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import React, { useMemo, useState } from 'react'
import Image from 'next/image'
import {
  Archive,
  HeartPulse,
  Megaphone,
  PawPrint,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  Users,
  RotateCcw,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import api from '@/lib/axios'
import axios from 'axios'
import toast from 'react-hot-toast'
import BulkActionBar from '@/components/ui/Admin/BulkActionBar'
import BulkConfirmModal from '@/components/ui/Admin/BulkConfirmModal'
import type { AnnouncementRecord } from '@/server/announcements/announcements'
import type { ResidentRecord } from '@/app/(Admin)/admin/resident/page'
import type { OfficialRecord } from '@/server/officials/officials'
import type { BlotterRecord } from '@/server/actions/blotter.actions'
import type { VawcRecordType } from '@/server/actions/vawc.actions'
import type { PetRecord } from '@/server/actions/pet.action'
import type { ClinicMedicalRecordListItem } from '@/lib/clinic-utils'
import {
  unarchiveResidentAction,
  bulkUnarchiveResidentsAction,
} from '@/server/actions/resident.actions'
import {
  unarchiveOfficialAction,
  unarchiveBlotterAction,
  unarchivePetAction,
  unarchiveVawcAction,
  bulkUnarchiveOfficialsAction,
  bulkUnarchiveBlottersAction,
  bulkUnarchiveVawcAction,
  bulkUnarchivePetsAction,
  bulkUnarchiveMedicalRecordsAction,
} from '@/server/actions/archive.actions'
import {
  unarchiveAnnouncementAction,
  bulkUnarchiveAnnouncementsAction,
} from '@/server/actions/announcement.actions'
import { unarchiveMedicalRecordAction } from '@/server/actions/clinic.actions'

const ITEMS_PER_PAGE = 10

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

async function fetchArchivedPets(): Promise<PetRecord[]> {
  try {
    const response = await api.get<PetRecord[]>('/archives?type=pets')
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as { message?: string } | undefined)?.message
      throw new Error(message ?? 'Failed to fetch archived pets.')
    }
    throw error
  }
}

async function fetchArchivedMedicalRecords(): Promise<ClinicMedicalRecordListItem[]> {
  try {
    const response = await api.get<ClinicMedicalRecordListItem[]>('/archives?type=medical-records')
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as { message?: string } | undefined)?.message
      throw new Error(message ?? 'Failed to fetch archived medical records.')
    }
    throw error
  }
}

type TabId = 'Residents' | 'Officials' | 'Announcements' | 'Blotters' | 'Pets' | 'VAWC' | 'Medical Records'

type TabDefinition = {
  id: TabId
  label: string
  icon: React.ComponentType<{ className?: string }>
}

function getStatusBadgeClass(status: string) {
  switch (status?.toUpperCase()) {
    case 'APPROVED':
    case 'RESOLVED':
    case 'ACTIVE':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'DECLINED':
    case 'OPEN':
      return 'bg-red-50 text-red-700 border-red-200'
    case 'PENDING':
    case 'REPORTED':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'SUMMONED':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200'
  }
}

export default function ArchivedPage() {
  const [activeTab, setActiveTab] = useState<TabId>('Residents')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const queryClient = useQueryClient()

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab)
    setSelectedIds([])
    setSearchTerm('')
    setCurrentPage(1)
  }

  const handleUnarchiveSuccess = (tabKey: string, activeQueryKey: string | string[], message: string) => {
    toast.success(message)
    void queryClient.invalidateQueries({ queryKey: ['archivedData', tabKey] })
    if (typeof activeQueryKey === 'string') {
      void queryClient.invalidateQueries({ queryKey: [activeQueryKey] })
    } else {
      void queryClient.invalidateQueries({ queryKey: activeQueryKey })
    }
  }

  const handleUnarchiveError = (message: string) => {
    toast.error(message)
  }

  // Single item mutations
  const unarchiveResident = useMutation({
    mutationFn: unarchiveResidentAction,
    onSuccess: (res) =>
      res.success
        ? handleUnarchiveSuccess('residents', 'residents', res.message)
        : handleUnarchiveError(res.message),
    onError: () => handleUnarchiveError('Failed to unarchive resident'),
  })

  const unarchiveOfficial = useMutation({
    mutationFn: unarchiveOfficialAction,
    onSuccess: (res) =>
      res.success
        ? handleUnarchiveSuccess('officials', 'officials', res.message)
        : handleUnarchiveError(res.message),
    onError: () => handleUnarchiveError('Failed to unarchive official'),
  })

  const unarchiveAnnouncement = useMutation({
    mutationFn: unarchiveAnnouncementAction,
    onSuccess: (res) =>
      res.success
        ? handleUnarchiveSuccess('announcements', 'announcements', res.message)
        : handleUnarchiveError(res.message),
    onError: () => handleUnarchiveError('Failed to unarchive announcement'),
  })

  const unarchiveBlotter = useMutation({
    mutationFn: unarchiveBlotterAction,
    onSuccess: (res) =>
      res.success
        ? handleUnarchiveSuccess('blotters', 'blotters', res.message)
        : handleUnarchiveError(res.message),
    onError: () => handleUnarchiveError('Failed to unarchive blotter'),
  })

  const unarchiveVawc = useMutation({
    mutationFn: unarchiveVawcAction,
    onSuccess: (res) =>
      res.success
        ? handleUnarchiveSuccess('vawc', 'vawcs', res.message)
        : handleUnarchiveError(res.message),
    onError: () => handleUnarchiveError('Failed to unarchive VAWC record'),
  })

  const unarchivePet = useMutation({
    mutationFn: unarchivePetAction,
    onSuccess: (res) => {
      if (res.success) {
        toast.success(res.message)
        void queryClient.invalidateQueries({ queryKey: ['archivedData', 'pets'] })
        void queryClient.invalidateQueries({ queryKey: ['pets'] })
        return
      }
      handleUnarchiveError(res.message)
    },
    onError: () => handleUnarchiveError('Failed to unarchive pet'),
  })

  const unarchiveMedicalRecord = useMutation({
    mutationFn: unarchiveMedicalRecordAction,
    onSuccess: async (res, id) => {
      if (!res.success) {
        handleUnarchiveError(res.message)
        return
      }

      toast.success(res.message)
      await queryClient.invalidateQueries({ queryKey: ['archivedData', 'medical-records'] })
      await queryClient.invalidateQueries({ queryKey: ['medical-records'] })
      await queryClient.invalidateQueries({ queryKey: ['medical-record', id] })
    },
    onError: () => handleUnarchiveError('Failed to unarchive medical record'),
  })

  // Bulk unarchive mutation
  const bulkUnarchiveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      switch (activeTab) {
        case 'Residents':
          return bulkUnarchiveResidentsAction(ids)
        case 'Officials':
          return bulkUnarchiveOfficialsAction(ids)
        case 'Announcements':
          return bulkUnarchiveAnnouncementsAction(ids)
        case 'Blotters':
          return bulkUnarchiveBlottersAction(ids)
        case 'VAWC':
          return bulkUnarchiveVawcAction(ids)
        case 'Pets':
          return bulkUnarchivePetsAction(ids)
        case 'Medical Records':
          return bulkUnarchiveMedicalRecordsAction(ids)
      }
    },
    onSuccess: (res) => {
      if (!res?.success) {
        toast.error(res?.message ?? 'Bulk restore failed.')
        return
      }
      toast.success(res.message)
      setSelectedIds([])
      setIsBulkModalOpen(false)

      const tabKeyMap: Record<TabId, { archiveKey: string; activeKey: string | string[] }> = {
        Residents: { archiveKey: 'residents', activeKey: 'residents' },
        Officials: { archiveKey: 'officials', activeKey: 'officials' },
        Announcements: { archiveKey: 'announcements', activeKey: 'announcements' },
        Blotters: { archiveKey: 'blotters', activeKey: 'blotters' },
        VAWC: { archiveKey: 'vawc', activeKey: 'vawcs' },
        Pets: { archiveKey: 'pets', activeKey: ['pets'] },
        'Medical Records': { archiveKey: 'medical-records', activeKey: 'medical-records' },
      }

      const keys = tabKeyMap[activeTab]
      void queryClient.invalidateQueries({ queryKey: ['archivedData', keys.archiveKey] })
      if (typeof keys.activeKey === 'string') {
        void queryClient.invalidateQueries({ queryKey: [keys.activeKey] })
      } else {
        void queryClient.invalidateQueries({ queryKey: keys.activeKey })
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to bulk restore records.')
    },
  })

  // Tab Data Queries
  const { data: archivedResidents = [], isLoading: isResidentsLoading } = useQuery({
    queryKey: ['archivedData', 'residents'],
    queryFn: fetchArchivedResidents,
    enabled: activeTab === 'Residents',
  })

  const { data: archivedOfficials = [], isLoading: isOfficialsLoading } = useQuery({
    queryKey: ['archivedData', 'officials'],
    queryFn: fetchArchivedOfficials,
    enabled: activeTab === 'Officials',
  })

  const { data: archivedAnnouncements = [], isLoading: isAnnouncementsLoading } = useQuery({
    queryKey: ['archivedData', 'announcements'],
    queryFn: fetchArchivedAnnouncements,
    enabled: activeTab === 'Announcements',
  })

  const { data: archivedBlotters = [], isLoading: isBlottersLoading } = useQuery({
    queryKey: ['archivedData', 'blotters'],
    queryFn: fetchArchivedBlotters,
    enabled: activeTab === 'Blotters',
  })

  const { data: archivedVawc = [], isLoading: isVawcLoading } = useQuery({
    queryKey: ['archivedData', 'vawc'],
    queryFn: fetchArchivedVawc,
    enabled: activeTab === 'VAWC',
  })

  const { data: archivedPets = [], isLoading: isPetsLoading } = useQuery({
    queryKey: ['archivedData', 'pets'],
    queryFn: fetchArchivedPets,
    enabled: activeTab === 'Pets',
  })

  const { data: archivedMedicalRecords = [], isLoading: isMedicalRecordsLoading } = useQuery({
    queryKey: ['archivedData', 'medical-records'],
    queryFn: fetchArchivedMedicalRecords,
    enabled: activeTab === 'Medical Records',
  })

  const tabs: TabDefinition[] = [
    { id: 'Residents', label: 'Residents', icon: Users },
    { id: 'Officials', label: 'Officials', icon: Shield },
    { id: 'Announcements', label: 'Announcements', icon: Megaphone },
    { id: 'Blotters', label: 'Blotters', icon: Scale },
    { id: 'Medical Records', label: 'Medical Records', icon: HeartPulse },
    { id: 'Pets', label: 'Pets', icon: PawPrint },
    { id: 'VAWC', label: 'VAWC', icon: ShieldAlert },
  ]

  // Filter items by search
  const filteredResidents = useMemo(() => {
    const q = searchTerm.toLowerCase()
    return archivedResidents.filter((r) =>
      `${r.firstName} ${r.lastName} ${r.email} ${r.houseNumber} ${r.street}`.toLowerCase().includes(q)
    )
  }, [archivedResidents, searchTerm])

  const filteredOfficials = useMemo(() => {
    const q = searchTerm.toLowerCase()
    return archivedOfficials.filter((o) =>
      `${o.name} ${o.email} ${o.position}`.toLowerCase().includes(q)
    )
  }, [archivedOfficials, searchTerm])

  const filteredAnnouncements = useMemo(() => {
    const q = searchTerm.toLowerCase()
    return archivedAnnouncements.filter((a) =>
      `${a.title} ${a.content} ${a.createdBy?.firstName ?? ''} ${a.createdBy?.lastName ?? ''}`.toLowerCase().includes(q)
    )
  }, [archivedAnnouncements, searchTerm])

  const filteredBlotters = useMemo(() => {
    const q = searchTerm.toLowerCase()
    return archivedBlotters.filter((b) =>
      `${b.complainant} ${b.respondentName} ${b.incident} ${b.location}`.toLowerCase().includes(q)
    )
  }, [archivedBlotters, searchTerm])

  const filteredVawc = useMemo(() => {
    const q = searchTerm.toLowerCase()
    return archivedVawc.filter((v) =>
      `${v.caseNumber} ${v.victimName} ${v.respondentName} ${v.abuseType}`.toLowerCase().includes(q)
    )
  }, [archivedVawc, searchTerm])

  const filteredPets = useMemo(() => {
    const q = searchTerm.toLowerCase()
    return archivedPets.filter((p) =>
      `${p.name} ${p.ownerName} ${p.type} ${p.breed ?? ''} ${p.color ?? ''}`.toLowerCase().includes(q)
    )
  }, [archivedPets, searchTerm])

  const filteredMedicalRecords = useMemo(() => {
    const q = searchTerm.toLowerCase()
    return archivedMedicalRecords.filter((m) =>
      `${m.patientName} ${m.diagnosis} ${m.notes} ${m.createdByName}`.toLowerCase().includes(q)
    )
  }, [archivedMedicalRecords, searchTerm])

  const getCurrentItems = () => {
    switch (activeTab) {
      case 'Residents':
        return filteredResidents
      case 'Officials':
        return filteredOfficials
      case 'Announcements':
        return filteredAnnouncements
      case 'Blotters':
        return filteredBlotters
      case 'VAWC':
        return filteredVawc
      case 'Pets':
        return filteredPets
      case 'Medical Records':
        return filteredMedicalRecords
    }
  }

  const currentItems = getCurrentItems()
  const totalPages = Math.max(1, Math.ceil(currentItems.length / ITEMS_PER_PAGE))
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedItems = currentItems.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const visiblePageIds = paginatedItems.map((item) => item.id)
  const isAllPageSelected =
    visiblePageIds.length > 0 && visiblePageIds.every((id) => selectedIds.includes(id))

  const handleToggleSelectAllPage = () => {
    if (isAllPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visiblePageIds.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visiblePageIds])))
    }
  }

  const handleSelectAllFiltered = () => {
    const allIds = currentItems.map((item) => item.id)
    setSelectedIds(allIds)
  }

  const renderSectionTable = () => {
    switch (activeTab) {
      case 'Residents':
        if (isResidentsLoading) return <LoadingPlaceholder text="Loading archived residents..." />
        if (filteredResidents.length === 0) return <EmptyPlaceholder text="No archived residents found" />
        return (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-slate-50">
                  <th className="w-12 px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={handleToggleSelectAllPage}
                      aria-label="Select all residents on this page"
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Address</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Registered Date</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-700">Options</th>
                </tr>
              </thead>
              <tbody>
                {(paginatedItems as ResidentRecord[]).map((item) => {
                  const isSelected = selectedIds.includes(item.id)
                  const address = [item.houseNumber, item.street, item.subdivision, item.phase].filter(Boolean).join(', ')
                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-gray-100 transition-colors ${
                        isSelected ? 'bg-primary-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="w-12 px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(item.id)}
                          aria-label={`Select ${item.firstName} ${item.lastName}`}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.firstName} {item.lastName}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{item.email}</td>
                      <td className="max-w-xs truncate px-6 py-4 text-sm text-slate-600">{address || '-'}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => unarchiveResident.mutate(item.id)}
                          disabled={unarchiveResident.isPending && unarchiveResident.variables === item.id}
                          className="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
                          title="Restore resident"
                        >
                          <RotateCcw className="h-4 w-4 text-primary-600" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )

      case 'Officials':
        if (isOfficialsLoading) return <LoadingPlaceholder text="Loading archived officials..." />
        if (filteredOfficials.length === 0) return <EmptyPlaceholder text="No archived officials found" />
        return (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-slate-50">
                  <th className="w-12 px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={handleToggleSelectAllPage}
                      aria-label="Select all officials on this page"
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Profile</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Position</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Term Start</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Term End</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-700">Options</th>
                </tr>
              </thead>
              <tbody>
                {(paginatedItems as OfficialRecord[]).map((item) => {
                  const isSelected = selectedIds.includes(item.id)
                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-gray-100 transition-colors ${
                        isSelected ? 'bg-primary-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="w-12 px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(item.id)}
                          aria-label={`Select ${item.name}`}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4">
                        {item.officialProfile ? (
                          <Image
                            src={item.officialProfile}
                            alt={item.name}
                            width={44}
                            height={44}
                            className="h-11 w-11 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">
                            {item.name.charAt(0)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{item.email}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{item.position}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{new Date(item.termStart).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{item.termEnd ? new Date(item.termEnd).toLocaleDateString() : '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => unarchiveOfficial.mutate(item.id)}
                          disabled={unarchiveOfficial.isPending && unarchiveOfficial.variables === item.id}
                          className="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
                          title="Restore official"
                        >
                          <RotateCcw className="h-4 w-4 text-primary-600" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )

      case 'Announcements':
        if (isAnnouncementsLoading) return <LoadingPlaceholder text="Loading archived announcements..." />
        if (filteredAnnouncements.length === 0) return <EmptyPlaceholder text="No archived announcements found" />
        return (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-slate-50">
                  <th className="w-12 px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={handleToggleSelectAllPage}
                      aria-label="Select all announcements on this page"
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Image</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Title</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Content</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Created By</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Date</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-700">Options</th>
                </tr>
              </thead>
              <tbody>
                {(paginatedItems as AnnouncementRecord[]).map((item) => {
                  const isSelected = selectedIds.includes(item.id)
                  const creator = item.createdBy ? `${item.createdBy.firstName} ${item.createdBy.lastName}` : 'Barangay Admin'
                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-gray-100 transition-colors ${
                        isSelected ? 'bg-primary-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="w-12 px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(item.id)}
                          aria-label={`Select ${item.title}`}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.title}
                            width={52}
                            height={52}
                            className="h-13 w-13 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-13 w-13 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                            <Megaphone className="h-5 w-5" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.title}</td>
                      <td className="max-w-sm px-6 py-4 text-sm text-slate-600" title={item.content}>
                        <p className="line-clamp-2">{item.content}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{creator}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => unarchiveAnnouncement.mutate(item.id)}
                          disabled={unarchiveAnnouncement.isPending && unarchiveAnnouncement.variables === item.id}
                          className="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
                          title="Restore announcement"
                        >
                          <RotateCcw className="h-4 w-4 text-primary-600" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )

      case 'Blotters':
        if (isBlottersLoading) return <LoadingPlaceholder text="Loading archived blotters..." />
        if (filteredBlotters.length === 0) return <EmptyPlaceholder text="No archived blotters found" />
        return (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-slate-50">
                  <th className="w-12 px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={handleToggleSelectAllPage}
                      aria-label="Select all blotters on this page"
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Complainant</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Respondent</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Incident</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Location</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-700">Options</th>
                </tr>
              </thead>
              <tbody>
                {(paginatedItems as BlotterRecord[]).map((item) => {
                  const isSelected = selectedIds.includes(item.id)
                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-gray-100 transition-colors ${
                        isSelected ? 'bg-primary-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="w-12 px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(item.id)}
                          aria-label={`Select blotter for ${item.complainant}`}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.complainant}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{item.respondentName}</td>
                      <td className="max-w-xs truncate px-6 py-4 text-sm text-slate-600" title={item.incident}>{item.incident}</td>
                      <td className="max-w-xs truncate px-6 py-4 text-sm text-slate-600">{item.location}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{new Date(item.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => unarchiveBlotter.mutate(item.id)}
                          disabled={unarchiveBlotter.isPending && unarchiveBlotter.variables === item.id}
                          className="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
                          title="Restore blotter record"
                        >
                          <RotateCcw className="h-4 w-4 text-primary-600" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )

      case 'VAWC':
        if (isVawcLoading) return <LoadingPlaceholder text="Loading archived VAWC cases..." />
        if (filteredVawc.length === 0) return <EmptyPlaceholder text="No archived VAWC cases found" />
        return (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-slate-50">
                  <th className="w-12 px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={handleToggleSelectAllPage}
                      aria-label="Select all VAWC cases on this page"
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Case Number</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Victim</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Respondent</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Abuse Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Date</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-700">Options</th>
                </tr>
              </thead>
              <tbody>
                {(paginatedItems as VawcRecordType[]).map((item) => {
                  const isSelected = selectedIds.includes(item.id)
                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-gray-100 transition-colors ${
                        isSelected ? 'bg-primary-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="w-12 px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(item.id)}
                          aria-label={`Select case ${item.caseNumber}`}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{item.caseNumber}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.victimName}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{item.respondentName}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">{item.abuseType}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(item.incidentDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => unarchiveVawc.mutate(item.id)}
                          disabled={unarchiveVawc.isPending && unarchiveVawc.variables === item.id}
                          className="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
                          title="Restore VAWC case"
                        >
                          <RotateCcw className="h-4 w-4 text-primary-600" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )

      case 'Pets':
        if (isPetsLoading) return <LoadingPlaceholder text="Loading archived pets..." />
        if (filteredPets.length === 0) return <EmptyPlaceholder text="No archived pets found" />
        return (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-slate-50">
                  <th className="w-12 px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={handleToggleSelectAllPage}
                      aria-label="Select all pets on this page"
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Pet Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Owner</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Breed</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Color</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Vaccination</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-700">Options</th>
                </tr>
              </thead>
              <tbody>
                {(paginatedItems as PetRecord[]).map((item) => {
                  const isSelected = selectedIds.includes(item.id)
                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-gray-100 transition-colors ${
                        isSelected ? 'bg-primary-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="w-12 px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(item.id)}
                          aria-label={`Select ${item.name}`}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                            <PawPrint className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                            <p className="text-xs text-slate-500">ID: {item.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{item.ownerName}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{item.type}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{item.breed ?? '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{item.color ?? '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {item.vaccinationDate ? new Date(item.vaccinationDate).toLocaleDateString() : 'Not provided'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => unarchivePet.mutate(item.id)}
                          disabled={unarchivePet.isPending && unarchivePet.variables === item.id}
                          className="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
                          title="Restore pet"
                        >
                          <RotateCcw className="h-4 w-4 text-primary-600" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )

      case 'Medical Records':
        if (isMedicalRecordsLoading) return <LoadingPlaceholder text="Loading archived medical records..." />
        if (filteredMedicalRecords.length === 0) return <EmptyPlaceholder text="No archived medical records found" />
        return (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-slate-50">
                  <th className="w-12 px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={handleToggleSelectAllPage}
                      aria-label="Select all medical records on this page"
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Patient</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Diagnosis</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Notes / Treatment</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Checked By</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Date</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-700">Options</th>
                </tr>
              </thead>
              <tbody>
                {(paginatedItems as ClinicMedicalRecordListItem[]).map((item) => {
                  const isSelected = selectedIds.includes(item.id)
                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-gray-100 transition-colors ${
                        isSelected ? 'bg-primary-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="w-12 px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(item.id)}
                          aria-label={`Select record for ${item.patientName}`}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{item.patientName}</td>
                      <td className="max-w-xs truncate px-6 py-4 text-sm text-slate-600">{item.diagnosis}</td>
                      <td className="max-w-xs truncate px-6 py-4 text-sm text-slate-600">{item.notes}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{item.createdByName}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{new Date(item.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => unarchiveMedicalRecord.mutate(item.id)}
                          disabled={unarchiveMedicalRecord.isPending && unarchiveMedicalRecord.variables === item.id}
                          className="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
                          title="Restore medical record"
                        >
                          <RotateCcw className="h-4 w-4 text-primary-600" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Archives</h1>
          <p className="mt-1 text-slate-600">Manage and restore archived barangay records</p>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={currentItems.length}
        onClearSelection={() => setSelectedIds([])}
        onSelectAll={handleSelectAllFiltered}
        isAllSelected={selectedIds.length === currentItems.length && currentItems.length > 0}
        onBulkAction={() => setIsBulkModalOpen(true)}
        actionType="unarchive"
        actionLabel="Bulk Unarchive"
        isLoading={bulkUnarchiveMutation.isPending}
      />

      {/* Search Bar */}
      <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-slate-50 px-4 py-2.5">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            type="text"
            className="flex-1 bg-transparent text-slate-700 outline-none placeholder-slate-500"
            placeholder={`Search archived ${activeTab.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full">
          <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
            <nav className="flex overflow-x-auto border-b border-gray-100 px-4" aria-label="Tabs">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id

                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
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
        </div>
      </div>

      {/* Table Section Card */}
      <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
        {renderSectionTable()}

        {/* Pagination */}
        {currentItems.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-slate-50 px-6 py-4">
            <div className="text-sm text-slate-600">
              Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
              <span className="font-semibold">{Math.min(startIndex + ITEMS_PER_PAGE, currentItems.length)}</span> of{' '}
              <span className="font-semibold">{currentItems.length}</span> records
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
                className="rounded-lg border border-gray-200 p-2 text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <BulkConfirmModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onConfirm={() => bulkUnarchiveMutation.mutate(selectedIds)}
        title="Restore Selected Records"
        message={`Are you sure you want to restore ${selectedIds.length} selected ${activeTab.toLowerCase()} record${
          selectedIds.length !== 1 ? 's' : ''
        }? They will be returned to active status.`}
        confirmText="Restore Selected"
        variant="primary"
        isPending={bulkUnarchiveMutation.isPending}
      />
    </div>
  )
}

function LoadingPlaceholder({ text }: { text: string }) {
  return (
    <div className="flex w-full flex-col items-center justify-center py-16 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary-600 mb-2" />
      <p className="font-medium text-slate-600">{text}</p>
    </div>
  )
}

function EmptyPlaceholder({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-dashed border-gray-200 bg-slate-50 px-6 py-16 text-center">
      <Archive className="h-12 w-12 text-slate-300" />
      <h3 className="mt-3 text-sm font-semibold text-slate-900">No records found</h3>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
    </div>
  )
}
