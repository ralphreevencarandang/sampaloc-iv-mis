import 'server-only'
import { render } from '@react-email/render'
import { createElement } from 'react'
import { EmailTemplate } from '@/components/templates/email-template'
import { transporter } from '@/lib/nodemailer'
import prisma from '@/lib/prisma'
import { appointmentLabel, appointmentTime, type AppointmentStatusValue } from '@/lib/appointment-policy'

export async function sendAppointmentNotification(id: string, status: AppointmentStatusValue) {
  try {
    const row = await prisma.clinicAppointment.findUnique({ where: { id }, select: {
      startsAt: true, endsAt: true, resident: { select: { email: true, firstName: true } },
    } })
    if (!row) return
    const instructions = status === 'CONFIRMED'
      ? 'Please arrive at the clinic on time and bring a valid ID. Review your appointment in My Account.'
      : status === 'PENDING' ? 'Please wait for clinic confirmation before attending. You can check the status in My Account.'
        : 'Please check My Account for details or contact the clinic for assistance.'
    const html = await render(createElement(EmailTemplate, {
      firstName: row.resident.firstName, heading: 'Clinic Appointment Update',
      intro: `Your clinic appointment status is ${status.replaceAll('_', ' ')}.`,
      paragraphs: [`Appointment: ${appointmentLabel(row.startsAt)} – ${appointmentTime(row.endsAt)} (Philippine time).`, instructions],
      ctaLabel: 'Open My Account',
      ctaUrl: new URL('/my-account', process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000').toString(),
      footer: 'Sampaloc IV Barangay Clinic',
    }))
    await transporter.sendMail({ from: process.env.SMTP_FROM || '"Sampaloc IV MIS" <no-reply@sampalocivmis.com>', to: row.resident.email, subject: `Clinic Appointment — ${status.replaceAll('_', ' ')}`, html })
  } catch { console.error('Clinic appointment notification delivery failed') }
}
