/** Recognize existing local/international formats without accepting arbitrary text. */
export function mobileNationalNumber(value: string): string {
  const compact = value.trim().replace(/[\s()-]/g, "");
  if (/^\+639\d{9}$/.test(compact)) return compact.slice(3);
  if (/^639\d{9}$/.test(compact)) return compact.slice(2);
  if (/^09\d{9}$/.test(compact)) return compact.slice(1);
  return compact;
}

export function normalizePhilippineMobile(value: string): string {
  const national = mobileNationalNumber(value);
  return /^9\d{9}$/.test(national) ? `+63${national}` : value.trim();
}
