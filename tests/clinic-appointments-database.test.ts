import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../app/generated/prisma/client'
import * as policy from '../lib/appointment-policy'
import * as clinicValidation from '../validations/clinic.validation'
import * as clinicUtils from '../lib/clinic-utils'
import * as rbac from '../lib/rbac'
import { AdminRole } from '../app/generated/prisma/enums'
import 'dotenv/config'

function load<T>(file: string, modules: Record<string, unknown>): T {
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
  } }).outputText
  const exports = {}
  runInNewContext(compiled, { exports, Date, Intl, FormData, File, console: { error: () => {} }, require: (name: string) => {
    assert.ok(name in modules, name); return modules[name]
  } })
  return exports as T
}
test('isolated PostgreSQL appointment lifecycle, concurrency, migration and consultation integration', {
  skip: process.env.RUN_APPOINTMENT_DB_TESTS !== '1', timeout: 360000,
}, async t => {
  const schema = `appointment_test_${randomUUID().replaceAll('-', '')}`
  assert.match(schema, /^appointment_test_[a-f0-9]{32}$/)
  const url = new URL(process.env.DATABASE_URL!)
  url.searchParams.set('options', `-c search_path=${schema}`)
  const pool = new pg.Pool({ connectionString: url.toString(), max: 12, connectionTimeoutMillis: 10000, query_timeout: 30000 })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) })
  let created = false
  try {
    await pool.query(`CREATE SCHEMA "${schema}"`); created = true
    await pool.query(`
      CREATE TYPE "VerificationStatus" AS ENUM ('PENDING','APPROVED','DECLINED');
      CREATE TABLE "Resident" ("id" TEXT PRIMARY KEY, "firstName" TEXT NOT NULL DEFAULT 'Synthetic', "middleName" TEXT,
        "lastName" TEXT NOT NULL DEFAULT 'Patient', "contactNumber" TEXT, "isArchived" BOOLEAN NOT NULL DEFAULT false,
        "status" "VerificationStatus" NOT NULL DEFAULT 'APPROVED');
      CREATE TABLE "Admin" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL DEFAULT 'Synthetic Worker');
      CREATE TABLE "MedicalRecord" ("id" TEXT PRIMARY KEY, "patientId" TEXT NOT NULL REFERENCES "Resident"("id"),
        "symptoms" TEXT NOT NULL DEFAULT 'Test', "diagnosis" TEXT NOT NULL DEFAULT 'Test', "treatment" TEXT NOT NULL DEFAULT 'Test',
        "prescription" TEXT, "assignedNurse" TEXT, "medicinesGiven" TEXT[] NOT NULL DEFAULT '{}',
        "checkedById" TEXT NOT NULL REFERENCES "Admin"("id"), "date" TIMESTAMP NOT NULL DEFAULT NOW(), "isArchive" BOOLEAN NOT NULL DEFAULT false);
      CREATE TABLE "InventoryTransaction" ("id" TEXT PRIMARY KEY, "medicalRecordId" TEXT, "itemName" TEXT, "itemUnit" TEXT, "quantity" INTEGER, "date" TIMESTAMP);
      INSERT INTO "Resident" ("id") SELECT 'patient-' || n FROM generate_series(1,16) n;
      INSERT INTO "Admin" ("id") VALUES ('worker');
      INSERT INTO "MedicalRecord" ("id","patientId","checkedById","medicinesGiven") VALUES ('legacy','patient-1','worker',ARRAY['Legacy medicine']);
    `)
    await pool.query(readFileSync('prisma/migrations/20261018020000_clinic_appointments/migration.sql', 'utf8'))
    await pool.query(readFileSync('prisma/migrations/20261018030000_appointment_consultation_start/migration.sql', 'utf8'))
    const modules: Record<string, unknown> = {
      'server-only': {}, '@/lib/prisma': prisma, '@/lib/appointment-policy': policy,
      'next/cache': { revalidatePath: () => {} }, '@/validations/clinic.validation': clinicValidation,
      '@/lib/clinic-utils': clinicUtils, '@/lib/rbac': rbac, '@/app/generated/prisma/enums': { AdminRole },
      '@/lib/medicine-dispensing': { DispensingError: class extends Error {} },
      '@/lib/health-worker-session': { getCurrentHealthWorkerFromSession: async () => ({ id: 'worker', name: 'Synthetic Worker', role: 'HEALTH_WORKER' }) },
      '@/lib/admin-session': { getCurrentAdminFromSession: async () => null },
    }
    const service = load<typeof import('../lib/appointments')>('lib/appointments.ts', modules)
    modules['@/lib/appointments'] = service
    const clinic = load<typeof import('../server/actions/clinic.actions')>('server/actions/clinic.actions.ts', modules)
    const futureDay = new Date(`${policy.manilaDate(new Date(Date.now() + 86400000))}T00:00:00+08:00`)
    const startsAt = new Date(futureDay.getTime() + 9 * 3600000).toISOString()
    const schedule = { enabled: true, operatingDays: [0,1,2,3,4,5,6], opensAt: '08:00', closesAt: '17:00', slotMinutes: 30, capacity: 2, version: 0 }
    const book = (n: number, time = startsAt) => service.bookAppointment(`patient-${n}`, { startsAt: time, reason: 'Synthetic visit', notes: '' })
    const change = (id: string, status: 'CONFIRMED' | 'CANCELLED' | 'REJECTED' | 'NO_SHOW', reason = '') => service.changeAppointment({ id, status, reason }, { id: 'worker', resident: false })
    const form = (patientId: string, appointmentId?: string) => {
      const f = new FormData(); f.set('patientId', patientId); f.set('diagnosis', 'Synthetic diagnosis'); f.set('notes', 'Synthetic notes'); f.set('date', policy.manilaDate())
      if (appointmentId) f.set('appointmentId', appointmentId)
      return f
    }
    await t.test('migration preserves legacy records, medicine notes and Walk-In classification', async () => {
      const legacy = await prisma.medicalRecord.findUniqueOrThrow({ where: { id: 'legacy' } })
      assert.equal(legacy.visitType, 'WALK_IN'); assert.equal(legacy.appointmentId, null)
      assert.deepEqual(legacy.medicinesGiven, ['Legacy medicine'])
      assert.equal(await prisma.clinicSchedule.count(), 0)
      await assert.rejects(() => book(1))
      await service.saveClinicSchedule(schedule)
    })
    await t.test('eight simultaneous residents cannot exceed capacity two', async () => {
      const results = await Promise.allSettled(Array.from({ length: 8 }, (_, i) => book(i + 1)))
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 2)
      assert.equal(await prisma.clinicAppointment.count(), 2)
      assert.equal(await prisma.clinicAppointmentHistory.count(), 2)
    })
    await t.test('resident active uniqueness persists across different slots and concurrent retries', async () => {
      const next = new Date(new Date(startsAt).getTime() + 3600000).toISOString()
      const results = await Promise.allSettled(Array.from({ length: 8 }, () => book(9, next)))
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1)
      await assert.rejects(() => book(9, startsAt))
      const row = await prisma.clinicAppointment.findFirstOrThrow({ where: { residentId: 'patient-9' } })
      await assert.rejects(() => prisma.clinicAppointment.create({ data: { residentId: row.residentId, startsAt: row.startsAt, endsAt: row.endsAt, reason: 'Duplicate' } }))
    })
    await t.test('ownership, cancellation history, released capacity and terminal transition guards', async () => {
      const row = await prisma.clinicAppointment.findFirstOrThrow({ where: { startsAt: new Date(startsAt) } })
      await assert.rejects(() => service.changeAppointment({ id: row.id, status: 'CANCELLED', reason: 'Synthetic cancellation' }, { id: 'patient-16', resident: true }))
      const cancelled = await service.changeAppointment({ id: row.id, status: 'CANCELLED', reason: 'Synthetic cancellation' }, { id: row.residentId, resident: true })
      assert.equal(cancelled.status, 'CANCELLED'); assert.equal(cancelled.history.length, 2)
      await assert.rejects(() => change(row.id, 'CONFIRMED'))
      const replacement = await book(10)
      assert.equal(replacement.status, 'PENDING')
      await change(replacement.id, 'REJECTED', 'Synthetic rejection')
      await book(10)
    })
    await t.test('schedule changes are versioned and overlap checks include existing bookings', async () => {
      await assert.rejects(() => service.saveClinicSchedule(schedule))
      const saved = await service.saveClinicSchedule({ ...schedule, opensAt: '08:15', slotMinutes: 60, capacity: 1, version: 1 })
      assert.equal(saved.version, 2)
      const overlap = new Date(futureDay.getTime() + (8 * 60 + 15) * 60000).toISOString()
      await assert.rejects(() => book(11, overlap))
      await service.saveClinicSchedule({ ...schedule, version: 2 })
    })
    await t.test('archived/inactive residents and past or non-schedule slots cannot book', async () => {
      await prisma.resident.update({ where: { id: 'patient-12' }, data: { isArchived: true }, select: { id: true } })
      await assert.rejects(() => book(12))
      await prisma.resident.update({ where: { id: 'patient-12' }, data: { isArchived: false, status: 'PENDING' }, select: { id: true } })
      await assert.rejects(() => book(12))
      await assert.rejects(() => book(13, new Date(Date.now() - 86400000).toISOString()))
      await assert.rejects(() => book(13, new Date(new Date(startsAt).getTime() + 60000).toISOString()))
    })
    await t.test('Walk-In creation remains the existing consultation workflow', async () => {
      const result = await clinic.submitMedicalRecordAction(form('patient-13'))
      assert.equal(result.success, true, result.message)
      assert.equal(result.record?.visitType, 'WALK_IN'); assert.equal(result.record?.appointmentId, null)
    })
    await t.test('pending consultations cannot start; confirmed future appointments start and finalize early', async () => {
      const pending = await prisma.clinicAppointment.findFirstOrThrow({ where: { residentId: 'patient-9' } })
      await assert.rejects(() => service.startAppointmentConsultation(pending.id, 'worker'))
      assert.equal((await clinic.submitMedicalRecordAction(form(pending.residentId, pending.id))).success, false)
      await change(pending.id, 'CONFIRMED')
      // A direct save still requires the explicit start operation.
      assert.equal((await clinic.submitMedicalRecordAction(form(pending.residentId, pending.id))).success, false)
      const started = await service.startAppointmentConsultation(pending.id, 'worker')
      assert.equal(started.status, 'CONFIRMED')
      assert.equal(started.startsAt.getTime(), pending.startsAt.getTime())
      assert.ok(started.consultationStartedAt! < pending.startsAt)
      await assert.rejects(() => change(pending.id, 'NO_SHOW'))
      const result = await clinic.submitMedicalRecordAction(form(pending.residentId, pending.id))
      assert.equal(result.success, true, result.message)
      assert.equal(result.record?.date, started.consultationStartedAt!.toISOString())
      assert.equal((await prisma.clinicAppointment.findUniqueOrThrow({ where: { id: pending.id } })).status, 'COMPLETED')
      assert.equal((await prisma.clinicAppointment.findUniqueOrThrow({ where: { id: pending.id } })).startsAt.getTime(), pending.startsAt.getTime())
    })
    await t.test('confirmed arrival saves exactly one consultation atomically under eight simultaneous submissions', async () => {
      const now = new Date()
      // Synthetic arrival starts one minute ago, preserving today's Manila calendar.
      const row = await prisma.clinicAppointment.create({ data: { residentId: 'patient-14', reason: 'Synthetic arrival', startsAt: new Date(now.getTime() - 60000), endsAt: new Date(now.getTime() + 1800000), status: 'CONFIRMED' } })
      const starts = await Promise.all(Array.from({ length: 8 }, () => service.startAppointmentConsultation(row.id, 'worker')))
      assert.equal(new Set(starts.map(s => s.consultationStartedAt!.toISOString())).size, 1)
      assert.equal(await prisma.medicalRecord.count({ where: { appointmentId: row.id } }), 0)
      assert.equal(await prisma.clinicAppointmentHistory.count({ where: { appointmentId: row.id, reason: 'Consultation started' } }), 1)
      assert.equal(starts[0].status, 'CONFIRMED')
      const results = await Promise.all(Array.from({ length: 8 }, () => clinic.submitMedicalRecordAction(form('patient-14', row.id))))
      assert.equal(results.filter(r => r.success).length, 1, JSON.stringify(results.map(r => r.message)))
      assert.equal(await prisma.medicalRecord.count({ where: { appointmentId: row.id } }), 1)
      assert.equal((await prisma.clinicAppointment.findUniqueOrThrow({ where: { id: row.id } })).status, 'COMPLETED')
      assert.equal(await prisma.clinicAppointmentHistory.count({ where: { appointmentId: row.id, status: 'COMPLETED' } }), 1)
      const record = await prisma.medicalRecord.findFirstOrThrow({ where: { appointmentId: row.id } })
      assert.equal(record.visitType, 'APPOINTMENT'); assert.equal(record.patientId, row.residentId)
      assert.equal(record.date.toISOString(), starts[0].consultationStartedAt!.toISOString())
      assert.equal((await clinic.updateMedicalRecordAction(record.id, form('patient-15'))).success, false)
      await prisma.medicalRecord.update({ where: { id: record.id }, data: { isArchive: true } })
      assert.equal((await prisma.clinicAppointment.findUniqueOrThrow({ where: { id: row.id } })).status, 'COMPLETED')
      await assert.rejects(() => prisma.medicalRecord.update({ where: { id: record.id }, data: { patientId: 'patient-15' } }))
      await assert.rejects(() => prisma.medicalRecord.update({ where: { id: record.id }, data: { visitType: 'WALK_IN', appointmentId: null } }))
    })
    await t.test('consultation failure rolls back completion and history', async () => {
      const row = await prisma.clinicAppointment.create({ data: { residentId: 'patient-15', reason: 'Rollback', startsAt: new Date(Date.now() - 60000), endsAt: new Date(Date.now() + 1800000), status: 'CONFIRMED' } })
      await service.startAppointmentConsultation(row.id, 'worker')
      await assert.rejects(() => prisma.$transaction(async tx => {
        await service.lockAppointmentConsultation(tx, row.id, row.residentId, 'worker')
        throw new Error('Synthetic save failure')
      }, service.appointmentTransactionOptions))
      assert.equal((await prisma.clinicAppointment.findUniqueOrThrow({ where: { id: row.id } })).status, 'CONFIRMED')
      assert.equal(await prisma.clinicAppointmentHistory.count({ where: { appointmentId: row.id, status: 'COMPLETED' } }), 0)
    })
    await t.test('no-show requires elapsed time and keeps history; cancellation/rejection reason required by database', async () => {
      const row = await prisma.clinicAppointment.create({ data: { residentId: 'patient-16', reason: 'No show', startsAt: new Date(Date.now() - 3600000), endsAt: new Date(Date.now() - 1800000), status: 'CONFIRMED' } })
      await change(row.id, 'NO_SHOW')
      assert.equal((await prisma.clinicAppointment.findUniqueOrThrow({ where: { id: row.id } })).status, 'NO_SHOW')
      await assert.rejects(() => prisma.clinicAppointmentHistory.create({ data: { appointmentId: row.id, actorId: 'worker', actorType: 'STAFF', status: 'CANCELLED' } }))
    })
    await t.test('terminal appointments cannot start and actual start metadata cannot be overwritten', async () => {
      for (const status of ['CANCELLED', 'REJECTED', 'COMPLETED', 'NO_SHOW'] as const) {
        const row = await prisma.clinicAppointment.create({ data: { residentId: 'patient-14', startsAt: new Date(), endsAt: new Date(Date.now() + 60000), reason: 'Synthetic terminal appointment', status } })
        await assert.rejects(() => service.startAppointmentConsultation(row.id, 'worker'))
      }
      const started = await prisma.clinicAppointment.findFirstOrThrow({ where: { residentId: 'patient-15' } })
      await assert.rejects(() => prisma.clinicAppointment.update({ where: { id: started.id }, data: { consultationStartedAt: new Date('2000-01-01') } }))
    })
  } finally {
    await prisma.$disconnect()
    if (created) await pool.query(`DROP SCHEMA "${schema}" CASCADE`)
    await pool.end()
  }
})
