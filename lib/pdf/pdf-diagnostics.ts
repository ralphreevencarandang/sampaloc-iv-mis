export class PdfRuntimeError extends Error {
  constructor(public readonly stage: string, cause: unknown) {
    super('PDF processing failed', { cause })
    this.name = 'PdfRuntimeError'
  }
}

/** Log actionable classifications, never raw Prisma messages, HTML, URLs or resident data. */
export function logPdfFailure(operation: string, error: unknown) {
  const cause = error instanceof PdfRuntimeError ? error.cause : error
  const message = cause instanceof Error ? cause.message : ''
  const rawCode = cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : ''
  const code = /^(P\d{4}|ENOENT|EACCES|EPERM|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND)$/.test(rawCode) ? rawCode : undefined
  const category = /Could not find Chrome|executablePath|browser.*not found/i.test(message) ? 'browser_missing'
    : /Failed to launch|shared libraries|spawn/i.test(message) ? 'browser_launch_failed'
    : code === 'P2022' ? 'database_schema_mismatch'
    : code === 'P2021' ? 'database_table_missing'
    : code === 'ENOENT' ? 'runtime_asset_missing'
    : /timeout|timed out/i.test(message) ? 'timeout'
    : code?.startsWith('P') ? 'database_error'
    : 'unexpected_error'
  console.error('Document PDF failed', {
    operation,
    stage: error instanceof PdfRuntimeError ? error.stage : 'request',
    category,
    ...(code ? { code } : {}),
    errorType: cause instanceof Error && cause.name === 'TimeoutError' ? 'TimeoutError' : 'Error',
  })
}
