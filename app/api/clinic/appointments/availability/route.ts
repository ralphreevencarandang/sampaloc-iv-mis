import { NextResponse } from 'next/server'
import { appointmentResident } from '@/lib/appointment-authorization'
import prisma from '@/lib/prisma'
import { slotsForDate, manilaDate, OCCUPIED_APPOINTMENT_STATUSES } from '@/lib/appointment-policy'

export async function GET() {
  if (!await appointmentResident()) return NextResponse.json({ message: 'Please sign in.' }, { status: 401 })
  try {
    const schedule = await prisma.clinicSchedule.findUnique({ where: { id: 'clinic' } })
    const now = new Date()
    const start = new Date(`${manilaDate(now)}T00:00:00+08:00`)
    // Display the next 90 days; bookings still validate the current schedule under a lock.
    const end = new Date(start.getTime() + 90 * 86400000)
    const rows = schedule?.enabled ? await prisma.clinicAppointment.findMany({ where: {
      startsAt: { lt: end }, endsAt: { gt: start }, status: { in: [...OCCUPIED_APPOINTMENT_STATUSES] },
    }, select: { startsAt: true, endsAt: true } }) : []
    const dates = Array.from({ length: 90 }, (_, i) => manilaDate(new Date(start.getTime() + i * 86400000))).flatMap(date => {
      const slots = slotsForDate(schedule, date, now).flatMap(slot => {
        const remaining = (schedule?.capacity ?? 0) - rows.filter(a => a.startsAt < slot.endsAt && a.endsAt > slot.startsAt).length
        return remaining > 0 ? [{ startsAt: slot.startsAt.toISOString(), endsAt: slot.endsAt.toISOString(), remaining }] : []
      })
      return slots.length ? [{ date, slots }] : []
    })
    return NextResponse.json({ enabled: Boolean(schedule?.enabled), dates }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    console.error('Clinic appointment availability failed')
    return NextResponse.json({ message: 'Unable to load availability.' }, { status: 500 })
  }
}
