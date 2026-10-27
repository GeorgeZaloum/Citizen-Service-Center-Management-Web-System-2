import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { Pagination } from "@/api/contracts";

import { ErrorState } from "./ErrorState";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Hidden on phones, where the table keeps only the essential columns. */
  hideOnMobile?: boolean;
  width?: number | string;
  align?: "left" | "right" | "center";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  getRowId: (row: T) => number | string;
  caption: string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  empty?: ReactNode;
  pagination?: Pagination;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onRowClick?: (row: T) => void;
  toolbar?: ReactNode;
}

const PAGE_SIZES = [10, 20, 50];

/** Server-paginated table with loading skeleton, empty and error states. */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  caption,
  loading,
  error,
  onRetry,
  empty,
  pagination,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  toolbar,
}: DataTableProps<T>) {
  const { t } = useTranslation("ui");
  const hide = (column: Column<T>) =>
    column.hideOnMobile ? { display: { xs: "none", md: "table-cell" } } : {};

  let body: ReactNode;
  if (error) {
    body = (
      <TableRow>
        <TableCell colSpan={columns.length} sx={{ border: 0 }}>
          <ErrorState error={error} onRetry={onRetry} />
        </TableCell>
      </TableRow>
    );
  } else if (loading || !rows) {
    body = Array.from({ length: 5 }, (_, index) => (
      <TableRow key={index}>
        {columns.map((column) => (
          <TableCell key={column.key} sx={hide(column)}>
            <Skeleton variant="text" width={index % 2 ? "70%" : "85%"} />
          </TableCell>
        ))}
      </TableRow>
    ));
  } else if (!rows.length) {
    body = (
      <TableRow>
        <TableCell colSpan={columns.length} sx={{ border: 0 }}>
          {empty}
        </TableCell>
      </TableRow>
    );
  } else {
    body = rows.map((row) => (
      <TableRow
        key={getRowId(row)}
        hover={!!onRowClick}
        onClick={onRowClick ? () => onRowClick(row) : undefined}
        sx={{ cursor: onRowClick ? "pointer" : "default", "&:last-child td": { border: 0 } }}
      >
        {columns.map((column) => (
          <TableCell key={column.key} align={column.align} sx={hide(column)}>
            {column.render(row)}
          </TableCell>
        ))}
      </TableRow>
    ));
  }

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      {toolbar && <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>{toolbar}</Box>}
      <TableContainer>
        <Table aria-label={caption} aria-busy={loading || undefined}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  align={column.align}
                  sx={{ width: column.width, ...hide(column) }}
                >
                  {column.header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>{body}</TableBody>
        </Table>
      </TableContainer>
      {pagination && pagination.total_items > 0 && (
        <TablePagination
          component="div"
          count={pagination.total_items}
          page={pagination.page - 1}
          rowsPerPage={pagination.page_size}
          rowsPerPageOptions={PAGE_SIZES}
          onPageChange={(_event, page) => onPageChange?.(page + 1)}
          onRowsPerPageChange={(event) => onPageSizeChange?.(Number(event.target.value))}
          labelRowsPerPage={t("table.rowsPerPage")}
          labelDisplayedRows={({ from, to, count }) => t("table.displayedRows", { from, to, count })}
          sx={{ borderTop: 1, borderColor: "divider" }}
        />
      )}
    </Paper>
  );
}
