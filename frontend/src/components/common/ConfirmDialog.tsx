import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** What will happen (UC-11 step 2: the effect is shown before confirming). */
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  loading?: boolean;
  /** Disable confirm until a condition holds (e.g. the department name typed exactly). */
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  tone = "primary",
  loading = false,
  confirmDisabled = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const titleId = useId();
  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      aria-labelledby={titleId}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle id={titleId}>{title}</DialogTitle>
      {children && <DialogContent>{children}</DialogContent>}
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={loading} color="inherit">
          {cancelLabel ?? t("actions.cancel")}
        </Button>
        <Button
          variant="contained"
          color={tone === "danger" ? "error" : "primary"}
          onClick={onConfirm}
          disabled={loading || confirmDisabled}
        >
          {confirmLabel ?? t("actions.confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
