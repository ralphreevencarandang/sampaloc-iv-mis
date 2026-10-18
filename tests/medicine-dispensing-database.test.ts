import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../app/generated/prisma/client'
import * as policy from '../lib/medicine-inventory'
import * as validation from '../validations/dispensing.validation'
import * as inventoryValidation from '../validations/inventory.validation'
import * as clinicValidation from '../validations/clinic.validation'
import * as clinicUtils from '../lib/clinic-utils'
import * as rbac from '../lib/rbac'
import { AdminRole } from '../app/generated/prisma/enums'
import 'dotenv/config'

function loadModule<T>(file: string, modules: Record<string, unknown>): T {
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText
  const exports = {}
  runInNewContext(compiled, { exports, Date, FormData, File, console: { error: () => {} }, require: (name: string) => {
    assert.ok(name in modules, `Unexpected dependency: ${name}`)
    return modules[name]
  } })
  return exports as T
}

// Only synthetic data in a randomly named schema. Application tables are never mutated.
test('PostgreSQL dispensing lifecycle, retries and concurrent stock changes', {
  skip: process.env.RUN_MEDICINE_DB_TESTS !== '1', timeout: 240000,
}, async (t) => {
  const schema = `medicine_test_${randomUUID().replaceAll('-', '')}`
  assert.match(schema, /^medicine_test_[a-f0-9]{32}$/)
  const connection = new URL(process.env.DATABASE_URL!)
  connection.searchParams.set('options', `-c search_path=${schema}`)
  const pool = new pg.Pool({ connectionString: connection.toString(), max: 12, connectionTimeoutMillis: 10000 })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) })
  let created = false
  try {
    await pool.query(`CREATE SCHEMA "${schema}"`)
    created = true
    await pool.query(`
      CREATE TYPE "TransactionType" AS ENUM ('IN', 'OUT');
      CREATE TABLE "Resident" ("id" TEXT PRIMARY KEY, "firstName" TEXT NOT NULL DEFAULT 'Synthetic',
        "middleName" TEXT, "lastName" TEXT NOT NULL DEFAULT 'Patient', "isArchived" BOOLEAN NOT NULL DEFAULT false);
      CREATE TABLE "Admin" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL DEFAULT 'Synthetic Worker');
      CREATE TABLE "MedicalRecord" ("id" TEXT PRIMARY KEY, "patientId" TEXT NOT NULL REFERENCES "Resident"("id"),
        "symptoms" TEXT NOT NULL DEFAULT 'Test', "diagnosis" TEXT NOT NULL DEFAULT 'Test', "treatment" TEXT NOT NULL DEFAULT 'Test',
        "prescription" TEXT, "assignedNurse" TEXT, "medicinesGiven" TEXT[] NOT NULL DEFAULT '{}',
        "checkedById" TEXT NOT NULL REFERENCES "Admin"("id"), "date" TIMESTAMP NOT NULL DEFAULT NOW(), "isArchive" BOOLEAN NOT NULL DEFAULT false);
      CREATE TABLE "InventoryItem" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL DEFAULT 'Test Medicine',
        "category" TEXT NOT NULL DEFAULT 'Medical Supplies', "quantity" INTEGER NOT NULL DEFAULT 0,
        "unit" TEXT NOT NULL DEFAULT 'tablets', "storageLocation" TEXT NOT NULL DEFAULT 'Clinic', "description" TEXT,
        "isArchived" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW());
      CREATE TABLE "InventoryTransaction" ("id" TEXT PRIMARY KEY, "itemId" TEXT NOT NULL REFERENCES "InventoryItem"("id"),
        "quantity" INTEGER NOT NULL, "type" "TransactionType" NOT NULL, "distributedToId" TEXT REFERENCES "Resident"("id"),
        "date" TIMESTAMP NOT NULL DEFAULT NOW());
      INSERT INTO "Resident" ("id") VALUES ('patient'), ('other-patient');
      INSERT INTO "Admin" ("id") VALUES ('worker'), ('other-worker');
      INSERT INTO "InventoryItem" ("id", "quantity") VALUES ('legacy', 9);
      INSERT INTO "InventoryTransaction" ("id", "itemId", "quantity", "type") VALUES ('legacy-log', 'legacy', 9, 'IN');
    `)
    await pool.query(readFileSync('prisma/migrations/20261018000000_clinic_inventory_dispensing/migration.sql', 'utf8'))
    let worker: { id: string; name: string; role: 'HEALTH_WORKER' } | null = { id: 'worker', name: 'Synthetic Worker', role: 'HEALTH_WORKER' }
    let inventoryAllowed = true
    const modules: Record<string, unknown> = {
      'server-only': {}, '@/lib/prisma': prisma, '@/lib/medicine-inventory': policy,
      '@/validations/dispensing.validation': validation, '@/validations/inventory.validation': inventoryValidation,
      '@/validations/clinic.validation': clinicValidation, '@/lib/clinic-utils': clinicUtils,
      '@/lib/rbac': rbac, '@/app/generated/prisma/enums': { AdminRole },
      '@/lib/health-worker-session': { getCurrentHealthWorkerFromSession: async () => worker },
      '@/lib/admin-session': { getCurrentAdminFromSession: async () => null },
      '@/lib/admin-authorization': { hasAdminPermission: async () => inventoryAllowed },
      'next/cache': { revalidatePath: () => {} },
    }
    const service = loadModule<typeof import('../lib/medicine-dispensing')>('lib/medicine-dispensing.ts', modules)
    modules['@/lib/medicine-dispensing'] = service
    const actions = loadModule<typeof import('../server/actions/dispensing.actions')>('server/actions/dispensing.actions.ts', modules)
    const inventory = loadModule<typeof import('../server/actions/inventory.actions')>('server/actions/inventory.actions.ts', modules)
    const clinic = loadModule<typeof import('../server/actions/clinic.actions')>('server/actions/clinic.actions.ts', modules)
    const item = async (quantity = 10, options: Record<string, unknown> = {}) => prisma.inventoryItem.create({ data: {
      name: 'Synthetic medicine', category: 'Medical Supplies', quantity, unit: 'tablets', storageLocation: 'Clinic',
      isMedicine: true, expiresOn: new Date('2099-01-01'), ...options,
    } })
    const record = async () => prisma.medicalRecord.create({ data: {
      patientId: 'patient', symptoms: 'Test', diagnosis: 'Test', treatment: 'Test', checkedById: 'worker', medicinesGiven: ['Legacy note'],
    } })
    const request = (recordId: string, itemId: string, quantity = 1) => ({ medicalRecordId: recordId, dispenseKey: randomUUID(), medicines: [{ itemId, quantity }] })
    const stock = async (id: string) => (await prisma.inventoryItem.findUniqueOrThrow({ where: { id } })).quantity

    await t.test('migration retains existing inventory/history and does not guess which supplies are medicines', async () => {
      const legacy = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: 'legacy' } })
      assert.equal(legacy.quantity, 9)
      assert.equal(legacy.isMedicine, false)
      assert.equal(legacy.expiresOn, null)
      assert.equal(await prisma.inventoryTransaction.count({ where: { id: 'legacy-log' } }), 1)
    })
    await t.test('multiple medicines deduct atomically and history preserves patient, worker, name, unit and time', async () => {
      const a = await item(12), b = await item(8), visit = await record()
      const input = request(visit.id, a.id, 3)
      input.medicines.push({ itemId: b.id, quantity: 2 })
      assert.equal((await actions.dispenseMedicinesAction(input)).success, true)
      assert.equal(await stock(a.id), 9)
      assert.equal(await stock(b.id), 6)
      const history = await prisma.inventoryTransaction.findMany({ where: { medicalRecordId: visit.id } })
      assert.equal(history.length, 2)
      assert.ok(history.every((row) => row.dispensedById === 'worker' && row.distributedToId === 'patient' && row.itemName === a.name && row.itemUnit === 'tablets' && row.date instanceof Date))
      await prisma.inventoryItem.update({ where: { id: a.id }, data: { name: 'Renamed' } })
      assert.equal((await prisma.inventoryTransaction.findFirstOrThrow({ where: { itemId: a.id } })).itemName, a.name)
    })
    await t.test('a failed line rolls back all stock changes and history', async () => {
      const a = await item(5), b = await item(1), visit = await record()
      const input = request(visit.id, a.id, 2)
      input.medicines.push({ itemId: b.id, quantity: 2 })
      assert.equal((await actions.dispenseMedicinesAction(input)).success, false)
      assert.equal(await stock(a.id), 5)
      assert.equal(await stock(b.id), 1)
      assert.equal(await prisma.inventoryTransaction.count({ where: { medicalRecordId: visit.id } }), 0)
    })
    await t.test('expired, missing-expiry, archived and non-medicine items are blocked', async () => {
      const visit = await record()
      for (const options of [{ expiresOn: new Date('2000-01-01') }, { expiresOn: null }, { isArchived: true }, { isMedicine: false }]) {
        const medicine = await item(10, options)
        assert.equal((await actions.dispenseMedicinesAction(request(visit.id, medicine.id))).success, false)
        assert.equal(await stock(medicine.id), 10)
      }
    })
    await t.test('eight simultaneous duplicate submissions deduct exactly once', async () => {
      const medicine = await item(20), visit = await record(), input = request(visit.id, medicine.id, 3)
      const results = await Promise.all(Array.from({ length: 8 }, () => actions.dispenseMedicinesAction(input)))
      assert.ok(results.every((result) => result.success), JSON.stringify(results))
      assert.equal(await stock(medicine.id), 17)
      assert.equal(await prisma.inventoryTransaction.count({ where: { dispenseKey: input.dispenseKey } }), 1)
      assert.equal((await actions.dispenseMedicinesAction({ ...input, medicines: [{ itemId: medicine.id, quantity: 4 }] })).success, false)
      await assert.rejects(() => service.dispenseInventory(prisma, 'other-worker', input), /already used/)
    })
    await t.test('competing consultations cannot oversell stock', async () => {
      const medicine = await item(5), a = await record(), b = await record()
      const results = await Promise.all([actions.dispenseMedicinesAction(request(a.id, medicine.id, 4)), actions.dispenseMedicinesAction(request(b.id, medicine.id, 4))])
      assert.equal(results.filter((result) => result.success).length, 1)
      assert.equal(await stock(medicine.id), 1)
    })
    await t.test('stale admin forms cannot overwrite deductions; refreshed edits update shared stock', async () => {
      const medicine = await item(10), visit = await record()
      await actions.dispenseMedicinesAction(request(visit.id, medicine.id, 2))
      const form = new FormData()
      for (const [key, value] of Object.entries({ name: medicine.name, category: medicine.category, quantity: '20', unit: medicine.unit, storageLocation: medicine.storageLocation, stockVersion: '0', isMedicine: 'true', expiresOn: '2099-01-01' })) form.set(key, value)
      assert.equal((await inventory.updateInventoryItem(medicine.id, form)).success, false)
      assert.equal(await stock(medicine.id), 8)
      form.set('stockVersion', '1')
      assert.equal((await inventory.updateInventoryItem(medicine.id, form)).success, true)
      assert.equal(await stock(medicine.id), 20)
      inventoryAllowed = false
      assert.equal((await inventory.updateInventoryItem(medicine.id, form)).success, false)
      inventoryAllowed = true
    })
    await t.test('editing or archiving consultations never deducts again and cannot reassign dispensed history', async () => {
      const medicine = await item(10), visit = await record()
      await actions.dispenseMedicinesAction(request(visit.id, medicine.id, 2))
      const form = new FormData()
      for (const [key, value] of Object.entries({ patientId: 'patient', diagnosis: 'Edited', notes: 'Edited', date: '2026-10-18', medicinesGiven: 'Forged duplicate medicine' })) form.set(key, value)
      assert.equal((await clinic.updateMedicalRecordAction(visit.id, form)).success, true)
      assert.equal((await clinic.updateMedicalRecordAction(visit.id, form)).success, true)
      assert.equal(await stock(medicine.id), 8)
      assert.deepEqual((await prisma.medicalRecord.findUniqueOrThrow({ where: { id: visit.id } })).medicinesGiven, ['Legacy note'])
      form.set('patientId', 'other-patient')
      assert.equal((await clinic.updateMedicalRecordAction(visit.id, form)).success, false)
      assert.equal((await clinic.archiveMedicalRecordAction(visit.id)).success, true)
      assert.equal((await actions.dispenseMedicinesAction(request(visit.id, medicine.id))).success, false)
      assert.equal(await stock(medicine.id), 8)
    })
    await t.test('session identity is mandatory; client-supplied actor or patient never controls history', async () => {
      const medicine = await item(10), visit = await record(), input = request(visit.id, medicine.id)
      worker = null
      assert.equal((await actions.dispenseMedicinesAction(input)).success, false)
      worker = { id: 'worker', name: 'Synthetic Worker', role: 'HEALTH_WORKER' }
      assert.equal((await actions.dispenseMedicinesAction({ ...input, dispensedById: 'other-worker', patientId: 'other-patient' })).success, true)
      const history = await prisma.inventoryTransaction.findFirstOrThrow({ where: { dispenseKey: input.dispenseKey } })
      assert.equal(history.dispensedById, 'worker')
      assert.equal(history.distributedToId, 'patient')
    })
    await t.test('database rejects negative inventory quantities and incomplete dispensing history', async () => {
      const medicine = await item(10)
      await assert.rejects(() => prisma.inventoryItem.update({ where: { id: medicine.id }, data: { quantity: -1 } }))
      await assert.rejects(() => prisma.inventoryTransaction.create({ data: { itemId: medicine.id, quantity: 1, type: 'OUT', dispenseKey: randomUUID() } }))
    })
  } finally {
    await prisma.$disconnect()
    if (created) {
      const cleanup = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 })
      await cleanup.connect()
      try { await cleanup.query(`DROP SCHEMA "${schema}" CASCADE`) } finally { await cleanup.end() }
    }
    await pool.end()
  }
})
