'use server'

import { revalidatePath } from 'next/cache'
import prismaModule from '@/lib/prisma'
import { documentTypeCatalog } from '@/lib/document-request-catalog'
import { hasAdminPermission } from '@/lib/admin-authorization'

const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule

export type DocumentSettingRecord = {
  id: string
  documentTypeId: string
  name: string
  description: string | null
  price: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type UpdateDocumentPriceResult = {
  success: boolean
  message: string
  document?: DocumentSettingRecord
}

const DEFAULT_DOCUMENTS = [
  {
    documentTypeId: 'clearance',
    name: 'Barangay Clearance',
    description: 'For employment, business permits, travel, or similar official transactions.',
    price: 75,
    isActive: true,
  },
  {
    documentTypeId: 'indigency',
    name: 'Certificate of Indigency',
    description: 'For medical, educational, burial, or social assistance applications.',
    price: 50,
    isActive: true,
  },
  {
    documentTypeId: 'residency',
    name: 'Certificate of Residency',
    description: 'Proof of current address and duration of stay in Sampaloc IV.',
    price: 50,
    isActive: true,
  },
  {
    documentTypeId: 'cedula',
    name: 'Cedula Request',
    description: 'Personal community tax certificate request details.',
    price: 90,
    isActive: true,
  },
  {
    documentTypeId: 'first-time-job-seeker',
    name: 'First Time Job Seeker Certificate',
    description: 'For first-time applicants requesting employment-related barangay certification.',
    price: 0,
    isActive: true,
  },
]

/**
 * Ensures default documents exist in database and returns all document settings.
 */
export async function getAllDocumentsWithPricingAction(): Promise<DocumentSettingRecord[]> {
  try {
    let docs = await prisma.document.findMany({
      orderBy: { createdAt: 'asc' },
    })

    // If documents are not yet seeded in the DB, seed the defaults
    if (!docs || docs.length === 0) {
      for (const defaultDoc of DEFAULT_DOCUMENTS) {
        await prisma.document.upsert({
          where: { documentTypeId: defaultDoc.documentTypeId },
          update: {},
          create: defaultDoc,
        })
      }

      docs = await prisma.document.findMany({
        orderBy: { createdAt: 'asc' },
      })
    } else {
      // Check if any default document type is missing
      const existingTypeIds = new Set(docs.map((d) => d.documentTypeId))
      for (const defaultDoc of DEFAULT_DOCUMENTS) {
        if (!existingTypeIds.has(defaultDoc.documentTypeId)) {
          await prisma.document.create({
            data: defaultDoc,
          })
        }
      }

      docs = await prisma.document.findMany({
        orderBy: { createdAt: 'asc' },
      })
    }

    return docs.map((doc) => ({
      id: doc.id,
      documentTypeId: doc.documentTypeId,
      name: doc.name,
      description: doc.description,
      price: doc.price,
      isActive: doc.isActive,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    }))
  } catch (error) {
    console.error('getAllDocumentsWithPricingAction failed, using fallback catalog', error)
    // Return fallback catalog defaults in case of unexpected DB connection issue
    return DEFAULT_DOCUMENTS.map((doc) => ({
      id: doc.documentTypeId,
      documentTypeId: doc.documentTypeId,
      name: doc.name,
      description: doc.description,
      price: doc.price,
      isActive: doc.isActive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))
  }
}

/**
 * Gets a map of documentTypeId -> price.
 */
export async function getDocumentPriceMap(): Promise<Record<string, number>> {
  const documents = await getAllDocumentsWithPricingAction()
  const priceMap: Record<string, number> = {}
  for (const doc of documents) {
    priceMap[doc.documentTypeId] = doc.price
  }
  return priceMap
}

/**
 * Update document price and details (Admin only).
 */
export async function updateDocumentPriceAction(input: {
  documentTypeId: string
  price: number
  description?: string
}): Promise<UpdateDocumentPriceResult> {
  if (!(await hasAdminPermission('documents', 'write'))) {
    return {
      success: false,
      message: 'You do not have permission to update document settings.',
    }
  }

  if (typeof input.price !== 'number' || isNaN(input.price) || input.price < 0) {
    return {
      success: false,
      message: 'Please enter a valid price (₱0 or higher).',
    }
  }

  try {
    const catalogItem = documentTypeCatalog.find((item) => item.id === input.documentTypeId)
    const fallbackName = catalogItem ? catalogItem.label : input.documentTypeId

    const updated = await prisma.document.upsert({
      where: { documentTypeId: input.documentTypeId },
      update: {
        price: input.price,
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
      create: {
        documentTypeId: input.documentTypeId,
        name: fallbackName,
        description: input.description ?? catalogItem?.description ?? null,
        price: input.price,
        isActive: true,
      },
    })

    const revalidationPaths = [
      '/admin/documents/manage',
      '/admin/documents',
      '/request-documents',
      '/my-account',
    ]

    for (const path of revalidationPaths) {
      revalidatePath(path)
    }

    return {
      success: true,
      message: `Price for ${updated.name} updated to ₱${updated.price.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} successfully.`,
      document: {
        id: updated.id,
        documentTypeId: updated.documentTypeId,
        name: updated.name,
        description: updated.description,
        price: updated.price,
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    }
  } catch (error) {
    console.error('updateDocumentPriceAction error:', error)
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to update document price in the database.'
    return {
      success: false,
      message: errorMessage,
    }
  }
}
