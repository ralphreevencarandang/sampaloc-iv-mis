import { documentTypeRequiresPurpose, getDocumentFieldNames } from '@/lib/document-request-catalog'
import { z } from 'zod'

const requiredString = (label: string) => z.string().trim().min(1, `${label} is required.`)
const optionalString = () => z.string().trim().optional().default('')

export const documentRequestSchema = z
  .object({
    documentType: requiredString('Document type'),
    purpose: optionalString(),
    requestedCopies: z
      .string()
      .trim()
      .min(1, 'Number of copies is required.')
      .refine((value) => /^[1-5]$/.test(value), {
        message: 'Enter a copy count between 1 and 5.',
      }),
    yearsOfResidency: optionalString(),
    placeOfBirth: optionalString(),
    emergencyContactPerson: optionalString(),
    emergencyContactAddress: optionalString(),
    emergencyContactNumber: optionalString(),
  })
  .superRefine((value, ctx) => {
    const requireField = (field: keyof typeof value, label: string) => {
      if (!String(value[field] ?? '').trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `${label} is required.`,
        })
      }
    }

    if (documentTypeRequiresPurpose(value.documentType)) {
      requireField('purpose', 'Purpose')
    }

    if (['clearance', 'indigency', 'residency'].includes(value.documentType)) {
      requireField('yearsOfResidency', 'Years of residency')
    }

    if (value.documentType === 'cedula') {
      requireField('placeOfBirth', 'Place of birth')
    }

    if (value.documentType === 'barangay-id') {
      requireField('placeOfBirth', 'Place of birth')
      requireField('emergencyContactPerson', 'Emergency contact person')
      requireField('emergencyContactAddress', 'Emergency contact address')
      requireField('emergencyContactNumber', 'Emergency contact number')
    }

    if (value.documentType === 'first-time-job-seeker') {
      requireField('yearsOfResidency', 'Years of residency')
    }
  })

export type DocumentRequestInput = z.input<typeof documentRequestSchema>
export type DocumentRequestData = z.output<typeof documentRequestSchema>

export const requestStepFieldNames = [
  'documentType',
  'purpose',
  'requestedCopies',
  'yearsOfResidency',
  'placeOfBirth',
  'emergencyContactPerson',
  'emergencyContactAddress',
  'emergencyContactNumber',
] as const

export function getRelevantDocumentRequestFields(documentType: string) {
  const relevant = new Set<string>(['documentType', 'requestedCopies'])

  if (documentTypeRequiresPurpose(documentType)) {
    relevant.add('purpose')
  }

  getDocumentFieldNames(documentType).forEach((fieldName) => {
    relevant.add(fieldName)
  })

  return relevant
}

export function pickRelevantDocumentRequestData(data: DocumentRequestData) {
  const relevantFields = getRelevantDocumentRequestFields(data.documentType)

  return Object.fromEntries(
    Object.entries(data).filter(([key, value]) => {
      if (key === 'documentType' || key === 'requestedCopies' || key === 'purpose') {
        return false
      }

      if (!relevantFields.has(key)) {
        return false
      }

      return typeof value === 'string' ? value.trim().length > 0 : value !== undefined
    })
  )
}

function getFormDataString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value : undefined
}

export function parseDocumentRequestFormData(formData: FormData) {
  return documentRequestSchema.safeParse({
    documentType: getFormDataString(formData, 'documentType'),
    purpose: getFormDataString(formData, 'purpose'),
    requestedCopies: getFormDataString(formData, 'requestedCopies') ?? '1',
    yearsOfResidency: getFormDataString(formData, 'yearsOfResidency'),
    placeOfBirth: getFormDataString(formData, 'placeOfBirth'),
    emergencyContactPerson: getFormDataString(formData, 'emergencyContactPerson'),
    emergencyContactAddress: getFormDataString(formData, 'emergencyContactAddress'),
    emergencyContactNumber: getFormDataString(formData, 'emergencyContactNumber'),
  })
}

export function getZodFieldErrors(error: z.ZodError) {
  const fieldErrors = error.flatten().fieldErrors

  return Object.fromEntries(
    Object.entries(fieldErrors).flatMap(([key, messages]) => {
      const message = Array.isArray(messages) ? messages[0] : undefined
      return message ? [[key, message]] : []
    })
  )
}
