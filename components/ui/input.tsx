'use client'

import { Input as InputPrimitive } from '@base-ui/react/input'

export function Input({ className = '', ...props }: Omit<InputPrimitive.Props, 'className'> & { className?: string }) {
  return <InputPrimitive {...props} data-slot="input" className={`min-h-11 w-full rounded-lg border border-outline bg-surface px-3 py-2 text-base text-content focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm ${className}`} />
}
