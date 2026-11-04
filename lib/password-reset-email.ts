import 'server-only';
import { createElement } from 'react';
import { render } from '@react-email/render';
import { EmailTemplate } from '@/components/templates/email-template';
import { transporter } from '@/lib/nodemailer';

export async function sendPasswordResetEmail(email: string, otp?: string) {
  try {
    const heading = otp ? 'Password Reset OTP' : 'Password Reset Success';
    const paragraphs = otp
      ? [`Your verification code is: ${otp}`, 'This code expires in 10 minutes. Only the newest code can be used. Never share it with anyone.']
      : ['Your password was changed successfully. Your existing sessions have been signed out.'];
    const footer = otp
      ? 'If you did not request this code, you can ignore this email. Your password has not changed.'
      : 'If you did not change your password, contact the barangay immediately and reset your password.';
    const html = await render(createElement(EmailTemplate, {
      firstName: 'there', heading, intro: 'Sampaloc IV MIS account security notification.',
      paragraphs, footer, ctaLabel: '', ctaUrl: '',
    }));
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Sampaloc IV MIS" <no-reply@sampalocivmis.com>',
      to: email, subject: heading, html,
      text: [heading, ...paragraphs, footer].join('\n\n'),
      disableFileAccess: true, disableUrlAccess: true,
    });
    return true;
  } catch {
    // Never log SMTP exceptions: they can contain message bodies and reset codes.
    console.error('Password reset notification delivery failed');
    return false;
  }
}
