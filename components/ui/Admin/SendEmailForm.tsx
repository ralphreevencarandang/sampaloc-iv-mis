'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { sendStaffEmailAction } from '@/server/actions/staff-email.actions'
import { staffEmailFormSchema, EMAIL_SUBJECT_MAX, EMAIL_MESSAGE_MAX, type StaffEmailFormInput } from '@/validations/staff-email.validation'

export default function SendEmailForm() {
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<StaffEmailFormInput>({
    resolver: zodResolver(staffEmailFormSchema), defaultValues: { recipient: '', subject: '', message: '' },
  })
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null)
  const [sending, setSending] = useState(false)
  const pending = isSubmitting || sending
  const [remaining, setRemaining] = useState(0)
  const deadline = useRef(0)
  const inFlight = useRef(false)
  const request = useRef<{ id: string; payload: string } | null>(null)
  useEffect(() => {
    const timer = setInterval(() => setRemaining(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000))), 1000)
    return () => clearInterval(timer)
  }, [])

  const submit = async (data: StaffEmailFormInput) => {
    if (inFlight.current || Date.now() < deadline.current) return
    inFlight.current = true
    setSending(true)
    setFeedback(null)
    try {
      const payload = JSON.stringify(data)
      if (!request.current || request.current.payload !== payload) request.current = { id: crypto.randomUUID(), payload }
      const result = await sendStaffEmailAction({ ...data, submissionId: request.current.id })
      if (result.retryAfterSeconds) {
        deadline.current = Date.now() + result.retryAfterSeconds * 1000
        setRemaining(result.retryAfterSeconds)
      }
      setFeedback({ success: result.success, message: result.message })
      if (!result.success) {
        for (const name of ['recipient', 'subject', 'message'] as const) {
          const message = result.fieldErrors?.[name]
          if (message) setError(name, { type: 'server', message })
        }
        if (result.canRetry) request.current = null
        toast.error(result.message)
        return
      }
      request.current = null
      reset()
      toast.success(result.message)
    } catch {
      const message = 'Sending could not be confirmed. Check with the recipient before trying again.'
      setFeedback({ success: false, message }); toast.error(message)
    } finally { inFlight.current = false; setSending(false) }
  }

  return <form noValidate aria-busy={pending} onSubmit={handleSubmit(submit, () => {
    setFeedback({ success: false, message: 'Please correct the highlighted fields.' })
    toast.error('Please correct the highlighted fields.')
  })} className="max-w-full space-y-5 rounded-lg border border-outline bg-surface p-4 shadow-sm sm:p-6">
    <fieldset disabled={pending} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email-recipient" className="block text-sm font-medium text-content">Recipient Email <span className="text-stock-empty-text">*</span></label>
        <Input {...register('recipient')} id="email-recipient" type="email" required autoComplete="email" maxLength={254} aria-invalid={Boolean(errors.recipient)} aria-describedby={errors.recipient ? 'email-recipient-error' : undefined} />
        {errors.recipient && <p id="email-recipient-error" role="alert" className="text-sm text-stock-empty-text">{errors.recipient.message}</p>}
      </div>
      <div className="space-y-2">
        <label htmlFor="email-subject" className="block text-sm font-medium text-content">Subject <span className="text-stock-empty-text">*</span></label>
        <Input {...register('subject')} id="email-subject" required maxLength={EMAIL_SUBJECT_MAX} aria-invalid={Boolean(errors.subject)} aria-describedby={errors.subject ? 'email-subject-error' : undefined} />
        {errors.subject && <p id="email-subject-error" role="alert" className="text-sm text-stock-empty-text">{errors.subject.message}</p>}
      </div>
      <div className="space-y-2">
        <label htmlFor="email-message" className="block text-sm font-medium text-content">Message <span className="text-stock-empty-text">*</span></label>
        <Textarea {...register('message')} id="email-message" required rows={8} maxLength={EMAIL_MESSAGE_MAX} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? 'email-message-help email-message-error' : 'email-message-help'} />
        <p id="email-message-help" className="text-xs text-content-muted">Up to 5,000 characters. Messages are sent as text; HTML is not rendered.</p>
        {errors.message && <p id="email-message-error" role="alert" className="text-sm text-stock-empty-text">{errors.message.message}</p>}
      </div>
    </fieldset>
    {feedback && <p role={feedback.success ? 'status' : 'alert'} className={`rounded-lg border p-3 text-sm ${feedback.success ? 'border-primary-200 bg-primary-50 text-primary-700' : 'border-stock-empty-border bg-stock-empty-surface text-stock-empty-text'}`}>{feedback.message}</p>}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p role="status" className="text-xs text-content-muted">{remaining > 0 ? `You can send again in ${remaining} seconds.` : 'Up to 20 emails per hour, with 60 seconds between sends.'}</p>
      <Button type="submit" disabled={pending || remaining > 0}>{pending ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Mail aria-hidden="true" className="h-4 w-4" />}{pending ? 'Sending…' : 'Send Email'}</Button>
    </div>
  </form>
}
