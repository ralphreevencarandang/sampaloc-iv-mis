import { z } from "zod";

const requiredString = (label: string) =>
  z.string().trim().min(1, `${label} is required.`);

export const officialStatusSchema = z.enum(["Active", "Inactive"]);

export const officialSchema = z
  .object({
    firstName: requiredString("First name"),
    lastName: requiredString("Last name"),
    email: z.email("Enter a valid email address.").trim().toLowerCase(),
    status: officialStatusSchema,
    position: requiredString("Position"),
    termStart: z
      .string()
      .min(1, "Term start is required.")
      .refine((value) => !Number.isNaN(new Date(value).getTime()), {
        message: "Term start is invalid.",
      }),
    termEnd: z
      .string()
      .trim()
      .optional()
      .transform((value) => value ?? "")
      .refine((value) => value === "" || !Number.isNaN(new Date(value).getTime()), {
        message: "Term end is invalid.",
      }),
  })
  .refine(
    (value) =>
      !value.termEnd || new Date(value.termEnd).getTime() >= new Date(value.termStart).getTime(),
    {
      message: "Term end must be on or after the term start date.",
      path: ["termEnd"],
    }
  );

export type OfficialFormInput = z.input<typeof officialSchema>;
export type OfficialInput = z.output<typeof officialSchema>;
export type OfficialStatus = z.infer<typeof officialStatusSchema>;

export function getOfficialFieldErrors(error: z.ZodError) {
  const fieldErrors = error.flatten().fieldErrors;

  return Object.fromEntries(
    Object.entries(fieldErrors).flatMap(([key, messages]) => {
      const message = Array.isArray(messages) ? messages[0] : undefined;
      return message ? [[key, message]] : [];
    })
  );
}
