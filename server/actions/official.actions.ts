'use server'

import { CloudinaryUploadError, uploadImageToCloudinary } from "@/lib/cloudinary";
import prismaModule from "@/lib/prisma";
import {
  fetchOfficialsFromDb,
  mapOfficialRecord,
  type OfficialRecord,
} from "@/server/officials/officials";
import {
  getOfficialFieldErrors,
  officialSchema,
  type OfficialFormInput,
} from "@/validations/official.validation";

const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule;

export type CreateOfficialResult = {
  success: boolean;
  message: string;
  official?: OfficialRecord;
  fieldErrors?: Record<string, string>;
};

export async function getOfficials(): Promise<OfficialRecord[]> {
  try {
    return await fetchOfficialsFromDb();
  } catch (error) {
    console.error("get officials failed", error);
    throw new Error("Failed to fetch officials.");
  }
}

type SanitizedOfficialInput = Omit<OfficialFormInput, "officialProfileName"> & {
  officialProfileFile: File | null;
};

function getFormValue(formData: FormData, key: keyof OfficialFormInput) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function validateOfficialForm(formData: FormData): {
  data?: SanitizedOfficialInput;
  fieldErrors?: Record<string, string>;
} {
  const officialProfileValue = formData.get("officialProfile");
  const officialProfileFile =
    officialProfileValue instanceof File && officialProfileValue.size > 0 ? officialProfileValue : null;

  const parsed = officialSchema.safeParse({
    firstName: getFormValue(formData, "firstName"),
    middleName: getFormValue(formData, "middleName") || null,
    lastName: getFormValue(formData, "lastName"),
    email: getFormValue(formData, "email"),
    status: getFormValue(formData, "status"),
    position: getFormValue(formData, "position"),
    officialProfileName: officialProfileFile?.name ?? "",
    termStart: getFormValue(formData, "termStart"),
    termEnd: getFormValue(formData, "termEnd"),
  });

  if (!parsed.success) {
    return {
      fieldErrors: getOfficialFieldErrors(parsed.error),
    };
  }

  return {
    data: {
      ...parsed.data,
      officialProfileFile,
    },
  };
}

export async function createOfficial(formData: FormData): Promise<CreateOfficialResult> {
  const { data, fieldErrors } = validateOfficialForm(formData);

  if (!data) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  const termStart = new Date(data.termStart);
  const termEnd = data.termEnd ? new Date(data.termEnd) : null;
  const isActive = data.status === "Active";

  try {
    const existingOfficial = await prisma.official.findUnique({
      where: { email: data.email },
      select: { id: true },
    });

    if (existingOfficial) {
      return {
        success: false,
        message: "An official with that email already exists.",
        fieldErrors: {
          email: "Email is already assigned to another official.",
        },
      };
    }

    let officialProfile: string | null = null;

    if (data.officialProfileFile) {
      const uploadResult = await uploadImageToCloudinary(data.officialProfileFile, {
        assetLabel: "Official profile image",
        folder: "officials/profile",
        publicIdPrefix: `${data.firstName}-${data.lastName}`.replace(/[^a-z0-9]/gi, "-").toLowerCase(),
      });

      officialProfile = uploadResult.secure_url;
    }

    const createdOfficial = await prisma.official.create({
      data: {
        officialProfile,
        firstName: data.firstName,
        middleName: data.middleName ?? null,
        lastName: data.lastName,
        email: data.email,
        isActive,
        position: data.position,
        termStart,
        termEnd,
      },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        officialProfile: true,
        isActive: true,
        position: true,
        termStart: true,
        termEnd: true,
        isArchive: true,
      },
    });

    return {
      success: true,
      message: "Official created successfully.",
      official: mapOfficialRecord(createdOfficial),
    };
  } catch (error) {
    if (error instanceof CloudinaryUploadError) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: {
          officialProfileName: error.message,
        },
      };
    }

    console.error("create official failed", error);

    return {
      success: false,
      message: "An unexpected error occurred while creating the official.",
    };
  }
}

export async function updateOfficial(id: string, formData: FormData): Promise<CreateOfficialResult> {
  const { data, fieldErrors } = validateOfficialForm(formData);

  if (!data) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  const termStart = new Date(data.termStart);
  const termEnd = data.termEnd ? new Date(data.termEnd) : null;
  const isActive = data.status === "Active";

  try {
    const existingOfficial = await prisma.official.findUnique({
      where: { email: data.email },
      select: { id: true },
    });

    if (existingOfficial && existingOfficial.id !== id) {
      return {
        success: false,
        message: "An official with that email already exists.",
        fieldErrors: {
          email: "Email is already assigned to another official.",
        },
      };
    }

    const currentOfficial = await prisma.official.findUnique({
      where: { id },
    });

    if (!currentOfficial) {
      return {
        success: false,
        message: "Official not found.",
      };
    }

    let officialProfile = currentOfficial.officialProfile;

    if (data.officialProfileFile) {
      const uploadResult = await uploadImageToCloudinary(data.officialProfileFile, {
        assetLabel: "Official profile image",
        folder: "officials/profile",
        publicIdPrefix: `${data.firstName}-${data.lastName}`.replace(/[^a-z0-9]/gi, "-").toLowerCase(),
      });

      officialProfile = uploadResult.secure_url;
    } else if (!formData.get("officialProfileName")) {
      // If no file but name is empty, user cleared the image
      officialProfile = null;
    }

    const updatedOfficial = await prisma.official.update({
      where: { id },
      data: {
        officialProfile,
        firstName: data.firstName,
        middleName: data.middleName ?? null,
        lastName: data.lastName,
        email: data.email,
        isActive,
        position: data.position,
        termStart,
        termEnd,
      },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        officialProfile: true,
        isActive: true,
        position: true,
        termStart: true,
        termEnd: true,
        isArchive: true,
      },
    });

    return {
      success: true,
      message: "Official updated successfully.",
      official: mapOfficialRecord(updatedOfficial),
    };
  } catch (error) {
    if (error instanceof CloudinaryUploadError) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: {
          officialProfileName: error.message,
        },
      };
    }

    console.error("update official failed", error);

    return {
      success: false,
      message: "An unexpected error occurred while updating the official.",
    };
  }
}

