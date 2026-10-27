// Zod rules shared by the forms, mirroring shared/validators on the backend. Messages are
// read when a schema is built, so they follow the active language.
import { z } from "zod";

import i18n from "@/i18n";

import {
  EMAIL_PATTERN,
  NATIONAL_ID_PATTERN,
  PHONE_PATTERN,
  PASSWORD_MAX_LENGTH,
  idImageProblem,
  isStrongPassword,
} from "./validators";

const msg = (key: string, options?: Record<string, unknown>) => i18n.t(key, { ns: "ui", ...options });

export const requiredText = (max = 150) =>
  z.string().trim().min(1, msg("form.required")).max(max, msg("form.maxLength", { max }));

export const optionalText = (max = 150) => z.string().trim().max(max, msg("form.maxLength", { max }));

export const emailField = () =>
  z
    .string()
    .trim()
    .min(1, msg("form.required"))
    .max(150, msg("form.maxLength", { max: 150 }))
    .regex(EMAIL_PATTERN, msg("form.email"));

export const phoneField = () =>
  z.string().trim().min(1, msg("form.required")).regex(PHONE_PATTERN, msg("form.phone"));

export const nationalIdField = () =>
  z.string().trim().min(1, msg("form.required")).regex(NATIONAL_ID_PATTERN, msg("form.nationalId"));

export const strongPassword = () =>
  z
    .string()
    .min(1, msg("form.required"))
    .max(PASSWORD_MAX_LENGTH, msg("form.maxLength", { max: PASSWORD_MAX_LENGTH }))
    .refine(isStrongPassword, msg("form.weakPassword"));

export const requiredPassword = () => z.string().min(1, msg("form.required"));

/** A new password and its confirmation (UC-01, UC-03, UC-04, UC-05, UC-07). */
export function withPasswordConfirmation<T extends z.ZodRawShape>(
  shape: T,
  field: string,
  confirmation: string,
) {
  return z
    .object({ ...shape, [field]: strongPassword(), [confirmation]: requiredPassword() })
    .superRefine((values, context) => {
      const record = values as Record<string, unknown>;
      if (record[confirmation] && record[field] !== record[confirmation]) {
        context.addIssue({ code: "custom", path: [confirmation], message: msg("form.passwordMismatch") });
      }
    });
}

/** UC-01 4c: JPG or PNG up to 5 MB. */
export const idImageField = () =>
  z.custom<File | null>().superRefine((file, context) => {
    const problem = idImageProblem(file);
    if (problem) context.addIssue({ code: "custom", message: msg(`image.${problem}`) });
  });
