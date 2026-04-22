'use client'

import React, { useState } from 'react'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { loginAdminAction } from '@/server/actions/auth.actions'
import { adminLoginSchema, getZodFieldErrors } from '@/validations/auth.validation'
import logo from '@/public/images/sampaloc-logo.png'
import Image from 'next/image'

export function AdminLoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')

  const loginMutation = useMutation({
    mutationFn: loginAdminAction,
    onSuccess: (result) => {
      if (!result.success) {
        const fieldErrors = result.fieldErrors ?? {}
        setError(fieldErrors.submit ?? result.message)
        return
      }

      setError('')
      router.replace('/admin')
      router.refresh()
    },
    onError: () => {
      setError('An unexpected error occurred while signing in.')
    },
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    const parsed = adminLoginSchema.safeParse({
      email,
      password,
    })

    if (!parsed.success) {
      const fieldErrors = getZodFieldErrors(parsed.error)
      setError(fieldErrors.email ?? fieldErrors.password ?? 'Please correct the highlighted fields.')
      return
    }

    await loginMutation.mutateAsync(parsed.data)
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-primary-50 via-slate-50 to-primary-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
           <div className="mb-4 flex justify-center">


            <Image className="w-auto h-auto" src={logo} alt="Logo" width={80} height={80} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Portal</h1>
          <p className="text-slate-600 mt-2">Sampaloc IV Barangay Management System</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
          <div className="p-8">
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-900 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) {
                      setError('')
                    }
                  }}
                  placeholder="admin@barangay.gov.ph"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900 placeholder-slate-500"
                />
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-900 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (error) {
                        setError('')
                      }
                    }}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900 placeholder-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-500 cursor-pointer"
                />
                <label htmlFor="rememberMe" className="ml-2 text-sm text-slate-600 cursor-pointer">
                  Remember me
                </label>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full py-2.5 bg-linear-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-6 flex items-center justify-center gap-2"
              >
                {loginMutation.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            {/* <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-slate-500">OR</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div> */}

            {/* Footer Links */}
            {/* <div className="space-y-3 text-center text-sm">
              <div>
                <a href="#" className="text-primary-600 hover:text-primary-700 font-medium transition-colors">
                  Forgot password?
                </a>
              </div>
              <div className="text-slate-600">
                Don't have an account?{' '}
                <a href="#" className="text-primary-600 hover:text-primary-700 font-medium transition-colors">
                  Contact administrator
                </a>
              </div>
            </div> */}
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-slate-50 border-t border-gray-200">
            <p className="text-xs text-slate-600 text-center">
              © 2026 Sampaloc IV Barangay. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
