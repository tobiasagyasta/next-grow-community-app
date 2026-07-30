"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { CoolRow } from "./types";

type DataTableProps = {
  columns: ColumnDef<CoolRow, unknown>[];
  data: CoolRow[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

export function DataTable({
  columns,
  data,
  loading,
  error,
  onRetry,
}: DataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "name", desc: false },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [campusFilter, setCampusFilter] = React.useState<string>("");

  const globalFilterFn = React.useCallback<FilterFn<CoolRow>>(
    (row, _columnId, filterValue) => {
      if (!filterValue) {
        return true;
      }
      const query = String(filterValue).toLowerCase();
      const name = (row.original.name || "").toLowerCase();
      const leaders = (row.original.leaders || [])
        .map((leader) => leader.name.toLowerCase())
        .join(" ");
      return name.includes(query) || leaders.includes(query);
    },
    []
  );

  const filterFns = React.useMemo(
    () => ({
      campusMatch: ((row, _columnId, filterValue) => {
        if (!filterValue) {
          return true;
        }
        const value = String(filterValue).toLowerCase();
        return (
          (row.original.campusName || "").toLowerCase().includes(value) ||
          (row.original.campusCode || "").toLowerCase().includes(value)
        );
      }) as FilterFn<CoolRow>,
      statusEq: ((row, _columnId, filterValue) => {
        if (!filterValue || filterValue === "all") {
          return true;
        }
        return (
          (row.original.status || "").toLowerCase() ===
          String(filterValue).toLowerCase()
        );
      }) as FilterFn<CoolRow>,
    }),
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn,
    filterFns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.code,
    initialState: {
      pagination: { pageIndex: 0, pageSize: 10 },
    },
  });

  // assign the named filter functions to the columns once
  React.useEffect(() => {
    // Column.setFilterFn no longer exists on the Column type; assign the named filter
    // function key to the column definition instead (cast to any to satisfy TS).
    const campusCol = table.getColumn("campus");
    const statusCol = table.getColumn("status");

    if (campusCol) {
      (campusCol.columnDef as any).filterFn = "campusMatch";
    }
    if (statusCol) {
      (statusCol.columnDef as any).filterFn = "statusEq";
    }
  }, [table]);

  // keep the table's column filters in sync with the local campus and status filters
  React.useEffect(() => {
    table.setColumnFilters((old) => {
      const others = old.filter((f) => f.id !== "status" && f.id !== "campus");
      const next: { id: string; value: unknown }[] = [...others];

      // treat "all" as clearing the status filter
      if (statusFilter && statusFilter !== "all") {
        next.push({ id: "status", value: statusFilter });
      }

      if (campusFilter) {
        next.push({ id: "campus", value: campusFilter });
      }

      return next;
    });
  }, [statusFilter, campusFilter, table]);

  return (
    <div className="space-y-4" aria-live="polite">
      <div
        className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
        aria-label="Table controls"
      >
        <div className="flex flex-1 flex-wrap gap-2 ml-2">
          <Input
            aria-label="Search by COOL name or leader"
            placeholder="Search name or leaders..."
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="w-full min-w-[200px] md:w-[240px]"
          />
          <Input
            aria-label="Filter by campus"
            placeholder="Campus filter (name or code)"
            value={campusFilter}
            onChange={(event) => setCampusFilter(event.target.value)}
            className="w-full min-w-[160px] md:w-[220px]"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger
              className="w-full min-w-[140px] md:w-[160px]"
              aria-label="Filter by status"
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              aria-label="Toggle column visibility"
              className="mr-3"
            >
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table.getAllLeafColumns().map((column) => {
              if (!column.getCanHide() || column.id === "actions") {
                return null;
              }
              return (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {loading && (
        <div className="rounded-md border p-4" aria-label="Loading COOLs">
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        </div>
      )}

      {!loading && error && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Unable to load COOLs</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm">{error}</span>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {!loading && !error && (
        <div className="rounded-md border">
          <Table aria-label="COOLs table">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground ml-2">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected
        </p>
        <div className="flex items-center gap-2 mr-2 md:mr-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount() || 1}
          </span>
        </div>
      </div>
    </div>
  );
}
