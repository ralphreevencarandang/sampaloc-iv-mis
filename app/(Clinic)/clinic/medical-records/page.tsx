import React from 'react'
import ClinicMedicalRecordsPage from '@/components/ui/Clinic/ClinicMedicalRecordsPage'
import { calculateAge } from '@/lib/clinic-utils'
import prismaModule from '@/lib/prisma'

const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule

export default async function ClinicMedicalRecordsRoute() {
  const residents = await prisma.resident.findMany({
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      birthDate: true,
      street: true,
    },
    orderBy: [
      { firstName: 'asc' },
      { lastName: 'asc' },
    ],
  })

  const patients = residents.map((resident) => ({
    id: resident.id,
    name: [resident.firstName, resident.middleName, resident.lastName].filter(Boolean).join(' '),
    age: calculateAge(resident.birthDate),
    barangayZone: resident.street,
  }))

  return <ClinicMedicalRecordsPage patients={patients} />
}
