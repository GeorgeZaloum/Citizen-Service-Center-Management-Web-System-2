import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid2";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { toApiError } from "@/api/errors";
import { PasswordStrength } from "@/components/common/PasswordStrength";
import { FormField } from "@/components/form/FormField";
import { ImageUpload } from "@/components/form/ImageUpload";
import { PasswordField } from "@/components/form/PasswordField";
import { useRegister } from "@/features/auth";
import { useServerErrors } from "@/hooks/use-server-errors";
import {
  emailField,
  idImageField,
  nationalIdField,
  phoneField,
  requiredText,
  withPasswordConfirmation,
} from "@/lib/schemas";

import { AuthDialogHeader } from "./AuthDialogs";

const FIELDS = [
  "full_name",
  "national_id",
  "email",
  "phone",
  "password",
  "password_confirmation",
  "id_card_front",
  "id_card_back",
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
      <Typography component="legend" variant="h6" sx={{ mb: 2, color: "gold.text" }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

/** UC-01: register a citizen account with both ID card images; no session is opened. */
export function RegisterDialogContent({
  titleId,
  onClose,
  onLogin,
}: {
  titleId: string;
  onClose: () => void;
  onLogin: (email?: string) => void;
}) {
  const { t } = useTranslation("ui");
  const { t: tc } = useTranslation();
  const register = useRegister();
  const [existing, setExisting] = useState<string[] | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const schema = useMemo(
    () =>
      withPasswordConfirmation(
        {
          full_name: requiredText(150),
          national_id: nationalIdField(),
          email: emailField(),
          phone: phoneField(),
          id_card_front: idImageField(),
          id_card_back: idImageField(),
        },
        "password",
        "password_confirmation",
      ),
    [],
  );
  type Values = {
    full_name: string;
    national_id: string;
    email: string;
    phone: string;
    password: string;
    password_confirmation: string;
    id_card_front: File | null;
    id_card_back: File | null;
  };
  const { control, handleSubmit, setError, resetField } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      national_id: "",
      email: "",
      phone: "",
      password: "",
      password_confirmation: "",
      id_card_front: null,
      id_card_back: null,
    },
  });
  const password = useWatch({ control, name: "password" });
  const applyServerErrors = useServerErrors(setError, FIELDS);

  const onSubmit = handleSubmit((values) => {
    setExisting(null);
    register.mutate(
      { ...values, id_card_front: values.id_card_front as File, id_card_back: values.id_card_back as File },
      {
        onSuccess: (user) => onLogin(user.email),
        onError: (error) => {
          const apiError = toApiError(error);
          if (apiError.code === "account_exists") {
            // UC-01 4b: say which data is already registered, and suggest logging in.
            setExisting(Array.isArray(apiError.details.fields) ? (apiError.details.fields as string[]) : []);
            topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          } else {
            applyServerErrors(error);
          }
          // UC-01 4a: the data is kept, except the password.
          resetField("password");
          resetField("password_confirmation");
        },
      },
    );
  });

  return (
    <>
      <AuthDialogHeader
        titleId={titleId}
        title={t("auth.registerTitle")}
        subtitle={t("auth.registerSubtitle")}
        onClose={onClose}
      />
      <Box
        component="form"
        noValidate
        onSubmit={onSubmit}
        sx={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}
      >
        <Box ref={topRef} sx={{ px: { xs: 2.5, sm: 3.5 }, py: 3, overflowY: "auto", flex: 1 }}>
          {existing && (
            <Alert severity="warning" sx={{ mb: 3 }} role="alert">
              <AlertTitle>{t("auth.accountExists")}</AlertTitle>
              {existing.map((field) => t(`auth.accountExistsFields.${field}`)).join("، ")}.{" "}
              {t("auth.accountExistsHint")}{" "}
              <Link component="button" type="button" onClick={() => onLogin()} fontWeight={600}>
                {tc("actions.login")}
              </Link>
            </Alert>
          )}
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={4}>
                <Section title={t("auth.sectionPersonal")}>
                  <Stack spacing={2.25}>
                    <FormField
                      control={control}
                      name="full_name"
                      label={t("fields.full_name")}
                      required
                      autoFocus
                    />
                    <FormField
                      control={control}
                      name="national_id"
                      label={t("fields.national_id")}
                      placeholder={t("placeholders.national_id")}
                      inputMode="numeric"
                      ltr
                      required
                      slotProps={{ htmlInput: { maxLength: 11 } }}
                    />
                    <FormField
                      control={control}
                      name="email"
                      type="email"
                      label={t("fields.email")}
                      placeholder={t("placeholders.email")}
                      autoComplete="email"
                      ltr
                      required
                    />
                    <FormField
                      control={control}
                      name="phone"
                      type="tel"
                      label={t("fields.phone")}
                      placeholder={t("placeholders.phone")}
                      autoComplete="tel"
                      ltr
                      required
                      slotProps={{ htmlInput: { maxLength: 10 } }}
                    />
                  </Stack>
                </Section>
                <Section title={t("auth.sectionPassword")}>
                  <Stack spacing={2.25}>
                    <Box>
                      <PasswordField
                        control={control}
                        name="password"
                        label={t("fields.password")}
                        autoComplete="new-password"
                        required
                      />
                      <PasswordStrength value={password} />
                    </Box>
                    <PasswordField
                      control={control}
                      name="password_confirmation"
                      label={t("fields.password_confirmation")}
                      autoComplete="new-password"
                      required
                    />
                  </Stack>
                </Section>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Section title={t("auth.sectionIdCard")}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: -1 }}>
                  {t("auth.idCardHint")}
                </Typography>
                <Stack spacing={2.5}>
                  {(["id_card_front", "id_card_back"] as const).map((name) => (
                    <Controller
                      key={name}
                      control={control}
                      name={name}
                      render={({ field, fieldState }) => (
                        <ImageUpload
                          name={name}
                          label={t(`fields.${name}`)}
                          value={field.value}
                          onChange={field.onChange}
                          error={fieldState.error?.message}
                        />
                      )}
                    />
                  ))}
                </Stack>
              </Section>
            </Grid>
          </Grid>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            {t("auth.staffNote")}
          </Typography>
        </Box>
        <Box
          sx={{
            px: { xs: 2.5, sm: 3.5 },
            py: 2,
            borderTop: 1,
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
            bgcolor: "background.paper",
          }}
        >
          <Typography variant="body2">
            {t("auth.haveAccount")}{" "}
            <Link component="button" type="button" fontWeight={600} onClick={() => onLogin()}>
              {tc("actions.login")}
            </Link>
          </Typography>
          <Button type="submit" variant="contained" size="large" disabled={register.isPending}>
            {register.isPending ? tc("states.loading") : t("auth.registerSubmit")}
          </Button>
        </Box>
      </Box>
    </>
  );
}
