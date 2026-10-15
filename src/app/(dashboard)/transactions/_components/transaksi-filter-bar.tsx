"use client";

import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Rekening } from "@/types/rekening";
import type { Kategori, TransaksiFilter, TipeTransaksi } from "@/types/transaksi";
import { Button } from "@/components/ui/button";
import { ClearableInput } from "@/components/common/clearable-input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { TransaksiFilterSheet } from "./transaksi-filter-sheet";
import { useSystemPreferences } from "@/providers/system-preference-provider";

export type TransaksiFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  filter: TransaksiFilter;
  onFilterChange: Dispatch<SetStateAction<TransaksiFilter>>;
  rekening: Rekening[];
  kategori: Kategori[];
  onAddClick: () => void;
};

const TIPE_MAP: Record<TipeTransaksi, string> = {
  income: "Pemasukan",
  expense: "Pengeluaran",
  transfer: "Transfer",
  correction: "Koreksi Saldo",
};

export function TransaksiFilterBar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  rekening,
  kategori,
  onAddClick,
}: TransaksiFilterBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { formatRupiah } = useSystemPreferences();

  // Hitung jumlah filter yang sedang aktif
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filter.tipe && filter.tipe.length > 0) count += 1;
    if (filter.transfer_asal_id) count += 1;
    if (filter.transfer_tujuan_id) count += 1;
    if (filter.rekening_id && filter.rekening_id.length > 0)
      count += filter.rekening_id.length;
    if (filter.kategori_id && filter.kategori_id.length > 0)
      count += filter.kategori_id.length;
    if (
      (filter.nominal_min !== undefined &&
        filter.nominal_min !== null &&
        filter.nominal_min > 0) ||
      (filter.nominal_max !== undefined &&
        filter.nominal_max !== null &&
        filter.nominal_max > 0)
    ) {
      count += 1;
    }
    if (
      filter.sortBy &&
      (filter.sortBy !== "tanggal" || filter.sortOrder !== "desc")
    ) {
      count += 1;
    }
    return count;
  }, [filter]);

  // Hapus semua filter aktif
  const handleClearAll = () => {
    onFilterChange((prev) => ({
      ...prev,
      tipe: [],
      rekening_id: [],
      kategori_id: [],
      nominal_min: undefined,
      nominal_max: undefined,
      transfer_asal_id: undefined,
      transfer_tujuan_id: undefined,
      sortBy: "tanggal",
      sortOrder: "desc",
    }));
  };

  // Handler penghapusan badge individual
  const removeTipe = () => {
    onFilterChange((prev) => ({
      ...prev,
      tipe: [],
      transfer_asal_id: undefined,
      transfer_tujuan_id: undefined,
    }));
  };

  const removeTransferAsal = () => {
    onFilterChange((prev) => ({ ...prev, transfer_asal_id: undefined }));
  };

  const removeTransferTujuan = () => {
    onFilterChange((prev) => ({ ...prev, transfer_tujuan_id: undefined }));
  };

  const removeRekening = (id: string) => {
    onFilterChange((prev) => ({
      ...prev,
      rekening_id: (prev.rekening_id ?? []).filter((item) => item !== id),
    }));
  };

  const removeKategori = (id: string) => {
    onFilterChange((prev) => ({
      ...prev,
      kategori_id: (prev.kategori_id ?? []).filter((item) => item !== id),
    }));
  };

  const removeNominal = () => {
    onFilterChange((prev) => ({
      ...prev,
      nominal_min: undefined,
      nominal_max: undefined,
    }));
  };

  const removeSort = () => {
    onFilterChange((prev) => ({
      ...prev,
      sortBy: "tanggal",
      sortOrder: "desc",
    }));
  };

  // Label rekening transfer
  const transferAsalRek = useMemo(
    () => rekening.find((r) => r.id === filter.transfer_asal_id),
    [rekening, filter.transfer_asal_id],
  );

  const transferTujuanRek = useMemo(
    () => rekening.find((r) => r.id === filter.transfer_tujuan_id),
    [rekening, filter.transfer_tujuan_id],
  );

  return (
    <div className="flex flex-col gap-2.5">
      {/* ── Baris 1: Filter + Search + Tambah Transaksi (1 baris pada mobile & desktop) ── */}
      <div className="flex items-center gap-2 w-full">
        {/* 1. Tombol Filter */}
        <Button
          type="button"
          variant="outline"
          onClick={() => setSheetOpen(true)}
          className="h-12 px-3 sm:px-4 rounded-full border border-hairline bg-background hover:bg-surface-soft font-medium text-sm flex items-center justify-center gap-1.5 sm:gap-2 shrink-0 transition-colors cursor-pointer"
          id="btn-filter-trigger"
          aria-label="Filter transaksi"
        >
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="bg-primary text-white hover:bg-primary rounded-full text-[11px] px-1.5 py-0 min-w-5 h-5 flex items-center justify-center font-mono font-medium"
              id="badge-filter-count"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {/* 2. Input Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <ClearableInput
            placeholder="Cari judul, atau catatan..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onClear={() => onSearchChange("")}
            className="pl-9 w-full"
            id="input-cari-transaksi"
          />
        </div>

        {/* 3. Tombol Tambah Transaksi (pada mobile hanya ikon +, desktop menampilkan teks) */}
        <Button
          type="button"
          onClick={onAddClick}
          aria-label="Transaksi Baru"
          title="Transaksi Baru"
          className="h-12 w-12 sm:w-auto p-0 sm:px-5 bg-primary hover:bg-[#003ecc] text-white rounded-full font-semibold flex items-center justify-center gap-2 shrink-0 transition-colors cursor-pointer"
          id="btn-tambah-transaksi"
        >
          <Plus className="h-5 w-5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Transaksi Baru</span>
        </Button>
      </div>

      {/* ── Baris 2: Badge Filter Aktif (muncul ketika ada filter aktif) ── */}
      {activeFilterCount > 0 && (
        <div
          className="flex flex-wrap items-center gap-1.5 pt-0.5"
          id="active-filter-badges"
        >
          {/* Badge Tipe */}
          {filter.tipe && filter.tipe.length > 0 && (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface-strong text-foreground border border-hairline transition-colors"
              id="badge-filter-tipe"
            >
              <span>
                Tipe:{" "}
                {filter.tipe.length === 1
                  ? TIPE_MAP[filter.tipe[0]] ?? filter.tipe[0]
                  : `${filter.tipe.length} dipilih`}
              </span>
              <button
                type="button"
                onClick={removeTipe}
                className="hover:text-semantic-down text-muted-foreground transition-colors p-0.5 rounded-full cursor-pointer"
                aria-label="Hapus filter tipe"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {/* Badge Sumber Dana Transfer */}
          {filter.transfer_asal_id && (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface-strong text-foreground border border-hairline transition-colors"
              id="badge-filter-transfer-asal"
            >
              <span className="flex items-center gap-1">
                Sumber Dana: {transferAsalRek?.nama ?? "Rekening"}
              </span>
              <button
                type="button"
                onClick={removeTransferAsal}
                className="hover:text-semantic-down text-muted-foreground transition-colors p-0.5 rounded-full cursor-pointer"
                aria-label="Hapus filter sumber dana"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {/* Badge Rekening Tujuan Transfer */}
          {filter.transfer_tujuan_id && (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface-strong text-foreground border border-hairline transition-colors"
              id="badge-filter-transfer-tujuan"
            >
              <span className="flex items-center gap-1">
                Rekening Tujuan: {transferTujuanRek?.nama ?? "Rekening"}
              </span>
              <button
                type="button"
                onClick={removeTransferTujuan}
                className="hover:text-semantic-down text-muted-foreground transition-colors p-0.5 rounded-full cursor-pointer"
                aria-label="Hapus filter rekening tujuan"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {/* Badge Rekening Umum */}
          {filter.rekening_id?.map((rekId) => {
            const rek = rekening.find((r) => r.id === rekId);
            return (
              <span
                key={rekId}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface-strong text-foreground border border-hairline transition-colors"
                id={`badge-filter-rek-${rekId}`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: rek?.warna }}
                />
                <span>Rekening: {rek?.nama ?? "Rekening"}</span>
                <button
                  type="button"
                  onClick={() => removeRekening(rekId)}
                  className="hover:text-semantic-down text-muted-foreground transition-colors p-0.5 rounded-full cursor-pointer"
                  aria-label={`Hapus filter rekening ${rek?.nama}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}

          {/* Badge Kategori */}
          {filter.kategori_id?.map((katId) => {
            const kat = kategori.find((k) => k.id === katId);
            return (
              <span
                key={katId}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface-strong text-foreground border border-hairline transition-colors"
                id={`badge-filter-kat-${katId}`}
              >
                {kat?.ikon && <span>{kat.ikon}</span>}
                <span>Kategori: {kat?.nama ?? "Kategori"}</span>
                <button
                  type="button"
                  onClick={() => removeKategori(katId)}
                  className="hover:text-semantic-down text-muted-foreground transition-colors p-0.5 rounded-full cursor-pointer"
                  aria-label={`Hapus filter kategori ${kat?.nama}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}

          {/* Badge Rentang Nominal */}
          {((filter.nominal_min !== undefined &&
            filter.nominal_min !== null &&
            filter.nominal_min > 0) ||
            (filter.nominal_max !== undefined &&
              filter.nominal_max !== null &&
              filter.nominal_max > 0)) && (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface-strong text-foreground border border-hairline transition-colors font-mono"
              id="badge-filter-nominal"
            >
              <span>
                {filter.nominal_min && filter.nominal_max
                  ? `Nominal: ${formatRupiah(filter.nominal_min)} - ${formatRupiah(filter.nominal_max)}`
                  : filter.nominal_min
                    ? `Nominal: ≥ ${formatRupiah(filter.nominal_min)}`
                    : `Nominal: ≤ ${formatRupiah(filter.nominal_max!)}`}
              </span>
              <button
                type="button"
                onClick={removeNominal}
                className="hover:text-semantic-down text-muted-foreground transition-colors p-0.5 rounded-full cursor-pointer"
                aria-label="Hapus filter rentang nominal"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {/* Badge Urutan (jika bukan default terbaru) */}
          {filter.sortBy &&
            (filter.sortBy !== "tanggal" || filter.sortOrder !== "desc") && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface-strong text-foreground border border-hairline transition-colors"
                id="badge-filter-sort"
              >
                <span>
                  Urutan:{" "}
                  {filter.sortBy === "nominal"
                    ? filter.sortOrder === "asc"
                      ? "Nominal Terkecil"
                      : "Nominal Terbesar"
                    : filter.sortBy === "tanggal" && filter.sortOrder === "asc"
                      ? "Terlama"
                      : "Kustom"}
                </span>
                <button
                  type="button"
                  onClick={removeSort}
                  className="hover:text-semantic-down text-muted-foreground transition-colors p-0.5 rounded-full cursor-pointer"
                  aria-label="Reset urutan ke default"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

          {/* Tombol Hapus Semua */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-semantic-down rounded-full font-medium cursor-pointer"
            id="btn-hapus-semua-filter"
          >
            Hapus Semua
          </Button>
        </div>
      )}

      {/* ── Sheet Filter Panel ── */}
      <TransaksiFilterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        filter={filter}
        onFilterChange={onFilterChange}
        rekening={rekening}
        kategori={kategori}
      />
    </div>
  );
}
