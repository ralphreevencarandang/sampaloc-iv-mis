export const PWD_CONDITIONS = [
  "Psychosocial",
  "Chronic Illness",
  "Learning",
  "Mental",
  "Visual",
  "Orthopedic/Physical",
  "Speech and Hearing",
  "Rare Disease",
  "Intellectual",
] as const;

export type PwdCondition = (typeof PWD_CONDITIONS)[number];

export function calculateAge(birthDate: string | Date) {
  const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);

  if (Number.isNaN(birth.getTime())) {
    return Number.NaN;
  }

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

export function getDemographicGroup(birthDate: string | Date) {
  const age = calculateAge(birthDate);

  if (Number.isNaN(age)) {
    return null;
  }

  if (age >= 60) {
    return "Senior";
  }

  if (age <= 17) {
    return "Minor";
  }

  return "Adult";
}
