import { z } from "zod";

export const householdRelationships = ["Head", "Spouse", "Son", "Daughter", "Father", "Mother", "Brother", "Sister", "Grandparent", "Grandchild", "Other"] as const;
const personName = z.string().trim().min(1).max(100).regex(/^[\p{L}\p{M} .'-]+$/u);
export const householdPersonSchema = z.object({
  firstName: personName, middleName: z.string().trim().max(100).optional().default(""), lastName: personName,
  suffix: z.string().trim().max(30).optional().default(""), birthDate: z.string().optional().default(""),
  sex: z.enum(["Male", "Female", "Other", ""]).optional().default(""),
  relationship: z.enum(householdRelationships), otherRelationship: z.string().trim().max(100).optional().default(""),
  contactNumber: z.string().trim().max(30).optional().default(""), isHead: z.boolean().optional().default(false), residentId: z.string().optional().default(""),
}).superRefine((v, ctx) => {
  if (!v.birthDate) ctx.addIssue({ code: "custom", path: ["birthDate"], message: "Birth date is required." });
  if (!v.sex) ctx.addIssue({ code: "custom", path: ["sex"], message: "Sex is required." });
  if (!v.isHead && v.relationship === "Head") ctx.addIssue({ code: "custom", path: ["relationship"], message: "Mark this member as household head to use Head." });
  if (v.relationship === "Other" && !v.otherRelationship) ctx.addIssue({ code: "custom", path: ["otherRelationship"], message: "Specify the relationship." });
  if (v.birthDate && Number.isNaN(new Date(v.birthDate).getTime())) ctx.addIssue({ code: "custom", path: ["birthDate"], message: "Enter a valid birth date." });
});
export const householdRegistrationSchema = z.object({
  enabled: z.boolean().default(false), isHead: z.boolean(), householdNumber: z.string().trim().max(40).optional().default(""),
  relationship: z.enum(householdRelationships), otherRelationship: z.string().trim().max(100).optional().default(""),
  members: z.array(householdPersonSchema).max(20).default([]),
}).superRefine((v, ctx) => {
  if (!v.enabled) return;
  if (v.relationship === "Other" && !v.otherRelationship) ctx.addIssue({ code: "custom", path: ["otherRelationship"], message: "Specify the relationship." });
  if (!v.isHead && !v.members.some(member => member.isHead)) ctx.addIssue({ code: "custom", path: ["members"], message: "Mark one family member as the household head, or select that you are the head." });
  if (v.isHead && v.relationship !== "Head") ctx.addIssue({ code: "custom", path: ["relationship"], message: "Household head relationship must be Head." });
  if (!v.isHead && v.relationship === "Head") ctx.addIssue({ code: "custom", path: ["relationship"], message: "Select your relationship to the household head." });
  if (v.members.filter(member => member.isHead).length > 1) ctx.addIssue({ code: "custom", path: ["members"], message: "Only one family member can be the household head." });
});
export type HouseholdRegistration = z.infer<typeof householdRegistrationSchema>;
