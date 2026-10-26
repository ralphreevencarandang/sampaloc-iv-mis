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
import * as notice from '../lib/document-processing-notice'
import * as diagnostics from '../lib/pdf/pdf-diagnostics'
import * as storedPdf from '../lib/pdf/stored-document'
import { randomUUID as makeToken } from 'node:crypto'
import 'dotenv/config'

function loadModule<T>(file: string, modules: Record<string, unknown>): T {
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText
  const exports = {}
  runInNewContext(compiled, { exports, Buffer, Uint8Array, setTimeout, console: { error: () => {} }, require: (name: string) => {
    assert.ok(name in modules, `Unexpected dependency: ${name}`)
    return modules[name]
  } })
  return exports as T
}

// Explicit opt-in: creates synthetic data in a unique schema, never application tables.
// The finally block removes only that generated schema.
test('PostgreSQL document request lifecycle, migration and concurrent submissions', {
  skip: process.env.RUN_DOCUMENT_DB_TESTS !== '1', timeout: 300000,
}, async (t) => {
  const schema = `document_rules_test_${randomUUID().replaceAll('-', '')}`
  assert.match(schema, /^document_rules_test_[a-f0-9]{32}$/)
  const connection = new URL(process.env.DATABASE_URL!)
  connection.searchParams.set('options', `-c search_path=${schema}`)
  connection.searchParams.set('application_name', schema)
  const pool = new pg.Pool({ connectionString: connection.toString(), max: 8, connectionTimeoutMillis: 10000, query_timeout: 20000, statement_timeout: 15000 })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) })
  let createdSchema = false
  try {
    await pool.query(`CREATE SCHEMA "${schema}"`)
    createdSchema = true
    await pool.query(`
      CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'REVIEW', 'APPROVED', 'GENERATED');
      CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');
      CREATE TABLE "Resident" ("id" TEXT PRIMARY KEY, "email" TEXT DEFAULT 'test@example.invalid',
        "firstName" TEXT DEFAULT 'Test', "middleName" TEXT, "lastName" TEXT DEFAULT 'Resident',
        "birthDate" TIMESTAMP DEFAULT '2000-01-01', "houseNumber" TEXT DEFAULT '1', "street" TEXT DEFAULT 'Test', "contactNumber" TEXT,
        "status" "VerificationStatus" DEFAULT 'APPROVED', "isArchived" BOOLEAN DEFAULT FALSE);
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
    const legacyPdfReference = 'data:application/pdf;base64,' + Buffer.from('%PDF-preexisting').toString('base64')
    await pool.query('INSERT INTO "DocumentRequest" ("id", "residentId", "documentTypeId", "type", "status", "serialNumber", "generatedFileUrl", "generatedAt", "releasedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)',
      ['preexisting-pdf', 'migration-history', 'clearance', 'Clearance', 'GENERATED', 'PRESERVED-001', legacyPdfReference, '2026-01-01T00:00:00.000Z'])
    await pool.query(readFileSync('prisma/migrations/20261018010000_shared_document_pdf/migration.sql', 'utf8'))

    let residentId: string | null = null
    let adminAllowed = true
    let renderPdf: () => Promise<Buffer> = async () => Buffer.from('%PDF-synthetic PDF')
    let renders = 0
    const notifications: Array<() => Promise<void>> = []
    const sentNotifications: unknown[] = []
    const modules: Record<string, unknown> = {
      '@/lib/pdf/pdf-diagnostics': diagnostics, '@/lib/prisma': prisma, '@/lib/document-request-catalog': catalog,
      '@/lib/document-request-policy': policy, '@/lib/document-request-lock': locking,
      '@/lib/document-request-utils': serialization, '@/validations/document.validation': validation,
      '@/lib/resident-session': { getCurrentResidentFromSession: async () => residentId ? { id: residentId } : null },
      '@/lib/admin-authorization': { hasAdminPermission: async () => adminAllowed },
      '@/lib/nodemailer': { sendDocumentRequestPdfEmail: async () => ({ success: true }), sendDocumentRequestNotificationEmail: async (input: unknown) => { sentNotifications.push(input); return { success: false } } },
      '@/lib/document-processing-notice': notice, '@/lib/pdf/stored-document': storedPdf,
      'node:crypto': { randomUUID: makeToken }, 'next/server': { after: (callback: () => Promise<void>) => { notifications.push(callback) } },
      'next/cache': { revalidatePath: () => {} }, zod: { z },
      '@/lib/pdf/document-request-pdf': { generateDocumentRequestPdfBuffer: () => { renders++; return renderPdf() } },
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
    const filter = process.env.DOCUMENT_DB_SCENARIO
    const scenarioTest = (name: string, run: () => Promise<void>) => t.test(name, { skip: Boolean(filter) && !name.includes(filter!) }, run)

    await scenarioTest('migration preserves historical quantities and records but fixes all job seeker fees', async () => {
      const legacy = await prisma.documentRequest.findUniqueOrThrow({ where: { id: 'preexisting-pdf' } })
      assert.equal(legacy.serialNumber, 'PRESERVED-001')
      assert.equal(legacy.generatedFileUrl, legacyPdfReference)
      assert.equal(legacy.generatedAt?.toISOString(), '2026-01-01T00:00:00.000Z')
      assert.equal(legacy.status, 'GENERATED')
      assert.equal(legacy.generatedPdf, null)
      const imported = await delivery.generateStoredDocumentRequestPdf(legacy.id)
      assert.equal(imported.pdfBuffer.toString(), '%PDF-preexisting')
      assert.equal(imported.serialNumber, legacy.serialNumber)
      assert.equal(imported.documentRequest.status, 'GENERATED')
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
    await scenarioTest('authentication, server copy validation and immutable free pricing', async () => {
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
    await scenarioTest('eight concurrent same-type submissions create exactly one active request', async () => {
      await resident()
      const results = await Promise.all(Array.from({ length: 8 }, () => submit()))
      assert.equal(results.filter((r) => r.success).length, 1)
      assert.ok(results.filter((r) => !r.success).every((r) => r.message === policy.ACTIVE_REQUEST_MESSAGE && r.existingRequestId))
      assert.equal(await prisma.documentRequest.count({ where: { residentId: residentId! } }), 1)
    })
    await scenarioTest('different document types can be requested simultaneously', async () => {
      await resident()
      const results = await Promise.all([submit('clearance'), submit('residency'), submit('first-time-job-seeker')])
      assert.ok(results.every((r) => r.success))
    })
    await scenarioTest('review and approval remain active; rejection permits retries', async () => {
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
    await scenarioTest('active and issued records block even with an archive flag; ordinary completion permits another request', async () => {
      await resident()
      for (const type of ['first-time-job-seeker', 'clearance']) {
        const request = await submit(type)
        const id = request.request!.id
        await pool.query('UPDATE "DocumentRequest" SET "isArchived" = TRUE WHERE "id" = $1', [id])
        assert.equal((await submit(type)).message, policy.ACTIVE_REQUEST_MESSAGE)
        await actions.updateAdminDocumentRequestStatusAction({ requestId: id, status: 'APPROVED' })
        const generated = await delivery.generateStoredDocumentRequestPdf(id)
        assert.equal(generated.documentRequest.status, 'APPROVED')
        assert.equal((await actions.updateAdminDocumentRequestStatusAction({ requestId: id, status: 'REJECTED' })).success, false)
        const next = await submit(type)
        if (type === 'first-time-job-seeker') assert.equal(next.message, policy.JOB_SEEKER_AVAILED_MESSAGE)
        else assert.equal(next.success, true)
      }
    })
    await scenarioTest('legacy released timestamps block lifetime reuse, and legacy duplicate jobs cannot both be issued', async () => {
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
      assert.equal(await prisma.documentRequest.count({ where: { residentId: residentId!, generatedAt: { not: null } } }), 1)
    })
    await scenarioTest('rejection during PDF rendering prevents issuance', async () => {
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
      finish(Buffer.from('%PDF-synthetic PDF'))
      await assert.rejects(generation, /Only approved/)
      assert.equal((await submit()).success, true)
    })
    const approved = async (type = 'clearance') => {
      await resident()
      const request = (await submit(type)).request!
      assert.equal((await actions.updateAdminDocumentRequestStatusAction({ requestId: request.id, status: 'APPROVED' })).success, true)
      return request.id
    }
    await scenarioTest('admin-first and resident-first share immutable PDF bytes, serials and approval status', async () => {
      for (const firstRole of ['admin', 'resident']) {
        renderPdf = async () => Buffer.from('%PDF-first-version')
        const id = await approved()
        const beforeRenders = renders
        const first = firstRole === 'admin' ? await delivery.generateStoredDocumentRequestPdf(id)
          : await delivery.downloadApprovedResidentDocumentPdf(id, residentId!)
        const stored = await prisma.documentRequest.findUniqueOrThrow({ where: { id } })
        assert.equal(stored.status, 'APPROVED')
        assert.ok(stored.generatedPdf && stored.generatedAt && stored.serialNumber)
        renderPdf = async () => { throw new Error('An existing PDF must never be rendered again') }
        await pool.query('UPDATE "Resident" SET "firstName" = $1 WHERE "id" = $2', ['Changed', residentId])
        for (let repeat = 0; repeat < 3; repeat++) {
          for (const downloaded of [await delivery.generateStoredDocumentRequestPdf(id), await delivery.downloadApprovedResidentDocumentPdf(id, residentId!)]) {
            assert.equal(downloaded.pdfBuffer.toString(), first.pdfBuffer.toString())
            assert.equal(downloaded.serialNumber, first.serialNumber)
            assert.equal(downloaded.documentRequest.status, 'APPROVED')
            assert.equal('generatedPdf' in downloaded.documentRequest, false)
          }
        }
        assert.equal(renders, beforeRenders + 1)
        const unchanged = await prisma.documentRequest.findUniqueOrThrow({ where: { id } })
        assert.equal(JSON.stringify(unchanged), JSON.stringify(stored))
        await assert.rejects(delivery.downloadApprovedResidentDocumentPdf(id, 'different-resident'), /not found/)
        await pool.query('UPDATE "Resident" SET "isArchived" = TRUE WHERE "id" = $1', [residentId])
        await assert.rejects(delivery.downloadApprovedResidentDocumentPdf(id, residentId!), /not found/)
      }
    })
    await scenarioTest('eight concurrent Admin and Resident requests render exactly once', async () => {
      const id = await approved()
      const beforeRenders = renders
      renderPdf = async () => { await new Promise((resolve) => setTimeout(resolve, 100)); return Buffer.from('%PDF-shared-concurrent') }
      const documents = await Promise.all(Array.from({ length: 8 }, (_, index) => index % 2
        ? delivery.downloadApprovedResidentDocumentPdf(id, residentId!) : delivery.generateStoredDocumentRequestPdf(id)))
      assert.equal(new Set(documents.map((doc) => doc.serialNumber)).size, 1)
      assert.ok(documents.every((doc) => doc.pdfBuffer.toString() === '%PDF-shared-concurrent'))
      assert.equal(renders, beforeRenders + 1)
      assert.equal((await prisma.documentRequest.findUniqueOrThrow({ where: { id } })).pdfGenerationToken, null)
    })
    await scenarioTest('different residents get unique numeric serials beyond 9999', async () => {
      const year = Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Manila' }).format(new Date()))
      await pool.query('INSERT INTO "DocumentRequest" ("id", "residentId", "documentTypeId", "type", "serialNumber") VALUES ($1,$2,$3,$4,$5)',
        [randomUUID(), 'migration-history', 'clearance', 'Seed', 'BRGY-' + year + '-9999'])
      const ids: string[] = []
      for (let i = 0; i < 4; i++) ids.push(await approved())
      renderPdf = async () => Buffer.from('%PDF-numeric-serial')
      const generated = await Promise.all(ids.map((id) => delivery.generateStoredDocumentRequestPdf(id)))
      assert.equal(new Set(generated.map((doc) => doc.serialNumber)).size, 4)
      assert.ok(generated.every((doc) => Number(doc.serialNumber.split('-').at(-1)) >= 10000))
    })
    await scenarioTest('failed generation and expired leases retain the assigned serial on retry', async () => {
      const id = await approved()
      renderPdf = async () => { throw new Error('Synthetic render failure') }
      await assert.rejects(delivery.generateStoredDocumentRequestPdf(id), /Synthetic/)
      const failed = await prisma.documentRequest.findUniqueOrThrow({ where: { id } })
      assert.ok(failed.serialNumber)
      assert.equal(failed.generatedPdf, null)
      assert.equal(failed.pdfGenerationToken, null)
      assert.equal(failed.status, 'APPROVED')
      await prisma.documentRequest.update({ where: { id }, data: { pdfGenerationToken: randomUUID(), pdfGenerationExpiresAt: new Date(0) } })
      renderPdf = async () => Buffer.from('%PDF-recovered')
      const retry = await delivery.downloadApprovedResidentDocumentPdf(id, residentId!)
      assert.equal(retry.serialNumber, failed.serialNumber)
      assert.equal(retry.documentRequest.status, 'APPROVED')
      await assert.rejects(prisma.documentRequest.update({ where: { id }, data: { serialNumber: 'OVERWRITTEN' } }))
      await assert.rejects(prisma.documentRequest.update({ where: { id }, data: { generatedPdf: new Uint8Array(Buffer.from('%PDF-replacement')) } }))
    })
    await scenarioTest('old referenced files are reused exactly; missing files fail without regeneration', async () => {
      const id = await approved()
      const legacyDate = new Date('2026-01-01T00:00:00Z')
      await prisma.documentRequest.update({ where: { id }, data: {
        serialNumber: 'EXISTING-' + id, generatedAt: legacyDate,
        generatedFileUrl: 'data:application/pdf;base64,' + Buffer.from('%PDF-existing-file').toString('base64'),
      } })
      const beforeRenders = renders
      const preserved = await delivery.generateStoredDocumentRequestPdf(id)
      assert.equal(preserved.pdfBuffer.toString(), '%PDF-existing-file')
      assert.equal(preserved.serialNumber, 'EXISTING-' + id)
      assert.equal(preserved.documentRequest.generatedAt.toISOString(), legacyDate.toISOString())
      assert.equal(renders, beforeRenders)
      const missing = await approved()
      await prisma.documentRequest.update({ where: { id: missing }, data: { serialNumber: 'MISSING-' + missing, generatedFileUrl: 'http://127.0.0.1/private.pdf' } })
      await assert.rejects(delivery.generateStoredDocumentRequestPdf(missing), /could not be retrieved/)
      assert.equal(renders, beforeRenders)
      assert.equal((await prisma.documentRequest.findUniqueOrThrow({ where: { id: missing } })).status, 'APPROVED')
    })
    await scenarioTest('confirmation/status hooks run after commit, include lead time, and skip unchanged statuses', async () => {
      notifications.length = 0
      sentNotifications.length = 0
      await resident()
      const created = await submit()
      assert.ok(created.message.includes(notice.DOCUMENT_PROCESSING_NOTICE))
      assert.ok(created.message.includes(notice.DOCUMENT_WORKING_HOURS_NOTICE))
      assert.equal(notifications.length, 1)
      assert.equal(sentNotifications.length, 0)
      await actions.updateAdminDocumentRequestStatusAction({ requestId: created.request!.id, status: 'APPROVED' })
      assert.equal(notifications.length, 2)
      await actions.updateAdminDocumentRequestStatusAction({ requestId: created.request!.id, status: 'APPROVED' })
      assert.equal(notifications.length, 2)
      for (const notify of notifications) await notify()
      assert.equal(sentNotifications.length, 2)
      assert.equal((await prisma.documentRequest.findUniqueOrThrow({ where: { id: created.request!.id } })).status, 'APPROVED')
    })
  } finally {
    const cleanup = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000, query_timeout: 15000 })
    try {
      await cleanup.connect()
      await cleanup.query("SET lock_timeout = '10s'")
      await cleanup.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE application_name = $1 AND pid <> pg_backend_pid()', [schema])
      if (createdSchema) await cleanup.query(`DROP SCHEMA "${schema}" CASCADE`)
    } finally {
      await cleanup.end()
      await prisma.$disconnect()
      await pool.end()
    }
  }
})
