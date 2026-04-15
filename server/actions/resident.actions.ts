import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { Role } from "@/app/generated/prisma/client";
import prismaModule from "@/lib/prisma";
import {
  getZodFieldErrors,
  residentRegistrationSchema,
  type ResidentRegistrationInput,
} from "@/validations/resident.validation";

const scrypt = promisify(scryptCallback);
const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule;

export type RegisterResidentInput = ResidentRegistrationInput;

export type RegisterResidentResult = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

type SanitizedResidentRegistration = Omit<
  RegisterResidentInput,
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
  validIDImageName: string;
  birthDate: Date;
  password: string;
};

export function validateResidentRegistration(
  input: RegisterResidentInput
): {
  data?: SanitizedResidentRegistration;
  fieldErrors?: Record<string, string>;
} {
  const parsed = residentRegistrationSchema.safeParse(input);

  if (!parsed.success) {
    return { fieldErrors: getZodFieldErrors(parsed.error) };
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
      validIDImageName: data.validIDImageName,
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

export async function createResidentAccount(
  input: RegisterResidentInput
): Promise<RegisterResidentResult> {
  const { data, fieldErrors } = validateResidentRegistration(input);

  if (!data) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });

    if (existingUser) {
      return {
        success: false,
        message: "A user with that email already exists.",
        fieldErrors: {
          email: "Email is already registered.",
        },
      };
    }

    const hashedPassword = await hashPassword(data.password);
    const fullName = [data.firstName, data.middleName, data.lastName]
      .filter(Boolean)
      .join(" ");

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: fullName,
          email: data.email,
          password: hashedPassword,
          role: Role.RESIDENT,
        },
        select: { id: true },
      });

      await tx.resident.create({
        data: {
          userId: user.id,
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
          validIDImage: data.validIDImageName,
        },
      });
    });

    return {
      success: true,
      message: "Resident registration submitted successfully.",
    };
  } catch (error) {
    console.error("register resident failed", error);

    return {
      success: false,
      message: `error: ${error instanceof Error ? error.message : "An unexpected error occurred."}`,
    };
  }
}
