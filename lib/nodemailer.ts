import nodemailer from 'nodemailer'
import * as dotenv from 'dotenv'
import { render } from '@react-email/render'
import { EmailTemplate } from '@/components/templates/email-template'
import * as React from 'react'

dotenv.config()

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

function getPortalUrl(path: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    process.env.NEXTAUTH_URL ??
    'http://localhost:3000'

  return new URL(path, baseUrl).toString()
}

/**
 * Reusable email service function for sending approval notifications
 * Asynchronous execution allows for non-blocking email updates
 */
export async function sendResidentApprovalEmail(email: string, firstName: string) {
  try {
    const html = await render(
      React.createElement(EmailTemplate, {
        firstName,
        heading: 'Registration Approved!',
        intro:
          'Your resident registration has been reviewed and APPROVED by the barangay administration.',
        paragraphs: [
          'You can now log in to the Sampaloc IV MIS portal using your registered email address to access services and view your records.',
        ],
        ctaLabel: 'Log In to Portal',
        ctaUrl: getPortalUrl('/login'),
        footer:
          'If you did not request this registration, please contact the barangay hall immediately.',
      })
    )

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Sampaloc IV MIS" <no-reply@sampalocivmis.com>',
      to: email,
      subject: 'Resident Registration Approved',
      html,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('Approval email sent successfully via Nodemailer:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Exception sending approval email via Nodemailer:', error)
    return { success: false, error }
  }
}

export async function sendDocumentRequestPdfEmail(input: {
  email: string
  firstName: string
  documentLabel: string
  serialNumber: string
  fileName: string
  pdfBuffer: Buffer
}) {
  try {
    const html = await render(
      React.createElement(EmailTemplate, {
        firstName: input.firstName,
        heading: 'Your Document Request Is Ready',
        intro: `Your ${input.documentLabel} has been processed by the barangay administration.`,
        paragraphs: [
          `We have attached your PDF copy with serial number ${input.serialNumber} to this email.`,
          'You can also review your request status in the Sampaloc IV MIS resident portal.',
        ],
        ctaLabel: 'Open My Account',
        ctaUrl: getPortalUrl('/my-account'),
        footer:
          'If you were not expecting this document, please contact the barangay hall immediately.',
      })
    )

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Sampaloc IV MIS" <no-reply@sampalocivmis.com>',
      to: input.email,
      subject: `${input.documentLabel} PDF Copy`,
      html,
      attachments: [
        {
          filename: input.fileName,
          content: input.pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    })

    console.log('Document request email sent successfully via Nodemailer:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Exception sending document request email via Nodemailer:', error)
    return { success: false, error }
  }
}
