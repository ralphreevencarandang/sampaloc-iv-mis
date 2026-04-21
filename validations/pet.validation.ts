import { z } from "zod";

const requiredString = (label: string) =>
  z.string().trim().min(1, `${label} is required.`);

export const petSchema = z.object({
  ownerId: requiredString("Owner"),
  name: requiredString("Pet name").max(120, "Pet name must be 120 characters or less."),
  type: requiredString("Pet type").max(80, "Pet type must be 80 characters or less."),
  breed: z.string().trim().max(120, "Breed must be 120 characters or less.").optional(),
  color: z.string().trim().max(120, "Color must be 120 characters or less.").optional(),
  vaccinationDate: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), {
      message: "Vaccination date must be a valid date.",
    }),
});

export type PetFormInput = z.input<typeof petSchema>;
export type PetInput = z.output<typeof petSchema>;

export const residentPetSchema = petSchema.pick({
  name: true,
  type: true,
  breed: true,
  color: true,
  vaccinationDate: true,
}).extend({
  ownerId: z.string().optional(),
  ownerName: z.string().min(1, { message: "Owner name is required." }),
});

export type ResidentPetFormInput = z.input<typeof residentPetSchema>;

export function getPetFieldErrors(error: z.ZodError) {
  const fieldErrors = error.flatten().fieldErrors;

  return Object.fromEntries(
    Object.entries(fieldErrors).flatMap(([key, messages]) => {
      const message = Array.isArray(messages) ? messages[0] : undefined;
      return message ? [[key, message]] : [];
    })
  );
}
