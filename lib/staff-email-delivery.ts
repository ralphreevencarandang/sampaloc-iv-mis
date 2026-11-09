import 'server-only';
import { render } from '@react-email/render';
import { createElement } from 'react';
import { transporter } from '@/lib/nodemailer';
import { EmailTemplate } from '@/components/templates/email-template';
import type { StaffEmailContent } from '@/validations/staff-email.validation';

export type StaffEmailOutcome = 'accepted' | 'rejected' | 'uncertain' | 'unavailable';

export async function deliverStaffEmail(content: StaffEmailContent): Promise<StaffEmailOutcome> {
  const from = process.env.SMTP_FROM;
  if (!from || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.error('Staff email failed', { stage: 'configuration' });
    return 'unavailable';
  }
  try {
    const html = await render(createElement(EmailTemplate, {
      firstName: 'there', heading: content.subject,
      intro: 'A message from Barangay Sampaloc IV.', paragraphs: [content.message],
      ctaLabel: '', ctaUrl: '', footer: 'Sent through the Sampaloc IV MIS by the barangay office.',
    }));
    const info = await transporter.sendMail({
      from, to: content.recipient, subject: content.subject, text: content.message, html,
      disableFileAccess: true, disableUrlAccess: true,
    });
    const accepted = info.accepted?.some(address =>
      (typeof address === 'string' ? address : address.address).toLowerCase() === content.recipient.toLowerCase());
    if (accepted) return 'accepted';
    return info.rejected?.length ? 'rejected' : 'uncertain';
  } catch (error) {
    const responseCode = error && typeof error === 'object' && 'responseCode' in error && typeof error.responseCode === 'number'
      ? error.responseCode : undefined;
    console.error('Staff email failed', { stage: 'provider', responseCode });
    // A negative SMTP response is definitive; a lost connection may follow acceptance.
    return responseCode && responseCode >= 400 && responseCode <= 599 ? 'rejected' : 'uncertain';
  }
}
