import prisma from "@/lib/prisma";
import { requireResidentSession } from "@/lib/resident-session";
import {
  getAllDocumentsWithPricingAction,
  type DocumentSettingRecord,
} from "@/server/actions/document-settings.actions";
import RequestDocumentsClient, {
  type RequestResidentProfile,
} from "./request-documents-client";

async function getResidentProfile(residentId: string): Promise<RequestResidentProfile | null> {
  const resident = await prisma.resident.findUnique({
    where: { id: residentId },
    select: {
      id: true,
      email: true,
      firstName: true,
      middleName: true,
      lastName: true,
      birthDate: true,
      civilStatus: true,
      citizenship: true,
      houseNumber: true,
      street: true,
      contactNumber: true,
      precinctNumber: true,
    },
  });

  if (!resident) {
    return null;
  }

  return {
    ...resident,
    birthDate: resident.birthDate.toISOString(),
  };
}

export default async function RequestDocumentsPage() {
  const residentSession = await requireResidentSession();
  let residentProfile: RequestResidentProfile | null = null;
  let initialError: string | undefined;
  let initialDocuments: DocumentSettingRecord[] = [];

  try {
    const [profile, docs] = await Promise.all([
      getResidentProfile(residentSession.id),
      getAllDocumentsWithPricingAction(),
    ]);
    residentProfile = profile;
    initialDocuments = docs;
  } catch (error) {
    initialError =
      error instanceof Error
        ? error.message
        : "Failed to load resident details for document requests.";
  }

  return (
    <RequestDocumentsClient
      residentProfile={residentProfile}
      initialError={initialError}
      initialDocuments={initialDocuments}
    />
  );
}


