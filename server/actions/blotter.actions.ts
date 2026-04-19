"use server";

import prismaModule from "@/lib/prisma";
import { CloudinaryUploadError, uploadImageToCloudinary } from "@/lib/cloudinary";
import { blotterSchema, getBlotterFieldErrors } from "@/validations/blotter.validation";

const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule;

export type CreateBlotterResult = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

export async function createBlotter(formData: FormData): Promise<CreateBlotterResult> {
  const fileValue = formData.get("blotterImage");
  const blotterImageFile = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;

  const handledById = formData.get("handledById") as string;

  const parsed = blotterSchema.safeParse({
    complainantId: formData.get("complainantId") || undefined,
    complainantName: formData.get("complainantName"),
    respondentName: formData.get("respondentName"),
    location: formData.get("location"),
    date: formData.get("date"),
    incident: formData.get("incident"),
    status: formData.get("status"),
    handledById: handledById ? handledById : undefined,
    blotterImageName: blotterImageFile?.name,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: getBlotterFieldErrors(parsed.error),
    };
  }

  const { data } = parsed;

  try {
    let blotterImage: string | null = null;
    if (blotterImageFile) {
      const uploadResult = await uploadImageToCloudinary(blotterImageFile, {
        assetLabel: "Blotter image",
        folder: "blotters",
      });
      blotterImage = uploadResult.secure_url;
    }

    await prisma.blotter.create({
      data: {
        complainantId: data.complainantId || null,
        complainantName: data.complainantName,
        respondentName: data.respondentName,
        incident: data.incident,
        location: data.location,
        date: new Date(data.date),
        status: data.status,
        handledById: data.handledById || null,
        blotterImage,
      },
    });

    return {
      success: true,
      message: "Blotter created successfully.",
    };
  } catch (error) {
    if (error instanceof CloudinaryUploadError) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: {
          blotterImageName: error.message,
        },
      };
    }
    console.error("create blotter failed", error);
    return {
      success: false,
      message: "An unexpected error occurred while creating the blotter.",
    };
  }
}

export async function getResidentsForDropdown() {
  try {
    const residents = await prisma.resident.findMany({
      where: {
        isArchived: false,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
      },
      orderBy: {
        firstName: "asc",
      },
    });

    return residents.map((r) => ({
      id: r.id,
      fullName: [r.firstName, r.middleName, r.lastName].filter(Boolean).join(" "),
    }));
  } catch (error) {
    console.error("fetch residents failed", error);
    throw new Error("Failed to fetch residents");
  }
}

export interface BlotterRecord {
  id: string;
  complainantId?: string | null;
  complainant: string;
  respondentName: string;
  incident: string;
  location: string;
  date: string;
  status: string;
  handledBy?: string;
  handledById?: string;
  blotterImage: string | null;
  createdAt: string;
  isArchive: boolean;
}

export async function getBlottersFromDb(options: { archived?: boolean } = {}): Promise<BlotterRecord[]> {
  const blotters = await prisma.blotter.findMany({
    where: {
      isArchive: options.archived ?? false,
    },
    include: {
      complainant: true,
      handledBy: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return blotters.map((b) => ({
    id: b.id,
    complainantId: b.complainantId,
    complainant: b.complainantName,
    respondentName: b.respondentName,
    incident: b.incident,
    location: b.location,
    date: b.date.toISOString(),
    status: b.status === "OPEN" ? "Open" : "Resolved",
    handledBy: b.handledBy
      ? [b.handledBy.firstName, b.handledBy.lastName].filter(Boolean).join(" ")
      : undefined,
    handledById: b.handledById ?? undefined,
    blotterImage: b.blotterImage,
    isArchive: b.isArchive,
  }));
}

export async function updateBlotter(id: string, formData: FormData): Promise<CreateBlotterResult> {
  const fileValue = formData.get("blotterImage");
  const blotterImageFile = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;

  const handledById = formData.get("handledById") as string;

  const parsed = blotterSchema.safeParse({
    complainantId: formData.get("complainantId") || undefined,
    complainantName: formData.get("complainantName"),
    respondentName: formData.get("respondentName"),
    location: formData.get("location"),
    date: formData.get("date"),
    incident: formData.get("incident"),
    status: formData.get("status"),
    handledById: handledById ? handledById : undefined,
    blotterImageName: blotterImageFile ? blotterImageFile.name : formData.get("blotterImageName"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: getBlotterFieldErrors(parsed.error),
    };
  }

  const { data } = parsed;

  try {
    const currentBlotter = await prisma.blotter.findUnique({
      where: { id },
    });

    if (!currentBlotter) {
      return {
        success: false,
        message: "Blotter record not found.",
      };
    }

    let blotterImage = currentBlotter.blotterImage;

    if (blotterImageFile) {
      const uploadResult = await uploadImageToCloudinary(blotterImageFile, {
        assetLabel: "Blotter image",
        folder: "blotters",
      });
      blotterImage = uploadResult.secure_url;
    } else if (!formData.get("blotterImageName")) {
      blotterImage = null;
    }

    await prisma.blotter.update({
      where: { id },
      data: {
        complainantId: data.complainantId || null,
        complainantName: data.complainantName,
        respondentName: data.respondentName,
        incident: data.incident,
        location: data.location,
        date: new Date(data.date),
        status: data.status,
        handledById: data.handledById || null,
        blotterImage,
      },
    });

    return {
      success: true,
      message: "Blotter updated successfully.",
    };
  } catch (error) {
    if (error instanceof CloudinaryUploadError) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: {
          blotterImageName: error.message,
        },
      };
    }
    console.error("update blotter failed", error);
    return {
      success: false,
      message: "An unexpected error occurred while updating the blotter.",
    };
  }
}
