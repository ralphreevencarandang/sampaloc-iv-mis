'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, X } from 'lucide-react'
import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import {
  createPet,
  getPetOwnersForDropdown,
  updatePet,
  type PetOwnerOption,
  type PetRecord,
} from '@/server/actions/pet.action'
import { petSchema, type PetFormInput } from '@/validations/pet.validation'

type PetsFormModalProps = {
  isOpen: boolean
  onClose: () => void
  initialData?: PetRecord | null
  onSaved?: (pet: PetRecord) => void
}

function RequiredMark() {
  return <span aria-hidden="true" className="ml-1 text-red-500">*</span>
}

export default function PetsFormModal({
  isOpen,
  onClose,
  initialData,
  onSaved,
}: PetsFormModalProps) {
  const queryClient = useQueryClient()
  const isEditMode = Boolean(initialData)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<PetFormInput>({
    resolver: zodResolver(petSchema),
    defaultValues: {
      ownerId: '',
      name: '',
      type: '',
      breed: '',
      color: '',
      vaccinationDate: '',
    },
  })

  const {
    data: owners = [],
    isLoading: isOwnersLoading,
    isError: isOwnersError,
    error: ownersError,
  } = useQuery<PetOwnerOption[]>({
    queryKey: ['pets', 'owners'],
    queryFn: getPetOwnersForDropdown,
    enabled: isOpen,
  })

  useEffect(() => {
    if (!isOpen) {
      return
    }

    reset({
      ownerId: initialData?.ownerId ?? '',
      name: initialData?.name ?? '',
      type: initialData?.type ?? '',
      breed: initialData?.breed ?? '',
      color: initialData?.color ?? '',
      vaccinationDate: initialData?.vaccinationDate
        ? new Date(initialData.vaccinationDate).toISOString().split('T')[0]
        : '',
    })
  }, [initialData, isOpen, reset])

  const mutation = useMutation({
    mutationFn: async (data: PetFormInput) => {
      const formData = new FormData()
      formData.set('ownerId', data.ownerId)
      formData.set('name', data.name)
      formData.set('type', data.type)
      formData.set('breed', data.breed ?? '')
      formData.set('color', data.color ?? '')
      formData.set('vaccinationDate', data.vaccinationDate ?? '')

      return isEditMode && initialData
        ? updatePet(initialData.id, formData)
        : createPet(formData)
    },
    onSuccess: (result) => {
      if (!result.success) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            setError(field as keyof PetFormInput, {
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

      if (result.pet) {
        onSaved?.(result.pet)
      }

      void queryClient.invalidateQueries({ queryKey: ['pets'] })
      handleModalClose()
    },
    onError: (error) => {
      setError('root', {
        type: 'server',
        message:
          error instanceof Error
            ? error.message
            : isEditMode
              ? 'An unexpected error occurred while updating the pet.'
              : 'An unexpected error occurred while creating the pet.',
      })
    },
  })

  const handleModalClose = () => {
    reset({
      ownerId: '',
      name: '',
      type: '',
      breed: '',
      color: '',
      vaccinationDate: '',
    })
    onClose()
  }

  const onSubmit = async (data: PetFormInput) => {
    await mutation.mutateAsync(data)
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-white p-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {isEditMode ? 'Edit Pet' : 'Register Pet'}
            </h2>
            <p className="mt-1 text-slate-600">
              {isEditMode
                ? 'Update the pet registration details below.'
                : 'Enter the pet registration details below.'}
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
              <label htmlFor="ownerId" className="text-sm font-medium text-slate-700">
                Owner<RequiredMark />
              </label>
              <select
                id="ownerId"
                {...register('ownerId')}
                disabled={isOwnersLoading || isOwnersError}
                className="rounded-lg border border-gray-200 px-4 py-2 text-slate-700 focus:border-primary-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">
                  {isOwnersLoading ? 'Loading residents...' : 'Select resident owner'}
                </option>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.fullName}
                  </option>
                ))}
              </select>
              {errors.ownerId && <p className="text-xs text-red-500">{errors.ownerId.message}</p>}
              {isOwnersError && (
                <p className="text-xs text-red-500">
                  {ownersError instanceof Error ? ownersError.message : 'Failed to load residents.'}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm font-medium text-slate-700">
                Pet Name<RequiredMark />
              </label>
              <input
                id="name"
                type="text"
                placeholder="Enter pet name"
                {...register('name')}
                className="rounded-lg border border-gray-200 px-4 py-2 text-slate-700 focus:border-primary-500 focus:outline-none"
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="type" className="text-sm font-medium text-slate-700">
                Type<RequiredMark />
              </label>
              <input
                id="type"
                type="text"
                placeholder="Dog, Cat, Bird..."
                {...register('type')}
                className="rounded-lg border border-gray-200 px-4 py-2 text-slate-700 focus:border-primary-500 focus:outline-none"
              />
              {errors.type && <p className="text-xs text-red-500">{errors.type.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="breed" className="text-sm font-medium text-slate-700">
                Breed
              </label>
              <input
                id="breed"
                type="text"
                placeholder="Enter breed"
                {...register('breed')}
                className="rounded-lg border border-gray-200 px-4 py-2 text-slate-700 focus:border-primary-500 focus:outline-none"
              />
              {errors.breed && <p className="text-xs text-red-500">{errors.breed.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="color" className="text-sm font-medium text-slate-700">
                Color
              </label>
              <input
                id="color"
                type="text"
                placeholder="Enter color"
                {...register('color')}
                className="rounded-lg border border-gray-200 px-4 py-2 text-slate-700 focus:border-primary-500 focus:outline-none"
              />
              {errors.color && <p className="text-xs text-red-500">{errors.color.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label htmlFor="vaccinationDate" className="text-sm font-medium text-slate-700">
                Vaccination Date
              </label>
              <input
                id="vaccinationDate"
                type="date"
                {...register('vaccinationDate')}
                className="rounded-lg border border-gray-200 px-4 py-2 text-slate-700 focus:border-primary-500 focus:outline-none"
              />
              {errors.vaccinationDate && (
                <p className="text-xs text-red-500">{errors.vaccinationDate.message}</p>
              )}
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
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : isEditMode ? (
                'Save Changes'
              ) : (
                'Register Pet'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
