'use server';

import { cookies, headers } from 'next/headers';
import { after } from 'next/server';
import {
  requestReset, verifyReset, finishReset, RESET_COOKIE, RESET_GRANT_COOKIE,
  RESET_GENERIC_MESSAGE, RESET_INVALID_MESSAGE,
} from '@/lib/password-reset';
import { sendPasswordResetEmail } from '@/lib/password-reset-email';
import { forgotPasswordSchema, verifyResetOtpSchema, resetPasswordSchema, resetLoginPaths } from '@/validations/password-reset.validation';

const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/' };
async function clientKey() {
  const h = await headers();
  // Vercel overwrites this header. Never trust arbitrary X-Forwarded-For values.
  // Other hosts use a conservative shared bucket until a trusted proxy is configured.
  return process.env.VERCEL === '1' ? (h.get('x-vercel-forwarded-for')?.split(',')[0].trim() || 'shared') : 'shared';
}

export async function forgotPasswordAction(input: unknown) {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: 'Enter a valid email address and account portal.' };
  try {
    const result = await requestReset(parsed.data.email, parsed.data.scope, await clientKey());
    const jar = await cookies();
    jar.set(RESET_COOKIE, result.credential, { ...cookieOptions, maxAge: 600 });
    jar.delete(RESET_GRANT_COOKIE);
    // Both eligible and nonexistent requests return before any SMTP work.
    after(async () => { if (result.delivery) await sendPasswordResetEmail(result.delivery.email, result.delivery.otp); });
    return { success: true, message: RESET_GENERIC_MESSAGE };
  } catch {
    console.error('Password reset request failed');
    return { success: false, message: 'Unable to request a code right now. Please try again later.' };
  }
}

export async function verifyResetOtpAction(input: unknown) {
  const parsed = verifyResetOtpSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: 'Enter the six-digit code.' };
  try {
    const jar = await cookies();
    const credential = jar.get(RESET_COOKIE)?.value;
    if (!credential || !/^[a-f0-9]{64}$/.test(credential)) return { success: false, message: RESET_INVALID_MESSAGE };
    const result = await verifyReset(credential, parsed.data.otp, await clientKey());
    if (!result) return { success: false, message: RESET_INVALID_MESSAGE };
    jar.set(RESET_GRANT_COOKIE, result.grant, { ...cookieOptions, maxAge: 300 });
    jar.delete(RESET_COOKIE);
    return { success: true, message: 'Code verified. Choose your new password.' };
  } catch {
    console.error('Password reset verification failed');
    return { success: false, message: 'Unable to verify the code right now. Please try again later.' };
  }
}

export async function resetPasswordAction(input: unknown) {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };
  try {
    const jar = await cookies();
    const grant = jar.get(RESET_GRANT_COOKIE)?.value;
    if (!grant || !/^[a-f0-9]{64}$/.test(grant)) return { success: false, message: 'Reset authorization is invalid or expired. Request a new code.' };
    const result = await finishReset(grant, parsed.data.password, await clientKey());
    if (!result) return { success: false, message: 'Reset authorization is invalid or expired. Request a new code.' };
    jar.delete(RESET_COOKIE);
    jar.delete(RESET_GRANT_COOKIE);
    for (const name of ['resident_session', 'admin_session', 'health_worker_session']) jar.delete(name);
    after(async () => { await sendPasswordResetEmail(result.email); });
    return { success: true, message: 'Password changed successfully. Sign in with your new password.', loginPath: resetLoginPaths[result.scope] };
  } catch {
    console.error('Password reset completion failed');
    return { success: false, message: 'Unable to reset your password right now. Please try again later.' };
  }
}
