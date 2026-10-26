import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentResidentFromSession } from '@/lib/resident-session'
import { DocumentRequestPdfGenerationError, downloadApprovedResidentDocumentPdf } from '@/lib/pdf/document-request-delivery'
import { logPdfFailure } from '@/lib/pdf/pdf-diagnostics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const downloadSchema = z.object({ requestId: z.string().trim().min(1).max(200) })
const privateHeaders = { 'Cache-Control': 'private, no-store' }

export async function POST(request: Request) {
  try {
    const resident = await getCurrentResidentFromSession()
    if (!resident) {
      return NextResponse.json({ message: 'Please sign in to download your document.' }, { status: 401, headers: privateHeaders })
    }

    const parsed = downloadSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ message: 'A valid document request id is required.' }, { status: 400, headers: privateHeaders })
    }

    const result = await downloadApprovedResidentDocumentPdf(parsed.data.requestId, resident.id)
    return new Response(new Uint8Array(result.pdfBuffer), {
      headers: {
        ...privateHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
        'Content-Length': String(result.pdfBuffer.byteLength),
        ...(result.serialNumber ? { 'X-Document-Serial': result.serialNumber } : {}),
        'X-Document-Status': 'APPROVED',
      },
    })
  } catch (error) {
    if (error instanceof DocumentRequestPdfGenerationError) {
      return NextResponse.json({ message: error.message }, { status: error.status, headers: privateHeaders })
    }
    logPdfFailure('resident.download', error)
    return NextResponse.json({ message: 'Unable to download your document. Please try again.' }, { status: 500, headers: privateHeaders })
  }
}
