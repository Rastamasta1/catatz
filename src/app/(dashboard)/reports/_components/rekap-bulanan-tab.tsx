"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getRekapRingkasanPeriodeList } from "@/actions/rekap-action";
import { getSaldoPeriodeList } from "@/actions/rekap-saldo-action";
import { EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  addDays,
  getCycleContaining,
  getTodayInJakarta,
  listCycles,
  type RekapCycleRange,
} from "@/lib/rekap-period";
import type { RekapSettings } from "@/types/rekap";
import { RekapPeriodCard, type RekapPeriodCardData } from "./rekap-period-card";

export type RekapBulananTabProps = {
  settings: RekapSettings;
};

const BATCH_SIZE = 12;

export function RekapBulananTab({ settings }: RekapBulananTabProps) {
  const [items, setItems] = useState<RekapPeriodCardData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const today = useMemo(() => getTodayInJakarta(), []);
  const currentCycle = useMemo(
    () => getCycleContaining(settings.cutoff_day, today),
    [settings.cutoff_day, today],
  );

  // Helper untuk memuat ringkasan finansial dan saldo untuk sekumpulan siklus
  const fetchCycleData = useCallback(
    async (cycles: RekapCycleRange[]): Promise<RekapPeriodCardData[]> => {
      if (cycles.length === 0) return [];

      const [ringkasanList, saldoResult] = await Promise.all([
        getRekapRingkasanPeriodeList(cycles),
        settings.akumulasi_saldo
          ? getSaldoPeriodeList(cycles)
          : Promise.resolve({ success: true, data: [] }),
      ]);

      const ringkasanMap = new Map(
        ringkasanList.map((r) => [`${r.startDate}_${r.endDate}`, r]),
      );

      const saldoMap = new Map(
        (saldoResult.success && saldoResult.data ? saldoResult.data : []).map(
          (s) => [`${s.startDate}_${s.endDate}`, s],
        ),
      );

      return cycles.map((cycle) => {
        const key = `${cycle.startDate}_${cycle.endDate}`;
        const ringkasan = ringkasanMap.get(key);
        const saldo = saldoMap.get(key);

        const isCurrent =
          cycle.startDate === currentCycle.startDate &&
          cycle.endDate === currentCycle.endDate;

        return {
          startDate: cycle.startDate,
          endDate: cycle.endDate,
          label: cycle.label,
          isCurrent,
          total_expense: ringkasan?.total_expense ?? 0,
          total_income: ringkasan?.total_income ?? 0,
          net: ringkasan?.net ?? 0,
          net_arus_kas_hutang_piutang:
            ringkasan?.net_arus_kas_hutang_piutang ?? 0,
          koreksi: ringkasan?.koreksi,
          saldo_awal: saldo?.saldo_awal,
          saldo_akhir: saldo?.saldo_akhir,
        };
      });
    },
    [currentCycle.endDate, currentCycle.startDate, settings.akumulasi_saldo],
  );

  // Track previous settings for loading indicator reset when props change
  const [prevSettings, setPrevSettings] = useState(settings);
  if (
    prevSettings.cutoff_day !== settings.cutoff_day ||
    prevSettings.akumulasi_saldo !== settings.akumulasi_saldo
  ) {
    setPrevSettings(settings);
    setIsLoading(true);
  }

  // Muat 12 siklus pertama saat mount atau saat setting berubah
  useEffect(() => {
    let ignore = false;

    const initialCycles = listCycles({
      cutoffDay: settings.cutoff_day,
      referenceDate: today,
      count: BATCH_SIZE,
    });

    fetchCycleData(initialCycles)
      .then((initialData) => {
        if (!ignore) {
          setItems(initialData);
          setHasMore(initialCycles.length === BATCH_SIZE);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error("Gagal memuat rekap bulanan:", err);
          toast.error("Gagal memuat siklus bulanan");
          setItems([]);
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [fetchCycleData, settings.cutoff_day, today]);

  // Muat batch 12 siklus berikutnya
  const loadMore = useCallback(async () => {
    if (items.length === 0 || isLoadingMore || !hasMore) return;

    try {
      setIsLoadingMore(true);
      const lastItem = items[items.length - 1];
      const nextRefDate = addDays(lastItem.startDate, -1);

      const nextCycles = listCycles({
        cutoffDay: settings.cutoff_day,
        referenceDate: nextRefDate,
        count: BATCH_SIZE,
      });

      if (nextCycles.length === 0) {
        setHasMore(false);
        return;
      }

      const nextData = await fetchCycleData(nextCycles);
      setItems((prev) => [...prev, ...nextData]);
      setHasMore(nextCycles.length === BATCH_SIZE);
    } catch (err) {
      console.error("Gagal memuat batch berikutnya:", err);
      toast.error("Gagal memuat siklus berikutnya");
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchCycleData, hasMore, isLoadingMore, items, settings.cutoff_day]);

  // Skeleton saat memuat awal
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card
              key={i}
              className="rounded-card border border-hairline bg-card p-5 sm:p-6"
            >
              <div className="flex items-center justify-between border-b border-hairline pb-3">
                <Skeleton className="h-5 w-36 rounded" />
                <Skeleton className="size-4 rounded-full" />
              </div>
              <div className="mt-3 space-y-2.5">
                {Array.from({ length: settings.akumulasi_saldo ? 6 : 4 }).map(
                  (_, j) => (
                    <div key={j} className="flex justify-between py-1">
                      <Skeleton className="h-4 w-24 rounded" />
                      <Skeleton className="h-4 w-28 rounded" />
                    </div>
                  ),
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Tampilan kosong bila tidak ada data
  if (items.length === 0) {
    return (
      <Card className="rounded-card border border-hairline bg-card">
        <div className="p-8">
          <EmptyState
            icon={CalendarDays}
            title="Tidak Ada Siklus Bulanan"
            description="Belum ada siklus bulanan yang tersedia untuk ditampilkan."
          />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Grid Kartu Siklus Bulanan */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <RekapPeriodCard
            key={`${item.startDate}_${item.endDate}`}
            period={item}
            akumulasiAktif={settings.akumulasi_saldo}
            jenis="bulanan"
          />
        ))}
      </div>

      {/* Tombol Muat Lebih Banyak */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="h-10 min-h-11 rounded-full border-hairline px-6 gap-2 text-sm font-medium hover:bg-surface-strong transition-colors"
          >
            {isLoadingMore ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" />
            )}
            <span>{isLoadingMore ? "Memuat siklus..." : "Muat lebih banyak"}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
