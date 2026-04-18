'use client'

import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
  ArrowLeft,
  BadgeCheck,
  Calendar,
  CreditCard,
  House,
  Mail,
  MapPin,
  ShieldCheck,
  User,
  UserCheck,
} from 'lucide-react'
import apiClient from '@/lib/axios'

type ResidentStatus = 'PENDING' | 'APPROVED' | 'DECLINED'

type ResidentDetail = {
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
  precinctNumber: string | null
  validIDImage: string | null
  status: ResidentStatus
  createdAt: string
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatAge(birthDate: string) {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age
}

function statusClasses(status: ResidentStatus) {
  switch (status) {
    case 'APPROVED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'DECLINED':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    case 'PENDING':
    default:
      return 'bg-amber-50 text-amber-700 border-amber-200'
  }
}

function statusIcon(status: ResidentStatus) {
  switch (status) {
    case 'APPROVED':
      return <BadgeCheck className="h-4 w-4" />
    case 'DECLINED':
      return <ShieldCheck className="h-4 w-4" />
    case 'PENDING':
    default:
      return <Calendar className="h-4 w-4" />
  }
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

async function fetchResident(residentId: string) {
  const { data } = await apiClient.get<ResidentDetail>(`/residents/${residentId}`)
  return data
}

export default function ResidentViewPage() {
  const params = useParams<{ id: string }>()
  const residentId = params?.id

  const {
    data: resident,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['resident', residentId],
    queryFn: async () => {
      if (!residentId) {
        return null
      }

      try {
        return await fetchResident(residentId)
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          return null
        }

        throw err
      }
    },
    enabled: Boolean(residentId),
  })

  if (!residentId) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/resident"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to residents
        </Link>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5 text-amber-900">
          Resident ID is missing.
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/resident"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to residents
        </Link>
        <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
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
          href="/admin/resident"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to residents
        </Link>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-5 text-rose-900">
          Failed to load resident details: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    )
  }

  if (!resident) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/resident"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to residents
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center">
          <User className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Resident not found</h2>
          <p className="mt-2 text-sm text-slate-600">
            The resident record could not be found or has been removed.
          </p>
          <Link
            href="/admin/resident"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to residents
          </Link>
        </div>
      </div>
    )
  }

  const fullName = [
    resident.firstName,
    resident.middleName ? `${resident.middleName}` : '',
    resident.lastName,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/admin/resident"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to residents
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                <User className="h-12 w-12" />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-slate-900">{fullName}</h1>
              <p className="mt-1 text-sm text-slate-500">{resident.id}</p>

              <div className="mt-5 w-full space-y-3 border-t border-slate-100 pt-5 text-left">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-500">Status</span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(
                      resident.status
                    )}`}
                  >
                    {statusIcon(resident.status)}
                    {resident.status}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-500">Voter</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                    <UserCheck className="h-4 w-4" />
                    {resident.isVoter ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-500">Age</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {formatAge(resident.birthDate)} years old
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-500">Registered</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {formatDate(resident.createdAt)}
                  </span>
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
                label="Email"
                value={<span className="break-all">{resident.email}</span>}
              />
              <InfoTile
                label="Phone"
                value={resident.contactNumber || 'Not provided'}
              />
            </div>
          </section>
        </aside>

        <main className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <User className="h-5 w-5 text-primary-600" />
              Personal Information
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <InfoTile label="First Name" value={resident.firstName} />
              <InfoTile label="Middle Name" value={resident.middleName || 'Not provided'} />
              <InfoTile label="Last Name" value={resident.lastName} />
              <InfoTile
                label="Date of Birth"
                value={formatDate(resident.birthDate)}
              />
              <InfoTile label="Gender" value={resident.gender} />
              <InfoTile label="Civil Status" value={resident.civilStatus} />
              <InfoTile label="Citizenship" value={resident.citizenship} />
              <InfoTile
                label="Occupation"
                value={resident.occupation || 'Not provided'}
              />
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <MapPin className="h-5 w-5 text-primary-600" />
              Address Information
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InfoTile label="House Number / Unit" value={resident.houseNumber} />
              <InfoTile label="Street" value={resident.street} />
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Complete Address
                </p>
                <div className="mt-2 flex items-start gap-3 text-sm font-medium text-slate-900">
                  <House className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                  <span>{`${resident.houseNumber}, ${resident.street}`}</span>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <ShieldCheck className="h-5 w-5 text-primary-600" />
                Voting Information
              </h2>
              <div className="mt-5 space-y-4">
                <InfoTile
                  label="Eligible to Vote"
                  value={resident.isVoter ? 'Yes' : 'No'}
                />
              </div>
              <div className="mt-5 space-y-4">
                <InfoTile
                  label="Precinct Number"
                  value={resident.precinctNumber ? resident.precinctNumber : 'Not provided'}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <CreditCard className="h-5 w-5 text-primary-600" />
                Valid ID
              </h2>
              <div className="mt-5">
                {resident.validIDImage ? (
                  <a
                    href={resident.validIDImage}
                    target="_blank"
                    rel="noreferrer"
                    className="group block overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                  >
                    <Image
                      src={resident.validIDImage}
                      alt={`Valid ID of ${fullName}`}
                      width={1200}
                      height={800}
                      className="h-56 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </a>
                ) : (
                  <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center">
                    <div>
                      <CreditCard className="mx-auto h-10 w-10 text-slate-300" />
                      <p className="mt-3 text-sm font-medium text-slate-700">
                        No valid ID uploaded
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        This resident has not provided a valid ID image.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
