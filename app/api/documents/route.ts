import { NextResponse } from 'next/server'
import prismaModule from '@/lib/prisma'
import { getCurrentAdminFromSession } from '@/lib/admin-session'
import { isDocumentTypeId } from '@/lib/document-request-catalog'
import {
  serializeAdminDocumentRequest,
  serializeResidentDocumentRequest,
} from '@/lib/document-request-utils'
import { getCurrentResidentFromSession } from '@/lib/resident-session'

const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const requestedType = searchParams.get('type')

    if (requestedType && !isDocumentTypeId(requestedType)) {
      return NextResponse.json({ message: 'Invalid document type filter.' }, { status: 400 })
    }

    const currentAdmin = await getCurrentAdminFromSession()

    if (currentAdmin) {
      const documentRequests = await prisma.documentRequest.findMany({
        where: requestedType ? { documentTypeId: requestedType } : undefined,
        select: {
          id: true,
          documentTypeId: true,
          type: true,
          purpose: true,
          quantity: true,
          amount: true,
          details: true,
          serialNumber: true,
          generatedFileUrl: true,
          generatedAt: true,
          status: true,
          requestedAt: true,
          resident: {
            select: {
              id: true,
              email: true,
              firstName: true,
              middleName: true,
              lastName: true,
              houseNumber: true,
              street: true,
            },
          },
        },
        orderBy: {
          requestedAt: 'desc',
        },
      })

      return NextResponse.json(documentRequests.map((record) => serializeAdminDocumentRequest(record)))
    }

    const currentResident = await getCurrentResidentFromSession()

    if (!currentResident) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
    }

    const residentDocumentRequests = await prisma.documentRequest.findMany({
      where: {
        residentId: currentResident.id,
        ...(requestedType ? { documentTypeId: requestedType } : {}),
      },
      select: {
        id: true,
        documentTypeId: true,
        type: true,
        purpose: true,
        quantity: true,
        amount: true,
        details: true,
        serialNumber: true,
        generatedFileUrl: true,
        generatedAt: true,
        status: true,
        requestedAt: true,
      },
      orderBy: {
        requestedAt: 'desc',
      },
    })

    return NextResponse.json(
      residentDocumentRequests.map((record) => serializeResidentDocumentRequest(record))
    )
  } catch (error) {
    console.error('GET /api/documents failed', error)

    return NextResponse.json(
      { message: 'Failed to fetch document requests.' },
      { status: 500 }
    )
  }
}
