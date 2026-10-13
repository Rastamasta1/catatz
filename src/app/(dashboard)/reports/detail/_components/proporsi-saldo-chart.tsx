"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSystemPreferences } from "@/providers/system-preference-provider";

export type ProporsiSaldoChartProps = {
  totalExpense: number;
  totalIncome: number;
  saldoAwal?: number;
  akumulasiAktif?: boolean;
};

export function ProporsiSaldoChart({
  totalExpense,
  totalIncome,
  saldoAwal = 0,
  akumulasiAktif = false,
}: ProporsiSaldoChartProps) {
  const { formatRupiah } = useSystemPreferences();

  // D9: Sisa saldo = pemasukan (+ saldo awal bila akumulasi aktif) - pengeluaran
  const totalDanaMasuk = totalIncome + (akumulasiAktif ? saldoAwal : 0);
  const sisaSaldo = totalDanaMasuk - totalExpense;
  const isDefisit = sisaSaldo < 0;

  const { chartData, persenExpense, persenSisa } = useMemo(() => {
    if (isDefisit) {
      // Jika defisit, tampil 100% pengeluaran dengan penanda defisit
      return {
        chartData: [
          { name: "Pengeluaran", value: totalExpense > 0 ? totalExpense : 1, color: "var(--semantic-down)" },
        ],
        persenExpense: 100,
        persenSisa: 0,
      };
    }

    if (totalDanaMasuk > 0) {
      const pExpense = Math.round((totalExpense / totalDanaMasuk) * 100);
      const pSisa = Math.max(0, 100 - pExpense);
      return {
        chartData: [
          { name: "Pengeluaran", value: totalExpense, color: "var(--semantic-down)" },
          { name: "Sisa Saldo", value: sisaSaldo, color: "var(--primary)" },
        ],
        persenExpense: pExpense,
        persenSisa: pSisa,
      };
    }

    if (totalExpense > 0) {
      return {
        chartData: [
          { name: "Pengeluaran", value: totalExpense, color: "var(--semantic-down)" },
        ],
        persenExpense: 100,
        persenSisa: 0,
      };
    }

    // Kasus nol transaksi
    return {
      chartData: [
        { name: "Sisa Saldo", value: 1, color: "var(--primary)" },
      ],
      persenExpense: 0,
      persenSisa: 100,
    };
  }, [isDefisit, totalDanaMasuk, totalExpense, sisaSaldo]);

  return (
    <Card className="rounded-card border border-hairline bg-card">
      <CardHeader className="p-6 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Proporsi Pengeluaran vs Sisa Saldo
          </CardTitle>
          {isDefisit && (
            <span className="inline-flex items-center gap-1 rounded-full bg-semantic-down/10 px-2.5 py-0.5 text-xs font-semibold text-semantic-down">
              <AlertTriangle className="size-3" /> Defisit
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0 space-y-5">
        {/* Visual Donut Chart */}
        <div className="relative flex h-60 w-full items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={68}
                outerRadius={94}
                paddingAngle={chartData.length > 1 ? 2 : 0}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`slice-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val) =>
                  chartData.length === 1 && totalExpense === 0 && sisaSaldo === 0
                    ? formatRupiah(0)
                    : formatRupiah(Number(val))
                }
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xs font-medium text-muted-foreground">
              {isDefisit ? "Defisit" : "Sisa Saldo"}
            </span>
            <span
              className={`font-mono text-lg font-bold sm:text-xl ${
                isDefisit ? "text-semantic-down" : "text-foreground"
              }`}
            >
              {isDefisit ? `-${formatRupiah(Math.abs(sisaSaldo))}` : formatRupiah(sisaSaldo)}
            </span>
          </div>
        </div>

        {/* Legend Persentase & Nominal */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="rounded-input border border-hairline bg-surface-soft p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-semantic-down" />
              <span>Pengeluaran</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <span className="font-mono text-sm font-semibold text-foreground">
                {formatRupiah(totalExpense)}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {persenExpense}%
              </span>
            </div>
          </div>

          <div className="rounded-input border border-hairline bg-surface-soft p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-primary" />
              <span>Sisa Saldo</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <span
                className={`font-mono text-sm font-semibold ${
                  isDefisit ? "text-semantic-down" : "text-foreground"
                }`}
              >
                {isDefisit ? `-${formatRupiah(Math.abs(sisaSaldo))}` : formatRupiah(sisaSaldo)}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {persenSisa}%
              </span>
            </div>
          </div>
        </div>

        {/* Indikator Peringatan Defisit */}
        {isDefisit && (
          <div className="flex items-center gap-2 rounded-input border border-semantic-down/30 bg-semantic-down/10 p-3 text-xs text-semantic-down">
            <AlertTriangle className="size-4 shrink-0" />
            <span>
              Pengeluaran pada periode ini melebihi total dana masuk sebesar{" "}
              <strong className="font-mono font-semibold">
                {formatRupiah(Math.abs(sisaSaldo))}
              </strong>
              .
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
