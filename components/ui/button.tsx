'use client'

import { Button as ButtonPrimitive } from '@base-ui/react/button'

export function Button({ className = '', type = 'button', ...props }: Omit<ButtonPrimitive.Props, 'className'> & { className?: string }) {
  return <ButtonPrimitive {...props} type={type} data-slot="button" className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-surface hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`} />
}
