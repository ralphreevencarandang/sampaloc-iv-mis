'use server'

import prismaModule from "@/lib/prisma"
import { mapOfficialRecord } from "@/server/officials/officials"
import { type CreateOfficialResult } from "@/server/actions/official.actions"
import { type BlotterRecord } from "@/server/actions/blotter.actions"
import { type PetRecord } from "@/server/actions/pet.action"
import { hasAdminPermission } from "@/lib/admin-authorization"
import { getCurrentHealthWorkerFromSession } from "@/lib/health-worker-session"
import { getCurrentAdminFromSession } from "@/lib/admin-session"
import { canAccessResource } from "@/lib/rbac"
import { AdminRole } from "@/app/generated/prisma/enums"

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
  if (!(await hasAdminPermission("officials", "write"))) {
    return { success: false, message: "You do not have permission to archive officials." }
  }

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
        middleName: true,
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
  if (!(await hasAdminPermission("blotter", "write"))) {
    return { success: false, message: "You do not have permission to archive blotter records." }
  }

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

    const complainantDisplayName = blotter.complainant
      ? [blotter.complainant.firstName, blotter.complainant.lastName].filter(Boolean).join(" ")
      : blotter.complainantName

    return {
      success: true,
      message: isArchive
        ? "Blotter record archived successfully."
        : "Blotter record restored successfully.",
      blotter: {
        id: blotter.id,
        complainant: complainantDisplayName,
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
  if (!(await hasAdminPermission("vawc", "write"))) {
    return { success: false, message: "You do not have permission to archive VAWC records." };
  }

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
  if (!(await hasAdminPermission("pets", "write"))) {
    return { success: false, message: "You do not have permission to archive pets." };
  }

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

export type BulkArchiveResult = {
  success: boolean;
  message: string;
  count?: number;
};

export async function bulkArchiveOfficialsAction(ids: string[]): Promise<BulkArchiveResult> {
  return setBulkOfficialArchiveStatusAction(ids, true);
}

export async function bulkUnarchiveOfficialsAction(ids: string[]): Promise<BulkArchiveResult> {
  return setBulkOfficialArchiveStatusAction(ids, false);
}

async function setBulkOfficialArchiveStatusAction(
  ids: string[],
  isArchive: boolean
): Promise<BulkArchiveResult> {
  if (!(await hasAdminPermission("officials", "write"))) {
    return { success: false, message: "You do not have permission to archive officials." };
  }

  try {
    if (!ids || ids.length === 0) {
      return { success: false, message: "No officials selected." };
    }
    const result = await prisma.official.updateMany({
      where: { id: { in: ids } },
      data: { isArchive },
    });
    return {
      success: true,
      message: isArchive
        ? `Successfully archived ${result.count} official${result.count !== 1 ? 's' : ''}.`
        : `Successfully restored ${result.count} official${result.count !== 1 ? 's' : ''}.`,
      count: result.count,
    };
  } catch (error) {
    console.error("bulk official archive failed", error);
    return {
      success: false,
      message: isArchive
        ? "An unexpected error occurred while archiving officials."
        : "An unexpected error occurred while restoring officials.",
    };
  }
}

export async function bulkArchiveBlottersAction(ids: string[]): Promise<BulkArchiveResult> {
  return setBulkBlotterArchiveStatusAction(ids, true);
}

export async function bulkUnarchiveBlottersAction(ids: string[]): Promise<BulkArchiveResult> {
  return setBulkBlotterArchiveStatusAction(ids, false);
}

async function setBulkBlotterArchiveStatusAction(
  ids: string[],
  isArchive: boolean
): Promise<BulkArchiveResult> {
  if (!(await hasAdminPermission("blotter", "write"))) {
    return { success: false, message: "You do not have permission to archive blotter records." };
  }

  try {
    if (!ids || ids.length === 0) {
      return { success: false, message: "No blotters selected." };
    }
    const result = await prisma.blotter.updateMany({
      where: { id: { in: ids } },
      data: { isArchive },
    });
    return {
      success: true,
      message: isArchive
        ? `Successfully archived ${result.count} blotter record${result.count !== 1 ? 's' : ''}.`
        : `Successfully restored ${result.count} blotter record${result.count !== 1 ? 's' : ''}.`,
      count: result.count,
    };
  } catch (error) {
    console.error("bulk blotter archive failed", error);
    return {
      success: false,
      message: isArchive
        ? "An unexpected error occurred while archiving blotters."
        : "An unexpected error occurred while restoring blotters.",
    };
  }
}

export async function bulkArchiveVawcAction(ids: string[]): Promise<BulkArchiveResult> {
  return setBulkVawcArchiveStatusAction(ids, true);
}

export async function bulkUnarchiveVawcAction(ids: string[]): Promise<BulkArchiveResult> {
  return setBulkVawcArchiveStatusAction(ids, false);
}

async function setBulkVawcArchiveStatusAction(
  ids: string[],
  isArchive: boolean
): Promise<BulkArchiveResult> {
  if (!(await hasAdminPermission("vawc", "write"))) {
    return { success: false, message: "You do not have permission to archive VAWC records." };
  }

  try {
    if (!ids || ids.length === 0) {
      return { success: false, message: "No VAWC cases selected." };
    }
    const result = await prisma.vawcRecord.updateMany({
      where: { id: { in: ids } },
      data: { isArchive },
    });
    return {
      success: true,
      message: isArchive
        ? `Successfully archived ${result.count} VAWC case${result.count !== 1 ? 's' : ''}.`
        : `Successfully restored ${result.count} VAWC case${result.count !== 1 ? 's' : ''}.`,
      count: result.count,
    };
  } catch (error) {
    console.error("bulk VAWC archive failed", error);
    return {
      success: false,
      message: isArchive
        ? "An unexpected error occurred while archiving VAWC cases."
        : "An unexpected error occurred while restoring VAWC cases.",
    };
  }
}

export async function bulkArchivePetsAction(ids: string[]): Promise<BulkArchiveResult> {
  return setBulkPetArchiveStatusAction(ids, true);
}

export async function bulkUnarchivePetsAction(ids: string[]): Promise<BulkArchiveResult> {
  return setBulkPetArchiveStatusAction(ids, false);
}

async function setBulkPetArchiveStatusAction(
  ids: string[],
  isArchive: boolean
): Promise<BulkArchiveResult> {
  if (!(await hasAdminPermission("pets", "write"))) {
    return { success: false, message: "You do not have permission to archive pets." };
  }

  try {
    if (!ids || ids.length === 0) {
      return { success: false, message: "No pets selected." };
    }
    const result = await prisma.pet.updateMany({
      where: { id: { in: ids } },
      data: { isArchive },
    });
    return {
      success: true,
      message: isArchive
        ? `Successfully archived ${result.count} pet${result.count !== 1 ? 's' : ''}.`
        : `Successfully restored ${result.count} pet${result.count !== 1 ? 's' : ''}.`,
      count: result.count,
    };
  } catch (error) {
    console.error("bulk pet archive failed", error);
    return {
      success: false,
      message: isArchive
        ? "An unexpected error occurred while archiving pets."
        : "An unexpected error occurred while restoring pets.",
    };
  }
}

export async function bulkArchiveMedicalRecordsAction(ids: string[]): Promise<BulkArchiveResult> {
  return setBulkMedicalRecordArchiveStatusAction(ids, true);
}

export async function bulkUnarchiveMedicalRecordsAction(ids: string[]): Promise<BulkArchiveResult> {
  return setBulkMedicalRecordArchiveStatusAction(ids, false);
}

async function setBulkMedicalRecordArchiveStatusAction(
  ids: string[],
  isArchive: boolean
): Promise<BulkArchiveResult> {
  const [healthWorker, admin] = await Promise.all([
    getCurrentHealthWorkerFromSession(),
    getCurrentAdminFromSession(),
  ]);

  const hasHealthWorkerAccess = Boolean(healthWorker);
  const hasAdminAccess = admin && (admin.role === AdminRole.HEALTH_WORKER || canAccessResource(admin.role, "health", "write"));

  if (!hasHealthWorkerAccess && !hasAdminAccess) {
    return { success: false, message: "You do not have permission to archive medical records." };
  }

  try {
    if (!ids || ids.length === 0) {
      return { success: false, message: "No medical records selected." };
    }
    const result = await prisma.medicalRecord.updateMany({
      where: { id: { in: ids } },
      data: { isArchive },
    });
    return {
      success: true,
      message: isArchive
        ? `Successfully archived ${result.count} medical record${result.count !== 1 ? 's' : ''}.`
        : `Successfully restored ${result.count} medical record${result.count !== 1 ? 's' : ''}.`,
      count: result.count,
    };
  } catch (error) {
    console.error("bulk medical record archive failed", error);
    return {
      success: false,
      message: isArchive
        ? "An unexpected error occurred while archiving medical records."
        : "An unexpected error occurred while restoring medical records.",
    };
  }
}
