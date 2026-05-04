import { NextResponse } from 'next/server'
import { getCurrentAdminFromSession } from '@/lib/admin-session'
import { getCurrentHealthWorkerFromSession } from '@/lib/health-worker-session'
import prismaModule from '@/lib/prisma'
import { serializeClinicMedicalRecord } from '@/lib/clinic-utils'

const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule

export async function GET(request: Request) {
  try {
    const [currentHealthWorker, currentAdmin] = await Promise.all([
      getCurrentHealthWorkerFromSession(),
      getCurrentAdminFromSession(),
    ])

    if (!currentHealthWorker && !currentAdmin) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const archived = searchParams.get('archived') === 'true'

    const medicalRecords = await prisma.medicalRecord.findMany({
      where: {
        isArchive: archived,
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
    })

    return NextResponse.json(medicalRecords.map((record) => serializeClinicMedicalRecord(record)))
  } catch (error) {
    console.error('GET /api/clinic/medical-records failed', error)

    return NextResponse.json({ message: 'Failed to fetch medical records.' }, { status: 500 })
  }
}
