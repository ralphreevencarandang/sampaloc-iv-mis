const MAX_PDF_BYTES = 10 * 1024 * 1024

export function validateStoredPdf(bytes: Uint8Array) {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_PDF_BYTES || Buffer.from(bytes.subarray(0, 5)).toString() !== '%PDF-') {
    throw new Error('Invalid saved PDF')
  }
  return Buffer.from(bytes)
}

// Existing references are imported once into private database storage. Never fetch arbitrary URLs.
export async function readReferencedDocumentPdf(reference: string) {
  if (reference.startsWith('data:application/pdf;base64,')) {
    const encoded = reference.slice('data:application/pdf;base64,'.length)
    if (encoded.length > Math.ceil(MAX_PDF_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error('Invalid saved PDF')
    return validateStoredPdf(Buffer.from(encoded, 'base64'))
  }
  const url = new URL(reference)
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || url.port || url.username || url.password ||
      !cloudName || !url.pathname.startsWith(`/${cloudName}/`) || !/^\/[^/]+\/(raw|image)\/(upload|authenticated)\//.test(url.pathname)) {
    throw new Error('Untrusted saved PDF reference')
  }
  const response = await fetch(url, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10000) })
  if (!response.ok || !response.body) throw new Error('Saved PDF unavailable')
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_PDF_BYTES) throw new Error('Saved PDF too large')
      chunks.push(value)
    }
    return validateStoredPdf(Buffer.concat(chunks))
  } finally {
    await reader.cancel().catch(() => {})
  }
}
