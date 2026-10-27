import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";

export interface Crumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
}

export function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <Box component="header" sx={{ mb: { xs: 3, md: 4 } }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 1, fontSize: "0.875rem" }}>
          {breadcrumbs.map((crumb) =>
            crumb.to ? (
              <Link key={crumb.label} component={RouterLink} to={crumb.to} color="text.secondary">
                {crumb.label}
              </Link>
            ) : (
              <Typography key={crumb.label} color="text.primary" fontSize="inherit">
                {crumb.label}
              </Typography>
            ),
          )}
        </Breadcrumbs>
      )}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "flex-start" },
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h3" component="h1" sx={{ mb: description ? 0.75 : 0 }}>
            {title}
          </Typography>
          {description && (
            <Typography color="text.secondary" component="div">
              {description}
            </Typography>
          )}
        </Box>
        {actions && <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", flexShrink: 0 }}>{actions}</Box>}
      </Box>
    </Box>
  );
}
