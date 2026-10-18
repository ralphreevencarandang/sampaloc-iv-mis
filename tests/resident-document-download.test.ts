import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { z } from 'zod'
import * as policy from '../lib/document-request-policy'
import * as React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import * as icons from 'lucide-react'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { randomUUID } from 'node:crypto'
import * as storedPdf from '../lib/pdf/stored-document'
import { DocumentProcessingNotice } from '../components/document-requests/document-processing-notice'

function load<T>(file: string, modules: Record<string, unknown>): T {
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  const exports = {}
  runInNewContext(compiled, { exports, Buffer, Blob, Response, Uint8Array, setTimeout, process: { cwd: () => process.cwd() }, console: { error: () => {} }, require: (name: string) => {
    assert.ok(name in modules, name)
    return modules[name]
  } })
  return exports as T
}

test('resident route uses shared persisted PDFs, enforces approval/ownership, and never changes status', async () => {
  let signedIn = false
  let renders = 0
  let race = false
  const record = {
    id: 'request', residentId: 'resident', status: 'APPROVED', documentTypeId: 'clearance', type: 'Barangay Clearance',
    purpose: 'Employment', quantity: 2, amount: 50, details: { purpose: 'Employment' }, yearsOfResidency: 7,
    placeOfBirth: 'Cavite', serialNumber: null as string | null, generatedAt: null as Date | null,
    releasedAt: null as Date | null, generatedFileUrl: null, requestedAt: new Date('2026-10-18'),
    generatedPdf: null as Uint8Array | null, pdfGenerationToken: null as string | null,
    pdfGenerationExpiresAt: null as Date | null,
    resident: { id: 'resident', firstName: 'Test', middleName: null, lastName: 'Resident', email: 'test@example.invalid',
      birthDate: new Date('2000-01-01'), houseNumber: '12', street: 'Sample Street', contactNumber: '09000000000' },
  }
  type Query = { where: { id: string; residentId?: string }; select?: { resident?: unknown } }
  const prisma = {
    documentRequest: {
      findUnique: async ({ where }: Query) => {
        assert.equal(where.id, 'request')
        if (where.residentId && where.residentId !== record.residentId) return null
        return { ...record }
      },
      update: async ({ data }: { data: Partial<typeof record> }) => {
        assert.ok(!('status' in data), 'Generation must preserve approval status')
        Object.assign(record, data)
        return { ...record }
      },
      updateMany: async ({ data }: { data: Partial<typeof record> }) => { Object.assign(record, data); return { count: 1 } },
      findFirst: async () => null,
    },
    $queryRaw: async () => [{ counter: BigInt(0) }],
    $transaction: async (fn: (db: unknown) => unknown) => fn(prisma),
  }
  const delivery = load<typeof import('../lib/pdf/document-request-delivery')>('lib/pdf/document-request-delivery.ts', {
    '@/lib/prisma': prisma, '@/lib/document-request-policy': policy, '@/lib/pdf/stored-document': storedPdf,
    'node:crypto': { randomUUID }, '@/lib/document-request-lock': { lockDocumentRequestResident: async () => {} },
    '@/lib/pdf/document-request-pdf': { generateDocumentRequestPdfBuffer: async (input: typeof record) => {
      renders++
      assert.equal(input.resident.firstName, 'Test')
      assert.equal(input.purpose, 'Employment')
      assert.equal(input.yearsOfResidency, 7)
      assert.match(input.serialNumber!, /^BRGY-\d{4}-0001$/)
      if (race) record.status = 'REJECTED'
      return Buffer.from('%PDF-test')
    } },
  })
  const route = load<typeof import('../app/api/document/download/route')>('app/api/document/download/route.ts', {
    'next/server': { NextResponse: { json: (body: unknown, init: ResponseInit) => new Response(JSON.stringify(body), init) } },
    zod: { z }, '@/lib/pdf/document-request-delivery': delivery,
    '@/lib/resident-session': { getCurrentResidentFromSession: async () => signedIn ? { id: 'resident' } : null },
  })
  const download = (body: unknown = { requestId: 'request', residentId: 'other' }) => route.POST(new Request('http://localhost/api/document/download', {
    method: 'POST', body: JSON.stringify(body),
  }))
  assert.equal((await download()).status, 401)
  signedIn = true
  for (const body of [null, {}, { requestId: 123 }, { requestId: ' ' }]) assert.equal((await download(body)).status, 400)
  record.residentId = 'other'
  assert.equal((await download()).status, 404)
  record.residentId = 'resident'
  for (const denied of ['PENDING', 'REVIEW', 'REJECTED', 'GENERATED']) {
    record.status = denied
    assert.equal((await download()).status, 409)
  }
  assert.equal(renders, 0)
  record.status = 'APPROVED'
  race = true
  assert.equal((await download()).status, 409)
  assert.equal(record.generatedPdf, null)
  race = false
  record.status = 'APPROVED'
  const first = await download()
  assert.equal(first.status, 200)
  assert.equal(first.headers.get('Cache-Control'), 'private, no-store')
  assert.equal(first.headers.get('X-Document-Status'), 'APPROVED')
  assert.equal(first.headers.get('X-Document-Serial'), record.serialNumber)
  assert.equal(await first.text(), '%PDF-test')
  const snapshot = JSON.stringify(record)
  const renderCount = renders
  for (let repeat = 0; repeat < 3; repeat++) {
    const response = await download()
    assert.equal(response.status, 200)
    assert.equal(await response.text(), '%PDF-test')
    assert.equal(JSON.stringify(record), snapshot)
  }
  signedIn = false
  assert.equal((await download()).status, 401)
  signedIn = true
  assert.equal((await download()).status, 200)
  assert.equal(record.status, 'APPROVED')
  assert.equal(renders, renderCount)
  let adminAllowed = false
  const adminRoute = load<typeof import('../app/api/document/generate/route')>('app/api/document/generate/route.ts', {
    'next/server': { NextResponse: { json: (body: unknown, init: ResponseInit) => new Response(JSON.stringify(body), init) } },
    '@/lib/api-authorization': { forbiddenUnlessAdminCan: async () => adminAllowed ? null : new Response(null, { status: 403 }) },
    '@/lib/pdf/document-request-delivery': delivery,
  })
  const adminDownload = () => adminRoute.POST(new Request('http://localhost/api/document/generate', { method: 'POST', body: JSON.stringify({ requestId: 'request' }) }))
  assert.equal((await adminDownload()).status, 403)
  adminAllowed = true
  const adminCopy = await adminDownload()
  assert.equal(adminCopy.status, 200)
  assert.equal(adminCopy.headers.get('X-Document-Serial'), record.serialNumber)
  assert.equal(adminCopy.headers.get('X-Document-Status'), 'APPROVED')
  assert.equal(await adminCopy.text(), '%PDF-test')
  record.status = 'GENERATED'
  assert.equal((await adminDownload()).status, 200)
  assert.equal((await download()).status, 409)
  assert.equal(renders, renderCount)
})

test('account history renders a responsive download column only for APPROVED requests', () => {
  const history = ['PENDING', 'REVIEW', 'APPROVED', 'GENERATED', 'REJECTED'].map((status) => ({
    id: status, status, type: `Document ${status}`, purpose: 'Test', requestedCopies: '1', amount: 0, submittedAt: '2026-10-18',
  }))
  const profile = { id: 'resident', firstName: 'Test', lastName: 'Resident', birthDate: '2000-01-01', status: 'APPROVED', createdAt: '2026-10-18' }
  const page = load<{ default: React.ComponentType }>('app/(Resident)/my-account/page.tsx', {
    react: React, 'react/jsx-runtime': jsxRuntime, 'lucide-react': icons,
    'next/image': () => null,
    'next/link': ({ children, ...props }: React.ComponentProps<'a'>) => React.createElement('a', props, children),
    'react-hot-toast': { toast: { error: () => {} } }, '@/lib/axios': {}, '@/lib/document-requests-api': {},
    '@/components/providers/resident-auth-provider': { useResidentAuth: () => ({ resident: profile }) },
    '@/components/document-requests/document-processing-notice': { DocumentProcessingNotice },
    '@tanstack/react-query': {
      useQueryClient: () => ({}), useMutation: () => ({ isPending: false }),
      useQuery: ({ queryKey }: { queryKey: string[] }) => ({ data: queryKey[0] === 'resident-profile' ? profile : queryKey[0] === 'resident-document-requests' ? history : [] }),
    },
  })
  const html = renderToStaticMarkup(React.createElement(page.default))
  assert.match(html, /Download Document<\/th>/)
  assert.match(html, /overflow-x-auto/)
  assert.match(html, /aria-label="Download Document APPROVED PDF"/)
  assert.equal((html.match(/Not Available/g) ?? []).length, 4)
  assert.equal((html.match(/lucide-download/g) ?? []).length, 1)
  assert.match(html, /24 working hours/)
  assert.match(html, /weekends and holidays/)
})

test('existing PDF templates receive the resident and request details for active and legacy document types', async () => {
  let html = ''
  let closed = 0
  const renderer = load<typeof import('../lib/pdf/document-request-pdf')>('lib/pdf/document-request-pdf.tsx', {
    'node:fs': fs, 'node:path': path,
    puppeteer: { launch: async () => ({
      newPage: async () => ({
        setContent: async (content: string) => { html = content }, emulateMediaType: async () => {},
        pdf: async () => Buffer.from('%PDF-test'),
      }),
      close: async () => { closed++ },
    }) },
  })
  for (const documentTypeId of ['clearance', 'indigency', 'residency', 'cedula', 'first-time-job-seeker', 'barangay-id']) {
    await renderer.generateDocumentRequestPdfBuffer({
      id: 'request', documentTypeId, type: 'Certificate', purpose: 'Employment', quantity: 1, amount: 0,
      details: {}, yearsOfResidency: 7, placeOfBirth: 'Cavite', serialNumber: 'BRGY-2026-0001',
      requestedAt: new Date('2026-10-18'), generatedAt: new Date('2026-10-18'),
      resident: { firstName: 'Test', middleName: null, lastName: 'Resident', birthDate: new Date('2000-01-01'), houseNumber: '12', street: 'Sample Street' },
    })
    assert.match(html.toUpperCase(), /TEST RESIDENT/)
    assert.match(html.toUpperCase(), /12 SAMPLE STREET/)
    assert.match(html, /BRGY-2026-0001/)
    assert.doesNotMatch(html, /\{\{\s*[a-zA-Z]/)
  }
  assert.equal(closed, 6)
})

test('PDF client sends the request ID to the existing endpoint and reports JSON/blob errors safely', async () => {
  let failure: unknown = null
  const client = load<typeof import('../lib/document-requests-api')>('lib/document-requests-api.ts', {
    axios: { isAxiosError: () => true },
    '@/lib/axios': { post: async (endpoint: string, body: unknown, config: { timeout: number; responseType: string }) => {
      assert.equal(endpoint, '/document/download')
      assert.equal(JSON.stringify(body), JSON.stringify({ requestId: 'request' }))
      assert.equal(config.responseType, 'blob')
      assert.equal(config.timeout, 120000)
      if (failure) throw { response: { data: failure } }
      return { data: new Blob(['%PDF-test']), headers: { 'content-disposition': 'attachment; filename="approved.pdf"' } }
    } },
  })
  const success = await client.downloadResidentDocumentPdf('request')
  assert.equal(success.fileName, 'approved.pdf')
  assert.equal(await success.blob.text(), '%PDF-test')
  for (const data of [new Blob([JSON.stringify({ message: 'Refresh your transaction history.' })]), { message: 'Refresh your transaction history.' }]) {
    failure = data
    await assert.rejects(client.downloadResidentDocumentPdf('request'), /Refresh your transaction history\./)
  }
  failure = new Blob(['<html>Internal error</html>'])
  await assert.rejects(client.downloadResidentDocumentPdf('request'), /Unable to download your document\. Please try again\./)
})

test('real Chromium produces valid PDF bytes and expected page counts for all serial-bearing templates', {
  skip: process.env.RUN_DOCUMENT_PDF_TESTS !== '1', timeout: 300000,
}, async (t) => {
  const puppeteer = await import('puppeteer')
  const renderer = load<typeof import('../lib/pdf/document-request-pdf')>('lib/pdf/document-request-pdf.tsx', {
    'node:fs': fs, 'node:path': path, puppeteer: puppeteer.default,
  })
  for (const documentTypeId of ['clearance', 'indigency', 'residency', 'cedula', 'first-time-job-seeker', 'barangay-id']) {
    await t.test(documentTypeId, async () => {
      const pdf = await renderer.generateDocumentRequestPdfBuffer({
        id: 'synthetic-download-check', documentTypeId, type: 'Test Certificate', purpose: 'Employment',
        quantity: 1, amount: 0, details: {}, yearsOfResidency: 7, placeOfBirth: 'Cavite', serialNumber: 'BRGY-2026-0001',
        requestedAt: new Date('2026-10-18'), generatedAt: new Date('2026-10-18'),
        resident: { firstName: 'Synthetic', middleName: null, lastName: 'Resident', birthDate: new Date('2000-01-01'), houseNumber: '12', street: 'Sample Street' },
      })
      assert.equal(pdf.subarray(0, 5).toString(), '%PDF-', documentTypeId)
      assert.ok(pdf.byteLength > 1000, documentTypeId)
      assert.match(pdf.subarray(-50).toString(), /%%EOF/, documentTypeId)
      assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length, documentTypeId === 'first-time-job-seeker' ? 2 : 1, documentTypeId)
    })
  }
})
