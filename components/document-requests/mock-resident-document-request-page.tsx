'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  FileImage,
  FileText,
  Loader2,
  ReceiptText,
  RefreshCcw,
  Send,
  Upload,
  UserSquare2,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import toast from 'react-hot-toast'
import { documentTypeCatalog, getDocumentDefinition, type DocumentTypeDefinition } from '@/lib/document-request-catalog'
import {
  buildDocumentDetailLines,
  getDocumentTypeLabel,
  type MockDocumentRequestRecord,
} from '@/lib/mock-document-requests'
import { createResidentDocumentRequestAction } from '@/server/actions/document.actions'
import {
  documentRequestSchema,
  getRelevantDocumentRequestFields,
  type DocumentRequestInput,
} from '@/validations/document.validation'

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

type DemoViewState = 'ready' | 'error'

type ProfileField = {
  key: string
  label: string
  value: string
}

const requestFieldKeys = new Set<keyof DocumentRequestInput>([
  'documentType',
  'purpose',
  'requestedCopies',
  'yearsOfResidency',
  'placeOfBirth',
  'emergencyContactPerson',
  'emergencyContactAddress',
  'emergencyContactNumber',
  'paymentReferenceDigits',
  'paymentProof',
])

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
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

function formatBirthDate(value: string) {
  return new Date(value).toLocaleDateString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function computeAge(value: string) {
  const today = new Date()
  const birthDate = new Date(value)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1
  }

  return `${Math.max(age, 0)} years old`
}

function createLocalId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `mock-${Date.now()}`
}

function formatResidentName(profile: ResidentDocumentProfile) {
  return [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(' ')
}

function formatResidentAddress(profile: ResidentDocumentProfile) {
  return `${profile.houseNumber}, ${profile.street}`
}

function StatusBadge({ status }: { status: MockDocumentRequestRecord['status'] }) {
  const styles = {
    PENDING_PAYMENT: 'border-amber-200 bg-amber-50 text-amber-700',
    SUBMITTED: 'border-sky-200 bg-sky-50 text-sky-700',
    APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    REJECTED: 'border-rose-200 bg-rose-50 text-rose-700',
  } as const

  const labels = {
    PENDING_PAYMENT: 'Pending Payment',
    SUBMITTED: 'Submitted',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
  } as const

  return (
    <span className={cn('inline-flex rounded-full border px-3 py-1 text-xs font-semibold', styles[status])}>
      {labels[status]}
    </span>
  )
}

function RequiredMark() {
  return <span className="text-rose-500">*</span>
}

function QueryErrorState({
  title,
  message,
  onRetry,
}: {
  title: string
  message: string
  onRetry: () => void
}) {
  return (
    <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-6 py-6 text-rose-900">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm text-rose-800">{message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
          >
            <RefreshCcw className="h-4 w-4" />
            Retry
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
    <div className="flex min-h-[220px] items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
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

function DemoBanner({
  onReset,
  onError,
}: {
  onReset: () => void
  onError: () => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[24px] border border-dashed border-primary-300 bg-primary-50/60 p-4 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-primary-700">Mock UI mode</p>
        <p className="mt-1 text-slate-600">
          Resident information is sourced from the current session and rendered as read-only form fields.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onError}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Show Error
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-2xl bg-primary-600 px-4 py-2 font-medium text-white transition-colors hover:bg-primary-700"
        >
          Reset Demo
        </button>
      </div>
    </div>
  )
}

function MockQrCode() {
  return (
    <svg viewBox="0 0 120 120" className="h-48 w-48 rounded-[28px] border border-slate-200 bg-white p-4">
      <rect width="120" height="120" fill="white" />
      <g fill="#111827">
        <rect x="8" y="8" width="28" height="28" rx="2" />
        <rect x="14" y="14" width="16" height="16" fill="white" />
        <rect x="84" y="8" width="28" height="28" rx="2" />
        <rect x="90" y="14" width="16" height="16" fill="white" />
        <rect x="8" y="84" width="28" height="28" rx="2" />
        <rect x="14" y="90" width="16" height="16" fill="white" />
        <rect x="48" y="8" width="8" height="8" />
        <rect x="60" y="8" width="8" height="8" />
        <rect x="48" y="20" width="8" height="8" />
        <rect x="60" y="20" width="8" height="8" />
        <rect x="44" y="40" width="8" height="8" />
        <rect x="56" y="40" width="8" height="8" />
        <rect x="68" y="40" width="8" height="8" />
        <rect x="80" y="40" width="8" height="8" />
        <rect x="40" y="52" width="8" height="8" />
        <rect x="52" y="52" width="8" height="8" />
        <rect x="76" y="52" width="8" height="8" />
        <rect x="92" y="52" width="8" height="8" />
        <rect x="44" y="64" width="8" height="8" />
        <rect x="68" y="64" width="8" height="8" />
        <rect x="80" y="64" width="8" height="8" />
        <rect x="92" y="64" width="8" height="8" />
        <rect x="44" y="76" width="8" height="8" />
        <rect x="56" y="76" width="8" height="8" />
        <rect x="68" y="76" width="8" height="8" />
        <rect x="80" y="76" width="8" height="8" />
        <rect x="92" y="76" width="8" height="8" />
        <rect x="48" y="88" width="8" height="8" />
        <rect x="60" y="88" width="8" height="8" />
        <rect x="72" y="88" width="8" height="8" />
        <rect x="84" y="88" width="8" height="8" />
        <rect x="96" y="88" width="8" height="8" />
        <rect x="48" y="100" width="8" height="8" />
        <rect x="72" y="100" width="8" height="8" />
        <rect x="96" y="100" width="8" height="8" />
      </g>
    </svg>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        value={value}
        disabled
        readOnly
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
      />
    </div>
  )
}

function getProfileFieldsForDocument(
  documentType: DocumentTypeDefinition['id'],
  profile: ResidentDocumentProfile
): ProfileField[] {
  const fullName = formatResidentName(profile)
  const address = formatResidentAddress(profile)
  const age = computeAge(profile.birthDate)
  const birthDate = formatBirthDate(profile.birthDate)

  const groupMap: Record<DocumentTypeDefinition['id'], ProfileField[]> = {
    clearance: [
      { key: 'name', label: 'Name', value: fullName },
      { key: 'citizenship', label: 'Citizenship', value: profile.citizenship },
      { key: 'address', label: 'Address', value: address },
      { key: 'age', label: 'Age', value: age },
      { key: 'civil-status', label: 'Civil Status', value: profile.civilStatus },
    ],
    indigency: [
      { key: 'name', label: 'Name', value: fullName },
      { key: 'citizenship', label: 'Citizenship', value: profile.citizenship },
      { key: 'address', label: 'Address', value: address },
      { key: 'age', label: 'Age', value: age },
      { key: 'civil-status', label: 'Civil Status', value: profile.civilStatus },
    ],
    residency: [
      { key: 'name', label: 'Name', value: fullName },
      { key: 'citizenship', label: 'Citizenship', value: profile.citizenship },
      { key: 'address', label: 'Address', value: address },
      { key: 'age', label: 'Age', value: age },
      { key: 'civil-status', label: 'Civil Status', value: profile.civilStatus },
    ],
    cedula: [
      { key: 'name', label: 'Name', value: fullName },
      { key: 'citizenship', label: 'Citizenship', value: profile.citizenship },
      { key: 'birthdate', label: 'Birthdate', value: birthDate },
      { key: 'address', label: 'Address', value: address },
      { key: 'civil-status', label: 'Civil Status', value: profile.civilStatus },
    ],
    'barangay-id': [
      { key: 'name', label: 'Name', value: fullName },
      { key: 'civil-status', label: 'Civil Status', value: profile.civilStatus },
      { key: 'address', label: 'Address', value: address },
      { key: 'birthdate', label: 'Birthdate', value: birthDate },
      { key: 'contact-number', label: 'Contact Number', value: profile.contactNumber ?? 'Not provided' },
      { key: 'precinct-number', label: 'Voter Precinct No.', value: profile.precinctNumber ?? 'Not provided' },
    ],
    'first-time-job-seeker': [
      { key: 'name', label: 'Complete Name', value: fullName },
      { key: 'address', label: 'Address', value: address },
      { key: 'age', label: 'Age', value: age },
      { key: 'birthdate', label: 'Birthdate', value: birthDate },
      { key: 'citizenship', label: 'Citizenship', value: profile.citizenship },
      { key: 'civil-status', label: 'Civil Status', value: profile.civilStatus },
    ],
  }

  return groupMap[documentType]
}

function getPurposeLabel(documentType: DocumentTypeDefinition['id']) {
  if (documentType === 'indigency') {
    return 'Purpose / Intended Assistance'
  }

  if (documentType === 'residency') {
    return 'Purpose of Certification'
  }

  return 'Purpose'
}

export default function MockResidentDocumentRequestPage({
  residentProfile,
}: {
  residentProfile: ResidentDocumentProfile
}) {
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [viewState, setViewState] = useState<DemoViewState>('ready')
  const [submitSuccess, setSubmitSuccess] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState('')
  const [isSubmittingDocument, setIsSubmittingDocument] = useState(false)
  const [requests, setRequests] = useState<MockDocumentRequestRecord[]>([])
  const [activePaymentRequestId, setActivePaymentRequestId] = useState<string | null>(null)
  const [paymentReferenceDigits, setPaymentReferenceDigits] = useState('')
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null)
  const [paymentPreviewUrl, setPaymentPreviewUrl] = useState<string | null>(null)
  const [submissionError, setSubmissionError] = useState('')
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    control,
    reset,
    getValues,
    clearErrors,
    setValue,
    setError,
    formState: { errors },
  } = useForm<DocumentRequestInput>({
    resolver: zodResolver(documentRequestSchema),
    shouldUnregister: true,
    defaultValues: {
      documentType: 'clearance',
      purpose: '',
      requestedCopies: '1',
      yearsOfResidency: '',
      placeOfBirth: '',
      emergencyContactPerson: '',
      emergencyContactAddress: '',
      emergencyContactNumber: '',
    },
  })

  const selectedDocumentType = useWatch({
    control,
    name: 'documentType',
  })

  const documentTypeField = register('documentType')

  const selectedDefinition = useMemo(
    () => documentTypeCatalog.find((item) => item.id === selectedDocumentType) ?? documentTypeCatalog[0],
    [selectedDocumentType]
  )

  const profileFields = useMemo(
    () => getProfileFieldsForDocument(selectedDefinition.id, residentProfile),
    [residentProfile, selectedDefinition.id]
  )

  const activePaymentRequest = useMemo(
    () => requests.find((item) => item.id === activePaymentRequestId) ?? null,
    [activePaymentRequestId, requests]
  )

  const createRequestMutation = useMutation({
    mutationFn: async (formData: FormData) => createResidentDocumentRequestAction(formData),
    onSuccess: async (result) => {
      if (!result.success) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            if (requestFieldKeys.has(field as keyof DocumentRequestInput)) {
              setError(field as keyof DocumentRequestInput, {
                type: 'server',
                message,
              })
            }
          })
        }

        setSubmissionError(result.message)
        toast.error(result.message)
        return
      }

      if (activePaymentRequestId && result.request) {
        setRequests((current) =>
          current.map((item) =>
            item.id === activePaymentRequestId
              ? {
                  ...item,
                  id: result.request?.id ?? item.id,
                  status: result.request?.status ?? 'SUBMITTED',
                  detailLines: result.request?.detailLines ?? item.detailLines,
                  referenceDigits: result.request?.referenceDigits ?? item.referenceDigits,
                  proofOfPaymentName: result.request?.proofOfPaymentName ?? item.proofOfPaymentName,
                  proofOfPaymentPreview: paymentPreviewUrl ?? item.proofOfPaymentPreview,
                  submittedAt: result.request?.submittedAt ?? item.submittedAt,
                }
              : item
          )
        )
      }

      setPaymentSuccess(result.message)
      setSubmitSuccess('')
      setSubmissionError('')
      setActivePaymentRequestId(null)
      setPaymentProofFile(null)
      setPaymentPreviewUrl(null)
      setPaymentReferenceDigits('')
      resetFormValues(selectedDefinition.id)
      await queryClient.invalidateQueries({
        queryKey: ['resident-document-requests', residentProfile.id],
      })
      toast.success(result.message)
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'An unexpected error occurred while submitting your request.'
      setSubmissionError(message)
      toast.error(message)
    },
  })

  useEffect(() => {
    void (async () => {
      await sleep(450)
      setIsPageLoading(false)
    })()
  }, [])

  const resetFormValues = (documentType: DocumentTypeDefinition['id']) => {
    reset({
      documentType,
      purpose: '',
      requestedCopies: '1',
      yearsOfResidency: '',
      placeOfBirth: '',
      emergencyContactPerson: '',
      emergencyContactAddress: '',
      emergencyContactNumber: '',
    })
  }

  const handleDocumentTypeChange = (nextDocumentType: DocumentTypeDefinition['id']) => {
    if (nextDocumentType === selectedDocumentType) {
      return
    }

    clearErrors()
    setSubmissionError('')
    setSubmitSuccess('')
    setPaymentSuccess('')
    setPaymentError('')
    setActivePaymentRequestId(null)
    setPaymentProofFile(null)
    setPaymentPreviewUrl(null)
    setPaymentReferenceDigits('')

    setValue('documentType', nextDocumentType, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    })

    resetFormValues(nextDocumentType)
  }

  const resetDemo = () => {
    setViewState('ready')
    setIsPageLoading(true)
    setRequests([])
    setActivePaymentRequestId(null)
    setPaymentReferenceDigits('')
    setPaymentProofFile(null)
    setPaymentPreviewUrl(null)
    setSubmissionError('')
    setSubmitSuccess('')
    setPaymentError('')
    setPaymentSuccess('')
    clearErrors()
    resetFormValues('clearance')
    void (async () => {
      await sleep(450)
      setIsPageLoading(false)
    })()
  }

  const handleRetry = () => {
    setViewState('ready')
    setIsPageLoading(true)
    void (async () => {
      await sleep(450)
      setIsPageLoading(false)
    })()
  }

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmittingDocument(true)
    setSubmissionError('')
    setSubmitSuccess('')
    setPaymentError('')
    setPaymentSuccess('')

    await sleep(650)

    const definition = getDocumentDefinition(values.documentType)

    if (!definition) {
      setIsSubmittingDocument(false)
      return
    }

    const requestId = createLocalId()
    const newRequest: MockDocumentRequestRecord = {
      id: requestId,
      requesterName: formatResidentName(residentProfile),
      requesterEmail: residentProfile.email,
      requesterPhone: residentProfile.contactNumber ?? 'Not provided',
      requesterAddress: formatResidentAddress(residentProfile),
      documentType: values.documentType as MockDocumentRequestRecord['documentType'],
      requestedCopies: values.requestedCopies,
      amount: definition.fee,
      status: 'PENDING_PAYMENT',
      detailLines: buildDocumentDetailLines(values.documentType, values),
      proofOfPaymentName: null,
      proofOfPaymentPreview: null,
      referenceDigits: null,
      submittedAt: new Date().toISOString(),
    }

    setRequests((current) => [newRequest, ...current])
    setActivePaymentRequestId(requestId)
    setSubmitSuccess(`${definition.label} request created. Continue with the mock payment step below.`)
    setIsSubmittingDocument(false)
    toast.success('Mock request created. Payment step is ready.')
  })

  const handlePaymentFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setPaymentError('')
    setPaymentSuccess('')
    setSubmissionError('')
    setPaymentProofFile(file)

    if (!file) {
      setPaymentPreviewUrl(null)
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPaymentPreviewUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const submitPaymentProof = async () => {
    if (!activePaymentRequest) {
      return
    }

    if (!paymentProofFile) {
      setPaymentError('Attach a proof of payment image before continuing.')
      return
    }

    if (!/^\d{4}$/.test(paymentReferenceDigits)) {
      setPaymentError('Enter the last 4 digits of your payment reference number.')
      return
    }

    setPaymentError('')
    setPaymentSuccess('')
    setSubmissionError('')

    const formValues = getValues()
    const relevantFields = getRelevantDocumentRequestFields(formValues.documentType)
    const formData = new FormData()

    formData.set('documentType', formValues.documentType)
    formData.set('requestedCopies', formValues.requestedCopies)
    formData.set('paymentReferenceDigits', paymentReferenceDigits)
    formData.set('paymentProof', paymentProofFile)

    relevantFields.forEach((fieldName) => {
      if (fieldName === 'documentType' || fieldName === 'requestedCopies' || fieldName === 'paymentReferenceDigits') {
        return
      }

      const value = formValues[fieldName as keyof DocumentRequestInput]
      if (typeof value === 'string' && value.trim()) {
        formData.set(fieldName, value)
      }
    })

    await createRequestMutation.mutateAsync(formData)
  }

  if (isPageLoading) {
    return (
      <div className="max-container w-full padding-x py-6 sm:py-8 lg:py-10">
        <div className="space-y-6">
          <div className="h-8 w-56 animate-pulse rounded-full bg-slate-200" />
          <div className="h-[660px] animate-pulse rounded-[28px] bg-white" />
          <div className="h-[280px] animate-pulse rounded-[28px] bg-white" />
        </div>
      </div>
    )
  }

  if (viewState === 'error') {
    return (
      <div className="max-container w-full padding-x py-6 sm:py-8 lg:py-10">
        <QueryErrorState
          title="Unable to load the document request form"
          message="This is a simulated placeholder for the resident error state. Use retry to restore the local UI."
          onRetry={handleRetry}
        />
      </div>
    )
  }

  return (
    <div className="max-container w-full padding-x py-6 sm:py-8 lg:py-10">
      <div className="space-y-6 sm:space-y-7 lg:space-y-8">
        <div className="max-w-3xl space-y-3">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-600 transition-colors hover:text-primary-700">
            <ArrowLeft className="h-5 w-5" />
            <span>Back to home</span>
          </Link>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-600">
            Resident Services
          </p>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Document Request</h1>
          <p className="text-sm leading-6 text-slate-600 sm:text-base">
            Resident details are auto-filled from your approved session profile. Only request-specific fields can be changed.
          </p>
        </div>

        <DemoBanner
          onReset={resetDemo}
          onError={() => {
            setViewState('error')
          }}
        />

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
              <UserSquare2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Unified Request Form</h2>
              <p className="text-sm text-slate-600">
                The resident profile section is built into the form and stays read-only across all document types.
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-8">
            {submitSuccess ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{submitSuccess}</span>
                </div>
              </div>
            ) : null}

            {paymentSuccess ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{paymentSuccess}</span>
                </div>
              </div>
            ) : null}

            {submissionError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {submissionError}
              </div>
            ) : null}

            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700">
                Document Type <RequiredMark />
              </label>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {documentTypeCatalog.map((item) => {
                  const isSelected = item.id === selectedDocumentType

                  return (
                    <label
                      key={item.id}
                      className={cn(
                        'cursor-pointer rounded-[24px] border p-4 transition-all',
                        isSelected
                          ? 'border-primary-500 bg-primary-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-primary-300 hover:bg-slate-50'
                      )}
                    >
                      <input
                        type="radio"
                        value={item.id}
                        className="sr-only"
                        name={documentTypeField.name}
                        ref={documentTypeField.ref}
                        onBlur={documentTypeField.onBlur}
                        checked={selectedDocumentType === item.id}
                  onChange={() => {
                          handleDocumentTypeChange(item.id)
                        }}
                      />
                      <p className="text-base font-semibold text-slate-900">{item.label}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                      <p className="mt-4 text-sm font-semibold text-slate-900">
                        Fee: {item.fee === 0 ? 'Free of charge' : formatCurrency(item.fee)}
                      </p>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">
                    Selected Document
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-slate-900">{selectedDefinition.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{selectedDefinition.description}</p>
                </div>
                <div className="rounded-2xl border border-primary-200 bg-white px-4 py-3 text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mock Fee</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {selectedDefinition.fee === 0 ? 'Free' : formatCurrency(selectedDefinition.fee)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-5">
              <div className="mb-5">
                <h3 className="text-base font-semibold text-slate-900">Resident Profile</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Auto-populated from your session and locked for editing.
                </p>
              </div>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {profileFields.map((field) => (
                  <ReadOnlyField key={field.key} label={field.label} value={field.value} />
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-5">
              <div className="mb-5">
                <h3 className="text-base font-semibold text-slate-900">Request Details</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Complete only the fields required for this document type.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {['clearance', 'indigency', 'residency'].includes(selectedDefinition.id) ? (
                  <div className="md:col-span-2">
                    <label htmlFor="purpose" className="text-sm font-medium text-slate-700">
                      {getPurposeLabel(selectedDefinition.id)} <RequiredMark />
                    </label>
                    <textarea
                      id="purpose"
                      rows={4}
                      placeholder="Describe how this document will be used."
                      {...register('purpose')}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500"
                    />
                    {errors.purpose ? <p className="mt-2 text-xs text-rose-500">{errors.purpose.message}</p> : null}
                  </div>
                ) : null}

                {selectedDefinition.fields.map((field) => (
                  <div
                    key={field.name}
                    className={cn(
                      field.name === 'emergencyContactAddress' ? 'md:col-span-2' : ''
                    )}
                  >
                    <label htmlFor={field.name} className="text-sm font-medium text-slate-700">
                      {field.label} {field.required ? <RequiredMark /> : null}
                    </label>
                    <input
                      id={field.name}
                      type={field.type}
                      placeholder={field.placeholder}
                      {...register(field.name)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500"
                    />
                    {errors[field.name] ? (
                      <p className="mt-2 text-xs text-rose-500">{errors[field.name]?.message}</p>
                    ) : null}
                  </div>
                ))}

                <div>
                  <label htmlFor="requestedCopies" className="text-sm font-medium text-slate-700">
                    Number of Copies <RequiredMark />
                  </label>
                  <input
                    id="requestedCopies"
                    type="number"
                    min={1}
                    max={5}
                    {...register('requestedCopies')}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500"
                  />
                  {errors.requestedCopies ? (
                    <p className="mt-2 text-xs text-rose-500">{errors.requestedCopies.message}</p>
                  ) : null}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Current Flow Status</label>
                  <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    Form Ready
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
              <button
                type="submit"
                disabled={isSubmittingDocument}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmittingDocument ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Request...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Continue to Payment
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {activePaymentRequest ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">GCash Payment</h2>
                <p className="text-sm text-slate-600">
                  Mock status flow: <span className="font-semibold text-amber-700">Pending Payment</span> to{' '}
                  <span className="font-semibold text-sky-700">Submitted</span>
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
              <div className="flex flex-col items-center rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                <MockQrCode />
                <p className="mt-4 text-sm font-semibold text-slate-900">Sampaloc IV GCash</p>
                <p className="mt-1 text-xs text-slate-500">Scan this sample QR for the mock flow.</p>
              </div>

              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Document</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {getDocumentTypeLabel(activePaymentRequest.documentType)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount Due</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {activePaymentRequest.amount === 0
                        ? 'Free of charge'
                        : formatCurrency(activePaymentRequest.amount)}
                    </p>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-900">Upload proof of payment</p>
                  <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-8 text-center transition-colors hover:border-primary-400 hover:bg-primary-50/30">
                    <Upload className="h-6 w-6 text-primary-700" />
                    <p className="mt-3 text-sm font-medium text-slate-900">Choose a payment screenshot</p>
                    <p className="mt-1 text-xs text-slate-500">PNG, JPG, or WEBP for preview</p>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={handlePaymentFileChange}
                    />
                  </label>

                  {paymentPreviewUrl ? (
                    <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <FileImage className="h-4 w-4 text-primary-700" />
                        <span>{paymentProofFile?.name}</span>
                      </div>
                      <Image
                        src={paymentPreviewUrl}
                        alt="Proof of payment preview"
                        width={960}
                        height={720}
                        unoptimized
                        className="mt-4 max-h-72 w-full rounded-2xl object-cover"
                      />
                    </div>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="referenceDigits" className="text-sm font-medium text-slate-700">
                    Last 4 Digits of Reference Number <RequiredMark />
                  </label>
                  <input
                    id="referenceDigits"
                    inputMode="numeric"
                    maxLength={4}
                    value={paymentReferenceDigits}
                    onChange={(event) => {
                      setPaymentReferenceDigits(event.target.value.replace(/\D/g, '').slice(0, 4))
                    }}
                    placeholder="1234"
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500"
                  />
                </div>

                {paymentError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {paymentError}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    void submitPaymentProof()
                  }}
                  disabled={createRequestMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {createRequestMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting Request...
                    </>
                  ) : (
                    <>
                      <ReceiptText className="h-4 w-4" />
                      Submit Payment Proof
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7">
          <div className="flex items-start gap-3">
        
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Request Timeline</h2>
              <p className="text-sm text-slate-600">
                Submitted mock requests stay here so you can preview every status transition.
              </p>
            </div>
          </div>

          <div className="mt-5">
            {requests.length === 0 ? (
              <EmptyState
                title="No requests yet"
                description="Your first mock document request will appear here once you continue to payment."
              />
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <article key={request.id} className="rounded-[24px] border border-slate-200 bg-slate-50/50 p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {getDocumentTypeLabel(request.documentType)}
                          </h3>
                          <StatusBadge status={request.status} />
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                          Created {formatDateTime(request.submittedAt)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                        Fee: {request.amount === 0 ? 'Free of charge' : formatCurrency(request.amount)}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Details</p>
                        <dl className="mt-3 space-y-3 text-sm">
                          {request.detailLines.map((line) => (
                            <div
                              key={`${request.id}-${line.label}`}
                              className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                            >
                              <dt className="font-medium text-slate-500">{line.label}</dt>
                              <dd className="text-slate-900 sm:max-w-[60%] sm:text-right">{line.value}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Payment Reference
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">
                            {request.referenceDigits ? `**** ${request.referenceDigits}` : 'Awaiting upload'}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Proof of Payment
                          </p>
                          {request.proofOfPaymentPreview ? (
                            <div className="mt-3">
                              <Image
                                src={request.proofOfPaymentPreview}
                                alt="Uploaded proof of payment"
                                width={960}
                                height={720}
                                unoptimized
                                className="h-36 w-full rounded-2xl object-cover"
                              />
                              <p className="mt-2 text-sm text-slate-600">{request.proofOfPaymentName}</p>
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-slate-500">Not uploaded yet</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
