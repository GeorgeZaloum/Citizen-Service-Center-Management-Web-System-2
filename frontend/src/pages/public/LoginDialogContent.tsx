import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import LockClockRounded from "@mui/icons-material/LockClockRounded";
import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { toApiError } from "@/api/errors";
import { LtrText } from "@/components/common/LtrText";
import { FormField } from "@/components/form/FormField";
import { PasswordField } from "@/components/form/PasswordField";
import { fetchCsrfToken, useAuthStore, useLogin } from "@/features/auth";
import { useCenterSettings } from "@/features/center-settings/hooks";
import { useCountdown } from "@/hooks/use-countdown";
import { useServerErrors } from "@/hooks/use-server-errors";
import { errorMessage } from "@/lib/error-messages";
import { formatCountdown, formatTime } from "@/lib/format";
import { emailField, requiredPassword } from "@/lib/schemas";

import { AuthDialogHeader } from "./AuthDialogs";

type LoginProblem = { kind: "invalid" } | { kind: "locked"; until: number } | { kind: "disabled" } | null;

interface LoginDialogContentProps {
  titleId: string;
  redirectTo?: string;
  registeredEmail?: string;
  onClose: () => void;
  onRegister: () => void;
}

/** UC-02 3a: passwords are reset by the center's management; show how to reach it. */
function ForgotPasswordView({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation("ui");
  const { data, isPending, isError, error } = useCenterSettings();
  return (
    <Stack spacing={2.5}>
      <Typography>{t("auth.forgotBody")}</Typography>
      <Box sx={{ p: 2, borderRadius: 1, bgcolor: "sage.soft" }}>
        <Typography variant="subtitle2" sx={{ color: "primary.main", mb: 1 }}>
          {t("auth.forgotContact")}
        </Typography>
        {isError ? (
          <Typography color="error">{errorMessage(error)}</Typography>
        ) : isPending ? (
          <>
            <Skeleton width="60%" />
            <Skeleton width="80%" />
          </>
        ) : (
          <Stack spacing={0.5}>
            <Typography fontWeight={600}>{data.name}</Typography>
            <Typography>
              {t("landing.phones")}: <LtrText>{data.contact_phones}</LtrText>
            </Typography>
            <Typography>
              {t("landing.address")}: {data.address}
            </Typography>
            <Typography>
              {t("landing.hours")}:{" "}
              {t("landing.hoursValue", {
                start: formatTime(data.work_start),
                end: formatTime(data.work_end),
              })}
            </Typography>
          </Stack>
        )}
      </Box>
      <Button onClick={onBack} startIcon={<ArrowForwardRounded />} sx={{ alignSelf: "flex-start" }}>
        {t("auth.backToLogin")}
      </Button>
    </Stack>
  );
}

export function LoginDialogContent({
  titleId,
  redirectTo,
  registeredEmail,
  onClose,
  onRegister,
}: LoginDialogContentProps) {
  const { t } = useTranslation("ui");
  const { t: tc } = useTranslation();
  const { t: te } = useTranslation("errors");
  const [view, setView] = useState<"form" | "forgot">("form");
  const [problem, setProblem] = useState<LoginProblem>(null);
  const storedNotice = useAuthStore((state) => state.notice);
  const consumeNotice = useAuthStore((state) => state.consumeNotice);
  // The session notice (expired / logged out) is read once when the dialog opens, then
  // cleared from the store so it does not come back on the next visit.
  const [notice, setNotice] = useState(storedNotice);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const login = useLogin(redirectTo);

  const schema = useMemo(() => z.object({ email: emailField(), password: requiredPassword() }), []);
  type Values = z.infer<typeof schema>;
  const { control, handleSubmit, setError, resetField, setFocus } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: registeredEmail ?? "", password: "" },
  });
  const applyServerErrors = useServerErrors(setError, ["email", "password"]);

  const lockedSeconds = useCountdown(problem?.kind === "locked" ? problem.until : null);
  const locked = problem?.kind === "locked" && lockedSeconds > 0;

  useEffect(() => {
    if (storedNotice) consumeNotice();
  }, [storedNotice, consumeNotice]);
  useEffect(() => {
    if (registeredEmail) setFocus("password");
  }, [registeredEmail, setFocus]);

  // Login answers have their own presentation (UC-02 4a, 4b, 4c); anything else follows the
  // common rules (field errors under the fields, the rest in a toast).
  const showLoginError = (error: unknown) => {
    const { code, details } = toApiError(error);
    if (code === "already_authenticated") {
      void bootstrap();
      return;
    }
    if (code === "invalid_credentials") setProblem({ kind: "invalid" });
    else if (code === "account_locked") {
      const seconds = Number(details.retry_after_seconds) || 0;
      setProblem({ kind: "locked", until: Date.now() + seconds * 1000 });
    } else if (code === "account_disabled") setProblem({ kind: "disabled" });
    else {
      if (code === "csrf_failed") void fetchCsrfToken();
      applyServerErrors(error);
    }
    resetField("password");
  };

  const onSubmit = handleSubmit((values) => {
    setProblem(null);
    setNotice(null);
    login.mutate(values, { onError: showLoginError });
  });

  return (
    <>
      <AuthDialogHeader
        titleId={titleId}
        title={view === "form" ? t("auth.loginTitle") : t("auth.forgotTitle")}
        subtitle={view === "form" ? t("auth.loginSubtitle") : t("auth.forgotContact")}
        onClose={onClose}
      />
      <Box sx={{ px: { xs: 2.5, sm: 3.5 }, py: 3, overflowY: "auto" }}>
        {view === "forgot" ? (
          <ForgotPasswordView onBack={() => setView("form")} />
        ) : (
          <Box component="form" noValidate onSubmit={onSubmit}>
            <Stack spacing={2.25}>
              {registeredEmail && !problem && <Alert severity="success">{t("auth.registerSuccess")}</Alert>}
              {notice && !problem && (
                <Alert severity={notice === "expired" ? "warning" : "info"}>
                  {notice === "expired" ? t("auth.sessionExpired") : t("auth.loggedOut")}
                </Alert>
              )}
              {problem?.kind === "invalid" && (
                <Alert severity="error" role="alert">
                  {te("code.invalid_credentials")}
                </Alert>
              )}
              {problem?.kind === "locked" && (
                <Alert severity={locked ? "error" : "info"} icon={<LockClockRounded />} role="alert">
                  {locked ? (
                    <>
                      <AlertTitle>{t("auth.lockedTitle")}</AlertTitle>
                      {t("auth.lockedBody")}{" "}
                      <Box component="strong" aria-live="off">
                        <LtrText>{formatCountdown(lockedSeconds)}</LtrText>
                      </Box>
                    </>
                  ) : (
                    t("auth.lockedOver")
                  )}
                </Alert>
              )}
              {problem?.kind === "disabled" && (
                <Alert severity="error" role="alert">
                  <AlertTitle>{t("auth.disabledTitle")}</AlertTitle>
                  {t("auth.disabledBody")}{" "}
                  <Link component="button" type="button" onClick={() => setView("forgot")}>
                    {t("auth.forgotContact")}
                  </Link>
                </Alert>
              )}

              <FormField
                control={control}
                name="email"
                label={t("fields.email")}
                placeholder={t("placeholders.email")}
                type="email"
                autoComplete="username"
                autoFocus={!registeredEmail}
                ltr
                required
              />
              <PasswordField
                control={control}
                name="password"
                label={t("fields.password")}
                autoComplete="current-password"
                required
              />
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: -1 }}>
                <Link component="button" type="button" variant="body2" onClick={() => setView("forgot")}>
                  {t("auth.forgotPassword")}
                </Link>
              </Box>
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={login.isPending || locked}
              >
                {login.isPending ? tc("states.loading") : t("auth.loginSubmit")}
              </Button>
            </Stack>
            <Divider sx={{ my: 3 }} />
            <Typography variant="body2" sx={{ textAlign: "center" }}>
              {t("auth.noAccount")}{" "}
              <Link component="button" type="button" fontWeight={600} onClick={onRegister}>
                {tc("actions.register")}
              </Link>
            </Typography>
          </Box>
        )}
      </Box>
    </>
  );
}
