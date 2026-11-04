import 'server-only';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import type { Prisma } from '@/app/generated/prisma/client';
import { isBarangayAdminRole } from '@/lib/rbac';
import type { ResetScope } from '@/validations/password-reset.validation';

type Tx = Prisma.TransactionClient;
export const RESET_GENERIC_MESSAGE = 'If an eligible account matches that email, a verification code will be sent. Check your inbox and spam folder.';
export const RESET_INVALID_MESSAGE = 'The code is invalid or expired. Request a new code if needed.';
export const RESET_COOKIE = 'password_reset_challenge';
export const RESET_GRANT_COOKIE = 'password_reset_authorization';
export const newResetToken = () => randomBytes(32).toString('hex');

function secret() {
  const value = process.env.AUTH_SESSION_SECRET ?? process.env.SESSION_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV !== 'production') return 'development-only-password-reset-secret';
  throw new Error('Session secret required');
}
export function resetDigest(purpose: string, value: string) {
  return createHmac('sha256', secret()).update(`${purpose}:${value}`).digest('hex');
}
function equalHash(a: string, b: string) {
  const left = Buffer.from(a, 'hex'), right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}
async function lock(tx: Tx, key: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`;
}
async function rate(tx: Tx, key: string, limit: number, seconds: number, now: Date) {
  // Atomic upsert serializes counters across all application instances.
  const rows = await tx.$queryRaw<{ count: number }[]>`
    INSERT INTO "PasswordResetRateLimit" ("key", "count", "expiresAt")
    VALUES (${key}, 1, ${new Date(now.getTime() + seconds * 1000)})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "PasswordResetRateLimit"."expiresAt" <= ${now} THEN 1 ELSE LEAST("PasswordResetRateLimit"."count" + 1, ${limit + 1}) END,
      "expiresAt" = CASE WHEN "PasswordResetRateLimit"."expiresAt" <= ${now} THEN EXCLUDED."expiresAt" ELSE "PasswordResetRateLimit"."expiresAt" END
    RETURNING "count"`;
  return rows[0].count <= limit;
}
async function account(tx: Tx, scope: string, emailOrId: { email: string } | { id: string }) {
  if (scope === 'resident') {
    const row = await tx.resident.findUnique({ where: emailOrId, select: { id: true, email: true, status: true, isArchived: true, sessionVersion: true } });
    return row?.status === 'APPROVED' && !row.isArchived ? row : null;
  }
  const row = await tx.admin.findUnique({ where: emailOrId, select: { id: true, email: true, role: true, sessionVersion: true } });
  return row && (scope === 'clinic' ? row.role === 'HEALTH_WORKER' : isBarangayAdminRole(row.role)) ? row : null;
}
const transactionOptions = { maxWait: 15000, timeout: 15000 };

export async function requestReset(email: string, scope: ResetScope, clientKey: string, now = new Date()) {
  const credential = newResetToken();
  const otp = randomInt(0, 1000000).toString().padStart(6, '0');
  const subject = resetDigest('subject', `${scope}:${email}`);
  const delivery = await prisma.$transaction(async tx => {
    // All public operations take rate counters before subject locks in the same order.
    const allowed = await rate(tx, resetDigest('send-client', clientKey), 20, 3600, now);
    if (!allowed) return null;
    await lock(tx, subject);
    const previous = await tx.passwordResetChallenge.findUnique({ where: { subject } });
    if (previous && now.getTime() - previous.sentAt.getTime() < 60000) return null;
    if (!await rate(tx, resetDigest('send-subject', subject), 5, 3600, now)) return null;
    const row = await account(tx, scope, { email });
    const data = {
      scope, accountId: row?.id ?? null, credentialHash: resetDigest('credential', credential),
      otpHash: resetDigest('otp', `${credential}:${otp}`), expiresAt: new Date(now.getTime() + 600000),
      attempts: 0, sentAt: now, resetHash: null, resetExpiresAt: null, sessionVersion: row?.sessionVersion ?? null,
    };
    await tx.passwordResetChallenge.upsert({ where: { subject }, create: { subject, ...data }, update: data });
    // Bounded opportunistic cleanup; active subject cooldown/hour counters are retained.
    await tx.$executeRaw`DELETE FROM "PasswordResetRateLimit" WHERE "key" IN (SELECT "key" FROM "PasswordResetRateLimit" WHERE "expiresAt" < ${now} LIMIT 100)`;
    await tx.$executeRaw`DELETE FROM "PasswordResetChallenge" WHERE "subject" IN (SELECT "subject" FROM "PasswordResetChallenge" WHERE "expiresAt" < ${new Date(now.getTime() - 3600000)} LIMIT 100)`;
    return row ? { email: row.email, otp } : null;
  }, transactionOptions);
  // Always return a fresh opaque credential, including throttled and nonexistent accounts.
  return { credential, delivery };
}

export async function verifyReset(credential: string, otp: string, clientKey: string, now = new Date()) {
  const grant = newResetToken();
  return prisma.$transaction(async tx => {
    if (!await rate(tx, resetDigest('verify-client', clientKey), 50, 900, now)) return null;
    const candidate = await tx.passwordResetChallenge.findUnique({ where: { credentialHash: resetDigest('credential', credential) } });
    if (!candidate) return null;
    await lock(tx, candidate.subject);
    const row = await tx.passwordResetChallenge.findUnique({ where: { subject: candidate.subject } });
    if (!row || row.credentialHash !== candidate.credentialHash || !row.otpHash || row.attempts >= 5 || row.expiresAt <= now) return null;
    const valid = equalHash(row.otpHash, resetDigest('otp', `${credential}:${otp}`));
    await tx.passwordResetChallenge.update({ where: { subject: row.subject }, data: {
      attempts: row.attempts + 1,
      otpHash: valid || row.attempts === 4 ? null : row.otpHash,
    } });
    if (!valid || !row.accountId) return null;
    const eligible = await account(tx, row.scope, { id: row.accountId });
    if (!eligible || eligible.sessionVersion !== row.sessionVersion || resetDigest('subject', `${row.scope}:${eligible.email}`) !== row.subject) return null;
    await tx.passwordResetChallenge.update({ where: { subject: row.subject }, data: {
      resetHash: resetDigest('grant', grant), resetExpiresAt: new Date(now.getTime() + 300000),
    } });
    return { grant, scope: row.scope as ResetScope };
  }, transactionOptions);
}

export async function finishReset(grant: string, password: string, clientKey: string, now = new Date()) {
  // Rate-limit before doing expensive password hashing.
  const allowed = await prisma.$transaction(tx => rate(tx, resetDigest('finish-client', clientKey), 20, 900, now), transactionOptions);
  if (!allowed) return null;
  const hash = await bcrypt.hash(password, 10);
  return prisma.$transaction(async tx => {
    const candidate = await tx.passwordResetChallenge.findUnique({ where: { resetHash: resetDigest('grant', grant) } });
    if (!candidate) return null;
    await lock(tx, candidate.subject);
    const row = await tx.passwordResetChallenge.findUnique({ where: { subject: candidate.subject } });
    if (!row || row.resetHash !== candidate.resetHash || !row.resetExpiresAt || row.resetExpiresAt <= now || !row.accountId) return null;
    const eligible = await account(tx, row.scope, { id: row.accountId });
    if (!eligible || eligible.sessionVersion !== row.sessionVersion || resetDigest('subject', `${row.scope}:${eligible.email}`) !== row.subject) return null;
    // Compare-and-swap also protects simultaneous grants from distinct staff portals.
    const where = { id: eligible.id, sessionVersion: eligible.sessionVersion, email: eligible.email };
    const data = { password: hash, sessionVersion: { increment: 1 } };
    const changed = row.scope === 'resident'
      ? await tx.resident.updateMany({ where: { ...where, status: 'APPROVED', isArchived: false }, data: { ...data, resetOtp: null, resetOtpExpireAt: null } })
      : await tx.admin.updateMany({ where: { ...where, role: row.scope === 'clinic' ? 'HEALTH_WORKER' : { not: 'HEALTH_WORKER' } }, data });
    if (changed.count !== 1) return null;
    await tx.passwordResetChallenge.update({ where: { subject: row.subject }, data: { otpHash: null, resetHash: null, resetExpiresAt: null } });
    return { email: eligible.email, scope: row.scope as ResetScope };
  }, transactionOptions);
}
