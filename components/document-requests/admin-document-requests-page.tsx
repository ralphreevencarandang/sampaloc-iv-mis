'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  FileText,
  Loader2,
  MoreVertical,
  Search,
  XCircle,
} from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { fetchAdminDocumentRequests } from '@/lib/document-requests-api'
import {
  getDocumentDefinition,
  type DocumentTypeId,
} from '@/lib/document-request-catalog'
import type { DocumentRequestStatus } from '@/lib/document-request-utils'
import { updateAdminDocumentRequestStatusAction } from '@/server/actions/document.actions'

type PageProps = {
  documentType: DocumentTypeId
}

type AdminFilter = 'ALL' | 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'RELEASED'

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
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

function getAdminStatusLabel(status: DocumentRequestStatus) {
  if (status === 'PENDING') {
    return 'Pending Payment'
  }

  if (status === 'SUBMITTED') {
    return 'Pending Review'
  }

  if (status === 'APPROVED') {
    return 'Approved'
  }

  if (status === 'REJECTED') {
    return 'Rejected'
  }

  if (status === 'RELEASED') {
    return 'Released'
  }

  return status
}

function getFilterLabel(filter: AdminFilter) {
  return filter === 'ALL' ? 'All' : getAdminStatusLabel(filter)
}

function StatusBadge({ status }: { status: DocumentRequestStatus }) {
  const styles = {
    PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
    SUBMITTED: 'border-sky-200 bg-sky-50 text-sky-700',
    APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    REJECTED: 'border-rose-200 bg-rose-50 text-rose-700',
    RELEASED: 'border-violet-200 bg-violet-50 text-violet-700',
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
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-6 py-6 text-rose-900">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Unable to load document requests</p>
          <p className="mt-1 text-sm text-rose-800">{message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  )
}

function canReview(status: DocumentRequestStatus) {
  return status === 'SUBMITTED' || status === 'PENDING'
}

function RowActionMenu({
  isOpen,
  isReviewable,
  isApproving,
  isRejecting,
  isMutating,
  onToggle,
  onApprove,
  onReject,
  onArchive,
}: {
  isOpen: boolean
  isReviewable: boolean
  isApproving: boolean
  isRejecting: boolean
  isMutating: boolean
  onToggle: () => void
  onApprove: () => void
  onReject: () => void
  onArchive: () => void
}) {
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target) &&
        isOpen
      ) {
        onToggle()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onToggle])

  return (
    <div className="relative inline-flex justify-center" ref={menuRef}>
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Open request actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-xl border border-gray-100 bg-white p-2 shadow-xl">
          <button
            type="button"
            disabled={!isReviewable || isMutating}
            onClick={onApprove}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isApproving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            )}
            Approve
          </button>
          <button
            type="button"
            disabled={!isReviewable || isMutating}
            onClick={onReject}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRejecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-600" />
            )}
            Reject
          </button>
          <button
            type="button"
            onClick={onArchive}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Archive className="h-4 w-4 text-amber-600" />
            Archive
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default function AdminDocumentRequestsPage({ documentType }: PageProps) {
  const definition = getDocumentDefinition(documentType)
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<AdminFilter>('ALL')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const {
    data: requests = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['documents', documentType],
    queryFn: () => fetchAdminDocumentRequests(documentType),
    staleTime: 30 * 1000,
  })

  const reviewMutation = useMutation({
    mutationFn: updateAdminDocumentRequestStatusAction,
    onSuccess: async (result) => {
      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      await queryClient.invalidateQueries({ queryKey: ['documents', documentType] })
    },
    onError: (mutationError) => {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to update the document request.'
      )
    },
  })

  if (!definition) {
    return (
      <QueryErrorState
        message="The selected document type is not supported."
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  const filteredRequests = requests.filter((item) => {
    const matchesSearch = [
      item.requesterName,
      item.requesterEmail,
      item.requesterAddress,
      item.referenceLast4 ?? '',
    ]
      .join(' ')
      .toLowerCase()
      .includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'ALL' ? true : item.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const pendingCount = requests.filter((item) => canReview(item.status)).length

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-60 animate-pulse rounded-full bg-slate-200" />
        <div className="h-20 animate-pulse rounded-[28px] bg-white" />
        <div className="h-[560px] animate-pulse rounded-[28px] bg-white" />
      </div>
    )
  }

  if (isError) {
    return (
      <QueryErrorState
        message={error instanceof Error ? error.message : 'Failed to load document requests.'}
        onRetry={() => {
          void refetch()
        }}
      />
    )
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
            Review resident submissions, inspect payment proof, and update request status.
          </p>
        </div>
        <div className="rounded-[24px] border border-primary-200 bg-primary-50 px-5 py-4 text-sm text-slate-700">
          <p className="font-semibold text-primary-700">Pending queue</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{pendingCount}</p>
        </div>
      </div>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4  lg:items-center lg:justify-between">
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by requester, email, address, or reference digits"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              ['ALL', 'PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'RELEASED'] as AdminFilter[]
            ).map((filter) => (
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
              description="No matching document requests were returned for this tab."
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
                      const isReviewable = canReview(request.status)
                      const isMenuOpen = openMenuId === request.id
                      const isApproving =
                        reviewMutation.isPending &&
                        reviewMutation.variables?.requestId === request.id &&
                        reviewMutation.variables?.status === 'APPROVED'
                      const isRejecting =
                        reviewMutation.isPending &&
                        reviewMutation.variables?.requestId === request.id &&
                        reviewMutation.variables?.status === 'REJECTED'

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
                              <p>{request.type}</p>
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
                            {request.proofOfPaymentUrl ? (
                              <a
                                href={request.proofOfPaymentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="block w-36"
                              >
                                <Image
                                  src={request.proofOfPaymentUrl}
                                  alt="Payment proof preview"
                                  width={320}
                                  height={220}
                                  unoptimized
                                  className="h-24 w-full rounded-2xl object-cover"
                                />
                                <p className="mt-2 text-xs text-slate-600">View attachment</p>
                              </a>
                            ) : (
                              <p className="text-sm text-slate-500">No attachment</p>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-700 sm:px-5">
                            {request.referenceLast4 ? `**** ${request.referenceLast4}` : 'Pending'}
                          </td>
                          <td className="px-4 py-4 sm:px-5">
                            <StatusBadge status={request.status} />
                          </td>
                          <td className="px-4 py-4 text-center sm:px-5">
                            <RowActionMenu
                              isOpen={isMenuOpen}
                              isReviewable={isReviewable}
                              isApproving={isApproving}
                              isRejecting={isRejecting}
                              isMutating={reviewMutation.isPending}
                              onToggle={() => {
                                setOpenMenuId((current) => (current === request.id ? null : request.id))
                              }}
                              onApprove={() => {
                                setOpenMenuId(null)
                                reviewMutation.mutate({
                                  requestId: request.id,
                                  status: 'APPROVED',
                                })
                              }}
                              onReject={() => {
                                setOpenMenuId(null)
                                reviewMutation.mutate({
                                  requestId: request.id,
                                  status: 'REJECTED',
                                })
                              }}
                              onArchive={() => {
                                setOpenMenuId(null)
                                toast('Archive action is not available yet.', {
                                  icon: '🗂️',
                                })
                              }}
                            />
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

  
    </div>
  )
}
