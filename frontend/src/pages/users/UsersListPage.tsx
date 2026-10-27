import PersonAddRounded from "@mui/icons-material/PersonAddRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";

import type { AccountStatus, Role, User, UserListParams } from "@/api/contracts";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { LtrText } from "@/components/common/LtrText";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusChip } from "@/components/common/StatusChip";
import { useCurrentUser } from "@/features/auth";
import { useDepartments } from "@/features/departments/hooks";
import { useUsers } from "@/features/users/hooks";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDate } from "@/lib/format";

import { USERS_BASE, type ManagerScope } from "./scope";

const ROLES: Role[] = ["CITIZEN", "EMPLOYEE", "DEPT_MANAGER", "SYSTEM_ADMIN"];
const STATUSES: AccountStatus[] = ["ACTIVE", "DISABLED"];

/** UC-18: the accounts within the manager's scope, with search, filters and pages kept in the URL. */
export default function UsersListPage({ scope }: { scope: ManagerScope }) {
  const { t } = useTranslation("ui");
  const { t: tc } = useTranslation();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const admin = scope === "admin";

  const [search, setSearch] = useState(params.get("search") ?? "");
  const debouncedSearch = useDebounce(search.trim());
  const query: UserListParams = {
    search: debouncedSearch || undefined,
    role: admin ? (params.get("role") as Role) || undefined : undefined,
    status: (params.get("status") as AccountStatus) || undefined,
    department_id: admin ? Number(params.get("department_id")) || undefined : undefined,
    page: Number(params.get("page")) || 1,
    page_size: Number(params.get("page_size")) || 20,
  };
  const users = useUsers(query);
  const departments = useDepartments({ page_size: 100 }, admin);

  const update = (changes: Record<string, string | number | undefined>, resetPage = true) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === "") next.delete(key);
      else next.set(key, String(value));
    }
    if (resetPage) next.delete("page");
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if ((params.get("search") ?? "") !== debouncedSearch) update({ search: debouncedSearch });
    // Only the debounced search drives the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const filtersActive = !!(
    search ||
    params.get("role") ||
    params.get("status") ||
    params.get("department_id")
  );

  const columns: Column<User>[] = [
    {
      key: "name",
      header: t("fields.full_name"),
      render: (row) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={600}>
            {row.full_name}
            {row.id === user?.id && (
              <Typography component="span" variant="caption" color="text.secondary">
                {" "}
                ({t("users.you")})
              </Typography>
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <LtrText>{row.email}</LtrText>
          </Typography>
        </Box>
      ),
    },
    ...(admin
      ? [
          { key: "role", header: t("fields.role"), render: (row: User) => tc(`roles.${row.role}`) },
          {
            key: "department",
            header: t("fields.department"),
            hideOnMobile: true,
            render: (row: User) => row.department?.name ?? "—",
          },
        ]
      : [
          {
            key: "job",
            header: t("fields.job_title"),
            hideOnMobile: true,
            render: (row: User) => row.job_title ?? "—",
          },
        ]),
    {
      key: "status",
      header: t("fields.status"),
      render: (row) => <StatusChip kind="account" status={row.status ?? "ACTIVE"} />,
    },
    {
      key: "created",
      header: t("fields.created_at"),
      hideOnMobile: true,
      render: (row) => formatDate(row.created_at),
    },
  ];

  const title = admin ? t("users.adminListTitle") : t("users.managerListTitle");
  const empty = filtersActive ? (
    <EmptyState
      title={t("users.emptyTitle")}
      description={t("users.emptyBody")}
      action={
        <Button
          variant="outlined"
          onClick={() => {
            setSearch("");
            setParams(new URLSearchParams(), { replace: true });
          }}
        >
          {tc("actions.clearFilters")}
        </Button>
      }
    />
  ) : (
    <EmptyState title={t("users.emptyEmployees")} description={t("users.emptyEmployeesBody")} />
  );

  return (
    <>
      <PageHeader
        title={title}
        description={
          admin
            ? t("users.adminListSubtitle")
            : t("users.managerListSubtitle", { department: user?.department?.name ?? "" })
        }
        actions={
          <Button
            variant="contained"
            startIcon={<PersonAddRounded />}
            component={RouterLink}
            to={admin ? "/admin/users/new-manager" : "/manager/employees/new"}
          >
            {admin ? t("users.addManager") : t("users.addEmployee")}
          </Button>
        }
      />
      <DataTable
        caption={title}
        columns={columns}
        rows={users.data?.items}
        getRowId={(row) => row.id}
        loading={users.isPending}
        error={users.isError ? users.error : undefined}
        onRetry={() => void users.refetch()}
        empty={empty}
        pagination={users.data?.pagination}
        onPageChange={(page) => update({ page }, false)}
        onPageSizeChange={(pageSize) => update({ page_size: pageSize })}
        onRowClick={(row) => navigate(`${USERS_BASE[scope]}/${row.id}`)}
        toolbar={
          <Box
            sx={{
              display: "grid",
              gap: 1.5,
              gridTemplateColumns: { xs: "1fr", md: admin ? "2fr 1fr 1fr 1fr" : "3fr 1fr" },
            }}
          >
            <TextField
              size="small"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("placeholders.search")}
              slotProps={{
                htmlInput: { "aria-label": tc("actions.search") },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRounded fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            {admin && (
              <TextField
                select
                size="small"
                label={t("fields.role")}
                value={params.get("role") ?? ""}
                onChange={(event) => update({ role: event.target.value })}
              >
                <MenuItem value="">{t("users.allRoles")}</MenuItem>
                {ROLES.map((role) => (
                  <MenuItem key={role} value={role}>
                    {tc(`roles.${role}`)}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              select
              size="small"
              label={t("fields.status")}
              value={params.get("status") ?? ""}
              onChange={(event) => update({ status: event.target.value })}
            >
              <MenuItem value="">{t("users.allStatuses")}</MenuItem>
              {STATUSES.map((status) => (
                <MenuItem key={status} value={status}>
                  {tc(`accountStatus.${status}`)}
                </MenuItem>
              ))}
            </TextField>
            {admin && (
              <TextField
                select
                size="small"
                label={t("fields.department")}
                value={params.get("department_id") ?? ""}
                onChange={(event) => update({ department_id: event.target.value })}
              >
                <MenuItem value="">{t("users.allDepartments")}</MenuItem>
                {departments.data?.items.map((department) => (
                  <MenuItem key={department.id} value={String(department.id)}>
                    {department.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Box>
        }
      />
    </>
  );
}
