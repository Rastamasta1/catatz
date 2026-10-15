"use client";

import type { Transaksi } from "@/types/transaksi";
import type { DisplayTransaksi } from "@/hooks/use-offline-queue-sync";
import { cn } from "@/lib/utils";
import { TIPE_CONFIG } from "@/constants/transaksi";
import {
  filterSystemTags,
  getTransaksiNominalDisplay,
  getTransaksiDisplayName,
} from "@/lib/transaksi-detail";
import { useSystemPreferences } from "@/providers/system-preference-provider";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Calendar,
  Clock,
  FileText,
  Repeat,
  Tag,
  Wallet,
} from "lucide-react";

export type TransaksiDetailContentProps = {
  transaksi: Transaksi | DisplayTransaksi;
  className?: string;
};

export function TransaksiDetailContent({
  transaksi,
  className,
}: TransaksiDetailContentProps) {
  const { formatRupiah, formatTanggal, formatWaktu } = useSystemPreferences();
  const cfg = TIPE_CONFIG[transaksi.tipe] ?? TIPE_CONFIG.expense;
  const TipeIcon = cfg.icon;
  const displayName = getTransaksiDisplayName(transaksi);
  const nominalDisplay = getTransaksiNominalDisplay(transaksi);
  const userTags = filterSystemTags(transaksi.tags);
  const waktuLabel = formatWaktu(transaksi.waktu);
  const isPendingSync = (transaksi as DisplayTransaksi)._pendingSync;

  return (
    <div className={cn("space-y-5", className)}>
      {/* 1. Hero Nominal Card */}
      <div className="rounded-[20px] p-6 bg-surface-soft dark:bg-surface-dark-elevated border border-hairline flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-surface-strong flex items-center justify-center shrink-0 mb-3 shadow-none">
          {transaksi.kategori?.ikon ? (
            <span className="text-xl">{transaksi.kategori.ikon}</span>
          ) : (
            <TipeIcon className={cn("h-6 w-6", cfg.color)} />
          )}
        </div>

        <h3 className="font-semibold text-base sm:text-lg text-foreground max-w-full wrap-break-word">
          {displayName}
        </h3>

        <div className="mt-2">
          <p
            className={cn(
              "font-mono text-3xl sm:text-4xl font-bold tracking-tight",
              nominalDisplay.colorClass,
            )}
          >
            {nominalDisplay.sign}
            {formatRupiah(Number(transaksi.nominal))}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
          <Badge
            className={cn(
              "text-xs px-3 py-1 rounded-full border-0 font-medium",
              nominalDisplay.badgeClass,
            )}
          >
            {nominalDisplay.label}
          </Badge>

          {isPendingSync && (
            <Badge className="border-0 bg-accent-yellow/15 px-3 py-1 rounded-full text-xs font-medium text-accent-yellow">
              Menunggu sinkronisasi
            </Badge>
          )}

          {transaksi.is_recurring && (
            <Badge className="border-0 bg-primary/10 px-3 py-1 rounded-full text-xs font-medium text-primary flex items-center gap-1">
              <Repeat className="h-3 w-3" />
              <span>Berulang</span>
            </Badge>
          )}
        </div>
      </div>

      {/* 2. Rekening / Transfer Flow Card */}
      {transaksi.tipe === "transfer" ? (
        <div className="rounded-[20px] p-4 border border-hairline bg-card space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            Alur Transfer Rekening
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,1fr] items-center gap-3 pt-1">
            {/* Rekening Asal */}
            <div className="flex items-center gap-3 p-3 rounded-[14px] bg-surface-soft dark:bg-surface-dark-elevated border border-hairline/60">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white font-semibold text-xs"
                style={{
                  backgroundColor: transaksi.rekening?.warna || "#0052ff",
                }}
              >
                {transaksi.rekening?.nama?.charAt(0).toUpperCase() ?? "A"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-muted-foreground font-medium">
                  Rekening Asal
                </p>
                <p className="text-sm font-semibold text-foreground truncate">
                  {transaksi.rekening?.nama ?? "Rekening Asal"}
                </p>
                {transaksi.rekening?.jenis && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    {transaksi.rekening.jenis}
                  </p>
                )}
              </div>
            </div>

            {/* Arrow Divider */}
            <div className="flex justify-center items-center py-1 sm:py-0 text-muted-foreground">
              <ArrowRight className="h-5 w-5 hidden sm:block rotate-0" />
              <ArrowRight className="h-5 w-5 sm:hidden rotate-90" />
            </div>

            {/* Rekening Tujuan */}
            <div className="flex items-center gap-3 p-3 rounded-[14px] bg-surface-soft dark:bg-surface-dark-elevated border border-hairline/60">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white font-semibold text-xs"
                style={{
                  backgroundColor:
                    transaksi.rekening_tujuan_data?.warna || "#05b169",
                }}
              >
                {transaksi.rekening_tujuan_data?.nama?.charAt(0).toUpperCase() ??
                  "T"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-muted-foreground font-medium">
                  Rekening Tujuan
                </p>
                <p className="text-sm font-semibold text-foreground truncate">
                  {transaksi.rekening_tujuan_data?.nama ?? "Rekening Tujuan"}
                </p>
                {transaksi.rekening_tujuan_data?.jenis && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    {transaksi.rekening_tujuan_data.jenis}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[20px] p-4 border border-hairline bg-card flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white font-semibold text-xs"
              style={{
                backgroundColor: transaksi.rekening?.warna || "#0052ff",
              }}
            >
              {transaksi.rekening?.nama?.charAt(0).toUpperCase() ?? "R"}
            </div>
            <div className="min-w-0">
              <span className="text-xs text-muted-foreground font-medium">
                Rekening
              </span>
              <p className="text-sm font-semibold text-foreground truncate">
                {transaksi.rekening?.nama ?? "Belum ditentukan"}
              </p>
            </div>
          </div>
          {transaksi.rekening?.jenis && (
            <Badge
              variant="secondary"
              className="rounded-full text-xs px-2.5 py-0.5 bg-surface-strong text-muted-foreground border-none shrink-0"
            >
              {transaksi.rekening.jenis}
            </Badge>
          )}
        </div>
      )}

      {/* 3. Grid Metadata Detail */}
      <div className="rounded-[20px] p-4 border border-hairline bg-card divide-y divide-hairline">
        {/* Tanggal & Waktu */}
        <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 gap-4">
          <div className="flex items-center gap-2 text-muted-foreground shrink-0">
            <Calendar className="h-4 w-4" />
            <span className="text-xs font-medium">Tanggal</span>
          </div>
          <span className="text-sm font-medium text-foreground text-right">
            {formatTanggal(transaksi.tanggal)}
          </span>
        </div>

        {waktuLabel && (
          <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 gap-4">
            <div className="flex items-center gap-2 text-muted-foreground shrink-0">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">Waktu</span>
            </div>
            <span className="font-mono text-sm font-medium text-foreground text-right">
              {waktuLabel}
            </span>
          </div>
        )}

        {/* Kategori (jika ada) */}
        {transaksi.kategori && (
          <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 gap-4">
            <div className="flex items-center gap-2 text-muted-foreground shrink-0">
              <Tag className="h-4 w-4" />
              <span className="text-xs font-medium">Kategori</span>
            </div>
            <span className="text-sm font-medium text-foreground text-right flex items-center gap-1.5 truncate">
              {transaksi.kategori.ikon && (
                <span>{transaksi.kategori.ikon}</span>
              )}
              <span className="truncate">{transaksi.kategori.nama}</span>
            </span>
          </div>
        )}

        {/* ID Transaksi */}
        <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 gap-4">
          <span className="text-xs font-medium text-muted-foreground shrink-0">
            ID Referensi
          </span>
          <span className="font-mono text-[11px] text-muted-foreground/80 truncate max-w-50 select-all">
            {transaksi.id}
          </span>
        </div>
      </div>

      {/* 4. Catatan Section */}
      {transaksi.catatan && (
        <div className="rounded-[20px] p-4 border border-hairline bg-card space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <FileText className="h-3.5 w-3.5" />
            <span>Catatan</span>
          </div>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap wrap-break-word leading-relaxed pl-1">
            {transaksi.catatan}
          </p>
        </div>
      )}

      {/* 5. User Tags Section */}
      {userTags.length > 0 && (
        <div className="rounded-[20px] p-4 border border-hairline bg-card space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Tag className="h-3.5 w-3.5" />
            <span>Tags ({userTags.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {userTags.map((tag, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="rounded-full bg-surface-strong text-foreground/80 text-xs px-3 py-1 border-none font-normal"
              >
                #{tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
