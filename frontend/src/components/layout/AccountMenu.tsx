import KeyRounded from "@mui/icons-material/KeyRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { useCurrentUser, useLogout } from "@/features/auth";
import { initials } from "@/lib/format";

/** UC-06 "Log out" lives here, with the profile (UC-08) and password (UC-07) pages. */
export function AccountMenu() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  if (!user) return null;

  const go = (path: string) => {
    setAnchor(null);
    navigate(path);
  };

  return (
    <>
      <ButtonBase
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={anchor ? "true" : undefined}
        aria-controls={anchor ? menuId : undefined}
        aria-label={t("nav.account")}
        sx={{ borderRadius: 1, p: 0.5, gap: 1, display: "flex", alignItems: "center" }}
      >
        <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main", fontSize: "0.9rem" }}>
          {initials(user.full_name)}
        </Avatar>
        <Box sx={{ display: { xs: "none", sm: "block" }, textAlign: "start", maxWidth: 180 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {user.full_name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {t(`roles.${user.role}`)}
            {user.department ? ` · ${user.department.name}` : ""}
          </Typography>
        </Box>
      </ButtonBase>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{ paper: { sx: { minWidth: 220, mt: 1 } } }}
      >
        <MenuItem onClick={() => go("/account/profile")}>
          <ListItemIcon>
            <PersonRounded fontSize="small" />
          </ListItemIcon>
          {t("nav.profile")}
        </MenuItem>
        <MenuItem onClick={() => go("/account/password")}>
          <ListItemIcon>
            <KeyRounded fontSize="small" />
          </ListItemIcon>
          {t("nav.password")}
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null);
            logout.mutate();
          }}
          disabled={logout.isPending}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <LogoutRounded fontSize="small" />
          </ListItemIcon>
          {t("actions.logout")}
        </MenuItem>
      </Menu>
    </>
  );
}
