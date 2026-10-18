import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import * as React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import * as icons from 'lucide-react'
import * as catalog from '../lib/document-request-catalog'
import * as serialization from '../lib/document-request-utils'
import * as policy from '../lib/document-request-policy'
import { DocumentProcessingNotice } from '../components/document-requests/document-processing-notice'
import { documentRequestSchema } from '../validations/document.validation'
import { ACTIVE_REQUEST_MESSAGE, JOB_SEEKER_AVAILED_MESSAGE, documentUnitPrice, getDocumentRequestBlock } from '../lib/document-request-policy'

test('job seeker is free even when a setting supplies a nonzero fee and accepts one copy only', () => {
  assert.equal(documentUnitPrice('first-time-job-seeker', 900), 0)
  assert.equal(documentUnitPrice('clearance', 75), 75)
  for (const requestedCopies of ['1', '2', '5']) {
    assert.equal(documentRequestSchema.safeParse({ documentType: 'first-time-job-seeker', requestedCopies, yearsOfResidency: '5' }).success, requestedCopies === '1')
  }
})

test('resident form blocks existing requests, links history, and locks free job seeker quantity', () => {
  const compiled = ts.transpileModule(readFileSync('app/(Resident)/request-documents/request-documents-client.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  function render(documentType: string, status?: string, failedHistory = false) {
    let stateIndex = 0
    const history = status ? [{ id: 'existing', documentType, type: 'Certificate', status, detailLines: [], submittedAt: '2026-10-16', amount: 0 }] : []
    const modules: Record<string, unknown> = {
      react: { ...React, useEffect: () => {}, useMemo: (fn: () => unknown) => fn(), useState: (initial: unknown) => {
        const index = stateIndex++
        return [index === 0 ? false : index === 1 ? documentType : initial, () => {}]
      } },
      'react/jsx-runtime': jsxRuntime, 'lucide-react': icons,
      'next/link': ({ children, ...props }: React.ComponentProps<'a'>) => React.createElement('a', props, children),
      '@tanstack/react-query': {
        useQueryClient: () => ({}), useMutation: () => ({ isPending: false }),
        useQuery: ({ queryKey }: { queryKey: string[] }) => queryKey[0] === 'document-types-settings'
          ? { data: [{ documentTypeId: 'first-time-job-seeker', price: 999 }] }
          : { data: history, isSuccess: !failedHistory, isError: failedHistory },
      },
      '@/lib/document-request-utils': serialization, '@/lib/document-request-policy': policy,
      '@/lib/document-request-catalog': catalog, '@/lib/document-requests-api': {}, '@/server/actions/document.actions': {},
      '@/components/document-requests/document-processing-notice': { DocumentProcessingNotice },
    }
    const exports: { default?: React.ComponentType<Record<string, unknown>> } = {}
    runInNewContext(compiled, { exports, require: (name: string) => { assert.ok(name in modules, name); return modules[name] } })
    return renderToStaticMarkup(React.createElement(exports.default!, { residentProfile: {
      id: 'resident', firstName: 'Test', lastName: 'Resident', birthDate: '2000-01-01', houseNumber: '1', street: 'Test', citizenship: 'Filipino', civilStatus: 'Single',
    } }))
  }
  const job = render('first-time-job-seeker', 'GENERATED')
  assert.match(job, /24 working hours/)
  assert.match(job, /weekends and holidays/)
  assert.ok(job.includes(JOB_SEEKER_AVAILED_MESSAGE))
  assert.match(job, /href="#request-existing"/)
  assert.match(job, /id="request-existing"/)
  assert.match(job, /type="submit" disabled=""/)
  assert.match(job, /id="request-quantity"[^>]*disabled=""[^>]*value="1"/)
  assert.ok(job.includes('₱0.00'))
  assert.ok(!job.includes('₱999'))
  assert.ok(render('clearance', 'APPROVED').includes(ACTIVE_REQUEST_MESSAGE))
  assert.doesNotMatch(render('clearance', 'REJECTED'), /type="submit" disabled=""/)
  assert.match(render('clearance', undefined, true), /type="submit" disabled=""/)
})

test('active requests block only their document type, regardless of archive visibility', () => {
  for (const status of ['PENDING', 'REVIEW', 'APPROVED']) {
    const history = [{ id: 'existing', documentType: 'clearance', status, isArchived: true }]
    assert.deepEqual(getDocumentRequestBlock('clearance', history), { message: ACTIVE_REQUEST_MESSAGE, requestId: 'existing' })
    assert.equal(getDocumentRequestBlock('residency', history), null)
  }
})

test('issuance and legacy release timestamps permanently block job seeker, while unsuccessful terminal requests allow retries', () => {
  for (const status of ['REJECTED']) {
    assert.equal(getDocumentRequestBlock('first-time-job-seeker', [{ id: 'old', documentType: 'first-time-job-seeker', status }]), null)
  }
  for (const record of [{ status: 'GENERATED' }, { status: 'APPROVED', releasedAt: new Date() }, { status: 'REVIEW', generatedAt: new Date() }]) {
    const history = [{ id: 'old', documentType: 'FIRST_TIME_JOB_SEEKER', isArchived: true, ...record }]
    assert.equal(getDocumentRequestBlock('first-time-job-seeker', history)?.message, JOB_SEEKER_AVAILED_MESSAGE)
  }
  assert.equal(getDocumentRequestBlock('clearance', [{ id: 'old', documentType: 'clearance', status: 'GENERATED' }]), null)
})
