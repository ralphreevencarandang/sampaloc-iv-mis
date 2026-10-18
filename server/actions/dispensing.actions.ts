'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { getCurrentHealthWorkerFromSession } from '@/lib/health-worker-session'
import { dispensingSchema } from '@/validations/dispensing.validation'
import { dispenseInventory, DispensingError } from '@/lib/medicine-dispensing'

export async function dispenseMedicinesAction(input: unknown) {
  const actor = await getCurrentHealthWorkerFromSession()
  if (!actor) return { success: false, message: 'A health worker session is required to dispense medicine.', retryable: false }
  const parsed = dispensingSchema.safeParse(input)
  if (!parsed.success) return { success: false, message: 'Select medicines and enter positive whole-number quantities.', retryable: false }
  try {
    const result = await dispenseInventory(prisma, actor.id, parsed.data)
    revalidatePath('/admin/inventory')
    revalidatePath('/clinic/medical-records')
    revalidatePath('/admin/health')
    return { success: true, message: result.duplicate ? 'This dispensing was already recorded. Stock was not deducted again.' : 'Medicines dispensed and inventory updated.', retryable: false }
  } catch (error) {
    if (error instanceof DispensingError) return { success: false, message: error.message, retryable: false }
    // Do not log patient details or database query arguments.
    console.error('Medicine dispensing failed.')
    return { success: false, message: 'Unable to confirm dispensing. Retry this submission to check its result safely.', retryable: true }
  }
}
