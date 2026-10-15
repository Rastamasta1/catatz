import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTransaksiFilter } from "@/hooks/use-transaksi-filter";
import type { Transaksi } from "@/types/transaksi";

const mockTransaksiList: Transaksi[] = [
  {
    id: "tx-1",
    user_id: "user-1",
    tipe: "income",
    judul: "Gaji",
    nominal: 5000000,
    tanggal: "2026-03-10",
    waktu: "10:00:00",
    kategori_id: "kat-1",
    rekening_id: "rek-a",
    rekening_tujuan: null,
    catatan: null,
    tags: [],
    is_recurring: false,
    recurring_id: null,
    created_at: "2026-03-10T10:00:00Z",
    updated_at: "2026-03-10T10:00:00Z",
  },
  {
    id: "tx-2",
    user_id: "user-1",
    tipe: "expense",
    judul: "Belanja",
    nominal: 200000,
    tanggal: "2026-03-11",
    waktu: "12:00:00",
    kategori_id: "kat-2",
    rekening_id: "rek-b",
    rekening_tujuan: null,
    catatan: null,
    tags: [],
    is_recurring: false,
    recurring_id: null,
    created_at: "2026-03-11T12:00:00Z",
    updated_at: "2026-03-11T12:00:00Z",
  },
  {
    id: "tx-3",
    user_id: "user-1",
    tipe: "transfer",
    judul: null,
    nominal: 1000000,
    tanggal: "2026-03-12",
    waktu: "14:00:00",
    kategori_id: null,
    rekening_id: "rek-a", // Rekening A transfer ke Rekening B
    rekening_tujuan: "rek-b",
    catatan: "Transfer tabungan",
    tags: [],
    is_recurring: false,
    recurring_id: null,
    created_at: "2026-03-12T14:00:00Z",
    updated_at: "2026-03-12T14:00:00Z",
  },
  {
    id: "tx-4",
    user_id: "user-1",
    tipe: "transfer",
    judul: null,
    nominal: 500000,
    tanggal: "2026-03-13",
    waktu: "15:00:00",
    kategori_id: null,
    rekening_id: "rek-b", // Rekening B transfer balik ke Rekening A
    rekening_tujuan: "rek-a",
    catatan: "Transfer balik",
    tags: [],
    is_recurring: false,
    recurring_id: null,
    created_at: "2026-03-13T15:00:00Z",
    updated_at: "2026-03-13T15:00:00Z",
  },
  {
    id: "tx-5",
    user_id: "user-1",
    tipe: "correction",
    judul: null,
    nominal: 50000,
    tanggal: "2026-03-14",
    waktu: "09:00:00",
    kategori_id: null,
    rekening_id: "rek-b",
    rekening_tujuan: null,
    catatan: null,
    tags: ["correction_add"],
    is_recurring: false,
    recurring_id: null,
    created_at: "2026-03-14T09:00:00Z",
    updated_at: "2026-03-14T09:00:00Z",
  },
  {
    id: "tx-6",
    user_id: "user-1",
    tipe: "transfer",
    judul: null,
    nominal: 300000,
    tanggal: "2026-03-15",
    waktu: "11:00:00",
    kategori_id: null,
    rekening_id: "rek-c", // Transfer antar rekening lain
    rekening_tujuan: "rek-d",
    catatan: "C ke D",
    tags: [],
    is_recurring: false,
    recurring_id: null,
    created_at: "2026-03-15T11:00:00Z",
    updated_at: "2026-03-15T11:00:00Z",
  },
];

describe("useTransaksiFilter - Rekening Transfer Accounting", () => {
  const baseParams = {
    transaksi: mockTransaksiList,
    preset: "all",
    baseDate: new Date("2026-03-15"),
    dateFilter: {},
  };

  it("shows all transactions when no filter is applied", () => {
    const { result } = renderHook(() => useTransaksiFilter(baseParams));
    expect(result.current.filtered).toHaveLength(6);
  });

  it("includes both incoming and outgoing transfers when filtering by Rekening A", () => {
    const { result } = renderHook(() => useTransaksiFilter(baseParams));

    act(() => {
      result.current.setFilter((prev) => ({
        ...prev,
        rekening_id: ["rek-a"],
      }));
    });

    const txIds = result.current.filtered.map((t) => t.id);
    // tx-1: income rek-a
    // tx-3: transfer keluar rek-a -> rek-b
    // tx-4: transfer masuk rek-b -> rek-a
    expect(txIds).toContain("tx-1");
    expect(txIds).toContain("tx-3");
    expect(txIds).toContain("tx-4");
    // tx-2 (rek-b expense), tx-5 (rek-b correction), tx-6 (rek-c->rek-d) must not be included
    expect(txIds).not.toContain("tx-2");
    expect(txIds).not.toContain("tx-5");
    expect(txIds).not.toContain("tx-6");
    expect(result.current.filtered).toHaveLength(3);
  });

  it("includes both incoming and outgoing transfers, expense, and correction when filtering by Rekening B", () => {
    const { result } = renderHook(() => useTransaksiFilter(baseParams));

    act(() => {
      result.current.setFilter((prev) => ({
        ...prev,
        rekening_id: ["rek-b"],
      }));
    });

    const txIds = result.current.filtered.map((t) => t.id);
    // tx-2: expense rek-b
    // tx-3: transfer masuk rek-a -> rek-b
    // tx-4: transfer keluar rek-b -> rek-a
    // tx-5: correction rek-b
    expect(txIds).toContain("tx-2");
    expect(txIds).toContain("tx-3");
    expect(txIds).toContain("tx-4");
    expect(txIds).toContain("tx-5");
    // tx-1 (rek-a income) and tx-6 (rek-c->rek-d) must not be included
    expect(txIds).not.toContain("tx-1");
    expect(txIds).not.toContain("tx-6");
    expect(result.current.filtered).toHaveLength(4);
  });

  it("filters correctly when combining rekening_id with tipe transfer", () => {
    const { result } = renderHook(() => useTransaksiFilter(baseParams));

    act(() => {
      result.current.setFilter((prev) => ({
        ...prev,
        rekening_id: ["rek-b"],
        tipe: ["transfer"],
      }));
    });

    const txIds = result.current.filtered.map((t) => t.id);
    // Only transfer transactions involving rek-b: tx-3 and tx-4
    expect(txIds).toEqual(["tx-4", "tx-3"]);
  });

  it("filters correctly by nominal_min", () => {
    const { result } = renderHook(() => useTransaksiFilter(baseParams));

    act(() => {
      result.current.setFilter((prev) => ({
        ...prev,
        nominal_min: 1000000,
      }));
    });

    // tx-1 (5.000.000) and tx-3 (1.000.000)
    const txIds = result.current.filtered.map((t) => t.id);
    expect(txIds).toContain("tx-1");
    expect(txIds).toContain("tx-3");
    expect(txIds).not.toContain("tx-2"); // 200.000
    expect(txIds).not.toContain("tx-4"); // 500.000
    expect(txIds).not.toContain("tx-5"); // 50.000
    expect(txIds).not.toContain("tx-6"); // 300.000
    expect(result.current.filtered).toHaveLength(2);
  });

  it("filters correctly by nominal_max", () => {
    const { result } = renderHook(() => useTransaksiFilter(baseParams));

    act(() => {
      result.current.setFilter((prev) => ({
        ...prev,
        nominal_max: 300000,
      }));
    });

    // tx-2 (200.000), tx-5 (50.000), tx-6 (300.000)
    const txIds = result.current.filtered.map((t) => t.id);
    expect(txIds).toContain("tx-2");
    expect(txIds).toContain("tx-5");
    expect(txIds).toContain("tx-6");
    expect(txIds).not.toContain("tx-1"); // 5.000.000
    expect(txIds).not.toContain("tx-3"); // 1.000.000
    expect(txIds).not.toContain("tx-4"); // 500.000
    expect(result.current.filtered).toHaveLength(3);
  });

  it("filters correctly by nominal range (min and max)", () => {
    const { result } = renderHook(() => useTransaksiFilter(baseParams));

    act(() => {
      result.current.setFilter((prev) => ({
        ...prev,
        nominal_min: 300000,
        nominal_max: 1000000,
      }));
    });

    // tx-3 (1.000.000), tx-4 (500.000), tx-6 (300.000)
    const txIds = result.current.filtered.map((t) => t.id);
    expect(txIds).toEqual(["tx-6", "tx-4", "tx-3"]);
  });

  it("filters correctly by transfer_asal_id (Sumber Dana)", () => {
    const { result } = renderHook(() => useTransaksiFilter(baseParams));

    act(() => {
      result.current.setFilter((prev) => ({
        ...prev,
        tipe: ["transfer"],
        transfer_asal_id: "rek-a",
      }));
    });

    // Only tx-3 (rek-a -> rek-b)
    const txIds = result.current.filtered.map((t) => t.id);
    expect(txIds).toEqual(["tx-3"]);
  });

  it("filters correctly by transfer_tujuan_id (Tujuan Transfer)", () => {
    const { result } = renderHook(() => useTransaksiFilter(baseParams));

    act(() => {
      result.current.setFilter((prev) => ({
        ...prev,
        tipe: ["transfer"],
        transfer_tujuan_id: "rek-a",
      }));
    });

    // Only tx-4 (rek-b -> rek-a)
    const txIds = result.current.filtered.map((t) => t.id);
    expect(txIds).toEqual(["tx-4"]);
  });

  it("filters correctly when combining transfer_asal_id, transfer_tujuan_id, and nominal range", () => {
    const { result } = renderHook(() => useTransaksiFilter(baseParams));

    act(() => {
      result.current.setFilter((prev) => ({
        ...prev,
        tipe: ["transfer"],
        transfer_asal_id: "rek-c",
        transfer_tujuan_id: "rek-d",
        nominal_min: 200000,
        nominal_max: 500000,
      }));
    });

    // tx-6 (rek-c -> rek-d, 300.000)
    const txIds = result.current.filtered.map((t) => t.id);
    expect(txIds).toEqual(["tx-6"]);
  });
});
