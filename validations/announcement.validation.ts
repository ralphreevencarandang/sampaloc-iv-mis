import { z } from "zod";
import { ANNOUNCEMENT_OFFICIALS } from "@/lib/announcement-creator";

const requiredString = (label: string) =>
  z.string().trim().min(1, `${label} is required.`);

export const announcementSchema = z.object({
  title: requiredString("Title").max(150, "Title must be 150 characters or less."),
  content: requiredString("Content").max(5000, "Content must be 5000 characters or less."),
  imageName: z.string().trim().max(255, "Image name must be 255 characters or less.").optional(),
  creatorName: z.string().refine(value => value === "" || ANNOUNCEMENT_OFFICIALS.some(official => official.name === value), "Select an official from the allowed list.").optional(),
});

export function announcementFormSchema(canSelectCreator: boolean, isEditing: boolean) {
  return announcementSchema.superRefine((data, context) => {
    if (canSelectCreator && !isEditing && !data.creatorName) {
      context.addIssue({ code: "custom", path: ["creatorName"], message: "Select an announcement creator." });
    }
  });
}

export type AnnouncementFormInput = z.input<typeof announcementSchema>;
export type AnnouncementInput = z.output<typeof announcementSchema>;

export function getAnnouncementFieldErrors(error: z.ZodError) {
  const fieldErrors = error.flatten().fieldErrors;

  return Object.fromEntries(
    Object.entries(fieldErrors).flatMap(([key, messages]) => {
      const message = Array.isArray(messages) ? messages[0] : undefined;
      return message ? [[key, message]] : [];
    })
  );
}
