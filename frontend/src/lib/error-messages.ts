import { ApiError, toApiError } from "@/api/errors";
import i18n from "@/i18n";

type ErrorsBundle = {
  code: Record<string, string>;
  field: Record<string, string>;
  server: Record<string, string>;
  serverPatterns: Record<string, string>;
};

// Read the bundle directly: the backend messages contain dots, which i18next treats as key separators.
function bundle(): ErrorsBundle {
  return i18n.getResourceBundle(i18n.language || "ar", "errors") as ErrorsBundle;
}

function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? "");
}

/** One English field message of the backend in the user's language. */
export function translateServerMessage(message: string): string {
  const { server, serverPatterns, field } = bundle();
  if (server[message]) return server[message];
  const maxLength = /^Ensure this field has no more than (\d+) characters\.$/.exec(message);
  if (maxLength) return interpolate(serverPatterns.maxLength, { max: maxLength[1] });
  const imageSize = /^The image must not exceed (\d+) MB\.$/.exec(message);
  if (imageSize) return interpolate(serverPatterns.imageTooLarge, { max: imageSize[1] });
  return field.invalid;
}

/** The general message of an error (toast or alert), from its stable `error.code`. */
export function errorMessage(error: unknown): string {
  const apiError = error instanceof ApiError ? error : toApiError(error);
  const { code } = bundle();
  return code[apiError.code] ?? code.unknown_error;
}

/** `details.<field>: [messages]` → one translated message per field, shown under the field. */
export function fieldErrorMessages(error: ApiError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    if (messages.length) result[field] = messages.map(translateServerMessage).join(" ");
  }
  return result;
}
