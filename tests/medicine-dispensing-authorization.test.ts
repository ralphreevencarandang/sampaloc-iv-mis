import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import * as rbac from '../lib/rbac'
import * as policy from '../lib/medicine-inventory'
import * as validation from '../validations/dispensing.validation'
import { AdminRole } from '../app/generated/prisma/enums'

test('clinic medicine and history APIs enforce roles and never expose extra inventory or patient fields', async () => {
  let role: AdminRole | null = null
  let worker = false
  let reads = 0
  const modules: Record<string, unknown> = {
    'next/server': { NextResponse: { json: (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), init) } },
    'next/cache': { revalidatePath: () => {} },
    '@/lib/medicine-inventory': policy,
    '@/lib/rbac': rbac,
    '@/validations/dispensing.validation': validation,
    '@/lib/health-worker-session': { getCurrentHealthWorkerFromSession: async () => worker ? { id: 'worker' } : null },
    '@/lib/admin-session': { getCurrentAdminFromSession: async () => role ? { id: 'admin', role } : null },
    '@/lib/prisma': {
      inventoryItem: { findMany: async (args: { select: Record<string, boolean>; where: unknown }) => {
        reads++
        assert.deepEqual(Object.keys(args.select).sort(), ['expiresOn', 'id', 'name', 'quantity', 'unit'])
        assert.equal(JSON.stringify(args.where), JSON.stringify({ isMedicine: true, isArchived: false }))
        return [{ id: 'medicine', name: 'Medicine', quantity: 10, unit: 'tablets', expiresOn: new Date('2099-01-01') }]
      } },
      medicalRecord: { findUnique: async () => { reads++; return { isArchive: false, patient: { isArchived: false } } } },
      inventoryTransaction: { findMany: async () => { reads++; return [] } },
    },
    '@/lib/medicine-dispensing': { DispensingError: class extends Error {}, dispenseInventory: () => { throw new Error('Unexpected dispensing') } },
  }
  function load<T>(file: string): T {
    const compiled = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText
    const exports = {}
    runInNewContext(compiled, { exports, require: (name: string) => { assert.ok(name in modules, name); return modules[name] } })
    return exports as T
  }
  const medicineRoute = load<typeof import('../app/api/clinic/medicines/route')>('app/api/clinic/medicines/route.ts')
  const historyRoute = load<typeof import('../app/api/clinic/medical-records/[id]/dispensing/route')>('app/api/clinic/medical-records/[id]/dispensing/route.ts')
  const action = load<typeof import('../server/actions/dispensing.actions')>('server/actions/dispensing.actions.ts')
  const history = () => historyRoute.GET(new Request('http://localhost/test'), { params: Promise.resolve({ id: 'record' }) })
  assert.equal((await medicineRoute.GET()).status, 401)
  assert.equal((await history()).status, 401)
  assert.equal(reads, 0)
  for (const denied of [AdminRole.CLERK, AdminRole.SK, AdminRole.PEACE_AND_ORDER]) {
    role = denied
    assert.equal((await medicineRoute.GET()).status, 403)
    assert.equal((await history()).status, 403)
  }
  assert.equal(reads, 0)
  for (const allowed of [AdminRole.ADMIN, AdminRole.PUNONG_BARANGAY]) {
    role = allowed
    assert.equal((await medicineRoute.GET()).status, 200)
    const response = await history()
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store')
    assert.equal((await response.json()).canDispense, false)
    assert.equal((await action.dispenseMedicinesAction({})).success, false)
  }
  worker = true
  assert.equal((await medicineRoute.GET()).status, 200)
  assert.equal((await (await history()).json()).canDispense, true)
})
