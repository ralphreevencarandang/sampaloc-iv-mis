'use server'

import { createResidentAccount } from "@/server/actions/resident.actions";
import type { RegisterResidentInput } from "@/server/actions/resident.actions";

export async function registerResidentAction(input: RegisterResidentInput) {
  return createResidentAccount(input);
}
