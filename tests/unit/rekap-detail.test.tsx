import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { rekapDetailQuerySchema } from "@/validations/rekap-validation";
import { ProporsiSaldoChart } from "@/app/(dashboard)/reports/detail/_components/proporsi-saldo-chart";
import { RekapDetailClient } from "@/app/(dashboard)/reports/detail/_components/rekap-detail-client";
import type { RekapDetailRange } from "@/actions/rekap-action";

const mockDetailBase: RekapDetailRange = {
  startDate: "2026-06-01",
  endDate: "2026-06-30",
  daysInPeriod: 30,
  daysInMonth: 30,
  total_income: 10000000,
  total_expense: 4000000,
  net: 6000000,
  rata_income_harian: 333333,
  rata_expense_harian: 133333,
  kategori: { income: [], expense: [] },
  judul: { income: [], expense: [] },
  koreksi: {
    total_tambah: 0,
    total_kurang: 0,
    net: 0,
    count: 0,
    items: [],
  },
  hutang_piutang: {
    piutang_baru: 0,
    hutang_baru: 0,
    cicilan_piutang: 0,
    cicilan_hutang: 0,
    piutang_aktif: 0,
    hutang_aktif: 0,
    count: 0,
    items: [],
  },
};

describe("rekapDetailQuerySchema", () => {
  it("validates valid bulanan query params", () => {
    const result = rekapDetailQuerySchema.safeParse({
      dari: "2026-06-01",
      sampai: "2026-06-30",
      jenis: "bulanan",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dari).toBe("2026-06-01");
      expect(result.data.sampai).toBe("2026-06-30");
      expect(result.data.jenis).toBe("bulanan");
      expect(result.data.id).toBeUndefined();
    }
  });

  it("validates valid custom query params with uuid id", () => {
    const result = rekapDetailQuerySchema.safeParse({
      dari: "2026-06-10",
      sampai: "2026-06-25",
      jenis: "custom",
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.jenis).toBe("custom");
      expect(result.data.id).toBe("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
    }
  });

  it("fails if tanggal format is invalid", () => {
    const result = rekapDetailQuerySchema.safeParse({
      dari: "01-06-2026",
      sampai: "2026-06-30",
      jenis: "bulanan",
    });

    expect(result.success).toBe(false);
  });

  it("fails if sampai is earlier than dari", () => {
    const result = rekapDetailQuerySchema.safeParse({
      dari: "2026-06-30",
      sampai: "2026-06-01",
      jenis: "bulanan",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("lebih awal");
    }
  });

  it("fails if jenis is invalid", () => {
    const result = rekapDetailQuerySchema.safeParse({
      dari: "2026-06-01",
      sampai: "2026-06-30",
      jenis: "harian",
    });

    expect(result.success).toBe(false);
  });

  it("fails if id is not a valid uuid", () => {
    const result = rekapDetailQuerySchema.safeParse({
      dari: "2026-06-01",
      sampai: "2026-06-30",
      jenis: "custom",
      id: "not-a-valid-uuid",
    });

    expect(result.success).toBe(false);
  });
});

describe("ProporsiSaldoChart", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders normal proportion with positive remaining balance", () => {
    render(
      <ProporsiSaldoChart
        totalExpense={4000000}
        totalIncome={10000000}
        saldoAwal={0}
        akumulasiAktif={false}
      />,
    );

    expect(screen.getByText("Proporsi Pengeluaran vs Sisa Saldo")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.queryByText("Defisit")).not.toBeInTheDocument();
  });

  it("renders deficit indicator when expense exceeds available funds (D9)", () => {
    render(
      <ProporsiSaldoChart
        totalExpense={6000000}
        totalIncome={4000000}
        saldoAwal={0}
        akumulasiAktif={false}
      />,
    );

    // Harus menampilkan badge Defisit & pesan peringatan
    expect(screen.getAllByText("Defisit").length).toBeGreaterThan(0);
    expect(screen.getByText(/Pengeluaran pada periode ini melebihi total dana masuk/)).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("incorporates saldo awal when akumulasiAktif is true (D9)", () => {
    // Total income 2jt, saldo awal 5jt -> total dana masuk 7jt. Expense 3.5jt -> Sisa 3.5jt (50% expense, 50% sisa)
    render(
      <ProporsiSaldoChart
        totalExpense={3500000}
        totalIncome={2000000}
        saldoAwal={5000000}
        akumulasiAktif={true}
      />,
    );

    // Pengeluaran 50% dan Sisa Saldo 50%
    expect(screen.getAllByText("50%").length).toBe(2);
    expect(screen.queryByText("Defisit")).not.toBeInTheDocument();
  });
});

describe("RekapDetailClient", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders back button to ?tab=bulanan and period label for bulanan", () => {
    render(
      <RekapDetailClient
        detail={mockDetailBase}
        settings={{ cutoff_day: 1, akumulasi_saldo: false }}
        jenis="bulanan"
      />,
    );

    const backLink = screen.getByRole("link", { name: /Kembali ke Bulanan/i });
    expect(backLink).toHaveAttribute("href", "/reports?tab=bulanan");
    expect(screen.getByText("Siklus Bulanan")).toBeInTheDocument();
    expect(screen.getByText("30 hari")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "01 Jun - 30 Jun 2026" })).toBeInTheDocument();
  });

  it("renders back button to ?tab=custom and custom name when provided", () => {
    render(
      <RekapDetailClient
        detail={mockDetailBase}
        settings={{ cutoff_day: 1, akumulasi_saldo: false }}
        jenis="custom"
        customName="Liburan Musim Panas"
      />,
    );

    const backLink = screen.getByRole("link", { name: /Kembali ke Custom/i });
    expect(backLink).toHaveAttribute("href", "/reports?tab=custom");
    expect(screen.getByText("Periode Custom")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Liburan Musim Panas" })).toBeInTheDocument();
    expect(screen.getByText("01 Jun - 30 Jun 2026")).toBeInTheDocument();
  });

  it("hides koreksi and hutang_piutang rows when there is no activity", () => {
    render(
      <RekapDetailClient
        detail={mockDetailBase}
        settings={{ cutoff_day: 1, akumulasi_saldo: false }}
        jenis="bulanan"
      />,
    );

    expect(screen.queryByText("Koreksi Saldo")).not.toBeInTheDocument();
    expect(screen.queryByText("Arus Kas Hutang & Piutang")).not.toBeInTheDocument();
  });

  it("renders koreksi row when koreksi.count > 0", () => {
    const detailWithKoreksi: RekapDetailRange = {
      ...mockDetailBase,
      koreksi: {
        total_tambah: 500000,
        total_kurang: 0,
        net: 500000,
        count: 1,
        items: [
          {
            id: "kor-1",
            arah: "tambah",
            nominal: 500000,
            tanggal: "2026-06-15",
            waktu: null,
            catatan: null,
            rekening: null,
          },
        ],
      },
    };

    render(
      <RekapDetailClient
        detail={detailWithKoreksi}
        settings={{ cutoff_day: 1, akumulasi_saldo: false }}
        jenis="bulanan"
      />,
    );

    expect(screen.getByText("Koreksi Saldo")).toBeInTheDocument();
    expect(screen.getByText("+Rp 500.000")).toBeInTheDocument();
  });

  it("renders hutang_piutang row with D8 net cashflow formula when count > 0", () => {
    // D8: (hutang_baru + cicilan_piutang) - (piutang_baru + cicilan_hutang)
    // misal: hutang_baru 2.000.000 (uang masuk +), cicilan_hutang 500.000 (uang keluar -)
    // net = 2.000.000 - 500.000 = +1.500.000
    const detailWithHutang: RekapDetailRange = {
      ...mockDetailBase,
      hutang_piutang: {
        piutang_baru: 0,
        hutang_baru: 2000000,
        cicilan_piutang: 0,
        cicilan_hutang: 500000,
        piutang_aktif: 0,
        hutang_aktif: 1500000,
        count: 2,
        items: [],
      },
    };

    render(
      <RekapDetailClient
        detail={detailWithHutang}
        settings={{ cutoff_day: 1, akumulasi_saldo: false }}
        jenis="bulanan"
      />,
    );

    expect(screen.getByText("Arus Kas Hutang & Piutang")).toBeInTheDocument();
    expect(screen.getByText("+Rp 1.500.000")).toBeInTheDocument();
  });

  it("renders Saldo Awal and Saldo Akhir only when akumulasi_saldo is active", () => {
    const { rerender } = render(
      <RekapDetailClient
        detail={mockDetailBase}
        settings={{ cutoff_day: 1, akumulasi_saldo: false }}
        jenis="bulanan"
        saldoAwal={12500000}
        saldoAkhir={18500000}
      />,
    );

    // Saat akumulasi_saldo false, baris saldo awal & akhir tidak boleh muncul
    expect(screen.queryByText("Saldo Awal")).not.toBeInTheDocument();
    expect(screen.queryByText("Saldo Akhir")).not.toBeInTheDocument();

    // Saat akumulasi_saldo true, baris saldo awal & akhir harus muncul
    rerender(
      <RekapDetailClient
        detail={mockDetailBase}
        settings={{ cutoff_day: 1, akumulasi_saldo: true }}
        jenis="bulanan"
        saldoAwal={12500000}
        saldoAkhir={18500000}
      />,
    );

    expect(screen.getByText("Saldo Awal")).toBeInTheDocument();
    expect(screen.getByText("Saldo Akhir")).toBeInTheDocument();
    expect(screen.getByText("Rp 12.500.000")).toBeInTheDocument();
    expect(screen.getAllByText("Rp 18.500.000").length).toBeGreaterThan(0);
  });
});
