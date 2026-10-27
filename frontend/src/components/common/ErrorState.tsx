import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { errorMessage } from "@/lib/error-messages";

interface ErrorStateProps {
  /** The error that failed the load; its `error.code` gives the message. */
  error?: unknown;
  /** Or a code directly (e.g. network_error). */
  code?: string;
  title?: string;
  onRetry?: () => void;
}

export function ErrorState({ error, code, title, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();
  const message =
    error !== undefined ? errorMessage(error) : t(`code.${code ?? "unknown_error"}`, { ns: "errors" });
  return (
    <Box role="alert" sx={{ textAlign: "center", py: 6, px: 2, maxWidth: 440, mx: "auto" }}>
      <Box
        sx={{
          width: 64,
          height: 64,
          mx: "auto",
          mb: 2,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          bgcolor: "tone.errorSoft",
          color: "error.main",
        }}
      >
        <ErrorOutlineRounded fontSize="large" />
      </Box>
      <Typography variant="h5" component="h2" gutterBottom>
        {title ?? t("states.errorTitle")}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: onRetry ? 3 : 0 }}>
        {message}
      </Typography>
      {onRetry && (
        <Button variant="outlined" onClick={onRetry}>
          {t("actions.retry")}
        </Button>
      )}
    </Box>
  );
}
