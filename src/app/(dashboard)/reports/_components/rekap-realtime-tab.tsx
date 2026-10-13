"use client";

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { toast } from "sonner";
import { Receipt, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common";
import { getRekapDetailByRange, type RekapBreakdownItem } from "@/actions/rekap-action";
import { getCycleContaining, getTodayInJakarta } from "@/lib/rekap-period";
import { useSystemPreferences } from "@/providers/system-preference-provider";
import type { RekapSettings } from "@/types/rekap";

// Lazy-load komponen Donut Recharts untuk optimasi bundle size
const RekapDonutChart = lazy(() =>
  import("./rekap-charts").then((module) => ({
    default: module.RekapDonutChart,
  })),
);

export type RekapRealtimeTabProps = {
  settings: RekapSettings;
};

export function RekapRealtimeTab({ settings }: RekapRealtimeTabProps) {
  const { formatRupiah } = useSystemPreferences();

  // Tentukan siklus berjalan berdasarkan cut-off setting dan waktu terkini di Asia/Jakarta (D6)
  const today = useMemo(() => getTodayInJakarta(), []);
  const cycle = useMemo(
    () => getCycleContaining(settings.cutoff_day, today),
    [settings.cutoff_day, today],
  );

  const [expenseData, setExpenseData] = useState<RekapBreakdownItem[]>([]);
  const [totalExpense, setTotalExpense] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefetching, setIsRefetching] = useState<boolean>(false);

  // Ambil detail rekap berdasarkan rentang siklus berjalan (menggunakan kategori.expense)
  const loadData = useCallback(async () => {
    try {
      const detail = await getRekapDetailByRange(cycle.startDate, cycle.endDate);
      setExpenseData(detail.kategori.expense);
      setTotalExpense(detail.total_expense);
    } catch {
      toast.error("Gagal memuat rekap realtime");
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, [cycle.startDate, cycle.endDate]);

  // Initial fetch pada mount atau saat siklus berubah
  useEffect(() => {
    let ignore = false;
    getRekapDetailByRange(cycle.startDate, cycle.endDate)
      .then((detail) => {
        if (!ignore) {
          setExpenseData(detail.kategori.expense);
          setTotalExpense(detail.total_expense);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          toast.error("Gagal memuat rekap realtime");
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [cycle.startDate, cycle.endDate]);

  // Refetch saat visibilitychange/focus dan event online (D5)
  useEffect(() => {
    const handleRefetch = () => {
      if (document.visibilityState === "visible") {
        setIsRefetching(true);
        loadData();
      }
    };

    const handleOnline = () => {
      setIsRefetching(true);
      loadData();
    };

    window.addEventListener("focus", handleRefetch);
    document.addEventListener("visibilitychange", handleRefetch);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("focus", handleRefetch);
      document.removeEventListener("visibilitychange", handleRefetch);
      window.removeEventListener("online", handleOnline);
    };
  }, [loadData]);

  // Format data untuk input Donut Chart
  const donutItems = useMemo(
    () =>
      expenseData.map((item) => ({
        id: item.id,
        label: item.label,
        total: item.total,
        color: item.color,
        persentase: item.persentase,
        icon: item.icon,
      })),
    [expenseData],
  );

  return (
    <div className="space-y-6">
      {/* Kartu Header Periode Siklus Berjalan */}
      <Card className="rounded-card border border-hairline bg-card">
        <CardHeader className="p-6 pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  Siklus Berjalan
                </span>
                {isRefetching && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground animate-pulse">
                    <RefreshCw className="size-3 animate-spin" /> Memperbarui data...
                  </span>
                )}
              </div>
              <CardTitle className="mt-2 text-xl font-normal tracking-tight text-foreground sm:text-2xl">
                {cycle.label}
              </CardTitle>
              <CardDescription className="mt-1 text-xs text-muted-foreground">
                Rentang aktif: <span className="font-mono">{cycle.startDate}</span> s/d{" "}
                <span className="font-mono">{cycle.endDate}</span> ({cycle.daysCount} hari inklusif)
              </CardDescription>
            </div>
            <div className="rounded-input border border-hairline bg-surface-soft p-3 sm:text-right">
              <p className="text-xs text-muted-foreground">Total Pengeluaran Siklus</p>
              <p className="mt-0.5 font-mono text-lg font-bold text-semantic-down sm:text-xl">
                {formatRupiah(totalExpense)}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Konten Tab: Loading State */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="rounded-card border border-hairline bg-card p-6">
            <Skeleton className="mb-4 h-5 w-44" />
            <Skeleton className="mx-auto h-65 w-65 rounded-full" />
          </Card>
          <Card className="rounded-card border border-hairline bg-card p-6">
            <Skeleton className="mb-4 h-5 w-40" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : expenseData.length === 0 ? (
        /* Empty State bila belum ada pengeluaran */
        <Card className="rounded-card border border-hairline bg-card">
          <CardContent className="p-6">
            <EmptyState
              icon={Receipt}
              title="Belum Ada Pengeluaran"
              description={`Belum ada transaksi pengeluaran yang tercatat pada siklus berjalan (${cycle.label}).`}
            />
          </CardContent>
        </Card>
      ) : (
        /* Grid Donut Chart & Breakdown Kategori */
        <div className="grid gap-6 md:grid-cols-2">
          {/* Kolom Kiri: Donut Recharts */}
          <Card className="rounded-card border border-hairline bg-card">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Proporsi Pengeluaran
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <Suspense
                fallback={
                  <div className="flex h-65 items-center justify-center">
                    <Skeleton className="h-55 w-55 rounded-full" />
                  </div>
                }
              >
                <RekapDonutChart data={donutItems} totalExpense={totalExpense} />
              </Suspense>
            </CardContent>
          </Card>

          {/* Kolom Kanan: Rincian Daftar Kategori */}
          <Card className="rounded-card border border-hairline bg-card">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Rincian Kategori ({expenseData.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <div className="space-y-4 max-h-85 overflow-y-auto pr-1">
                {expenseData.map((item) => (
                  <div key={item.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-strong text-sm">
                          {item.icon}
                        </span>
                        <span className="truncate font-medium text-foreground">
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-right">
                        <span className="font-mono text-xs text-muted-foreground">
                          {item.persentase}%
                        </span>
                        <span className="font-mono text-sm font-semibold text-foreground">
                          {formatRupiah(item.total)}
                        </span>
                      </div>
                    </div>
                    {/* Batang Proporsi Kategori */}
                    <div className="h-1.5 w-full rounded-full bg-surface-strong overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.max(0, item.persentase))}%`,
                          backgroundColor: item.color || "var(--primary)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
