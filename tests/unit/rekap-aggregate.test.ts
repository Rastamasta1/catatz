import { describe, it, expect } from "vitest";
import {
  aggregateRekapByPeriods,
  type AggregateTransaksiItem,
  type AggregateHutangItem,
  type AggregateCicilanItem,
} from "@/lib/rekap-aggregate";

describe("rekap-aggregate pure engine", () => {
  const samplePeriod = {
    startDate: "2026-04-10",
    endDate: "2026-05-09",
    label: "10 Apr - 09 Mei 2026",
  };

  describe("1. Transaksi tepat di batas dari/sampai", () => {
    it("harus memasukkan transaksi tepat pada tanggal mulai dan selesai, serta mengabaikan di luar batas", () => {
      const transaksi: AggregateTransaksiItem[] = [
        // H-1 sebelum startDate (di luar)
        {
          id: "t0",
          tipe: "income",
          nominal: 100000,
          tanggal: "2026-04-09",
        },
        // Tepat pada startDate (di dalam batas)
        {
          id: "t1",
          tipe: "income",
          nominal: 250000,
          tanggal: "2026-04-10",
        },
        // Di tengah periode (di dalam batas)
        {
          id: "t2",
          tipe: "expense",
          nominal: 75000,
          tanggal: "2026-04-25",
        },
        // Tepat pada endDate (di dalam batas)
        {
          id: "t3",
          tipe: "expense",
          nominal: 50000,
          tanggal: "2026-05-09",
        },
        // H+1 setelah endDate (di luar batas)
        {
          id: "t4",
          tipe: "income",
          nominal: 300000,
          tanggal: "2026-05-10",
        },
      ];

      const results = aggregateRekapByPeriods([samplePeriod], {
        transaksi,
        hutang: [],
        cicilan: [],
      });

      expect(results).toHaveLength(1);
      const res = results[0];

      // Income yang masuk hanya t1 (250.000)
      expect(res.total_income).toBe(250000);
      // Expense yang masuk t2 (75.000) + t3 (50.000) = 125.000
      expect(res.total_expense).toBe(125000);
      // Net = 250.000 - 125.000 = 125.000
      expect(res.net).toBe(125000);
      // Tanggal dan metadata periode tetap dipertahankan
      expect(res.startDate).toBe("2026-04-10");
      expect(res.endDate).toBe("2026-05-09");
      expect(res.label).toBe("10 Apr - 09 Mei 2026");
    });
  });

  describe("2. Transfer & koreksi tidak masuk income/expense (D12)", () => {
    it("harus mengabaikan transfer dari total_income dan total_expense", () => {
      const transaksi: AggregateTransaksiItem[] = [
        {
          id: "trf-1",
          tipe: "transfer",
          nominal: 1000000,
          tanggal: "2026-04-15",
        },
        {
          id: "inc-1",
          tipe: "income",
          nominal: 500000,
          tanggal: "2026-04-20",
        },
      ];

      const [res] = aggregateRekapByPeriods([samplePeriod], {
        transaksi,
        hutang: [],
        cicilan: [],
      });

      expect(res.total_income).toBe(500000);
      expect(res.total_expense).toBe(0);
      expect(res.net).toBe(500000);
    });

    it("harus memisahkan transaksi koreksi ke ringkasan koreksi tanpa masuk income/expense", () => {
      const transaksi: AggregateTransaksiItem[] = [
        {
          id: "cor-1",
          tipe: "correction",
          nominal: 100000,
          tanggal: "2026-04-15",
          tags: ["correction_add"],
        },
        {
          id: "cor-2",
          tipe: "correction",
          nominal: 40000,
          tanggal: "2026-04-20",
          tags: ["correction_sub"],
        },
        {
          id: "inc-1",
          tipe: "income",
          nominal: 200000,
          tanggal: "2026-04-12",
        },
      ];

      const [res] = aggregateRekapByPeriods([samplePeriod], {
        transaksi,
        hutang: [],
        cicilan: [],
      });

      // Income/expense murni
      expect(res.total_income).toBe(200000);
      expect(res.total_expense).toBe(0);
      expect(res.net).toBe(200000);

      // Objek koreksi
      expect(res.koreksi.total_tambah).toBe(100000);
      expect(res.koreksi.total_kurang).toBe(40000);
      expect(res.koreksi.net).toBe(60000);
      expect(res.koreksi.count).toBe(2);
    });
  });

  describe("3. Periode kosong", () => {
    it("harus menghasilkan nilai 0 yang konsisten jika periode tidak memiliki aktivitas transaksi atau hutang", () => {
      const [res] = aggregateRekapByPeriods([samplePeriod], {
        transaksi: [],
        hutang: [],
        cicilan: [],
      });

      expect(res.total_income).toBe(0);
      expect(res.total_expense).toBe(0);
      expect(res.net).toBe(0);

      expect(res.hutang_piutang.piutang_baru).toBe(0);
      expect(res.hutang_piutang.hutang_baru).toBe(0);
      expect(res.hutang_piutang.cicilan_piutang).toBe(0);
      expect(res.hutang_piutang.cicilan_hutang).toBe(0);
      expect(res.hutang_piutang.net_arus_kas).toBe(0);
      expect(res.net_arus_kas_hutang_piutang).toBe(0);

      expect(res.koreksi.total_tambah).toBe(0);
      expect(res.koreksi.total_kurang).toBe(0);
      expect(res.koreksi.net).toBe(0);
      expect(res.koreksi.count).toBe(0);
    });

    it("harus mengembalikan array kosong jika input periode kosong", () => {
      const results = aggregateRekapByPeriods([], {
        transaksi: [
          {
            id: "t1",
            tipe: "income",
            nominal: 100000,
            tanggal: "2026-04-10",
          },
        ],
      });
      expect(results).toEqual([]);
    });
  });

  describe("4. Hutang dengan/tanpa cicilan dan rumus arus kas bersih D8", () => {
    it("harus menghitung arus kas hutang baru dan cicilan hutang secara tepat", () => {
      // Skenario A: Pinjaman baru diterima (kas masuk) dan bayar cicilan hutang (kas keluar)
      const hutang: AggregateHutangItem[] = [
        {
          id: "h1",
          tipe: "menerima", // hutang baru = kas masuk
          total_pinjaman: 1000000,
          tanggal_mulai: "2026-04-15",
        },
      ];

      const cicilan: AggregateCicilanItem[] = [
        {
          id: "c1",
          nominal: 200000, // bayar cicilan hutang = kas keluar
          tanggal: "2026-04-28",
          tipe_hutang_snapshot: "menerima",
          hutang: { tipe: "menerima" },
        },
      ];

      const [res] = aggregateRekapByPeriods([samplePeriod], {
        transaksi: [],
        hutang,
        cicilan,
      });

      expect(res.hutang_piutang.hutang_baru).toBe(1000000);
      expect(res.hutang_piutang.cicilan_hutang).toBe(200000);
      expect(res.hutang_piutang.piutang_baru).toBe(0);
      expect(res.hutang_piutang.cicilan_piutang).toBe(0);

      // Rumus D8: (hutang_baru + cicilan_piutang) - (piutang_baru + cicilan_hutang)
      // (1.000.000 + 0) - (0 + 200.000) = 800.000
      expect(res.hutang_piutang.net_arus_kas).toBe(800000);
      expect(res.net_arus_kas_hutang_piutang).toBe(800000);
    });

    it("harus menghitung piutang baru (memberi pinjaman) tanpa cicilan", () => {
      // Skenario B: Memberikan pinjaman Rp 500.000 (kas keluar)
      const hutang: AggregateHutangItem[] = [
        {
          id: "p1",
          tipe: "memberi", // piutang baru = kas keluar
          total_pinjaman: 500000,
          tanggal_mulai: "2026-04-12",
        },
      ];

      const [res] = aggregateRekapByPeriods([samplePeriod], {
        transaksi: [],
        hutang,
        cicilan: [],
      });

      expect(res.hutang_piutang.piutang_baru).toBe(500000);
      expect(res.hutang_piutang.hutang_baru).toBe(0);
      // Arus kas bersih = -500.000
      expect(res.hutang_piutang.net_arus_kas).toBe(-500000);
      expect(res.net_arus_kas_hutang_piutang).toBe(-500000);
    });

    it("harus menghitung cicilan piutang masuk tanpa ada hutang/piutang baru dalam periode", () => {
      // Skenario C: Terima cicilan piutang Rp 150.000 (kas masuk)
      const cicilan: AggregateCicilanItem[] = [
        {
          id: "c2",
          nominal: 150000,
          tanggal: "2026-04-20",
          tipe_hutang_snapshot: "memberi",
          hutang: { tipe: "memberi" },
        },
      ];

      const [res] = aggregateRekapByPeriods([samplePeriod], {
        transaksi: [],
        hutang: [],
        cicilan,
      });

      expect(res.hutang_piutang.cicilan_piutang).toBe(150000);
      expect(res.hutang_piutang.net_arus_kas).toBe(150000);
      expect(res.net_arus_kas_hutang_piutang).toBe(150000);
    });

    it("harus mengabaikan hutang dan cicilan yang berada di luar rentang periode", () => {
      const hutang: AggregateHutangItem[] = [
        {
          id: "h-luar",
          tipe: "menerima",
          total_pinjaman: 5000000,
          tanggal_mulai: "2026-05-15", // setelah endDate
        },
      ];

      const cicilan: AggregateCicilanItem[] = [
        {
          id: "c-luar",
          nominal: 500000,
          tanggal: "2026-04-01", // sebelum startDate
          tipe_hutang_snapshot: "menerima",
        },
      ];

      const [res] = aggregateRekapByPeriods([samplePeriod], {
        transaksi: [],
        hutang,
        cicilan,
      });

      expect(res.hutang_piutang.hutang_baru).toBe(0);
      expect(res.hutang_piutang.cicilan_hutang).toBe(0);
      expect(res.hutang_piutang.net_arus_kas).toBe(0);
    });
  });

  describe("5. Multiple Periods Bucketing", () => {
    it("harus mengelompokkan data ke dalam beberapa periode berbeda secara independen", () => {
      const periods = [
        {
          startDate: "2026-04-01",
          endDate: "2026-04-30",
          label: "April 2026",
        },
        {
          startDate: "2026-05-01",
          endDate: "2026-05-31",
          label: "Mei 2026",
        },
      ];

      const transaksi: AggregateTransaksiItem[] = [
        {
          id: "t1",
          tipe: "income",
          nominal: 100000,
          tanggal: "2026-04-15",
        },
        {
          id: "t2",
          tipe: "expense",
          nominal: 40000,
          tanggal: "2026-05-10",
        },
      ];

      const results = aggregateRekapByPeriods(periods, { transaksi });

      expect(results).toHaveLength(2);
      expect(results[0].total_income).toBe(100000);
      expect(results[0].total_expense).toBe(0);
      expect(results[1].total_income).toBe(0);
      expect(results[1].total_expense).toBe(40000);
    });

    it("harus mendukung input periode dengan key alternatif (dari/sampai, tanggal_mulai/tanggal_selesai)", () => {
      const periods = [
        {
          dari: "2026-01-01",
          sampai: "2026-01-31",
        },
        {
          tanggal_mulai: "2026-02-01",
          tanggal_selesai: "2026-02-28",
        },
      ];

      const results = aggregateRekapByPeriods(periods, { transaksi: [] });

      expect(results[0].startDate).toBe("2026-01-01");
      expect(results[0].endDate).toBe("2026-01-31");
      expect(results[1].startDate).toBe("2026-02-01");
      expect(results[1].endDate).toBe("2026-02-28");
    });
  });
});
