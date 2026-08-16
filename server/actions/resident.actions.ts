"use server";

import bcrypt from "bcryptjs";
import { CloudinaryUploadError, uploadImageToCloudinary } from "@/lib/cloudinary";
import prismaModule from "@/lib/prisma";
import { validateValidIdImageFile } from "@/lib/valid-id-image";
import {
  getZodFieldErrors,
  residentRegistrationSchema,
  type ResidentRegistrationInput,
  adminResidentUpdateSchema,
} from "@/validations/resident.validation";
import { revalidatePath } from "next/cache";

import { sendResidentApprovalEmail } from "@/lib/nodemailer";
import { hasAdminPermission } from "@/lib/admin-authorization";

const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule;

export type RegisterResidentResult = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

type SanitizedResidentRegistration = Omit<
  ResidentRegistrationInput,
  | "password"
  | "confirmPassword"
  | "middleName"
  | "birthDate"
  | "occupation"
  | "subdivision"
  | "phase"
  | "validIDImageName"
  | "isVoter"
  | "precinctNumber"
  | "is4Ps"
  | "isPwd"
  | "pwdCondition"
> & {
  email: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  street: string;
  houseNumber: string;
  subdivision: string | null;
  phase: string | null;
  contactNumber: string;
  occupation: string | null;
  citizenship: string;
  validIDImageFile: File;
  birthDate: Date;
  password: string;
  isVoter: boolean;
  precinctNumber: string | null;
  is4Ps: boolean;
  isPwd: boolean;
  pwdCondition: string | null;
};

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function validateResidentRegistration(formData: FormData): {
  data?: SanitizedResidentRegistration;
  fieldErrors?: Record<string, string>;
} {
  const validIDImageFile = formData.get("validIDImage");

  if (!(validIDImageFile instanceof File) || validIDImageFile.size === 0) {
    return {
      fieldErrors: {
        validIDImageName: "Valid ID image is required.",
      },
    };
  }

  const input = {
    email: getFormValue(formData, "email"),
    password: getFormValue(formData, "password"),
    confirmPassword: getFormValue(formData, "confirmPassword"),
    firstName: getFormValue(formData, "firstName"),
    lastName: getFormValue(formData, "lastName"),
    middleName: getFormValue(formData, "middleName"),
    birthDate: getFormValue(formData, "birthDate"),
    gender: getFormValue(formData, "gender"),
    civilStatus: getFormValue(formData, "civilStatus"),
    street: getFormValue(formData, "street"),
    houseNumber: getFormValue(formData, "houseNumber"),
    subdivision: getFormValue(formData, "subdivision"),
    phase: getFormValue(formData, "phase"),
    contactNumber: getFormValue(formData, "contactNumber"),
    occupation: getFormValue(formData, "occupation"),
    citizenship: getFormValue(formData, "citizenship"),
    isVoter: getFormValue(formData, "isVoter"),
    precinctNumber: getFormValue(formData, "precinctNumber"),
    is4Ps: getFormValue(formData, "is4Ps"),
    isPwd: getFormValue(formData, "isPwd"),
    pwdCondition: getFormValue(formData, "pwdCondition"),
    validIDImageName: validIDImageFile.name,
  };

  const parsed = residentRegistrationSchema.safeParse(input);

  if (!parsed.success) {
    return { fieldErrors: getZodFieldErrors(parsed.error) };
  }

  const imageValidationError = validateValidIdImageFile(validIDImageFile);

  if (imageValidationError) {
    return {
      fieldErrors: {
        validIDImageName: imageValidationError,
      },
    };
  }

  const data = parsed.data;

  return {
    data: {
      email: data.email,
      password: input.password,
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName || null,
      birthDate: new Date(data.birthDate),
      gender: data.gender,
      civilStatus: data.civilStatus,
      street: data.street,
      houseNumber: data.houseNumber,
      subdivision: data.subdivision || null,
      phase: data.phase || null,
      contactNumber: data.contactNumber,
      occupation: data.occupation || null,
      citizenship: data.citizenship,
      isVoter: data.isVoter === "Yes",
      precinctNumber: data.isVoter === "Yes" ? data.precinctNumber : null,
      is4Ps: data.is4Ps === "Yes",
      isPwd: data.isPwd === "Yes",
      pwdCondition: data.isPwd === "Yes" ? data.pwdCondition : null,
      validIDImageFile,
    },
  };
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string) {
  return bcrypt.compare(password, hashedPassword);
}

export async function createResidentAccount(formData: FormData): Promise<RegisterResidentResult> {
  const { data, fieldErrors } = validateResidentRegistration(formData);

  if (!data) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  try {
    const existingResident = await prisma.resident.findUnique({
      where: { email: data.email },
      select: { id: true },
    });

    if (existingResident) {
      return {
        success: false,
        message: "A resident with that email already exists.",
        fieldErrors: {
          email: "Email is already registered.",
        },
      };
    }

    const hashedPassword = await hashPassword(data.password);
    const uploadResult = await uploadImageToCloudinary(data.validIDImageFile, {
      assetLabel: "Valid ID image",
      folder: "residents/valid-id",
      publicIdPrefix: data.email.replace(/[^a-z0-9]/gi, "-").toLowerCase(),
    });

    await prisma.$transaction(async (tx) => {
      await tx.resident.create({
        data: {
          email: data.email,
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName,
          birthDate: data.birthDate,
          gender: data.gender,
          civilStatus: data.civilStatus,
          street: data.street,
          houseNumber: data.houseNumber,
          subdivision: data.subdivision,
          phase: data.phase,
          contactNumber: data.contactNumber,
          occupation: data.occupation,
          citizenship: data.citizenship,
          isVoter: data.isVoter,
          precinctNumber: data.precinctNumber,
          is4Ps: data.is4Ps,
          isPwd: data.isPwd,
          pwdCondition: data.pwdCondition,
          validIDImage: uploadResult.secure_url,
        },
      });
    });

    return {
      success: true,
      message: "Resident registration submitted successfully.",
    };
  } catch (error) {
    if (error instanceof CloudinaryUploadError) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: {
          validIDImageName: error.message,
        },
      };
    }

    console.error("register resident failed", error);

    return {
      success: false,
      message: "An unexpected error occurred while submitting your registration.",
    };
  }
}

export type UpdateResidentResult = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

export async function updateResidentAction(id: string, formData: FormData): Promise<UpdateResidentResult> {
  if (!(await hasAdminPermission("residents", "write"))) {
    return { success: false, message: "You do not have permission to update residents." };
  }

  const input = {
    email: getFormValue(formData, "email"),
    status: getFormValue(formData, "status"),
    firstName: getFormValue(formData, "firstName"),
    lastName: getFormValue(formData, "lastName"),
    middleName: getFormValue(formData, "middleName"),
    birthDate: getFormValue(formData, "birthDate"),
    gender: getFormValue(formData, "gender"),
    civilStatus: getFormValue(formData, "civilStatus"),
    street: getFormValue(formData, "street"),
    houseNumber: getFormValue(formData, "houseNumber"),
    subdivision: getFormValue(formData, "subdivision"),
    phase: getFormValue(formData, "phase"),
    contactNumber: getFormValue(formData, "contactNumber"),
    occupation: getFormValue(formData, "occupation"),
    citizenship: getFormValue(formData, "citizenship"),
    isVoter: getFormValue(formData, "isVoter"),
    precinctNumber: getFormValue(formData, "precinctNumber"),
    is4Ps: getFormValue(formData, "is4Ps"),
    isPwd: getFormValue(formData, "isPwd"),
    pwdCondition: getFormValue(formData, "pwdCondition"),
  };

  const parsed = adminResidentUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: getZodFieldErrors(parsed.error),
    };
  }

  const data = parsed.data;

  try {
    const existingResident = await prisma.resident.findUnique({
      where: { id },
      select: { status: true, email: true, firstName: true },
    });

    const updatedResident = await prisma.resident.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName || null,
        birthDate: new Date(data.birthDate),
        gender: data.gender,
        civilStatus: data.civilStatus,
        street: data.street,
        houseNumber: data.houseNumber,
        subdivision: data.subdivision || null,
        phase: data.phase || null,
        contactNumber: data.contactNumber,
        occupation: data.occupation || null,
        citizenship: data.citizenship,
        isVoter: data.isVoter === "Yes",
        precinctNumber: data.isVoter === "Yes" ? data.precinctNumber || null : null,
        is4Ps: data.is4Ps === "Yes",
        isPwd: data.isPwd === "Yes",
        pwdCondition: data.isPwd === "Yes" ? data.pwdCondition || null : null,
        status: data.status,
      },
    });

    if (
      existingResident &&
      existingResident.status !== "APPROVED" &&
      updatedResident.status === "APPROVED"
    ) {
      // Launch email sending asynchronously without blocking the request
      sendResidentApprovalEmail(updatedResident.email, updatedResident.firstName);
    }

    return {
      success: true,
      message: "Resident updated successfully.",
    };
  } catch (error) {
    console.error("update resident failed", error);
    return {
      success: false,
      message: "An unexpected error occurred while updating the resident.",
    };
  }
}

export type DeleteResidentResult = {
  success: boolean;
  message: string;
};

export type ResidentArchiveResult = {
  success: boolean;
  message: string;
  resident?: {
    id: string;
    isArchived: boolean;
  };
};

async function setResidentArchiveStatusAction(
  id: string,
  isArchived: boolean
): Promise<ResidentArchiveResult> {
  if (!(await hasAdminPermission("residents", "write"))) {
    return { success: false, message: "You do not have permission to archive residents." };
  }

  try {
    const existingResident = await prisma.resident.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingResident) {
      return {
        success: false,
        message: "Resident not found.",
      };
    }

    await prisma.resident.update({
      where: { id },
      data: {
        isArchived,
      },
    });

    revalidatePath("/admin/resident");

    return {
      success: true,
      message: isArchived ? "Resident archived successfully." : "Resident restored successfully.",
      resident: {
        id,
        isArchived,
      },
    };
  } catch (error) {
    console.error("resident archive status update failed", error);

    return {
      success: false,
      message: isArchived
        ? "An unexpected error occurred while archiving the resident."
        : "An unexpected error occurred while restoring the resident.",
    };
  }
}

export async function archiveResidentAction(id: string): Promise<ResidentArchiveResult> {
  return setResidentArchiveStatusAction(id, true);
}

export async function unarchiveResidentAction(id: string): Promise<ResidentArchiveResult> {
  return setResidentArchiveStatusAction(id, false);
}

export type BulkResidentArchiveResult = {
  success: boolean;
  message: string;
  count?: number;
};

export async function bulkArchiveResidentsAction(ids: string[]): Promise<BulkResidentArchiveResult> {
  return setBulkResidentArchiveStatusAction(ids, true);
}

export async function bulkUnarchiveResidentsAction(ids: string[]): Promise<BulkResidentArchiveResult> {
  return setBulkResidentArchiveStatusAction(ids, false);
}

async function setBulkResidentArchiveStatusAction(
  ids: string[],
  isArchived: boolean
): Promise<BulkResidentArchiveResult> {
  if (!(await hasAdminPermission("residents", "write"))) {
    return { success: false, message: "You do not have permission to archive residents." };
  }

  try {
    if (!ids || ids.length === 0) {
      return {
        success: false,
        message: "No residents selected.",
      };
    }

    const result = await prisma.resident.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        isArchived,
      },
    });

    revalidatePath("/admin/resident");
    revalidatePath("/admin/archived");

    return {
      success: true,
      message: isArchived
        ? `Successfully archived ${result.count} resident${result.count !== 1 ? 's' : ''}.`
        : `Successfully restored ${result.count} resident${result.count !== 1 ? 's' : ''}.`,
      count: result.count,
    };
  } catch (error) {
    console.error("bulk resident archive status update failed", error);
    return {
      success: false,
      message: isArchived
        ? "An unexpected error occurred while archiving the selected residents."
        : "An unexpected error occurred while restoring the selected residents.",
    };
  }
}

export async function deleteResidentAction(id: string): Promise<DeleteResidentResult> {
  if (!(await hasAdminPermission("residents", "write"))) {
    return { success: false, message: "You do not have permission to delete residents." };
  }

  try {
    await prisma.$transaction([
      prisma.pet.deleteMany({ where: { ownerId: id } }),
      prisma.blotter.deleteMany({ where: { complainantId: id } }),
      prisma.inventoryTransaction.deleteMany({ where: { distributedToId: id } }),
      prisma.documentRequest.deleteMany({ where: { residentId: id } }),
      prisma.medicalRecord.deleteMany({ where: { patientId: id } }),
      prisma.resident.delete({ where: { id } }),
    ]);

    revalidatePath("/admin/resident");

    return {
      success: true,
      message: "Resident deleted successfully.",
    };
  } catch (error) {
    console.error("delete resident failed", error);

    return {
      success: false,
      message: "An unexpected error occurred while deleting the resident.",
    };
  }
}
