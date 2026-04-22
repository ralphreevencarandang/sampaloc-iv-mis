import { z } from 'zod'

const requiredString = (label: string) => z.string().trim().min(1, `${label} is required.`)

const validDateString = z
  .string()
  .min(1, 'Date is required.')
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: 'Date is invalid.',
  })

export const healthWorkerLoginSchema = z.object({
  email: z.email('Enter a valid email address.').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required.'),
})

export type HealthWorkerLoginInput = z.infer<typeof healthWorkerLoginSchema>

export const medicalRecordSchema = z.object({
  patientId: requiredString('Patient'),
  diagnosis: requiredString('Diagnosis'),
  notes: requiredString('Notes'),
  date: validDateString,
  attachments: z.any().optional(),
})

export type MedicalRecordFormInput = z.input<typeof medicalRecordSchema>

export const medicalRecordSubmissionSchema = z.object({
  patientId: requiredString('Patient'),
  diagnosis: requiredString('Diagnosis'),
  notes: requiredString('Notes'),
  date: validDateString,
  attachments: z
    .array(
      z.object({
        name: requiredString('Attachment name'),
        size: z.number().nonnegative(),
        type: z.string().optional(),
      })
    )
    .optional()
    .default([]),
})

export type MedicalRecordSubmissionInput = z.infer<typeof medicalRecordSubmissionSchema>

export function parseMedicalRecordFormData(formData: FormData) {
  const attachments = formData
    .getAll('attachments')
    .filter((value): value is File => value instanceof File && value.size > 0)
    .map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
    }))

  return medicalRecordSubmissionSchema.safeParse({
    patientId: formData.get('patientId'),
    diagnosis: formData.get('diagnosis'),
    notes: formData.get('notes'),
    date: formData.get('date'),
    attachments,
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
