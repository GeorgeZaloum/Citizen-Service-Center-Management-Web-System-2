import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { alpha, useTheme } from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";
import { useTranslation } from "react-i18next";
import { NavLink, matchPath, useLocation } from "react-router-dom";

import { Logo, LogoMark } from "@/components/common/Logo";

import type { NavItem } from "./navigation";

interface SidebarProps {
  items: NavItem[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function NavList({
  items,
  collapsed,
  onNavigate,
}: {
  items: NavItem[];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  return (
    <List
      component="nav"
      aria-label={t("nav.mainNavigation")}
      sx={{ px: 1.5, py: 1, display: "grid", gap: 0.5 }}
    >
      {items.map((item) => {
        const active = !!matchPath({ path: item.to, end: !!item.end }, pathname);
        const Icon = item.icon;
        const label = t(item.labelKey);
        const button = (
          <ListItemButton
            key={item.to}
            component={NavLink}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            sx={{
              borderRadius: "10px",
              minHeight: 46,
              justifyContent: collapsed ? "center" : "flex-start",
              px: collapsed ? 1 : 1.5,
              color: active ? "primary.main" : "text.secondary",
              bgcolor: (theme) => (active ? alpha(theme.palette.primary.main, 0.1) : "transparent"),
              fontWeight: active ? 600 : 500,
              "&:hover": { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06) },
            }}
          >
            <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, color: "inherit", justifyContent: "center" }}>
              <Icon />
            </ListItemIcon>
            {!collapsed && (
              <ListItemText primary={label} primaryTypographyProps={{ fontWeight: "inherit" }} />
            )}
          </ListItemButton>
        );
        return collapsed ? (
          <Tooltip key={item.to} title={label} placement="right">
            {button}
          </Tooltip>
        ) : (
          button
        );
      })}
    </List>
  );
}

/** Managers' collapsible sidebar on desktop; a drawer on phones. */
export function Sidebar({ items, collapsed, onToggleCollapsed, mobileOpen, onMobileClose }: SidebarProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const width = collapsed ? theme.layout.sidebarCollapsedWidth : theme.layout.sidebarWidth;

  const paperSx = {
    bgcolor: "background.paper",
    borderInlineEnd: `1px solid ${theme.palette.divider}`,
    overflowX: "hidden",
  } as const;

  return (
    <>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { width: theme.layout.sidebarWidth, ...paperSx },
        }}
      >
        <Box sx={{ p: 2, height: theme.layout.topBarHeight, display: "flex", alignItems: "center" }}>
          <Logo size={36} />
        </Box>
        <Divider />
        <NavList items={items} collapsed={false} onNavigate={onMobileClose} />
      </Drawer>

      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", md: "block" },
          width,
          flexShrink: 0,
          transition: theme.transitions.create("width", { duration: theme.transitions.duration.short }),
          "& .MuiDrawer-paper": {
            width,
            ...paperSx,
            transition: theme.transitions.create("width", { duration: theme.transitions.duration.short }),
          },
        }}
      >
        <Box
          sx={{
            height: theme.layout.topBarHeight,
            px: collapsed ? 0 : 2,
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          {collapsed ? <LogoMark size={36} /> : <Logo size={36} />}
        </Box>
        <Divider />
        <NavList items={items} collapsed={collapsed} />
        <Box sx={{ mt: "auto", p: 1.5, display: "flex", justifyContent: collapsed ? "center" : "flex-end" }}>
          <Tooltip title={collapsed ? t("actions.expandSidebar") : t("actions.collapseSidebar")}>
            <IconButton
              onClick={onToggleCollapsed}
              aria-label={collapsed ? t("actions.expandSidebar") : t("actions.collapseSidebar")}
              aria-expanded={!collapsed}
            >
              {/* In RTL the sidebar sits on the right: collapsing moves its edge to the right. */}
              {collapsed ? <ChevronLeftRounded /> : <ChevronRightRounded />}
            </IconButton>
          </Tooltip>
        </Box>
      </Drawer>
    </>
  );
}
