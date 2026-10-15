import { TIPE_CONFIG } from "@/constants/transaksi";
import type { Transaksi } from "@/types/transaksi";

const SYSTEM_TAG_PREFIXES = ["correction_"];
const SYSTEM_TAGS = new Set(["correction_add", "correction_sub"]);

/**
 * Menyaring tag internal/sistem (seperti `correction_add`, `correction_sub`)
 * agar hanya tag buatan pengguna yang tampil di UI.
 */
export function filterSystemTags(tags?: string[] | null): string[] {
  if (!tags || !Array.isArray(tags)) return [];
  return tags.filter(
    (tag) =>
      typeof tag === "string" &&
      !SYSTEM_TAGS.has(tag) &&
      !SYSTEM_TAG_PREFIXES.some((prefix) => tag.startsWith(prefix)),
  );
}

/**
 * Mengidentifikasi arah koreksi saldo dari tag sistem internal.
 */
export function getCorrectionDirection(
  tags?: string[] | null,
): "add" | "sub" | null {
  if (!tags || !Array.isArray(tags)) return null;
  if (tags.includes("correction_add")) return "add";
  if (tags.includes("correction_sub")) return "sub";
  return null;
}

export type TransaksiNominalDisplay = {
  sign: string;
  label: string;
  colorClass: string;
  badgeClass: string;
  isNegative: boolean;
};

/**
 * Menghasilkan metadata tampilan nominal (sign prefix, label tipe, dan class warna semantik)
 * sesuai DESIGN.md dan tipe transaksi.
 */
export function getTransaksiNominalDisplay(
  transaksi: Pick<Transaksi, "tipe"> & {
    tags?: string[] | null;
  },
): TransaksiNominalDisplay {
  const { tipe, tags } = transaksi;

  if (tipe === "income") {
    return {
      sign: "+",
      label: "Pemasukan",
      colorClass: "text-semantic-up",
      badgeClass: TIPE_CONFIG.income.badge,
      isNegative: false,
    };
  }

  if (tipe === "expense") {
    return {
      sign: "-",
      label: "Pengeluaran",
      colorClass: "text-semantic-down",
      badgeClass: TIPE_CONFIG.expense.badge,
      isNegative: true,
    };
  }

  if (tipe === "transfer") {
    return {
      sign: "",
      label: "Transfer",
      colorClass: "text-foreground",
      badgeClass: TIPE_CONFIG.transfer.badge,
      isNegative: false,
    };
  }

  if (tipe === "correction") {
    const direction = getCorrectionDirection(tags);
    if (direction === "add") {
      return {
        sign: "+",
        label: "Koreksi (Penambahan)",
        colorClass: "text-accent-yellow",
        badgeClass: TIPE_CONFIG.correction.badge,
        isNegative: false,
      };
    }
    if (direction === "sub") {
      return {
        sign: "-",
        label: "Koreksi (Pengurangan)",
        colorClass: "text-accent-yellow",
        badgeClass: TIPE_CONFIG.correction.badge,
        isNegative: true,
      };
    }
    return {
      sign: "",
      label: "Koreksi Saldo",
      colorClass: "text-accent-yellow",
      badgeClass: TIPE_CONFIG.correction.badge,
      isNegative: false,
    };
  }

  return {
    sign: "",
    label: "Transaksi",
    colorClass: "text-foreground",
    badgeClass: "bg-surface-strong text-muted-foreground",
    isNegative: false,
  };
}

/**
 * Menentukan nama tampilan utama transaksi.
 * Untuk tipe transfer dan koreksi saldo, nama tampilan selalu label default (bukan catatan).
 */
export function getTransaksiDisplayName(
  transaksi: Pick<Transaksi, "tipe"> & {
    judul?: string | null;
    catatan?: string | null;
  },
): string {
  if (transaksi.tipe === "transfer" || transaksi.tipe === "correction") {
    return TIPE_CONFIG[transaksi.tipe]?.label ?? "Transaksi";
  }
  if (transaksi.judul?.trim()) return transaksi.judul.trim();
  if (transaksi.catatan?.trim()) return transaksi.catatan.trim();
  return TIPE_CONFIG[transaksi.tipe]?.label ?? "Transaksi";
}
