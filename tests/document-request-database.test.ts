import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../app/generated/prisma/client'
import * as catalog from '../lib/document-request-catalog'
import * as policy from '../lib/document-request-policy'
import * as locking from '../lib/document-request-lock'
import * as serialization from '../lib/document-request-utils'
import * as validation from '../validations/document.validation'
import { z } from 'zod'
import 'dotenv/config'

function loadModule<T>(file: string, modules: Record<string, unknown>): T {
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText
  const exports = {}
  runInNewContext(compiled, { exports, Buffer, console: { error: () => {} }, require: (name: string) => {
    assert.ok(name in modules, `Unexpected dependency: ${name}`)
    return modules[name]
  } })
  return exports as T
}

// Explicit opt-in: creates synthetic data in a unique schema, never application tables.
// The finally block removes only that generated schema.
test('PostgreSQL document request lifecycle, migration and concurrent submissions', {
  skip: process.env.RUN_DOCUMENT_DB_TESTS !== '1', timeout: 120000,
}, async (t) => {
  const schema = `document_rules_test_${randomUUID().replaceAll('-', '')}`
  assert.match(schema, /^document_rules_test_[a-f0-9]{32}$/)
  const connection = new URL(process.env.DATABASE_URL!)
  connection.searchParams.set('options', `-c search_path=${schema}`)
  const pool = new pg.Pool({ connectionString: connection.toString(), max: 8, connectionTimeoutMillis: 10000 })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) })
  let createdSchema = false
  try {
    await pool.query(`CREATE SCHEMA "${schema}"`)
    createdSchema = true
    await pool.query(`
      CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'REVIEW', 'APPROVED', 'GENERATED');
      CREATE TABLE "Resident" ("id" TEXT PRIMARY KEY, "email" TEXT DEFAULT 'test@example.invalid',
        "firstName" TEXT DEFAULT 'Test', "middleName" TEXT, "lastName" TEXT DEFAULT 'Resident',
        "birthDate" TIMESTAMP DEFAULT '2000-01-01', "houseNumber" TEXT DEFAULT '1', "street" TEXT DEFAULT 'Test', "contactNumber" TEXT);
      CREATE TABLE "Document" ("id" TEXT PRIMARY KEY, "documentTypeId" TEXT UNIQUE NOT NULL,
        "name" TEXT NOT NULL DEFAULT 'Test', "description" TEXT, "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT TRUE, "createdAt" TIMESTAMP DEFAULT NOW(), "updatedAt" TIMESTAMP DEFAULT NOW());
      CREATE TABLE "DocumentRequest" ("id" TEXT PRIMARY KEY, "residentId" TEXT NOT NULL REFERENCES "Resident"("id"),
        "documentTypeId" TEXT NOT NULL, "type" TEXT NOT NULL, "purpose" TEXT, "quantity" INTEGER NOT NULL DEFAULT 1,
        "yearsOfResidency" INTEGER NOT NULL DEFAULT 0, "placeOfBirth" TEXT, "amount" INTEGER NOT NULL DEFAULT 0,
        "details" JSONB, "paymentReferenceDigits" TEXT, "paymentProofFileName" TEXT, "serialNumber" TEXT UNIQUE,
        "generatedFileUrl" TEXT, "status" "RequestStatus" NOT NULL DEFAULT 'PENDING', "requestedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "generatedAt" TIMESTAMP, "releasedAt" TIMESTAMP, "isArchived" BOOLEAN DEFAULT FALSE);
      INSERT INTO "Resident" ("id") VALUES ('migration-history');
      INSERT INTO "Document" ("id", "documentTypeId", "price") VALUES ('job', 'first-time-job-seeker', 900);
      INSERT INTO "DocumentRequest" ("id", "residentId", "documentTypeId", "type", "amount", "quantity")
        VALUES ('historic', 'migration-history', 'first-time-job-seeker', 'Job seeker', 900, 3);
    `)
    await pool.query(readFileSync('prisma/migrations/20261016000000_document_request_eligibility/migration.sql', 'utf8'))
    await pool.query(`INSERT INTO "DocumentRequest" ("id", "residentId", "documentTypeId", "type", "status", "releasedAt")
      VALUES ('legacy-cancelled', 'migration-history', 'clearance', 'Clearance', 'CANCELLED', '2026-01-01')`)
    await pool.query(readFileSync('prisma/migrations/20261016010000_merge_cancelled_document_requests/migration.sql', 'utf8'))

    let residentId: string | null = null
    let adminAllowed = true
    let renderPdf: () => Promise<Buffer> = async () => Buffer.from('synthetic PDF')
    const modules: Record<string, unknown> = {
      '@/lib/prisma': prisma, '@/lib/document-request-catalog': catalog,
      '@/lib/document-request-policy': policy, '@/lib/document-request-lock': locking,
      '@/lib/document-request-utils': serialization, '@/validations/document.validation': validation,
      '@/lib/resident-session': { getCurrentResidentFromSession: async () => residentId ? { id: residentId } : null },
      '@/lib/admin-authorization': { hasAdminPermission: async () => adminAllowed },
      '@/lib/nodemailer': { sendDocumentRequestPdfEmail: async () => ({ success: true }) },
      'next/cache': { revalidatePath: () => {} }, zod: { z },
      '@/lib/pdf/document-request-pdf': { generateDocumentRequestPdfBuffer: () => renderPdf() },
    }
    const delivery = loadModule<typeof import('../lib/pdf/document-request-delivery')>('lib/pdf/document-request-delivery.ts', modules)
    modules['@/lib/pdf/document-request-delivery'] = delivery
    const actions = loadModule<typeof import('../server/actions/document.actions')>('server/actions/document.actions.ts', modules)
    const settings = loadModule<typeof import('../server/actions/document-settings.actions')>('server/actions/document-settings.actions.ts', modules)
    const resident = async () => {
      residentId = randomUUID()
      await pool.query('INSERT INTO "Resident" ("id") VALUES ($1)', [residentId])
    }
    const submit = (documentType = 'clearance', copies = '1') => {
      const form = new FormData()
      for (const [key, value] of Object.entries({ documentType, requestedCopies: copies, purpose: 'Test', yearsOfResidency: '5', residentId: 'forged-resident', amount: '999' })) form.set(key, value)
      return actions.createResidentDocumentRequestAction(form)
    }

    await t.test('migration preserves historical quantities and records but fixes all job seeker fees', async () => {
      const old = await prisma.documentRequest.findUniqueOrThrow({ where: { id: 'historic' } })
      assert.equal(old.quantity, 3)
      assert.equal(old.amount, 0)
      const merged = await prisma.documentRequest.findUniqueOrThrow({ where: { id: 'legacy-cancelled' } })
      assert.equal(merged.status, 'REJECTED')
      assert.equal(merged.releasedAt?.toISOString(), '2026-01-01T00:00:00.000Z')
      await assert.rejects(() => pool.query('UPDATE "DocumentRequest" SET "status" = $1 WHERE "id" = $2', ['CANCELLED', 'legacy-cancelled']))
      assert.equal((await prisma.document.findUniqueOrThrow({ where: { id: 'job' } })).price, 0)
      await assert.rejects(() => pool.query('UPDATE "Document" SET "price" = 50 WHERE "id" = $1', ['job']))
      await assert.rejects(() => pool.query('UPDATE "DocumentRequest" SET "amount" = 50 WHERE "id" = $1', ['historic']))
    })
    await t.test('authentication, server copy validation and immutable free pricing', async () => {
      residentId = null
      assert.equal((await submit()).success, false)
      await resident()
      assert.equal((await submit('first-time-job-seeker', '2')).success, false)
      const request = await submit('first-time-job-seeker')
      assert.equal(request.success, true)
      assert.equal(request.request?.amount, 0)
      assert.equal(request.request?.requestedCopies, '1')
      const stored = await prisma.documentRequest.findUniqueOrThrow({ where: { id: request.request!.id } })
      assert.equal(stored.residentId, residentId)
      assert.equal((await settings.updateDocumentPriceAction({ documentTypeId: 'first-time-job-seeker', price: 50 })).success, false)
    })
    await t.test('eight concurrent same-type submissions create exactly one active request', async () => {
      await resident()
      const results = await Promise.all(Array.from({ length: 8 }, () => submit()))
      assert.equal(results.filter((r) => r.success).length, 1)
      assert.ok(results.filter((r) => !r.success).every((r) => r.message === policy.ACTIVE_REQUEST_MESSAGE && r.existingRequestId))
      assert.equal(await prisma.documentRequest.count({ where: { residentId: residentId! } }), 1)
    })
    await t.test('different document types can be requested simultaneously', async () => {
      await resident()
      const results = await Promise.all([submit('clearance'), submit('residency'), submit('first-time-job-seeker')])
      assert.ok(results.every((r) => r.success))
    })
    await t.test('review and approval remain active; rejection permits retries', async () => {
      await resident()
      let request = await submit('first-time-job-seeker')
      for (const status of ['REVIEW', 'APPROVED'] as const) {
        assert.equal((await actions.updateAdminDocumentRequestStatusAction({ requestId: request.request!.id, status })).success, true)
        assert.equal((await submit('first-time-job-seeker')).message, policy.ACTIVE_REQUEST_MESSAGE)
      }
      for (const status of ['REJECTED'] as const) {
        assert.equal((await actions.updateAdminDocumentRequestStatusAction({ requestId: request.request!.id, status })).success, true)
        assert.equal((await actions.updateAdminDocumentRequestStatusAction({ requestId: request.request!.id, status: 'APPROVED' })).success, false)
        request = await submit('first-time-job-seeker')
        assert.equal(request.success, true)
      }
      adminAllowed = false
      assert.equal((await actions.updateAdminDocumentRequestStatusAction({ requestId: request.request!.id, status: 'APPROVED' })).success, false)
      adminAllowed = true
    })
    await t.test('active and issued records block even with an archive flag; ordinary completion permits another request', async () => {
      await resident()
      for (const type of ['first-time-job-seeker', 'clearance']) {
        const request = await submit(type)
        const id = request.request!.id
        await pool.query('UPDATE "DocumentRequest" SET "isArchived" = TRUE WHERE "id" = $1', [id])
        assert.equal((await submit(type)).message, policy.ACTIVE_REQUEST_MESSAGE)
        await actions.updateAdminDocumentRequestStatusAction({ requestId: id, status: 'APPROVED' })
        const generated = await delivery.generateStoredDocumentRequestPdf(id)
        assert.equal(generated.documentRequest.status, 'GENERATED')
        assert.equal((await actions.updateAdminDocumentRequestStatusAction({ requestId: id, status: 'REJECTED' })).success, false)
        const next = await submit(type)
        if (type === 'first-time-job-seeker') assert.equal(next.message, policy.JOB_SEEKER_AVAILED_MESSAGE)
        else assert.equal(next.success, true)
      }
    })
    await t.test('legacy released timestamps block lifetime reuse, and legacy duplicate jobs cannot both be issued', async () => {
      await resident()
      const old = (await submit('first-time-job-seeker')).request!
      await pool.query('UPDATE "DocumentRequest" SET "releasedAt" = NOW(), "status" = $2 WHERE "id" = $1', [old.id, 'APPROVED'])
      assert.equal((await submit('first-time-job-seeker')).message, policy.JOB_SEEKER_AVAILED_MESSAGE)
      await resident()
      const first = (await submit('first-time-job-seeker')).request!
      await actions.updateAdminDocumentRequestStatusAction({ requestId: first.id, status: 'APPROVED' })
      const duplicate = await prisma.documentRequest.create({ data: { residentId: residentId!, documentTypeId: 'first-time-job-seeker', type: 'Job seeker', yearsOfResidency: 5, status: 'APPROVED' } })
      const issued = await Promise.allSettled([delivery.generateStoredDocumentRequestPdf(first.id), delivery.generateStoredDocumentRequestPdf(duplicate.id)])
      assert.equal(issued.filter((r) => r.status === 'fulfilled').length, 1)
      assert.equal(await prisma.documentRequest.count({ where: { residentId: residentId!, status: 'GENERATED' } }), 1)
    })
    await t.test('rejection during PDF rendering prevents issuance', async () => {
      await resident()
      const request = (await submit()).request!
      await actions.updateAdminDocumentRequestStatusAction({ requestId: request.id, status: 'APPROVED' })
      let started!: () => void
      const rendering = new Promise<void>((resolve) => { started = resolve })
      let finish!: (value: Buffer) => void
      renderPdf = () => { started(); return new Promise<Buffer>((resolve) => { finish = resolve }) }
      const generation = delivery.generateStoredDocumentRequestPdf(request.id)
      await rendering
      await actions.updateAdminDocumentRequestStatusAction({ requestId: request.id, status: 'REJECTED' })
      finish(Buffer.from('synthetic PDF'))
      await assert.rejects(generation, /no longer eligible/)
      assert.equal((await submit()).success, true)
    })
  } finally {
    await prisma.$disconnect()
    if (createdSchema) await pool.query(`DROP SCHEMA "${schema}" CASCADE`)
    await pool.end()
  }
})
