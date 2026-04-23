'use client'

import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  MailCheck,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { getDocumentDefinition, type DocumentTypeDefinition } from '@/lib/document-request-catalog'
import {
  getDocumentTypeLabel,
  mockAdminDocumentRequests,
  type MockDocumentRequestRecord,
} from '@/lib/mock-document-requests'

type PageProps = {
  documentType: DocumentTypeDefinition['id']
}

type AdminFilter = 'ALL' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
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

function getAdminStatusLabel(status: MockDocumentRequestRecord['status']) {
  if (status === 'SUBMITTED') {
    return 'Pending'
  }

  if (status === 'APPROVED') {
    return 'Approved'
  }

  if (status === 'REJECTED') {
    return 'Rejected'
  }

  return 'Pending Payment'
}

function getFilterLabel(filter: AdminFilter) {
  return filter === 'ALL' ? 'All' : getAdminStatusLabel(filter)
}

function StatusBadge({ status }: { status: MockDocumentRequestRecord['status'] }) {
  const styles = {
    PENDING_PAYMENT: 'border-amber-200 bg-amber-50 text-amber-700',
    SUBMITTED: 'border-sky-200 bg-sky-50 text-sky-700',
    APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    REJECTED: 'border-rose-200 bg-rose-50 text-rose-700',
  } as const

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
        styles[status]
      )}
    >
      {getAdminStatusLabel(status)}
    </span>
  )
}

function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
      <div className="max-w-md">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
          <FileText className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
      </div>
    </div>
  )
}

function QueryErrorState({
  onRetry,
}: {
  onRetry: () => void
}) {
  return (
    <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-6 py-6 text-rose-900">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Unable to load mock requests</p>
          <p className="mt-1 text-sm text-rose-800">
            This is a simulated admin error placeholder for the document request list.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
          >
            <Loader2 className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MockAdminDocumentRequestsPage({ documentType }: PageProps) {
  const definition = getDocumentDefinition(documentType)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [showErrorState, setShowErrorState] = useState(false)
  const [requests, setRequests] = useState<MockDocumentRequestRecord[]>(mockAdminDocumentRequests)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<AdminFilter>('ALL')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [activeActionId, setActiveActionId] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      await sleep(650)
      setIsPageLoading(false)
    })()
  }, [])

  const filteredRequests = useMemo(() => {
    return requests
      .filter((item) => item.documentType === documentType)
      .filter((item) => {
        const matchesSearch =
          `${item.requesterName} ${item.requesterEmail} ${item.referenceDigits ?? ''}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase())

        const matchesStatus = statusFilter === 'ALL' ? true : item.status === statusFilter

        return matchesSearch && matchesStatus
      })
  }, [documentType, requests, searchTerm, statusFilter])

  const pendingCount = requests.filter(
    (item) => item.documentType === documentType && item.status === 'SUBMITTED'
  ).length

  const retry = () => {
    setShowErrorState(false)
    setIsPageLoading(true)
    void (async () => {
      await sleep(600)
      setIsPageLoading(false)
    })()
  }

  const updateRequestStatus = async (
    requestId: string,
    nextStatus: Extract<MockDocumentRequestRecord['status'], 'APPROVED' | 'REJECTED'>
  ) => {
    setActiveActionId(requestId)
    setFeedbackMessage('')

    await sleep(600)

    const target = requests.find((item) => item.id === requestId)

    if (!target) {
      setActiveActionId(null)
      return
    }

    setRequests((current) =>
      current.map((item) =>
        item.id === requestId
          ? {
              ...item,
              status: nextStatus,
            }
          : item
      )
    )

    const nextLabel = nextStatus === 'APPROVED' ? 'approved' : 'rejected'
    const message = `${target.requesterName}'s ${getDocumentTypeLabel(target.documentType)} request was ${nextLabel}. Mock email sent.`

    setFeedbackMessage(message)
    setActiveActionId(null)
    toast.success(message)
  }

  if (!definition) {
    return (
      <QueryErrorState
        onRetry={() => {
          retry()
        }}
      />
    )
  }

  if (isPageLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-60 animate-pulse rounded-full bg-slate-200" />
        <div className="h-20 animate-pulse rounded-[28px] bg-white" />
        <div className="h-[560px] animate-pulse rounded-[28px] bg-white" />
      </div>
    )
  }

  if (showErrorState) {
    return <QueryErrorState onRetry={retry} />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-600">
            Document Requests
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{definition.label}</h1>
          <p className="mt-2 text-slate-600">
            Review resident submissions, inspect payment proof, and simulate approval feedback.
          </p>
        </div>
        <div className="rounded-[24px] border border-primary-200 bg-primary-50 px-5 py-4 text-sm text-slate-700">
          <p className="font-semibold text-primary-700">Pending queue</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{pendingCount}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-[28px] border border-dashed border-primary-300 bg-primary-50/60 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-semibold text-primary-700">Mock admin review mode</p>
          <p className="mt-1 text-sm text-slate-600">
            Status changes, emails, and file previews are simulated in local page state only.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowErrorState(true)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Show Error
        </button>
      </div>

      {feedbackMessage ? (
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <div className="flex items-center gap-2">
            <MailCheck className="h-4 w-4" />
            <span>{feedbackMessage}</span>
          </div>
        </div>
      ) : null}

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by requester, email, or reference digits"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
                  {(['ALL', 'SUBMITTED', 'APPROVED', 'REJECTED'] as AdminFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={cn(
                  'rounded-2xl border px-4 py-2 text-sm font-medium transition-colors',
                  statusFilter === filter
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                )}
              >
                {getFilterLabel(filter)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          {filteredRequests.length === 0 ? (
            <EmptyState
              title="No requests found"
              description="Adjust the search or filter to preview the admin empty state for this document type."
            />
          ) : (
            <div className="overflow-hidden rounded-[24px] border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      <th className="px-4 py-4 sm:px-5">Requester</th>
                      <th className="px-4 py-4 sm:px-5">Document Type</th>
                      <th className="px-4 py-4 sm:px-5">Details</th>
                      <th className="px-4 py-4 sm:px-5">Proof of Payment</th>
                      <th className="px-4 py-4 sm:px-5">Reference</th>
                      <th className="px-4 py-4 sm:px-5">Status</th>
                      <th className="px-4 py-4 text-center sm:px-5">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((request) => {
                      const isPending = request.status === 'SUBMITTED'
                      const isBusy = activeActionId === request.id

                      return (
                        <tr key={request.id} className="border-t border-slate-100 align-top">
                          <td className="px-4 py-4 sm:px-5">
                            <div className="space-y-1 text-sm">
                              <p className="font-semibold text-slate-900">{request.requesterName}</p>
                              <p className="text-slate-600">{request.requesterEmail}</p>
                              <p className="text-slate-500">{request.requesterAddress}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm font-medium text-slate-900 sm:px-5">
                            <div>
                              <p>{getDocumentTypeLabel(request.documentType)}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                Filed {formatDateTime(request.submittedAt)}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-4 sm:px-5">
                            <div className="space-y-2 text-sm text-slate-700">
                              {request.detailLines.map((line) => (
                                <div key={`${request.id}-${line.label}`}>
                                  <span className="font-medium text-slate-500">{line.label}:</span>{' '}
                                  <span>{line.value}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-4 sm:px-5">
                            {request.proofOfPaymentPreview ? (
                              <div className="w-36">
                                <Image
                                  src={request.proofOfPaymentPreview}
                                  alt="Payment proof preview"
                                  width={320}
                                  height={220}
                                  unoptimized
                                  className="h-24 w-full rounded-2xl object-cover"
                                />
                                <p className="mt-2 text-xs text-slate-600">
                                  {request.proofOfPaymentName}
                                </p>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500">No attachment</p>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-700 sm:px-5">
                            {request.referenceDigits ? `**** ${request.referenceDigits}` : 'Pending'}
                          </td>
                          <td className="px-4 py-4 sm:px-5">
                            <StatusBadge status={request.status} />
                          </td>
                          <td className="px-4 py-4 sm:px-5">
                            <div className="flex flex-col gap-2">
                              <button
                                type="button"
                                disabled={!isPending || isBusy}
                                onClick={() => {
                                  void updateRequestStatus(request.id, 'APPROVED')
                                }}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                              >
                                {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={!isPending || isBusy}
                                onClick={() => {
                                  void updateRequestStatus(request.id, 'REJECTED')
                                }}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                              >
                                {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Admin Notes</h2>
            <p className="text-sm text-slate-600">
              This list is intentionally client-side only so the final API wiring can plug into the same layout later.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
