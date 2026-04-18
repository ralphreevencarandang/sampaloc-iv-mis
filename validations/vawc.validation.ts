import { z } from "zod";

export const vawcSchema = z.object({
  victimName: z.string().min(2, "Victim name must be at least 2 characters."),
  victimAge: z.coerce.number().min(0, "Age must be a valid positive number."),
  victimSex: z.string().min(1, "Sex is required."),
  victimCivilStatus: z.string().min(1, "Civil Status is required."),
  victimAddress: z.string().min(5, "Address must be at least 5 characters."),
  victimContactNumber: z.string().optional(),
  isMinor: z.boolean().default(false),
  guardianName: z.string().optional(),

  respondentName: z.string().min(2, "Respondent name must be at least 2 characters."),
  respondentAge: z.coerce.number().min(0, "Age must be a valid positive number."),
  respondentSex: z.string().min(1, "Sex is required."),
  respondentAddress: z.string().min(5, "Address must be at least 5 characters."),
  respondentContactNumber: z.string().optional(),
  respondentOccupation: z.string().optional(),
  relationshipToVictim: z.enum(["SPOUSE", "FORMER_SPOUSE", "LIVE_IN", "DATING", "FORMER_DATING", "OTHER"]),

  abuseType: z.enum(["PHYSICAL", "SEXUAL", "PSYCHOLOGICAL", "ECONOMIC"]),
  narrative: z.string().min(10, "Narrative must be at least 10 characters long."),
  incidentDate: z.string().min(1, "Incident date and time is required."),
  incidentLocation: z.string().min(2, "Location is required."),
  
  status: z.enum(["REPORTED", "SUMMONED", "RESOLVED", "DISMISSED"]).default("REPORTED"),
  
  vawcImageName: z.string().optional(), // Used for tracking cloudinary file name validation if applicable
});

export type VawcFormInput = z.infer<typeof vawcSchema>;

export function getVawcFieldErrors(error: z.ZodError<VawcFormInput>) {
  const fieldErrors: Partial<Record<keyof VawcFormInput, string>> = {};
  error.errors.forEach((err) => {
    if (err.path[0]) {
      fieldErrors[err.path[0] as keyof VawcFormInput] = err.message;
    }
  });
  return fieldErrors;
}
