'use server'

import { AdminRole, VerificationStatus } from "@/app/generated/prisma/enums";
import bcrypt from "bcryptjs";
import prismaModule from "@/lib/prisma";
import type { AuthenticatedResident } from "@/lib/resident-auth";
import {
  clearResidentSession,
  createResidentSession,
  getCurrentResidentFromSession,
} from "@/lib/resident-session";
import {
  clearAdminSession,
  createAdminSession,
  getCurrentAdminFromSession,
} from "@/lib/admin-session";
import type { AuthenticatedAdmin } from "@/lib/admin-auth";
import {
  clearHealthWorkerSession,
  createHealthWorkerSession,
  getCurrentHealthWorkerFromSession,
  type AuthenticatedHealthWorker,
} from "@/lib/health-worker-session";
import {
  healthWorkerLoginSchema,
  getZodFieldErrors as getClinicFieldErrors,
  type HealthWorkerLoginInput,
} from "@/validations/clinic.validation";
import { createResidentAccount, verifyPassword } from "@/server/actions/resident.actions";
import {
  getZodFieldErrors,
  residentLoginSchema,
  adminLoginSchema,
  type ResidentLoginInput,
  type AdminLoginInput,
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
        isArchived: true,
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

    if (resident.isArchived) {
      return {
        success: false,
        message: "Account is archived.",
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

export type AdminLoginResult = {
  success: boolean;
  message: string;
  admin?: AuthenticatedAdmin;
  fieldErrors?: Record<string, string>;
};

export async function loginAdminAction(
  input: AdminLoginInput
): Promise<AdminLoginResult> {
  const parsed = adminLoginSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: getZodFieldErrors(parsed.error),
    };
  }

  try {
    const admin = await prisma.admin.findUnique({
      where: { email: parsed.data.email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
      },
    });

    if (!admin || !(await bcrypt.compare(parsed.data.password, admin.password))) {
      return {
        success: false,
        message: "Invalid email or password.",
        fieldErrors: {
          email: "Invalid email or password.",
        },
      };
    }

    if (admin.role !== AdminRole.ADMIN) {
      return {
        success: false,
        message: "Access denied. Insufficient permissions.",
      };
    }

    await createAdminSession(admin.id);

    return {
      success: true,
      message: "Login successful.",
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    };
  } catch (error) {
    console.error("admin login failed", error);

    return {
      success: false,
      message: "An unexpected error occurred while signing in.",
    };
  }
}

export async function logoutAdminAction() {
  await clearAdminSession();

  return {
    success: true,
  };
}

export async function getCurrentAdminAction() {
  return getCurrentAdminFromSession();
}

// ── Health Worker Auth ────────────────────────────────────────────

export type HealthWorkerLoginResult = {
  success: boolean;
  message: string;
  healthWorker?: AuthenticatedHealthWorker;
  fieldErrors?: Record<string, string>;
};

export async function loginHealthWorkerAction(
  input: HealthWorkerLoginInput
): Promise<HealthWorkerLoginResult> {
  const parsed = healthWorkerLoginSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: getClinicFieldErrors(parsed.error),
    };
  }

  try {
    const admin = await prisma.admin.findUnique({
      where: { email: parsed.data.email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
      },
    });

    if (!admin || !(await bcrypt.compare(parsed.data.password, admin.password))) {
      return {
        success: false,
        message: "Invalid email or password.",
        fieldErrors: { email: "Invalid email or password." },
      };
    }

    if (admin.role !== AdminRole.HEALTH_WORKER) {
      return {
        success: false,
        message: "Access denied. This portal is for Health Workers only.",
      };
    }

    await createHealthWorkerSession(admin.id);

    return {
      success: true,
      message: "Login successful.",
      healthWorker: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    };
  } catch (error) {
    console.error("health worker login failed", error);

    return {
      success: false,
      message: "An unexpected error occurred while signing in.",
    };
  }
}

export async function logoutHealthWorkerAction() {
  await clearHealthWorkerSession();
  return { success: true };
}

export async function getCurrentHealthWorkerAction() {
  return getCurrentHealthWorkerFromSession();
}
