'use client'

// Shadcn's Base UI combobox composition, adapted to the MIS semantic tokens.
import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'
import { ChevronDown } from 'lucide-react'

export const Combobox = ComboboxPrimitive.Root
export const ComboboxList = ComboboxPrimitive.List
export const ComboboxEmpty = ComboboxPrimitive.Empty
export const ComboboxItem = ComboboxPrimitive.Item

export function ComboboxInput(props: ComboboxPrimitive.Input.Props & { disabled?: boolean }) {
  return <div className="flex w-full items-center rounded-lg border border-outline bg-surface focus-within:ring-2 focus-within:ring-primary-500">
    <ComboboxPrimitive.Input {...props} className="min-w-0 flex-1 rounded-lg bg-surface px-3 py-2 text-base text-content outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm" />
    <ComboboxPrimitive.Trigger disabled={props.disabled} aria-label="Show medicine options" className="shrink-0 rounded-lg p-3 text-content-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50"><ChevronDown className="h-4 w-4" /></ComboboxPrimitive.Trigger>
  </div>
}

export function ComboboxContent({ children }: { children: React.ReactNode }) {
  return <ComboboxPrimitive.Portal>
    <ComboboxPrimitive.Positioner sideOffset={4} align="start" className="z-[60] max-w-[calc(100vw-2rem)]">
      <ComboboxPrimitive.Popup className="w-[var(--anchor-width)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-outline bg-surface text-content shadow-lg">
        {children}
      </ComboboxPrimitive.Popup>
    </ComboboxPrimitive.Positioner>
  </ComboboxPrimitive.Portal>
}
