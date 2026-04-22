import { NextResponse } from 'next/server'
import { documentTypeCatalog } from '@/lib/document-request-catalog'

export async function GET() {
  return NextResponse.json(documentTypeCatalog)
}
