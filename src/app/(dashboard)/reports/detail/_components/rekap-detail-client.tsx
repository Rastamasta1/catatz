"use client";

import Link from "next/link";
import { ArrowLeft, ArrowDownRight, ArrowUpRight, Scale } from "lucide-react";
import type { RekapDetailRange } from "@/actions/rekap-action";
import type { RekapSettings } from "@/types/rekap";
import { formatPeriodLabel } from "@/lib/rekap-period";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSystemPreferences } from "@/providers/system-preference-provider";
import { ProporsiSaldoChart } from "./proporsi-saldo-chart";

export type RekapDetailClientProps = {
  detail: RekapDetailRange;
  settings: RekapSettings;
  jenis: "bulanan" | "custom";
  customName?: string | null;
  saldoAwal?: number;
  saldoAkhir?: number;
};

function formatSignedRupiah(
  value: number,
  formatter: (value: number) => string,
): string {
  if (value === 0) return formatter(0);
  return `${value > 0 ? "+" : "-"}${formatter(Math.abs(value))}`;
}

function valueColor(value: number): string {
  if (value > 0) return "text-semantic-up";
  if (value < 0) return "text-semantic-down";
  return "text-muted-foreground";
}

function MetricRow({
  label,
  value,
  className,
  signed,
  note,
}: {
  label: string;
  value: number;
  className?: string;
  signed?: boolean;
  note?: string;
}) {
  const { formatRupiah } = useSystemPreferences();

  return (
    <div className="flex items-center justify-between gap-4 border-b border-hairline py-3.5 last:border-b-0">
      <div className="min-w-0">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {note && <p className="text-xs text-muted-foreground/75">{note}</p>}
      </div>
      <span
        className={cn(
          "shrink-0 text-right font-mono text-sm font-semibold",
          className,
        )}
      >
        {signed ? formatSignedRupiah(value, formatRupiah) : formatRupiah(value)}
      </span>
    </div>
  );
}

export function RekapDetailClient({
  detail,
  settings,
  jenis,
  customName,
  saldoAwal,
  saldoAkhir,
}: RekapDetailClientProps) {
  const { formatRupiah } = useSystemPreferences();

  const formattedPeriod = formatPeriodLabel(detail.startDate, detail.endDate);
  const displayTitle = jenis === "custom" && customName ? customName : formattedPeriod;

  // D8: Net Hutang Piutang = (hutang_baru + cicilan_piutang) - (piutang_baru + cicilan_hutang)
  const hutangPiutangNet =
    detail.hutang_piutang.hutang_baru +
    detail.hutang_piutang.cicilan_piutang -
    (detail.hutang_piutang.piutang_baru + detail.hutang_piutang.cicilan_hutang);

  const hasKoreksi = detail.koreksi.count > 0;
  const hasHutangPiutang = detail.hutang_piutang.count > 0;
  const showSaldoAkumulasi =
    settings.akumulasi_saldo && saldoAwal !== undefined && saldoAkhir !== undefined;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Header & Navigasi Kembali */}
      <div className="space-y-4">
        <div>
          <Link
            href={`/reports?tab=${jenis}`}
            className="inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
          >
            <Button
              variant="outline"
              size="sm"
              className="h-10 min-h-11 rounded-full border-hairline px-4 gap-2 text-sm font-medium hover:bg-surface-strong transition-colors"
            >
              <ArrowLeft className="size-4 shrink-0" />
              <span>Kembali ke {jenis === "custom" ? "Custom" : "Bulanan"}</span>
            </Button>
          </Link>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="rounded-full bg-surface-strong px-2.5 py-0.5 text-xs font-medium text-muted-foreground border-none"
              >
                {jenis === "custom" ? "Periode Custom" : "Siklus Bulanan"}
              </Badge>
              <span className="font-mono text-xs text-muted-foreground">
                {detail.daysInPeriod} hari
              </span>
            </div>
            <h1 className="mt-1 text-[28px] sm:text-[32px] font-normal tracking-[-0.4px] text-foreground">
              {displayTitle}
            </h1>
            {jenis === "custom" && customName && (
              <p className="font-mono text-sm text-muted-foreground mt-0.5">
                {formattedPeriod}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tiga Kartu Sorotan Utama */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Kartu Pengeluaran */}
        <Card className="rounded-card border border-hairline bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Pengeluaran
            </span>
            <span className="rounded-full bg-semantic-down/10 p-1.5 text-semantic-down">
              <ArrowDownRight className="size-4" />
            </span>
          </div>
          <p className="mt-3 font-mono text-2xl font-bold tracking-tight text-semantic-down">
            {formatRupiah(detail.total_expense)}
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Rata-rata: {formatRupiah(detail.rata_expense_harian)} / hari
          </p>
        </Card>

        {/* Kartu Pemasukan */}
        <Card className="rounded-card border border-hairline bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Pemasukan
            </span>
            <span className="rounded-full bg-semantic-up/10 p-1.5 text-semantic-up">
              <ArrowUpRight className="size-4" />
            </span>
          </div>
          <p className="mt-3 font-mono text-2xl font-bold tracking-tight text-semantic-up">
            {formatRupiah(detail.total_income)}
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Rata-rata: {formatRupiah(detail.rata_income_harian)} / hari
          </p>
        </Card>

        {/* Kartu Selisih */}
        <Card className="rounded-card border border-hairline bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Selisih Utama
            </span>
            <span className="rounded-full bg-surface-strong p-1.5 text-muted-foreground">
              <Scale className="size-4" />
            </span>
          </div>
          <p
            className={cn(
              "mt-3 font-mono text-2xl font-bold tracking-tight",
              valueColor(detail.net),
            )}
          >
            {formatSignedRupiah(detail.net, formatRupiah)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pemasukan dikurangi pengeluaran
          </p>
        </Card>
      </div>

      {/* Grid 2 Kolom: Rincian Lengkap & Grafik Proporsi Saldo */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Rincian Metrik Finansial Lengkap */}
        <Card className="rounded-card border border-hairline bg-card">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Rincian Finansial Periode
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="divide-y divide-hairline">
              <MetricRow
                label="Pengeluaran"
                value={detail.total_expense}
                className="text-semantic-down"
              />
              <MetricRow
                label="Rata-rata pengeluaran / hari"
                value={detail.rata_expense_harian}
                className="text-semantic-down"
                note={`Dibagi ${detail.daysInPeriod} hari periode`}
              />
              <MetricRow
                label="Pemasukan"
                value={detail.total_income}
                className="text-semantic-up"
              />
              <MetricRow
                label="Rata-rata pemasukan / hari"
                value={detail.rata_income_harian}
                className="text-semantic-up"
                note={`Dibagi ${detail.daysInPeriod} hari periode`}
              />
              <MetricRow
                label="Selisih utama"
                value={detail.net}
                className={valueColor(detail.net)}
                signed
              />

              {/* Baris Koreksi Saldo hanya jika ada aktivitas */}
              {hasKoreksi && (
                <MetricRow
                  label="Koreksi Saldo"
                  value={detail.koreksi.net}
                  className={valueColor(detail.koreksi.net)}
                  signed
                  note={`${detail.koreksi.count} aktivitas penyesuaian rekening`}
                />
              )}

              {/* Baris Hutang & Piutang hanya jika ada aktivitas (D8) */}
              {hasHutangPiutang && (
                <MetricRow
                  label="Arus Kas Hutang & Piutang"
                  value={hutangPiutangNet}
                  className={valueColor(hutangPiutangNet)}
                  signed
                  note={`${detail.hutang_piutang.count} mutasi (pinjaman & cicilan)`}
                />
              )}

              {/* Baris Saldo Awal & Saldo Akhir hanya jika akumulasi aktif */}
              {showSaldoAkumulasi && (
                <>
                  <MetricRow
                    label="Saldo Awal"
                    value={saldoAwal!}
                    className="text-foreground"
                    note="Total saldo rekening sebelum periode dimulai"
                  />
                  <MetricRow
                    label="Saldo Akhir"
                    value={saldoAkhir!}
                    className="text-foreground font-bold"
                    note="Total saldo rekening pada akhir periode"
                  />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Grafik Proporsi Pengeluaran vs Sisa Saldo (D9) */}
        <ProporsiSaldoChart
          totalExpense={detail.total_expense}
          totalIncome={detail.total_income}
          saldoAwal={showSaldoAkumulasi ? saldoAwal : 0}
          akumulasiAktif={settings.akumulasi_saldo}
        />
      </div>
    </div>
  );
}
