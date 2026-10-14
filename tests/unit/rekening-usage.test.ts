import { describe, expect, it } from "vitest";
import type { RekeningUsageCounts } from "@/types/rekening";

function emptyRekeningUsageCounts(): RekeningUsageCounts {
  return {
    transaksi_masuk: 0,
    transaksi_keluar: 0,
    transfer_keluar: 0,
    transfer_masuk: 0,
    koreksi_saldo: 0,
    hutang: 0,
    hutang_cicilan: 0,
    recurring_asal: 0,
    recurring_tujuan: 0,
    transaksi_asal: 0,
    transaksi_tujuan: 0,
    total: 0,
  };
}

function incrementUsage(
  map: Record<string, RekeningUsageCounts>,
  id: string | null | undefined,
  key: Exclude<keyof RekeningUsageCounts, "total" | "transaksi_asal" | "transaksi_tujuan">,
) {
  if (!id) return;
  map[id] ??= emptyRekeningUsageCounts();
  map[id][key] += 1;
  map[id].total += 1;
}

function usageDescription(usage: RekeningUsageCounts) {
  const parts = [
    usage.transaksi_masuk > 0
      ? `${usage.transaksi_masuk} transaksi pemasukan`
      : null,
    usage.transaksi_keluar > 0
      ? `${usage.transaksi_keluar} transaksi pengeluaran`
      : null,
    usage.transfer_keluar > 0
      ? `${usage.transfer_keluar} transfer keluar`
      : null,
    usage.transfer_masuk > 0
      ? `${usage.transfer_masuk} transfer masuk`
      : null,
    usage.koreksi_saldo > 0
      ? `${usage.koreksi_saldo} koreksi saldo`
      : null,
    usage.hutang > 0 ? `${usage.hutang} hutang/piutang` : null,
    usage.hutang_cicilan > 0
      ? `${usage.hutang_cicilan} cicilan hutang/piutang`
      : null,
    usage.recurring_asal > 0
      ? `${usage.recurring_asal} transaksi berulang`
      : null,
    usage.recurring_tujuan > 0
      ? `${usage.recurring_tujuan} transfer berulang`
      : null,
  ].filter(Boolean);

  if (parts.length === 0 && usage.transaksi_asal > 0) {
    parts.push(`${usage.transaksi_asal} transaksi`);
  }
  if (parts.length === 0 && usage.transaksi_tujuan > 0) {
    parts.push(`${usage.transaksi_tujuan} transfer masuk`);
  }

  return `Rekening ini masih dipakai oleh ${parts.join(", ")}. Hapus data terkait terlebih dahulu sebelum menghapus rekening.`;
}

describe("Rekening Usage Calculation Logic", () => {
  it("properly attributes outgoing and incoming transfers to both source and destination accounts with granular details", () => {
    const usageMap: Record<string, RekeningUsageCounts> = {};

    const transactions = [
      // Income into Rekening A
      { tipe: "income", rekening_id: "rek-a", rekening_tujuan: null },
      // Expense from Rekening A
      { tipe: "expense", rekening_id: "rek-a", rekening_tujuan: null },
      // Correction on Rekening A
      { tipe: "correction", rekening_id: "rek-a", rekening_tujuan: null },
      // Transfer from Rekening A to Rekening B
      { tipe: "transfer", rekening_id: "rek-a", rekening_tujuan: "rek-b" },
      // Transfer back from Rekening B to Rekening A
      { tipe: "transfer", rekening_id: "rek-b", rekening_tujuan: "rek-a" },
    ];

    for (const item of transactions) {
      if (item.tipe === "income") {
        incrementUsage(usageMap, item.rekening_id, "transaksi_masuk");
      } else if (item.tipe === "expense") {
        incrementUsage(usageMap, item.rekening_id, "transaksi_keluar");
      } else if (item.tipe === "correction") {
        incrementUsage(usageMap, item.rekening_id, "koreksi_saldo");
      } else if (item.tipe === "transfer") {
        incrementUsage(usageMap, item.rekening_id, "transfer_keluar");
        incrementUsage(usageMap, item.rekening_tujuan, "transfer_masuk");
        if (item.rekening_tujuan && usageMap[item.rekening_tujuan]) {
          usageMap[item.rekening_tujuan].transaksi_tujuan += 1;
        }
      }
      if (item.rekening_id && usageMap[item.rekening_id]) {
        usageMap[item.rekening_id].transaksi_asal += 1;
      }
    }

    // Rekening A:
    // 1 pemasukan, 1 pengeluaran, 1 koreksi saldo, 1 transfer keluar, 1 transfer masuk = total 5
    expect(usageMap["rek-a"]).toBeDefined();
    expect(usageMap["rek-a"].transaksi_masuk).toBe(1);
    expect(usageMap["rek-a"].transaksi_keluar).toBe(1);
    expect(usageMap["rek-a"].koreksi_saldo).toBe(1);
    expect(usageMap["rek-a"].transfer_keluar).toBe(1);
    expect(usageMap["rek-a"].transfer_masuk).toBe(1);
    expect(usageMap["rek-a"].total).toBe(5);

    // Rekening B:
    // 1 transfer keluar, 1 transfer masuk = total 2
    expect(usageMap["rek-b"]).toBeDefined();
    expect(usageMap["rek-b"].transfer_keluar).toBe(1);
    expect(usageMap["rek-b"].transfer_masuk).toBe(1);
    expect(usageMap["rek-b"].total).toBe(2);

    // Verify detailed message
    const descA = usageDescription(usageMap["rek-a"]);
    expect(descA).toContain("1 transaksi pemasukan");
    expect(descA).toContain("1 transaksi pengeluaran");
    expect(descA).toContain("1 transfer keluar");
    expect(descA).toContain("1 transfer masuk");
    expect(descA).toContain("1 koreksi saldo");

    const descB = usageDescription(usageMap["rek-b"]);
    expect(descB).toContain("1 transfer keluar");
    expect(descB).toContain("1 transfer masuk");
  });

  it("does not increment destination usage for non-transfer rows with leftover values", () => {
    const usageMap: Record<string, RekeningUsageCounts> = {};

    const dirtyRows = [
      // An income transaction that accidentally has a dirty rekening_tujuan
      { tipe: "income", rekening_id: "rek-a", rekening_tujuan: "rek-b" },
    ];

    for (const item of dirtyRows) {
      if (item.tipe === "income") {
        incrementUsage(usageMap, item.rekening_id, "transaksi_masuk");
      }
    }

    // Rekening B should have no usage attributed
    expect(usageMap["rek-b"]).toBeUndefined();
    expect(usageMap["rek-a"].total).toBe(1);
    expect(usageMap["rek-a"].transaksi_masuk).toBe(1);
  });
});
