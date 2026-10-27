import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

interface LogoProps {
  size?: number;
  withText?: boolean;
  subtitle?: string;
}

/**
 * Original center mark: a simplified Damascene eight-pointed star in a green tile, with three
 * gold stars above it (the three stars of the independence flag). It is not the state emblem.
 */
export function LogoMark({ size = 40 }: { size?: number }) {
  const theme = useTheme();
  const green = theme.palette.mode === "light" ? theme.palette.primary.main : theme.palette.primary.dark;
  const gold = theme.palette.gold.main;
  return (
    <Box
      component="svg"
      viewBox="0 0 56 56"
      width={size}
      height={size}
      aria-hidden="true"
      sx={{ flexShrink: 0 }}
    >
      <rect x="2" y="10" width="52" height="44" rx="12" fill={green} />
      <g fill="none" stroke="#F8F6F0" strokeWidth="2.2">
        <rect x="18" y="22" width="20" height="20" rx="2" />
        <rect x="18" y="22" width="20" height="20" rx="2" transform="rotate(45 28 32)" />
      </g>
      <circle cx="28" cy="32" r="3" fill={gold} />
      <g fill={gold}>
        <path d="M13.6 1.7l1.2 2.5 2.6.3-2 1.9.5 2.6-2.3-1.3-2.4 1.3.5-2.6-1.9-1.9 2.6-.3z" />
        <path d="M28 0l1.6 3.3 3.6.5-2.6 2.5.6 3.6L28 8.2l-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" />
        <path d="M42.4 1.7l1.2 2.5 2.6.3-1.9 1.9.5 2.6-2.4-1.3-2.3 1.3.5-2.6-2-1.9 2.6-.3z" />
      </g>
    </Box>
  );
}

export function Logo({ size = 40, withText = true, subtitle }: LogoProps) {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
      <LogoMark size={size} />
      {withText && (
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="span"
            sx={{
              display: "block",
              fontFamily: (theme) => theme.typography.h1.fontFamily,
              fontWeight: 700,
              fontSize: size > 44 ? "1.25rem" : "0.95rem",
              color: "primary.main",
              lineHeight: 1.3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {t("app.name")}
          </Typography>
          {subtitle && (
            <Typography component="span" variant="caption" sx={{ display: "block", color: "text.secondary" }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
