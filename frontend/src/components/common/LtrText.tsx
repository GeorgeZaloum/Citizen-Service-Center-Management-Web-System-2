import Box from "@mui/material/Box";
import type { ReactNode } from "react";

/**
 * Phone numbers, national IDs, emails and codes inside Arabic text: kept left-to-right with
 * Latin digits. The `dir` attribute is used on purpose: the RTL style plugin would flip a CSS
 * `direction: ltr` into `rtl`.
 */
export function LtrText({ children }: { children: ReactNode }) {
  return (
    <Box component="bdi" dir="ltr" sx={{ unicodeBidi: "isolate", fontVariantNumeric: "tabular-nums" }}>
      {children}
    </Box>
  );
}
