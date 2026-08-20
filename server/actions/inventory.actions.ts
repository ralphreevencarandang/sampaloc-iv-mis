"use server";

import prismaModule from "@/lib/prisma";
import { hasAdminPermission } from "@/lib/admin-authorization";
import {
  getInventoryFieldErrors,
  inventorySchema,
  type InventoryFormInput,
} from "@/validations/inventory.validation";

const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule;

type InventoryEntity = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  storageLocation: string;
  description: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type InventoryStatus = "In Stock" | "Low Stock" | "Out of Stock";

export type InventoryRecord = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  storageLocation: string;
  description: string | null;
  status: InventoryStatus;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InventoryMutationResult = {
  success: boolean;
  message: string;
  item?: InventoryRecord;
  fieldErrors?: Record<string, string>;
};

function getFormValue(formData: FormData, key: keyof InventoryFormInput) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getInventoryStatus(quantity: number): InventoryStatus {
  if (quantity <= 0) return "Out of Stock";
  if (quantity <= 10) return "Low Stock";
  return "In Stock";
}

function mapInventoryRecord(item: InventoryEntity): InventoryRecord {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    storageLocation: item.storageLocation,
    description: item.description,
    status: getInventoryStatus(item.quantity),
    isArchived: item.isArchived,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function parseInventoryForm(formData: FormData) {
  const parsed = inventorySchema.safeParse({
    name: getFormValue(formData, "name"),
    category: getFormValue(formData, "category"),
    quantity: getFormValue(formData, "quantity"),
    unit: getFormValue(formData, "unit"),
    storageLocation: getFormValue(formData, "storageLocation"),
    description: getFormValue(formData, "description"),
  });

  if (!parsed.success) {
    return {
      fieldErrors: getInventoryFieldErrors(parsed.error),
    };
  }

  return {
    data: parsed.data,
  };
}

export async function getInventoryFromDb(options: { archived?: boolean } = {}): Promise<InventoryRecord[]> {
  const items = await prisma.inventoryItem.findMany({
    where: {
      isArchived: options.archived ?? false,
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });

  return items.map((item) => mapInventoryRecord(item as InventoryEntity));
}

export async function createInventoryItem(formData: FormData): Promise<InventoryMutationResult> {
  if (!(await hasAdminPermission("inventory", "write"))) {
    return { success: false, message: "You do not have permission to create inventory items." };
  }

  const { data, fieldErrors } = parseInventoryForm(formData);

  if (!data) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  try {
    const createdItem = await prisma.inventoryItem.create({
      data: {
        name: data.name,
        category: data.category,
        quantity: data.quantity,
        unit: data.unit,
        storageLocation: data.storageLocation,
        description: data.description || null,
      },
    });

    return {
      success: true,
      message: "Inventory item created successfully.",
      item: mapInventoryRecord(createdItem as InventoryEntity),
    };
  } catch (error) {
    console.error("create inventory item failed", error);
    return {
      success: false,
      message: "An unexpected error occurred while creating the inventory item.",
    };
  }
}

export async function updateInventoryItem(
  id: string,
  formData: FormData
): Promise<InventoryMutationResult> {
  if (!(await hasAdminPermission("inventory", "write"))) {
    return { success: false, message: "You do not have permission to update inventory items." };
  }

  const { data, fieldErrors } = parseInventoryForm(formData);

  if (!data) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  try {
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingItem) {
      return {
        success: false,
        message: "Inventory item not found.",
      };
    }

    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: {
        name: data.name,
        category: data.category,
        quantity: data.quantity,
        unit: data.unit,
        storageLocation: data.storageLocation,
        description: data.description || null,
      },
    });

    return {
      success: true,
      message: "Inventory item updated successfully.",
      item: mapInventoryRecord(updatedItem as InventoryEntity),
    };
  } catch (error) {
    console.error("update inventory item failed", error);
    return {
      success: false,
      message: "An unexpected error occurred while updating the inventory item.",
    };
  }
}

export async function archiveInventoryItem(id: string): Promise<InventoryMutationResult> {
  return setInventoryArchiveStatusAction(id, true);
}

export async function unarchiveInventoryItem(id: string): Promise<InventoryMutationResult> {
  return setInventoryArchiveStatusAction(id, false);
}

async function setInventoryArchiveStatusAction(
  id: string,
  isArchived: boolean
): Promise<InventoryMutationResult> {
  if (!(await hasAdminPermission("inventory", "write"))) {
    return { success: false, message: "You do not have permission to archive inventory items." };
  }

  try {
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingItem) {
      return {
        success: false,
        message: "Inventory item not found.",
      };
    }

    const item = await prisma.inventoryItem.update({
      where: { id },
      data: { isArchived },
    });

    return {
      success: true,
      message: isArchived
        ? "Inventory item archived successfully."
        : "Inventory item restored successfully.",
      item: mapInventoryRecord(item as InventoryEntity),
    };
  } catch (error) {
    console.error("update inventory archive status failed", error);
    return {
      success: false,
      message: isArchived
        ? "An unexpected error occurred while archiving the inventory item."
        : "An unexpected error occurred while restoring the inventory item.",
    };
  }
}
