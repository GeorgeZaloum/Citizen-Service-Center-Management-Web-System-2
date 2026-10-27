import ArchiveRounded from "@mui/icons-material/ArchiveRounded";
import DeleteRounded from "@mui/icons-material/DeleteRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import PauseCircleRounded from "@mui/icons-material/PauseCircleRounded";
import PersonAddRounded from "@mui/icons-material/PersonAddRounded";
import PersonRemoveRounded from "@mui/icons-material/PersonRemoveRounded";
import PlayCircleRounded from "@mui/icons-material/PlayCircleRounded";
import SearchOffRounded from "@mui/icons-material/SearchOffRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid2";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Skeleton from "@mui/material/Skeleton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useParams } from "react-router-dom";

import type { DepartmentAction, Member } from "@/api/contracts";
import { ApiError } from "@/api/errors";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { InfoList } from "@/components/common/InfoList";
import { LtrText } from "@/components/common/LtrText";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusChip } from "@/components/common/StatusChip";
import { useDepartment } from "@/features/departments/hooks";
import { formatDate, formatNumber } from "@/lib/format";

import {
  ArchiveDepartmentDialog,
  DeleteDepartmentDialog,
  DepartmentStatusDialog,
  EditDepartmentDialog,
  RemoveManagerDialog,
} from "./DepartmentDialogs";

type OpenDialog = "edit" | "status" | "delete" | "archive" | null;

const ACTION_ICONS: Partial<Record<DepartmentAction, ReactNode>> = {
  EDIT: <EditRounded />,
  SUSPEND: <PauseCircleRounded />,
  ACTIVATE: <PlayCircleRounded />,
  ADD_MANAGER: <PersonAddRounded />,
  DELETE: <DeleteRounded />,
  ARCHIVE: <ArchiveRounded />,
};

function MemberList({
  members,
  empty,
  onRemove,
}: {
  members: Member[];
  empty: string;
  onRemove?: (member: Member) => void;
}) {
  const { t } = useTranslation("ui");
  if (!members.length) {
    return (
      <Typography color="text.secondary" sx={{ py: 1 }}>
        {empty}
      </Typography>
    );
  }
  return (
    <List disablePadding>
      {members.map((member) => (
        <ListItem
          key={member.id}
          divider
          disableGutters
          secondaryAction={
            onRemove && (
              <Tooltip title={t("departments.actions.REMOVE_MANAGER")}>
                <IconButton
                  edge="end"
                  aria-label={`${t("departments.actions.REMOVE_MANAGER")}: ${member.full_name}`}
                  onClick={() => onRemove(member)}
                >
                  <PersonRemoveRounded color="error" />
                </IconButton>
              </Tooltip>
            )
          }
        >
          <ListItemText
            primary={
              <Link component={RouterLink} to={`/admin/users/${member.id}`} fontWeight={600}>
                {member.full_name}
              </Link>
            }
            secondary={<LtrText>{member.email}</LtrText>}
          />
          {member.status === "DISABLED" && <StatusChip kind="account" status="DISABLED" sx={{ mx: 1 }} />}
        </ListItem>
      ))}
    </List>
  );
}

/** UC-14 steps 3–4: the department page offers only the actions in `actions`. */
export default function DepartmentDetailPage() {
  const { t } = useTranslation("ui");
  const { t: tc } = useTranslation();
  const { departmentId } = useParams();
  const department = useDepartment(Number(departmentId));
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [removing, setRemoving] = useState<Member | null>(null);
  const crumbs = [{ label: tc("nav.departments"), to: "/admin/departments" }];

  if (department.isError) {
    const notFound = department.error instanceof ApiError && department.error.status === 404;
    return (
      <>
        <PageHeader title={t("departments.detailTitle")} breadcrumbs={crumbs} />
        <Card>
          {notFound ? (
            <EmptyState
              icon={<SearchOffRounded fontSize="large" />}
              title={t("departments.notFoundTitle")}
              description={t("departments.notFoundBody")}
              action={
                <Button variant="outlined" component={RouterLink} to="/admin/departments">
                  {t("users.backToList")}
                </Button>
              }
            />
          ) : (
            <ErrorState error={department.error} onRetry={() => void department.refetch()} />
          )}
        </Card>
      </>
    );
  }

  if (department.isPending) {
    return (
      <>
        <Skeleton width={280} height={48} sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Skeleton variant="rounded" height={220} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Skeleton variant="rounded" height={220} />
          </Grid>
        </Grid>
      </>
    );
  }

  const data = department.data;
  const actions = data.actions;
  const can = (action: DepartmentAction) => actions.includes(action);
  const open = (action: DepartmentAction) => {
    if (action === "EDIT") setDialog("edit");
    else if (action === "SUSPEND" || action === "ACTIVATE") setDialog("status");
    else if (action === "DELETE") setDialog("delete");
    else if (action === "ARCHIVE") setDialog("archive");
  };
  const buttonActions = actions.filter((action) => action !== "REMOVE_MANAGER");

  return (
    <>
      <PageHeader
        title={data.name}
        description={
          <Box
            component="span"
            sx={{ display: "inline-flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}
          >
            {data.authority}
            <StatusChip kind="department" status={data.status ?? "ACTIVE"} />
          </Box>
        }
        breadcrumbs={[...crumbs, { label: data.name }]}
        actions={buttonActions.map((action) =>
          action === "ADD_MANAGER" ? (
            <Button
              key={action}
              variant="contained"
              startIcon={ACTION_ICONS[action]}
              component={RouterLink}
              to={`/admin/users/new-manager?department=${data.id}`}
            >
              {t(`departments.actions.${action}`)}
            </Button>
          ) : (
            <Button
              key={action}
              variant="outlined"
              color={
                action === "DELETE" || action === "ARCHIVE" || action === "SUSPEND" ? "error" : "primary"
              }
              startIcon={ACTION_ICONS[action]}
              onClick={() => open(action)}
            >
              {t(`departments.actions.${action}`)}
            </Button>
          ),
        )}
      />

      {data.status === "ARCHIVED" && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {t("departments.archivedNote")}
        </Alert>
      )}
      {!data.has_managers && data.status !== "ARCHIVED" && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {t("departments.noManagerAlert")}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <InfoList
                columns={3}
                items={[
                  { label: t("departments.employeeCount"), value: formatNumber(data.employee_count) },
                  { label: t("departments.serviceCount"), value: formatNumber(data.service_count) },
                  { label: t("departments.openRequests"), value: formatNumber(data.open_request_count) },
                  { label: t("fields.created_at"), value: formatDate(data.created_at) },
                  { label: t("fields.authority"), value: data.authority },
                ]}
              />
              {data.description && (
                <Typography color="text.secondary" sx={{ mt: 2.5 }}>
                  {data.description}
                </Typography>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
                {t("departments.employees")} ({formatNumber(data.employees.length)})
              </Typography>
              <MemberList members={data.employees} empty={t("departments.noEmployeesYet")} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
                {t("departments.managers")}
              </Typography>
              <MemberList
                members={data.managers}
                empty={t("departments.noManagersYet")}
                onRemove={can("REMOVE_MANAGER") ? setRemoving : undefined}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {can("EDIT") && (
        <EditDepartmentDialog department={data} open={dialog === "edit"} onClose={() => setDialog(null)} />
      )}
      {(can("SUSPEND") || can("ACTIVATE")) && (
        <DepartmentStatusDialog
          department={data}
          open={dialog === "status"}
          onClose={() => setDialog(null)}
        />
      )}
      {can("DELETE") && (
        <DeleteDepartmentDialog
          department={data}
          open={dialog === "delete"}
          onClose={() => setDialog(null)}
        />
      )}
      {can("ARCHIVE") && (
        <ArchiveDepartmentDialog
          department={data}
          open={dialog === "archive"}
          onClose={() => setDialog(null)}
        />
      )}
      {can("REMOVE_MANAGER") && (
        <RemoveManagerDialog department={data} manager={removing} onClose={() => setRemoving(null)} />
      )}
    </>
  );
}
