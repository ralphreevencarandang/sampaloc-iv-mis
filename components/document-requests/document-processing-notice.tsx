import { DOCUMENT_PROCESSING_NOTICE, DOCUMENT_WORKING_HOURS_NOTICE } from '@/lib/document-processing-notice'

export function DocumentProcessingNotice() {
  return (
    <div role="note" className="rounded-lg border border-primary-200 bg-primary-50 p-4 text-sm text-primary-700">
      <p>{DOCUMENT_PROCESSING_NOTICE}</p>
      <p className="mt-2">{DOCUMENT_WORKING_HOURS_NOTICE}</p>
    </div>
  )
}
