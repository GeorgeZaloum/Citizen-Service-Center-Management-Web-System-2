import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";

import { formatNumber } from "@/lib/format";

interface StatCardProps {
  label: string;
  value: number | undefined;
  icon: ReactNode;
  tone?: "primary" | "gold" | "error";
  to?: string;
}

/** A real count read from the API (never placeholder numbers). */
export function StatCard({ label, value, icon, tone = "primary", to }: StatCardProps) {
  const content = (
    <Box sx={{ p: 2.5, display: "flex", alignItems: "center", gap: 2 }}>
      <Box
        aria-hidden="true"
        sx={{
          width: 48,
          height: 48,
          borderRadius: 1,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          bgcolor: tone === "gold" ? "gold.soft" : tone === "error" ? "tone.errorSoft" : "sage.soft",
          color: tone === "gold" ? "gold.text" : tone === "error" ? "error.main" : "primary.main",
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h4" component="p" sx={{ lineHeight: 1.2 }}>
          {value === undefined ? <Skeleton width={40} /> : formatNumber(value)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Box>
    </Box>
  );
  return (
    <Card sx={{ height: "100%" }}>
      {to ? (
        <CardActionArea component={RouterLink} to={to} sx={{ height: "100%" }}>
          {content}
        </CardActionArea>
      ) : (
        content
      )}
    </Card>
  );
}
