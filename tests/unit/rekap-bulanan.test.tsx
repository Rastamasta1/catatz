import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RekapPeriodCard, type RekapPeriodCardData } from "@/app/(dashboard)/reports/_components/rekap-period-card";
import { RekapBulananTab } from "@/app/(dashboard)/reports/_components/rekap-bulanan-tab";
import * as rekapActions from "@/actions/rekap-action";
import * as rekapSaldoActions from "@/actions/rekap-saldo-action";
import type { RekapSettings } from "@/types/rekap";

vi.mock("@/actions/rekap-action", () => ({
  getRekapRingkasanPeriodeList: vi.fn(),
  getEarliestTransactionDate: vi.fn(),
}));

vi.mock("@/actions/rekap-saldo-action", () => ({
  getSaldoPeriodeList: vi.fn(),
}));

const mockPeriodBase: RekapPeriodCardData = {
  startDate: "2026-06-01",
  endDate: "2026-06-30",
  label: "01 Jun - 30 Jun 2026",
  isCurrent: false,
  total_expense: 4000000,
  total_income: 10000000,
  net: 6000000,
  net_arus_kas_hutang_piutang: 1500000,
};

describe("RekapPeriodCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders entire card as a link to reports detail page", () => {
    render(
      <RekapPeriodCard
        period={mockPeriodBase}
        akumulasiAktif={false}
        jenis="bulanan"
      />,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "href",
      "/reports/detail?dari=2026-06-01&sampai=2026-06-30&jenis=bulanan",
    );
    expect(screen.getByText("01 Jun - 30 Jun 2026")).toBeInTheDocument();
  });

  it("includes id in detail link for custom period", () => {
    const customPeriod: RekapPeriodCardData = {
      ...mockPeriodBase,
      id: "cust-uuid-123",
      nama: "Proyek Liburan",
    };

    render(
      <RekapPeriodCard
        period={customPeriod}
        akumulasiAktif={false}
        jenis="custom"
      />,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "href",
      "/reports/detail?dari=2026-06-01&sampai=2026-06-30&jenis=custom&id=cust-uuid-123",
    );
    expect(screen.getByText("Proyek Liburan")).toBeInTheDocument();
    expect(screen.getByText("01 Jun - 30 Jun 2026")).toBeInTheDocument();
  });

  it("renders badge Berjalan for current active cycle", () => {
    render(
      <RekapPeriodCard
        period={{ ...mockPeriodBase, isCurrent: true }}
        akumulasiAktif={false}
      />,
    );

    expect(screen.getByText("Berjalan")).toBeInTheDocument();
  });

  it("does not render badge Berjalan when cycle is not current", () => {
    render(
      <RekapPeriodCard
        period={{ ...mockPeriodBase, isCurrent: false }}
        akumulasiAktif={false}
      />,
    );

    expect(screen.queryByText("Berjalan")).not.toBeInTheDocument();
  });

  it("renders non-accumulated metrics and hides Saldo Awal/Akhir when akumulasiAktif is false", () => {
    render(
      <RekapPeriodCard
        period={{
          ...mockPeriodBase,
          saldo_awal: 50000000,
          saldo_akhir: 56000000,
        }}
        akumulasiAktif={false}
      />,
    );

    expect(screen.getByText("Pengeluaran")).toBeInTheDocument();
    expect(screen.getByText("Pemasukan")).toBeInTheDocument();
    expect(screen.getByText("Selisih")).toBeInTheDocument();
    expect(screen.getByText("Hutang Piutang")).toBeInTheDocument();

    expect(screen.queryByText("Saldo Awal")).not.toBeInTheDocument();
    expect(screen.queryByText("Saldo Akhir")).not.toBeInTheDocument();
  });

  it("renders Saldo Awal and Saldo Akhir when akumulasiAktif is true", () => {
    render(
      <RekapPeriodCard
        period={{
          ...mockPeriodBase,
          saldo_awal: 50000000,
          saldo_akhir: 56000000,
        }}
        akumulasiAktif={true}
      />,
    );

    expect(screen.getByText("Saldo Awal")).toBeInTheDocument();
    expect(screen.getByText("Saldo Akhir")).toBeInTheDocument();
    expect(screen.getByText("Rp 50.000.000")).toBeInTheDocument();
    expect(screen.getByText("Rp 56.000.000")).toBeInTheDocument();
  });

  it("renders Koreksi row only when koreksi activity exists", () => {
    const { rerender } = render(
      <RekapPeriodCard
        period={mockPeriodBase}
        akumulasiAktif={false}
      />,
    );

    expect(screen.queryByText("Koreksi")).not.toBeInTheDocument();

    rerender(
      <RekapPeriodCard
        period={{
          ...mockPeriodBase,
          koreksi: { net: 250000, count: 1 },
        }}
        akumulasiAktif={false}
      />,
    );

    expect(screen.getByText("Koreksi")).toBeInTheDocument();
    expect(screen.getByText("+Rp 250.000")).toBeInTheDocument();
  });

  it("triggers onEdit callback without following link", () => {
    const handleEdit = vi.fn();

    render(
      <RekapPeriodCard
        period={mockPeriodBase}
        akumulasiAktif={false}
        onEdit={handleEdit}
      />,
    );

    const editBtn = screen.getByRole("button", { name: /Ubah periode/i });
    expect(editBtn).toBeInTheDocument();

    fireEvent.click(editBtn);
    expect(handleEdit).toHaveBeenCalledTimes(1);
  });
});

describe("RekapBulananTab", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const defaultSettings: RekapSettings = {
    cutoff_day: 1,
    akumulasi_saldo: false,
  };

  it("loads cycles from earliest transaction date to current date without load more button", async () => {
    vi.spyOn(rekapActions, "getEarliestTransactionDate").mockResolvedValue({
      success: true,
      data: "2026-04-01",
    });

    vi.spyOn(rekapActions, "getRekapRingkasanPeriodeList").mockImplementation(
      async (periods) => {
        return periods.map((p) => ({
          startDate: p.startDate ?? "2026-01-01",
          endDate: p.endDate ?? "2026-01-31",
          total_income: 10000000,
          total_expense: 4000000,
          net: 6000000,
          net_arus_kas_hutang_piutang: 0,
          hutang_piutang: {
            piutang_baru: 0,
            hutang_baru: 0,
            cicilan_piutang: 0,
            cicilan_hutang: 0,
            net_arus_kas: 0,
          },
          koreksi: {
            total_tambah: 0,
            total_kurang: 0,
            net: 0,
            count: 0,
          },
        }));
      },
    );

    render(<RekapBulananTab settings={defaultSettings} />);

    // Menunggu render kartu selesai
    await waitFor(() => {
      const cards = screen.getAllByRole("link");
      expect(cards.length).toBeGreaterThan(0);
    });

    // Tombol muat lebih banyak TIDAK ada karena dibatasi sampai tanggal transaksi pertama
    expect(screen.queryByRole("button", { name: /Muat lebih banyak/i })).not.toBeInTheDocument();
  });

  it("loads balance data via getSaldoPeriodeList when akumulasi_saldo is true", async () => {
    vi.spyOn(rekapActions, "getEarliestTransactionDate").mockResolvedValue({
      success: true,
      data: "2026-04-01",
    });

    vi.spyOn(rekapActions, "getRekapRingkasanPeriodeList").mockImplementation(
      async (periods) => {
        return periods.map((p) => ({
          startDate: p.startDate ?? "2026-01-01",
          endDate: p.endDate ?? "2026-01-31",
          total_income: 5000000,
          total_expense: 2000000,
          net: 3000000,
          net_arus_kas_hutang_piutang: 0,
          hutang_piutang: {
            piutang_baru: 0,
            hutang_baru: 0,
            cicilan_piutang: 0,
            cicilan_hutang: 0,
            net_arus_kas: 0,
          },
          koreksi: {
            total_tambah: 0,
            total_kurang: 0,
            net: 0,
            count: 0,
          },
        }));
      },
    );

    const saldoSpy = vi.spyOn(rekapSaldoActions, "getSaldoPeriodeList").mockImplementation(
      async (periods) => {
        return {
          success: true,
          data: periods.map((p) => ({
            ...p,
            startDate: p.startDate ?? "2026-01-01",
            endDate: p.endDate ?? "2026-01-31",
            saldo_awal: 20000000,
            saldo_akhir: 23000000,
          })),
        };
      },
    );

    render(<RekapBulananTab settings={{ cutoff_day: 1, akumulasi_saldo: true }} />);

    await waitFor(() => {
      expect(saldoSpy).toHaveBeenCalledTimes(1);
      expect(screen.getAllByText("Saldo Awal").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Saldo Akhir").length).toBeGreaterThan(0);
    });
  });

  it("renders current active cycle when there are no past transactions recorded", async () => {
    vi.spyOn(rekapActions, "getEarliestTransactionDate").mockResolvedValue({
      success: true,
      data: null,
    });

    vi.spyOn(rekapActions, "getRekapRingkasanPeriodeList").mockResolvedValue([]);

    render(<RekapBulananTab settings={defaultSettings} />);

    await waitFor(() => {
      expect(screen.getByText("Berjalan")).toBeInTheDocument();
      expect(screen.getByRole("link")).toBeInTheDocument();
    });
  });
});
