import { describe, expect, it } from "vitest";
import type { RekeningUsageCounts } from "@/types/rekening";

function emptyRekeningUsageCounts(): RekeningUsageCounts {
  return {
    transaksi_asal: 0,
    transaksi_tujuan: 0,
    hutang: 0,
    hutang_cicilan: 0,
    recurring_asal: 0,
    recurring_tujuan: 0,
    total: 0,
  };
}

function incrementUsage(
  map: Record<string, RekeningUsageCounts>,
  id: string | null | undefined,
  key: Exclude<keyof RekeningUsageCounts, "total">,
) {
  if (!id) return;
  map[id] ??= emptyRekeningUsageCounts();
  map[id][key] += 1;
  map[id].total += 1;
}

function usageDescription(usage: RekeningUsageCounts) {
  const parts = [
    usage.transaksi_asal > 0
      ? `${usage.transaksi_asal} transaksi (keluar/masuk/koreksi)`
      : null,
    usage.transaksi_tujuan > 0
      ? `${usage.transaksi_tujuan} transfer masuk`
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

  return `Rekening ini masih dipakai oleh ${parts.join(", ")}. Hapus data terkait terlebih dahulu sebelum menghapus rekening.`;
}

describe("Rekening Usage Calculation Logic", () => {
  it("properly attributes outgoing and incoming transfers to both source and destination accounts", () => {
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
      incrementUsage(usageMap, item.rekening_id, "transaksi_asal");
      if (item.tipe === "transfer") {
        incrementUsage(usageMap, item.rekening_tujuan, "transaksi_tujuan");
      }
    }

    // Rekening A:
    // transaksi_asal: 4 (income, expense, correction, transfer out to B)
    // transaksi_tujuan: 1 (transfer in from B)
    // total: 5
    expect(usageMap["rek-a"]).toBeDefined();
    expect(usageMap["rek-a"].transaksi_asal).toBe(4);
    expect(usageMap["rek-a"].transaksi_tujuan).toBe(1);
    expect(usageMap["rek-a"].total).toBe(5);

    // Rekening B:
    // transaksi_asal: 1 (transfer out to A)
    // transaksi_tujuan: 1 (transfer in from A)
    // total: 2
    expect(usageMap["rek-b"]).toBeDefined();
    expect(usageMap["rek-b"].transaksi_asal).toBe(1);
    expect(usageMap["rek-b"].transaksi_tujuan).toBe(1);
    expect(usageMap["rek-b"].total).toBe(2);

    expect(usageDescription(usageMap["rek-a"])).toContain(
      "4 transaksi (keluar/masuk/koreksi), 1 transfer masuk"
    );
    expect(usageDescription(usageMap["rek-b"])).toContain(
      "1 transaksi (keluar/masuk/koreksi), 1 transfer masuk"
    );
  });

  it("does not increment destination usage for non-transfer rows with leftover values", () => {
    const usageMap: Record<string, RekeningUsageCounts> = {};

    const dirtyRows = [
      // An income transaction that accidentally has a dirty rekening_tujuan
      { tipe: "income", rekening_id: "rek-a", rekening_tujuan: "rek-b" },
    ];

    for (const item of dirtyRows) {
      incrementUsage(usageMap, item.rekening_id, "transaksi_asal");
      if (item.tipe === "transfer") {
        incrementUsage(usageMap, item.rekening_tujuan, "transaksi_tujuan");
      }
    }

    // Rekening B should have no usage attributed
    expect(usageMap["rek-b"]).toBeUndefined();
    expect(usageMap["rek-a"].total).toBe(1);
  });
});
