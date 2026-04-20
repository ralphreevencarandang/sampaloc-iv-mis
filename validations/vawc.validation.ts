import { z } from "zod";

const trimToUndefined = (value: unknown) => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

const requiredString = (message: string, minLength = 1) =>
  z.preprocess(
    trimToUndefined,
    z.string().min(minLength, message)
  );

const optionalTrimmedString = z.preprocess(
  trimToUndefined,
  z.string().optional()
);

const requiredNumber = (message: string) =>
  z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }

    if (typeof value === "number") {
      return value;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }, z.number().int(message).min(0, message));

export const vawcSchema = z.object({
  victimName: requiredString("Victim name is required.", 2),
  victimAge: requiredNumber("Victim age is required."),
  victimSex: requiredString("Victim sex is required."),
  victimCivilStatus: requiredString("Victim civil status is required."),
  victimAddress: requiredString("Victim address is required.", 5),
  victimContactNumber: optionalTrimmedString,
  isMinor: z.preprocess((val) => val === "true" || val === true, z.boolean()),
  guardianName: optionalTrimmedString,

  respondentName: requiredString("Respondent name is required.", 2),
  respondentAge: requiredNumber("Respondent age is required."),
  respondentSex: requiredString("Respondent sex is required."),
  respondentAddress: requiredString("Respondent address is required.", 5),
  respondentContactNumber: optionalTrimmedString,
  respondentOccupation: optionalTrimmedString,
  relationshipToVictim: z.enum(["SPOUSE", "FORMER_SPOUSE", "LIVE_IN", "DATING", "FORMER_DATING", "OTHER"]),

  abuseType: z.enum(["PHYSICAL", "SEXUAL", "PSYCHOLOGICAL", "ECONOMIC"]),
  narrative: requiredString("Narrative is required.", 10),
  incidentDate: requiredString("Incident date and time is required."),
  incidentLocation: requiredString("Incident location is required.", 2),
  
  status: z.enum(["REPORTED", "SUMMONED", "RESOLVED", "DISMISSED"]).default("REPORTED"),
  
  vawcImageName: optionalTrimmedString,
}).superRefine((data, ctx) => {
  if (data.isMinor && !data.guardianName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["guardianName"],
      message: "Guardian name is required when the victim is a minor.",
    });
  }
});

export type VawcFormInput = z.infer<typeof vawcSchema>;

export function getVawcFieldErrors(error: z.ZodError) {
  const fieldErrors = error.flatten().fieldErrors;
  return Object.fromEntries(
    Object.entries(fieldErrors).flatMap(([key, messages]) => {
      const message = Array.isArray(messages) ? messages[0] : undefined;
      return message ? [[key, message]] : [];
    })
  ) as Partial<Record<keyof VawcFormInput, string>>;
}
