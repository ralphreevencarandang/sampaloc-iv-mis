import { z } from "zod";

const requiredString = (label: string) =>
  z.string().trim().min(1, `${label} is required.`);

export const INVENTORY_CATEGORIES = [
  "Office Supplies",
  "Relief Goods",
  "Medical Supplies",
  "Emergency/Rescue",
  "Event Equipment",
] as const;

export const INVENTORY_UNITS = ["pcs", "boxes", "sacks", "sets", "kits"] as const;

export const inventorySchema = z.object({
  name: requiredString("Product name").max(160, "Product name must be 160 characters or less."),
  category: z.enum(INVENTORY_CATEGORIES, {
    message: "Select a valid category.",
  }),
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number.")
    .min(0, "Quantity must be 0 or greater."),
  unit: requiredString("Unit").max(40, "Unit must be 40 characters or less."),
  storageLocation: requiredString("Storage location").max(
    160,
    "Storage location must be 160 characters or less."
  ),
  description: z.string().trim().max(2000, "Description must be 2000 characters or less.").optional(),
});

export type InventoryFormInput = z.input<typeof inventorySchema>;
export type InventoryInput = z.output<typeof inventorySchema>;

export function getInventoryFieldErrors(error: z.ZodError) {
  const fieldErrors = error.flatten().fieldErrors;

  return Object.fromEntries(
    Object.entries(fieldErrors).flatMap(([key, messages]) => {
      const message = Array.isArray(messages) ? messages[0] : undefined;
      return message ? [[key, message]] : [];
    })
  );
}
