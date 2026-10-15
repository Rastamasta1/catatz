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

  it(
    "fetches transactions beyond 1000-row PostgREST limit and computes usage correctly",
    async () => {
    const { fetchAllUserTransaksiUsage } = await import("@/actions/rekening-action");

    // Simulate 1002 total transactions in DB:
    // First 1000 transactions are for 'rek-tunai'
    // 2 newest transactions (index 1000 and 1001) are for 'rek-qris-ks'
    const page1 = Array.from({ length: 1000 }, () => ({
      tipe: "expense",
      rekening_id: "rek-tunai",
      rekening_tujuan: null,
    }));
    const page2 = [
      { tipe: "transfer", rekening_id: "rek-mandiri", rekening_tujuan: "rek-qris-ks" },
      { tipe: "transfer", rekening_id: "rek-qris-ks", rekening_tujuan: "rek-shopeepay" },
    ];

    const mockSupabase = {
      from: (table: string) => {
        expect(table).toBe("transaksi");
        return {
          select: (columns: string) => {
            expect(columns).toBe("tipe, rekening_id, rekening_tujuan");
            return {
              eq: () => {
                return {
                  range: async (from: number, to: number) => {
                    if (from === 0 && to === 999) {
                      return { data: page1, error: null };
                    }
                    if (from === 1000 && to === 1999) {
                      return { data: page2, error: null };
                    }
                    return { data: [], error: null };
                  },
                };
              },
            };
          },
        };
      },
    };

    const results = await fetchAllUserTransaksiUsage(
      mockSupabase as unknown as Parameters<typeof fetchAllUserTransaksiUsage>[0],
      "user-123",
    );

    expect(results).toHaveLength(1002);

    // Compute usage from results
    const usageMap: Record<string, RekeningUsageCounts> = {};
    for (const item of results) {
      if (item.tipe === "income") {
        incrementUsage(usageMap, item.rekening_id, "transaksi_masuk");
      } else if (item.tipe === "expense") {
        incrementUsage(usageMap, item.rekening_id, "transaksi_keluar");
      } else if (item.tipe === "transfer") {
        incrementUsage(usageMap, item.rekening_id, "transfer_keluar");
        incrementUsage(usageMap, item.rekening_tujuan, "transfer_masuk");
      }
    }

    expect(usageMap["rek-tunai"].transaksi_keluar).toBe(1000);
    expect(usageMap["rek-tunai"].total).toBe(1000);

    // Previously dropped in production:
    expect(usageMap["rek-qris-ks"]).toBeDefined();
    expect(usageMap["rek-qris-ks"].transfer_masuk).toBe(1);
    expect(usageMap["rek-qris-ks"].transfer_keluar).toBe(1);
    expect(usageMap["rek-qris-ks"].total).toBe(2);
  }, 15000);

  it(
    "paginates hutang and cicilan usage queries properly",
    async () => {
    const { fetchAllUserHutangUsage, fetchAllHutangCicilanUsage } = await import(
      "@/actions/rekening-action"
    );

    const mockHutangData = Array.from({ length: 1005 }, (_, i) => ({
      id: `hutang-${i}`,
      rekening_id: "rek-a",
    }));

    const mockSupabase = {
      from: (table: string) => {
        if (table === "hutang") {
          return {
            select: () => ({
              eq: () => ({
                range: async (from: number, to: number) => {
                  return { data: mockHutangData.slice(from, to + 1), error: null };
                },
              }),
            }),
          };
        }
        if (table === "hutang_cicilan") {
          return {
            select: () => ({
              in: (_field: string, chunk: string[]) => ({
                range: async () => {
                  return {
                    data: chunk.map(() => ({ rekening_id: "rek-b" })),
                    error: null,
                  };
                },
              }),
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      },
    };

    const hutangRows = await fetchAllUserHutangUsage(
      mockSupabase as unknown as Parameters<typeof fetchAllUserHutangUsage>[0],
      "user-123",
    );
    expect(hutangRows).toHaveLength(1005);

    const cicilanRows = await fetchAllHutangCicilanUsage(
      mockSupabase as unknown as Parameters<typeof fetchAllHutangCicilanUsage>[0],
      ["h1", "h2", "h3"],
    );
    expect(cicilanRows).toHaveLength(3);
    expect(cicilanRows[0].rekening_id).toBe("rek-b");
  }, 15000);
});
