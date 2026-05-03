'use client'

import { AlertCircle, CheckCircle2, FileText, Loader2, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { documentTypeCatalog, type DocumentTypeDefinition } from '@/lib/document-request-catalog'
import {
  buildDocumentDetailLines,
  fallbackResidentProfile,
  type MockDocumentRequestRecord,
} from '@/lib/mock-document-requests'

export type ResidentDocumentProfile = {
  id: string
  email: string
  firstName: string
  middleName: string | null
  lastName: string
  birthDate: string
  civilStatus: string
  citizenship: string
  houseNumber: string
  street: string
  contactNumber: string | null
  precinctNumber: string | null
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(value)
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getResidentName(profile: ResidentDocumentProfile) {
  return [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(' ')
}

function getResidentAddress(profile: ResidentDocumentProfile) {
  return [profile.houseNumber, profile.street].filter(Boolean).join(', ')
}

function StatusBadge({ status }: { status: MockDocumentRequestRecord['status'] }) {
  const styles = {
    PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
    REVIEW: 'border-sky-200 bg-sky-50 text-sky-700',
    APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    GENERATED: 'border-primary-200 bg-primary-50 text-primary-700',
  } as const

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles[status]}`}>
      {status}
    </span>
  )
}

export default function MockResidentDocumentRequestPage({
  residentProfile,
}: {
  residentProfile?: ResidentDocumentProfile
}) {
  const profile =
    residentProfile ??
    ({
      ...fallbackResidentProfile,
      middleName: null,
      birthDate: new Date('1995-01-01').toISOString(),
      civilStatus: 'Single',
      citizenship: 'Filipino',
      precinctNumber: null,
    } satisfies ResidentDocumentProfile)

  const [selectedDocumentId, setSelectedDocumentId] =
    useState<DocumentTypeDefinition['id']>('clearance')
  const [purpose, setPurpose] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [requests, setRequests] = useState<MockDocumentRequestRecord[]>([])

  const selectedDocument = useMemo(
    () => documentTypeCatalog.find((item) => item.id === selectedDocumentId) ?? documentTypeCatalog[0],
    [selectedDocumentId]
  )

  const total = selectedDocument.fee * Number(quantity || '1')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!quantity || Number(quantity) < 1) {
      setError('Quantity is required.')
      return
    }

    setIsSubmitting(true)
    await new Promise((resolve) => window.setTimeout(resolve, 350))

    const submittedAt = new Date().toISOString()
    const nextRequest: MockDocumentRequestRecord = {
      id: `mock-${submittedAt}`,
      requesterName: getResidentName(profile),
      requesterEmail: profile.email,
      requesterPhone: profile.contactNumber ?? '',
      requesterAddress: getResidentAddress(profile),
      documentType: selectedDocument.id,
      requestedCopies: quantity,
      amount: total,
      status: 'PENDING',
      detailLines: buildDocumentDetailLines(selectedDocument.id, {
        purpose,
        requestedCopies: quantity,
      }),
      submittedAt,
    }

    setRequests((current) => [nextRequest, ...current])
    setPurpose('')
    setQuantity('1')
    setSuccess(`${selectedDocument.label} request submitted successfully.`)
    setIsSubmitting(false)
  }

  return (
    <div className="max-container w-full padding-x py-6 sm:py-8 lg:py-10">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-600">
            Resident Services
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Mock Document Request</h1>
          <p className="mt-2 text-slate-600">Submit one form to create a pending mock request.</p>
        </div>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {success ? (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                {success}
              </div>
            ) : null}

            {error ? (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">Document Type</label>
                <select
                  value={selectedDocumentId}
                  onChange={(event) =>
                    setSelectedDocumentId(event.target.value as DocumentTypeDefinition['id'])
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500"
                >
                  {documentTypeCatalog.map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Purpose</label>
                <textarea
                  rows={4}
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div>
                <p className="text-sm font-semibold text-slate-900">{selectedDocument.label}</p>
                <p className="text-sm text-slate-600">{selectedDocument.description}</p>
              </div>
              <p className="text-lg font-bold text-slate-900">{total === 0 ? 'Free' : formatCurrency(total)}</p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit Request
            </button>
          </form>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary-700" />
            <h2 className="text-lg font-semibold text-slate-900">Request Timeline</h2>
          </div>

          <div className="mt-5 space-y-3">
            {requests.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No mock requests yet.
              </p>
            ) : (
              requests.map((request) => (
                <article key={request.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{selectedDocument.label}</p>
                      <p className="text-sm text-slate-500">{formatDateTime(request.submittedAt)}</p>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
