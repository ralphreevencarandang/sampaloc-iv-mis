import axios from 'axios'
import api from '@/lib/axios'
import type { DocumentTypeId } from '@/lib/document-request-catalog'
import type {
  AdminDocumentRequestRecord,
  ResidentDocumentRequestRecord,
} from '@/lib/document-request-utils'

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

export async function fetchResidentDocumentRequests(): Promise<ResidentDocumentRequestRecord[]> {
  try {
    const response = await api.get<ResidentDocumentRequestRecord[]>('/documents')

    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as { message?: string } | undefined)?.message
      throw new Error(message ?? 'Failed to fetch your document requests.')
    }

    throw error
  }
}

export type GeneratedDocumentPdfResult = {
  blob: Blob
  fileName: string
  serialNumber: string | null
}

export async function generateDocumentRequestPdf(
  requestId: string
): Promise<GeneratedDocumentPdfResult> {
  try {
    const response = await api.post<Blob>(
      '/document/generate',
      { requestId },
      {
        responseType: 'blob',
      }
    )

    const contentDisposition = response.headers['content-disposition']
    const fileNameMatch = /filename="?([^"]+)"?/i.exec(contentDisposition ?? '')
    const fileName = fileNameMatch?.[1] ?? 'document-request.pdf'

    return {
      blob: response.data,
      fileName,
      serialNumber: response.headers['x-document-serial'] ?? null,
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data

      if (data instanceof Blob) {
        const messageText = await data.text()

        try {
          const parsed = JSON.parse(messageText) as { message?: string }
          throw new Error(parsed.message ?? 'Failed to generate the requested document PDF.')
        } catch {
          throw new Error(messageText || 'Failed to generate the requested document PDF.')
        }
      }

      const message = (data as { message?: string } | undefined)?.message
      throw new Error(message ?? 'Failed to generate the requested document PDF.')
    }

    throw error
  }
}
