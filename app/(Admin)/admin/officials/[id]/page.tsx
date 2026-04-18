'use client'

import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  Shield,
  User,
  XCircle,
} from 'lucide-react'
import apiClient from '@/lib/axios'
import type { OfficialRecord } from '@/server/officials/officials'

function formatDate(value: string | null) {
  if (!value) return 'Present'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function StatusBadge({ status }: { status: "Active" | "Inactive" }) {
  if (status === "Active") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="h-4 w-4" />
        Active Term
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
      <XCircle className="h-4 w-4" />
      Inactive
    </span>
  )
}

function InfoTile({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  )
}

async function fetchOfficial(officialId: string) {
  const { data } = await apiClient.get<OfficialRecord>(`/officials/${officialId}`)
  return data
}

export default function OfficialViewPage() {
  const params = useParams<{ id: string }>()
  const officialId = params?.id

  const {
    data: official,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['official', officialId],
    queryFn: async () => {
      if (!officialId) {
        return null
      }

      try {
        return await fetchOfficial(officialId)
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          return null
        }

        throw err
      }
    },
    enabled: Boolean(officialId),
  })

  if (!officialId) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/officials"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to officials
        </Link>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5 text-amber-900">
          Official ID is missing.
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/officials"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to officials
        </Link>
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="h-[420px] animate-pulse rounded-3xl border border-slate-200 bg-white" />
          <div className="space-y-6">
            <div className="h-[180px] animate-pulse rounded-3xl border border-slate-200 bg-white" />
            <div className="h-[220px] animate-pulse rounded-3xl border border-slate-200 bg-white" />
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/officials"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to officials
        </Link>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-5 text-rose-900">
          Failed to load official details: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    )
  }

  if (!official) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/officials"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to officials
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center">
          <User className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Official not found</h2>
          <p className="mt-2 text-sm text-slate-600">
            The official record could not be found or has been removed.
          </p>
          <Link
            href="/admin/officials"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to officials
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/admin/officials"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to officials
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              {official.officialProfile ? (
                 <div className="group relative h-24 w-24 overflow-hidden rounded-full border-4 border-slate-50 shadow-sm">
                    <Image
                      src={official.officialProfile}
                      alt={official.name}
                      fill
                      className="object-cover"
                    />
                 </div>
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                  <User className="h-12 w-12" />
                </div>
              )}
              <h1 className="mt-4 text-2xl font-bold text-slate-900">{official.name}</h1>
              <div className="mt-1 flex items-center justify-center gap-1.5 text-sm font-medium text-primary-600">
                <Shield className="h-4 w-4" />
                {official.position}
              </div>
              <p className="mt-1 text-xs font-mono text-slate-500">{official.id.slice(-8).toUpperCase()}</p>

              <div className="mt-5 w-full space-y-3 border-t border-slate-100 pt-5 text-left">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-500">Status</span>
                  <StatusBadge status={official.status} />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Mail className="h-5 w-5 text-primary-600" />
              Contact
            </h2>
            <div className="mt-5 space-y-4">
              <InfoTile
                label="Email Address"
                value={<span className="break-all">{official.email}</span>}
              />
            </div>
          </section>
        </aside>

        <main className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <User className="h-5 w-5 text-primary-600" />
              Identity Information
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InfoTile label="Full Name" value={official.name} />
              <InfoTile label="Position" value={official.position} />
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Briefcase className="h-5 w-5 text-primary-600" />
              Service Term Details
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InfoTile
                label="Term Start Date"
                value={
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {formatDate(official.termStart)}
                  </div>
                }
              />
              <InfoTile
                label="Term End Date"
                value={
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    {formatDate(official.termEnd)}
                  </div>
                }
              />
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}