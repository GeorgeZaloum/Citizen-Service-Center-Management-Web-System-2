import ApartmentRounded from "@mui/icons-material/ApartmentRounded";
import GroupsRounded from "@mui/icons-material/GroupsRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";
import ReportProblemRounded from "@mui/icons-material/ReportProblemRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid2";
import Link from "@mui/material/Link";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

import { StatCard } from "@/components/common/StatCard";
import { WelcomeBanner } from "@/components/common/WelcomeBanner";
import { useDepartments } from "@/features/departments/hooks";
import { useUsers } from "@/features/users/hooks";

/** System Administrator home: counts read from the lists, and the departments without a manager. */
export default function AdminHomePage() {
  const { t } = useTranslation("ui");
  const departments = useDepartments({ page_size: 100 });
  const users = useUsers({ page_size: 1 });
  const citizens = useUsers({ role: "CITIZEN", page_size: 1 });
  const withoutManager = departments.data?.items.filter((department) => !department.has_managers);

  return (
    <>
      <WelcomeBanner
        body={t("home.adminBody")}
        actions={
          <>
            <Button
              variant="contained"
              component={RouterLink}
              to="/admin/departments/new"
              sx={{ bgcolor: "background.paper", color: "primary.main", "&:hover": { bgcolor: "gold.soft" } }}
            >
              {t("departments.add")}
            </Button>
            <Button
              variant="outlined"
              component={RouterLink}
              to="/admin/users/new-manager"
              sx={{ color: "inherit", borderColor: "currentColor" }}
            >
              {t("users.addManager")}
            </Button>
          </>
        }
      />
      {!!withoutManager?.length && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {t("home.noManagerAlert")}
          {withoutManager.map((department, index) => (
            <Fragment key={department.id}>
              {index > 0 && "، "}
              <Link component={RouterLink} to={`/admin/departments/${department.id}`} fontWeight={600}>
                {department.name}
              </Link>
            </Fragment>
          ))}
        </Alert>
      )}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label={t("home.stats.departments")}
            value={departments.data?.pagination.total_items}
            icon={<ApartmentRounded />}
            to="/admin/departments"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label={t("home.stats.departmentsWithoutManager")}
            value={withoutManager?.length}
            icon={<ReportProblemRounded />}
            tone="gold"
            to="/admin/departments"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label={t("home.stats.users")}
            value={users.data?.pagination.total_items}
            icon={<GroupsRounded />}
            to="/admin/users"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label={t("home.stats.citizens")}
            value={citizens.data?.pagination.total_items}
            icon={<PersonRounded />}
            to="/admin/users?role=CITIZEN"
          />
        </Grid>
      </Grid>
    </>
  );
}
