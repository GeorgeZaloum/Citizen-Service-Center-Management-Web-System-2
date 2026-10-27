import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import AccountBalanceRounded from "@mui/icons-material/AccountBalanceRounded";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import BadgeRounded from "@mui/icons-material/BadgeRounded";
import DirectionsCarRounded from "@mui/icons-material/DirectionsCarRounded";
import FactCheckRounded from "@mui/icons-material/FactCheckRounded";
import HowToRegRounded from "@mui/icons-material/HowToRegRounded";
import LocationOnRounded from "@mui/icons-material/LocationOnRounded";
import PhoneRounded from "@mui/icons-material/PhoneRounded";
import PostAddRounded from "@mui/icons-material/PostAddRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid2";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

import { DamascenePattern } from "@/components/common/DamascenePattern";
import { LtrText } from "@/components/common/LtrText";
import { homeFor, useCurrentUser } from "@/features/auth";
import { useCenterSettings } from "@/features/center-settings/hooks";
import { errorMessage } from "@/lib/error-messages";
import { formatTime } from "@/lib/format";

import { AuthDialogs, type AuthMode } from "./AuthDialogs";

const STEP_ICONS = [<HowToRegRounded key="1" />, <PostAddRounded key="2" />, <FactCheckRounded key="3" />];
const DEPARTMENT_ICONS = [
  <AccountBalanceRounded key="1" />,
  <DirectionsCarRounded key="2" />,
  <BadgeRounded key="3" />,
];

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
      <Box sx={{ color: "gold.text", mt: 0.25 }} aria-hidden="true">
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography fontWeight={600} sx={{ overflowWrap: "anywhere" }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

/** Center information from GET /center-settings/ (UC-19 shows it to visitors). */
function CenterInfoCard() {
  const { t } = useTranslation("ui");
  const { data, isPending, isError, error } = useCenterSettings();
  return (
    <Card sx={{ position: "relative", overflow: "hidden", boxShadow: (theme) => theme.customShadows.raised }}>
      <Box sx={{ height: 6, bgcolor: "primary.main" }} />
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Typography variant="overline" sx={{ color: "gold.text", fontWeight: 700, letterSpacing: 0 }}>
          {t("landing.centerInfo")}
        </Typography>
        {isError ? (
          <Alert severity="warning" sx={{ mt: 1 }}>
            {errorMessage(error)}
          </Alert>
        ) : isPending ? (
          <Stack spacing={1.5} sx={{ mt: 1 }} aria-label={t("landing.loadingCenter")}>
            <Skeleton width="70%" height={32} />
            <Skeleton width="90%" />
            <Skeleton width="60%" />
            <Skeleton width="50%" />
          </Stack>
        ) : (
          <>
            <Typography variant="h4" component="h2" sx={{ mt: 0.5, mb: 2.5 }}>
              {data.name}
            </Typography>
            <Stack spacing={2}>
              <InfoRow icon={<LocationOnRounded />} label={t("landing.address")} value={data.address} />
              <InfoRow
                icon={<PhoneRounded />}
                label={t("landing.phones")}
                value={<LtrText>{data.contact_phones}</LtrText>}
              />
              <InfoRow
                icon={<AccessTimeRounded />}
                label={t("landing.hours")}
                value={
                  <>
                    {t("landing.hoursValue", {
                      start: formatTime(data.work_start),
                      end: formatTime(data.work_end),
                    })}
                  </>
                }
              />
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function LandingPage({ authMode = null }: { authMode?: AuthMode | null }) {
  const { t } = useTranslation("ui");
  const { t: tc } = useTranslation();
  const user = useCurrentUser();
  const steps = t("landing.steps", { returnObjects: true }) as { title: string; body: string }[];
  const departments = t("landing.departments", { returnObjects: true }) as { name: string; body: string }[];

  const actions = user ? (
    <Button
      variant="contained"
      size="large"
      component={RouterLink}
      to={homeFor(user)}
      endIcon={<ArrowBackRounded />}
    >
      {tc("nav.home")}
    </Button>
  ) : (
    <>
      <Button variant="contained" size="large" component={RouterLink} to="/register">
        {tc("actions.register")}
      </Button>
      <Button variant="outlined" size="large" component={RouterLink} to="/login">
        {tc("actions.login")}
      </Button>
    </>
  );

  return (
    <>
      {/* Hero */}
      <Box
        component="section"
        sx={(theme) => ({
          position: "relative",
          overflow: "hidden",
          py: { xs: 6, md: 10 },
          background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${theme.palette.background.default} 100%)`,
        })}
      >
        <DamascenePattern opacity={0.05} />
        <Container maxWidth="lg" sx={{ position: "relative" }}>
          <Grid container spacing={{ xs: 5, md: 8 }} alignItems="center">
            <Grid size={{ xs: 12, md: 7 }}>
              <Chip
                label={t("landing.heroBadge")}
                sx={{ mb: 2.5, bgcolor: "gold.soft", color: "gold.text", fontWeight: 600 }}
              />
              <Typography variant="h1" sx={{ fontSize: { xs: "2rem", md: "2.75rem" }, mb: 2.5 }}>
                {t("landing.heroTitle")}
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: { md: "1.125rem" }, mb: 4, maxWidth: 600 }}>
                {t("landing.heroBody")}
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                {actions}
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <CenterInfoCard />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* How it works */}
      <Container component="section" maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }} aria-labelledby="how-title">
        <Typography
          id="how-title"
          variant="h2"
          sx={{ fontSize: { xs: "1.6rem", md: "2rem" }, mb: 4, textAlign: "center" }}
        >
          {t("landing.howTitle")}
        </Typography>
        <Grid container spacing={3}>
          {steps.map((step, index) => (
            <Grid key={step.title} size={{ xs: 12, md: 4 }}>
              <Card sx={{ height: "100%" }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 1,
                        display: "grid",
                        placeItems: "center",
                        bgcolor: "sage.soft",
                        color: "primary.main",
                      }}
                      aria-hidden="true"
                    >
                      {STEP_ICONS[index]}
                    </Box>
                    <Typography sx={{ color: "gold.text", fontWeight: 700 }}>{index + 1}</Typography>
                  </Box>
                  <Typography variant="h5" component="h3" sx={{ mb: 1 }}>
                    {step.title}
                  </Typography>
                  <Typography color="text.secondary">{step.body}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Departments (static until the service catalog of Sprint 2) */}
      <Box component="section" sx={{ bgcolor: "background.paper", borderBlock: 1, borderColor: "divider" }}>
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
          <Typography
            variant="h2"
            sx={{ fontSize: { xs: "1.6rem", md: "2rem" }, mb: 1, textAlign: "center" }}
          >
            {t("landing.departmentsTitle")}
          </Typography>
          <Typography color="text.secondary" sx={{ textAlign: "center", mb: 4 }}>
            {t("landing.departmentsNote")}
          </Typography>
          <Grid container spacing={3}>
            {departments.map((department, index) => (
              <Grid key={department.name} size={{ xs: 12, sm: 6, md: 4 }}>
                <Box
                  sx={{
                    p: 3,
                    height: "100%",
                    borderRadius: 1,
                    border: 1,
                    borderColor: "divider",
                    bgcolor: "background.default",
                    display: "flex",
                    gap: 2,
                  }}
                >
                  <Box sx={{ color: "primary.main" }} aria-hidden="true">
                    {DEPARTMENT_ICONS[index]}
                  </Box>
                  <Box>
                    <Typography variant="h5" component="h3" sx={{ mb: 0.5 }}>
                      {department.name}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      {department.body}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Call to action */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            borderRadius: "20px",
            p: { xs: 3, md: 5 },
            bgcolor: "primary.main",
            color: "primary.contrastText",
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { md: "center" },
            justifyContent: "space-between",
            gap: 3,
          }}
        >
          <DamascenePattern opacity={0.08} sx={{ filter: "brightness(3)" }} />
          <Box sx={{ position: "relative" }}>
            <Typography variant="h3" component="h2" sx={{ color: "inherit", mb: 1 }}>
              {t("landing.ctaTitle")}
            </Typography>
            <Typography sx={{ opacity: 0.9 }}>{t("landing.ctaBody")}</Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ position: "relative" }}>
            {user ? (
              <Button
                variant="contained"
                color="inherit"
                component={RouterLink}
                to={homeFor(user)}
                sx={{ color: "primary.main" }}
              >
                {tc("nav.home")}
              </Button>
            ) : (
              <>
                <Button
                  variant="contained"
                  component={RouterLink}
                  to="/register"
                  sx={{
                    bgcolor: "background.paper",
                    color: "primary.main",
                    "&:hover": { bgcolor: "gold.soft" },
                  }}
                >
                  {tc("actions.register")}
                </Button>
                <Button
                  variant="outlined"
                  component={RouterLink}
                  to="/login"
                  sx={{ color: "inherit", borderColor: "currentColor" }}
                >
                  {tc("actions.login")}
                </Button>
              </>
            )}
          </Stack>
        </Box>
      </Container>

      <AuthDialogs mode={user ? null : authMode} />
    </>
  );
}
