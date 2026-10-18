import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { EmailTemplate } from '../components/templates/email-template'
import { DocumentProcessingNotice } from '../components/document-requests/document-processing-notice'
import * as notice from '../lib/document-processing-notice'

function load<T>(file: string, modules: Record<string, unknown>, extras: Record<string, unknown> = {}): T {
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText
  const exports = {}
  runInNewContext(compiled, { exports, Buffer, URL, AbortSignal,
    process: { env: { CLOUDINARY_CLOUD_NAME: 'test-cloud' } }, console: { log: () => {}, error: () => {} },
    require: (name: string) => { assert.ok(name in modules, name); return modules[name] }, ...extras,
  })
  return exports as T
}

test('UI, confirmation, all status emails and manual ready email reuse the working-hours guidance', async () => {
  const mails: Array<{ html: string; subject: string }> = []
  let failMail = false
  const mailer = load<typeof import('../lib/nodemailer')>('lib/nodemailer.ts', {
    nodemailer: { createTransport: () => ({ sendMail: async (mail: { html: string; subject: string }) => {
      if (failMail) throw new Error('Synthetic delivery failure')
      mails.push(mail)
      return { messageId: 'synthetic' }
    } }) },
    dotenv: { config: () => {} }, react: React,
    '@react-email/render': { render: async (element: React.ReactElement) => renderToStaticMarkup(element) },
    '@/components/templates/email-template': { EmailTemplate }, '@/lib/document-processing-notice': notice,
  })
  for (const status of ['PENDING', 'REVIEW', 'APPROVED', 'REJECTED'] as const) {
    assert.equal((await mailer.sendDocumentRequestNotificationEmail({ email: 'synthetic@example.invalid', firstName: 'Synthetic', documentLabel: 'Clearance', status })).success, true)
  }
  await mailer.sendDocumentRequestPdfEmail({ email: 'synthetic@example.invalid', firstName: 'Synthetic', documentLabel: 'Clearance', serialNumber: 'BRGY-2026-0001', fileName: 'synthetic.pdf', pdfBuffer: Buffer.from('%PDF-test') })
  const ui = renderToStaticMarkup(React.createElement(DocumentProcessingNotice))
  for (const html of [ui, ...mails.map((mail) => mail.html)]) {
    const decoded = html.replaceAll('&#x27;', "'")
    assert.ok(decoded.includes(notice.DOCUMENT_PROCESSING_NOTICE))
    assert.ok(decoded.includes(notice.DOCUMENT_WORKING_HOURS_NOTICE))
    assert.doesNotMatch(decoded, /ready (on|by) \d/)
  }
  assert.equal(mails.length, 5)
  failMail = true
  assert.equal((await mailer.sendDocumentRequestNotificationEmail({ email: 'synthetic@example.invalid', firstName: 'Synthetic', documentLabel: 'Clearance', status: 'APPROVED' })).success, false)
})

test('saved PDF references reject untrusted URLs and invalid bytes without network access', async () => {
  let fetches = 0
  let validFile = true
  const storage = load<typeof import('../lib/pdf/stored-document')>('lib/pdf/stored-document.ts', {}, {
    fetch: async (_url: URL, options: RequestInit) => {
      fetches++
      assert.equal(options.redirect, 'error')
      assert.equal(options.cache, 'no-store')
      return new Response(validFile ? '%PDF-saved' : 'invalid file')
    },
  })
  for (const url of ['http://127.0.0.1/private', 'https://evil.invalid/file.pdf', 'https://res.cloudinary.com/other-account/raw/upload/file.pdf', 'https://res.cloudinary.com/test-cloud/image/fetch/http://localhost/']) {
    await assert.rejects(storage.readReferencedDocumentPdf(url), /Untrusted/)
  }
  assert.equal(fetches, 0)
  const embedded = 'data:application/pdf;base64,' + Buffer.from('%PDF-saved').toString('base64')
  assert.equal((await storage.readReferencedDocumentPdf(embedded)).toString(), '%PDF-saved')
  assert.equal(fetches, 0)
  assert.equal((await storage.readReferencedDocumentPdf('https://res.cloudinary.com/test-cloud/raw/upload/file.pdf')).toString(), '%PDF-saved')
  assert.equal(fetches, 1)
  validFile = false
  await assert.rejects(storage.readReferencedDocumentPdf('https://res.cloudinary.com/test-cloud/raw/upload/file.pdf'), /Invalid saved PDF/)
  assert.throws(() => storage.validateStoredPdf(Buffer.alloc(10 * 1024 * 1024 + 1)), /Invalid/)
})
