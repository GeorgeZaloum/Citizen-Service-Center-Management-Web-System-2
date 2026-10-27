import DarkModeRounded from "@mui/icons-material/DarkModeRounded";
import LightModeRounded from "@mui/icons-material/LightModeRounded";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useTranslation } from "react-i18next";

import { useColorMode } from "@/app/theme/ColorModeProvider";

export function ThemeToggle() {
  const { t } = useTranslation();
  const { mode, toggle } = useColorMode();
  return (
    <Tooltip title={t("actions.toggleTheme")}>
      <IconButton onClick={toggle} aria-label={t("actions.toggleTheme")}>
        {mode === "light" ? <DarkModeRounded /> : <LightModeRounded />}
      </IconButton>
    </Tooltip>
  );
}
