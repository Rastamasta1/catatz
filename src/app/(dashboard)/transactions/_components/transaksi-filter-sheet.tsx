"use client";

import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Rekening } from "@/types/rekening";
import type { Kategori, TransaksiFilter, TipeTransaksi } from "@/types/transaksi";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NominalInput } from "@/components/common/nominal-input";
import { cn } from "@/lib/utils";
import { Check, RotateCcw } from "lucide-react";

export type TransaksiFilterSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter: TransaksiFilter;
  onFilterChange: Dispatch<SetStateAction<TransaksiFilter>>;
  rekening: Rekening[];
  kategori: Kategori[];
};

export function TransaksiFilterSheet({
  open,
  onOpenChange,
  filter,
  onFilterChange,
  rekening,
  kategori,
}: TransaksiFilterSheetProps) {
  const [kategoriSearch, setKategoriSearch] = useState("");

  // Tipe segmented control: "all" | "expense" | "income" | "transfer"
  const currentTipe =
    filter.tipe && filter.tipe.length === 1 && ["expense", "income", "transfer"].includes(filter.tipe[0])
      ? filter.tipe[0]
      : "all";

  const isTransfer = currentTipe === "transfer";

  const handleTipeChange = (val: string) => {
    onFilterChange((prev) => {
      if (val === "all") {
        return {
          ...prev,
          tipe: [],
          transfer_asal_id: undefined,
          transfer_tujuan_id: undefined,
        };
      }
      if (val === "transfer") {
        return {
          ...prev,
          tipe: ["transfer"],
          kategori_id: [], // transfer tidak memiliki kategori
        };
      }
      return {
        ...prev,
        tipe: [val as TipeTransaksi],
        transfer_asal_id: undefined,
        transfer_tujuan_id: undefined,
      };
    });
  };

  const handleToggleRekening = (id: string) => {
    onFilterChange((prev) => {
      const current = prev.rekening_id ?? [];
      const updated = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      return { ...prev, rekening_id: updated };
    });
  };

  const handleToggleKategori = (id: string) => {
    onFilterChange((prev) => {
      const current = prev.kategori_id ?? [];
      const updated = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      return { ...prev, kategori_id: updated };
    });
  };

  const handleReset = () => {
    onFilterChange({
      tipe: [],
      rekening_id: [],
      kategori_id: [],
      nominal_min: undefined,
      nominal_max: undefined,
      transfer_asal_id: undefined,
      transfer_tujuan_id: undefined,
      sortBy: "tanggal",
      sortOrder: "desc",
    });
    setKategoriSearch("");
  };

  // Kategori yang relevan berdasarkan tipe transaksi aktif
  const filteredKategori = useMemo(() => {
    let list = kategori;
    if (currentTipe === "expense") {
      list = list.filter((k) => k.tipe === "expense" || k.tipe === "all");
    } else if (currentTipe === "income") {
      list = list.filter((k) => k.tipe === "income" || k.tipe === "all");
    }
    if (kategoriSearch.trim()) {
      const q = kategoriSearch.trim().toLowerCase();
      list = list.filter((k) => k.nama.toLowerCase().includes(q));
    }
    return list;
  }, [kategori, currentTipe, kategoriSearch]);

  const selectedRek = filter.rekening_id ?? [];
  const selectedKat = filter.kategori_id ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col gap-0 bg-card text-card-foreground border-hairline shadow-lg"
      >
        <SheetHeader className="px-6 py-5 border-b border-hairline shrink-0 text-left">
          <SheetTitle className="text-lg font-semibold text-foreground">
            Filter Transaksi
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Atur kriteria untuk menyaring daftar transaksi Anda.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* 1. Tipe Transaksi (Segmented Control) */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">
              Tipe Transaksi
            </Label>
            <Tabs
              value={currentTipe}
              onValueChange={handleTipeChange}
              className="w-full"
            >
              <TabsList className="w-full grid grid-cols-4 p-1 bg-surface-strong rounded-[10px] h-11">
                <TabsTrigger
                  value="all"
                  className="rounded-[8px] text-[11px] sm:text-xs font-medium px-1"
                  id="tab-filter-semua"
                >
                  Semua
                </TabsTrigger>
                <TabsTrigger
                  value="expense"
                  className="rounded-[8px] text-[11px] sm:text-xs font-medium px-1"
                  id="tab-filter-pengeluaran"
                >
                  Pengeluaran
                </TabsTrigger>
                <TabsTrigger
                  value="income"
                  className="rounded-[8px] text-[11px] sm:text-xs font-medium px-1"
                  id="tab-filter-pemasukan"
                >
                  Pemasukan
                </TabsTrigger>
                <TabsTrigger
                  value="transfer"
                  className="rounded-[8px] text-[11px] sm:text-xs font-medium px-1"
                  id="tab-filter-transfer"
                >
                  Transfer
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* 2. Filter Transfer: Sumber Dana & Tujuan Transfer (HANYA tampil saat tipe Transfer) */}
          {isTransfer ? (
            <div className="space-y-4 rounded-xl bg-surface-soft p-4 border border-hairline">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Alur Transfer
                </span>
                {(filter.transfer_asal_id || filter.transfer_tujuan_id) && (
                  <button
                    type="button"
                    onClick={() =>
                      onFilterChange((prev) => ({
                        ...prev,
                        transfer_asal_id: undefined,
                        transfer_tujuan_id: undefined,
                      }))
                    }
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Reset Alur
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="filter-transfer-asal" className="text-xs text-foreground font-medium">
                  Sumber Dana (Rekening Asal)
                </Label>
                <Select
                  value={filter.transfer_asal_id ?? "all"}
                  onValueChange={(val) =>
                    onFilterChange((prev) => ({
                      ...prev,
                      transfer_asal_id: val === "all" ? undefined : val,
                    }))
                  }
                >
                  <SelectTrigger id="filter-transfer-asal" className="h-11 rounded-input border-hairline bg-background text-sm">
                    <SelectValue placeholder="Semua Sumber Dana" />
                  </SelectTrigger>
                  <SelectContent className="z-60">
                    <SelectItem value="all">Semua Sumber Dana</SelectItem>
                    {rekening.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: r.warna }}
                          />
                          <span>{r.nama}</span>
                          <span className="text-xs text-muted-foreground font-normal">
                            ({r.jenis})
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="filter-transfer-tujuan" className="text-xs text-foreground font-medium">
                  Tujuan Transfer (Rekening Tujuan)
                </Label>
                <Select
                  value={filter.transfer_tujuan_id ?? "all"}
                  onValueChange={(val) =>
                    onFilterChange((prev) => ({
                      ...prev,
                      transfer_tujuan_id: val === "all" ? undefined : val,
                    }))
                  }
                >
                  <SelectTrigger id="filter-transfer-tujuan" className="h-11 rounded-input border-hairline bg-background text-sm">
                    <SelectValue placeholder="Semua Tujuan" />
                  </SelectTrigger>
                  <SelectContent className="z-60">
                    <SelectItem value="all">Semua Tujuan</SelectItem>
                    {rekening.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: r.warna }}
                          />
                          <span>{r.nama}</span>
                          <span className="text-xs text-muted-foreground font-normal">
                            ({r.jenis})
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <>
              {/* 3. Filter Rekening (saat BUKAN transfer) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-foreground">
                    Rekening
                  </Label>
                  {selectedRek.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        onFilterChange((prev) => ({ ...prev, rekening_id: [] }))
                      }
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Reset ({selectedRek.length})
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {rekening.map((r) => {
                    const isSelected = selectedRek.includes(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleToggleRekening(r.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer",
                          isSelected
                            ? "bg-primary text-white border-primary"
                            : "bg-surface-soft text-foreground border-hairline hover:bg-surface-strong"
                        )}
                        id={`filter-rek-${r.id}`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: isSelected ? "#ffffff" : r.warna }}
                        />
                        <span>{r.nama}</span>
                        {isSelected && <Check className="h-3 w-3 stroke-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Filter Kategori (saat BUKAN transfer) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-foreground">
                    Kategori
                  </Label>
                  {selectedKat.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        onFilterChange((prev) => ({ ...prev, kategori_id: [] }))
                      }
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Reset ({selectedKat.length})
                    </button>
                  )}
                </div>

                {kategori.length > 8 && (
                  <input
                    type="text"
                    placeholder="Cari kategori..."
                    value={kategoriSearch}
                    onChange={(e) => setKategoriSearch(e.target.value)}
                    className="w-full h-9 px-3 rounded-input border border-hairline bg-background text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  />
                )}

                <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-0.5">
                  {filteredKategori.map((k) => {
                    const isSelected = selectedKat.includes(k.id);
                    return (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => handleToggleKategori(k.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer",
                          isSelected
                            ? "bg-primary text-white border-primary"
                            : "bg-surface-soft text-foreground border-hairline hover:bg-surface-strong"
                        )}
                        id={`filter-kat-${k.id}`}
                      >
                        <span>{k.ikon}</span>
                        <span>{k.nama}</span>
                        {isSelected && <Check className="h-3 w-3 stroke-3" />}
                      </button>
                    );
                  })}
                  {filteredKategori.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2">
                      Tidak ada kategori yang cocok.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* 5. Filter Rentang Nominal */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-foreground">
                Rentang Nominal
              </Label>
              {(filter.nominal_min || filter.nominal_max) && (
                <button
                  type="button"
                  onClick={() =>
                    onFilterChange((prev) => ({
                      ...prev,
                      nominal_min: undefined,
                      nominal_max: undefined,
                    }))
                  }
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Reset Nominal
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 items-center">
              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium">
                  Nominal Minimum
                </span>
                <NominalInput
                  id="filter-nominal-min"
                  placeholder="Rp Min"
                  value={filter.nominal_min ?? ""}
                  onValueChange={(val) =>
                    onFilterChange((prev) => ({
                      ...prev,
                      nominal_min:
                        typeof val === "number"
                          ? val
                          : val === ""
                            ? undefined
                            : Number(val),
                    }))
                  }
                  className="h-11 rounded-input text-sm font-mono border-hairline"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium">
                  Nominal Maksimum
                </span>
                <NominalInput
                  id="filter-nominal-max"
                  placeholder="Rp Max"
                  value={filter.nominal_max ?? ""}
                  onValueChange={(val) =>
                    onFilterChange((prev) => ({
                      ...prev,
                      nominal_max:
                        typeof val === "number"
                          ? val
                          : val === ""
                            ? undefined
                            : Number(val),
                    }))
                  }
                  className="h-11 rounded-input text-sm font-mono border-hairline"
                />
              </div>
            </div>
          </div>

          {/* 6. Urutkan (Sort) */}
          <div className="space-y-1.5">
            <Label htmlFor="filter-sort-select" className="text-sm font-semibold text-foreground">
              Urutkan
            </Label>
            <Select
              value={`${filter.sortBy ?? "tanggal"}-${filter.sortOrder ?? "desc"}`}
              onValueChange={(v) => {
                const [by, order] = v.split("-") as [
                  TransaksiFilter["sortBy"],
                  TransaksiFilter["sortOrder"],
                ];
                onFilterChange((f) => ({ ...f, sortBy: by, sortOrder: order }));
              }}
            >
              <SelectTrigger id="filter-sort-select" className="h-11 rounded-input border-hairline bg-background text-sm">
                <SelectValue placeholder="Urutkan" />
              </SelectTrigger>
              <SelectContent className="z-60">
                <SelectItem value="tanggal-desc">📅 Terbaru</SelectItem>
                <SelectItem value="tanggal-asc">📅 Terlama</SelectItem>
                <SelectItem value="nominal-desc">💰 Terbesar</SelectItem>
                <SelectItem value="nominal-asc">💰 Terkecil</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="px-6 py-4 border-t border-hairline bg-card shrink-0 flex flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="rounded-full h-11 px-4 text-xs font-medium border-hairline hover:bg-surface-soft gap-1.5"
            id="btn-reset-filter-sheet"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>

          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full h-11 px-6 bg-primary hover:bg-[#003ecc] text-white font-semibold text-xs transition-colors flex-1"
            id="btn-apply-filter-sheet"
          >
            Terapkan Filter
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
