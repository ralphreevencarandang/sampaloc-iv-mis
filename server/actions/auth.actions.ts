'use server'

import { createResidentAccount } from "@/server/actions/resident.actions";

export async function registerResidentAction(formData: FormData) {
  return createResidentAccount(formData);
}
