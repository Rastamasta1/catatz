import { describe, it, expect } from "vitest";
import {
  rekapSettingsSchema,
  customPeriodSchema,
  dateRangeSchema,
  DEFAULT_REKAP_SETTINGS,
} from "@/validations/rekap-validation";

describe("rekapSettingsSchema", () => {
  it("harus menerima default settings yang valid", () => {
    const result = rekapSettingsSchema.safeParse(DEFAULT_REKAP_SETTINGS);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cutoff_day).toBe(1);
      expect(result.data.akumulasi_saldo).toBe(false);
    }
  });

  describe("batas cutoff_day (1..31)", () => {
    it("harus menerima batas bawah cutoff_day = 1", () => {
      const result = rekapSettingsSchema.safeParse({
        cutoff_day: 1,
        akumulasi_saldo: true,
      });
      expect(result.success).toBe(true);
    });

    it("harus menerima batas atas cutoff_day = 31", () => {
      const result = rekapSettingsSchema.safeParse({
        cutoff_day: 31,
        akumulasi_saldo: false,
      });
      expect(result.success).toBe(true);
    });

    it("harus menerima nilai tengah cutoff_day = 15", () => {
      const result = rekapSettingsSchema.safeParse({
        cutoff_day: 15,
        akumulasi_saldo: true,
      });
      expect(result.success).toBe(true);
    });

    it("harus menolak cutoff_day < 1 (contoh: 0)", () => {
      const result = rekapSettingsSchema.safeParse({
        cutoff_day: 0,
        akumulasi_saldo: false,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Cut-off hari minimal 1");
      }
    });

    it("harus menolak cutoff_day negatif (contoh: -5)", () => {
      const result = rekapSettingsSchema.safeParse({
        cutoff_day: -5,
        akumulasi_saldo: false,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Cut-off hari minimal 1");
      }
    });

    it("harus menolak cutoff_day > 31 (contoh: 32)", () => {
      const result = rekapSettingsSchema.safeParse({
        cutoff_day: 32,
        akumulasi_saldo: false,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Cut-off hari maksimal 31");
      }
    });

    it("harus menolak cutoff_day bilangan pecahan/desimal", () => {
      const result = rekapSettingsSchema.safeParse({
        cutoff_day: 15.5,
        akumulasi_saldo: false,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          "Cut-off hari harus berupa bilangan bulat",
        );
      }
    });

    it("harus menolak jika cutoff_day bukan angka", () => {
      const result = rekapSettingsSchema.safeParse({
        cutoff_day: "15",
        akumulasi_saldo: false,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("akumulasi_saldo boolean", () => {
    it("harus menerima nilai true dan false", () => {
      expect(
        rekapSettingsSchema.safeParse({
          cutoff_day: 10,
          akumulasi_saldo: true,
        }).success,
      ).toBe(true);

      expect(
        rekapSettingsSchema.safeParse({
          cutoff_day: 10,
          akumulasi_saldo: false,
        }).success,
      ).toBe(true);
    });

    it("harus menolak nilai non-boolean", () => {
      const result = rekapSettingsSchema.safeParse({
        cutoff_day: 10,
        akumulasi_saldo: "true",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("customPeriodSchema", () => {
  const validData = {
    nama: "Liburan Akhir Tahun",
    tanggal_mulai: "2026-12-20",
    tanggal_selesai: "2026-12-31",
  };

  it("harus menerima data periode custom yang valid", () => {
    const result = customPeriodSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nama).toBe("Liburan Akhir Tahun");
      expect(result.data.tanggal_mulai).toBe("2026-12-20");
      expect(result.data.tanggal_selesai).toBe("2026-12-31");
    }
  });

  it("harus menerima periode custom dengan tanggal mulai sama dengan tanggal selesai", () => {
    const result = customPeriodSchema.safeParse({
      nama: "Event 1 Hari",
      tanggal_mulai: "2026-05-15",
      tanggal_selesai: "2026-05-15",
    });
    expect(result.success).toBe(true);
  });

  describe("validasi nama (panjang 1..100 setelah trim)", () => {
    it("harus menolak nama string kosong", () => {
      const result = customPeriodSchema.safeParse({
        ...validData,
        nama: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Nama periode wajib diisi");
      }
    });

    it("harus menolak nama yang hanya berisi spasi whitespace (setelah trim)", () => {
      const result = customPeriodSchema.safeParse({
        ...validData,
        nama: "    ",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Nama periode wajib diisi");
      }
    });

    it("harus menerima nama 1 karakter", () => {
      const result = customPeriodSchema.safeParse({
        ...validData,
        nama: "Q",
      });
      expect(result.success).toBe(true);
    });

    it("harus menerima nama tepat 100 karakter", () => {
      const name100 = "A".repeat(100);
      const result = customPeriodSchema.safeParse({
        ...validData,
        nama: name100,
      });
      expect(result.success).toBe(true);
    });

    it("harus menolak nama 101 karakter", () => {
      const name101 = "A".repeat(101);
      const result = customPeriodSchema.safeParse({
        ...validData,
        nama: name101,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          "Nama periode maksimal 100 karakter",
        );
      }
    });

    it("harus melakukan trim pada nama dengan spasi di awal dan akhir", () => {
      const result = customPeriodSchema.safeParse({
        ...validData,
        nama: "   Proyek Khusus   ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nama).toBe("Proyek Khusus");
      }
    });
  });

  describe("validasi format tanggal YYYY-MM-DD", () => {
    it("harus menolak format DD-MM-YYYY", () => {
      const result = customPeriodSchema.safeParse({
        ...validData,
        tanggal_mulai: "20-12-2026",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          "Format tanggal harus YYYY-MM-DD",
        );
      }
    });

    it("harus menolak format YYYY/MM/DD", () => {
      const result = customPeriodSchema.safeParse({
        ...validData,
        tanggal_selesai: "2026/12/31",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          "Format tanggal harus YYYY-MM-DD",
        );
      }
    });

    it("harus menolak string sembarang bukan tanggal", () => {
      const result = customPeriodSchema.safeParse({
        ...validData,
        tanggal_mulai: "bukan-tanggal",
      });
      expect(result.success).toBe(false);
    });

    it("harus menolak tanggal kalender tidak valid (contoh: 30 Februari)", () => {
      const result = customPeriodSchema.safeParse({
        ...validData,
        tanggal_mulai: "2026-02-30",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Format tanggal tidak valid");
      }
    });

    it("harus menolak bulan kalender tidak valid (contoh: bulan 13)", () => {
      const result = customPeriodSchema.safeParse({
        ...validData,
        tanggal_selesai: "2026-13-01",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Format tanggal tidak valid");
      }
    });

    it("harus menolak hari melebihi batas bulan (contoh: 31 April)", () => {
      const result = customPeriodSchema.safeParse({
        ...validData,
        tanggal_mulai: "2026-04-31",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Format tanggal tidak valid");
      }
    });
  });

  describe("validasi rentang: selesai >= mulai", () => {
    it("harus menolak jika tanggal_selesai < tanggal_mulai dalam bulan yang sama", () => {
      const result = customPeriodSchema.safeParse({
        ...validData,
        tanggal_mulai: "2026-05-20",
        tanggal_selesai: "2026-05-10",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          "Tanggal selesai tidak boleh lebih awal dari tanggal mulai",
        );
        expect(result.error.issues[0]?.path).toEqual(["tanggal_selesai"]);
      }
    });

    it("harus menolak jika tanggal_selesai < tanggal_mulai antar tahun", () => {
      const result = customPeriodSchema.safeParse({
        ...validData,
        tanggal_mulai: "2026-01-01",
        tanggal_selesai: "2025-12-31",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          "Tanggal selesai tidak boleh lebih awal dari tanggal mulai",
        );
      }
    });
  });
});

describe("dateRangeSchema", () => {
  it("harus menerima rentang tanggal yang valid (sampai >= dari)", () => {
    const result = dateRangeSchema.safeParse({
      dari: "2026-04-01",
      sampai: "2026-04-30",
    });
    expect(result.success).toBe(true);
  });

  it("harus menerima rentang 1 hari (dari === sampai)", () => {
    const result = dateRangeSchema.safeParse({
      dari: "2026-04-15",
      sampai: "2026-04-15",
    });
    expect(result.success).toBe(true);
  });

  it("harus menolak jika sampai < dari", () => {
    const result = dateRangeSchema.safeParse({
      dari: "2026-04-15",
      sampai: "2026-04-10",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Tanggal sampai tidak boleh lebih awal dari tanggal dari",
      );
    }
  });

  it("harus menolak format tanggal dari yang salah", () => {
    const result = dateRangeSchema.safeParse({
      dari: "15-04-2026",
      sampai: "2026-04-30",
    });
    expect(result.success).toBe(false);
  });

  it("harus menolak format tanggal sampai yang salah", () => {
    const result = dateRangeSchema.safeParse({
      dari: "2026-04-01",
      sampai: "2026/04/30",
    });
    expect(result.success).toBe(false);
  });
});

