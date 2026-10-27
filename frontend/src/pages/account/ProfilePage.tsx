import { zodResolver } from "@hookform/resolvers/zod";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid2";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { z } from "zod";

import { InfoList } from "@/components/common/InfoList";
import { LtrText } from "@/components/common/LtrText";
import { PageHeader } from "@/components/common/PageHeader";
import { SecureImage } from "@/components/common/SecureImage";
import { StatusChip } from "@/components/common/StatusChip";
import { FormField } from "@/components/form/FormField";
import { hasCapability, useCurrentUser, useUpdateProfile } from "@/features/auth";
import { useServerErrors } from "@/hooks/use-server-errors";
import { formatDate } from "@/lib/format";
import { emailField, phoneField } from "@/lib/schemas";
import { toast } from "@/lib/toast";

/** UC-08: email and phone are editable; name, national ID, role, department and ID images are fixed. */
export default function ProfilePage() {
  const { t } = useTranslation("ui");
  const { t: tc } = useTranslation();
  const user = useCurrentUser();
  const update = useUpdateProfile();

  const schema = useMemo(() => z.object({ email: emailField(), phone: phoneField() }), []);
  type Values = z.infer<typeof schema>;
  const { control, handleSubmit, setError, reset, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: user?.email ?? "", phone: user?.phone ?? "" },
  });
  const applyServerErrors = useServerErrors(setError, ["email", "phone"]);

  useEffect(() => {
    if (user) reset({ email: user.email, phone: user.phone });
  }, [user, reset]);

  if (!user) return null;

  const onSubmit = handleSubmit((values) => {
    // Only the changed fields are sent; UC-08 4b keeps the previous value on a conflict.
    const changes: Partial<Values> = {};
    if (values.email.toLowerCase() !== user.email) changes.email = values.email;
    if (values.phone !== user.phone) changes.phone = values.phone;
    if (!Object.keys(changes).length) {
      toast.info(t("form.noChanges"));
      return;
    }
    update.mutate(changes, {
      onSuccess: () => toast.success(t("account.profileSaved")),
      onError: applyServerErrors,
    });
  });

  return (
    <>
      <PageHeader
        title={t("account.profileTitle")}
        description={t("account.profileSubtitle")}
        actions={
          <Button variant="outlined" component={RouterLink} to="/account/password">
            {t("account.passwordTitle")}
          </Button>
        }
      />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h5" component="h2" sx={{ mb: 2.5 }}>
                {t("account.fixedData")}
              </Typography>
              <InfoList
                items={[
                  { label: t("fields.full_name"), value: user.full_name },
                  { label: t("fields.role"), value: tc(`roles.${user.role}`) },
                  {
                    label: t("fields.national_id"),
                    value: user.national_id ? <LtrText>{user.national_id}</LtrText> : "—",
                  },
                  {
                    label: t("fields.department"),
                    value: user.department?.name ?? t("account.noDepartment"),
                  },
                  {
                    label: t("fields.status"),
                    value: <StatusChip kind="account" status={user.status ?? "ACTIVE"} />,
                  },
                  { label: t("fields.created_at"), value: formatDate(user.created_at) },
                ]}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card component="form" noValidate onSubmit={onSubmit} sx={{ height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h5" component="h2" sx={{ mb: 0.5 }}>
                {t("account.contactData")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                {t("account.contactHint")}
              </Typography>
              <Stack spacing={2.25}>
                <FormField
                  control={control}
                  name="email"
                  type="email"
                  label={t("fields.email")}
                  ltr
                  required
                />
                <FormField control={control} name="phone" type="tel" label={t("fields.phone")} ltr required />
                <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                  <Button
                    color="inherit"
                    disabled={!formState.isDirty || update.isPending}
                    onClick={() => reset({ email: user.email, phone: user.phone })}
                  >
                    {tc("actions.cancel")}
                  </Button>
                  <Button type="submit" variant="contained" disabled={update.isPending}>
                    {update.isPending ? t("form.saving") : tc("actions.save")}
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        {hasCapability(user, "identity_documents.view_own") && (
          <Grid size={12}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" component="h2" sx={{ mb: 0.5 }}>
                  {t("account.idCard")}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                  {t("account.idCardHint")}
                </Typography>
                <Grid container spacing={3}>
                  {(["FRONT", "BACK"] as const).map((side) => (
                    <Grid key={side} size={{ xs: 12, sm: 6, md: 4 }}>
                      <SecureImage userId={user.id} side={side} />
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </>
  );
}
