'use client'

import { FileText, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { getDocumentDefinition, type DocumentTypeDefinition } from '@/lib/document-request-catalog'
import {
  getDocumentTypeLabel,
  mockAdminDocumentRequests,
  type MockDocumentRequestRecord,
} from '@/lib/mock-document-requests'

type PageProps = {
  documentType: DocumentTypeDefinition['id']
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

export default function MockAdminDocumentRequestsPage({ documentType }: PageProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const definition = getDocumentDefinition(documentType)

  const requests = useMemo(
    () =>
      mockAdminDocumentRequests.filter((request) => {
        const matchesType = request.documentType === documentType
        const matchesSearch = [
          request.requesterName,
          request.requesterEmail,
          request.requesterAddress,
        ]
          .join(' ')
          .toLowerCase()
          .includes(searchTerm.toLowerCase())

        return matchesType && matchesSearch
      }),
    [documentType, searchTerm]
  )

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-600">
          Mock Document Requests
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          {definition?.label ?? getDocumentTypeLabel(documentType)}
        </h1>
        <p className="mt-2 text-slate-600">Single-step mock submissions are created as pending requests.</p>
      </div>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by requester, email, or address"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500"
          />
        </div>

        <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                <th className="px-5 py-4">Requester</th>
                <th className="px-5 py-4">Document</th>
                <th className="px-5 py-4">Details</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-sm text-slate-500">
                    No mock requests found.
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id} className="border-t border-slate-100 align-top">
                    <td className="px-5 py-4 text-sm">
                      <p className="font-semibold text-slate-900">{request.requesterName}</p>
                      <p className="text-slate-600">{request.requesterEmail}</p>
                      <p className="text-slate-500">{request.requesterAddress}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      <p className="font-semibold text-slate-900">{getDocumentTypeLabel(request.documentType)}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDateTime(request.submittedAt)}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {request.detailLines.map((line) => (
                        <p key={`${request.id}-${line.label}`}>
                          <span className="font-medium text-slate-500">{line.label}:</span> {line.value}
                        </p>
                      ))}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={request.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Admin Notes</h2>
            <p className="text-sm text-slate-600">
              This mock view mirrors the simplified document request flow.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
