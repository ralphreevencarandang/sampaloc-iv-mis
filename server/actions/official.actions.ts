'use server'

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

export async function createOfficial(input: OfficialFormInput): Promise<CreateOfficialResult> {
  const parsed = officialSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: getOfficialFieldErrors(parsed.error),
    };
  }

  const data = parsed.data;
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

    const createdOfficial = await prisma.official.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: null,
        email: data.email,
        isActive,
        position: data.position,
        termStart,
        termEnd,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        position: true,
        termStart: true,
        termEnd: true,
      },
    });

    return {
      success: true,
      message: "Official created successfully.",
      official: mapOfficialRecord(createdOfficial),
    };
  } catch (error) {
    console.error("create official failed", error);

    return {
      success: false,
      message: "An unexpected error occurred while creating the official.",
    };
  }
}
