import { zodResolver } from "@hookform/resolvers/zod";
import Stack from "@mui/material/Stack";
import { useMemo } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import type { Department } from "@/api/contracts";
import { FormField } from "@/components/form/FormField";
import { useServerErrors } from "@/hooks/use-server-errors";
import { optionalText, requiredText } from "@/lib/schemas";

export const DEPARTMENT_FIELDS = ["name", "authority", "description"] as const;
export type DepartmentValues = Record<(typeof DEPARTMENT_FIELDS)[number], string>;

/** The department form of UC-09 and UC-10, with the name-taken message showing the existing status (4b). */
export function useDepartmentForm(initial?: Pick<Department, "name" | "authority" | "description">) {
  const { t } = useTranslation("ui");
  const { t: tc } = useTranslation();
  const schema = useMemo(
    () =>
      z.object({ name: requiredText(150), authority: requiredText(150), description: optionalText(2000) }),
    [],
  );
  const form = useForm<DepartmentValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      authority: initial?.authority ?? "",
      description: initial?.description ?? "",
    },
  });
  const applyServerErrors = useServerErrors(form.setError, DEPARTMENT_FIELDS);

  const onServerError = (error: unknown) => {
    const apiError = applyServerErrors(error);
    const existingStatus = apiError.details.existing_status;
    if (apiError.code === "department_name_taken" && typeof existingStatus === "string") {
      form.setError("name", {
        type: "server",
        message: t("departments.nameTaken", { status: tc(`departmentStatus.${existingStatus}`) }),
      });
    }
  };

  return { form, onServerError };
}

export function DepartmentFields({
  form,
  autoFocus,
}: {
  form: UseFormReturn<DepartmentValues>;
  autoFocus?: boolean;
}) {
  const { t } = useTranslation("ui");
  return (
    <Stack spacing={2.25}>
      <FormField control={form.control} name="name" label={t("fields.name")} required autoFocus={autoFocus} />
      <FormField
        control={form.control}
        name="authority"
        label={t("fields.authority")}
        helperText={t("departments.authorityHint")}
        required
      />
      <FormField
        control={form.control}
        name="description"
        label={`${t("fields.description")} (${t("form.optional")})`}
        multiline
        minRows={3}
      />
    </Stack>
  );
}
