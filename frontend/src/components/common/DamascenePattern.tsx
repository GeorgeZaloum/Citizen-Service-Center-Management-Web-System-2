import Box, { type BoxProps } from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";

/** Tile of the simplified Damascene pattern: an eight-pointed star made of two squares. */
function tile(color: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 72 72'><g fill='none' stroke='${color}' stroke-width='1.2'><rect x='22' y='22' width='28' height='28'/><rect x='22' y='22' width='28' height='28' transform='rotate(45 36 36)'/><circle cx='36' cy='36' r='5'/><path d='M0 0l10 10M72 0L62 10M0 72l10-10M72 72L62 62'/></g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Decorative background for the landing and sign-in pages only, at very low opacity. */
export function DamascenePattern({ opacity = 0.06, sx, ...props }: BoxProps & { opacity?: number }) {
  const theme = useTheme();
  const color = theme.palette.mode === "light" ? theme.palette.primary.main : theme.palette.gold.main;
  return (
    <Box
      aria-hidden="true"
      {...props}
      sx={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        backgroundImage: tile(color),
        backgroundSize: "72px 72px",
        opacity,
        ...sx,
      }}
    />
  );
}
