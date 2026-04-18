"use server";

import { VawcStatus, AbuseType, RelationshipType } from "@prisma/client";
import { vawcSchema, type VawcFormInput, getVawcFieldErrors } from "@/validations/vawc.validation";

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

export type CreateVawcResult = {
  success: boolean;
  message?: string;
  fieldErrors?: Partial<Record<keyof VawcFormInput, string>>;
};

// --- MOCK DATA FOR MVP ---
let MOCK_VAWC_DB: VawcRecordType[] = [
  {
    id: "vawc_001",
    caseNumber: "VAWC-2026-0001",
    victimName: "Andres Bonifacio",
    victimAge: 29,
    victimSex: "Male",
    victimCivilStatus: "Married",
    victimAddress: "123 Mabini St., Brgy. Sampaloc IV",
    victimContactNumber: "09123456789",
    isMinor: false,
    guardianName: null,
    respondentName: "Monica Katipunan",
    respondentAge: 27,
    respondentSex: "Female",
    respondentAddress: "123 Mabini St., Brgy. Sampaloc IV",
    respondentContactNumber: "09123456780",
    respondentOccupation: "Businesswoman",
    relationshipToVictim: "SPOUSE",
    abuseType: "PHYSICAL",
    narrative: "Physical altercation resulting in minor injuries reported at the barangay hall.",
    incidentDate: new Date("2026-04-10T14:30:00Z").toISOString(),
    incidentLocation: "123 Mabini St., Brgy. Sampaloc IV",
    vawcImage: null,
    status: "REPORTED",
    isArchive: false,
    blotterId: null,
    createdAt: new Date("2026-04-10T16:00:00Z").toISOString(),
    updatedAt: new Date("2026-04-10T16:00:00Z").toISOString(),
  },
  {
    id: "vawc_002",
    caseNumber: "VAWC-2026-0002",
    victimName: "Gregoria de Jesus",
    victimAge: 25,
    victimSex: "Female",
    victimCivilStatus: "Single",
    victimAddress: "456 Rizal Ave., Brgy. Sampaloc IV",
    victimContactNumber: "09987654321",
    isMinor: false,
    guardianName: null,
    respondentName: "Julio Nakpil",
    respondentAge: 30,
    respondentSex: "Male",
    respondentAddress: "789 Luna St., Brgy. Sampaloc IV",
    respondentContactNumber: "09198765432",
    respondentOccupation: "Musician",
    relationshipToVictim: "FORMER_DATING",
    abuseType: "PSYCHOLOGICAL",
    narrative: "Continuous verbal harassment and emotional abuse leading to distress.",
    incidentDate: new Date("2026-04-15T09:00:00Z").toISOString(),
    incidentLocation: "456 Rizal Ave.",
    vawcImage: null,
    status: "SUMMONED",
    isArchive: false,
    blotterId: null,
    createdAt: new Date("2026-04-16T10:00:00Z").toISOString(),
    updatedAt: new Date("2026-04-16T10:00:00Z").toISOString(),
  }
];

export async function getVawcFromDb(options: { archived?: boolean } = {}): Promise<VawcRecordType[]> {
  // Simulate DB Delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  const isArchived = options.archived ?? false;
  return MOCK_VAWC_DB.filter(v => v.isArchive === isArchived).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

  const newId = `vawc_${Math.random().toString(36).substring(2, 9)}`;
  const caseNumber = `VAWC-2026-${(MOCK_VAWC_DB.length + 1).toString().padStart(4, "0")}`;
  
  // NOTE: Evidentiary upload simulation (For Cloudinary MVP later, we will use uploadImageToCloudinary here)
  const simulatedImageUrl = vawcImageFile ? URL.createObjectURL(vawcImageFile) : null;

  const newVawc: VawcRecordType = {
    id: newId,
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
    incidentDate: new Date(data.incidentDate).toISOString(),
    incidentLocation: data.incidentLocation,
    status: data.status as VawcStatus,
    vawcImage: simulatedImageUrl, // FAKE upload URL
    isArchive: false,
    blotterId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  MOCK_VAWC_DB.push(newVawc);

  return {
    success: true,
    message: "VAWC record filed successfully.",
  };
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
    const index = MOCK_VAWC_DB.findIndex(v => v.id === id);
    if(index === -1) return { success: false, message: "Not found." };

    // FAKE Cloudinary handling
    let newImage = MOCK_VAWC_DB[index].vawcImage;
    if(vawcImageFile) {
        newImage = URL.createObjectURL(vawcImageFile);
    } else if(!formData.get("vawcImageName")) {
        newImage = null; // Removed
    }
  
    MOCK_VAWC_DB[index] = {
      ...MOCK_VAWC_DB[index],
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
      incidentDate: new Date(data.incidentDate).toISOString(),
      incidentLocation: data.incidentLocation,
      status: data.status as VawcStatus,
      vawcImage: newImage,
      updatedAt: new Date().toISOString(),
    };
  
    return {
      success: true,
      message: "VAWC record updated successfully.",
    };
  }
