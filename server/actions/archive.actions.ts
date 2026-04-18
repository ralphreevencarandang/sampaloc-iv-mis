'use server'

import prismaModule from "@/lib/prisma"
import { mapOfficialRecord, type OfficialRecord } from "@/server/officials/officials"
import { type CreateOfficialResult } from "@/server/actions/official.actions"
import { type BlotterRecord } from "@/server/actions/blotter.actions"

const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule;

export async function archiveOfficialAction(id: string): Promise<CreateOfficialResult> {
  return setOfficialArchiveStatusAction(id, true)
}

export async function unarchiveOfficialAction(id: string): Promise<CreateOfficialResult> {
  return setOfficialArchiveStatusAction(id, false)
}

async function setOfficialArchiveStatusAction(
  id: string,
  isArchive: boolean
): Promise<CreateOfficialResult> {
  try {
    const existingOfficial = await prisma.official.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existingOfficial) {
      return {
        success: false,
        message: "Official not found.",
      }
    }

    const official = await prisma.official.update({
      where: { id },
      data: {
        isArchive,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        officialProfile: true,
        isActive: true,
        position: true,
        termStart: true,
        termEnd: true,
        isArchive: true,
      },
    })

    return {
      success: true,
      message: isArchive
        ? "Official archived successfully."
        : "Official restored successfully.",
      official: mapOfficialRecord(official),
    }
  } catch (error) {
    console.error("update official archive status failed", error)

    return {
      success: false,
      message: isArchive
        ? "An unexpected error occurred while archiving the official."
        : "An unexpected error occurred while restoring the official.",
    }
  }
}

export type BlotterArchiveResult = {
  success: boolean;
  message: string;
  blotter?: BlotterRecord;
};

export async function archiveBlotterAction(id: string): Promise<BlotterArchiveResult> {
  return setBlotterArchiveStatusAction(id, true)
}

export async function unarchiveBlotterAction(id: string): Promise<BlotterArchiveResult> {
  return setBlotterArchiveStatusAction(id, false)
}

async function setBlotterArchiveStatusAction(
  id: string,
  isArchive: boolean
): Promise<BlotterArchiveResult> {
  try {
    const existingBlotter = await prisma.blotter.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existingBlotter) {
      return {
        success: false,
        message: "Blotter record not found.",
      }
    }

    const blotter = await prisma.blotter.update({
      where: { id },
      data: { isArchive },
      include: {
        complainant: true,
        handledBy: true,
      },
    })

    return {
      success: true,
      message: isArchive
        ? "Blotter record archived successfully."
        : "Blotter record restored successfully.",
      blotter: {
        id: blotter.id,
        complainant: [blotter.complainant.firstName, blotter.complainant.lastName].filter(Boolean).join(" "),
        respondentName: blotter.respondentName,
        incident: blotter.incident,
        location: blotter.location,
        date: blotter.date.toISOString(),
        status: blotter.status === "OPEN" ? "Open" : "Resolved",
        handledBy: blotter.handledBy
          ? [blotter.handledBy.firstName, blotter.handledBy.lastName].filter(Boolean).join(" ")
          : undefined,
        blotterImage: blotter.blotterImage,
        createdAt: blotter.createdAt.toISOString(),
        isArchive: blotter.isArchive,
      },
    }
  } catch (error) {
    console.error("update blotter archive status failed", error)

    return {
      success: false,
      message: isArchive
        ? "An unexpected error occurred while archiving the blotter record."
        : "An unexpected error occurred while restoring the blotter record.",
    }
  }
}
