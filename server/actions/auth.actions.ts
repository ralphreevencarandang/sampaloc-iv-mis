'use server'

import { VerificationStatus } from "@/app/generated/prisma/enums";
import prismaModule from "@/lib/prisma";
import type { AuthenticatedResident } from "@/lib/resident-auth";
import {
  clearResidentSession,
  createResidentSession,
  getCurrentResidentFromSession,
} from "@/lib/resident-session";
import { createResidentAccount } from "@/server/actions/resident.actions";
import { verifyPassword } from "@/server/actions/resident.actions";
import {
  getZodFieldErrors,
  residentLoginSchema,
  type ResidentLoginInput,
} from "@/validations/auth.validation";

const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule;

export type ResidentLoginResult = {
  success: boolean;
  message: string;
  resident?: AuthenticatedResident;
  fieldErrors?: Record<string, string>;
};

export async function registerResidentAction(formData: FormData) {
  return createResidentAccount(formData);
}

export async function loginResidentAction(
  input: ResidentLoginInput
): Promise<ResidentLoginResult> {
  const parsed = residentLoginSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: getZodFieldErrors(parsed.error),
    };
  }

  try {
    const resident = await prisma.resident.findUnique({
      where: { email: parsed.data.email },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        status: true,
      },
    });

    if (!resident || !(await verifyPassword(parsed.data.password, resident.password))) {
      return {
        success: false,
        message: "Invalid email or password.",
        fieldErrors: {
          email: "Invalid email or password.",
        },
      };
    }

    if (resident.status === VerificationStatus.PENDING) {
      return {
        success: false,
        message: "Your account is awaiting admin approval.",
      };
    }

    if (resident.status === VerificationStatus.DECLINED) {
      return {
        success: false,
        message: "Your account approval request was declined.",
      };
    }

    if (resident.status !== VerificationStatus.APPROVED) {
      return {
        success: false,
        message: "Your account is not allowed to sign in.",
      };
    }

    await createResidentSession(resident.id);

    return {
      success: true,
      message: "Login successful.",
      resident: {
        id: resident.id,
        email: resident.email,
        firstName: resident.firstName,
        lastName: resident.lastName,
        status: resident.status,
      },
    };
  } catch (error) {
    console.error("resident login failed", error);

    return {
      success: false,
      message: "An unexpected error occurred while signing in.",
    };
  }
}

export async function logoutResidentAction() {
  await clearResidentSession();

  return {
    success: true,
  };
}

export async function getCurrentResidentAction() {
  return getCurrentResidentFromSession();
}
