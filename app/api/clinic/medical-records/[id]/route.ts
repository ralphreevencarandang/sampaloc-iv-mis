import { NextResponse } from 'next/server'
import { getCurrentAdminFromSession } from '@/lib/admin-session'
import { getCurrentHealthWorkerFromSession } from '@/lib/health-worker-session'
import prismaModule from '@/lib/prisma'
import { serializeClinicMedicalRecord } from '@/lib/clinic-utils'
import { canAccessResource } from '@/lib/rbac'

const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const [currentHealthWorker, currentAdmin] = await Promise.all([
      getCurrentHealthWorkerFromSession(),
      getCurrentAdminFromSession(),
    ])

    if (!currentHealthWorker && !currentAdmin) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
    }

    if (!currentHealthWorker && currentAdmin && !canAccessResource(currentAdmin.role, 'health')) {
      return NextResponse.json(
        { message: 'You do not have permission to access medical records.' },
        { status: 403 }
      )
    }

    const { id } = await context.params

    const medicalRecord = await prisma.medicalRecord.findUnique({
      where: { id },
      select: {
        id: true,
        patientId: true,
        symptoms: true,
        diagnosis: true,
        treatment: true,
        prescription: true,
        assignedNurse: true,
        medicinesGiven: true,
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
    })

    if (!medicalRecord) {
      return NextResponse.json({ message: 'Medical record not found.' }, { status: 404 })
    }

    return NextResponse.json(serializeClinicMedicalRecord(medicalRecord))
  } catch (error) {
    console.error('GET /api/clinic/medical-records/[id] failed', error)

    return NextResponse.json({ message: 'Failed to fetch medical record.' }, { status: 500 })
  }
}
