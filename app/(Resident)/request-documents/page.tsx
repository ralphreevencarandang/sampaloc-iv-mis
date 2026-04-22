'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
  User,
} from 'lucide-react'
import Link from 'next/link'
import React, { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useResidentAuth } from '@/components/providers/resident-auth-provider'
import apiClient from '@/lib/axios'
import type { DocumentTypeDefinition } from '@/lib/document-request-catalog'
import { createResidentDocumentRequestAction } from '@/server/actions/document.actions'
import { documentRequestSchema, type DocumentRequestInput } from '@/validations/document.validation'

type ResidentProfile = {
  id: string
  email: string
  firstName: string
  lastName: string
  middleName: string | null
  contactNumber: string | null
  street: string
  houseNumber: string
  status: string
}

type DocumentRequestRecord = {
  id: string
  type: string
  purpose: string
  status: 'PENDING' | 'APPROVED' | 'RELEASED'
  requestedAt: string
  releasedAt: string | null
  approvedByName: string | null
}

function fullName(profile: Pick<ResidentProfile, 'firstName' | 'middleName' | 'lastName'>) {
  return [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(' ')
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Pending'
  }

  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function QueryErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-5 text-rose-900">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Unable to load data</p>
          <p className="mt-1 text-sm text-rose-800">{message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
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
    <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
      <div className="max-w-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
          <FileText className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
      </div>
    </div>
  )
}

function InfoTile({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <div className="mt-2 text-sm font-medium text-slate-900">{value}</div>
    </div>
  )
}

function RequiredMark() {
  return <span className="text-rose-500">*</span>
}

async function fetchResidentProfile(residentId: string) {
  const { data } = await apiClient.get<ResidentProfile>(`/residents/${residentId}`)
  return data
}

async function fetchResidentDocuments(residentId: string) {
  const { data } = await apiClient.get<DocumentRequestRecord[]>(`/residents/${residentId}/documents`)
  return data
}

async function fetchDocumentCatalog() {
  const { data } = await apiClient.get<DocumentTypeDefinition[]>('/documents')
  return data
}

export default function RequestDocumentsPage() {
  const { resident } = useResidentAuth()
  const queryClient = useQueryClient()
  const residentId = resident?.id
  const [submitSuccess, setSubmitSuccess] = useState('')

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<DocumentRequestInput>({
    resolver: zodResolver(documentRequestSchema),
    defaultValues: {
      documentType: 'clearance',
      purpose: '',
      requestedCopies: '1',
      clearanceFor: '',
      assistanceProgram: '',
      yearsOfResidency: '',
      cedulaYear: String(new Date().getFullYear()),
      annualIncome: '',
      emergencyContactName: '',
      emergencyContactNumber: '',
      schoolOrTraining: '',
      targetEmployer: '',
    },
  })

  const selectedDocumentType = useWatch({
    control,
    name: 'documentType',
  })

  const profileQuery = useQuery({
    queryKey: ['resident-profile', residentId],
    queryFn: async () => {
      if (!residentId) {
        throw new Error('Resident session is missing.')
      }

      return fetchResidentProfile(residentId)
    },
    enabled: Boolean(residentId),
    staleTime: 5 * 60 * 1000,
  })

  const documentsQuery = useQuery({
    queryKey: ['resident-documents', residentId],
    queryFn: async () => {
      if (!residentId) {
        throw new Error('Resident session is missing.')
      }

      return fetchResidentDocuments(residentId)
    },
    enabled: Boolean(residentId),
    staleTime: 60 * 1000,
  })

  const catalogQuery = useQuery({
    queryKey: ['document-catalog'],
    queryFn: fetchDocumentCatalog,
    staleTime: 10 * 60 * 1000,
  })

  const selectedDefinition = useMemo(
    () => catalogQuery.data?.find((item) => item.id === selectedDocumentType) ?? null,
    [catalogQuery.data, selectedDocumentType]
  )

  const requestMutation = useMutation({
    mutationFn: async (values: DocumentRequestInput) => {
      const formData = new FormData()
      Object.entries(values).forEach(([key, value]) => {
        formData.set(key, String(value ?? ''))
      })

      return createResidentDocumentRequestAction(formData)
    },
    onSuccess: async (result) => {
      if (!result.success) {
        setSubmitSuccess('')

        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            if (field === 'submit') {
              setError('root', { type: 'server', message })
              return
            }

            setError(field as keyof DocumentRequestInput, {
              type: 'server',
              message,
            })
          })
        }

        return
      }

        setSubmitSuccess(result.message)
      clearErrors()
      reset({
        documentType: selectedDocumentType || 'clearance',
        purpose: '',
        requestedCopies: '1',
        clearanceFor: '',
        assistanceProgram: '',
        yearsOfResidency: '',
        cedulaYear: String(new Date().getFullYear()),
        annualIncome: '',
        emergencyContactName: '',
        emergencyContactNumber: '',
        schoolOrTraining: '',
        targetEmployer: '',
      })

      await queryClient.invalidateQueries({ queryKey: ['resident-documents', residentId] })
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setSubmitSuccess('')
    clearErrors()
    await requestMutation.mutateAsync(values)
  })

  if (!residentId) {
    return (
      <div className="max-container padding-x py-6 sm:py-8 lg:py-10">
        <div className="mx-auto max-w-5xl rounded-3xl border border-amber-200 bg-amber-50 px-6 py-5 text-amber-900">
          Resident session is missing. Please sign in again.
        </div>
      </div>
    )
  }

  if (profileQuery.isLoading || catalogQuery.isLoading) {
    return (
      <div className="max-container padding-x py-6 sm:py-8 lg:py-10">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="h-8 w-56 animate-pulse rounded-full bg-slate-200" />
          <div className="h-[220px] animate-pulse rounded-[32px] border border-slate-200 bg-white" />
          <div className="h-[520px] animate-pulse rounded-[32px] border border-slate-200 bg-white" />
        </div>
      </div>
    )
  }

  if (profileQuery.isError || catalogQuery.isError) {
    const message =
      profileQuery.error instanceof Error
        ? profileQuery.error.message
        : catalogQuery.error instanceof Error
          ? catalogQuery.error.message
          : 'Failed to load document request dependencies.'

    return (
      <div className="max-container padding-x py-6 sm:py-8 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <QueryErrorState
            message={message}
            onRetry={() => {
              void profileQuery.refetch()
              void catalogQuery.refetch()
            }}
          />
        </div>
      </div>
    )
  }

  if (!profileQuery.data || !catalogQuery.data) {
    return (
      <div className="max-container padding-x py-6 sm:py-8 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <EmptyState
            title="Document request form unavailable"
            description="We could not load your resident profile or the document catalog."
          />
        </div>
      </div>
    )
  }

  const profile = profileQuery.data
  const residentName = fullName(profile)

  return (
    <div className="max-container w-full padding-x py-6 sm:py-8 lg:py-10">
      <div className="space-y-6 sm:space-y-7 lg:space-y-8">
        <div className="max-w-3xl space-y-3">
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft className="h-5 w-5" />
            <p>Back to home</p>
          </Link>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-600">
            Resident Services
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Document Request</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Submit one unified request form for barangay documents. Your resident account details are attached automatically, and extra inputs appear only when a selected document needs them.
          </p>
        </div>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">User Info</h2>
              <p className="text-sm text-slate-600">These fields come from your logged-in resident profile and are read-only for document requests.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InfoTile label="Resident Name" value={residentName} icon={User} />
            <InfoTile label="Email Address" value={profile.email} icon={Mail} />
            <InfoTile label="Contact Number" value={profile.contactNumber ?? 'Not provided'} icon={Phone} />
            <InfoTile label="Address" value={`${profile.houseNumber}, ${profile.street}`} icon={MapPin} />
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Document Details</h2>
              <p className="text-sm text-slate-600">Choose a document type, then fill in the shared request details and any extra fields required for that specific document.</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-6">
            {submitSuccess && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{submitSuccess}</span>
                </div>
              </div>
            )}

            {errors.root?.message && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errors.root.message}
              </div>
            )}

            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700">
                Document Type <RequiredMark />
              </label>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {catalogQuery.data.map((item) => {
                  const isSelected = selectedDocumentType === item.id

                  return (
                    <label
                      key={item.id}
                      className={`cursor-pointer rounded-[24px] border p-4 transition-all ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-primary-300 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        value={item.id}
                        className="sr-only"
                        {...register('documentType', {
                          onChange: () => {
                            if (submitSuccess) {
                              setSubmitSuccess('')
                            }
                            clearErrors()
                          },
                        })}
                      />
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-base font-semibold text-slate-900">{item.label}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                        </div>
                        {/* <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary-700 shadow-sm">
                          {item.badge}
                        </span> */}
                      </div>
                    </label>
                  )
                })}
              </div>
              {errors.documentType && <p className="text-xs text-rose-500">{errors.documentType.message}</p>}
            </div>

            {selectedDefinition && (
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">
                  Selected Document
                </p>
                <h3 className="mt-2 text-xl font-bold text-slate-900">{selectedDefinition.label}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{selectedDefinition.description}</p>
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-2 md:col-span-2">
                <label htmlFor="purpose" className="text-sm font-medium text-slate-700">
                  Purpose of Request <RequiredMark />
                </label>
                <textarea
                  id="purpose"
                  rows={4}
                  placeholder="Describe where and why you will use this document."
                  {...register('purpose')}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500"
                />
                {errors.purpose && <p className="text-xs text-rose-500">{errors.purpose.message}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="requestedCopies" className="text-sm font-medium text-slate-700">
                  Number of Copies <RequiredMark />
                </label>
                <input
                  id="requestedCopies"
                  type="number"
                  min={1}
                  max={5}
                  {...register('requestedCopies')}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500"
                />
                {errors.requestedCopies && <p className="text-xs text-rose-500">{errors.requestedCopies.message}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="statusPreview" className="text-sm font-medium text-slate-700">
                  Request Status
                </label>
                <input
                  id="statusPreview"
                  type="text"
                  readOnly
                  value="Pending review after submission"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 outline-none"
                />
              </div>

              {selectedDefinition?.fields.map((field) => (
                <div
                  key={field.name}
                  className={`flex flex-col gap-2 ${field.type === 'text' && field.name !== 'annualIncome' ? 'md:col-span-1' : ''}`}
                >
                  <label htmlFor={field.name} className="text-sm font-medium text-slate-700">
                    {field.label} {field.required ? <RequiredMark /> : null}
                  </label>

                  {field.type === 'select' ? (
                    <select
                      id={field.name}
                      {...register(field.name)}
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500"
                    >
                      <option value="">Select an option</option>
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={field.name}
                      type={field.type}
                      placeholder={field.placeholder}
                      {...register(field.name)}
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500"
                    />
                  )}

                  {field.description && <p className="text-xs text-slate-500">{field.description}</p>}
                  {errors[field.name] && (
                    <p className="text-xs text-rose-500">{errors[field.name]?.message}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
              <button
                type="submit"
                disabled={requestMutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {requestMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Request
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Recent Requests</h2>
              <p className="text-sm text-slate-600">Track the current status of document requests linked to your resident account.</p>
            </div>
          </div>

          <div className="mt-5">
            {documentsQuery.isLoading ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
                Loading document requests...
              </div>
            ) : documentsQuery.isError ? (
              <QueryErrorState
                message={documentsQuery.error instanceof Error ? documentsQuery.error.message : 'Failed to load document requests.'}
                onRetry={() => {
                  void documentsQuery.refetch()
                }}
              />
            ) : documentsQuery.data && documentsQuery.data.length > 0 ? (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        <th className="px-4 py-4 sm:px-5">Document</th>
                        <th className="px-4 py-4 sm:px-5">Purpose Summary</th>
                        <th className="px-4 py-4 sm:px-5">Status</th>
                        <th className="px-4 py-4 sm:px-5">Requested</th>
                        <th className="px-4 py-4 sm:px-5">Released</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documentsQuery.data.map((record) => (
                        <tr key={record.id} className="border-b border-slate-100 last:border-b-0">
                          <td className="px-4 py-4 text-sm font-medium text-slate-900 sm:px-5">{record.type}</td>
                          <td className="px-4 py-4 text-sm text-slate-600 sm:px-5 whitespace-pre-line">{record.purpose}</td>
                          <td className="px-4 py-4 text-sm sm:px-5">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                record.status === 'RELEASED' || record.status === 'APPROVED'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {record.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600 sm:px-5">{formatDateTime(record.requestedAt)}</td>
                          <td className="px-4 py-4 text-sm text-slate-600 sm:px-5">{formatDateTime(record.releasedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No document requests yet"
                description="Your submitted requests will appear here once you file your first document request."
              />
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
