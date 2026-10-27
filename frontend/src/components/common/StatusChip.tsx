import Chip, { type ChipProps } from "@mui/material/Chip";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import type { AccountStatus, DepartmentStatus } from "@/api/contracts";

export type ChipTone = "success" | "warning" | "neutral" | "danger" | "info";

type StatusChipProps = Omit<ChipProps, "color"> &
  (
    | { kind: "account"; status: AccountStatus }
    | { kind: "department"; status: DepartmentStatus }
    | { kind: "custom"; tone: ChipTone; label: string }
  );

const STATUS_TONE: Record<string, ChipTone> = {
  ACTIVE: "success",
  DISABLED: "danger",
  SUSPENDED: "warning",
  ARCHIVED: "neutral",
};

/** Soft background with the darkest text of the same color family (AA contrast). */
export function StatusChip(props: StatusChipProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { palette } = theme;

  let tone: ChipTone;
  let label: string;
  let rest: ChipProps;
  if (props.kind === "custom") {
    const { kind: _kind, tone: chipTone, label: chipLabel, ...others } = props;
    tone = chipTone;
    label = chipLabel;
    rest = others;
  } else {
    const { kind, status, ...others } = props;
    tone = STATUS_TONE[status];
    label = t(kind === "account" ? `accountStatus.${status}` : `departmentStatus.${status}`);
    rest = others;
  }

  const colors: Record<ChipTone, { bg: string; fg: string }> = {
    success: {
      bg: palette.sage.soft,
      fg: palette.mode === "light" ? palette.primary.main : palette.sage.main,
    },
    warning: { bg: palette.gold.soft, fg: palette.warning.dark },
    neutral: { bg: palette.neutral.soft, fg: palette.neutral.text },
    danger: { bg: palette.tone.errorSoft, fg: palette.error.dark },
    info: { bg: palette.tone.infoSoft, fg: palette.info.dark },
  };

  return (
    <Chip
      size="small"
      label={label}
      {...rest}
      sx={{ bgcolor: colors[tone].bg, color: colors[tone].fg, ...rest.sx }}
    />
  );
}
