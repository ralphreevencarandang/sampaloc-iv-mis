'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { PasswordInput } from '@/components/ui/resident-inputs';
import { forgotPasswordAction, verifyResetOtpAction, resetPasswordAction } from '@/server/actions/password-reset.actions';
import { forgotPasswordSchema, verifyResetOtpSchema, resetPasswordSchema, resetLoginPaths, type ResetScope } from '@/validations/password-reset.validation';

const inputClass = 'w-full rounded-lg border border-outline bg-surface px-3 py-3 text-content focus:outline-none focus:ring-2 focus:ring-primary-500';
const buttonClass = 'flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-surface hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50';
const storageKey = 'mis-password-reset';
function rememberRequest(email: string, scope: ResetScope) {
  try { sessionStorage.setItem(storageKey, JSON.stringify({ email, scope, resendAt: Date.now() + 60000 })); } catch { /* Storage is optional. */ }
}
function Feedback({ message, error = false }: { message: string; error?: boolean }) {
  return message ? <p role={error ? 'alert' : 'status'} className={`rounded-lg border p-3 text-sm ${error ? 'border-stock-empty-border bg-stock-empty-surface text-stock-empty-text' : 'border-primary-200 bg-primary-50 text-primary-700'}`}>{message}</p> : null;
}
export function ResetFrame({ title, scope, children }: { title: string; scope: ResetScope; children: ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center bg-surface-muted px-4 py-12 text-content">
    <section className="w-full max-w-md space-y-6 rounded-lg border border-outline bg-surface p-6 shadow-sm">
      <div><p className="mb-2 text-sm font-semibold text-primary-700">Sampaloc IV MIS · {scope === 'resident' ? 'Resident' : scope === 'clinic' ? 'Health Worker' : 'Admin / Staff'}</p><h1 className="text-2xl font-bold">{title}</h1></div>
      {children}
      <Link href={resetLoginPaths[scope]} className="block text-center text-sm font-semibold text-primary-700 underline focus-visible:ring-2 focus-visible:ring-primary-500">Back to sign in</Link>
    </section>
  </main>;
}
export function ForgotPasswordForm({ scope }: { scope: ResetScope }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ email: string; scope: ResetScope }>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '', scope } });
  return <form className="space-y-4" noValidate onSubmit={handleSubmit(async values => {
    setError('');
    try {
      const result = await forgotPasswordAction(values);
      if (!result.success) { setError(result.message); return; }
      rememberRequest(values.email, scope);
      router.push(`/verify-reset-otp?portal=${scope}`);
    } catch { setError('Unable to request a code. Please try again.'); }
  })}>
    <p className="text-sm text-content-muted">Enter your registered email address to request a six-digit verification code.</p>
    <div><label htmlFor="reset-email" className="mb-2 block text-sm font-medium">Email address</label><input id="reset-email" type="email" autoComplete="email" maxLength={254} className={inputClass} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'reset-email-error' : undefined} {...register('email')} />{errors.email && <p id="reset-email-error" className="mt-1 text-sm text-stock-empty-text">{errors.email.message}</p>}</div>
    <Feedback message={error} error />
    <button disabled={isSubmitting} className={buttonClass}>{isSubmitting && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}{isSubmitting ? 'Requesting code…' : 'Send verification code'}</button>
  </form>;
}
export function VerifyResetOtpForm({ scope }: { scope: ResetScope }) {
  const router = useRouter();
  const [message, setMessage] = useState('If an eligible account matches that email, a verification code will be sent. Check your inbox and spam folder.');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [remaining, setRemaining] = useState(60);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const [resending, setResending] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ otp: string }>({ resolver: zodResolver(verifyResetOtpSchema), defaultValues: { otp: '' } });
  useEffect(() => {
    let until = Date.now() + 60000;
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      if (saved?.scope === scope && typeof saved.email === 'string') {
        setEmail(saved.email);
        if (typeof saved.resendAt === 'number') until = saved.resendAt;
      }
    } catch { /* User can reenter their email if storage is unavailable. */ }
    setResendAt(until);
  }, [scope]);
  useEffect(() => {
    if (resendAt === null) return;
    const tick = () => setRemaining(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [resendAt]);
  return <div className="space-y-4">
    <Feedback message={message} /><Feedback message={error} error />
    <form noValidate className="space-y-4" onSubmit={handleSubmit(async values => {
      setError('');
      try {
        const result = await verifyResetOtpAction(values);
        if (!result.success) { setError(result.message); return; }
        router.replace(`/reset-password?portal=${scope}`);
      } catch { setError('Unable to verify the code. Please try again.'); }
    })}>
      <div><label htmlFor="reset-otp" className="mb-2 block text-sm font-medium">Six-digit verification code</label><input id="reset-otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} className={`${inputClass} text-center text-xl tracking-widest`} aria-invalid={Boolean(errors.otp)} aria-describedby="otp-help" {...register('otp', { onChange: event => { event.target.value = event.target.value.replace(/\D/g, '').slice(0, 6); } })} /><p id="otp-help" className="mt-2 text-sm text-content-muted">{errors.otp?.message || 'Codes expire after 10 minutes. You have up to five attempts per code.'}</p></div>
      <button className={buttonClass} disabled={isSubmitting || resending}>{isSubmitting && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}{isSubmitting ? 'Verifying…' : 'Verify code'}</button>
    </form>
    <div className="space-y-3 border-t border-outline pt-4">
      <label htmlFor="resend-email" className="block text-sm font-medium">Email address for resend</label><input id="resend-email" type="email" autoComplete="email" maxLength={254} className={inputClass} value={email} onChange={event => setEmail(event.target.value)} />
      <p className="text-sm text-content-muted">Requesting a new code replaces your previous code.</p>
      <button type="button" className="w-full rounded-lg border border-outline px-4 py-3 text-sm font-semibold text-primary-700 hover:bg-primary-50 focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50" disabled={remaining > 0 || resending || isSubmitting} onClick={async () => {
        const parsed = forgotPasswordSchema.safeParse({ email, scope });
        if (!parsed.success) { setError('Enter your registered email address to resend.'); return; }
        setResending(true); setError('');
        try {
          const result = await forgotPasswordAction(parsed.data);
          if (!result.success) { setError(result.message); return; }
          rememberRequest(parsed.data.email, scope);
          setRemaining(60);
          setResendAt(Date.now() + 60000);
          setMessage(`${result.message} Only the newest code can be used.`);
        } catch { setError('Unable to resend right now. Please try again.'); }
        finally { setResending(false); }
      }}>{resending ? 'Requesting code…' : remaining > 0 ? `Resend code in ${remaining}s` : 'Resend code'}</button>
    </div>
  </div>;
}
export function ResetPasswordForm({ scope }: { scope: ResetScope }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ password: string; confirmPassword: string }>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: '', confirmPassword: '' } });
  return <form className="space-y-4" noValidate onSubmit={handleSubmit(async values => {
    setError('');
    try {
      const result = await resetPasswordAction(values);
      if (!result.success || !result.loginPath) { setError(result.message); return; }
      try { sessionStorage.removeItem(storageKey); } catch { /* Optional browser storage. */ }
      toast.success(result.message);
      router.replace(result.loginPath);
      router.refresh();
    } catch { setError('Unable to reset your password. Please try again.'); }
  })}>
    <p id="password-help" className="text-sm text-content-muted">Use at least eight characters, including an uppercase letter, a number, and a special character. Your reset authorization expires after five minutes.</p>
    <div><label htmlFor="new-password" className="mb-2 block text-sm font-medium">New password</label><PasswordInput id="new-password" autoComplete="new-password" className={inputClass} disabled={isSubmitting} aria-invalid={Boolean(errors.password)} aria-describedby="password-help" {...register('password')} />{errors.password && <p className="mt-1 text-sm text-stock-empty-text">{errors.password.message}</p>}</div>
    <div><label htmlFor="confirm-new-password" className="mb-2 block text-sm font-medium">Confirm new password</label><PasswordInput id="confirm-new-password" autoComplete="new-password" className={inputClass} disabled={isSubmitting} aria-invalid={Boolean(errors.confirmPassword)} {...register('confirmPassword')} />{errors.confirmPassword && <p className="mt-1 text-sm text-stock-empty-text">{errors.confirmPassword.message}</p>}</div>
    <Feedback message={error} error />
    <button disabled={isSubmitting} className={buttonClass}>{isSubmitting && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}{isSubmitting ? 'Changing password…' : 'Reset password'}</button>
    <Link href={`/forgot-password?portal=${scope}`} className="block text-center text-sm text-primary-700 underline">Request a new code</Link>
  </form>;
}
