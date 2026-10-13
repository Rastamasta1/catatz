import { describe, it, expect } from "vitest";
import {
  calculateSaldoAtDate,
  calculateSaldoForPeriods,
  type LedgerData,
  type RekeningBalanceItem,
} from "@/lib/rekap-balance";

describe("rekap-balance pure calculation engine (D7)", () => {
  const accountA: RekeningBalanceItem = {
    id: "rek-a",
    saldo_saat_ini: 1000000, // Rp 1.000.000
    exclude_total: false,
  };

  const accountB: RekeningBalanceItem = {
    id: "rek-b",
    saldo_saat_ini: 500000, // Rp 500.000
    exclude_total: false,
  };

  const accountExcluded: RekeningBalanceItem = {
    id: "rek-exc",
    saldo_saat_ini: 2000000, // Rp 2.000.000 (di-exclude)
    exclude_total: true,
  };

  const baseAccounts = [accountA, accountB, accountExcluded];
  // Total saldo rekening termasuk saat ini = 1.000.000 + 500.000 = 1.500.000

  describe("1. Income & Expense", () => {
    it("harus menghitung saldo mundur saat ada transaksi income dan expense setelah tanggal T", () => {
      // Saldo saat ini = 1.500.000
      // Pada T+1 (2026-04-15): ada income 300.000 pada rek-a (delta: +300.000)
      // Pada T+2 (2026-04-20): ada expense 100.000 pada rek-b (delta: -100.000)
      // Net delta setelah T = +300.000 - 100.000 = +200.000
      // Saldo akhir pada T (2026-04-10) harus = 1.500.000 - 200.000 = 1.300.000
      const data: LedgerData = {
        rekening: baseAccounts,
        transaksi: [
          {
            id: "tx-1",
            tipe: "income",
            nominal: 300000,
            tanggal: "2026-04-15",
            rekening_id: "rek-a",
          },
          {
            id: "tx-2",
            tipe: "expense",
            nominal: 100000,
            tanggal: "2026-04-20",
            rekening_id: "rek-b",
          },
        ],
      };

      const saldoAtT = calculateSaldoAtDate("2026-04-10", data);
      expect(saldoAtT).toBe(1300000);

      // Pada T+1 (2026-04-15): setelah income 300.000 tapi sebelum expense 100.000
      // Delta setelah 2026-04-15 adalah expense tx-2 (-100.000)
      // Saldo pada 2026-04-15 = 1.500.000 - (-100.000) = 1.600.000
      const saldoAtT1 = calculateSaldoAtDate("2026-04-15", data);
      expect(saldoAtT1).toBe(1600000);
    });
  });

  describe("2. Transfer antar rekening termasuk (Net 0)", () => {
    it("harus menghasilkan net delta 0 jika transfer terjadi antar dua rekening yang keduanya tidak di-exclude", () => {
      // Transfer 200.000 dari rek-a ke rek-b pada 2026-04-15
      // rek-a: -200.000, rek-b: +200.000 -> net delta pada total rekening termasuk = 0
      // Saldo pada 2026-04-10 tetap = 1.500.000
      const data: LedgerData = {
        rekening: baseAccounts,
        transaksi: [
          {
            id: "tx-trf",
            tipe: "transfer",
            nominal: 200000,
            tanggal: "2026-04-15",
            rekening_id: "rek-a",
            rekening_tujuan: "rek-b",
          },
        ],
      };

      const saldoAtT = calculateSaldoAtDate("2026-04-10", data);
      expect(saldoAtT).toBe(1500000);
    });
  });

  describe("3. Transfer ke dan dari rekening excluded", () => {
    it("harus memperhitungkan delta jika transfer melibatkan rekening excluded", () => {
      // Skenario A: Transfer 100.000 dari rek-a (termasuk) ke rek-exc (excluded) pada 2026-04-15
      // rek-a delta: -100.000, rek-exc diabaikan -> net delta ledger = -100.000
      // Saldo mundur pada 2026-04-10 = 1.500.000 - (-100.000) = 1.600.000
      const dataTransferOut: LedgerData = {
        rekening: baseAccounts,
        transaksi: [
          {
            id: "tx-trf-out",
            tipe: "transfer",
            nominal: 100000,
            tanggal: "2026-04-15",
            rekening_id: "rek-a",
            rekening_tujuan: "rek-exc",
          },
        ],
      };

      expect(calculateSaldoAtDate("2026-04-10", dataTransferOut)).toBe(1600000);

      // Skenario B: Transfer 50.000 dari rek-exc (excluded) ke rek-b (termasuk) pada 2026-04-15
      // rek-exc diabaikan, rek-b delta: +50.000 -> net delta ledger = +50.000
      // Saldo mundur pada 2026-04-10 = 1.500.000 - (+50.000) = 1.450.000
      const dataTransferIn: LedgerData = {
        rekening: baseAccounts,
        transaksi: [
          {
            id: "tx-trf-in",
            tipe: "transfer",
            nominal: 50000,
            tanggal: "2026-04-15",
            rekening_id: "rek-exc",
            rekening_tujuan: "rek-b",
          },
        ],
      };

      expect(calculateSaldoAtDate("2026-04-10", dataTransferIn)).toBe(1450000);
    });
  });

  describe("4. Koreksi Saldo (correction_add & correction_sub)", () => {
    it("harus memperhitungkan koreksi saldo add (+nominal) dan sub (-nominal)", () => {
      // Pada T+1: Koreksi add 50.000 (delta: +50.000)
      // Pada T+2: Koreksi sub 20.000 (delta: -20.000)
      // Net delta setelah T = +50.000 - 20.000 = +30.000
      // Saldo mundur pada T = 1.500.000 - 30.000 = 1.470.000
      const data: LedgerData = {
        rekening: baseAccounts,
        transaksi: [
          {
            id: "cor-1",
            tipe: "correction",
            nominal: 50000,
            tanggal: "2026-04-12",
            rekening_id: "rek-a",
            tags: ["correction_add"],
          },
          {
            id: "cor-2",
            tipe: "correction",
            nominal: 20000,
            tanggal: "2026-04-18",
            rekening_id: "rek-b",
            tags: ["correction_sub"],
          },
        ],
      };

      expect(calculateSaldoAtDate("2026-04-10", data)).toBe(1470000);
    });
  });

  describe("5. Hutang menerima/memberi dengan dan tanpa rekening", () => {
    it("harus menambah delta jika menerima hutang ke rekening, dan mengurangi delta jika memberi piutang dari rekening", () => {
      // Menerima pinjaman 500.000 masuk ke rek-a -> delta: +500.000
      // Memberi pinjaman 100.000 keluar dari rek-b -> delta: -100.000
      // Net delta = +400.000
      // Saldo mundur = 1.500.000 - 400.000 = 1.100.000
      const data: LedgerData = {
        rekening: baseAccounts,
        hutang: [
          {
            id: "h-1",
            tipe: "menerima",
            total_pinjaman: 500000,
            tanggal_mulai: "2026-04-15",
            rekening_id: "rek-a",
          },
          {
            id: "h-2",
            tipe: "memberi",
            total_pinjaman: 100000,
            tanggal_mulai: "2026-04-16",
            rekening_id: "rek-b",
          },
        ],
      };

      expect(calculateSaldoAtDate("2026-04-10", data)).toBe(1100000);
    });

    it("harus mengabaikan hutang yang dicatat tanpa rekening (rekening_id null)", () => {
      // Hutang tanpa rekening tidak memicu trigger update saldo rekening di database
      const data: LedgerData = {
        rekening: baseAccounts,
        hutang: [
          {
            id: "h-no-rek",
            tipe: "menerima",
            total_pinjaman: 1000000,
            tanggal_mulai: "2026-04-15",
            rekening_id: null,
          },
        ],
      };

      expect(calculateSaldoAtDate("2026-04-10", data)).toBe(1500000);
    });
  });

  describe("6. Cicilan Hutang & Piutang", () => {
    it("harus mengurangi delta saat bayar cicilan hutang (menerima), dan menambah delta saat terima cicilan piutang (memberi)", () => {
      // Bayar cicilan hutang 100.000 dari rek-a (tipe menerima) -> delta: -100.000
      // Terima cicilan piutang 50.000 ke rek-b (tipe memberi) -> delta: +50.000
      // Net delta = -50.000
      // Saldo mundur = 1.500.000 - (-50.000) = 1.550.000
      const data: LedgerData = {
        rekening: baseAccounts,
        cicilan: [
          {
            id: "c-1",
            nominal: 100000,
            tanggal: "2026-04-20",
            tipe_hutang_snapshot: "menerima",
            rekening_id: "rek-a",
          },
          {
            id: "c-2",
            nominal: 50000,
            tanggal: "2026-04-22",
            tipe_hutang_snapshot: "memberi",
            rekening_id: "rek-b",
          },
        ],
      };

      expect(calculateSaldoAtDate("2026-04-10", data)).toBe(1550000);
    });

    it("harus mengabaikan cicilan yang tidak memiliki rekening_id", () => {
      const data: LedgerData = {
        rekening: baseAccounts,
        cicilan: [
          {
            id: "c-no-rek",
            nominal: 500000,
            tanggal: "2026-04-20",
            tipe_hutang_snapshot: "menerima",
            rekening_id: null,
          },
        ],
      };

      expect(calculateSaldoAtDate("2026-04-10", data)).toBe(1500000);
    });
  });

  describe("7. Rekening Excluded Diabaikan", () => {
    it("harus sepenuhnya mengabaikan saldo awal/saat ini dan transaksi pada rekening exclude_total=true", () => {
      const data: LedgerData = {
        rekening: baseAccounts, // rek-exc punya 2.000.000 tapi exclude_total = true
        transaksi: [
          {
            id: "tx-exc",
            tipe: "income",
            nominal: 10000000, // 10 juta di rekening excluded
            tanggal: "2026-04-15",
            rekening_id: "rek-exc",
          },
        ],
      };

      // Saldo hanya berasal dari rek-a (1 jt) + rek-b (500 rb) = 1.5 jt
      // Transaksi 10 juta di rekening excluded tidak mempengaruhi saldo total yang dilacak
      expect(calculateSaldoAtDate("2026-04-10", data)).toBe(1500000);
    });
  });

  describe("8. Properti Rantai: saldoAwal[n] = saldoAkhir[n-1]", () => {
    it("harus menjamin kesinambungan tanpa celah antar-siklus", () => {
      // Siklus 1: 2026-03-10 s/d 2026-04-09
      // Siklus 2: 2026-04-10 s/d 2026-05-09
      // Siklus 3: 2026-05-10 s/d 2026-06-09
      const periods = [
        { startDate: "2026-03-10", endDate: "2026-04-09", id: "p1" },
        { startDate: "2026-04-10", endDate: "2026-05-09", id: "p2" },
        { startDate: "2026-05-10", endDate: "2026-06-09", id: "p3" },
      ];

      const data: LedgerData = {
        rekening: baseAccounts,
        transaksi: [
          {
            id: "t1",
            tipe: "income",
            nominal: 200000,
            tanggal: "2026-03-20",
            rekening_id: "rek-a",
          },
          {
            id: "t2",
            tipe: "expense",
            nominal: 100000,
            tanggal: "2026-04-15",
            rekening_id: "rek-b",
          },
          {
            id: "t3",
            tipe: "income",
            nominal: 500000,
            tanggal: "2026-05-15",
            rekening_id: "rek-a",
          },
        ],
      };

      const results = calculateSaldoForPeriods(periods, data);

      expect(results).toHaveLength(3);

      // Saldo awal Siklus 2 (2026-04-10) harus = Saldo akhir Siklus 1 (2026-04-09)
      expect(results[1].saldo_awal).toBe(results[0].saldo_akhir);

      // Saldo awal Siklus 3 (2026-05-10) harus = Saldo akhir Siklus 2 (2026-05-09)
      expect(results[2].saldo_awal).toBe(results[1].saldo_akhir);
    });
  });

  describe("9. Rekonsiliasi: Saldo akhir 'hari ini' = jumlah saldo_saat_ini rekening termasuk", () => {
    it("harus persis sama dengan total saldo_saat_ini rekening yang disertakan saat dihitung pada tanggal hari ini", () => {
      const today = "2026-04-30";

      const data: LedgerData = {
        rekening: baseAccounts,
        transaksi: [
          // Transaksi masa lalu (sebelum atau pada hari ini)
          {
            id: "t-past-1",
            tipe: "income",
            nominal: 500000,
            tanggal: "2026-04-01",
            rekening_id: "rek-a",
          },
          {
            id: "t-past-2",
            tipe: "expense",
            nominal: 200000,
            tanggal: "2026-04-30",
            rekening_id: "rek-b",
          },
        ],
        // Tidak ada transaksi masa depan (> today)
      };

      // Saldo akhir pada today harus 100% konsisten dengan sum(saldo_saat_ini) rekening termasuk:
      // rek-a (1.000.000) + rek-b (500.000) = 1.500.000
      const saldoToday = calculateSaldoAtDate(today, data);
      expect(saldoToday).toBe(1500000);
    });
  });

  describe("10. Penanganan Edge Cases & Fallback", () => {
    it("harus mengembalikan array kosong jika input periods kosong atau invalid", () => {
      const data: LedgerData = { rekening: baseAccounts };
      expect(calculateSaldoForPeriods([], data)).toEqual([]);
      expect(
        calculateSaldoForPeriods(
          null as unknown as Record<string, unknown>[],
          data,
        ),
      ).toEqual([]);
    });

    it("harus menangani nominal 0 atau tidak valid secara aman tanpa mengubah delta", () => {
      const data: LedgerData = {
        rekening: baseAccounts,
        transaksi: [
          {
            id: "tx-zero",
            tipe: "income",
            nominal: 0,
            tanggal: "2026-05-01",
            rekening_id: "rek-a",
          },
          {
            id: "tx-cor-no-tag",
            tipe: "correction",
            nominal: 25000,
            tanggal: "2026-05-02",
            rekening_id: "rek-a",
            // tags null/undefined -> default add
          },
        ],
        hutang: [
          {
            id: "h-zero",
            tipe: "menerima",
            total_pinjaman: 0,
            tanggal_mulai: "2026-05-01",
            rekening_id: "rek-a",
          },
        ],
        cicilan: [
          {
            id: "c-zero",
            nominal: 0,
            tanggal: "2026-05-01",
            tipe_hutang_snapshot: "menerima",
            rekening_id: "rek-a",
          },
        ],
      };

      // tx-zero (0), h-zero (0), c-zero (0) tidak mengubah delta.
      // tx-cor-no-tag (+25.000) mengubah delta: +25.000
      // Saldo pada 2026-04-10 = 1.500.000 - 25.000 = 1.475.000
      expect(calculateSaldoAtDate("2026-04-10", data)).toBe(1475000);
    });
  });
});

