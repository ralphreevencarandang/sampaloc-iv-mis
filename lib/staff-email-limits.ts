import 'server-only';
import { createHmac } from 'node:crypto';
import prisma from '@/lib/prisma';
import type { StaffEmailContent } from '@/validations/staff-email.validation';

const PREFIX = 'staff-email:';
export const STAFF_EMAIL_HOURLY_LIMIT = 20;
export const STAFF_EMAIL_COOLDOWN_SECONDS = 60;
const GLOBAL_HOURLY_LIMIT = 100;
// These are email-attempt states, isolated from password-reset counter keys.
const PENDING = 1, ACCEPTED = 2, REJECTED = 3, UNCERTAIN = 4;

function digest(parts: string[]) {
  const secret = process.env.AUTH_SESSION_SECRET ?? process.env.SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') throw new Error('Session secret required');
  return createHmac('sha256', secret || 'development-only-staff-email-secret')
    .update('staff-email-v1\0' + JSON.stringify(parts)).digest('hex');
}

export type EmailReservation = { attemptKey: string; fingerprintKey: string };
export type EmailPermit =
  | { kind: 'reserved'; reservation: EmailReservation }
  | { kind: 'accepted' }
  | { kind: 'blocked'; message: string; retryAfterSeconds?: number; canRetry?: boolean };

export async function reserveStaffEmail(adminId: string, submissionId: string, content: StaffEmailContent, now = new Date()): Promise<EmailPermit> {
  const actor = digest(['actor', adminId]);
  const attemptKey = PREFIX + 'attempt:' + digest([adminId, submissionId]);
  const payloadKey = PREFIX + 'payload:' + digest([adminId, submissionId, content.recipient, content.subject, content.message]);
  const fingerprintKey = PREFIX + 'fingerprint:' + digest([adminId, content.recipient, content.subject, content.message]);
  const hourKey = PREFIX + 'hour:' + actor;
  const cooldownKey = PREFIX + 'cooldown:' + actor;
  const globalKey = PREFIX + 'global-hour';
  const keys = [attemptKey, payloadKey, fingerprintKey, hourKey, cooldownKey, globalKey];

  return prisma.$transaction(async tx => {
    // SMTP runs outside this short transaction. The lock coordinates every instance.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(74120937)::text`;
    const rows = await tx.passwordResetRateLimit.findMany({ where: { key: { in: keys }, expiresAt: { gt: now } } });
    const active = new Map(rows.map(row => [row.key, row]));
    const attempt = active.get(attemptKey);
    if (attempt && !active.has(payloadKey)) {
      return { kind: 'blocked', message: 'This email submission has changed. Please reload the page before sending.' };
    }
    const previous = attempt ?? active.get(fingerprintKey);
    if (previous) {
      if (previous.count === ACCEPTED) return { kind: 'accepted' };
      if (previous.count === PENDING) return { kind: 'blocked', message: 'This email is already being processed. Please wait before checking again.', retryAfterSeconds: 5 };
      if (previous.count === UNCERTAIN) return { kind: 'blocked', message: 'The previous send could not be confirmed. Check with the recipient before sending another email.' };
      // A definite rejection may be retried with a fresh submission ID, after cooldown.
      if (attempt) return { kind: 'blocked', message: 'The previous email was not accepted. You may try again after the sending cooldown.', canRetry: true };
    }
    const cooldown = active.get(cooldownKey);
    if (cooldown) return {
      kind: 'blocked', message: 'Please wait before sending another email.',
      retryAfterSeconds: Math.max(1, Math.ceil((cooldown.expiresAt.getTime() - now.getTime()) / 1000)),
    };
    for (const [key, limit] of [[hourKey, STAFF_EMAIL_HOURLY_LIMIT], [globalKey, GLOBAL_HOURLY_LIMIT]] as const) {
      const counter = active.get(key);
      if (counter && counter.count >= limit) return {
        kind: 'blocked', message: key === hourKey ? 'Your hourly email limit has been reached. Please try again later.' : 'The system email limit has been reached. Please try again later.',
        retryAfterSeconds: Math.max(1, Math.ceil((counter.expiresAt.getTime() - now.getTime()) / 1000)),
      };
    }

    const expired = await tx.passwordResetRateLimit.findMany({ where: { key: { startsWith: PREFIX }, expiresAt: { lte: now } }, select: { key: true }, take: 100 });
    if (expired.length) await tx.passwordResetRateLimit.deleteMany({ where: { key: { in: expired.map(row => row.key) } } });
    const put = (key: string, count: number, seconds: number) => tx.passwordResetRateLimit.upsert({
      where: { key }, create: { key, count, expiresAt: new Date(now.getTime() + seconds * 1000) },
      update: { count, expiresAt: new Date(now.getTime() + seconds * 1000) },
    });
    await put(attemptKey, PENDING, 86400);
    await put(payloadKey, PENDING, 86400);
    await put(fingerprintKey, PENDING, 600);
    await put(cooldownKey, 1, STAFF_EMAIL_COOLDOWN_SECONDS);
    for (const key of [hourKey, globalKey]) {
      const counter = active.get(key);
      if (counter) await tx.passwordResetRateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
      else await put(key, 1, 3600);
    }
    return { kind: 'reserved', reservation: { attemptKey, fingerprintKey } };
  }, { maxWait: 15000, timeout: 15000 });
}

export async function finishStaffEmail(reservation: EmailReservation, outcome: 'accepted' | 'rejected' | 'uncertain') {
  const count = outcome === 'accepted' ? ACCEPTED : outcome === 'rejected' ? REJECTED : UNCERTAIN;
  await prisma.passwordResetRateLimit.updateMany({
    where: { key: { in: [reservation.attemptKey, reservation.fingerprintKey] }, count: PENDING }, data: { count },
  });
}
