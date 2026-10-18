import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import * as React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import * as policy from '../lib/medicine-inventory'

function render(options: { canDispense?: boolean; failed?: boolean; quantity?: string; pending?: boolean } = {}) {
  const medicines = [
    { id: 'available', name: 'Available medicine', quantity: 12, unit: 'tablets', expiresOn: '2099-01-01' },
    { id: 'expired', name: 'Expired medicine', quantity: 9, unit: 'capsules', expiresOn: '2000-01-01' },
    { id: 'empty', name: 'Empty medicine', quantity: 0, unit: 'bottles', expiresOn: '2099-01-01' },
    { id: 'unknown', name: 'Unknown expiry', quantity: 5, unit: 'pcs', expiresOn: null },
  ]
  const compiled = ts.transpileModule(readFileSync('components/ui/Clinic/MedicineDispensingPanel.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  let stateIndex = 0
  const modules: Record<string, unknown> = {
    react: { ...React, useRef: (value: unknown) => ({ current: value }), useState: (initial: unknown) => {
      const index = stateIndex++
      return [index === 1 ? { available: options.quantity ?? '' } : typeof initial === 'function' ? initial() : initial, () => {}]
    } },
    'react/jsx-runtime': jsxRuntime,
    '@tanstack/react-query': {
      useQueryClient: () => ({ getQueryData: () => options.pending ? { dispenseKey: 'saved' } : undefined }),
      useMutation: () => ({ isPending: false }),
      useQuery: ({ queryKey }: { queryKey: string[] }) => ({
        data: queryKey[0] === 'clinic-medicines' ? medicines : { canDispense: options.canDispense ?? true, history: [] },
        isPending: false, isError: options.failed ?? false,
      }),
    },
    '@/lib/medicine-inventory': policy, '@/server/actions/dispensing.actions': {},
    '@/lib/clinic-medicines-query': { clinicMedicinesQueryOptions: { queryKey: ['clinic-medicines'] } },
  }
  const exports: { default?: React.ComponentType<{ recordId: string }> } = {}
  runInNewContext(compiled, { exports, require: (name: string) => { assert.ok(name in modules, name); return modules[name] } })
  return renderToStaticMarkup(React.createElement(exports.default!, { recordId: 'visit' }))
}

test('clinic shows stock, units, status and disables expired, empty or unknown-expiry selections', () => {
  const html = render()
  assert.match(html, /12 tablets · Available/)
  assert.match(html, /9 capsules · Low Stock/)
  assert.match(html, /0 bottles · Out of Stock/)
  for (const id of ['expired', 'empty', 'unknown']) assert.match(html, new RegExp(`id="quantity-${id}"[^>]*disabled=""`))
  assert.match(html, /Search medicines/)
})

test('insufficient quantity and failed stock loading disable dispensing', () => {
  assert.match(render({ quantity: '13' }), /disabled=""[^>]*>Dispense selected medicines/)
  assert.match(render({ quantity: '2', failed: true }), /disabled=""[^>]*>Dispense selected medicines/)
  assert.doesNotMatch(render({ quantity: '2' }), /disabled=""[^>]*>Dispense selected medicines/)
})

test('read-only viewers cannot see dispensing controls; uncertain requests offer the same retry', () => {
  const readonly = render({ canDispense: false })
  assert.doesNotMatch(readonly, /Quantity to dispense|Dispense selected medicines/)
  const pending = render({ pending: true, quantity: '13' })
  assert.match(pending, /Retry same dispensing/)
  assert.doesNotMatch(pending, /disabled=""[^>]*>Retry same dispensing/)
  assert.match(pending, /id="quantity-available"[^>]*disabled=""/)
})
