import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { render } from '@react-email/render';
import nodemailer from 'nodemailer';
import { EmailTemplate } from '../components/templates/email-template';
import { AdminRole } from '../app/generated/prisma/enums';
import * as validation from '../validations/staff-email.validation';
import * as rbac from '../lib/rbac';

const valid = { recipient: 'recipient@example.invalid', subject: 'Test subject', message: 'Synthetic message\nSecond line', submissionId: 'c1ca5f7a-51d8-443f-8438-e54e100a44c1' };
function load<T>(file: string, modules: Record<string, unknown>, logs: unknown[] = [], env: Record<string, string> = {}): T {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, { exports, process: { env }, Error, console: { error: (...args: unknown[]) => logs.push(args) }, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  return exports as T;
}

test('email validation requires one recipient, bounded text and injection-safe headers', () => {
  const parsed = validation.staffEmailSendSchema.safeParse({ ...valid, recipient: '  RECIPIENT@example.invalid  ', subject: ' Test ', message: ' Body ' });
  assert.ok(parsed.success); assert.equal(parsed.data.recipient, valid.recipient); assert.equal(parsed.data.subject, 'Test'); assert.equal(parsed.data.message, 'Body');
  for (const patch of [
    { recipient: '' }, { recipient: 'a@example.invalid,b@example.invalid' }, { recipient: 'a@example.invalid\r\nBcc: b@example.invalid' },
    { subject: '' }, { subject: '  ' }, { subject: 'Title\r\nBcc: target@example.invalid' }, { subject: 'bad\u0001header' }, { subject: 'a'.repeat(201) },
    { message: '' }, { message: '   ' }, { message: 'a'.repeat(5001) }, { message: 'bad\u0000message' }, { submissionId: 'invalid' }, { bcc: 'unwanted@example.invalid' },
  ]) assert.equal(validation.staffEmailSendSchema.safeParse({ ...valid, ...patch }).success, false);
  assert.ok(validation.staffEmailSendSchema.safeParse({ ...valid, subject: 'a'.repeat(200), message: 'a'.repeat(5000) }).success);
});

test('RBAC, authoritative page and sidebar permit only Admin/Secretary/Clerk accounts', async () => {
  const modules: Record<string, unknown> = {
    'react/jsx-runtime': await import('react/jsx-runtime'),
    '@/components/ui/Admin/SendEmailForm': { default: () => React.createElement('p', null, 'Form'), __esModule: true },
    '@/lib/rbac': rbac,
  };
  let role: AdminRole | null = null;
  modules['@/lib/admin-session'] = { getCurrentAdminFromSession: async () => role ? { role } : null };
  modules['next/navigation'] = { redirect: (path: string) => { throw new Error('redirect:' + path); } };
  const page = load<typeof import('../app/(Admin)/admin/send-email/page')>('app/(Admin)/admin/send-email/page.tsx', modules);
  for (const current of [null, ...Object.values(AdminRole)]) {
    role = current;
    const allowed = current === 'ADMIN' || current === 'CLERK';
    assert.equal(rbac.canAccessResource(current, 'email'), allowed);
    assert.equal(rbac.canAccessResource(current, 'email', 'write'), allowed);
    assert.equal(rbac.getReadableResources(current).includes('email'), allowed);
    if (allowed) assert.match(renderToStaticMarkup(await page.default()), /Send Email/);
    else await assert.rejects(page.default(), /redirect:/);
  }
  assert.equal(rbac.getResourceForAdminPath('/admin/send-email'), 'email');
  assert.equal(rbac.getResourceForAdminPath('/admin/send-email/nested'), 'email');
  const sidebar = load<typeof import('../components/ui/AdminSidebar')>('components/ui/AdminSidebar.tsx', {
    react: React, 'react/jsx-runtime': await import('react/jsx-runtime'),
    '@tanstack/react-query': { useMutation: () => ({ isPending: false }) },
    'next/link': { default: ({ children, ...props }: React.ComponentProps<'a'>) => React.createElement('a', props, children), __esModule: true },
    'next/navigation': { usePathname: () => '/admin/send-email', useRouter: () => ({}) },
    'lucide-react': new Proxy({}, { get: () => () => null }),
    '@/server/actions/auth.actions': {}, 'next/image': { default: () => null, __esModule: true }, '@/public/images/sampaloc-logo.png': {}, '@/lib/rbac': rbac,
  });
  for (const current of Object.values(AdminRole)) {
    const html = renderToStaticMarkup(React.createElement(sidebar.default, { role: current }));
    assert.equal(html.includes('href="/admin/send-email"'), current === 'ADMIN' || current === 'CLERK');
  }
});

test('server action checks roles and validation before reserving or sending, and respects replay/provider outcomes', async () => {
  let role: AdminRole | null = null, reserved = 0, sent = 0;
  let permit: Record<string, unknown> = { kind: 'reserved', reservation: { attemptKey: 'attempt', fingerprintKey: 'fingerprint' } };
  let outcome = 'accepted', failReservation = false, failFinish = false;
  const logs: unknown[] = [];
  const action = load<typeof import('../server/actions/staff-email.actions')>('server/actions/staff-email.actions.ts', {
    '@/lib/admin-session': { getCurrentAdminFromSession: async () => role ? { id: 'synthetic-staff', role } : null }, '@/lib/rbac': rbac,
    '@/validations/staff-email.validation': validation,
    '@/lib/staff-email-limits': { reserveStaffEmail: async () => { reserved++; if (failReservation) throw Error('private-detail'); return permit; }, finishStaffEmail: async () => { if (failFinish) throw Error('private-detail'); } },
    '@/lib/staff-email-delivery': { deliverStaffEmail: async () => { sent++; return outcome; } },
  }, logs);
  for (const current of [null, 'SK', 'PEACE_AND_ORDER', 'PUNONG_BARANGAY', 'HEALTH_WORKER'] as const) { role = current; assert.equal((await action.sendStaffEmailAction(valid)).success, false); }
  assert.equal(reserved, 0); assert.equal(sent, 0);
  for (const current of ['ADMIN', 'CLERK'] as const) { role = current; assert.equal((await action.sendStaffEmailAction(valid)).success, true); }
  assert.equal(sent, 2);
  assert.equal((await action.sendStaffEmailAction({ ...valid, subject: 'bad\r\nheader' })).success, false); assert.equal(sent, 2);
  permit = { kind: 'accepted' }; assert.equal((await action.sendStaffEmailAction(valid)).success, true); assert.equal(sent, 2);
  permit = { kind: 'blocked', message: 'Wait', retryAfterSeconds: 60 }; assert.equal((await action.sendStaffEmailAction(valid)).retryAfterSeconds, 60); assert.equal(sent, 2);
  permit = { kind: 'reserved', reservation: { attemptKey: 'attempt', fingerprintKey: 'fingerprint' } };
  for (const state of ['rejected', 'uncertain', 'unavailable']) { outcome = state; const result = await action.sendStaffEmailAction(valid); assert.equal(result.success, false); assert.equal(result.canRetry, state !== 'uncertain'); }
  outcome = 'accepted'; failFinish = true; assert.equal((await action.sendStaffEmailAction(valid)).success, true);
  failReservation = true; assert.equal((await action.sendStaffEmailAction(valid)).success, false);
  assert.equal(JSON.stringify(logs).includes('private-detail'), false); assert.equal(JSON.stringify(logs).includes(valid.recipient), false);
});

test('delivery uses the system sender, captures both safe HTML and text, and handles provider uncertainty without logging message data', async () => {
  const capture = nodemailer.createTransport({ jsonTransport: true });
  let mode = 'accepted'; let captured: Record<string, unknown> = {};
  const logs: unknown[] = [];
  const modules: Record<string, unknown> = {
    'server-only': {}, '@react-email/render': { render }, react: React,
    '@/components/templates/email-template': { EmailTemplate },
    '@/lib/nodemailer': { transporter: { sendMail: async (options: Record<string, unknown>) => {
      if (mode === 'negative') throw { responseCode: 550, message: 'private-message', recipient: valid.recipient };
      if (mode === 'timeout') throw { code: 'ETIMEDOUT', message: 'private-message' };
      const info = await capture.sendMail(options); captured = JSON.parse(String(info.message));
      return mode === 'accepted' ? { accepted: [valid.recipient], rejected: [] } : mode === 'rejected' ? { accepted: [], rejected: [valid.recipient] } : {};
    } } },
  };
  const env = { SMTP_FROM: 'System <system@example.invalid>', SMTP_USER: 'synthetic', SMTP_PASSWORD: 'synthetic' };
  const delivery = load<typeof import('../lib/staff-email-delivery')>('lib/staff-email-delivery.ts', modules, logs, env);
  const content = { recipient: valid.recipient, subject: 'Test <subject>', message: '<script>alert(1)</script>\n<img src=x onerror=alert(1)>\nSecond line' };
  assert.equal(await delivery.deliverStaffEmail(content), 'accepted');
  assert.equal(captured.subject, content.subject); assert.equal(captured.text, content.message);
  assert.match(String(captured.html), /&lt;script&gt;/); assert.equal(String(captured.html).includes('<script>'), false); assert.equal(String(captured.html).includes('<img src=x'), false);
  assert.match(JSON.stringify(captured.from), /system@example.invalid/);
  for (const [state, expected] of [['negative','rejected'],['timeout','uncertain'],['rejected','rejected'],['missing','uncertain']] as const) { mode = state; assert.equal(await delivery.deliverStaffEmail(content), expected); }
  const unavailable = load<typeof import('../lib/staff-email-delivery')>('lib/staff-email-delivery.ts', modules, logs, {});
  assert.equal(await unavailable.deliverStaffEmail(content), 'unavailable');
  assert.equal(JSON.stringify(logs).includes('private-message'), false); assert.equal(JSON.stringify(logs).includes(valid.recipient), false); assert.equal(JSON.stringify(logs).includes('<script>'), false);
});
