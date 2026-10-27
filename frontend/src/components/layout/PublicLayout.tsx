import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Link from "@mui/material/Link";
import { alpha, useTheme } from "@mui/material/styles";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, Outlet, useLocation } from "react-router-dom";

import { Logo } from "@/components/common/Logo";
import { homeFor, useAuthStore } from "@/features/auth";

import { SkipLink } from "./SkipLink";
import { ThemeToggle } from "./ThemeToggle";

/** Frame of the public pages: landing, login, registration, forgotten password. */
export function PublicLayout() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { pathname } = useLocation();
  const user = useAuthStore((state) => state.user);

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
      <SkipLink />
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{
          bgcolor: alpha(theme.palette.background.default, 0.9),
          backdropFilter: "blur(8px)",
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ minHeight: theme.layout.topBarHeight, gap: 1 }}>
            <Link
              component={RouterLink}
              to="/"
              underline="none"
              aria-label={t("nav.home")}
              sx={{ minWidth: 0 }}
            >
              <Logo size={36} />
            </Link>
            <Box sx={{ flex: 1 }} />
            <ThemeToggle />
            {user ? (
              <Button variant="contained" component={RouterLink} to={homeFor(user)}>
                {t("nav.home")}
              </Button>
            ) : (
              <>
                {pathname !== "/login" && (
                  <Button
                    component={RouterLink}
                    to="/login"
                    sx={{ display: { xs: "none", sm: "inline-flex" } }}
                  >
                    {t("actions.login")}
                  </Button>
                )}
                {pathname !== "/register" && (
                  <Button variant="contained" component={RouterLink} to="/register">
                    {t("actions.register")}
                  </Button>
                )}
                {pathname !== "/login" && (
                  <Button
                    component={RouterLink}
                    to="/login"
                    sx={{ display: { xs: "inline-flex", sm: "none" } }}
                  >
                    {t("actions.login")}
                  </Button>
                )}
              </>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        sx={{ flex: 1, outline: "none", position: "relative" }}
      >
        <Outlet />
      </Box>

      <Box
        component="footer"
        sx={{ borderTop: `1px solid ${theme.palette.divider}`, py: 3, bgcolor: "background.paper" }}
      >
        <Container
          maxWidth="lg"
          sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "space-between" }}
        >
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} {t("app.name")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("app.academicNote")}
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
