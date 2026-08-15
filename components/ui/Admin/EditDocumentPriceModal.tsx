'use client'

import React, { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Check, FileText, AlertCircle, Loader2, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  updateDocumentPriceAction,
  type DocumentSettingRecord,
} from '@/server/actions/document-settings.actions'

type EditDocumentPriceModalProps = {
  isOpen: boolean
  onClose: () => void
  document: DocumentSettingRecord | null
}

const PRESET_PRICES = [0, 50, 75, 90, 100, 150]

export default function EditDocumentPriceModal({
  isOpen,
  onClose,
  document,
}: EditDocumentPriceModalProps) {
  const [priceInput, setPriceInput] = useState<string>('')
  const [descriptionInput, setDescriptionInput] = useState<string>('')
  const [error, setError] = useState<string>('')
  const queryClient = useQueryClient()

  useEffect(() => {
    if (document) {
      setPriceInput(document.price.toString())
      setDescriptionInput(document.description || '')
      setError('')
    }
  }, [document, isOpen])

  const mutation = useMutation({
    mutationFn: async (payload: { documentTypeId: string; price: number; description?: string }) => {
      return await updateDocumentPriceAction(payload)
    },
    onSuccess: (result) => {
      if (!result.success) {
        setError(result.message)
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      void queryClient.invalidateQueries({ queryKey: ['admin-documents-settings'] })
      void queryClient.invalidateQueries({ queryKey: ['document-types'] })
      void queryClient.invalidateQueries({ queryKey: ['document-types-settings'] })
      onClose()
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Failed to update document price.'
      setError(msg)
      toast.error(msg)
    },
  })

  if (!isOpen || !document) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const numericPrice = parseFloat(priceInput)
    if (isNaN(numericPrice) || numericPrice < 0) {
      setError('Please enter a valid price (₱0 or higher).')
      return
    }

    mutation.mutate({
      documentTypeId: document.documentTypeId,
      price: numericPrice,
      description: descriptionInput.trim(),
    })
  }

  const handlePresetClick = (preset: number) => {
    setPriceInput(preset.toString())
    setError('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 text-primary-700 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Edit Document Price</h3>
              <p className="text-xs text-slate-500">
                Update the official issuing fee for this barangay document
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Document Summary Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Document Type
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-slate-200 text-slate-700">
                {document.documentTypeId}
              </span>
            </div>
            <p className="text-base font-bold text-slate-900">{document.name}</p>
            <p className="text-xs text-slate-600">
              Current Price: <span className="font-semibold text-slate-900">
                {document.price === 0 ? 'Free of charge' : `₱${document.price.toFixed(2)}`}
              </span>
            </p>
          </div>

          {/* Price Input Field */}
          <div>
            <label htmlFor="priceInput" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              New Price (Philippine Peso) <span className="text-red-500">*</span>
            </label>
            <div className="relative rounded-xl shadow-xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-bold text-base">
                ₱
              </div>
              <input
                id="priceInput"
                type="number"
                step="0.01"
                min="0"
                value={priceInput}
                onChange={(e) => {
                  setPriceInput(e.target.value)
                  setError('')
                }}
                placeholder="0.00"
                required
                className="w-full pl-9 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-lg font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Set to 0 to make this document certificate completely free of charge.
            </p>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Quick Price Presets
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_PRICES.map((preset) => {
                const isSelected = parseFloat(priceInput) === preset
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {preset === 0 ? 'Free (₱0)' : `₱${preset}`}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Description / Purpose Notes Field */}
          <div>
            <label htmlFor="descriptionInput" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              Description / Requirements Note (Optional)
            </label>
            <textarea
              id="descriptionInput"
              rows={3}
              value={descriptionInput}
              onChange={(e) => setDescriptionInput(e.target.value)}
              placeholder="Provide context or eligibility criteria for this document..."
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md shadow-primary-600/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Price
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
