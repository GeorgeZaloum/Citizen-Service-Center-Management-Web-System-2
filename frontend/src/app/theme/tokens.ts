// Design tokens of the "New Syria" identity. The colors are inspired by the national visual
// identity (July 2025) and the independence flag; they are not official values. To adopt an
// official brand guide, change the values here only: the theme and every component read them.
// Contrast ratios are measured against `background.default` (WCAG AA needs 4.5:1 for text).

export const palette = {
  light: {
    primary: { main: "#0B5D3B", light: "#2E7D57", dark: "#073F28", contrastText: "#FFFFFF" }, // 7.4:1
    gold: { main: "#B8913A", text: "#8C6B23", soft: "#F6EBD3", contrastText: "#2E230B" }, // main: decoration only (2.7:1); text: 4.7:1
    sage: { main: "#4A7A60", soft: "#E3EDE6", contrastText: "#FFFFFF" }, // main: 4.9:1
    error: { main: "#C8102E", soft: "#FBE5E8", dark: "#9E0C24", contrastText: "#FFFFFF" }, // 5.9:1
    warning: { main: "#8C6B23", soft: "#F6EBD3", dark: "#6E5219", contrastText: "#FFFFFF" },
    info: { main: "#1F5F8B", soft: "#E3EEF6", dark: "#174766", contrastText: "#FFFFFF" },
    neutral: { soft: "#ECEAE4", text: "#4A4F4B" },
    background: { default: "#F8F6F0", paper: "#FFFFFF" },
    text: { primary: "#1F2421", secondary: "#5B635E", disabled: "#9AA09C" },
    divider: "#E4E0D5",
    inputBorder: "#CFCABD",
  },
  dark: {
    primary: { main: "#4FB286", light: "#7CCBA6", dark: "#2E8A62", contrastText: "#0B1A12" },
    gold: { main: "#D4B062", text: "#D4B062", soft: "#3A2F17", contrastText: "#1A1408" },
    sage: { main: "#8FC0A4", soft: "#1E3328", contrastText: "#0B1A12" },
    error: { main: "#FF6B7A", soft: "#3D1A1F", dark: "#FF9AA5", contrastText: "#1A0508" },
    warning: { main: "#D4B062", soft: "#3A2F17", dark: "#E7CB8C", contrastText: "#1A1408" },
    info: { main: "#7DB8E0", soft: "#16293A", dark: "#A9D0EC", contrastText: "#06131D" },
    neutral: { soft: "#262C28", text: "#B9BFBA" },
    background: { default: "#0F1411", paper: "#161C18" },
    text: { primary: "#ECE9E1", secondary: "#A9B0AB", disabled: "#6B726D" },
    divider: "#2A322D",
    inputBorder: "#3A433D",
  },
} as const;

export type ColorMode = keyof typeof palette;

export const typography = {
  headingFont: '"Alexandria", "IBM Plex Sans Arabic", system-ui, sans-serif',
  bodyFont: '"IBM Plex Sans Arabic", system-ui, "Segoe UI", Tahoma, sans-serif',
} as const;

export const shape = {
  radius: 12,
  radiusSmall: 8,
  radiusPill: 999,
} as const;

export const shadows = {
  soft: "0 1px 2px rgba(31, 36, 33, 0.06), 0 4px 16px rgba(31, 36, 33, 0.06)",
  raised: "0 2px 4px rgba(31, 36, 33, 0.06), 0 12px 32px rgba(31, 36, 33, 0.10)",
} as const;

export const motion = {
  durationShort: 150,
  durationBase: 250,
  easing: "cubic-bezier(0.2, 0, 0, 1)",
} as const;

export const layout = {
  sidebarWidth: 264,
  sidebarCollapsedWidth: 76,
  topBarHeight: 64,
  bottomNavHeight: 64,
  contentMaxWidth: 1200,
} as const;
