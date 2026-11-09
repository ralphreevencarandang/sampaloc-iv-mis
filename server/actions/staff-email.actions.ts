'use server';

import { getCurrentAdminFromSession } from '@/lib/admin-session';
import { canAccessResource } from '@/lib/rbac';
import { staffEmailSendSchema } from '@/validations/staff-email.validation';
import { reserveStaffEmail, finishStaffEmail } from '@/lib/staff-email-limits';
import { deliverStaffEmail } from '@/lib/staff-email-delivery';

export type StaffEmailResult = {
  success: boolean; message: string; fieldErrors?: Record<string, string>;
  retryAfterSeconds?: number; canRetry?: boolean;
};

export async function sendStaffEmailAction(input: unknown): Promise<StaffEmailResult> {
  try {
    const admin = await getCurrentAdminFromSession();
    if (!admin || !canAccessResource(admin.role, 'email', 'write')) return { success: false, message: 'You do not have permission to send emails.' };
    const parsed = staffEmailSendSchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors = Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).flatMap(([key, messages]) => messages?.[0] ? [[key, messages[0]]] : []));
      return { success: false, message: 'Please correct the highlighted fields.', fieldErrors };
    }
    const { submissionId, ...content } = parsed.data;
    const permit = await reserveStaffEmail(admin.id, submissionId, content);
    if (permit.kind === 'accepted') return { success: true, message: 'This email has already been accepted for sending.', retryAfterSeconds: 60 };
    if (permit.kind === 'blocked') return { success: false, message: permit.message, retryAfterSeconds: permit.retryAfterSeconds, canRetry: permit.canRetry };
    const outcome = await deliverStaffEmail(content);
    try { await finishStaffEmail(permit.reservation, outcome === 'unavailable' ? 'rejected' : outcome); }
    catch { console.error('Staff email status update failed'); }
    if (outcome === 'accepted') return { success: true, message: 'Email accepted for sending.', retryAfterSeconds: 60 };
    return {
      success: false,
      message: outcome === 'unavailable' ? 'The email service is not configured. Please contact an administrator.' : outcome === 'rejected' ? 'The email was not accepted by the email service. Check the recipient address and try again after the cooldown.' : 'Sending could not be confirmed. Check with the recipient before sending another email.',
      retryAfterSeconds: 60, canRetry: outcome === 'rejected' || outcome === 'unavailable',
    };
  } catch {
    console.error('Staff email request failed');
    return { success: false, message: 'The email service is temporarily unavailable. Please try again later.' };
  }
}
