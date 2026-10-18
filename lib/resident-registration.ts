export const VALID_ID_TYPES = [
  "Student ID", "National ID", "Driver's License", "TIN ID", "PhilHealth ID", "Other",
] as const;

// Use the barangay's calendar date on both the client and server.
export function getRegistrationAge(birthDate: string, today = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const birth = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(birth.getTime()) || birth.toISOString().slice(0, 10) !== birthDate) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(today);
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
  const year = part("year"), month = part("month"), day = part("day");
  let age = year - birth.getUTCFullYear();
  if (month < birth.getUTCMonth() + 1 || (month === birth.getUTCMonth() + 1 && day < birth.getUTCDate())) age--;
  return birthDate > `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` ? null : age;
}

export function getRegistrationVotingFields(birthDate: string, isVoter: "" | "Yes" | "No", precinctNumber: string) {
  const age = getRegistrationAge(birthDate);
  if (age === null) return { isVoter: "" as const, precinctNumber: "" };
  if (age < 15) return { isVoter: "No" as const, precinctNumber: "" };
  return { isVoter, precinctNumber: isVoter === "Yes" ? precinctNumber : "" };
}
