// Client-side rules that mirror shared/validators on the backend, so most mistakes are
// caught before the request. The server checks everything again.
export const NATIONAL_ID_PATTERN = /^\d{11}$/;
export const PHONE_PATTERN = /^09\d{8}$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const ID_IMAGE_MAX_MB = 5;
export const ID_IMAGE_MAX_BYTES = ID_IMAGE_MAX_MB * 1024 * 1024;
export const ID_IMAGE_TYPES = ["image/jpeg", "image/png"] as const;

export type PasswordRule = "length" | "uppercase" | "lowercase" | "digit";

/** shared/validators/password.py: at least 8 characters with upper case, lower case and a digit. */
export const PASSWORD_RULES: { rule: PasswordRule; test: (value: string) => boolean }[] = [
  {
    rule: "length",
    test: (value) => value.length >= PASSWORD_MIN_LENGTH && value.length <= PASSWORD_MAX_LENGTH,
  },
  { rule: "uppercase", test: (value) => /[A-Z]/.test(value) },
  { rule: "lowercase", test: (value) => /[a-z]/.test(value) },
  { rule: "digit", test: (value) => /\d/.test(value) },
];

export function passwordRuleResults(value: string): Record<PasswordRule, boolean> {
  return Object.fromEntries(PASSWORD_RULES.map(({ rule, test }) => [rule, test(value)])) as Record<
    PasswordRule,
    boolean
  >;
}

export function isStrongPassword(value: string): boolean {
  return PASSWORD_RULES.every(({ test }) => test(value));
}

/** Converts Arabic-Indic and Persian digits to Latin, so "٠٩١٢…" typed on an Arabic keyboard is accepted. */
export function toLatinDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
}

/** UC-01 4c: JPG or PNG up to 5 MB. Returns the problem, or null. */
export function idImageProblem(file: File | null | undefined): "required" | "type" | "size" | null {
  if (!file) return "required";
  if (!(ID_IMAGE_TYPES as readonly string[]).includes(file.type)) return "type";
  if (file.size > ID_IMAGE_MAX_BYTES) return "size";
  return null;
}
