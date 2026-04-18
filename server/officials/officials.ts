import prismaModule from "@/lib/prisma";
import type { OfficialStatus } from "@/validations/official.validation";

const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule;

export type OfficialRecord = {
  id: string;
  name: string;
  email: string;
  officialProfile: string | null;
  position: string;
  termStart: string;
  termEnd: string | null;
  status: OfficialStatus;
  isArchive: boolean;
};

type OfficialEntity = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  officialProfile: string | null;
  position: string;
  termStart: Date;
  termEnd: Date | null;
  isActive: boolean;
  isArchive: boolean;
};

function buildOfficialName(firstName: string, lastName: string) {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

function mapOfficialRecord(
  official: OfficialEntity
): OfficialRecord {
  return {
    id: official.id,
    name: buildOfficialName(official.firstName, official.lastName),
    email: official.email,
    officialProfile: official.officialProfile ?? null,
    position: official.position,
    termStart: official.termStart.toISOString(),
    termEnd: official.termEnd?.toISOString() ?? null,
    status: official.isActive ? "Active" : "Inactive",
    isArchive: official.isArchive,
  };
}

export async function fetchOfficialsFromDb(options: { archived?: boolean } = {}): Promise<OfficialRecord[]> {
  const officials = await prisma.official.findMany({
    where: {
      isArchive: options.archived ?? false,
    },
    orderBy: [{ termStart: "desc" }, { id: "desc" }],
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
  });

  return officials.map(mapOfficialRecord);
}

export { mapOfficialRecord };
