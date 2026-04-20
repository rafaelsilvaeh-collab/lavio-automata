/**
 * Phone helpers — UI displays/accepts (DD) 9XXXX-XXXX (10–11 digits, no country code).
 * Storage always keeps the BR country code "55" prefix for Evolution API compatibility.
 */

export const formatPhoneInput = (raw: string): string => {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

/** Strips formatting and prepends "55" (only if not already present). */
export const toStorage = (displayPhone: string): string => {
  const digits = displayPhone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return "55" + digits;
};

/** Removes leading "55" (when present) and returns formatted (DD) 9XXXX-XXXX. */
export const fromStorage = (stored: string | null | undefined): string => {
  if (!stored) return "";
  const digits = stored.replace(/\D/g, "");
  const local = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  return formatPhoneInput(local);
};
