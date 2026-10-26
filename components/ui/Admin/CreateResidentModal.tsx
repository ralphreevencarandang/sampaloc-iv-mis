'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PasswordInput, PhilippineMobileInput } from '@/components/ui/resident-inputs'
import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import { createAdminResidentAction } from '@/server/actions/resident.actions'
import { residentRegistrationSchema, type ResidentRegistrationInput } from '@/validations/resident.validation'
import { getRegistrationAge, getRegistrationVotingFields, VALID_ID_TYPES } from '@/lib/resident-registration'
import { PWD_CONDITIONS } from '@/lib/resident-demographics'
import { validateValidIdImageFile } from '@/lib/valid-id-image'

type Props = { isOpen: boolean; onClose: () => void }
type Field = 'email'|'password'|'confirmPassword'|'firstName'|'lastName'|'middleName'|'birthDate'|'gender'|'civilStatus'|'street'|'houseNumber'|'subdivision'|'phase'|'contactNumber'|'occupation'|'citizenship'|'isVoter'|'precinctNumber'|'is4Ps'|'isPwd'|'pwdCondition'|'idType'|'idNumber'|'otherIdType'
type Values = Omit<ResidentRegistrationInput, 'validIDImageName' | 'idType'> & { idType: ResidentRegistrationInput['idType'] | '' }
const empty: Values = { email:'', password:'', confirmPassword:'', firstName:'', lastName:'', middleName:'', birthDate:'', gender:'', civilStatus:'', street:'', houseNumber:'', subdivision:'', phase:'', contactNumber:'', occupation:'', citizenship:'Filipino', isVoter:'', precinctNumber:'', is4Ps:'No', isPwd:'No', pwdCondition:'', idType:'', idNumber:'', otherIdType:'' }
const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50'
const labelClass = 'mb-1 block text-sm font-medium text-gray-700'

export default function CreateResidentModal({ isOpen, onClose }: Props) {
  const [values, setValues] = useState<Values>(empty)
  const [image, setImage] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string,string>>({})
  const { handleSubmit, register } = useForm({
    resolver: zodResolver(residentRegistrationSchema),
    values: { ...values, validIDImageName: image?.name ?? '' },
    resetOptions: { keepIsSubmitted: true },
  })
  const queryClient = useQueryClient()
  const age = getRegistrationAge(values.birthDate)
  const canVote = age !== null && age >= 15
  const mutation = useMutation({
    mutationFn: createAdminResidentAction,
    onSuccess: (result) => {
      if (!result.success) { setErrors(result.fieldErrors ?? {}); toast.error(result.message); return }
      toast.success('Resident created successfully. The account is pending approval.')
      void queryClient.invalidateQueries({ queryKey: ['residents'] })
      setValues(empty); setImage(null); setErrors({}); onClose()
    },
    onError: () => toast.error('Unable to create resident. Please try again.'),
  })
  useEffect(() => {
    if (!isOpen) { setValues(empty); setImage(null); setErrors({}) }
  }, [isOpen])
  if (!isOpen) return null
  const set = (name: Field, value: string) => setValues(current => {
    const next = { ...current, [name]: value }
    if (name === 'birthDate') return { ...next, ...getRegistrationVotingFields(value, current.isVoter as ''|'Yes'|'No', current.precinctNumber) }
    if (name === 'isVoter' && value === 'No') next.precinctNumber = ''
    if (name === 'isPwd' && value === 'No') next.pwdCondition = ''
    return next
  })
  const submit = (parsed: ResidentRegistrationInput) => {
    const validImage = image ? validateValidIdImageFile(image) : 'Valid ID image is required.'
    if (validImage) { setErrors({ validIDImageName: validImage }); return }
    const data = new FormData()
    for (const [key, value] of Object.entries(parsed)) data.set(key, value)
    if (image) data.set('validIDImage', image)
    mutation.mutate(data)
  }
  const control = (name: Field, title: string, type = 'text', required = false) => <div key={name}>
    <label className={labelClass} htmlFor={`create-${name}`}>{title}{required && <span className="text-red-600"> *</span>}</label>
    {type === 'password' ? <PasswordInput {...register(name)} id={`create-${name}`} className={inputClass} name={name} autoComplete="new-password" required={required} value={values[name]} onChange={e => set(name, e.target.value)} />
      : name === 'contactNumber' ? <PhilippineMobileInput {...register(name)} id={`create-${name}`} className={inputClass} name={name} required={required} value={values[name]} onChange={e => set(name, e.target.value)} />
      : <input {...register(name)} id={`create-${name}`} className={inputClass} name={name} type={type} required={required} value={values[name]} onChange={e => set(name, e.target.value)} />}
    {errors[name] && <p className="mt-1 text-sm text-red-600">{errors[name]}</p>}
  </div>
  const select = (name: Field, title: string, options: string[], required = true, disabled = false) => <div key={name}>
    <label className={labelClass} htmlFor={`create-${name}`}>{title}{required && <span className="text-red-600"> *</span>}</label>
    <select id={`create-${name}`} className={inputClass} value={values[name]} disabled={disabled} onChange={e => set(name, e.target.value)}>
      <option value="">Select {title}</option>{options.map(option => <option key={option}>{option}</option>)}
    </select>{errors[name] && <p className="mt-1 text-sm text-red-600">{errors[name]}</p>}
  </div>
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <section role="dialog" aria-modal="true" aria-labelledby="create-resident-title" className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl sm:p-7">
      <div className="mb-5 flex items-center justify-between"><div><h2 id="create-resident-title" className="text-xl font-semibold text-gray-900">Create Resident</h2><p className="text-sm text-gray-600">Enter the same registration details collected on the resident registration page.</p></div><button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button></div>
      <form noValidate onSubmit={handleSubmit(submit, fieldErrors => {
        setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([name, error]) => [name, error?.message ?? 'Invalid value.'])))
      })} className="space-y-6">
        <section><h3 className="mb-3 border-b border-primary-600 pb-2 font-semibold">Account Credentials</h3><div className="grid gap-4 sm:grid-cols-2">{control('email','Email','email',true)}{control('password','Password','password',true)}{control('confirmPassword','Confirm Password','password',true)}</div><p className="mt-2 text-xs text-gray-500">Password must be at least 8 characters and include an uppercase letter, number, and special character.</p></section>
        <section><h3 className="mb-3 border-b border-primary-600 pb-2 font-semibold">Personal Information</h3><div className="grid gap-4 sm:grid-cols-2">{control('firstName','First Name','text',true)}{control('middleName','Middle Name')}{control('lastName','Last Name','text',true)}{control('birthDate','Birth Date','date',true)}{select('gender','Gender',['Male','Female'])}{select('civilStatus','Civil Status',['Single','Married','Widowed','Divorced','Separated','Solo Parent'])}</div></section>
        <section><h3 className="mb-3 border-b border-primary-600 pb-2 font-semibold">Contact & Address</h3><div className="grid gap-4 sm:grid-cols-2">{control('street','Street','text',true)}{control('houseNumber','House Number','text',true)}{control('subdivision','Subdivision')}{control('phase','Phase')}{control('contactNumber','Contact Number','tel',true)}{control('occupation','Occupation')}{control('citizenship','Citizenship','text',true)}{select('isVoter','Eligible to Vote',['Yes','No'],true,!canVote)}{values.isVoter === 'Yes' && control('precinctNumber','Precinct Number','text',true)}{select('is4Ps','4Ps Beneficiary',['Yes','No'])}{select('isPwd','PWD',['Yes','No'])}{values.isPwd === 'Yes' && select('pwdCondition','PWD Condition',[...PWD_CONDITIONS])}</div>{!canVote && <p className="mt-2 text-xs text-gray-500">Voting eligibility is set to No for residents under age 15. Select a valid birth date to enable this field.</p>}</section>
        <section><h3 className="mb-3 border-b border-primary-600 pb-2 font-semibold">Identity Verification</h3><div className="grid gap-4 sm:grid-cols-2">{select('idType','ID Type',[...VALID_ID_TYPES])}{values.idType === 'Other' && control('otherIdType','Specify ID Type','text',true)}{control('idNumber','ID Number','text',true)}<div><label className={labelClass} htmlFor="create-validIDImage">Upload Valid ID <span className="text-red-600">*</span></label><input id="create-validIDImage" type="file" accept="image/jpeg,image/png,image/webp" disabled={!values.idType} className={inputClass} onChange={e => setImage(e.target.files?.[0] ?? null)} />{errors.validIDImageName && <p className="mt-1 text-sm text-red-600">{errors.validIDImageName}</p>}<p className="mt-1 text-xs text-gray-500">JPG, PNG, or WebP up to 5MB.</p></div></div></section>
        {errors.submit && <p role="alert" className="text-sm text-red-600">{errors.submit}</p>}
        <div className="flex justify-end gap-3 border-t pt-4"><button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium">Cancel</button><button type="submit" disabled={mutation.isPending} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">{mutation.isPending ? 'Creating...' : 'Create Resident'}</button></div>
      </form>
    </section>
  </div>
}
