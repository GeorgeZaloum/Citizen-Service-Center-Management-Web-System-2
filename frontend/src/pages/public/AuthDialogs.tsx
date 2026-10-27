import CloseRounded from "@mui/icons-material/CloseRounded";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { DamascenePattern } from "@/components/common/DamascenePattern";
import { LogoMark } from "@/components/common/Logo";

import { LoginDialogContent } from "./LoginDialogContent";
import { RegisterDialogContent } from "./RegisterDialogContent";

export type AuthMode = "login" | "register";

/** State carried between the auth dialogs and from the route guards. */
export interface AuthLocationState {
  /** Where RequireAuth was going before it asked for a login. */
  from?: string;
  /** UC-01: the new citizen's email, prefilled in the login form. */
  registeredEmail?: string;
}

interface AuthDialogShellProps {
  title: string;
  subtitle: string;
  titleId: string;
  onClose: () => void;
  children: ReactNode;
}

/** Header shared by both dialogs: the mark on a band of the Damascene pattern. */
export function AuthDialogHeader({
  title,
  subtitle,
  titleId,
  onClose,
}: Omit<AuthDialogShellProps, "children">) {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        px: { xs: 2.5, sm: 3.5 },
        pt: 3,
        pb: 2.5,
        bgcolor: "background.default",
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <DamascenePattern opacity={0.07} />
      <IconButton
        onClick={onClose}
        aria-label={t("actions.close")}
        sx={{ position: "absolute", top: 10, right: 10 }}
      >
        <CloseRounded />
      </IconButton>
      <Box sx={{ position: "relative", display: "flex", alignItems: "center", gap: 1.75 }}>
        <LogoMark size={48} />
        <Box>
          <Typography id={titleId} variant="h4" component="h2">
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

/**
 * Login (UC-02) and registration (UC-01) as dialogs over the landing page. Each keeps its
 * own URL (/login, /register), so the route guards, links and the back button keep working.
 */
export function AuthDialogs({ mode }: { mode: AuthMode | null }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as AuthLocationState;
  const titleId = useId();

  const close = () => navigate("/", { replace: true });
  const switchTo = (next: AuthMode, nextState: AuthLocationState = {}) =>
    navigate(`/${next}`, { replace: true, state: { from: state.from, ...nextState } });

  return (
    <Dialog
      open={mode !== null}
      onClose={close}
      fullScreen={fullScreen}
      fullWidth
      maxWidth={mode === "register" ? "md" : "xs"}
      aria-labelledby={titleId}
      slotProps={{ paper: { sx: { maxWidth: mode === "register" ? 860 : 460, overflow: "hidden" } } }}
    >
      {mode === "login" && (
        <LoginDialogContent
          titleId={titleId}
          redirectTo={state.from}
          registeredEmail={state.registeredEmail}
          onClose={close}
          onRegister={() => switchTo("register")}
        />
      )}
      {mode === "register" && (
        <RegisterDialogContent
          titleId={titleId}
          onClose={close}
          onLogin={(email) => switchTo("login", email ? { registeredEmail: email } : {})}
        />
      )}
    </Dialog>
  );
}
