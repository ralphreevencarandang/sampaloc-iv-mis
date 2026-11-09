import assert from 'node:assert/strict';
import { randomUUID, createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
import pg from 'pg';
import dotenv from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../app/generated/prisma/client';

dotenv.config({ path: ['.env.local', '.env'], quiet: true });

test('persistent email reservations enforce concurrency, quotas, replay safety and rollback without touching reset counters', {
  skip: process.env.RUN_STAFF_EMAIL_DB_TESTS !== '1', timeout: 240000,
}, async () => {
  const schema = 'staff_email_test_' + randomUUID().replaceAll('-', '');
  assert.match(schema, /^staff_email_test_[a-f0-9]{32}$/);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10, connectionTimeoutMillis: 10000, idleTimeoutMillis: 1000 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
  let created = false;
  const now = new Date('2026-11-09T00:00:00Z');
  const later = (seconds: number) => new Date(now.getTime() + seconds * 1000);
  const content = { recipient: 'synthetic@example.invalid', subject: 'Synthetic subject', message: 'Synthetic message body' };
  try {
    await pool.query('CREATE SCHEMA "' + schema + '"'); created = true;
    await pool.query('CREATE TABLE "' + schema + '"."PasswordResetRateLimit" ("key" TEXT PRIMARY KEY, "count" INTEGER NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL)');
    await prisma.passwordResetRateLimit.create({ data: { key: 'reset-do-not-touch', count: 1, expiresAt: later(-100) } });
    // Keep test advisory locks separate from live email sends. All business SQL is unchanged.
    const source = readFileSync('lib/staff-email-limits.ts', 'utf8').replace('pg_advisory_xact_lock(74120937)', "pg_advisory_xact_lock(hashtextextended('" + schema + "', 0))");
    const modules: Record<string, unknown> = { 'server-only': {}, 'node:crypto': { createHmac }, '@/lib/prisma': prisma };
    const exports = {};
    runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText,
      { exports, Date, process: { env: { AUTH_SESSION_SECRET: 'synthetic-email-test-secret' } }, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
    const service = exports as typeof import('../lib/staff-email-limits');
    const id = randomUUID();
    const first = await service.reserveStaffEmail('actor-a', id, content, now); assert.equal(first.kind, 'reserved');
    assert.equal((await service.reserveStaffEmail('actor-a', id, content, now)).kind, 'blocked');
    assert.equal((await service.reserveStaffEmail('actor-a', randomUUID(), content, now)).kind, 'blocked');
    const altered = await service.reserveStaffEmail('actor-a', id, { ...content, subject: 'Changed' }, now);
    assert.equal(altered.kind, 'blocked'); if (altered.kind === 'blocked') assert.match(altered.message, /changed/);
    assert.equal((await service.reserveStaffEmail('actor-a', randomUUID(), { ...content, subject: 'Second' }, now)).kind, 'blocked');
    if (first.kind !== 'reserved') throw Error('Missing fixture reservation');
    await service.finishStaffEmail(first.reservation, 'accepted');
    assert.equal((await service.reserveStaffEmail('actor-a', id, content, now)).kind, 'accepted');
    assert.equal((await service.reserveStaffEmail('actor-a', randomUUID(), content, now)).kind, 'accepted');
    const second = await service.reserveStaffEmail('actor-a', randomUUID(), { ...content, subject: 'Second' }, later(61)); assert.equal(second.kind, 'reserved');
    if (second.kind !== 'reserved') throw Error('Missing fixture reservation');
    await service.finishStaffEmail(second.reservation, 'uncertain');
    assert.equal((await service.reserveStaffEmail('actor-a', randomUUID(), { ...content, subject: 'Second' }, later(122))).kind, 'blocked');
    const bId = randomUUID(); const b = await service.reserveStaffEmail('actor-b', bId, content, now); assert.equal(b.kind, 'reserved');
    if (b.kind !== 'reserved') throw Error('Missing fixture reservation');
    await service.finishStaffEmail(b.reservation, 'rejected');
    const retry = await service.reserveStaffEmail('actor-b', bId, content, later(61)); assert.equal(retry.kind, 'blocked');
    if (retry.kind === 'blocked') assert.equal(retry.canRetry, true);
    assert.equal((await service.reserveStaffEmail('actor-b', randomUUID(), content, later(61))).kind, 'reserved');
    const stored = await prisma.passwordResetRateLimit.findMany();
    assert.equal(JSON.stringify(stored).includes(content.recipient), false); assert.equal(JSON.stringify(stored).includes(content.message), false);
    assert.ok(await prisma.passwordResetRateLimit.findUnique({ where: { key: 'reset-do-not-touch' } }));

    const clear = () => prisma.passwordResetRateLimit.deleteMany({ where: { key: { startsWith: 'staff-email:' } } });
    await clear();
    const attempts = await Promise.all(Array.from({ length: 8 }, () => service.reserveStaffEmail('concurrent', randomUUID(), content, now)));
    assert.equal(attempts.filter(r => r.kind === 'reserved').length, 1);
    const hour = await prisma.passwordResetRateLimit.findFirstOrThrow({ where: { key: { startsWith: 'staff-email:hour:' } } });
    await prisma.passwordResetRateLimit.update({ where: { key: hour.key }, data: { count: 19 } });
    const quota = await Promise.all(Array.from({ length: 8 }, (_, index) => service.reserveStaffEmail('concurrent', randomUUID(), { ...content, subject: 'Next ' + index }, later(61))));
    assert.equal(quota.filter(r => r.kind === 'reserved').length, 1);
    assert.equal((await prisma.passwordResetRateLimit.findUniqueOrThrow({ where: { key: hour.key } })).count, 20);
    const limited = await service.reserveStaffEmail('concurrent', randomUUID(), { ...content, subject: 'Hourly limit' }, later(122));
    assert.equal(limited.kind, 'blocked'); if (limited.kind === 'blocked') assert.match(limited.message, /hourly/);

    await clear();
    await prisma.passwordResetRateLimit.create({ data: { key: 'staff-email:global-hour', count: 99, expiresAt: later(3600) } });
    const global = await Promise.all(Array.from({ length: 8 }, (_, index) => service.reserveStaffEmail('global-' + index, randomUUID(), content, now)));
    assert.equal(global.filter(r => r.kind === 'reserved').length, 1);
    assert.equal((await prisma.passwordResetRateLimit.findUniqueOrThrow({ where: { key: 'staff-email:global-hour' } })).count, 100);
    assert.equal((await service.reserveStaffEmail('after-window', randomUUID(), content, later(3601))).kind, 'reserved');
    assert.ok(await prisma.passwordResetRateLimit.findUnique({ where: { key: 'reset-do-not-touch' } }));

    await clear();
    await pool.query(`CREATE FUNCTION "${schema}"."reject_cooldown"() RETURNS trigger LANGUAGE plpgsql AS $fixture$
      BEGIN IF NEW."key" LIKE 'staff-email:cooldown:%' THEN RAISE EXCEPTION 'fixture cooldown failure'; END IF; RETURN NEW; END
      $fixture$`);
    await pool.query(`CREATE TRIGGER "reject_cooldown" BEFORE INSERT ON "${schema}"."PasswordResetRateLimit"
      FOR EACH ROW EXECUTE FUNCTION "${schema}"."reject_cooldown"()`);
    await assert.rejects(service.reserveStaffEmail('rollback', randomUUID(), content, now));
    assert.equal(await prisma.passwordResetRateLimit.count({ where: { key: { startsWith: 'staff-email:' } } }), 0);
    await pool.query(`DROP TRIGGER "reject_cooldown" ON "${schema}"."PasswordResetRateLimit"`);
    assert.equal((await service.reserveStaffEmail('rollback', randomUUID(), content, now)).kind, 'reserved');
  } finally {
    await prisma.$disconnect();
    if (created) { assert.match(schema, /^staff_email_test_[a-f0-9]{32}$/); await pool.query('DROP SCHEMA "' + schema + '" CASCADE'); }
    await pool.end();
  }
});
