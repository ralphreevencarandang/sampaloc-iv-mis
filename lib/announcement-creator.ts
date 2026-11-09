import type { AdminRole } from "@/app/generated/prisma/enums";

// The existing Secretary account uses ADMIN; CLERK is the separate clerk account.
export const ANNOUNCEMENT_CREATORS = {
  ADMIN: { firstName: "Belen", lastName: "Movido", name: "Belen Movido" },
  SK: { firstName: "Jedrick", lastName: "Narvaez", name: "Jedrick Narvaez" },
  PEACE_AND_ORDER: { firstName: "Ernesto", lastName: "Atienza", name: "Ernesto C. Atienza" },
  CLERK: { firstName: "Alice Joy", lastName: "Lopez", name: "Alice Joy J. Lopez" },
  PUNONG_BARANGAY: { firstName: "Armando", lastName: "Movido", name: "Armando M. Movido" },
} satisfies Partial<Record<AdminRole, { firstName: string; lastName: string; name: string }>>;

export function getAnnouncementCreator(role?: AdminRole | null) {
  return role && role in ANNOUNCEMENT_CREATORS
    ? ANNOUNCEMENT_CREATORS[role as keyof typeof ANNOUNCEMENT_CREATORS]
    : null;
}

export function getAnnouncementCreatorName(official: { firstName: string; lastName: string }) {
  return Object.values(ANNOUNCEMENT_CREATORS).find(
    (creator) => creator.firstName.toLowerCase() === official.firstName.toLowerCase() && creator.lastName.toLowerCase() === official.lastName.toLowerCase()
  )?.name ?? [official.firstName, official.lastName].join(" ");
}
