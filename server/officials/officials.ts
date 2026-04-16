import prismaModule from "@/lib/prisma";
import type { OfficialStatus } from "@/validations/official.validation";

const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule;

export type OfficialRecord = {
  id: string;
  name: string;
  email: string;
  position: string;
  termStart: string;
  termEnd: string | null;
  status: OfficialStatus;
};

type OfficialEntity = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  termStart: Date;
  termEnd: Date | null;
  isActive: boolean;
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
    position: official.position,
    termStart: official.termStart.toISOString(),
    termEnd: official.termEnd?.toISOString() ?? null,
    status: official.isActive ? "Active" : "Inactive",
  };
}

export async function fetchOfficialsFromDb(): Promise<OfficialRecord[]> {
  const officials = await prisma.official.findMany({
    orderBy: [{ termStart: "desc" }, { id: "desc" }],
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

  return officials.map(mapOfficialRecord);
}

export { mapOfficialRecord };
