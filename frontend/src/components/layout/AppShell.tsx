import MenuRounded from "@mui/icons-material/MenuRounded";
import AppBar from "@mui/material/AppBar";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import { alpha, useTheme } from "@mui/material/styles";
import Toolbar from "@mui/material/Toolbar";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet, matchPath, useLocation } from "react-router-dom";

import { Logo } from "@/components/common/Logo";
import { isManager, useCurrentUser } from "@/features/auth";

import { AccountMenu } from "./AccountMenu";
import { NAVIGATION } from "./navigation";
import { Sidebar } from "./Sidebar";
import { SkipLink } from "./SkipLink";
import { ThemeToggle } from "./ThemeToggle";

const COLLAPSE_KEY = "csc.sidebar-collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

/** The signed-in frame: a sidebar for managers, a top bar and bottom navigation for the others. */
export function AppShell() {
  const { t } = useTranslation();
  const theme = useTheme();
  const user = useCurrentUser();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  if (!user) return null;

  const items = NAVIGATION[user.role];
  const manager = isManager(user);
  const activeIndex = items.findIndex((item) => matchPath({ path: item.to, end: !!item.end }, pathname));

  const toggleCollapsed = () =>
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, value ? "0" : "1");
      } catch {
        // The choice lasts for this visit only.
      }
      return !value;
    });

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <SkipLink />
      {manager && (
        <Sidebar
          items={items}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
      )}

      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={{
            bgcolor: alpha(theme.palette.background.paper, 0.92),
            backdropFilter: "blur(8px)",
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Toolbar sx={{ minHeight: theme.layout.topBarHeight, gap: 1 }}>
            {manager && (
              <IconButton
                edge="start"
                onClick={() => setMobileOpen(true)}
                aria-label={t("actions.openMenu")}
                sx={{ display: { md: "none" } }}
              >
                <MenuRounded />
              </IconButton>
            )}
            <Box sx={{ display: manager ? { xs: "flex", md: "none" } : "flex", minWidth: 0 }}>
              <Logo size={34} withText={!manager} />
            </Box>
            {!manager && (
              <Box
                component="nav"
                aria-label={t("nav.mainNavigation")}
                sx={{ display: { xs: "none", md: "flex" }, gap: 0.5, ml: 3 }}
              >
                {items.map((item, index) => (
                  <Button
                    key={item.to}
                    component={NavLink}
                    to={item.to}
                    end={item.end}
                    color={index === activeIndex ? "primary" : "inherit"}
                    aria-current={index === activeIndex ? "page" : undefined}
                    sx={{ fontWeight: index === activeIndex ? 700 : 500 }}
                  >
                    {t(item.labelKey)}
                  </Button>
                ))}
              </Box>
            )}
            <Box sx={{ flex: 1 }} />
            <ThemeToggle />
            <AccountMenu />
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          id="main-content"
          tabIndex={-1}
          sx={{
            flex: 1,
            width: "100%",
            maxWidth: theme.layout.contentMaxWidth,
            mx: "auto",
            px: { xs: 2, sm: 3, md: 4 },
            pt: { xs: 3, md: 4 },
            pb: { xs: manager ? 4 : `${theme.layout.bottomNavHeight + 24}px`, md: 6 },
            outline: "none",
            animation: "csc-fade-in 250ms ease-out",
            "@keyframes csc-fade-in": {
              from: { opacity: 0.85, transform: "translateY(4px)" },
              to: { opacity: 1, transform: "none" },
            },
          }}
          key={pathname}
        >
          <Outlet />
        </Box>
      </Box>

      {!manager && (
        <Paper
          component="nav"
          aria-label={t("nav.mainNavigation")}
          sx={{
            display: { xs: "block", md: "none" },
            position: "fixed",
            insetInline: 0,
            bottom: 0,
            zIndex: theme.zIndex.appBar,
            borderTop: `1px solid ${theme.palette.divider}`,
            borderRadius: 0,
          }}
        >
          <BottomNavigation showLabels value={activeIndex} sx={{ height: theme.layout.bottomNavHeight }}>
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <BottomNavigationAction
                  key={item.to}
                  component={NavLink}
                  to={item.to}
                  label={t(item.labelKey)}
                  icon={<Icon />}
                />
              );
            })}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}
