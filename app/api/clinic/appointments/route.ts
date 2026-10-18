import { NextResponse } from 'next/server'
import { appointmentResident, appointmentStaff } from '@/lib/appointment-authorization'
import { appointmentSelect, serializeAppointment } from '@/lib/appointments'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  const mode = new URL(request.url).searchParams.get('mode')
  const actor = mode === 'resident' ? await appointmentResident() : mode === 'staff' ? await appointmentStaff() : null
  if (!actor) return NextResponse.json({ message: 'Unauthorized or insufficient permissions.' }, { status: 401 })
  try {
    const rows = await prisma.clinicAppointment.findMany({
      where: mode === 'resident' ? { residentId: actor.id } : {}, select: appointmentSelect, orderBy: { startsAt: 'desc' },
    })
    const schedule = mode === 'staff' ? await prisma.clinicSchedule.findUnique({ where: { id: 'clinic' } }) : null
    return NextResponse.json({ appointments: rows.map(serializeAppointment), schedule, canWrite: mode === 'staff' && Boolean(await appointmentStaff('write')) }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    console.error('Clinic appointment list failed')
    return NextResponse.json({ message: 'Unable to load clinic appointments.' }, { status: 500 })
  }
}
