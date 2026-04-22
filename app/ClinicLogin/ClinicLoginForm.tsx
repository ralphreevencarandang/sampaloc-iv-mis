'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, LogIn, Stethoscope } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import logo from '@/public/images/sampaloc-logo.png'
import { loginHealthWorkerAction } from '@/server/actions/auth.actions'
import { healthWorkerLoginSchema, type HealthWorkerLoginInput } from '@/validations/clinic.validation'

export function ClinicLoginForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<HealthWorkerLoginInput>({
    resolver: zodResolver(healthWorkerLoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError('')

    const result = await loginHealthWorkerAction(values)

    if (!result.success) {
      const fieldErrors = result.fieldErrors ?? {}

      Object.entries(fieldErrors).forEach(([field, message]) => {
        if (field === 'email' || field === 'password') {
          setError(field, { type: 'server', message })
        }
      })

      setSubmitError(
        fieldErrors.submit ??
          fieldErrors.email ??
          fieldErrors.password ??
          result.message ??
          'An unexpected error occurred while signing in.'
      )
      return
    }

    clearErrors()
    router.replace('/clinic')
    router.refresh()
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-teal-50 via-slate-50 to-cyan-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Image className="h-auto w-auto" src={logo} alt="Logo" width={80} height={80} />
          </div>
          <div className="mb-1 flex items-center justify-center gap-2">
            <Stethoscope className="h-6 w-6 text-teal-600" />
            <h1 className="text-3xl font-bold text-slate-900">Health Worker Portal</h1>
          </div>
          <p className="mt-1 text-slate-600">Sampaloc IV Barangay Clinic</p>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="h-1.5 bg-linear-to-r from-teal-500 to-cyan-500" />
          <div className="p-8">
            {submitError && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-700">{submitError}</p>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <div>
                <label htmlFor="hw-email" className="mb-2 block text-sm font-semibold text-slate-900">
                  Email Address
                </label>
                <input
                  id="hw-email"
                  type="email"
                  autoComplete="email"
                  placeholder="healthworker@barangay.gov.ph"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                  {...register('email', {
                    onChange: () => {
                      if (submitError) {
                        setSubmitError('')
                      }
                    },
                  })}
                />
                {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>}
              </div>

              <div>
                <label htmlFor="hw-password" className="mb-2 block text-sm font-semibold text-slate-900">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="hw-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="........"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-12 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    {...register('password', {
                      onChange: () => {
                        if (submitError) {
                          setSubmitError('')
                        }
                      },
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-linear-to-r from-teal-600 to-cyan-600 py-2.5 font-semibold text-white shadow-md transition-all hover:from-teal-700 hover:to-cyan-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="border-t border-gray-200 bg-slate-50 px-8 py-4">
            <p className="text-center text-xs text-slate-600">
              (c) 2026 Sampaloc IV Barangay. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
