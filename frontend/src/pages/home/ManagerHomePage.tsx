import BadgeRounded from "@mui/icons-material/BadgeRounded";
import PersonAddRounded from "@mui/icons-material/PersonAddRounded";
import PersonOffRounded from "@mui/icons-material/PersonOffRounded";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid2";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

import { StatCard } from "@/components/common/StatCard";
import { WelcomeBanner } from "@/components/common/WelcomeBanner";
import { useCurrentUser } from "@/features/auth";
import { useUsers } from "@/features/users/hooks";

/** Department Manager home: real counts of the department's employees (UC-18 within scope). */
export default function ManagerHomePage() {
  const { t } = useTranslation("ui");
  const user = useCurrentUser();
  const active = useUsers({ status: "ACTIVE", page_size: 1 });
  const disabled = useUsers({ status: "DISABLED", page_size: 1 });

  return (
    <>
      <WelcomeBanner
        body={t("home.managerBody", { department: user?.department?.name ?? "" })}
        actions={
          <Button
            variant="contained"
            component={RouterLink}
            to="/manager/employees/new"
            startIcon={<PersonAddRounded />}
            sx={{ bgcolor: "background.paper", color: "primary.main", "&:hover": { bgcolor: "gold.soft" } }}
          >
            {t("users.addEmployee")}
          </Button>
        }
      />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            label={t("home.stats.activeEmployees")}
            value={active.data?.pagination.total_items}
            icon={<BadgeRounded />}
            to="/manager/employees?status=ACTIVE"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            label={t("home.stats.disabledEmployees")}
            value={disabled.data?.pagination.total_items}
            icon={<PersonOffRounded />}
            tone="error"
            to="/manager/employees?status=DISABLED"
          />
        </Grid>
      </Grid>
    </>
  );
}
