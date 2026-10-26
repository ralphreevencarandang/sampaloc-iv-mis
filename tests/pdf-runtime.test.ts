import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import * as diagnostics from '../lib/pdf/pdf-diagnostics'

function load<T>(file: string, modules: Record<string, unknown>, env: Record<string, string> = {}, logger: (...args: unknown[]) => void = () => {}) {
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const exports = {}
  runInNewContext(compiled, { exports, Error, process: { env, cwd: () => process.cwd() }, console: { error: logger }, require: (name: string) => {
    assert.ok(name in modules, name)
    return modules[name]
  } })
  return exports as T
}

test('Vercel launches matching packaged Chromium with serverless flags and no runtime downloads', async () => {
  let pack = '', local = 0, preparations = 0
  let options: Record<string, unknown> = {}
  const browser = { close: async () => {} }
  const runtime = load<typeof import('../lib/pdf/pdf-browser')>('lib/pdf/pdf-browser.ts', {
    'node:path': path, 'node:fs/promises': { access: async (file: string) => assert.equal(file, path.join(process.cwd(), '.chromium', 'chromium.br')) },
    './pdf-diagnostics': diagnostics,
    '@sparticuz/chromium-min': { args: ['--no-sandbox', '--disable-dev-shm-usage'], executablePath: async (input: string) => { preparations++; pack = input; return '/tmp/chromium' } },
    'puppeteer-core': { defaultArgs: ({ args }: { args: string[] }) => args, launch: async (input: Record<string, unknown>) => { options = input; return browser } },
    puppeteer: { launch: () => { local++; throw new Error('Local browser must never be used on Vercel') } },
  }, { VERCEL: '1', NODE_ENV: 'production' })
  assert.equal(await runtime.launchPdfBrowser(), browser)
  assert.equal(await runtime.launchPdfBrowser(), browser)
  assert.equal(preparations, 1)
  assert.equal(pack, path.join(process.cwd(), '.chromium'))
  assert.equal(options.executablePath, '/tmp/chromium')
  assert.equal(options.headless, 'shell')
  assert.equal(options.timeout, 15000)
  assert.equal(options.protocolTimeout, 30000)
  assert.deepEqual(options.args, ['--no-sandbox', '--disable-dev-shm-usage'])
  assert.equal(local, 0)
})

test('local builds retain installed Puppeteer; production alone does not select Linux Chromium', async () => {
  const browser = { close: async () => {} }
  const runtime = load<typeof import('../lib/pdf/pdf-browser')>('lib/pdf/pdf-browser.ts', {
    'node:path': path, 'node:fs/promises': {}, './pdf-diagnostics': diagnostics,
    puppeteer: { launch: async (options: { headless: boolean }) => { assert.equal(options.headless, true); return browser } },
  }, { NODE_ENV: 'production' })
  assert.equal(await runtime.launchPdfBrowser(), browser)
})

test('missing packaged browser fails with a diagnostic stage instead of falling back to a missing local browser', async () => {
  const cause = Object.assign(new Error('ENOENT sensitive filesystem path'), { code: 'ENOENT' })
  const runtime = load<typeof import('../lib/pdf/pdf-browser')>('lib/pdf/pdf-browser.ts', {
    'node:path': path, 'node:fs/promises': { access: async () => { throw cause } }, './pdf-diagnostics': diagnostics,
    '@sparticuz/chromium-min': {}, 'puppeteer-core': {},
  }, { VERCEL: '1' })
  await assert.rejects(runtime.launchPdfBrowser(), error => error instanceof diagnostics.PdfRuntimeError && error.stage === 'browser.launch' && error.cause === cause)
})

test('server diagnostics identify browser, assets, schema and timeout errors without logging private content', () => {
  const logs: unknown[][] = []
  const logger = load<typeof diagnostics>('lib/pdf/pdf-diagnostics.ts', {}, {}, (...args) => logs.push(args))
  const cases = [
    { message: 'Could not find Chrome (ver. 147)', code: '', category: 'browser_missing' },
    { message: 'Failed to launch browser process', code: '', category: 'browser_launch_failed' },
    { message: 'private query/record', code: 'P2022', category: 'database_schema_mismatch' },
    { message: 'private template path', code: 'ENOENT', category: 'runtime_asset_missing' },
    { message: 'private URL timed out', code: '', category: 'timeout' },
  ]
  for (const item of cases) {
    const error = Object.assign(new Error(item.message + ' secret-password resident-name'), { code: item.code })
    logger.logPdfFailure('test', new logger.PdfRuntimeError('pdf.render', error))
    assert.equal((logs.at(-1)![1] as { category: string }).category, item.category)
  }
  assert.doesNotMatch(JSON.stringify(logs), /secret-password|resident-name|private|query\/record/)
})
