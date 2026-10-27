import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import AssignmentRounded from "@mui/icons-material/AssignmentRounded";
import KeyRounded from "@mui/icons-material/KeyRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid2";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

import { WelcomeBanner } from "@/components/common/WelcomeBanner";
import { useCurrentUser } from "@/features/auth";

function LinkCard({ to, icon, title }: { to: string; icon: ReactNode; title: string }) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardActionArea
        component={RouterLink}
        to={to}
        sx={{ height: "100%", p: 2.5, display: "flex", gap: 2, justifyContent: "flex-start" }}
      >
        <Box sx={{ color: "primary.main", display: "flex" }} aria-hidden="true">
          {icon}
        </Box>
        <Typography fontWeight={600} sx={{ flex: 1 }}>
          {title}
        </Typography>
        <ArrowBackRounded fontSize="small" color="action" aria-hidden="true" />
      </CardActionArea>
    </Card>
  );
}

/** Home of the Citizen and the Employee: requests arrive in the next sprints, so no numbers here. */
export default function MemberHomePage() {
  const { t } = useTranslation("ui");
  const { t: tc } = useTranslation();
  const user = useCurrentUser();
  if (!user) return null;
  const citizen = user.role === "CITIZEN";

  return (
    <>
      <WelcomeBanner
        body={
          citizen
            ? t("home.citizenBody")
            : t("home.employeeBody", { department: user.department?.name ?? "" })
        }
      />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: "100%", borderStyle: "dashed" }}>
            <CardContent sx={{ p: 3, display: "flex", gap: 2.5, alignItems: "flex-start" }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 1,
                  bgcolor: "gold.soft",
                  color: "gold.text",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                <AssignmentRounded />
              </Box>
              <Box>
                <Typography variant="h5" component="h2" sx={{ mb: 0.75 }}>
                  {t("home.requestsSoonTitle")}
                </Typography>
                <Typography color="text.secondary">
                  {citizen ? t("home.requestsSoonCitizen") : t("home.requestsSoonEmployee")}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
            {t("home.myAccount")}
          </Typography>
          <Box sx={{ display: "grid", gap: 1.5 }}>
            <LinkCard to="/account/profile" icon={<PersonRounded />} title={tc("nav.profile")} />
            <LinkCard to="/account/password" icon={<KeyRounded />} title={t("account.passwordTitle")} />
          </Box>
        </Grid>
      </Grid>
    </>
  );
}
