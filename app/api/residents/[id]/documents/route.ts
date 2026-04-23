import { NextResponse } from 'next/server'
import { serializeResidentDocumentRequest } from '@/lib/document-request-utils'
import { prisma } from '@/lib/prisma'
import { getCurrentResidentFromSession } from '@/lib/resident-session'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const currentResident = await getCurrentResidentFromSession()
    const { id } = await params

    if (!currentResident) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
    }

    if (currentResident.id !== id) {
      return NextResponse.json({ message: 'Forbidden.' }, { status: 403 })
    }

    const documentRequests = await prisma.documentRequest.findMany({
      where: { residentId: id },
      select: {
        id: true,
        documentTypeId: true,
        type: true,
        purpose: true,
        requestedCopies: true,
        amount: true,
        details: true,
        referenceLast4: true,
        proofOfPaymentUrl: true,
        status: true,
        requestedAt: true,
      },
      orderBy: {
        requestedAt: 'desc',
      },
    })

    return NextResponse.json(documentRequests.map((record) => serializeResidentDocumentRequest(record)))
  } catch (error) {
    console.error('Failed to fetch resident documents:', error)
    return NextResponse.json(
      { message: 'Failed to fetch resident documents.' },
      { status: 500 }
    )
  }
}
