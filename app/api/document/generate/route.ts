import { NextResponse } from 'next/server'
import { getCurrentAdminFromSession } from '@/lib/admin-session'
import {
  DocumentRequestPdfGenerationError,
  generateStoredDocumentRequestPdf,
} from '@/lib/pdf/document-request-delivery'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const currentAdmin = await getCurrentAdminFromSession()

  if (!currentAdmin) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  }

  let requestId = ''

  try {
    const body = (await request.json()) as { requestId?: string }
    requestId = body.requestId?.trim() ?? ''
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  if (!requestId) {
    return NextResponse.json({ message: 'Document request id is required.' }, { status: 400 })
  }

  try {
    const generatedDocument = await generateStoredDocumentRequestPdf(requestId)

    return new Response(generatedDocument.pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${generatedDocument.fileName}"`,
        'Content-Length': String(generatedDocument.pdfBuffer.byteLength),
        'X-Document-Serial': generatedDocument.serialNumber,
        'X-Document-Status': 'GENERATED',
      },
    })
  } catch (error) {
    if (error instanceof DocumentRequestPdfGenerationError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }

    console.error('POST /api/document/generate failed', error)

    return NextResponse.json(
      { message: 'Failed to generate the requested PDF document.' },
      { status: 500 }
    )
  }
}
