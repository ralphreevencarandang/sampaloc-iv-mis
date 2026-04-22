import React from 'react'
import ClinicDashboard from '@/components/ui/Clinic/ClinicDashboard'
import { getCurrentHealthWorkerFromSession } from '@/lib/health-worker-session'

const mockPatients = [
  {
    id: 'resident-001',
    name: 'Maria Santos',
    age: 34,
    barangayZone: 'Purok 1',
    lastVisit: '2026-04-20',
    status: 'Follow-up needed',
  },
  {
    id: 'resident-002',
    name: 'Joel Ramirez',
    age: 58,
    barangayZone: 'Purok 3',
    lastVisit: '2026-04-18',
    status: 'Stable',
  },
  {
    id: 'resident-003',
    name: 'Aira Mendoza',
    age: 12,
    barangayZone: 'Purok 5',
    lastVisit: '2026-04-21',
    status: 'Immunization due',
  },
  {
    id: 'resident-004',
    name: 'Rogelio Cruz',
    age: 67,
    barangayZone: 'Purok 2',
    lastVisit: '2026-04-17',
    status: 'Medication review',
  },
]

const mockStats = [
  {
    label: 'Registered Patients',
    value: '128',
    helper: '12 new profiles this month',
  },
  {
    label: 'Records Updated Today',
    value: '18',
    helper: '6 during morning clinic',
  },
  {
    label: 'Scheduled Follow-ups',
    value: '7',
    helper: '3 high-priority cases',
  },
  {
    label: 'Pending Attachments',
    value: '4',
    helper: 'Ready for verification',
  },
]

const mockSummary = [
  {
    title: 'Common Diagnoses',
    items: ['Upper respiratory infection', 'Hypertension monitoring', 'Childhood immunization'],
  },
  {
    title: 'This Week',
    items: ['42 consultations completed', '9 prenatal checkups logged', '5 referrals prepared'],
  },
]

const mockActivity = [
  {
    id: 'activity-001',
    title: 'Medical record updated for Maria Santos',
    description: 'Follow-up consultation notes were prepared for review.',
    time: '10 minutes ago',
  },
  {
    id: 'activity-002',
    title: 'Attachment bundle received',
    description: 'Joel Ramirez uploaded blood pressure monitoring photos.',
    time: '42 minutes ago',
  },
  {
    id: 'activity-003',
    title: 'Reminder scheduled',
    description: 'Immunization follow-up set for Aira Mendoza on April 25, 2026.',
    time: '1 hour ago',
  },
]

export default async function ClinicDashboardPage() {
  const healthWorker = await getCurrentHealthWorkerFromSession()

  return (
    <ClinicDashboard
      healthWorkerName={healthWorker?.name ?? 'Health Worker'}
      stats={mockStats}
      patients={mockPatients}
      summary={mockSummary}
      activity={mockActivity}
    />
  )
}
