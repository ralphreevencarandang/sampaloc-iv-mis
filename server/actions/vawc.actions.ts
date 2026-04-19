"use server";

import { VawcStatus, AbuseType, RelationshipType } from "@/app/generated/prisma/client";
import { vawcSchema, type VawcFormInput, getVawcFieldErrors } from "@/validations/vawc.validation";
import prismaModule from "@/lib/prisma";
import { CloudinaryUploadError, uploadImageToCloudinary } from "@/lib/cloudinary";

const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule;

export type CreateVawcResult = {
  success: boolean;
  message?: string;
  fieldErrors?: Partial<Record<keyof VawcFormInput, string>>;
};

export interface VawcRecordType {
  id: string;
  caseNumber: string;

  // Victim Fields
  victimName: string;
  victimAge: number;
  victimSex: string;
  victimCivilStatus: string;
  victimAddress: string;
  victimContactNumber: string | null;
  isMinor: boolean;
  guardianName: string | null;

  // Respondent Fields
  respondentName: string;
  respondentAge: number;
  respondentSex: string;
  respondentAddress: string;
  respondentContactNumber: string | null;
  respondentOccupation: string | null;
  relationshipToVictim: RelationshipType;

  // Incident Details
  abuseType: AbuseType;
  narrative: string;
  incidentDate: string;
  incidentLocation: string;
  vawcImage: string | null;

  // Status & Linkages
  status: VawcStatus;
  isArchive: boolean;
  blotterId: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getVawcFromDb(options: { archived?: boolean } = {}): Promise<VawcRecordType[]> {
  const isArchived = options.archived ?? false;
  
  const records = await prisma.vawcRecord.findMany({
    where: {
      isArchive: isArchived,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return records.map((r) => ({
    id: r.id,
    caseNumber: r.caseNumber,
    victimName: r.victimName,
    victimAge: r.victimAge,
    victimSex: r.victimSex,
    victimCivilStatus: r.victimCivilStatus,
    victimAddress: r.victimAddress,
    victimContactNumber: r.victimContactNumber,
    isMinor: r.isMinor,
    guardianName: r.guardianName,
    respondentName: r.respondentName,
    respondentAge: r.respondentAge,
    respondentSex: r.respondentSex,
    respondentAddress: r.respondentAddress,
    respondentContactNumber: r.respondentContactNumber,
    respondentOccupation: r.respondentOccupation,
    relationshipToVictim: r.relationshipToVictim,
    abuseType: r.abuseType,
    narrative: r.narrative,
    incidentDate: r.incidentDate.toISOString(),
    incidentLocation: r.incidentLocation,
    vawcImage: r.vawcImage,
    status: r.status,
    isArchive: r.isArchive,
    blotterId: r.blotterId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getVawcById(id: string): Promise<VawcRecordType | null> {
  const r = await prisma.vawcRecord.findUnique({
    where: { id },
  });

  if (!r) return null;

  return {
    id: r.id,
    caseNumber: r.caseNumber,
    victimName: r.victimName,
    victimAge: r.victimAge,
    victimSex: r.victimSex,
    victimCivilStatus: r.victimCivilStatus,
    victimAddress: r.victimAddress,
    victimContactNumber: r.victimContactNumber,
    isMinor: r.isMinor,
    guardianName: r.guardianName,
    respondentName: r.respondentName,
    respondentAge: r.respondentAge,
    respondentSex: r.respondentSex,
    respondentAddress: r.respondentAddress,
    respondentContactNumber: r.respondentContactNumber,
    respondentOccupation: r.respondentOccupation,
    relationshipToVictim: r.relationshipToVictim,
    abuseType: r.abuseType,
    narrative: r.narrative,
    incidentDate: r.incidentDate.toISOString(),
    incidentLocation: r.incidentLocation,
    vawcImage: r.vawcImage,
    status: r.status,
    isArchive: r.isArchive,
    blotterId: r.blotterId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function createVawc(formData: FormData): Promise<CreateVawcResult> {
  const fileValue = formData.get("vawcImage");
  const vawcImageFile = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;

  const parsed = vawcSchema.safeParse({
    victimName: formData.get("victimName"),
    victimAge: formData.get("victimAge"),
    victimSex: formData.get("victimSex"),
    victimCivilStatus: formData.get("victimCivilStatus"),
    victimAddress: formData.get("victimAddress"),
    victimContactNumber: formData.get("victimContactNumber"),
    isMinor: formData.get("isMinor") === "true",
    guardianName: formData.get("guardianName"),
    respondentName: formData.get("respondentName"),
    respondentAge: formData.get("respondentAge"),
    respondentSex: formData.get("respondentSex"),
    respondentAddress: formData.get("respondentAddress"),
    respondentContactNumber: formData.get("respondentContactNumber"),
    respondentOccupation: formData.get("respondentOccupation"),
    relationshipToVictim: formData.get("relationshipToVictim"),
    abuseType: formData.get("abuseType"),
    narrative: formData.get("narrative"),
    incidentDate: formData.get("incidentDate"),
    incidentLocation: formData.get("incidentLocation"),
    status: formData.get("status"),
    vawcImageName: vawcImageFile ? vawcImageFile.name : formData.get("vawcImageName"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: getVawcFieldErrors(parsed.error),
    };
  }

  const { data } = parsed;

  try {
    let vawcImage: string | null = null;
    if (vawcImageFile) {
      const uploadResult = await uploadImageToCloudinary(vawcImageFile, {
        assetLabel: "VAWC Evidence",
        folder: "vawc",
      });
      vawcImage = uploadResult.secure_url;
    }

    const currentYear = new Date().getFullYear();
    const count = await prisma.vawcRecord.count();
    const caseNumber = `VAWC-${currentYear}-${(count + 1).toString().padStart(4, "0")}`;

    await prisma.vawcRecord.create({
      data: {
        caseNumber,
        victimName: data.victimName,
        victimAge: data.victimAge,
        victimSex: data.victimSex,
        victimCivilStatus: data.victimCivilStatus,
        victimAddress: data.victimAddress,
        victimContactNumber: data.victimContactNumber || null,
        isMinor: data.isMinor,
        guardianName: data.guardianName || null,
        
        respondentName: data.respondentName,
        respondentAge: data.respondentAge,
        respondentSex: data.respondentSex,
        respondentAddress: data.respondentAddress,
        respondentContactNumber: data.respondentContactNumber || null,
        respondentOccupation: data.respondentOccupation || null,
        relationshipToVictim: data.relationshipToVictim as RelationshipType,
        
        abuseType: data.abuseType as AbuseType,
        narrative: data.narrative,
        incidentDate: new Date(data.incidentDate),
        incidentLocation: data.incidentLocation,
        vawcImage,
        status: data.status as VawcStatus,
        
        statusHistory: {
          create: [
            { status: data.status as VawcStatus, remarks: "Initial Filing" }
          ]
        }
      },
    });

    return {
      success: true,
      message: "VAWC record filed successfully.",
    };
  } catch (error) {
    if (error instanceof CloudinaryUploadError) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: { vawcImageName: error.message },
      };
    }
    console.error("create VAWC failed", error);
    return {
      success: false,
      message: "An unexpected error occurred while creating the VAWC record.",
    };
  }
}

export async function updateVawc(id: string, formData: FormData): Promise<CreateVawcResult> {
  const fileValue = formData.get("vawcImage");
  const vawcImageFile = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;

  const parsed = vawcSchema.safeParse({
    victimName: formData.get("victimName"),
    victimAge: formData.get("victimAge"),
    victimSex: formData.get("victimSex"),
    victimCivilStatus: formData.get("victimCivilStatus"),
    victimAddress: formData.get("victimAddress"),
    victimContactNumber: formData.get("victimContactNumber"),
    isMinor: formData.get("isMinor") === "true",
    guardianName: formData.get("guardianName"),
    respondentName: formData.get("respondentName"),
    respondentAge: formData.get("respondentAge"),
    respondentSex: formData.get("respondentSex"),
    respondentAddress: formData.get("respondentAddress"),
    respondentContactNumber: formData.get("respondentContactNumber"),
    respondentOccupation: formData.get("respondentOccupation"),
    relationshipToVictim: formData.get("relationshipToVictim"),
    abuseType: formData.get("abuseType"),
    narrative: formData.get("narrative"),
    incidentDate: formData.get("incidentDate"),
    incidentLocation: formData.get("incidentLocation"),
    status: formData.get("status"),
    vawcImageName: vawcImageFile ? vawcImageFile.name : formData.get("vawcImageName"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: getVawcFieldErrors(parsed.error),
    };
  }

  const { data } = parsed;

  try {
    const currentVawc = await prisma.vawcRecord.findUnique({ where: { id } });
    if (!currentVawc) {
      return { success: false, message: "VAWC record not found." };
    }

    let vawcImage = currentVawc.vawcImage;

    if (vawcImageFile) {
      const uploadResult = await uploadImageToCloudinary(vawcImageFile, {
        assetLabel: "VAWC Evidence",
        folder: "vawc",
      });
      vawcImage = uploadResult.secure_url;
    } else if (!formData.get("vawcImageName")) {
      vawcImage = null; // Explicit image removal
    }

    await prisma.vawcRecord.update({
      where: { id },
      data: {
        victimName: data.victimName,
        victimAge: data.victimAge,
        victimSex: data.victimSex,
        victimCivilStatus: data.victimCivilStatus,
        victimAddress: data.victimAddress,
        victimContactNumber: data.victimContactNumber || null,
        isMinor: data.isMinor,
        guardianName: data.guardianName || null,
        respondentName: data.respondentName,
        respondentAge: data.respondentAge,
        respondentSex: data.respondentSex,
        respondentAddress: data.respondentAddress,
        respondentContactNumber: data.respondentContactNumber || null,
        respondentOccupation: data.respondentOccupation || null,
        relationshipToVictim: data.relationshipToVictim as RelationshipType,
        abuseType: data.abuseType as AbuseType,
        narrative: data.narrative,
        incidentDate: new Date(data.incidentDate),
        incidentLocation: data.incidentLocation,
        vawcImage,
        status: data.status as VawcStatus,
      },
    });

    if (currentVawc.status !== data.status) {
       await prisma.vawcStatusHistory.create({
          data: {
             vawcRecordId: id,
             status: data.status as VawcStatus,
             remarks: "Status updated in dashboard",
          }
       });
    }

    return {
      success: true,
      message: "VAWC record updated successfully.",
    };
  } catch (error) {
    if (error instanceof CloudinaryUploadError) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: { vawcImageName: error.message },
      };
    }
    console.error("update VAWC failed", error);
    return {
      success: false,
      message: "An unexpected error occurred while updating the VAWC record.",
    };
  }
}
