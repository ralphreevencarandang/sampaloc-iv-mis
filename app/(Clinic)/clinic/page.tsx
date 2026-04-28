import React from 'react'
import ClinicDashboard from '@/components/ui/Clinic/ClinicDashboard'
import { calculateAge, serializeClinicMedicalRecord } from '@/lib/clinic-utils'
import { getCurrentHealthWorkerFromSession } from '@/lib/health-worker-session'
import prismaModule from '@/lib/prisma'

const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule

function getStartOfToday() {
  const value = new Date()
  value.setHours(0, 0, 0, 0)
  return value
}

function getStartOfWeek() {
  const value = getStartOfToday()
  const day = value.getDay()
  const diff = day === 0 ? 6 : day - 1
  value.setDate(value.getDate() - diff)
  return value
}

export default async function ClinicDashboardPage() {
  const healthWorker = await getCurrentHealthWorkerFromSession()
  const [residents, medicalRecords] = await Promise.all([
    prisma.resident.findMany({
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        birthDate: true,
        street: true,
        medicalRecords: {
          where: {
            isArchive: false,
          },
          select: {
            date: true,
          },
          orderBy: {
            date: 'desc',
          },
          take: 1,
        },
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' },
      ],
    }),
    prisma.medicalRecord.findMany({
      where: {
        isArchive: false,
      },
      select: {
        id: true,
        patientId: true,
        symptoms: true,
        diagnosis: true,
        treatment: true,
        prescription: true,
        date: true,
        isArchive: true,
        patient: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
          },
        },
        checkedBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    }),
  ])

  const patients = residents.map((resident) => {
    const name = [resident.firstName, resident.middleName, resident.lastName].filter(Boolean).join(' ')
    const lastVisit = resident.medicalRecords[0]?.date.toISOString().slice(0, 10) ?? 'No visit yet'

    return {
      id: resident.id,
      name,
      age: calculateAge(resident.birthDate),
      barangayZone: resident.street,
      lastVisit,
      status: resident.medicalRecords[0] ? 'Has medical history' : 'New patient',
    }
  })

  const initialMedicalRecords = medicalRecords.map((record) => serializeClinicMedicalRecord(record))
  const today = getStartOfToday()
  const weekStart = getStartOfWeek()
  const recordsTodayCount = medicalRecords.filter((record) => record.date >= today).length
  const recordsThisWeek = medicalRecords.filter((record) => record.date >= weekStart)
  const patientsNeedingFollowUp = residents.filter((resident) => {
    const lastVisit = resident.medicalRecords[0]?.date

    if (!lastVisit) {
      return false
    }

    const daysSinceLastVisit = Math.floor(
      (today.getTime() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24)
    )

    return daysSinceLastVisit >= 30
  }).length
  const pendingAttachmentsCount = initialMedicalRecords.filter(
    (record) => record.attachments.length > 0
  ).length

  const diagnosisFrequency = medicalRecords.reduce<Record<string, number>>((accumulator, record) => {
    const diagnosis = record.diagnosis.trim()

    if (!diagnosis) {
      return accumulator
    }

    accumulator[diagnosis] = (accumulator[diagnosis] ?? 0) + 1
    return accumulator
  }, {})

  const commonDiagnoses = Object.entries(diagnosisFrequency)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([diagnosis, count]) => `${diagnosis} (${count})`)

  const stats = [
    {
      label: 'Registered Patients',
      value: String(residents.length),
      helper:
        residents.length === 0
          ? 'No residents are available yet.'
          : `${residents.filter((resident) => resident.medicalRecords.length > 0).length} with recorded visits`,
    },
    {
      label: 'Records Updated Today',
      value: String(recordsTodayCount),
      helper:
        recordsTodayCount === 0
          ? 'No medical records logged today.'
          : `${recordsTodayCount} consultation${recordsTodayCount === 1 ? '' : 's'} recorded today`,
    },
    {
      label: 'Scheduled Follow-ups',
      value: String(patientsNeedingFollowUp),
      helper:
        patientsNeedingFollowUp === 0
          ? 'No overdue follow-ups detected.'
          : `${patientsNeedingFollowUp} patient${patientsNeedingFollowUp === 1 ? '' : 's'} without a visit in 30+ days`,
    },
    {
      label: 'Pending Attachments',
      value: String(pendingAttachmentsCount),
      helper:
        pendingAttachmentsCount === 0
          ? 'No attachment metadata stored.'
          : `${pendingAttachmentsCount} record${pendingAttachmentsCount === 1 ? '' : 's'} include attachments`,
    },
  ]

  const summary = [
    {
      title: 'Common Diagnoses',
      items:
        commonDiagnoses.length > 0 ? commonDiagnoses : ['No diagnosis trends are available yet.'],
    },
    {
      title: 'This Week',
      items: [
        `${recordsThisWeek.length} consultation${recordsThisWeek.length === 1 ? '' : 's'} completed`,
        `${recordsThisWeek.filter((record) => record.prescription).length} record${
          recordsThisWeek.filter((record) => record.prescription).length === 1 ? '' : 's'
        } with attachments`,
        `${new Set(recordsThisWeek.map((record) => record.patientId)).size} patient${
          new Set(recordsThisWeek.map((record) => record.patientId)).size === 1 ? '' : 's'
        } seen this week`,
      ],
    },
  ]

  return (
    <ClinicDashboard
      healthWorkerName={healthWorker?.name ?? 'Health Worker'}
      stats={stats}
      patients={patients}
      summary={summary}
    />
  )
}
