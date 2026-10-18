import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import * as React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import * as icons from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as policy from '../lib/medicine-inventory'
import { clinicMedicinesQueryOptions } from '../lib/clinic-medicines-query'

const compiled = ts.transpileModule(readFileSync('components/ui/Clinic/ClinicMedicinesPage.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText

const fixture = (id: number, quantity = 20): policy.ClinicMedicine => ({
  id: `medicine-${id}`, name: `Medicine ${String(id).padStart(2, '0')}`, quantity, unit: 'tablets',
  expiresOn: '2099-01-01', ...policy.medicineAvailability({ quantity, expiresOn: '2099-01-01' }),
})

function render(options: {
  data?: policy.ClinicMedicine[]; search?: string; status?: string; page?: number; pending?: boolean; error?: boolean
} = {}) {
  let stateIndex = 0
  const state = [options.search ?? '', options.status ?? '', options.page ?? 1]
  const modules: Record<string, unknown> = {
    react: { ...React, useState: () => [state[stateIndex++], () => {}] },
    'react/jsx-runtime': jsxRuntime, 'lucide-react': icons,
    'next/link': ({ children, ...props }: React.ComponentProps<'a'>) => React.createElement('a', props, children),
    '@tanstack/react-query': { useQuery: (query: unknown) => {
      assert.equal(query, clinicMedicinesQueryOptions)
      return { data: options.data, isPending: options.pending ?? false, isError: options.error ?? false, isFetching: false, dataUpdatedAt: 0 }
    } },
    '@/lib/clinic-medicines-query': { clinicMedicinesQueryOptions },
    '@/lib/medicine-inventory': policy,
  }
  const exports: { default?: React.ComponentType } = {}
  runInNewContext(compiled, { exports, require: (name: string) => { assert.ok(name in modules, name); return modules[name] } })
  return renderToStaticMarkup(React.createElement(exports.default!))
}

test('medicine list is read-only with stock, semantic badges, expiry and a medical-record link', () => {
  const html = render({ data: [fixture(1), fixture(2, 4), fixture(3, 0), { ...fixture(4), expiresOn: '2000-01-01' }] })
  assert.match(html, /20<\/td>/)
  assert.match(html, /tablets/)
  assert.match(html, /bg-primary-50[^>]*>Available/)
  assert.match(html, /bg-stock-low-surface[^>]*>Low Stock/)
  assert.match(html, /bg-stock-empty-surface[^>]*>Out of Stock/)
  assert.match(html, /Cannot dispense: Expired/)
  assert.match(html, /href="\/clinic\/medical-records"/)
  assert.doesNotMatch(html, /Add Medicine|Edit Medicine|Delete|Restock|type="number"|Dispense selected/)
})

test('search and stock filters combine, pagination uses ten rows and clamps after stock changes', () => {
  const data = Array.from({ length: 15 }, (_, index) => fixture(index + 1, index % 2 ? 5 : 20))
  const first = render({ data })
  assert.match(first, /Medicine 10/)
  assert.doesNotMatch(first, /Medicine 11/)
  const second = render({ data, page: 2 })
  assert.match(second, /Medicine 11/)
  assert.match(second, /Showing 11–15 of 15 medicines/)
  assert.doesNotMatch(second, /Medicine 01/)
  const filtered = render({ data, search: '  MEDICINE 0 ', status: 'Low Stock' })
  assert.match(filtered, /Medicine 02/)
  assert.doesNotMatch(filtered, /Medicine 01|Medicine 10/)
  assert.match(render({ data: [fixture(1)], page: 5 }), /Page 1 of 1/)
})

test('loading, initial errors, failed refreshes and both empty states are distinct', () => {
  assert.match(render({ pending: true }), /Loading medicine inventory/)
  const error = render({ error: true })
  assert.match(error, /Unable to load medicine inventory/)
  assert.doesNotMatch(error, /No medicines available/)
  const stale = render({ data: [fixture(1)], error: true })
  assert.match(stale, /may be outdated/)
  assert.match(stale, /Medicine 01/)
  assert.match(render({ data: [] }), /No medicines available/)
  assert.match(render({ data: [fixture(1)], search: 'missing' }), /No matching medicines/)
})

test('shared medicine query reads the existing endpoint without caching and handles failures safely', async () => {
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, '/api/clinic/medicines')
      assert.equal(options?.cache, 'no-store')
      return Response.json([fixture(1)])
    }
    assert.equal(clinicMedicinesQueryOptions.refetchInterval, 15000)
    assert.equal(clinicMedicinesQueryOptions.refetchOnWindowFocus, 'always')
    assert.equal((await clinicMedicinesQueryOptions.queryFn()).length, 1)
    globalThis.fetch = async () => new Response('Internal details', { status: 500 })
    await assert.rejects(() => clinicMedicinesQueryOptions.queryFn(), /Unable to load medicine stock/)
  } finally {
    globalThis.fetch = originalFetch
  }
})
