'use client'

import React, { createContext, useContext, useEffect } from 'react'
import type { AdminRole } from '@/app/generated/prisma/enums'
import { canAccessResource, isReadOnlyAdmin, type AdminAction, type AdminResource } from '@/lib/rbac'

type AdminRbacContextValue = {
  role?: AdminRole | null
  can: (resource: AdminResource, action?: AdminAction) => boolean
  isReadOnly: boolean
}

const AdminRbacContext = createContext<AdminRbacContextValue | null>(null)

export function AdminRbacProvider({
  role,
  children,
}: {
  role?: AdminRole | null
  children: React.ReactNode
}) {
  const readOnly = isReadOnlyAdmin(role)

  useEffect(() => {
    if (!readOnly) {
      return
    }

    const mutationLabelPattern =
      /^(add|edit|delete|archive|unarchive|restore|save|create|update|approve|generate|post|register|bulk archive|bulk unarchive|file vawc|release)\b/i

    const applyReadOnlyState = () => {
      document.querySelectorAll<HTMLElement>('main button, main a').forEach((element) => {
        const label = [
          element.getAttribute('title'),
          element.getAttribute('aria-label'),
          element.textContent,
        ]
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()

        if (!mutationLabelPattern.test(label)) {
          return
        }

        element.setAttribute('aria-disabled', 'true')
        element.classList.add('cursor-not-allowed', 'opacity-50')

        if (element instanceof HTMLButtonElement) {
          element.disabled = true
        } else {
          element.addEventListener('click', preventReadOnlyClick)
        }
      })
    }

    const preventReadOnlyClick = (event: Event) => {
      event.preventDefault()
      event.stopPropagation()
    }

    applyReadOnlyState()

    const observer = new MutationObserver(applyReadOnlyState)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      document.querySelectorAll<HTMLElement>('main [aria-disabled="true"]').forEach((element) => {
        element.classList.remove('cursor-not-allowed', 'opacity-50')
        if (element instanceof HTMLButtonElement) {
          element.disabled = false
        } else {
          element.removeEventListener('click', preventReadOnlyClick)
        }
      })
    }
  }, [readOnly])

  return (
    <AdminRbacContext.Provider
      value={{
        role,
        can: (resource, action = 'read') => canAccessResource(role, resource, action),
        isReadOnly: readOnly,
      }}
    >
      {children}
    </AdminRbacContext.Provider>
  )
}

export function useAdminRbac() {
  const context = useContext(AdminRbacContext)

  if (!context) {
    throw new Error('useAdminRbac must be used within AdminRbacProvider')
  }

  return context
}
