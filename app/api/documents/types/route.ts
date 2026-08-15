import { NextResponse } from 'next/server'
import { getAllDocumentsWithPricingAction } from '@/server/actions/document-settings.actions'

export async function GET() {
  try {
    const documents = await getAllDocumentsWithPricingAction()
    return NextResponse.json(documents)
  } catch (error) {
    console.error('GET /api/documents/types error:', error)
    return NextResponse.json({ message: 'Failed to fetch document types.' }, { status: 500 })
  }
}
