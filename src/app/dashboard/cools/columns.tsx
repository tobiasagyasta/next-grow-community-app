"use client";

import * as React from "react";
import { ColumnDef, Column, Row } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";

import { CoolRow } from "./types";

const SortableHeader: React.FC<{
  column: Column<CoolRow, unknown>;
  title: string;
}> = ({ column, title }) => {
  const sortState = column.getIsSorted();
  const label =
    sortState === "asc"
      ? `Sorted ascending. Click to sort descending by ${title}.`
      : sortState === "desc"
      ? `Sorted descending. Click to clear sort by ${title}.`
      : `Sort by ${title}`;

  return (
    <Button
      type="button"
      variant="ghost"
      className="-ml-3 h-8 px-2 text-sm font-semibold"
      aria-label={label}
      onClick={() => column.toggleSorting(sortState === "asc")}
    >
      {title}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );
};

const StatusBadge: React.FC<{ value: string }> = ({ value }) => {
  const normalized = (value || "").toLowerCase();
  const className =
    normalized === "active"
      ? "bg-emerald-600 text-white hover:bg-emerald-600"
      : normalized === "inactive"
      ? "bg-slate-500 text-white hover:bg-slate-500"
      : "";

  return (
    <Badge
      variant={
        normalized === "active"
          ? "default"
          : normalized === "inactive"
          ? "secondary"
          : "outline"
      }
      className={className}
    >
      {value || "Unknown"}
    </Badge>
  );
};

const NameCell: React.FC<{ row: Row<CoolRow> }> = ({ row }) => {
  const router = useRouter();

  return (
    <button
      type="button"
      className="max-w-[240px] truncate text-left font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`View COOL ${row.original.name}`}
      onClick={() => router.push(`/cools/${row.original.code}`)}
    >
      {row.original.name}
    </button>
  );
};

const LeadersCell: React.FC<{ row: Row<CoolRow> }> = ({ row }) => {
  const leaders = row.original.leaders ?? [];
  const label = leaders.map((leader) => leader.name).join(", ");
  const tooltipContent = leaders.length
    ? leaders
        .map((leader) => `${leader.name} (${leader.communityId})`)
        .join("\n")
    : "No leaders assigned";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="max-w-[260px] truncate text-sm text-muted-foreground"
            title={label}
          >
            {label || "—"}
          </div>
        </TooltipTrigger>
        <TooltipContent className="whitespace-pre-line text-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const ActionsCell: React.FC<{ row: Row<CoolRow> }> = ({ row }) => {
  const router = useRouter();
  const { toast } = useToast();
  const code = row.original.code;

  const handleCopy = React.useCallback(async () => {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        throw new Error("Clipboard not supported");
      }
      await navigator.clipboard.writeText(code);
      toast({
        title: "Code copied",
        description: `${code} copied to clipboard.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Please try again.",
      });
    }
  }, [code, toast]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Actions for ${row.original.name}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            router.push(`/cools/${code}`);
          }}
        >
          View
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            void handleCopy();
          }}
        >
          Copy Code
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            router.push(`/cools/${code}/edit`);
          }}
        >
          Edit
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const columns: ColumnDef<CoolRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all rows"
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={`Select row for ${row.original.name}`}
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 32,
  },
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column} title="Name" />,
    enableSorting: true,
    cell: ({ row }) => <NameCell row={row} />,
  },
  {
    id: "campus",
    accessorKey: "campusName",
    header: ({ column }) => <SortableHeader column={column} title="Campus" />,
    enableSorting: true,
    cell: ({ row }) => (
      <div className="max-w-[240px]">
        <p className="truncate font-medium">{row.original.campusName}</p>
        <p className="text-xs text-muted-foreground">
          {row.original.campusCode}
        </p>
      </div>
    ),
  },
  {
    id: "leaders",
    header: "Leaders",
    cell: ({ row }) => <LeadersCell row={row} />,
  },
  {
    accessorKey: "status",
    header: "Status",
    enableSorting: true,
    cell: ({ row }) => <StatusBadge value={row.original.status} />,
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    enableSorting: false,
    cell: ({ row }) => <ActionsCell row={row} />,
  },
];
