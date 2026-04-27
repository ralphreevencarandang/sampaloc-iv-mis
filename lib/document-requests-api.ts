import axios from 'axios'
import api from '@/lib/axios'
import type { DocumentTypeId } from '@/lib/document-request-catalog'
import type { AdminDocumentRequestRecord } from '@/lib/document-request-utils'

export async function fetchAdminDocumentRequests(
  documentType: DocumentTypeId
): Promise<AdminDocumentRequestRecord[]> {
  try {
    const response = await api.get<AdminDocumentRequestRecord[]>('/documents', {
      params: {
        type: documentType,
      },
    })

    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as { message?: string } | undefined)?.message
      throw new Error(message ?? `Failed to fetch ${documentType} document requests.`)
    }

    throw error
  }
}
