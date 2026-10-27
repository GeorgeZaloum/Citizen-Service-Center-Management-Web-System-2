import EditRounded from "@mui/icons-material/EditRounded";
import KeyRounded from "@mui/icons-material/KeyRounded";
import LockClockRounded from "@mui/icons-material/LockClockRounded";
import PersonOffRounded from "@mui/icons-material/PersonOffRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";
import PersonSearchRounded from "@mui/icons-material/PersonSearchRounded";
import SwapHorizRounded from "@mui/icons-material/SwapHorizRounded";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid2";
import Link from "@mui/material/Link";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useParams, useSearchParams } from "react-router-dom";

import { ApiError } from "@/api/errors";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { InfoList } from "@/components/common/InfoList";
import { LtrText } from "@/components/common/LtrText";
import { PageHeader } from "@/components/common/PageHeader";
import { SecureImage } from "@/components/common/SecureImage";
import { StatusChip } from "@/components/common/StatusChip";
import { useCurrentUser } from "@/features/auth";
import { useUser } from "@/features/users/hooks";
import { formatDate, formatDateTime, initials } from "@/lib/format";

import { allowedUserActions, USERS_BASE, type ManagerScope } from "./scope";
import { EditUserDialog, ResetPasswordDialog, TransferUserDialog, UserStatusDialog } from "./UserDialogs";

type OpenDialog = "edit" | "reset" | "status" | "transfer" | null;

/** One account within the manager's scope, with the actions of UC-03, UC-15, UC-16 and UC-17. */
export default function UserDetailPage({ scope }: { scope: ManagerScope }) {
  const { t } = useTranslation("ui");
  const { t: tc } = useTranslation();
  const { userId } = useParams();
  const [params, setParams] = useSearchParams();
  const actor = useCurrentUser();
  const user = useUser(Number(userId));
  const [dialog, setDialog] = useState<OpenDialog>(params.get("action") === "transfer" ? "transfer" : null);
  const listLabel = scope === "admin" ? tc("nav.users") : tc("nav.employees");

  const closeDialog = () => {
    setDialog(null);
    if (params.has("action")) setParams({}, { replace: true });
  };

  if (user.isError) {
    // Outside the manager's scope the server answers 404: shown as "not found", nothing more.
    const notFound = user.error instanceof ApiError && user.error.status === 404;
    return (
      <>
        <PageHeader
          title={t("users.detailTitle")}
          breadcrumbs={[{ label: listLabel, to: USERS_BASE[scope] }]}
        />
        <Card>
          {notFound ? (
            <EmptyState
              icon={<PersonSearchRounded fontSize="large" />}
              title={t("users.notFoundTitle")}
              description={t("users.notFoundBody")}
              action={
                <Button variant="outlined" component={RouterLink} to={USERS_BASE[scope]}>
                  {t("users.backToList")}
                </Button>
              }
            />
          ) : (
            <ErrorState error={user.error} onRetry={() => void user.refetch()} />
          )}
        </Card>
      </>
    );
  }

  if (user.isPending || !actor) {
    return (
      <>
        <Skeleton width={260} height={48} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={260} />
      </>
    );
  }

  const target = user.data;
  const can = allowedUserActions(actor, target);
  const self = actor.id === target.id;
  const locked = target.locked_until && new Date(target.locked_until) > new Date();
  const disabled = target.status === "DISABLED";

  return (
    <>
      <PageHeader
        title={target.full_name}
        breadcrumbs={[{ label: listLabel, to: USERS_BASE[scope] }, { label: target.full_name }]}
      />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                <Avatar
                  sx={{ width: 56, height: 56, bgcolor: disabled ? "action.disabled" : "primary.main" }}
                >
                  {initials(target.full_name)}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h5" component="h2">
                    {target.full_name}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap", mt: 0.5 }}>
                    <Typography color="text.secondary">{tc(`roles.${target.role}`)}</Typography>
                    <StatusChip kind="account" status={target.status ?? "ACTIVE"} />
                    {locked && (
                      <StatusChip
                        kind="custom"
                        tone="warning"
                        icon={<LockClockRounded />}
                        label={t("users.lockedUntil", { time: formatDateTime(target.locked_until) })}
                      />
                    )}
                  </Box>
                </Box>
              </Box>
              <InfoList
                items={[
                  { label: t("fields.email"), value: <LtrText>{target.email}</LtrText> },
                  { label: t("fields.phone"), value: <LtrText>{target.phone}</LtrText> },
                  {
                    label: t("fields.department"),
                    value:
                      target.department && scope === "admin" ? (
                        <Link component={RouterLink} to={`/admin/departments/${target.department.id}`}>
                          {target.department.name}
                        </Link>
                      ) : (
                        (target.department?.name ?? "—")
                      ),
                  },
                  { label: t("fields.job_title"), value: target.job_title || "—" },
                  ...(target.national_id
                    ? [{ label: t("fields.national_id"), value: <LtrText>{target.national_id}</LtrText> }]
                    : []),
                  { label: t("fields.created_at"), value: formatDate(target.created_at) },
                ]}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
                {t("users.actions")}
              </Typography>
              {self ? (
                <Alert
                  severity="info"
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      component={RouterLink}
                      to="/account/profile"
                      startIcon={<PersonRounded />}
                    >
                      {tc("nav.profile")}
                    </Button>
                  }
                >
                  {t("users.selfNote")}
                </Alert>
              ) : (
                <Stack spacing={1.25}>
                  {can.edit && (
                    <Button variant="outlined" startIcon={<EditRounded />} onClick={() => setDialog("edit")}>
                      {t("users.edit")}
                    </Button>
                  )}
                  {can.resetPassword && (
                    <Button variant="outlined" startIcon={<KeyRounded />} onClick={() => setDialog("reset")}>
                      {t("users.resetPassword")}
                    </Button>
                  )}
                  {can.transfer && (
                    <Button
                      variant="outlined"
                      startIcon={<SwapHorizRounded />}
                      onClick={() => setDialog("transfer")}
                    >
                      {t("users.transfer")}
                    </Button>
                  )}
                  {can.setStatus && (
                    <Button
                      variant={disabled ? "contained" : "outlined"}
                      color={disabled ? "primary" : "error"}
                      startIcon={<PersonOffRounded />}
                      onClick={() => setDialog("status")}
                    >
                      {disabled ? t("users.activate") : t("users.deactivate")}
                    </Button>
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {can.identityDocuments && (
          <Grid size={12}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
                  {t("users.idCardTitle")}
                </Typography>
                <Grid container spacing={3}>
                  {(["FRONT", "BACK"] as const).map((side) => (
                    <Grid key={side} size={{ xs: 12, sm: 6, md: 4 }}>
                      <SecureImage userId={target.id} side={side} />
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {can.edit && <EditUserDialog user={target} open={dialog === "edit"} onClose={closeDialog} />}
      {can.resetPassword && (
        <ResetPasswordDialog user={target} open={dialog === "reset"} onClose={closeDialog} />
      )}
      {can.setStatus && <UserStatusDialog user={target} open={dialog === "status"} onClose={closeDialog} />}
      {can.transfer && (
        <TransferUserDialog
          user={target}
          open={dialog === "transfer"}
          onClose={closeDialog}
          initialDepartmentId={Number(params.get("department")) || undefined}
        />
      )}
    </>
  );
}
