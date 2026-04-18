'use client'

import React, { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { updateResidentAction } from '@/server/actions/resident.actions'
import { adminResidentUpdateSchema, type AdminResidentUpdateInput } from '@/validations/auth.validation'

export interface ResidentRecord {
  id: string
  email: string
  firstName: string
  lastName: string
  middleName: string | null
  birthDate: string
  gender: string
  civilStatus: string
  street: string
  houseNumber: string
  contactNumber: string | null
  occupation: string | null
  citizenship: string
  isVoter: boolean
  precinctNumber: string | null
  status: 'PENDING' | 'APPROVED' | 'DECLINED'
}

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  initialData?: ResidentRecord | null
}

const ResidentFormModal = ({ isOpen, onClose, initialData }: ModalProps) => {
  const queryClient = useQueryClient()
  const [globalError, setGlobalError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<AdminResidentUpdateInput>({
    resolver: zodResolver(adminResidentUpdateSchema),
    defaultValues: {
      email: '',
      status: 'PENDING',
      firstName: '',
      lastName: '',
      middleName: '',
      birthDate: '',
      gender: '',
      civilStatus: '',
      street: '',
      houseNumber: '',
      contactNumber: '',
      occupation: '',
      citizenship: '',
      isVoter: 'No',
      precinctNumber: '',
    },
  })
  const selectedIsVoter = useWatch({ control, name: 'isVoter' })

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Pre-fill
        reset({
          email: initialData.email,
          status: initialData.status,
          firstName: initialData.firstName,
          lastName: initialData.lastName,
          middleName: initialData.middleName || '',
          birthDate: initialData.birthDate ? new Date(initialData.birthDate).toISOString().split('T')[0] : '',
          gender: initialData.gender,
          civilStatus: initialData.civilStatus,
          street: initialData.street,
          houseNumber: initialData.houseNumber,
          contactNumber: initialData.contactNumber || '',
          occupation: initialData.occupation || '',
          citizenship: initialData.citizenship,
          isVoter: initialData.isVoter ? 'Yes' : 'No',
          precinctNumber: initialData.precinctNumber || '',
        })
      } else {
        reset()
      }
      queueMicrotask(() => setGlobalError(''))
    }
  }, [isOpen, initialData, reset])

  useEffect(() => {
    if (selectedIsVoter === 'No') {
      const currentPrecinctNumber = getValues('precinctNumber')

      if (currentPrecinctNumber) {
        setValue('precinctNumber', '', { shouldDirty: true, shouldValidate: true })
      }
    }
  }, [getValues, selectedIsVoter, setValue])

  const mutation = useMutation({
    mutationFn: async (data: AdminResidentUpdateInput) => {
      // Create FormData (Server action expects FormData but we tweaked it to accept FormData, wait)
      // Ah! My server action `updateResidentAction` expects `FormData`.
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value as string)
        }
      })
      
      if (!initialData) {
        throw new Error("Create functionality is not yet implemented via this modal.")
      }

      return updateResidentAction(initialData.id, formData)
    },
    onSuccess: (result) => {
      if (!result.success) {
        if (result.fieldErrors) {
           // We could bind back to react-hook-form, but global error is fine for now
           setGlobalError("Please check your inputs: " + JSON.stringify(result.fieldErrors))
        } else {
           setGlobalError(result.message)
        }
        return
      }
      
      toast.success(result.message)
      queryClient.invalidateQueries({ queryKey: ['residents'] })
      onClose()
    },
    onError: () => {
      setGlobalError('An unexpected error occurred.')
    }
  })

  const onSubmit = (data: AdminResidentUpdateInput) => {
    setGlobalError('')
    mutation.mutate(data)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col shadow-xl">
        <div className="sticky top-0 bg-white p-6 border-b border-gray-100 z-10">
          <h2 className="text-2xl font-bold text-slate-900">
            {initialData ? 'Edit Resident' : 'Add New Resident'}
          </h2>
          <p className="text-slate-600 mt-1">
            {initialData ? 'Update the resident information below' : 'Fill in the resident information below'}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 flex-1 p-6">
          {globalError && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
              {globalError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="firstName" className="text-sm font-medium text-slate-700">First Name</label>
              <input {...register('firstName')} id="firstName" type="text" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500" />
              {errors.firstName && <span className="text-xs text-red-500">{errors.firstName.message}</span>}
            </div>
            
            <div className="flex flex-col gap-1">
              <label htmlFor="middleName" className="text-sm font-medium text-slate-700">Middle Name</label>
              <input {...register('middleName')} id="middleName" type="text" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500" />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="lastName" className="text-sm font-medium text-slate-700">Last Name</label>
              <input {...register('lastName')} id="lastName" type="text" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500" />
              {errors.lastName && <span className="text-xs text-red-500">{errors.lastName.message}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">Email</label>
              <input
                {...register('email')}
                id="email"
                type="email"
                readOnly={Boolean(initialData)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 read-only:bg-slate-50 read-only:text-slate-500 read-only:cursor-not-allowed"
              />
              {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="status" className="text-sm font-medium text-slate-700">Status</label>
              <select
                {...register('status')}
                id="status"
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 text-slate-700"
              >
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="DECLINED">Declined</option>
              </select>
              {errors.status && <span className="text-xs text-red-500">{errors.status.message}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="contactNumber" className="text-sm font-medium text-slate-700">Contact Number</label>
              <input {...register('contactNumber')} id="contactNumber" type="text" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500" />
              {errors.contactNumber && <span className="text-xs text-red-500">{errors.contactNumber.message}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="birthDate" className="text-sm font-medium text-slate-700">Date of Birth</label>
              <input {...register('birthDate')} id="birthDate" type="date" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500" />
              {errors.birthDate && <span className="text-xs text-red-500">{errors.birthDate.message}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="gender" className="text-sm font-medium text-slate-700">Gender</label>
              <select {...register('gender')} id="gender" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 text-slate-700">
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              {errors.gender && <span className="text-xs text-red-500">{errors.gender.message}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="civilStatus" className="text-sm font-medium text-slate-700">Civil Status</label>
              <select {...register('civilStatus')} id="civilStatus" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 text-slate-700">
                <option value="">Select Civil Status</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Widowed">Widowed</option>
                <option value="Divorced">Divorced</option>
                <option value="Separated">Separated</option>
              </select>
              {errors.civilStatus && <span className="text-xs text-red-500">{errors.civilStatus.message}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="citizenship" className="text-sm font-medium text-slate-700">Citizenship</label>
              <input {...register('citizenship')} id="citizenship" type="text" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500" />
              {errors.citizenship && <span className="text-xs text-red-500">{errors.citizenship.message}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="occupation" className="text-sm font-medium text-slate-700">Occupation</label>
              <input {...register('occupation')} id="occupation" type="text" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500" />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="houseNumber" className="text-sm font-medium text-slate-700">House Number / Unit</label>
              <input {...register('houseNumber')} id="houseNumber" type="text" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500" />
              {errors.houseNumber && <span className="text-xs text-red-500">{errors.houseNumber.message}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="street" className="text-sm font-medium text-slate-700">Street</label>
              <input {...register('street')} id="street" type="text" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500" />
              {errors.street && <span className="text-xs text-red-500">{errors.street.message}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="isVoter" className="text-sm font-medium text-slate-700">Eligible to Vote</label>
              <select {...register('isVoter')} id="isVoter" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 text-slate-700">
                <option value="">Select Option</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
              {errors.isVoter && <span className="text-xs text-red-500">{errors.isVoter.message}</span>}
            </div>

            {selectedIsVoter === 'Yes' && (
              <div className="flex flex-col gap-1">
                <label htmlFor="precinctNumber" className="text-sm font-medium text-slate-700">Precinct Number</label>
                <input
                  {...register('precinctNumber')}
                  id="precinctNumber"
                  type="text"
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
                  placeholder="00015"
                />
                {errors.precinctNumber && <span className="text-xs text-red-500">{errors.precinctNumber.message}</span>}
              </div>
            )}
          </div>

          <div className="sticky bottom-0 bg-white py-4 border-t border-gray-100 mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {mutation.isPending ? 'Saving...' : (initialData ? 'Update Resident' : 'Add Resident')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ResidentFormModal
