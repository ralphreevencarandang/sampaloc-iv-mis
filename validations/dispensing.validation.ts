import { z } from 'zod'

export const dispensingSchema = z.object({
  medicalRecordId: z.string().trim().min(1).max(100),
  dispenseKey: z.uuid(),
  medicines: z.array(z.object({
    itemId: z.string().trim().min(1).max(100),
    quantity: z.number().int().min(1).max(2147483647),
  })).min(1, 'Select at least one medicine.').max(50)
    .refine((lines) => new Set(lines.map((line) => line.itemId)).size === lines.length,
      'Select each medicine only once.'),
})

export type DispensingInput = z.infer<typeof dispensingSchema>
