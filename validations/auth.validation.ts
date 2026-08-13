import { z } from "zod";
import { calculateAge, PWD_CONDITIONS } from "@/lib/resident-demographics";

const requiredString = (label: string) =>
  z.string().trim().min(1, `${label} is required.`);

const yesNoSchema = z.enum(["Yes", "No"], {
  message: "Please select Yes or No.",
}).or(z.literal("").refine(() => false, { message: "Please select Yes or No." }));

const baseResidentFields = {
  firstName: requiredString("First name"),
  lastName: requiredString("Last name"),
  middleName: z.string().trim().optional().default(""),
  birthDate: z
    .string()
    .min(1, "Birth date is required.")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: "Birth date is invalid.",
    })
    .refine((value) => calculateAge(value) > 0, {
      message: "Age must be greater than 0.",
    }),
  gender: requiredString("Gender"),
  civilStatus: requiredString("Civil status"),
  street: requiredString("Street"),
  houseNumber: requiredString("House number"),
  subdivision: z.string().trim().optional().default(""),
  phase: z.string().trim().optional().default(""),
  contactNumber: requiredString("Contact number"),
  occupation: z.string().trim().optional().default(""),
  citizenship: requiredString("Citizenship"),
  isVoter: yesNoSchema,
  precinctNumber: z.string().trim().optional().default(""),
  is4Ps: yesNoSchema,
  isPwd: yesNoSchema,
  pwdCondition: z.string().trim().optional().default(""),
};

function validateResidentDependencies(
  value: {
    isVoter: string;
    precinctNumber: string;
    isPwd: string;
    pwdCondition: string;
  },
  ctx: z.RefinementCtx
) {
  if (value.isVoter === "Yes" && !value.precinctNumber.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["precinctNumber"],
      message: "Precinct number is required when eligible to vote.",
    });
  }

  if (value.isPwd === "Yes") {
    if (!value.pwdCondition.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pwdCondition"],
        message: "PWD condition is required when PWD is Yes.",
      });
      return;
    }

    if (!PWD_CONDITIONS.includes(value.pwdCondition as (typeof PWD_CONDITIONS)[number])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pwdCondition"],
        message: "Select a valid PWD condition.",
      });
    }
  }

  if (value.isPwd === "No" && value.pwdCondition.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["pwdCondition"],
      message: "PWD condition must be empty when PWD is No.",
    });
  }
}

export const adminResidentUpdateSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  status: z.enum(["PENDING", "APPROVED", "DECLINED"]),
  ...baseResidentFields,
}).superRefine((value, ctx) => {
  validateResidentDependencies(value, ctx);
});

export type AdminResidentUpdateInput = z.input<typeof adminResidentUpdateSchema>;

export const residentRegistrationSchema = z
  .object({
    email: z.email("Enter a valid email address.").trim().toLowerCase(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
      .regex(/[0-9]/, "Password must contain at least one number.")
      .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
    validIDImageName: requiredString("Valid ID image"),
    ...baseResidentFields,
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })
  .superRefine((value, ctx) => {
    validateResidentDependencies(value, ctx);
  });

export type ResidentRegistrationInput = z.infer<
  typeof residentRegistrationSchema
>;

export const residentLoginSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password: z.string().min(1, "Password is required."),
});

export type ResidentLoginInput = z.infer<typeof residentLoginSchema>;

export const adminLoginSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password: z.string().min(1, "Password is required."),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export function getZodFieldErrors(error: z.ZodError) {
  const fieldErrors = error.flatten().fieldErrors;

  return Object.fromEntries(
    Object.entries(fieldErrors).flatMap(([key, messages]) => {
      const message = Array.isArray(messages) ? messages[0] : undefined;
      return message ? [[key, message]] : [];
    })
  );
}
