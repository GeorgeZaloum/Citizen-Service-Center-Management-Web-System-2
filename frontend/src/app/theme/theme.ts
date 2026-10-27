import { arSD } from "@mui/material/locale";
import { alpha, createTheme, type Theme } from "@mui/material/styles";

import { layout, motion, palette, shadows, shape, typography, type ColorMode } from "./tokens";

declare module "@mui/material/styles" {
  interface Palette {
    gold: { main: string; text: string; soft: string; contrastText: string };
    sage: { main: string; soft: string; contrastText: string };
    neutral: { soft: string; text: string };
    tone: { errorSoft: string; warningSoft: string; infoSoft: string };
  }
  interface PaletteOptions {
    gold?: Palette["gold"];
    sage?: Palette["sage"];
    neutral?: Palette["neutral"];
    tone?: Palette["tone"];
  }
  interface Theme {
    layout: typeof layout;
    customShadows: typeof shadows;
  }
  interface ThemeOptions {
    layout?: typeof layout;
    customShadows?: typeof shadows;
  }
}

export function createAppTheme(mode: ColorMode = "light"): Theme {
  const colors = palette[mode];
  const headings = { fontFamily: typography.headingFont, fontWeight: 700, lineHeight: 1.35 };

  return createTheme(
    {
      direction: "rtl",
      layout,
      customShadows: shadows,
      palette: {
        mode,
        primary: colors.primary,
        secondary: { main: colors.sage.main, contrastText: colors.sage.contrastText },
        error: colors.error,
        warning: colors.warning,
        info: colors.info,
        success: { main: colors.primary.main, contrastText: colors.primary.contrastText },
        gold: colors.gold,
        sage: colors.sage,
        neutral: colors.neutral,
        tone: { errorSoft: colors.error.soft, warningSoft: colors.warning.soft, infoSoft: colors.info.soft },
        background: colors.background,
        text: colors.text,
        divider: colors.divider,
      },
      shape: { borderRadius: shape.radius },
      typography: {
        fontFamily: typography.bodyFont,
        fontSize: 15,
        h1: { ...headings, fontSize: "2.5rem" },
        h2: { ...headings, fontSize: "2rem" },
        h3: { ...headings, fontSize: "1.6rem" },
        h4: { ...headings, fontSize: "1.35rem" },
        h5: { ...headings, fontSize: "1.15rem", fontWeight: 500 },
        h6: { ...headings, fontSize: "1rem", fontWeight: 500 },
        subtitle1: { fontWeight: 500 },
        body1: { lineHeight: 1.8 },
        body2: { lineHeight: 1.7 },
        button: { fontWeight: 600, textTransform: "none" },
      },
      transitions: {
        duration: { short: motion.durationShort, standard: motion.durationBase },
        easing: { easeInOut: motion.easing, easeOut: motion.easing },
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: { backgroundColor: colors.background.default },
            "@media (prefers-reduced-motion: reduce)": {
              "*, *::before, *::after": {
                animationDuration: "0.01ms !important",
                transitionDuration: "0.01ms !important",
              },
            },
          },
        },
        MuiButton: {
          defaultProps: { disableElevation: true },
          styleOverrides: {
            root: { borderRadius: shape.radius, paddingInline: 18, minHeight: 40 },
            sizeLarge: { minHeight: 48, paddingInline: 24, fontSize: "1rem" },
          },
        },
        MuiPaper: {
          defaultProps: { elevation: 0 },
          styleOverrides: { rounded: { borderRadius: shape.radius } },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              border: `1px solid ${colors.divider}`,
              boxShadow: mode === "light" ? shadows.soft : "none",
            },
          },
        },
        MuiTextField: { defaultProps: { fullWidth: true } },
        MuiOutlinedInput: {
          styleOverrides: {
            root: { borderRadius: shape.radius, backgroundColor: colors.background.paper },
            notchedOutline: { borderColor: colors.inputBorder },
          },
        },
        MuiChip: {
          styleOverrides: { root: { borderRadius: shape.radiusPill, fontWeight: 500 } },
        },
        MuiDialog: {
          styleOverrides: { paper: { borderRadius: shape.radius + 4, boxShadow: shadows.raised } },
        },
        MuiTooltip: { defaultProps: { arrow: true } },
        MuiAlert: { styleOverrides: { root: { borderRadius: shape.radius } } },
        MuiTableCell: {
          styleOverrides: {
            head: {
              fontWeight: 600,
              color: colors.text.secondary,
              backgroundColor: alpha(colors.primary.main, 0.04),
            },
          },
        },
        MuiLink: { defaultProps: { underline: "hover" } },
      },
    },
    arSD,
  );
}
