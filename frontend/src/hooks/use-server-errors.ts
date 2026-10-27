import { useCallback } from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import { ApiError, toApiError } from "@/api/errors";
import { errorMessage, fieldErrorMessages } from "@/lib/error-messages";
import { toast } from "@/lib/toast";

const NO_RENAMES: Record<string, string> = {};

/**
 * Applies a failed request to a form: `details.<field>` messages go under their fields, and
 * the general message (`error.code`) goes to a toast when no field could show it.
 * `fieldMap` renames server fields to form fields (e.g. department_id → department).
 */
export function useServerErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  fields: readonly string[],
  fieldMap: Record<string, string> = NO_RENAMES,
) {
  return useCallback(
    (error: unknown): ApiError => {
      const apiError = toApiError(error);
      let shown = 0;
      for (const [field, message] of Object.entries(fieldErrorMessages(apiError))) {
        const target = fieldMap[field] ?? field;
        if (fields.includes(target)) {
          setError(target as Path<T>, { type: "server", message }, { shouldFocus: shown === 0 });
          shown += 1;
        }
      }
      if (!shown) toast.error(errorMessage(apiError));
      return apiError;
    },
    [setError, fields, fieldMap],
  );
}
