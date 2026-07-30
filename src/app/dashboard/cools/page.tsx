"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/AuthProvider";
import { API_BASE_URL, API_KEY } from "@/lib/config";

import { columns } from "./columns";
import { DataTable } from "./data-table";
import { CoolRow, CoolsResponse } from "./types";
import HeaderNav from "@/components/HeaderNav";

export default function CoolsPage() {
  const router = useRouter();
  const { getValidAccessToken, handleExpiredToken } = useAuth();

  const [rows, setRows] = React.useState<CoolRow[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [totalRows, setTotalRows] = React.useState<number | null>(null);

  const fetchCools = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getValidAccessToken();
      if (!token) {
        await handleExpiredToken();
        throw new Error("Session expired. Please sign in again.");
      }

      const response = await fetch(`${API_BASE_URL}/api/v2/cools`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY ?? "",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        await handleExpiredToken();
        throw new Error("Session expired. Please try again.");
      }

      if (!response.ok) {
        throw new Error("Unable to load COOLs.");
      }

      const payload: CoolsResponse = await response.json();
      setRows(Array.isArray(payload.data) ? payload.data : []);
      setTotalRows(payload.metadata?.totalRows ?? payload.data?.length ?? null);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Something went wrong while loading COOLs.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [getValidAccessToken, handleExpiredToken]);

  React.useEffect(() => {
    void fetchCools();
  }, [fetchCools]);

  return (
    <main className="space-y-6">
      <HeaderNav name="COOLs" link="dashboard" />
      <div className="mx-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground ml-2">
            {typeof totalRows === "number"
              ? `${totalRows} total COOL${totalRows === 1 ? "" : "s"} loaded`
              : "Manage community COOLs"}
          </p>
        </div>
        <Button
          onClick={() => router.push("/dashboard/cools/create")}
          aria-label="Create a new COOL"
        >
          New COOL
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        error={error}
        onRetry={fetchCools}
      />
    </main>
  );
}
