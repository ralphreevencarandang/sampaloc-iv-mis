'use client'

import React from 'react'
import { AlertTriangle, Archive, RotateCcw, Loader2, X, Check } from 'lucide-react'

export interface BulkConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isPending?: boolean
  variant?: 'danger' | 'warning' | 'primary'
}

export default function BulkConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isPending = false,
  variant = 'warning',
}: BulkConfirmModalProps) {
  if (!isOpen) return null

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-red-100 text-red-700',
          btnBg: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-red-600/30 shadow-md',
          icon: <AlertTriangle className="w-5 h-5" />,
          subtitle: 'This action will move selected records to archive.',
        }
      case 'primary':
        return {
          iconBg: 'bg-primary-100 text-primary-700',
          btnBg: 'bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white shadow-primary-600/30 shadow-md',
          icon: <RotateCcw className="w-5 h-5" />,
          subtitle: 'This action will restore selected records back to active status.',
        }
      case 'warning':
      default:
        return {
          iconBg: 'bg-amber-100 text-amber-700',
          btnBg: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-amber-600/30 shadow-md',
          icon: <Archive className="w-5 h-5" />,
          subtitle: 'This action will move selected records to the archive section.',
        }
    }
  }

  const { iconBg, btnBg, icon, subtitle } = getVariantStyles()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${iconBg}`}>
              {icon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="text-sm text-slate-700 leading-relaxed font-normal">{message}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 disabled:cursor-not-allowed ${btnBg}`}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {confirmText}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
