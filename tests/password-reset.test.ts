import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import * as crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { config } from 'dotenv';
import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as validation from '../validations/password-reset.validation';
import * as rbac from '../lib/rbac';
import * as authValidation from '../validations/auth.validation';
import * as clinicValidation from '../validations/clinic.validation';
import * as enums from '../app/generated/prisma/enums';
import { createElement } from 'react';
import { render } from '@react-email/render';
import { EmailTemplate } from '../components/templates/email-template';

config({ path: ['.env.local', '.env'], quiet: true });
function load<T>(file: string, modules: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  const exports = {};
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
  } }).outputText;
  runInNewContext(compiled, { exports, Buffer, Date, TextEncoder, process, console: { error() {} },
    require(name: string) { assert.ok(name in modules, `Unexpected dependency ${name}`); return modules[name]; }, ...extra });
  return exports as T;
}

test('reset validation reuses password policy and rejects mismatch, malformed inputs and bcrypt truncation', () => {
  assert.deepEqual(validation.forgotPasswordSchema.parse({ email: ' PERSON@EXAMPLE.INVALID ', scope: 'clinic' }), { email: 'person@example.invalid', scope: 'clinic' });
  for (const password of ['short', 'lowercase1!', 'Uppercase!', 'Uppercase1', 'A1!' + 'é'.repeat(36)]) {
    assert.equal(validation.resetPasswordSchema.safeParse({ password, confirmPassword: password }).success, false);
  }
  assert.equal(validation.resetPasswordSchema.safeParse({ password: 'Secure123!', confirmPassword: 'Different123!' }).success, false);
  assert.equal(validation.resetPasswordSchema.safeParse({ password: 'Secure123!', confirmPassword: 'Secure123!' }).success, true);
  for (const otp of ['12345', '1234567', 'abcdef', '<img/>']) assert.equal(validation.verifyResetOtpSchema.safeParse({ otp }).success, false);
  assert.equal(validation.verifyResetOtpSchema.safeParse({ otp: '000001' }).success, true);
});

test('public actions validate input, bind authorization to HttpOnly cookies and keep delivery after response', async () => {
  const jar = new Map<string, string>();
  const options: unknown[] = [], notifications: Array<() => Promise<void>> = [];
  let requests = 0, verifies = 0, finishes = 0, mailed = 0;
  const service = {
    RESET_COOKIE: 'challenge', RESET_GRANT_COOKIE: 'grant', RESET_GENERIC_MESSAGE: 'Generic response', RESET_INVALID_MESSAGE: 'Invalid code',
    async requestReset() { requests++; return { credential: 'a'.repeat(64), delivery: { email: 'test@example.invalid', otp: '000001' } }; },
    async verifyReset() { verifies++; return { grant: 'b'.repeat(64), scope: 'clinic' }; },
    async finishReset() { finishes++; return { email: 'test@example.invalid', scope: 'clinic' }; },
  };
  const actions = load<typeof import('../server/actions/password-reset.actions')>('server/actions/password-reset.actions.ts', {
    'next/headers': { cookies: async () => ({ get: (key: string) => jar.has(key) ? { value: jar.get(key) } : undefined, set: (key: string, value: string, opts: unknown) => { jar.set(key, value); options.push(opts); }, delete: (key: string) => jar.delete(key) }), headers: async () => new Headers() },
    'next/server': { after: (callback: () => Promise<void>) => notifications.push(callback) },
    '@/lib/password-reset': service, '@/lib/password-reset-email': { sendPasswordResetEmail: async () => { mailed++; } },
    '@/validations/password-reset.validation': validation,
  }, { Headers });
  assert.equal((await actions.forgotPasswordAction({ email: 'bad', scope: 'resident' })).success, false);
  assert.equal(requests, 0);
  assert.equal((await actions.verifyResetOtpAction({ otp: '000001', credential: 'forged' })).success, false);
  assert.equal(verifies, 0);
  assert.equal((await actions.resetPasswordAction({ password: 'Secure123!', confirmPassword: 'Secure123!', grant: 'forged' })).success, false);
  assert.equal(finishes, 0);
  assert.equal((await actions.forgotPasswordAction({ email: 'test@example.invalid', scope: 'clinic' })).message, 'Generic response');
  assert.equal(mailed, 0);
  assert.equal((await actions.verifyResetOtpAction({ otp: '000001' })).success, true);
  assert.equal(jar.has('challenge'), false);
  assert.equal((await actions.verifyResetOtpAction({ otp: '000001' })).success, false);
  const reset = await actions.resetPasswordAction({ password: 'Secure123!', confirmPassword: 'Secure123!' });
  assert.equal(reset.loginPath, '/ClinicLogin');
  assert.equal(jar.has('grant'), false);
  for (const option of options) assert.equal((option as { httpOnly: boolean }).httpOnly, true);
  for (const callback of notifications) await callback();
  assert.equal(mailed, 2);
});

test('all session readers reject revoked sessions and archived residents while preserving version-zero sessions', async () => {
  for (const name of ['resident', 'admin', 'health-worker']) {
    const resident = name === 'resident';
    let version = 0, archived = false;
    const secret = `development-only-${name}-session-secret`;
    const payload = Buffer.from(JSON.stringify({ [resident ? 'residentId' : 'adminId']: 'account', exp: Date.now() + 60000 })).toString('base64url');
    const token = `${payload}.${crypto.createHmac('sha256', secret).update(payload).digest('base64url')}`;
    const row = () => ({ id: 'account', email: 'test@example.invalid', firstName: 'Test', lastName: 'Resident', status: 'APPROVED', image: null, role: name === 'admin' ? 'ADMIN' : 'HEALTH_WORKER', sessionVersion: version, isArchived: archived });
    const mod = load<Record<string, () => Promise<unknown>>>(`lib/${name}-session.ts`, {
      'server-only': {}, crypto, 'next/headers': { cookies: async () => ({ get: () => ({ value: token }) }) },
      'next/navigation': { redirect() {} }, '@/lib/prisma': { resident: { findUnique: async () => row() }, admin: { findUnique: async () => row() } },
      '@/lib/rbac': rbac, '@/app/generated/prisma/enums': { AdminRole: { HEALTH_WORKER: 'HEALTH_WORKER' } },
    }, { process: { env: { NODE_ENV: 'test' } } });
    const get = mod[resident ? 'getCurrentResidentFromSession' : name === 'admin' ? 'getCurrentAdminFromSession' : 'getCurrentHealthWorkerFromSession'];
    assert.ok(await get());
    version = 1;
    assert.equal(await get(), null);
    version = 0; archived = true;
    if (resident) assert.equal(await get(), null);
  }
});

test('existing login actions accept the new bcrypt password, reject the old password and bind the checked session version', async () => {
  const hash = await bcrypt.hash('NewPassword123!', 10);
  let role = 'ADMIN'; let capturedVersion: number | undefined;
  const session = {
    clearResidentSession() {}, getCurrentResidentFromSession() {},
    async createResidentSession(id: string, version: number) { capturedVersion = version; },
    clearAdminSession() {}, getCurrentAdminFromSession() {},
    async createAdminSession(id: string, role: unknown, version: number) { capturedVersion = version; },
    clearHealthWorkerSession() {}, getCurrentHealthWorkerFromSession() {},
    async createHealthWorkerSession(id: string, version: number) { capturedVersion = version; },
  };
  const row = () => ({ id: 'synthetic', email: 'test@example.invalid', password: hash, role, sessionVersion: 1, firstName: 'Test', lastName: 'Resident', name: 'Test Staff', status: 'APPROVED', isArchived: false });
  const actions = load<typeof import('../server/actions/auth.actions')>('server/actions/auth.actions.ts', {
    '@/app/generated/prisma/enums': enums, bcryptjs: bcrypt, 'next/headers': { cookies: async () => ({}) },
    '@/lib/prisma': { resident: { findUnique: async () => row() }, admin: { findUnique: async () => row() } },
    '@/lib/resident-session': session, '@/lib/admin-session': session, '@/lib/health-worker-session': session,
    '@/lib/rbac': rbac, '@/validations/auth.validation': authValidation, '@/validations/clinic.validation': clinicValidation,
    '@/server/actions/resident.actions': { createResidentAccount() {}, verifyPassword: bcrypt.compare },
  });
  for (const portal of ['resident', 'admin', 'clinic']) {
    role = portal === 'clinic' ? 'HEALTH_WORKER' : 'CLERK';
    const login = portal === 'resident' ? actions.loginResidentAction : portal === 'admin' ? actions.loginAdminAction : actions.loginHealthWorkerAction;
    assert.equal((await login({ email: 'test@example.invalid', password: 'Original123!' })).success, false);
    assert.equal((await login({ email: 'test@example.invalid', password: 'NewPassword123!' })).success, true);
    assert.equal(capturedVersion, 1);
  }
});

test('OTP and success notifications reuse the email template and never log secrets on SMTP failure', async () => {
  const messages: Array<{ subject: string; html: string; text: string }> = [], logged: unknown[][] = [];
  let fail = false;
  const email = load<typeof import('../lib/password-reset-email')>('lib/password-reset-email.ts', {
    'server-only': {}, react: { createElement }, '@react-email/render': { render }, '@/components/templates/email-template': { EmailTemplate },
    '@/lib/nodemailer': { transporter: { async sendMail(message: { subject: string; html: string; text: string }) { if (fail) throw new Error('sensitive 123456'); messages.push(message); } } },
  }, { console: { error: (...args: unknown[]) => logged.push(args) } });
  assert.equal(await email.sendPasswordResetEmail('test@example.invalid', '123456'), true);
  assert.match(messages[0].html, /123456/); assert.match(messages[0].text, /10 minutes/);
  assert.equal(await email.sendPasswordResetEmail('test@example.invalid'), true);
  assert.equal(messages[1].html.includes('123456'), false);
  assert.match(messages[1].text, /existing sessions/);
  fail = true;
  assert.equal(await email.sendPasswordResetEmail('test@example.invalid', '123456'), false);
  assert.equal(JSON.stringify(logged).includes('123456'), false);
});

test('PostgreSQL reset lifecycle and concurrency in an isolated schema', { skip: process.env.RUN_PASSWORD_RESET_DB_TESTS !== '1', timeout: 600000 }, async t => {
  const schema = `password_reset_test_${randomUUID().replaceAll('-', '')}`;
  assert.match(schema, /^password_reset_test_[a-f0-9]{32}$/);
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.set('options', `-c search_path=${schema}`);
  const pool = new pg.Pool({ connectionString: url.toString(), max: 8, connectionTimeoutMillis: 10000, query_timeout: 20000 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
  let created = false;
  try {
    await pool.query(`CREATE SCHEMA "${schema}"`); created = true;
    await pool.query(`CREATE TYPE "AdminRole" AS ENUM ('ADMIN','CLERK','PEACE_AND_ORDER','PUNONG_BARANGAY','SK','HEALTH_WORKER');
      CREATE TYPE "VerificationStatus" AS ENUM ('PENDING','APPROVED','DECLINED');
      CREATE TABLE "Resident" ("id" TEXT PRIMARY KEY, "email" TEXT UNIQUE NOT NULL, "password" TEXT NOT NULL, "status" "VerificationStatus" DEFAULT 'APPROVED', "isArchived" BOOLEAN DEFAULT FALSE, "resetOtp" TEXT, "resetOtpExpireAt" TIMESTAMP);
      CREATE TABLE "Admin" ("id" TEXT PRIMARY KEY, "email" TEXT UNIQUE NOT NULL, "password" TEXT NOT NULL, "role" "AdminRole" DEFAULT 'ADMIN');`);
    const originalHash = await bcrypt.hash('Original123!', 10);
    await pool.query(`INSERT INTO "Resident" ("id", "email", "password") VALUES ('legacy','legacy@example.invalid',$1)`, [originalHash]);
    await pool.query(readFileSync('prisma/migrations/20261104000000_password_reset/migration.sql', 'utf8'));
    const modules = { 'server-only': {}, 'node:crypto': crypto, bcryptjs: bcrypt, '@/lib/prisma': prisma, '@/lib/rbac': rbac };
    const service = load<typeof import('../lib/password-reset')>('lib/password-reset.ts', modules);
    let sequence = 0;
    const fixture = async (scope: validation.ResetScope = 'resident', role = 'ADMIN') => {
      const id = `synthetic-${++sequence}`, email = `${id}@example.invalid`, client = randomUUID();
      if (scope === 'resident') await pool.query('INSERT INTO "Resident" ("id","email","password") VALUES ($1,$2,$3)', [id, email, originalHash]);
      else await pool.query('INSERT INTO "Admin" ("id","email","password","role") VALUES ($1,$2,$3,$4)', [id, email, originalHash, scope === 'clinic' ? 'HEALTH_WORKER' : role]);
      return { id, email, client, scope };
    };
    await t.test('migration preserves old password and initializes session versions', async () => {
      const row = await pool.query('SELECT "password", "sessionVersion" FROM "Resident" WHERE "id" = $1', ['legacy']);
      assert.equal(row.rows[0].password, originalHash); assert.equal(row.rows[0].sessionVersion, 0);
    });
    await t.test('resets Resident and every staff role, consumes authorization, rejects old password', async () => {
      for (const [scope, role] of [['resident', ''], ['admin','ADMIN'], ['admin','CLERK'], ['admin','PEACE_AND_ORDER'], ['admin','PUNONG_BARANGAY'], ['admin','SK'], ['clinic','HEALTH_WORKER']] as [validation.ResetScope, string][]) {
        const f = await fixture(scope, role);
        const requested = await service.requestReset(f.email, scope, f.client);
        assert.match(requested.delivery!.otp, /^\d{6}$/);
        const stored = await prisma.passwordResetChallenge.findUniqueOrThrow({ where: { credentialHash: service.resetDigest('credential', requested.credential) } });
        assert.notEqual(stored.otpHash, requested.delivery!.otp);
        assert.equal(JSON.stringify(stored).includes(f.email), false);
        const verified = await service.verifyReset(requested.credential, requested.delivery!.otp, f.client);
        assert.ok(verified);
        assert.equal(await service.verifyReset(requested.credential, requested.delivery!.otp, f.client), null);
        assert.ok(await service.finishReset(verified.grant, 'NewPassword123!', f.client));
        assert.equal(await service.finishReset(verified.grant, 'OtherPassword123!', f.client), null);
        const row = scope === 'resident' ? await prisma.resident.findUniqueOrThrow({ where: { id: f.id }, select: { password: true, sessionVersion: true } }) : await prisma.admin.findUniqueOrThrow({ where: { id: f.id }, select: { password: true, sessionVersion: true } });
        assert.equal(await bcrypt.compare('NewPassword123!', row.password), true);
        assert.equal(await bcrypt.compare('Original123!', row.password), false);
        assert.equal(row.sessionVersion, 1);
      }
    });
    await t.test('five invalid attempts lock out even the correct code', async () => {
      const f = await fixture(); const r = await service.requestReset(f.email, f.scope, f.client);
      const wrong = r.delivery!.otp === '000000' ? '999999' : '000000';
      const results = await Promise.all(Array.from({ length: 8 }, () => service.verifyReset(r.credential, wrong, f.client)));
      assert.ok(results.every(result => result === null));
      assert.equal(await service.verifyReset(r.credential, r.delivery!.otp, f.client), null);
      const row = await prisma.passwordResetChallenge.findUniqueOrThrow({ where: { credentialHash: service.resetDigest('credential', r.credential) } });
      assert.equal(row.attempts, 5); assert.equal(row.otpHash, null);
    });
    await t.test('OTP and reset grant expire at their exact boundaries', async () => {
      const f = await fixture(), now = new Date(); const r = await service.requestReset(f.email, f.scope, f.client, now);
      assert.equal(await service.verifyReset(r.credential, r.delivery!.otp, f.client, new Date(+now + 600000)), null);
      const r2 = await service.requestReset(f.email, f.scope, f.client, new Date(+now + 600001));
      const v = await service.verifyReset(r2.credential, r2.delivery!.otp, f.client, new Date(+now + 600002)); assert.ok(v);
      assert.equal(await service.finishReset(v.grant, 'NewPassword123!', f.client, new Date(+now + 900002)), null);
    });
    await t.test('60-second cooldown, newest-code-only, and persistent hourly subject cap', async () => {
      const f = await fixture(), now = new Date(); const r = await service.requestReset(f.email, f.scope, f.client, now);
      assert.equal((await service.requestReset(f.email, f.scope, f.client, new Date(+now + 59999))).delivery, null);
      const newer = await service.requestReset(f.email, f.scope, f.client, new Date(+now + 60000)); assert.ok(newer.delivery);
      assert.equal(await service.verifyReset(r.credential, r.delivery!.otp, f.client, new Date(+now + 60001)), null);
      assert.ok(await service.verifyReset(newer.credential, newer.delivery!.otp, f.client, new Date(+now + 60001)));
      for (let i = 2; i < 5; i++) assert.ok((await service.requestReset(f.email, f.scope, f.client, new Date(+now + i * 60000))).delivery);
      assert.equal((await service.requestReset(f.email, f.scope, f.client, new Date(+now + 300000))).delivery, null);
    });
    await t.test('resend revokes verified authorization', async () => {
      const f = await fixture(), now = new Date(); const r = await service.requestReset(f.email, f.scope, f.client, now);
      const v = await service.verifyReset(r.credential, r.delivery!.otp, f.client, now); assert.ok(v);
      await service.requestReset(f.email, f.scope, f.client, new Date(+now + 60000));
      assert.equal(await service.finishReset(v.grant, 'NewPassword123!', f.client, new Date(+now + 60001)), null);
    });
    await t.test('unknown, archived, pending, declined and wrong-portal accounts receive no usable challenge', async () => {
      const f = await fixture();
      for (const state of ['PENDING', 'DECLINED', 'archived']) {
        await pool.query('UPDATE "Resident" SET "status" = $1, "isArchived" = $2 WHERE "id" = $3', [state === 'archived' ? 'APPROVED' : state, state === 'archived', f.id]);
        assert.equal((await service.requestReset(f.email, f.scope, randomUUID(), new Date(Date.now() + (++sequence) * 60000))).delivery, null);
      }
      assert.equal((await service.requestReset('absent@example.invalid', 'resident', randomUUID())).delivery, null);
      const admin = await fixture('admin');
      assert.equal((await service.requestReset(admin.email, 'clinic', randomUUID())).delivery, null);
      const clinic = await fixture('clinic');
      assert.equal((await service.requestReset(clinic.email, 'admin', randomUUID())).delivery, null);
    });
    await t.test('eligibility is rechecked after verification and before reset', async () => {
      const f = await fixture(); const r = await service.requestReset(f.email, f.scope, f.client);
      const v = await service.verifyReset(r.credential, r.delivery!.otp, f.client); assert.ok(v);
      await pool.query('UPDATE "Resident" SET "isArchived" = TRUE WHERE "id" = $1', [f.id]);
      assert.equal(await service.finishReset(v.grant, 'NewPassword123!', f.client), null);
    });
    await t.test('simultaneous correct verifications and reset submissions each succeed once', async () => {
      const f = await fixture(); const r = await service.requestReset(f.email, f.scope, f.client);
      const verified = await Promise.all(Array.from({ length: 6 }, () => service.verifyReset(r.credential, r.delivery!.otp, f.client)));
      assert.equal(verified.filter(Boolean).length, 1);
      const grant = verified.find(Boolean)!.grant;
      const resets = await Promise.all(Array.from({ length: 6 }, () => service.finishReset(grant, 'NewPassword123!', f.client)));
      assert.equal(resets.filter(Boolean).length, 1);
    });
    await t.test('client send and verify rate limits persist across requests', async () => {
      const f = await fixture(), now = new Date();
      await prisma.passwordResetRateLimit.create({ data: { key: service.resetDigest('send-client', f.client), count: 19, expiresAt: new Date(+now + 3600000) } });
      assert.ok((await service.requestReset(f.email, f.scope, f.client, now)).delivery);
      assert.equal((await service.requestReset(f.email, f.scope, f.client, now)).delivery, null);
      const other = await fixture(); const r = await service.requestReset(other.email, other.scope, other.client);
      await prisma.passwordResetRateLimit.create({ data: { key: service.resetDigest('verify-client', other.client), count: 49, expiresAt: new Date(+now + 900000) } });
      assert.equal(await service.verifyReset('forged', '000001', other.client), null);
      assert.equal(await service.verifyReset(r.credential, r.delivery!.otp, other.client), null);
      assert.equal(await service.verifyReset(r.credential, r.delivery!.otp, other.client, new Date(+now + 900001)), null); // OTP has expired too.
    });
  } finally {
    await prisma.$disconnect();
    if (created) await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
    await pool.end();
  }
});
