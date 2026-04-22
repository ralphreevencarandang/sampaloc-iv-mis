'use client'

import { CalendarClock, CirclePlus, ClipboardList, FileStack, HeartPulse, Users } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import MedicalRecordModalForm from '@/components/ui/Clinic/MedicalRecordModalForm'

type StatCard = {
  label: string
  value: string
  helper: string
}

type Patient = {
  id: string
  name: string
  age: number
  barangayZone: string
  lastVisit: string
  status: string
}

type SummaryGroup = {
  title: string
  items: string[]
}

type ActivityItem = {
  id: string
  title: string
  description: string
  time: string
}

type ClinicDashboardProps = {
  healthWorkerName: string
  stats: StatCard[]
  patients: Patient[]
  summary: SummaryGroup[]
  activity: ActivityItem[]
}

const statIcons = [Users, ClipboardList, CalendarClock, FileStack]

export default function ClinicDashboard({
  healthWorkerName,
  stats,
  patients,
  summary,
  activity,
}: ClinicDashboardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [recentActivity, setRecentActivity] = useState(activity)

  const patientOptions = useMemo(
    () =>
      patients.map((patient) => ({
        id: patient.id,
        name: patient.name,
        age: patient.age,
        barangayZone: patient.barangayZone,
      })),
    [patients]
  )

  return (
    <>
      <div className="space-y-8">
        <section className="overflow-hidden rounded-[32px] bg-linear-to-r from-teal-700 via-teal-600 to-cyan-600 p-6 text-white shadow-lg md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-teal-50">
                <HeartPulse className="h-4 w-4" />
                Health Worker Dashboard
              </div>
              <h1 className="text-3xl font-bold md:text-4xl">Welcome back, {healthWorkerName}</h1>
              <p className="mt-3 text-sm leading-6 text-teal-50/90 md:text-base">
                Here&apos;s a quick snapshot of patient care, recent record activity, and the draft-ready medical records workflow for the barangay clinic.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold text-teal-700 transition hover:bg-teal-50"
            >
              <CirclePlus className="h-5 w-5" />
              Add Medical Record
            </button>
          </div>
        </section>

        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = statIcons[index] ?? ClipboardList

            return (
              <article
                key={stat.label}
                className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                  <Icon className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{stat.value}</p>
                <p className="mt-3 text-sm text-slate-600">{stat.helper}</p>
              </article>
            )
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Patient Snapshot</h2>
                <p className="mt-1 text-sm text-slate-600">Mock resident data for the dashboard layout and record-entry workflow.</p>
              </div>
            </div>

            <div className="space-y-4">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-base font-semibold text-slate-900">{patient.name}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Age {patient.age} - {patient.barangayZone}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 text-sm md:items-end">
                    <span className="inline-flex w-fit rounded-full bg-teal-100 px-3 py-1 font-medium text-teal-700">
                      {patient.status}
                    </span>
                    <span className="text-slate-500">Last visit: {patient.lastVisit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {summary.map((group) => (
              <div key={group.title} className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">{group.title}</h2>
                <div className="mt-4 space-y-3">
                  {group.items.map((item) => (
                    <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div id="medical-records" className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Medical Records</h2>
                <p className="mt-1 text-sm text-slate-600">Server-action form flow with Zod validation, prepared for future persistence.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-100"
              >
                <CirclePlus className="h-4 w-4" />
                New record
              </button>
            </div>

            <div className="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Prepared fields</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Patient selection, diagnosis, notes, consultation date, and optional attachments are already wired to a dedicated server action so we can connect Prisma storage later without replacing the UI contract.
              </p>
            </div>
          </div>

          <div id="recent-activity" className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Recent Activity</h2>
            <p className="mt-1 text-sm text-slate-600">Latest mock activity, plus any new records created from this dashboard session.</p>
            <div className="mt-5 space-y-4">
              {recentActivity.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                    </div>
                    <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <MedicalRecordModalForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        patients={patientOptions}
        onRecordCreated={(record) => {
          setRecentActivity((current) => [
            {
              id: `activity-${Date.now()}`,
              title: `Medical record drafted for ${record.patientName}`,
              description: `${record.diagnosis} was submitted through the clinic modal for ${record.date}.`,
              time: 'Just now',
            },
            ...current,
          ])
        }}
      />
    </>
  )
}
