import { z } from "zod";

export const blotterSchema = z.object({
  blotterImageName: z.string().optional(),
  complainantId: z.string().optional(),
  complainantName: z.string().min(1, { message: "Complainant name is required." }),
  respondentName: z.string().min(1, { message: "Respondent name is required." }),
  incident: z.string().min(1, { message: "Incident description is required." }),
  location: z.string().min(1, { message: "Location is required." }),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format." }),
  status: z.enum(["OPEN", "RESOLVED"]),
  handledById: z.string().optional(),
});

export type BlotterFormInput = z.infer<typeof blotterSchema>;

export function getBlotterFieldErrors(error: z.ZodError) {
  const fieldErrors = error.flatten().fieldErrors;

  return Object.fromEntries(
    Object.entries(fieldErrors).flatMap(([key, messages]) => {
      const message = Array.isArray(messages) ? messages[0] : undefined;
      return message ? [[key, message]] : [];
    })
  );
}
