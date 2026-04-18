'use server'

import { CloudinaryUploadError, uploadImageToCloudinary } from "@/lib/cloudinary";
import prismaModule from "@/lib/prisma";
import {
  announcementSelect,
  mapAnnouncementRecord,
  type AnnouncementRecord,
} from "@/server/announcements/announcements";
import {
  announcementSchema,
  getAnnouncementFieldErrors,
  type AnnouncementFormInput,
} from "@/validations/announcement.validation";

const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule;

export type AnnouncementMutationResult = {
  success: boolean;
  message: string;
  announcement?: AnnouncementRecord;
  fieldErrors?: Record<string, string>;
};

type SanitizedAnnouncementInput = {
  title: string;
  content: string;
  createdById: string;
  imageFile: File | null;
  removeImage: boolean;
};

function getFormValue(formData: FormData, key: keyof AnnouncementFormInput) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function validateAnnouncementForm(formData: FormData): {
  data?: SanitizedAnnouncementInput;
  fieldErrors?: Record<string, string>;
} {
  const imageFileValue = formData.get("image");
  const imageFile =
    imageFileValue instanceof File && imageFileValue.size > 0 ? imageFileValue : null;
  const removeImage = formData.get("removeImage") === "true";

  const parsed = announcementSchema.safeParse({
    title: getFormValue(formData, "title"),
    content: getFormValue(formData, "content"),
    createdById: getFormValue(formData, "createdById"),
    imageName: imageFile?.name ?? "",
  });

  if (!parsed.success) {
    return {
      fieldErrors: getAnnouncementFieldErrors(parsed.error),
    };
  }

  return {
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      createdById: parsed.data.createdById,
      imageFile,
      removeImage,
    },
  };
}

export async function createAnnouncementAction(
  formData: FormData
): Promise<AnnouncementMutationResult> {
  const { data, fieldErrors } = validateAnnouncementForm(formData);

  if (!data) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  try {
    const official = await prisma.official.findUnique({
      where: { id: data.createdById },
      select: { id: true },
    });

    if (!official) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: {
          createdById: "Select a valid official.",
        },
      };
    }

    let imageUrl: string | null = null;

    if (data.imageFile) {
      const uploadResult = await uploadImageToCloudinary(data.imageFile, {
        assetLabel: "Announcement image",
        folder: "announcements",
        publicIdPrefix: data.title.replace(/[^a-z0-9]/gi, "-").toLowerCase(),
      });

      imageUrl = uploadResult.secure_url;
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        image: imageUrl,
        createdById: data.createdById,
      },
      select: announcementSelect,
    });

    return {
      success: true,
      message: "Announcement created successfully.",
      announcement: mapAnnouncementRecord(announcement),
    };
  } catch (error) {
    if (error instanceof CloudinaryUploadError) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: {
          imageName: error.message,
        },
      };
    }

    console.error("create announcement failed", error);

    return {
      success: false,
      message: "An unexpected error occurred while creating the announcement.",
    };
  }
}

export async function updateAnnouncementAction(
  id: string,
  formData: FormData
): Promise<AnnouncementMutationResult> {
  const { data, fieldErrors } = validateAnnouncementForm(formData);

  if (!data) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  try {
    const existingAnnouncement = await prisma.announcement.findUnique({
      where: { id },
      select: {
        id: true,
        image: true,
      },
    });

    if (!existingAnnouncement) {
      return {
        success: false,
        message: "Announcement not found.",
      };
    }

    const official = await prisma.official.findUnique({
      where: { id: data.createdById },
      select: { id: true },
    });

    if (!official) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: {
          createdById: "Select a valid official.",
        },
      };
    }

    let imageUrl = existingAnnouncement.image;

    if (data.imageFile) {
      const uploadResult = await uploadImageToCloudinary(data.imageFile, {
        assetLabel: "Announcement image",
        folder: "announcements",
        publicIdPrefix: data.title.replace(/[^a-z0-9]/gi, "-").toLowerCase(),
      });

      imageUrl = uploadResult.secure_url;
    } else if (data.removeImage) {
      imageUrl = null;
    }

    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        title: data.title,
        content: data.content,
        image: imageUrl,
        createdById: data.createdById,
      },
      select: announcementSelect,
    });

    return {
      success: true,
      message: "Announcement updated successfully.",
      announcement: mapAnnouncementRecord(announcement),
    };
  } catch (error) {
    if (error instanceof CloudinaryUploadError) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: {
          imageName: error.message,
        },
      };
    }

    console.error("update announcement failed", error);

    return {
      success: false,
      message: "An unexpected error occurred while updating the announcement.",
    };
  }
}

export async function archiveAnnouncementAction(id: string): Promise<AnnouncementMutationResult> {
  return setAnnouncementArchiveStatusAction(id, true)
}

export async function unarchiveAnnouncementAction(id: string): Promise<AnnouncementMutationResult> {
  return setAnnouncementArchiveStatusAction(id, false)
}

async function setAnnouncementArchiveStatusAction(
  id: string,
  isArchive: boolean
): Promise<AnnouncementMutationResult> {
  try {
    const existingAnnouncement = await prisma.announcement.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existingAnnouncement) {
      return {
        success: false,
        message: "Announcement not found.",
      }
    }

    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        isArchive,
      },
      select: announcementSelect,
    })

    return {
      success: true,
      message: isArchive
        ? "Announcement archived successfully."
        : "Announcement restored successfully.",
      announcement: mapAnnouncementRecord(announcement),
    }
  } catch (error) {
    console.error("update announcement archive status failed", error)

    return {
      success: false,
      message: isArchive
        ? "An unexpected error occurred while archiving the announcement."
        : "An unexpected error occurred while restoring the announcement.",
    }
  }
}
