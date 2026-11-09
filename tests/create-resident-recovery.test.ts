import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
import { QueryClient, MutationObserver } from '@tanstack/query-core';
import * as validation from '../validations/resident.validation';
import * as inputs from '../components/ui/resident-inputs';
import * as voting from '../lib/resident-registration';
import * as demographics from '../lib/resident-demographics';
import * as images from '../lib/valid-id-image';
import { AdminRole } from '../app/generated/prisma/enums';

function load<T>(file: string, modules: Record<string, unknown>, log: unknown[] = []): T {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, { exports, File, FormData, Error, console: { error: (...args: unknown[]) => log.push(args) }, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  return exports as T;
}

test('the actual modal forwards only FormData through Next argument filtering and encoding', async () => {
  const require = createRequire(import.meta.url);
  const { encodeReply, createServerReference, createTemporaryReferenceSet } = require('next/dist/compiled/react-server-dom-turbopack/client.browser') as {
    encodeReply: (args: unknown[], options?: { temporaryReferences: unknown }) => Promise<unknown>;
    createTemporaryReferenceSet: () => unknown;
    createServerReference: (id: string, call: (id: string, args: unknown[]) => Promise<unknown>) => (data: FormData) => Promise<unknown>;
  };
  let sent = 0, closed = 0, invalidated = 0;
  const { omitUnusedArgs, extractInfoFromServerReferenceId } = require('next/dist/shared/lib/server-reference-info') as { omitUnusedArgs: (args: unknown[], info: unknown) => unknown[]; extractInfoFromServerReferenceId: (id: string) => unknown };
  const actionId = '40' + '0'.repeat(38);
  const action = createServerReference(actionId, async (id, args) => { const usedArgs = omitUnusedArgs(args, extractInfoFromServerReferenceId(id)); await encodeReply(usedArgs, { temporaryReferences: createTemporaryReferenceSet() }); sent++; return { success: true }; });
  const client = new QueryClient();
  const data = new FormData(); data.set('synthetic', 'value');
  await new MutationObserver(client, { mutationFn: action, retry: false }).mutate(data);
  assert.equal(sent, 1);
  type Result = { success: boolean; message: string; fieldErrors?: Record<string, string> };
  let mutation!: { mutationFn: (data: FormData) => Promise<Result>; onSuccess: (result: Result) => void; onError: (error: Error) => void };
  const states: unknown[] = []; let cursor = 0;
  const modules: Record<string, unknown> = {
    react: { useState: (initial: unknown) => { const index = cursor++; states[index] = initial; return [initial, (next: unknown) => { states[index] = typeof next === 'function' ? next(states[index]) : next; }]; }, useEffect: () => {} },
    'react/jsx-runtime': {}, 'react-hook-form': { useForm: () => ({}) }, '@hookform/resolvers/zod': { zodResolver: () => {} },
    '@tanstack/react-query': { useMutation: (options: typeof mutation) => { mutation = options; return { isPending: false }; }, useQueryClient: () => ({ invalidateQueries: () => { invalidated++; } }) },
    'lucide-react': {}, 'react-hot-toast': { success: () => {}, error: () => {} },
    '@/server/actions/resident.actions': { createAdminResidentAction: action }, '@/validations/resident.validation': validation,
    '@/components/ui/resident-inputs': inputs, '@/lib/resident-registration': voting, '@/lib/resident-demographics': demographics, '@/lib/valid-id-image': images,
  };
  const component = load<typeof import('../components/ui/Admin/CreateResidentModal')>('components/ui/Admin/CreateResidentModal.tsx', modules);
  component.default({ isOpen: false, onClose: () => { closed++; } });
  await new MutationObserver(client, { mutationFn: mutation.mutationFn, retry: false }).mutate(data);
  assert.equal(sent, 2);
  mutation.onError(new Error('internal sensitive detail'));
  assert.match(JSON.stringify(states[2]), /Unable to create resident/);
  assert.equal(JSON.stringify(states[2]).includes('internal sensitive'), false);
  mutation.onError(new Error('413 payload too large'));
  assert.match(JSON.stringify(states[2]), /smaller image/);
  mutation.onSuccess({ success: false, message: 'Email already exists.', fieldErrors: { email: 'Email already exists.' } });
  assert.match(JSON.stringify(states[2]), /Email already exists/); assert.equal(closed, 0); assert.equal(invalidated, 0);
  mutation.onSuccess({ success: true, message: 'Created' });
  assert.equal(closed, 1); assert.equal(invalidated, 1);
});

const valid = { email: 'synthetic@example.invalid', password: 'Example123!', confirmPassword: 'Example123!', firstName: 'Synthetic', lastName: 'Resident', birthDate: '2000-01-01', gender: 'Female', civilStatus: 'Single', street: 'Test', houseNumber: '1', contactNumber: '09123456789', citizenship: 'Filipino', isVoter: 'No', is4Ps: 'No', isPwd: 'No', idType: 'National ID', idNumber: 'synthetic-id' };
export function registrationForm(patch: Record<string, string> = {}, file: File | null = new File(['synthetic'], 'id.png', { type: 'image/png' })) {
  const result = new FormData(); for (const [key, value] of Object.entries({ ...valid, ...patch })) result.set(key, value);
  if (file) result.set('validIDImage', file); return result;
}

test('Admin/Secretary creation shares registration validation, catches duplicates and returns safe diagnostics', async () => {
  let role: AdminRole | null = null;
  let duplicate = '', failure: unknown = null, uploads = 0;
  const writes: Record<string, unknown>[] = [], paths: string[] = [], logs: unknown[] = [];
  class CloudinaryUploadError extends Error {}
  const actions = load<typeof import('../server/actions/resident.actions')>('server/actions/resident.actions.ts', {
    bcryptjs: { hash: async () => 'synthetic-hash' }, '@/lib/cloudinary': { CloudinaryUploadError, uploadImageToCloudinary: async () => { uploads++; if (failure instanceof CloudinaryUploadError) throw failure; return { secure_url: 'https://example.invalid/id.png' }; } },
    '@/lib/prisma': { resident: { findUnique: async () => duplicate === 'resident' ? { id: 'duplicate' } : null, findFirst: async () => duplicate === 'id' ? { id: 'duplicate' } : null }, admin: { findUnique: async () => duplicate === 'admin' ? { id: 'duplicate' } : null }, $transaction: async (callback: (tx: unknown) => unknown) => { if (failure) throw failure; return callback({ resident: { create: async ({ data }: { data: Record<string, unknown> }) => { writes.push(data); } } }); } },
    '@/lib/valid-id-image': images, '@/validations/resident.validation': validation, 'next/cache': { revalidatePath: (path: string) => paths.push(path) }, '@/lib/nodemailer': {}, '@/lib/admin-authorization': {},
    '@/lib/admin-session': { getCurrentAdminFromSession: async () => role ? { role } : null }, '@/app/generated/prisma/enums': { AdminRole },
  }, logs);
  for (const denied of [null, AdminRole.SK, AdminRole.PEACE_AND_ORDER, AdminRole.PUNONG_BARANGAY, AdminRole.HEALTH_WORKER]) { role = denied; assert.equal((await actions.createAdminResidentAction(registrationForm())).success, false); }
  assert.equal(uploads, 0);
  for (const allowed of [AdminRole.ADMIN, AdminRole.CLERK]) {
    role = allowed; assert.equal((await actions.createAdminResidentAction(registrationForm())).success, true);
  }
  assert.equal(writes.length, 2); assert.equal(paths.length, 2);
  assert.equal(writes[0].contactNumber, '+639123456789'); assert.equal(writes[0].password, 'synthetic-hash'); assert.equal(writes[0].validIDImage, 'https://example.invalid/id.png'); assert.equal(writes[0].isVoter, false);
  const invalid: Record<string, string>[] = [{ email: '' }, { password: 'short' }, { contactNumber: '8123456789' }, { idNumber: '' }, { birthDate: '2020-01-01', isVoter: 'Yes', precinctNumber: '001' }];
  for (const patch of invalid) assert.equal((await actions.createAdminResidentAction(registrationForm(patch))).success, false);
  for (const file of [null, new File(['bad'], 'id.pdf', { type: 'application/pdf' }), new File([new Uint8Array(images.MAX_VALID_ID_IMAGE_SIZE_BYTES + 1)], 'id.png', { type: 'image/png' })]) assert.equal((await actions.createAdminResidentAction(registrationForm({}, file))).success, false);
  for (const kind of ['resident', 'admin', 'id']) { duplicate = kind; assert.equal((await actions.createAdminResidentAction(registrationForm())).success, false); }
  duplicate = ''; assert.equal(writes.length, 2); assert.equal(uploads, 2);
  for (const code of ['P2002', 'P1001', 'P2024', 'P2022']) {
    failure = { code, message: 'synthetic-private-data', meta: { value: 'synthetic-secret' } };
    const result = await actions.createAdminResidentAction(registrationForm()); assert.equal(result.success, false);
    if (code === 'P2002') assert.match(result.message, /already exists/);
    if (code === 'P1001') assert.match(result.message, /temporarily unavailable/);
  }
  failure = new CloudinaryUploadError('Uploading the valid ID image failed.');
  assert.ok((await actions.createAdminResidentAction(registrationForm())).fieldErrors?.validIDImageName);
  assert.equal(JSON.stringify(logs).includes('synthetic-private-data'), false); assert.equal(JSON.stringify(logs).includes('synthetic-secret'), false); assert.match(JSON.stringify(logs), /resident-create/);
});


test('the maximum valid ID fits the configured action body including multipart overhead', async () => {
  const require = createRequire(import.meta.url);
  const { encodeReply } = require('next/dist/compiled/react-server-dom-turbopack/client.browser') as { encodeReply: (args: unknown[]) => Promise<FormData> };
  const data = registrationForm({}, new File([new Uint8Array(images.MAX_VALID_ID_IMAGE_SIZE_BYTES)], 'id.png', { type: 'image/png' }));
  const encoded = await encodeReply([data]);
  const payload = await new Request('https://example.invalid/action', { method: 'POST', body: encoded }).arrayBuffer();
  const config = (await import('../next.config')).default;
  assert.ok(payload.byteLength > images.MAX_VALID_ID_IMAGE_SIZE_BYTES);
  assert.equal(config.experimental?.serverActions && config.experimental.serverActions.bodySizeLimit, '6mb');
  assert.ok(payload.byteLength < 6 * 1024 * 1024);
});
