import type { AdminRole } from "@/app/generated/prisma/enums";

export const ANNOUNCEMENT_OFFICIALS = [
  { firstName: "Armando", lastName: "Movido", name: "Armando M. Movido" },
  { firstName: "Belen", lastName: "Movido", name: "Belen P. Movido" },
  { firstName: "Imelda", lastName: "Villa", name: "Imelda M. Villa" },
  { firstName: "Anabelle", lastName: "Movido", name: "Anabelle A. Movido" },
  { firstName: "Dominador", lastName: "Alvaran Jr.", name: "Dominador P. Alvaran Jr." },
  { firstName: "Reynaldo", lastName: "Ancheta", name: "Reynaldo B. Ancheta" },
  { firstName: "Alice Joy", lastName: "Lopez", name: "Alice Joy J. Lopez" },
  { firstName: "Ernesto", lastName: "Atienza", name: "Ernesto C. Atienza" },
  { firstName: "Jose", lastName: "De Vera", name: "Jose J. De Vera" },
  { firstName: "Ruel", lastName: "Ledesma", name: "Ruel M. Ledesma" },
  { firstName: "Jedrick", lastName: "Narvaez", name: "Jedrick Narvaez" },
] as const;

// Secretary and system Admin share ADMIN, so role alone cannot distinguish them.
export const ANNOUNCEMENT_CREATORS = {
  ADMIN: ANNOUNCEMENT_OFFICIALS[1],
  SK: { firstName: "Jedrick", lastName: "Narvaez", name: "Jedrick Narvaez" },
  PEACE_AND_ORDER: { firstName: "Ernesto", lastName: "Atienza", name: "Ernesto C. Atienza" },
  CLERK: { firstName: "Alice Joy", lastName: "Lopez", name: "Alice Joy J. Lopez" },
  PUNONG_BARANGAY: { firstName: "Armando", lastName: "Movido", name: "Armando M. Movido" },
} satisfies Partial<Record<AdminRole, { firstName: string; lastName: string; name: string }>>;

type CreatorAccount = { role?: AdminRole | null; email?: string | null };

export function canSelectAnnouncementCreator(account: CreatorAccount) {
  return account.role === "ADMIN" && account.email?.trim().toLowerCase() === "admin@sampalociv.com";
}

export function getAccountAnnouncementCreator(account: CreatorAccount) {
  if (account.role === "ADMIN") {
    return account.email?.trim().toLowerCase() === "belen.movido@sampaloc4.gov.ph"
      ? ANNOUNCEMENT_CREATORS.ADMIN : null;
  }
  return getAnnouncementCreator(account.role);
}

export function getAnnouncementCreator(role?: AdminRole | null) {
  return role && role in ANNOUNCEMENT_CREATORS
    ? ANNOUNCEMENT_CREATORS[role as keyof typeof ANNOUNCEMENT_CREATORS]
    : null;
}

export function getAnnouncementCreatorName(official: { firstName: string; lastName: string }) {
  return ANNOUNCEMENT_OFFICIALS.find(
    (creator) => creator.firstName.toLowerCase() === official.firstName.toLowerCase() && creator.lastName.toLowerCase() === official.lastName.toLowerCase()
  )?.name ?? [official.firstName, official.lastName].join(" ");
}
