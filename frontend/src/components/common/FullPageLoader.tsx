import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { useTranslation } from "react-i18next";

import { LogoMark } from "./Logo";

export function FullPageLoader() {
  const { t } = useTranslation();
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "background.default" }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <LogoMark size={56} />
        <CircularProgress size={28} aria-label={t("states.loading")} />
      </Box>
    </Box>
  );
}
