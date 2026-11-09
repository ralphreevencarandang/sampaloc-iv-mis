import type { ComponentPropsWithRef } from 'react'

export function Textarea({ className = '', ...props }: ComponentPropsWithRef<'textarea'>) {
  return <textarea {...props} data-slot="textarea" className={`min-h-40 w-full resize-y rounded-lg border border-outline bg-surface px-3 py-2 text-base text-content focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm ${className}`} />
}
