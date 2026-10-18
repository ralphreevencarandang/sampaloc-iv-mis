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

export async function fetchResidentDocumentRequests(
  residentId?: string
): Promise<ResidentDocumentRequestRecord[]> {
  try {
    const endpoint = residentId ? `/residents/${residentId}/documents` : '/documents'
    const response = await api.get<ResidentDocumentRequestRecord[]>(endpoint)

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
  return requestDocumentPdf('/document/generate', requestId)
}

export async function downloadResidentDocumentPdf(
  requestId: string
): Promise<GeneratedDocumentPdfResult> {
  return requestDocumentPdf('/document/download', requestId)
}

async function requestDocumentPdf(endpoint: string, requestId: string): Promise<GeneratedDocumentPdfResult> {
  const fallbackMessage = endpoint === '/document/download'
    ? 'Unable to download your document. Please try again.'
    : 'Failed to generate the requested document PDF.'
  try {
    const response = await api.post<Blob>(
      endpoint,
      { requestId },
      {
        responseType: 'blob',
        timeout: 120000,
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

        let message = fallbackMessage
        try {
          const parsed = JSON.parse(messageText) as { message?: string }
          if (typeof parsed.message === 'string') message = parsed.message
        } catch { /* Keep the safe fallback for non-JSON responses. */ }
        throw new Error(message)
      }

      const message = (data as { message?: string } | undefined)?.message
      throw new Error(message ?? fallbackMessage)
    }

    throw error
  }
}
