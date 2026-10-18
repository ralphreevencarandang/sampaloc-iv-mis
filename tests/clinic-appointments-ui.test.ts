import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'
import ts from 'typescript'
import * as React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import * as icons from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as policy from '../lib/appointment-policy'
import * as validation from '../validations/appointment.validation'
import type { AppointmentItem } from '../lib/appointment-types'

const rows: AppointmentItem[] = Array.from({ length: 12 }, (_, i) => ({
  id: `appointment-${i}`, residentId: `patient-${i}`, residentName: `Synthetic Resident ${i}`, contactNumber: null,
  startsAt: '2099-01-01T00:00:00.000Z', endsAt: '2099-01-01T00:30:00.000Z', status: 'PENDING',
  reason: 'Synthetic reason', notes: null, medicalRecordId: null, updatedAt: '2026-10-18T00:00:00.000Z', history: [],
  consultationStartedAt: null,
}))
function render(options: { mode?: 'staff' | 'resident'; canWrite?: boolean; loading?: boolean; error?: boolean; empty?: boolean; search?: string; page?: number; confirmed?: boolean; started?: boolean } = {}) {
  let stateIndex = 0
  const modules: Record<string, unknown> = {
    react: { ...React, useState: (initial: unknown) => {
      const index = stateIndex++; return [index === 0 ? options.search ?? '' : index === 3 ? options.page ?? 1 : initial, () => {}]
    } },
    'react/jsx-runtime': jsxRuntime, 'lucide-react': icons,
    'next/link': (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => React.createElement('a', props),
    'react-hot-toast': { default: { success: () => {} } },
    '@tanstack/react-query': { useQueryClient: () => ({}), useMutation: () => ({ isPending: false }), useQuery: () => ({
      data: options.loading ? undefined : { appointments: options.empty ? [] : rows.map(r => ({ ...r, status: options.confirmed ? 'CONFIRMED' : r.status, consultationStartedAt: options.started ? '2026-10-18T00:00:00Z' : null })), canWrite: options.canWrite ?? true },
      isPending: options.loading ?? false, isError: options.error ?? false, error: new Error('Synthetic refresh failure'),
    }) },
    '@/lib/appointment-query': { appointmentQuery: () => ({}) }, '@/lib/appointment-policy': policy,
    '@/validations/appointment.validation': validation, '@/server/actions/appointment.actions': {}, './AppointmentDialog': {},
  }
  const compiled = ts.transpileModule(readFileSync('components/ui/Clinic/AppointmentHistory.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  const exports: { default?: React.ComponentType<{ mode: string }>; ConsultationSummary?: React.ComponentType<{ records: { visitType?: string }[] }> } = {}
  runInNewContext(compiled, { exports, Date, Intl, require: (name: string) => { assert.ok(name in modules, name); return modules[name] } })
  return { html: renderToStaticMarkup(React.createElement(exports.default!, { mode: options.mode ?? 'staff' })),
    summary: renderToStaticMarkup(React.createElement(exports.ConsultationSummary!, { records: [{ visitType: 'APPOINTMENT' }, { visitType: 'WALK_IN' }, {}] })) }
}
test('clinic appointment UI shows summary, today queue, actions and ten-row pagination', () => {
  const { html, summary } = render()
  assert.match(html, /Total Appointments/); assert.match(html, /Today’s appointments/)
  assert.match(html, /Confirm/); assert.match(html, /Reject/); assert.match(html, /Page 1 of 2/)
  assert.match(html, /Synthetic Resident 9/); assert.doesNotMatch(html, /Synthetic Resident 10/)
  assert.match(summary, /Total Consultations/); assert.match(summary, /Walk-In Visits/); assert.match(summary, /Appointment Visits/)
  assert.match(render({ page: 2 }).html, /Synthetic Resident 11/)
  assert.match(render({ search: 'Resident 11' }).html, /1 appointments/)
})
test('resident and read-only clinic views do not expose staff mutations; failed refresh blocks actions', () => {
  const resident = render({ mode: 'resident' }).html
  assert.match(resident, /My Clinic Appointments/); assert.match(resident, /Cancel/)
  assert.doesNotMatch(resident, />Confirm<|>Reject<|Start Consultation|Total Appointments/)
  assert.doesNotMatch(render({ canWrite: false }).html, />Confirm<|>Reject<|>Cancel</)
  assert.doesNotMatch(render({ error: true }).html, />Confirm<|>Reject</)
  assert.match(render({ error: true }).html, /may be outdated/)
})
test('appointment UI covers loading, empty, no matches and clamped pagination', () => {
  assert.match(render({ loading: true }).html, /Loading appointments/)
  assert.match(render({ empty: true, page: 7 }).html, /No clinic appointments yet/)
  assert.match(render({ empty: true, page: 7 }).html, /Page 1 of 1/)
  assert.match(render({ search: 'not present' }).html, /No appointments match your filters/)
})
test('future confirmed appointments allow start and persisted starts expose resume', () => {
  const html = render({ confirmed: true }).html
  assert.match(html, /Start Consultation/)
  assert.doesNotMatch(html, /disabled=""[^>]*>Start Consultation/)
  assert.match(render({ confirmed: true, started: true }).html, /Resume Consultation/)
  assert.doesNotMatch(render().html, /Start Consultation|Resume Consultation/)
})
