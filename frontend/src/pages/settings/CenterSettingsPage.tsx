import { zodResolver } from "@hookform/resolvers/zod";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid2";
import Skeleton from "@mui/material/Skeleton";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import type { CenterSettings } from "@/api/contracts";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { FormField } from "@/components/form/FormField";
import { useCenterSettings, useUpdateCenterSettings } from "@/features/center-settings/hooks";
import { useServerErrors } from "@/hooks/use-server-errors";
import i18n from "@/i18n";
import { requiredText } from "@/lib/schemas";
import { toast } from "@/lib/toast";

const FIELDS = ["name", "address", "contact_phones", "work_start", "work_end"] as const;
type Values = Record<(typeof FIELDS)[number], string>;

const toForm = (settings: CenterSettings): Values => ({
  name: settings.name,
  address: settings.address,
  contact_phones: settings.contact_phones,
  work_start: settings.work_start.slice(0, 5),
  work_end: settings.work_end.slice(0, 5),
});

/** UC-19: the center information shown on the public pages and in "Forgot password". */
export default function CenterSettingsPage() {
  const { t } = useTranslation("ui");
  const { t: tc } = useTranslation();
  const settings = useCenterSettings();
  const update = useUpdateCenterSettings();

  const schema = useMemo(
    () =>
      z
        .object({
          name: requiredText(150),
          address: requiredText(255),
          contact_phones: requiredText(100),
          work_start: requiredText(8),
          work_end: requiredText(8),
        })
        // UC-19 4a: the working hours must end after they start ("HH:MM" compares as text).
        .refine((values) => !values.work_start || !values.work_end || values.work_end > values.work_start, {
          path: ["work_end"],
          message: i18n.t("center.hoursInvalid", { ns: "ui" }),
        }),
    [],
  );
  const { control, handleSubmit, setError, reset, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", address: "", contact_phones: "", work_start: "", work_end: "" },
  });
  const applyServerErrors = useServerErrors(setError, FIELDS);

  useEffect(() => {
    if (settings.data) reset(toForm(settings.data));
  }, [settings.data, reset]);

  const onSubmit = handleSubmit((values) =>
    update.mutate(values, {
      onSuccess: (saved) => {
        reset(toForm(saved));
        toast.success(t("center.saved"));
      },
      onError: applyServerErrors,
    }),
  );

  return (
    <>
      <PageHeader title={t("center.title")} description={t("center.subtitle")} />
      {settings.isError ? (
        <Card>
          <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />
        </Card>
      ) : settings.isPending ? (
        <Skeleton variant="rounded" height={360} sx={{ maxWidth: 760 }} />
      ) : (
        <Card component="form" noValidate onSubmit={onSubmit} sx={{ maxWidth: 760 }}>
          <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Grid container spacing={2.5}>
              <Grid size={12}>
                <FormField control={control} name="name" label={t("fields.center_name")} required />
              </Grid>
              <Grid size={12}>
                <FormField
                  control={control}
                  name="address"
                  label={t("fields.address")}
                  required
                  multiline
                  minRows={2}
                />
              </Grid>
              <Grid size={12}>
                <FormField
                  control={control}
                  name="contact_phones"
                  label={t("fields.contact_phones")}
                  helperText={t("center.phonesHint")}
                  ltr
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormField
                  control={control}
                  name="work_start"
                  type="time"
                  label={t("fields.work_start")}
                  ltr
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormField
                  control={control}
                  name="work_end"
                  type="time"
                  label={t("fields.work_end")}
                  ltr
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
            </Grid>
            <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", mt: 3 }}>
              <Button
                color="inherit"
                disabled={!formState.isDirty || update.isPending}
                onClick={() => settings.data && reset(toForm(settings.data))}
              >
                {tc("actions.cancel")}
              </Button>
              <Button type="submit" variant="contained" disabled={update.isPending}>
                {update.isPending ? t("form.saving") : tc("actions.save")}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </>
  );
}
