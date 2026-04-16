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
    complainantId: formData.get("complainantId"),
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
        complainantId: data.complainantId,
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
