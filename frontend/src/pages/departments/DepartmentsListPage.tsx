import AddRounded from "@mui/icons-material/AddRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";

import type { Department, DepartmentStatus } from "@/api/contracts";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusChip } from "@/components/common/StatusChip";
import { useDepartments } from "@/features/departments/hooks";
import { useDebounce } from "@/hooks/use-debounce";
import { formatNumber } from "@/lib/format";

const STATUSES: DepartmentStatus[] = ["ACTIVE", "SUSPENDED", "ARCHIVED"];

/** UC-14: departments with status filter; archived ones only when asked for. */
export default function DepartmentsListPage() {
  const { t } = useTranslation("ui");
  const { t: tc } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const debouncedSearch = useDebounce(search.trim());
  const status = (params.get("status") as DepartmentStatus) || undefined;
  const departments = useDepartments({
    status,
    search: debouncedSearch || undefined,
    page: Number(params.get("page")) || 1,
    page_size: Number(params.get("page_size")) || 20,
  });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const columns: Column<Department>[] = [
    {
      key: "name",
      header: t("fields.name"),
      render: (row) => (
        <Box>
          <Typography fontWeight={600}>{row.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {row.authority}
          </Typography>
        </Box>
      ),
    },
    {
      key: "status",
      header: t("fields.status"),
      render: (row) => <StatusChip kind="department" status={row.status ?? "ACTIVE"} />,
    },
    {
      key: "managers",
      header: t("departments.managers"),
      render: (row) =>
        row.has_managers ? (
          row.managers.map((manager) => manager.full_name).join("، ")
        ) : (
          // FR-DEP-07: the "no manager" alert.
          <StatusChip
            kind="custom"
            tone="warning"
            icon={<WarningAmberRounded />}
            label={t("departments.noManager")}
          />
        ),
    },
    {
      key: "employees",
      header: t("departments.employeeCount"),
      hideOnMobile: true,
      render: (row) => formatNumber(row.employee_count),
    },
    {
      key: "services",
      header: t("departments.serviceCount"),
      hideOnMobile: true,
      render: (row) => formatNumber(row.service_count),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("departments.listTitle")}
        description={t("departments.listSubtitle")}
        actions={
          <Button
            variant="contained"
            startIcon={<AddRounded />}
            component={RouterLink}
            to="/admin/departments/new"
          >
            {t("departments.add")}
          </Button>
        }
      />
      <DataTable
        caption={t("departments.listTitle")}
        columns={columns}
        rows={departments.data?.items}
        getRowId={(row) => row.id}
        loading={departments.isPending}
        error={departments.isError ? departments.error : undefined}
        onRetry={() => void departments.refetch()}
        empty={
          <EmptyState
            title={t("departments.emptyTitle")}
            description={t("departments.emptyBody")}
            action={
              (status || search) && (
                <Button
                  variant="outlined"
                  onClick={() => {
                    setSearch("");
                    setParams(new URLSearchParams(), { replace: true });
                  }}
                >
                  {tc("actions.clearFilters")}
                </Button>
              )
            }
          />
        }
        pagination={departments.data?.pagination}
        onPageChange={(page) => update({ page }, false)}
        onPageSizeChange={(pageSize) => update({ page_size: pageSize })}
        onRowClick={(row) => navigate(`/admin/departments/${row.id}`)}
        toolbar={
          <Box
            sx={{
              display: "flex",
              gap: 1.5,
              flexDirection: { xs: "column", md: "row" },
              alignItems: { md: "center" },
            }}
          >
            <TextField
              size="small"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("placeholders.searchDepartments")}
              sx={{ flex: 1 }}
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
            <ToggleButtonGroup
              size="small"
              exclusive
              value={status ?? ""}
              onChange={(_event, value: string | null) => update({ status: value ?? "" })}
              aria-label={t("fields.status")}
              sx={{ flexWrap: "wrap" }}
            >
              <ToggleButton value="">{t("departments.allStatuses")}</ToggleButton>
              {STATUSES.map((value) => (
                <ToggleButton key={value} value={value}>
                  {tc(`departmentStatus.${value}`)}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        }
      />
    </>
  );
}
