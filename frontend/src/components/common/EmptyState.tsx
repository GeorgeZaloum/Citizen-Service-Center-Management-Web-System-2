import InboxRounded from "@mui/icons-material/InboxRounded";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <Box sx={{ textAlign: "center", py: 6, px: 2, maxWidth: 460, mx: "auto" }}>
      <Box
        aria-hidden="true"
        sx={{
          width: 64,
          height: 64,
          mx: "auto",
          mb: 2,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          bgcolor: "sage.soft",
          color: "primary.main",
        }}
      >
        {icon ?? <InboxRounded fontSize="large" />}
      </Box>
      <Typography variant="h5" component="h2" gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography color="text.secondary" sx={{ mb: action ? 3 : 0 }}>
          {description}
        </Typography>
      )}
      {action}
    </Box>
  );
}
