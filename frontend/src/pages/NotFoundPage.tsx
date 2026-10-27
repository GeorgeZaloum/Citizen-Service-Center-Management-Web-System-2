import SearchOffRounded from "@mui/icons-material/SearchOffRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

import { EmptyState } from "@/components/common/EmptyState";

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <Box sx={{ minHeight: "60vh", display: "grid", placeItems: "center", px: 2 }}>
      <EmptyState
        icon={<SearchOffRounded fontSize="large" />}
        title={t("states.notFoundTitle")}
        description={t("states.notFoundBody")}
        action={
          <Button variant="contained" component={RouterLink} to="/">
            {t("actions.goHome")}
          </Button>
        }
      />
    </Box>
  );
}
