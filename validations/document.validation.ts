import { z } from 'zod'

const requiredString = (label: string) => z.string().trim().min(1, `${label} is required.`)

export const documentRequestSchema = z
  .object({
    documentType: requiredString('Document type'),
    purpose: requiredString('Purpose'),
    requestedCopies: z
      .string()
      .trim()
      .min(1, 'Number of copies is required.')
      .refine((value) => /^[1-5]$/.test(value), {
        message: 'Enter a copy count between 1 and 5.',
      }),
    clearanceFor: z.string().trim().optional().default(''),
    assistanceProgram: z.string().trim().optional().default(''),
    yearsOfResidency: z.string().trim().optional().default(''),
    cedulaYear: z.string().trim().optional().default(''),
    annualIncome: z.string().trim().optional().default(''),
    emergencyContactName: z.string().trim().optional().default(''),
    emergencyContactNumber: z.string().trim().optional().default(''),
    schoolOrTraining: z.string().trim().optional().default(''),
    targetEmployer: z.string().trim().optional().default(''),
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

    if (value.documentType === 'clearance') {
      requireField('clearanceFor', 'Clearance for')
    }

    if (value.documentType === 'indigency') {
      requireField('assistanceProgram', 'Assistance program / institution')
    }

    if (value.documentType === 'residency') {
      requireField('yearsOfResidency', 'Years of residency')
    }

    if (value.documentType === 'cedula') {
      requireField('cedulaYear', 'Cedula year')
      requireField('annualIncome', 'Annual income')
    }

    if (value.documentType === 'barangay-id') {
      requireField('emergencyContactName', 'Emergency contact name')
      requireField('emergencyContactNumber', 'Emergency contact number')
    }

    if (value.documentType === 'first-time-job-seeker') {
      requireField('schoolOrTraining', 'School / training background')
      requireField('targetEmployer', 'Target employer / industry')
    }
  })

export type DocumentRequestInput = z.input<typeof documentRequestSchema>

export function parseDocumentRequestFormData(formData: FormData) {
  return documentRequestSchema.safeParse({
    documentType: formData.get('documentType'),
    purpose: formData.get('purpose'),
    requestedCopies: formData.get('requestedCopies'),
    clearanceFor: formData.get('clearanceFor'),
    assistanceProgram: formData.get('assistanceProgram'),
    yearsOfResidency: formData.get('yearsOfResidency'),
    cedulaYear: formData.get('cedulaYear'),
    annualIncome: formData.get('annualIncome'),
    emergencyContactName: formData.get('emergencyContactName'),
    emergencyContactNumber: formData.get('emergencyContactNumber'),
    schoolOrTraining: formData.get('schoolOrTraining'),
    targetEmployer: formData.get('targetEmployer'),
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
