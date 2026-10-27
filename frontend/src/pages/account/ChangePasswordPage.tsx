import { zodResolver } from "@hookform/resolvers/zod";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/common/PageHeader";
import { PasswordStrength } from "@/components/common/PasswordStrength";
import { PasswordField } from "@/components/form/PasswordField";
import { useChangePassword } from "@/features/auth";
import { useServerErrors } from "@/hooks/use-server-errors";
import { requiredPassword, withPasswordConfirmation } from "@/lib/schemas";
import { toast } from "@/lib/toast";

const FIELDS = ["current_password", "new_password", "new_password_confirmation"] as const;
type Values = Record<(typeof FIELDS)[number], string>;
const EMPTY: Values = { current_password: "", new_password: "", new_password_confirmation: "" };

/** UC-07: the other sessions end, this one stays. */
export default function ChangePasswordPage() {
  const { t } = useTranslation("ui");
  const { t: tc } = useTranslation();
  const change = useChangePassword();
  const schema = useMemo(
    () =>
      withPasswordConfirmation(
        { current_password: requiredPassword() },
        "new_password",
        "new_password_confirmation",
      ),
    [],
  );
  const { control, handleSubmit, setError, reset } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });
  const newPassword = useWatch({ control, name: "new_password" });
  const applyServerErrors = useServerErrors(setError, FIELDS);

  const onSubmit = handleSubmit((values) =>
    change.mutate(values, {
      onSuccess: () => {
        reset(EMPTY);
        toast.success(t("account.passwordSaved"));
      },
      onError: applyServerErrors,
    }),
  );

  return (
    <>
      <PageHeader
        title={t("account.passwordTitle")}
        description={t("account.passwordSubtitle")}
        breadcrumbs={[
          { label: tc("nav.profile"), to: "/account/profile" },
          { label: t("account.passwordTitle") },
        ]}
      />
      <Card component="form" noValidate onSubmit={onSubmit} sx={{ maxWidth: 560 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <PasswordField
              control={control}
              name="current_password"
              label={t("fields.current_password")}
              autoComplete="current-password"
              required
              autoFocus
            />
            <Box>
              <PasswordField
                control={control}
                name="new_password"
                label={t("fields.new_password")}
                autoComplete="new-password"
                required
              />
              <PasswordStrength value={newPassword} />
            </Box>
            <PasswordField
              control={control}
              name="new_password_confirmation"
              label={t("fields.new_password_confirmation")}
              autoComplete="new-password"
              required
            />
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button type="submit" variant="contained" disabled={change.isPending}>
                {change.isPending ? t("form.saving") : tc("actions.save")}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </>
  );
}
