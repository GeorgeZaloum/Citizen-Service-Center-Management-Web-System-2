import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

export interface InfoItem {
  label: string;
  value: ReactNode;
}

/** Read-only label/value pairs (fixed profile fields, account and department details). */
export function InfoList({ items, columns = 2 }: { items: InfoItem[]; columns?: 1 | 2 | 3 }) {
  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: `repeat(${columns}, minmax(0, 1fr))` },
        columnGap: 3,
        rowGap: 2,
      }}
    >
      {items.map((item) => (
        <Box key={item.label} sx={{ minWidth: 0 }}>
          <Typography component="dt" variant="body2" color="text.secondary" sx={{ mb: 0.25 }}>
            {item.label}
          </Typography>
          <Typography component="dd" sx={{ m: 0, fontWeight: 500, overflowWrap: "anywhere" }}>
            {item.value ?? "—"}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
