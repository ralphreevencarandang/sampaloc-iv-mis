import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'
import ts from 'typescript'
import * as policy from '../lib/appointment-policy'
import * as validation from '../validations/appointment.validation'
import * as React from 'react'

export function loadAppointmentModule<T>(file: string, modules: Record<string, unknown>): T {
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText
  const exports = {}
  runInNewContext(compiled, { exports, Date, Intl, FormData, File, URL, Request, Response, console: { error: () => {} }, require: (name: string) => {
    assert.ok(name in modules, `Unexpected dependency: ${name}`); return modules[name]
  } })
  return exports as T
}

test('availability uses Manila calendar, excludes past/closed dates and partial slots', () => {
  const schedule = { enabled: true, operatingDays: [1], opensAt: '08:00', closesAt: '09:10', slotMinutes: 30 }
  const now = new Date('2026-10-18T16:10:00Z') // Monday in Manila
  assert.equal(policy.manilaDate(now), '2026-10-19')
  const slots = policy.slotsForDate(schedule, '2026-10-19', now)
  assert.deepEqual(slots.map(s => s.startsAt.toISOString()), ['2026-10-19T00:00:00.000Z', '2026-10-19T00:30:00.000Z'])
  assert.equal(policy.slotsForDate(schedule, '2026-10-19', new Date('2026-10-19T00:05:00Z')).length, 1)
  for (const date of ['2026-10-18', '2026-10-20', '2026-02-30', 'invalid']) assert.equal(policy.slotsForDate(schedule, date, now).length, 0)
  assert.equal(policy.slotsForDate(null, '2026-10-19', now).length, 0)
  assert.equal(policy.slotsForDate({ ...schedule, enabled: false }, '2026-10-19', now).length, 0)
})

test('workflow rejects terminal changes, early no-show, resident privilege escalation and late cancellation', () => {
  const start = new Date('2026-10-19T00:00Z'), end = new Date('2026-10-19T00:30Z'), before = new Date('2026-10-18T23:00Z')
  for (const status of ['COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW'] as const) assert.throws(() => policy.validateAppointmentTransition(status, 'CONFIRMED', start, end, false, before))
  assert.throws(() => policy.validateAppointmentTransition('PENDING', 'COMPLETED', start, end, false, start))
  assert.throws(() => policy.validateAppointmentTransition('CONFIRMED', 'NO_SHOW', start, end, false, start))
  assert.throws(() => policy.validateAppointmentTransition('PENDING', 'CONFIRMED', start, end, true, before))
  assert.throws(() => policy.validateAppointmentTransition('CONFIRMED', 'CANCELLED', start, end, true, start))
  policy.validateAppointmentTransition('CONFIRMED', 'COMPLETED', start, end, false, before)
  policy.validateAppointmentTransition('CONFIRMED', 'COMPLETED', start, end, false, new Date('2026-10-20T00:00Z'))
  policy.validateAppointmentTransition('PENDING', 'CANCELLED', start, end, true, before)
  policy.validateAppointmentTransition('PENDING', 'CONFIRMED', start, end, false, before)
  policy.validateAppointmentTransition('CONFIRMED', 'COMPLETED', start, end, false, start)
  policy.validateAppointmentTransition('CONFIRMED', 'NO_SHOW', start, end, false, end)
})

test('booking/settings schemas reject malformed inputs, empty reasons and invalid schedules', () => {
  assert.equal(validation.bookingSchema.safeParse({ startsAt: 'bad', reason: 'test' }).success, false)
  for (const status of ['CANCELLED', 'REJECTED']) assert.equal(validation.appointmentChangeSchema.safeParse({ id: 'test', status, reason: ' ' }).success, false)
  const schedule = { enabled: true, operatingDays: [1], opensAt: '08:00', closesAt: '09:00', slotMinutes: 30, capacity: 2, version: 0 }
  assert.equal(validation.clinicScheduleSchema.safeParse(schedule).success, true)
  for (const change of [{ capacity: 0 }, { operatingDays: [] }, { operatingDays: [1, 1] }, { closesAt: '07:00' }, { slotMinutes: 120 }]) assert.equal(validation.clinicScheduleSchema.safeParse({ ...schedule, ...change }).success, false)
})

test('direct appointment actions enforce identity, role, input and after-commit notification behavior', async () => {
  let resident: { id: string } | null = null
  let staff: { id: string } | null = null
  let writes = 0, notifications = 0
  const after: (() => Promise<void>)[] = []
  const actions = loadAppointmentModule<typeof import('../server/actions/appointment.actions')>('server/actions/appointment.actions.ts', {
    'next/server': { after: (fn: () => Promise<void>) => after.push(fn) }, 'next/cache': { revalidatePath: () => {} },
    '@/lib/appointment-authorization': { appointmentResident: async () => resident, appointmentStaff: async () => staff },
    '@/validations/appointment.validation': validation, '@/lib/appointment-policy': policy,
    '@/lib/appointment-email': { sendAppointmentNotification: async () => { notifications++ } },
    '@/lib/appointments': {
      bookAppointment: async (residentId: string) => { writes++; assert.equal(residentId, 'owner'); return { id: 'booking', status: 'PENDING' } },
      changeAppointment: async (input: { status: string }, actor: { id: string; resident: boolean }) => { writes++; assert.equal(actor.id, actor.resident ? 'owner' : 'worker'); return { id: 'booking', status: input.status } },
      saveClinicSchedule: async () => { writes++ },
      startAppointmentConsultation: async (id: string, actorId: string) => { writes++; assert.equal(id, 'booking'); assert.equal(actorId, 'worker'); return { id, consultationStartedAt: 'synthetic' } },
      serializeAppointment: (row: unknown) => row,
    },
  })
  const input = { startsAt: '2099-01-01T00:00:00Z', reason: 'Private reason' }
  assert.equal((await actions.bookClinicAppointmentAction(input)).success, false)
  assert.equal((await actions.changeClinicAppointmentAction({ id: 'booking', status: 'CONFIRMED' }, 'staff')).success, false)
  assert.equal((await actions.saveClinicScheduleAction({})).success, false)
  assert.equal((await actions.startAppointmentConsultationAction('booking')).success, false)
  assert.equal(writes, 0)
  resident = { id: 'owner' }
  assert.equal((await actions.bookClinicAppointmentAction({ ...input, reason: '' })).success, false)
  assert.equal((await actions.bookClinicAppointmentAction({ ...input, residentId: 'forged' })).success, true)
  assert.equal(notifications, 0)
  await after.pop()!()
  assert.equal(notifications, 1)
  assert.equal((await actions.changeClinicAppointmentAction({ id: 'booking', status: 'CONFIRMED' }, 'staff')).success, false)
  staff = { id: 'worker' }
  assert.equal((await actions.startAppointmentConsultationAction({ id: 'booking', actorId: 'forged' })).success, false)
  assert.equal((await actions.startAppointmentConsultationAction('booking')).success, true)
  assert.equal((await actions.changeClinicAppointmentAction({ id: 'booking', status: 'NO_SHOW' }, 'staff')).success, true)
  assert.equal(after.length, 0)
})

test('appointment APIs require sessions and restrict resident reads to the session owner', async () => {
  let resident: { id: string } | null = null
  let worker = false
  let reads = 0
  const modules: Record<string, unknown> = {
    'next/server': { NextResponse: { json: (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), init) } },
    '@/lib/appointment-authorization': { appointmentResident: async () => resident, appointmentStaff: async () => worker ? { id: 'worker' } : null },
    '@/lib/appointment-policy': policy, '@/lib/appointments': { appointmentSelect: { id: true }, serializeAppointment: (row: unknown) => row },
    '@/lib/prisma': {
      clinicAppointment: { findMany: async (args: { where: { residentId?: string } }) => {
        reads++; if (!worker) assert.equal(args.where.residentId, 'owner'); return []
      } }, clinicSchedule: { findUnique: async () => { reads++; return null } },
    },
  }
  const route = loadAppointmentModule<typeof import('../app/api/clinic/appointments/route')>('app/api/clinic/appointments/route.ts', modules)
  const availability = loadAppointmentModule<typeof import('../app/api/clinic/appointments/availability/route')>('app/api/clinic/appointments/availability/route.ts', modules)
  assert.equal((await route.GET(new Request('http://local/api?mode=resident'))).status, 401)
  assert.equal((await route.GET(new Request('http://local/api?mode=staff'))).status, 401)
  assert.equal((await availability.GET()).status, 401); assert.equal(reads, 0)
  resident = { id: 'owner' }
  const response = await route.GET(new Request('http://local/api?mode=resident&residentId=forged'))
  assert.equal(response.status, 200); assert.equal(response.headers.get('Cache-Control'), 'private, no-store')
  assert.equal((await route.GET(new Request('http://local/api?mode=staff'))).status, 401)
  const closed = await availability.GET()
  assert.deepEqual(await closed.json(), { enabled: false, dates: [] })
  worker = true
  assert.equal((await route.GET(new Request('http://local/api?mode=staff'))).status, 200)
})

test('appointment notifications include time/status/instructions but select no symptoms, notes or cancellation narratives', async () => {
  const sent: { subject: string; html: string }[] = []
  const modules: Record<string, unknown> = {
    'server-only': {}, react: React, '@/components/templates/email-template': { EmailTemplate: () => null },
    '@react-email/render': { render: async (element: React.ReactElement) => JSON.stringify(element.props) },
    '@/lib/appointment-policy': policy, '@/lib/nodemailer': { transporter: { sendMail: async (message: { subject: string; html: string }) => { sent.push(message) } } },
    '@/lib/prisma': { clinicAppointment: { findUnique: async (args: { select: Record<string, unknown> }) => {
      assert.deepEqual(Object.keys(args.select).sort(), ['endsAt', 'resident', 'startsAt'])
      return { startsAt: new Date('2026-10-19T00:00Z'), endsAt: new Date('2026-10-19T00:30Z'), resident: { firstName: 'Synthetic', email: 'synthetic@example.invalid' } }
    } } },
  }
  const compiled = ts.transpileModule(readFileSync('lib/appointment-email.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
  const exports: { sendAppointmentNotification?: typeof import('../lib/appointment-email').sendAppointmentNotification } = {}
  runInNewContext(compiled, { exports, URL, process: { env: {} }, console: { error: () => {} }, require: (name: string) => { assert.ok(name in modules, name); return modules[name] } })
  for (const status of ['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED'] as const) await exports.sendAppointmentNotification!('synthetic', status)
  assert.equal(sent.length, 4)
  for (const message of sent) { assert.match(message.html, /Philippine time/); assert.match(message.html, /My Account/); assert.doesNotMatch(message.html, /symptoms|diagnosis|reason|notes/i) }
  assert.match(sent[0].html, /wait for clinic confirmation/)
  assert.match(sent[1].html, /bring a valid ID/)
})
