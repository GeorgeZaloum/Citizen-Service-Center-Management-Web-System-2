import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { useCurrentUser } from "@/features/auth";
import { formatDate } from "@/lib/format";

import { DamascenePattern } from "./DamascenePattern";

/** The greeting at the top of each role's home. */
export function WelcomeBanner({ body, actions }: { body: string; actions?: ReactNode }) {
  const { t } = useTranslation("ui");
  const { t: tc } = useTranslation();
  const user = useCurrentUser();
  if (!user) return null;
  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "20px",
        p: { xs: 3, md: 4 },
        mb: 4,
        bgcolor: "primary.main",
        color: "primary.contrastText",
      }}
    >
      <DamascenePattern opacity={0.1} sx={{ filter: "brightness(3)" }} />
      <Box
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justifyContent: "space-between",
          alignItems: { md: "center" },
          gap: 2.5,
        }}
      >
        <Box>
          <Box sx={{ display: "flex", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
            <Chip
              size="small"
              label={tc(`roles.${user.role}`)}
              sx={{ bgcolor: "gold.main", color: "gold.contrastText" }}
            />
            <Chip
              size="small"
              label={formatDate(new Date().toISOString())}
              sx={{ bgcolor: "rgba(255,255,255,0.14)", color: "inherit" }}
            />
          </Box>
          <Typography variant="h3" component="h1" sx={{ color: "inherit", mb: 0.75 }}>
            {t("home.greeting", { name: user.full_name })}
          </Typography>
          <Typography sx={{ opacity: 0.9 }}>{body}</Typography>
        </Box>
        {actions && <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", flexShrink: 0 }}>{actions}</Box>}
      </Box>
    </Box>
  );
}
