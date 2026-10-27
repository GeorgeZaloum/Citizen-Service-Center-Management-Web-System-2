import CloseRounded from "@mui/icons-material/CloseRounded";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useId, type FormEventHandler, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface FormDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  submitLabel?: string;
  submitColor?: "primary" | "error";
  loading?: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onClose: () => void;
  maxWidth?: "xs" | "sm" | "md";
  /** Replaces the cancel/submit buttons (e.g. a single "Done" after a reset). */
  actions?: ReactNode;
}

/**
 * A dialog that is a form: Enter submits, Esc cancels, full screen on phones.
 * Styles are written left-to-right; the RTL plugin mirrors them (the close button ends up on the left).
 */
export function FormDialog({
  open,
  title,
  children,
  submitLabel,
  submitColor = "primary",
  loading = false,
  onSubmit,
  onClose,
  maxWidth = "sm",
  actions,
}: FormDialogProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const titleId = useId();
  const close = loading ? undefined : onClose;

  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth={maxWidth}
      fullScreen={fullScreen}
      aria-labelledby={titleId}
      slotProps={{ paper: { component: "form", noValidate: true, onSubmit } as object }}
    >
      <DialogTitle id={titleId} sx={{ pr: 7 }}>
        {title}
        <IconButton
          onClick={close}
          disabled={loading}
          aria-label={t("actions.close")}
          sx={{ position: "absolute", top: 12, right: 12 }}
        >
          <CloseRounded />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        {actions ?? (
          <>
            <Button onClick={onClose} disabled={loading} color="inherit">
              {t("actions.cancel")}
            </Button>
            <Button type="submit" variant="contained" color={submitColor} disabled={loading}>
              {submitLabel ?? t("actions.save")}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
