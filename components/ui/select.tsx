'use client'

import { Select as SelectPrimitive } from '@base-ui/react/select'
import { Check, ChevronDown } from 'lucide-react'

export const Select = SelectPrimitive.Root
export const SelectValue = SelectPrimitive.Value

export function SelectTrigger({ className = '', children, ...props }: Omit<SelectPrimitive.Trigger.Props, 'className'> & { className?: string }) {
  return <SelectPrimitive.Trigger {...props} data-slot="select-trigger" className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-outline bg-surface px-4 py-2 text-left text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>
    {children}<SelectPrimitive.Icon><ChevronDown aria-hidden="true" className="h-4 w-4" /></SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  return <SelectPrimitive.Portal><SelectPrimitive.Positioner sideOffset={4} alignItemWithTrigger={false} className="z-[60]">
    <SelectPrimitive.Popup className="max-h-[var(--available-height)] min-w-[var(--anchor-width)] overflow-hidden rounded-lg border border-outline bg-surface text-content shadow-lg">
      <SelectPrimitive.List className="max-h-64 overflow-y-auto p-1">{children}</SelectPrimitive.List>
    </SelectPrimitive.Popup>
  </SelectPrimitive.Positioner></SelectPrimitive.Portal>
}

export function SelectItem({ children, className = '', ...props }: Omit<SelectPrimitive.Item.Props, 'className'> & { className?: string }) {
  return <SelectPrimitive.Item {...props} className={`flex min-h-11 cursor-default items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm outline-none data-highlighted:bg-primary-50 data-highlighted:text-primary-700 ${className}`}>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText><SelectPrimitive.ItemIndicator><Check aria-hidden="true" className="h-4 w-4" /></SelectPrimitive.ItemIndicator>
  </SelectPrimitive.Item>
}
