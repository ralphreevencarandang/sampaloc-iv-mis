'use client'

import { useEffect, useRef, type ReactNode } from 'react'

export default function AppointmentDialog({ children, titleId, onClose, busy = false }: {
  children: ReactNode; titleId: string; onClose: () => void; busy?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  return <dialog ref={ref} aria-labelledby={titleId} aria-modal="true"
    onCancel={event => { event.preventDefault(); if (!busy) onClose() }}
    className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-lg border border-outline bg-surface p-0 text-content shadow-lg backdrop:bg-content/50">
    {children}
  </dialog>
}
