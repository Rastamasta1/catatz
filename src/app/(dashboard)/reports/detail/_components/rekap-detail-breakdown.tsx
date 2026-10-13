"use client";

import { useState } from "react";
import { ChevronDown, ReceiptText, Tags, Type } from "lucide-react";
import type {
  RekapBreakdownItem,
  RekapDetailRange,
  RekapDetailTransaksi,
} from "@/actions/rekap-action";
import { TIPE_CONFIG } from "@/constants/transaksi";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSystemPreferences } from "@/providers/system-preference-provider";

export type BreakdownMode = "kategori" | "judul";

export type RekapDetailBreakdownProps = {
  detail: RekapDetailRange;
};

function DetailListItem({ item }: { item: RekapDetailTransaksi }) {
  const { formatRupiah, formatTanggal, formatWaktu } = useSystemPreferences();
  const cfg = TIPE_CONFIG[item.tipe];
  const TipeIcon = cfg.icon;
  const displayName = item.judul || item.catatan || cfg.label;
  const waktuLabel = formatWaktu(item.waktu);

  return (
    <div className="flex flex-col gap-2.5 border-t border-hairline bg-transparent p-3 transition-colors hover:bg-surface-soft sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div className="flex min-w-0 flex-1 items-start sm:items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-strong text-sm">
          {item.kategori?.ikon ? (
            <span>{item.kategori.ikon}</span>
          ) : (
            <TipeIcon className={cn("size-4", cfg.color)} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-foreground max-w-55 sm:max-w-[320px]">
              {displayName}
            </p>
            <Badge
              variant="secondary"
              className={cn(
                "rounded-full border-0 px-2 py-0.5 text-xs font-normal shrink-0",
                cfg.badge,
              )}
            >
              {item.kategori
                ? `${item.kategori.ikon} ${item.kategori.nama}`
                : cfg.label}
            </Badge>
          </div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span className="shrink-0">{formatTanggal(item.tanggal, "d MMM yyyy")}</span>
            {waktuLabel && <span className="shrink-0">• {waktuLabel}</span>}
            {item.rekening && (
              <span className="truncate max-w-35">• {item.rekening.nama}</span>
            )}
            {item.catatan && (
              <span className="min-w-0 wrap-break-word text-muted-foreground/85">
                • {item.catatan}
              </span>
            )}
          </div>
        </div>
      </div>
      <p
        className={cn(
          "shrink-0 font-mono text-sm font-semibold text-left sm:text-right pl-12 sm:pl-0",
          item.tipe === "income" ? "text-semantic-up" : "text-semantic-down",
        )}
      >
        {item.tipe === "income" ? "+" : "-"}
        {formatRupiah(Number(item.nominal))}
      </p>
    </div>
  );
}

function BreakdownIcon({
  item,
  mode,
}: {
  item: RekapBreakdownItem;
  mode: BreakdownMode;
}) {
  if (mode === "kategori") {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-strong text-base">
        {item.icon || "🏷️"}
      </span>
    );
  }

  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-strong">
      <ReceiptText
        className={cn(
          "size-4",
          item.tipe === "income" ? "text-semantic-up" : "text-semantic-down",
        )}
      />
    </span>
  );
}

function BreakdownRows({
  title,
  items,
  mode,
  activeId,
  onToggle,
}: {
  title: string;
  items: RekapBreakdownItem[];
  mode: BreakdownMode;
  activeId: string | null;
  onToggle: (id: string) => void;
}) {
  const { formatRupiah } = useSystemPreferences();

  if (items.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {title}
        </h3>
        <div className="rounded-input border border-dashed border-hairline p-5 text-center text-sm text-muted-foreground">
          Belum ada data {title.toLowerCase()}.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {title}
        </h3>
        <span className="text-xs font-mono text-muted-foreground">
          {items.length} {mode === "kategori" ? "kategori" : "judul"}
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const isActive = activeId === item.id;

          return (
            <div
              key={item.id}
              className="overflow-hidden rounded-input border border-hairline bg-card transition-colors"
            >
              <button
                type="button"
                onClick={() => onToggle(item.id)}
                className={cn(
                  "flex min-h-13 w-full items-center gap-3 p-3.5 text-left transition-colors hover:bg-surface-soft",
                  isActive && "bg-surface-soft",
                )}
                aria-expanded={isActive}
              >
                <BreakdownIcon item={item} mode={mode} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                      {item.label}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 font-mono text-sm font-semibold",
                        item.tipe === "income"
                          ? "text-semantic-up"
                          : "text-semantic-down",
                      )}
                    >
                      {formatRupiah(item.total)}
                    </span>
                  </div>

                  <Progress
                    value={item.persentase}
                    className="mt-2 h-1.5 [&>div]:bg-primary"
                  />

                  <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{item.count} transaksi</span>
                    <span className="shrink-0 font-mono">{item.persentase}%</span>
                  </div>
                </div>

                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    isActive && "rotate-180",
                  )}
                />
              </button>

              {isActive && (
                <div className="bg-card">
                  {item.transaksi.length > 0 ? (
                    item.transaksi.map((t) => (
                      <DetailListItem key={t.id} item={t} />
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-muted-foreground border-t border-hairline">
                      Tidak ada detail transaksi.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RekapDetailBreakdown({ detail }: RekapDetailBreakdownProps) {
  const [mode, setMode] = useState<BreakdownMode>("kategori");
  // Satu baris terbuka per bagian (activeExpenseId untuk pengeluaran, activeIncomeId untuk pemasukan)
  const [activeExpenseId, setActiveExpenseId] = useState<string | null>(null);
  const [activeIncomeId, setActiveIncomeId] = useState<string | null>(null);

  const handleModeChange = (val: string) => {
    setMode(val as BreakdownMode);
    setActiveExpenseId(null);
    setActiveIncomeId(null);
  };

  const handleToggleExpense = (id: string) => {
    setActiveExpenseId((curr) => (curr === id ? null : id));
  };

  const handleToggleIncome = (id: string) => {
    setActiveIncomeId((curr) => (curr === id ? null : id));
  };

  return (
    <Card className="rounded-card border border-hairline bg-card">
      <Tabs value={mode} onValueChange={handleModeChange} className="w-full">
        <CardHeader className="p-6 pb-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-strong text-primary">
                {mode === "kategori" ? (
                  <Tags className="size-5" />
                ) : (
                  <Type className="size-5" />
                )}
              </span>
              <div>
                <CardTitle className="text-base sm:text-lg font-semibold text-foreground">
                  Rincian Transaksi
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Berdasarkan {mode === "kategori" ? "kategori transaksi" : "judul transaksi"} (D10)
                </p>
              </div>
            </div>

            <TabsList className="grid grid-cols-2 rounded-full p-1 bg-surface-strong h-10 w-full sm:w-56">
              <TabsTrigger
                value="kategori"
                className="rounded-full text-xs font-semibold data-active:bg-card"
              >
                Kategori
              </TabsTrigger>
              <TabsTrigger
                value="judul"
                className="rounded-full text-xs font-semibold data-active:bg-card"
              >
                Judul
              </TabsTrigger>
            </TabsList>
          </div>
        </CardHeader>

        <CardContent className="p-6 pt-4">
            <TabsContent value="kategori" className="m-0 space-y-6">
              <div className="grid gap-8 lg:grid-cols-2">
                <BreakdownRows
                  title="Pengeluaran per Kategori"
                  items={detail.kategori.expense}
                  mode="kategori"
                  activeId={activeExpenseId}
                  onToggle={handleToggleExpense}
                />
                <BreakdownRows
                  title="Pemasukan per Kategori"
                  items={detail.kategori.income}
                  mode="kategori"
                  activeId={activeIncomeId}
                  onToggle={handleToggleIncome}
                />
              </div>
            </TabsContent>

            <TabsContent value="judul" className="m-0 space-y-6">
              <div className="grid gap-8 lg:grid-cols-2">
                <BreakdownRows
                  title="Pengeluaran per Judul"
                  items={detail.judul.expense}
                  mode="judul"
                  activeId={activeExpenseId}
                  onToggle={handleToggleExpense}
                />
                <BreakdownRows
                  title="Pemasukan per Judul"
                  items={detail.judul.income}
                  mode="judul"
                  activeId={activeIncomeId}
                  onToggle={handleToggleIncome}
                />
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
    </Card>
  );
}
