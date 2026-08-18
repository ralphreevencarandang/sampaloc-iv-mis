'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, X } from 'lucide-react'
import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import {
  createInventoryItem,
  updateInventoryItem,
  type InventoryRecord,
} from '@/server/actions/inventory.actions'
import {
  INVENTORY_CATEGORIES,
  INVENTORY_UNITS,
  inventorySchema,
  type InventoryFormInput,
} from '@/validations/inventory.validation'

type InventoryFormModalProps = {
  isOpen: boolean
  onClose: () => void
  initialData?: InventoryRecord | null
}

function RequiredMark() {
  return <span aria-hidden="true" className="ml-1 text-red-500">*</span>
}

export default function InventoryFormModal({
  isOpen,
  onClose,
  initialData,
}: InventoryFormModalProps) {
  const queryClient = useQueryClient()
  const isEditMode = Boolean(initialData)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<InventoryFormInput>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      name: '',
      category: undefined,
      quantity: 0,
      unit: 'pcs',
      storageLocation: '',
      description: '',
    },
  })

  useEffect(() => {
    if (!isOpen) return

    reset({
      name: initialData?.name ?? '',
      category: initialData?.category as InventoryFormInput['category'],
      quantity: initialData?.quantity ?? 0,
      unit: initialData?.unit ?? 'pcs',
      storageLocation: initialData?.storageLocation ?? '',
      description: initialData?.description ?? '',
    })
  }, [initialData, isOpen, reset])

  const mutation = useMutation({
    mutationFn: async (data: InventoryFormInput) => {
      const formData = new FormData()
      formData.set('name', data.name)
      formData.set('category', data.category)
      formData.set('quantity', String(data.quantity))
      formData.set('unit', data.unit)
      formData.set('storageLocation', data.storageLocation)
      formData.set('description', data.description ?? '')

      return isEditMode && initialData
        ? updateInventoryItem(initialData.id, formData)
        : createInventoryItem(formData)
    },
    onSuccess: (result) => {
      if (!result.success) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            setError(field as keyof InventoryFormInput, {
              type: 'server',
              message,
            })
          })
        } else {
          setError('root', {
            type: 'server',
            message: result.message,
          })
        }
        return
      }

      void queryClient.invalidateQueries({ queryKey: ['inventory'] })
      handleModalClose()
    },
    onError: (error) => {
      setError('root', {
        type: 'server',
        message:
          error instanceof Error
            ? error.message
            : isEditMode
              ? 'An unexpected error occurred while updating the inventory item.'
              : 'An unexpected error occurred while creating the inventory item.',
      })
    },
  })

  const handleModalClose = () => {
    reset({
      name: '',
      category: undefined,
      quantity: 0,
      unit: 'pcs',
      storageLocation: '',
      description: '',
    })
    onClose()
  }

  const onSubmit = async (data: InventoryFormInput) => {
    await mutation.mutateAsync(data)
  }

  if (!isOpen) return null

  const inputClass =
    'rounded-lg border border-gray-200 bg-[#f8fafc] px-4 py-2.5 text-sm text-[#0f172b] outline-none transition focus:border-[#0f172b] focus:ring-2 focus:ring-[#0f172b]/10'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-white p-6">
          <div>
            <h2 className="text-2xl font-bold text-[#0f172b]">
              {isEditMode ? 'Edit Inventory Item' : 'Add Inventory Item'}
            </h2>
            <p className="mt-1 text-slate-600">
              {isEditMode ? 'Update product and stock details below.' : 'Enter product and stock details below.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleModalClose}
            className="text-slate-400 transition-colors hover:text-slate-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 space-y-5 p-6">
          {errors.root?.message && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {errors.root.message}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label htmlFor="name" className="text-sm font-medium text-slate-700">
                Product Name<RequiredMark />
              </label>
              <input id="name" type="text" placeholder="Enter product name" {...register('name')} className={inputClass} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="category" className="text-sm font-medium text-slate-700">
                Category<RequiredMark />
              </label>
              <select id="category" {...register('category')} className={inputClass}>
                <option value="">Select category</option>
                {INVENTORY_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="quantity" className="text-sm font-medium text-slate-700">
                  Quantity<RequiredMark />
                </label>
                <input id="quantity" type="number" min={0} step={1} {...register('quantity')} className={inputClass} />
                {errors.quantity && <p className="text-xs text-red-500">{errors.quantity.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="unit" className="text-sm font-medium text-slate-700">
                  Unit<RequiredMark />
                </label>
                <select id="unit" {...register('unit')} className={inputClass}>
                  {INVENTORY_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
                {errors.unit && <p className="text-xs text-red-500">{errors.unit.message}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label htmlFor="storageLocation" className="text-sm font-medium text-slate-700">
                Storage Location<RequiredMark />
              </label>
              <input
                id="storageLocation"
                type="text"
                placeholder="Main Office - Room 1"
                {...register('storageLocation')}
                className={inputClass}
              />
              {errors.storageLocation && <p className="text-xs text-red-500">{errors.storageLocation.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label htmlFor="description" className="text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                placeholder="Optional item notes"
                {...register('description')}
                className={`${inputClass} resize-none`}
              />
              {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
            </div>
          </div>

          <div className="sticky bottom-0 flex gap-3 border-t border-gray-100 bg-white pt-5">
            <button
              type="button"
              onClick={handleModalClose}
              disabled={mutation.isPending}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#025c2a] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[#027032] disabled:opacity-50"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : isEditMode ? (
                'Save Changes'
              ) : (
                'Add Item'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
