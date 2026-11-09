import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../app/generated/prisma/client';
import { AdminRole } from '../app/generated/prisma/enums';
import * as validation from '../validations/resident.validation';
import * as images from '../lib/valid-id-image';

dotenv.config({ path: ['.env.local', '.env'], quiet: true });

test('Admin/Secretary create residents using the actual Prisma database path in an isolated schema', {
  skip: process.env.RUN_RESIDENT_CREATE_DB_TESTS !== '1', timeout: 180000,
}, async () => {
  const schema = 'resident_create_test_' + randomUUID().replaceAll('-', '');
  assert.match(schema, /^resident_create_test_[a-f0-9]{32}$/);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2, connectionTimeoutMillis: 10000, statement_timeout: 20000 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
  let created = false, uploads = 0;
  let role: AdminRole = AdminRole.ADMIN;
  try {
    const source = (await pool.query('SELECT current_schema() AS name')).rows[0].name as string;
    assert.match(source, /^[a-zA-Z_][a-zA-Z0-9_]*$/);
    await pool.query('CREATE SCHEMA "' + schema + '"'); created = true;
    for (const table of ['Resident', 'Admin']) {
      await pool.query('CREATE TABLE "' + schema + '"."' + table + '" (LIKE "' + source + '"."' + table + '" INCLUDING ALL)');
    }
    await pool.query(`CREATE TYPE "${schema}"."VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED')`);
    await pool.query(`CREATE TYPE "${schema}"."AdminRole" AS ENUM ('ADMIN', 'CLERK', 'SK', 'PEACE_AND_ORDER', 'PUNONG_BARANGAY', 'HEALTH_WORKER')`);
    await pool.query('ALTER TABLE "' + schema + '"."Resident" ALTER COLUMN "status" DROP DEFAULT');
    await pool.query('ALTER TABLE "' + schema + '"."Resident" ALTER COLUMN "status" TYPE "' + schema + '"."VerificationStatus" USING "status"::text::"' + schema + '"."VerificationStatus"');
    await pool.query(`ALTER TABLE "${schema}"."Resident" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"${schema}"."VerificationStatus"`);
    await pool.query('ALTER TABLE "' + schema + '"."Admin" ALTER COLUMN "role" TYPE "' + schema + '"."AdminRole" USING "role"::text::"' + schema + '"."AdminRole"');
    const diagnostics: unknown[] = [];
    const modules: Record<string, unknown> = {
      bcryptjs: bcrypt, '@/lib/prisma': prisma,
      '@/lib/cloudinary': { CloudinaryUploadError: class extends Error {}, uploadImageToCloudinary: async () => { uploads++; return { secure_url: 'https://example.invalid/synthetic-id.png' }; } },
      '@/lib/valid-id-image': images, '@/validations/resident.validation': validation,
      'next/cache': { revalidatePath: () => {} }, '@/lib/nodemailer': {}, '@/lib/admin-authorization': {},
      '@/lib/admin-session': { getCurrentAdminFromSession: async () => ({ id: 'synthetic-staff', role }) }, '@/app/generated/prisma/enums': { AdminRole },
    };
    const exports = {};
    runInNewContext(ts.transpileModule(readFileSync('server/actions/resident.actions.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText, { exports, File, FormData, console: { error: (...args: unknown[]) => diagnostics.push(args) }, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
    const action = (exports as typeof import('../server/actions/resident.actions')).createAdminResidentAction;
    const form = (index: number) => {
      const data = new FormData();
      for (const [key, value] of Object.entries({ email: 'synthetic-' + index + '@example.invalid', password: 'Example123!', confirmPassword: 'Example123!', firstName: 'Synthetic', lastName: 'Resident', birthDate: '2000-01-01', gender: 'Female', civilStatus: 'Single', street: 'Test', houseNumber: '1', contactNumber: '09123456789', citizenship: 'Filipino', isVoter: 'No', is4Ps: 'No', isPwd: 'No', idType: 'National ID', idNumber: 'synthetic-id-' + index })) data.set(key, value);
      data.set('validIDImage', new File(['synthetic'], 'id.png', { type: 'image/png' })); return data;
    };
    for (const [index, allowed] of [AdminRole.ADMIN, AdminRole.CLERK].entries()) {
      role = allowed;
      const result = await action(form(index)); assert.equal(result.success, true, result.message + JSON.stringify(diagnostics));
      const row = await prisma.resident.findUniqueOrThrow({ where: { email: 'synthetic-' + index + '@example.invalid' } });
      assert.equal(row.contactNumber, '+639123456789'); assert.equal(row.status, 'PENDING'); assert.equal(row.isVoter, false);
      assert.equal(row.validIDImage, 'https://example.invalid/synthetic-id.png'); assert.equal(row.idNumber, 'synthetic-id-' + index);
      assert.equal(await bcrypt.compare('Example123!', row.password), true);
      const before: number = uploads; assert.equal((await action(form(index))).success, false); assert.equal(uploads, before);
    }
    await prisma.admin.create({ data: { name: 'Synthetic Staff', email: 'synthetic-9@example.invalid', password: 'synthetic-hash', role: AdminRole.CLERK } });
    assert.equal((await action(form(9))).success, false);
    const invalid = form(10); invalid.set('contactNumber', '8123456789'); assert.equal((await action(invalid)).success, false);
    assert.equal(await prisma.resident.count(), 2);
    assert.equal(uploads, 2);
  } finally {
    await prisma.$disconnect();
    if (created) { assert.match(schema, /^resident_create_test_[a-f0-9]{32}$/); await pool.query('DROP SCHEMA "' + schema + '" CASCADE'); }
    await pool.end();
  }
});
