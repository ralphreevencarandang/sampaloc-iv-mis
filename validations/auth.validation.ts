import { z } from "zod";

const requiredString = (label: string) =>
  z.string().trim().min(1, `${label} is required.`);

export const residentRegistrationSchema = z
  .object({
    email: z.email("Enter a valid email address.").trim().toLowerCase(),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
    firstName: requiredString("First name"),
    lastName: requiredString("Last name"),
    middleName: z.string().trim().optional().default(""),
    birthDate: z
      .string()
      .min(1, "Birth date is required.")
      .refine((value) => !Number.isNaN(new Date(value).getTime()), {
        message: "Birth date is invalid.",
      }),
    gender: requiredString("Gender"),
    civilStatus: requiredString("Civil status"),
    street: requiredString("Street"),
    houseNumber: requiredString("House number"),
    contactNumber: requiredString("Contact number"),
    occupation: z.string().trim().optional().default(""),
    citizenship: requiredString("Citizenship"),
    validIDImageName: requiredString("Valid ID image"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type ResidentRegistrationInput = z.infer<
  typeof residentRegistrationSchema
>;

export const residentLoginSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password: z.string().min(1, "Password is required."),
});

export type ResidentLoginInput = z.infer<typeof residentLoginSchema>;

export function getZodFieldErrors(error: z.ZodError) {
  const fieldErrors = error.flatten().fieldErrors;

  return Object.fromEntries(
    Object.entries(fieldErrors).flatMap(([key, messages]) => {
      const message = Array.isArray(messages) ? messages[0] : undefined;
      return message ? [[key, message]] : [];
    })
  );
}
