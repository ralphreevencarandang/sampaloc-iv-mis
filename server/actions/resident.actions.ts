import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { CloudinaryUploadError, uploadImageToCloudinary } from "@/lib/cloudinary";
import prismaModule from "@/lib/prisma";
import { validateValidIdImageFile } from "@/lib/valid-id-image";
import {
  getZodFieldErrors,
  residentRegistrationSchema,
  type ResidentRegistrationInput,
} from "@/validations/resident.validation";

const scrypt = promisify(scryptCallback);
const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule;

export type RegisterResidentResult = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

type SanitizedResidentRegistration = Omit<
  ResidentRegistrationInput,
  "password" | "confirmPassword" | "middleName" | "birthDate" | "occupation"
> & {
  email: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  street: string;
  houseNumber: string;
  contactNumber: string;
  occupation: string | null;
  citizenship: string;
  validIDImageFile: File;
  birthDate: Date;
  password: string;
};

function getFormValue(formData: FormData, key: keyof ResidentRegistrationInput) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function validateResidentRegistration(formData: FormData): {
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

  const input: ResidentRegistrationInput = {
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
    contactNumber: getFormValue(formData, "contactNumber"),
    occupation: getFormValue(formData, "occupation"),
    citizenship: getFormValue(formData, "citizenship"),
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
      contactNumber: data.contactNumber,
      occupation: data.occupation || null,
      citizenship: data.citizenship,
      validIDImageFile,
    },
  };
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;

  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, hashedPassword: string) {
  const [salt, storedKey] = hashedPassword.split(":");

  if (!salt || !storedKey) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const storedKeyBuffer = Buffer.from(storedKey, "hex");

  if (derivedKey.length !== storedKeyBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, storedKeyBuffer);
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
          contactNumber: data.contactNumber,
          occupation: data.occupation,
          citizenship: data.citizenship,
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

