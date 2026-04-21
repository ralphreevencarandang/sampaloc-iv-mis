'use server'

import prismaModule from "@/lib/prisma"
import { mapOfficialRecord } from "@/server/officials/officials"
import { type CreateOfficialResult } from "@/server/actions/official.actions"
import { type BlotterRecord } from "@/server/actions/blotter.actions"
import { type PetRecord } from "@/server/actions/pet.action"

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

export type VawcArchiveResult = {
  success: boolean;
  message: string;
  vawc?: {
    id: string;
    caseNumber: string;
    victimName: string;
    incidentDate: string;
    status: string;
  };
};

export async function archiveVawcAction(id: string): Promise<VawcArchiveResult> {
  return setVawcArchiveStatusAction(id, true);
}

export async function unarchiveVawcAction(id: string): Promise<VawcArchiveResult> {
  return setVawcArchiveStatusAction(id, false);
}

async function setVawcArchiveStatusAction(
  id: string,
  isArchive: boolean
): Promise<VawcArchiveResult> {
  try {
    const existingVawc = await prisma.vawcRecord.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingVawc) {
      return {
        success: false,
        message: "VAWC record not found.",
      };
    }

    const vawc = await prisma.vawcRecord.update({
      where: { id },
      data: { isArchive },
    });

    return {
      success: true,
      message: isArchive
        ? "VAWC record archived successfully."
        : "VAWC record restored successfully.",
      vawc: {
        id: vawc.id,
        caseNumber: vawc.caseNumber,
        victimName: vawc.victimName,
        incidentDate: vawc.incidentDate.toISOString(),
        status: vawc.status === "RESOLVED" || vawc.status === "DISMISSED" ? vawc.status : vawc.status,
      },
    };
  } catch (error) {
    console.error("update VAWC archive status failed", error);

    return {
      success: false,
      message: isArchive
        ? "An unexpected error occurred while archiving the VAWC record."
        : "An unexpected error occurred while restoring the VAWC record.",
    };
  }
}

export type PetArchiveResult = {
  success: boolean;
  message: string;
  pet?: PetRecord;
};

export async function archivePetAction(id: string): Promise<PetArchiveResult> {
  return setPetArchiveStatusAction(id, true);
}

export async function unarchivePetAction(id: string): Promise<PetArchiveResult> {
  return setPetArchiveStatusAction(id, false);
}

async function setPetArchiveStatusAction(
  id: string,
  isArchive: boolean
): Promise<PetArchiveResult> {
  try {
    const existingPet = await prisma.pet.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingPet) {
      return {
        success: false,
        message: "Pet record not found.",
      };
    }

    const pet = await prisma.pet.update({
      where: { id },
      data: { isArchive },
      include: {
        owner: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      success: true,
      message: isArchive
        ? "Pet archived successfully."
        : "Pet restored successfully.",
      pet: {
        id: pet.id,
        ownerId: pet.ownerId,
        ownerName: [pet.owner.firstName, pet.owner.middleName, pet.owner.lastName]
          .filter(Boolean)
          .join(" "),
        name: pet.name,
        type: pet.type,
        breed: pet.breed,
        color: pet.color,
        vaccinationDate: pet.vaccinationDate?.toISOString() ?? null,
        createdAt: pet.createdAt.toISOString(),
        isArchive: pet.isArchive,
      },
    };
  } catch (error) {
    console.error("update pet archive status failed", error);

    return {
      success: false,
      message: isArchive
        ? "An unexpected error occurred while archiving the pet."
        : "An unexpected error occurred while restoring the pet.",
    };
  }
}
