import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RekapCustomDialog } from "@/app/(dashboard)/reports/_components/rekap-custom-dialog";
import { RekapCustomTab } from "@/app/(dashboard)/reports/_components/rekap-custom-tab";
import * as rekapActions from "@/actions/rekap-action";
import * as rekapPeriodActions from "@/actions/rekap-period-action";
import * as rekapSaldoActions from "@/actions/rekap-saldo-action";
import type { CustomPeriod, RekapSettings } from "@/types/rekap";

vi.mock("@/actions/rekap-action", () => ({
  getRekapRingkasanPeriodeList: vi.fn(),
}));

vi.mock("@/actions/rekap-period-action", () => ({
  listCustomPeriods: vi.fn(),
  createCustomPeriod: vi.fn(),
  updateCustomPeriod: vi.fn(),
  deleteCustomPeriod: vi.fn(),
}));

vi.mock("@/actions/rekap-saldo-action", () => ({
  getSaldoPeriodeList: vi.fn(),
}));

const mockCustomPeriod: CustomPeriod = {
  id: "cp-123",
  user_id: "user-456",
  nama: "Liburan Jepang 2026",
  tanggal_mulai: "2026-04-01",
  tanggal_selesai: "2026-04-15",
  created_at: "2026-03-01T00:00:00Z",
  updated_at: "2026-03-01T00:00:00Z",
};

describe("RekapCustomDialog", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders create mode with empty nama and default dates", () => {
    render(
      <RekapCustomDialog
        open={true}
        onOpenChange={vi.fn()}
        editData={null}
      />,
    );

    expect(screen.getByText("Tambah Periode Kustom")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buat Periode" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hapus" })).not.toBeInTheDocument();
  });

  it("renders edit mode with prefilled values and delete button", () => {
    render(
      <RekapCustomDialog
        open={true}
        onOpenChange={vi.fn()}
        editData={mockCustomPeriod}
      />,
    );

    expect(screen.getByText("Edit Periode Kustom")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Liburan Jepang 2026")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2026-04-01")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2026-04-15")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Simpan Perubahan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hapus" })).toBeInTheDocument();
  });

  it("submits create form via createCustomPeriod and triggers onSuccess", async () => {
    const handleOpenChange = vi.fn();
    const handleSuccess = vi.fn();

    vi.mocked(rekapPeriodActions.createCustomPeriod).mockResolvedValue({
      success: true,
      data: mockCustomPeriod,
    });

    render(
      <RekapCustomDialog
        open={true}
        onOpenChange={handleOpenChange}
        editData={null}
        onSuccess={handleSuccess}
      />,
    );

    const namaInput = screen.getByLabelText("Nama Periode");
    fireEvent.change(namaInput, { target: { value: "Proyek Baru" } });

    const submitBtn = screen.getByRole("button", { name: "Buat Periode" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(rekapPeriodActions.createCustomPeriod).toHaveBeenCalledTimes(1);
      expect(handleOpenChange).toHaveBeenCalledWith(false);
      expect(handleSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("submits update form via updateCustomPeriod and triggers onSuccess", async () => {
    const handleOpenChange = vi.fn();
    const handleSuccess = vi.fn();

    vi.mocked(rekapPeriodActions.updateCustomPeriod).mockResolvedValue({
      success: true,
      data: mockCustomPeriod,
    });

    render(
      <RekapCustomDialog
        open={true}
        onOpenChange={handleOpenChange}
        editData={mockCustomPeriod}
        onSuccess={handleSuccess}
      />,
    );

    const namaInput = screen.getByDisplayValue("Liburan Jepang 2026");
    fireEvent.change(namaInput, { target: { value: "Liburan Jepang Revisi" } });

    const submitBtn = screen.getByRole("button", { name: "Simpan Perubahan" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(rekapPeriodActions.updateCustomPeriod).toHaveBeenCalledWith(
        "cp-123",
        expect.objectContaining({ nama: "Liburan Jepang Revisi" }),
      );
      expect(handleOpenChange).toHaveBeenCalledWith(false);
      expect(handleSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("deletes custom period via deleteCustomPeriod when confirmed in ConfirmDialog", async () => {
    const handleOpenChange = vi.fn();
    const handleSuccess = vi.fn();

    vi.mocked(rekapPeriodActions.deleteCustomPeriod).mockResolvedValue({
      success: true,
      data: { id: "cp-123" },
    });

    render(
      <RekapCustomDialog
        open={true}
        onOpenChange={handleOpenChange}
        editData={mockCustomPeriod}
        onSuccess={handleSuccess}
      />,
    );

    // Buka ConfirmDialog dengan klik Hapus
    const deleteBtn = screen.getByRole("button", { name: "Hapus periode kustom" });
    fireEvent.click(deleteBtn);

    // AlertDialog muncul
    await waitFor(() => {
      expect(screen.getByText("Hapus Periode Kustom?")).toBeInTheDocument();
    });

    // Klik tombol konfirmasi hapus di dalam alert dialog
    const confirmActionBtn = screen.getByRole("button", { name: "Hapus" });
    fireEvent.click(confirmActionBtn);

    await waitFor(() => {
      expect(rekapPeriodActions.deleteCustomPeriod).toHaveBeenCalledWith("cp-123");
      expect(handleOpenChange).toHaveBeenCalledWith(false);
      expect(handleSuccess).toHaveBeenCalledTimes(1);
    });
  });
});

describe("RekapCustomTab", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const defaultSettings: RekapSettings = {
    cutoff_day: 1,
    akumulasi_saldo: false,
  };

  it("renders empty state and FAB when listCustomPeriods returns empty list", async () => {
    vi.mocked(rekapPeriodActions.listCustomPeriods).mockResolvedValue({
      success: true,
      data: [],
    });

    render(<RekapCustomTab settings={defaultSettings} />);

    await waitFor(() => {
      expect(screen.getByText("Belum Ada Periode Kustom")).toBeInTheDocument();
    });

    // Empty state action button
    expect(screen.getByRole("button", { name: "Tambah Periode Kustom" })).toBeInTheDocument();

    // Floating Action Button (FAB)
    const fab = screen.getByRole("button", { name: "Tambah Periode Kustom Baru" });
    expect(fab).toBeInTheDocument();
  });

  it("renders period card with custom name, link to detail, and onEdit button", async () => {
    vi.mocked(rekapPeriodActions.listCustomPeriods).mockResolvedValue({
      success: true,
      data: [mockCustomPeriod],
    });

    vi.mocked(rekapActions.getRekapRingkasanPeriodeList).mockResolvedValue([
      {
        startDate: "2026-04-01",
        endDate: "2026-04-15",
        total_income: 12000000,
        total_expense: 5000000,
        net: 7000000,
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
      },
    ]);

    render(<RekapCustomTab settings={defaultSettings} />);

    await waitFor(() => {
      expect(screen.getByText("Liburan Jepang 2026")).toBeInTheDocument();
    });

    // Link ke detail dengan jenis=custom dan id=cp-123
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "href",
      "/reports/detail?dari=2026-04-01&sampai=2026-04-15&jenis=custom&id=cp-123",
    );

    // Edit button ada di kartu
    const editBtn = screen.getByRole("button", { name: /Ubah periode/i });
    expect(editBtn).toBeInTheDocument();

    // Klik edit button membuka dialog edit
    fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText("Edit Periode Kustom")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Liburan Jepang 2026")).toBeInTheDocument();
    });
  });

  it("loads balance data via getSaldoPeriodeList when akumulasi_saldo is true", async () => {
    vi.mocked(rekapPeriodActions.listCustomPeriods).mockResolvedValue({
      success: true,
      data: [mockCustomPeriod],
    });

    vi.mocked(rekapActions.getRekapRingkasanPeriodeList).mockResolvedValue([
      {
        startDate: "2026-04-01",
        endDate: "2026-04-15",
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
      },
    ]);

    const saldoSpy = vi.mocked(rekapSaldoActions.getSaldoPeriodeList).mockResolvedValue({
      success: true,
      data: [
        {
          startDate: "2026-04-01",
          endDate: "2026-04-15",
          saldo_awal: 25000000,
          saldo_akhir: 31000000,
        },
      ],
    });

    render(<RekapCustomTab settings={{ cutoff_day: 1, akumulasi_saldo: true }} />);

    await waitFor(() => {
      expect(saldoSpy).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Saldo Awal")).toBeInTheDocument();
      expect(screen.getByText("Saldo Akhir")).toBeInTheDocument();
      expect(screen.getByText("Rp 25.000.000")).toBeInTheDocument();
      expect(screen.getByText("Rp 31.000.000")).toBeInTheDocument();
    });
  });

  it("FAB opens create dialog when clicked", async () => {
    vi.mocked(rekapPeriodActions.listCustomPeriods).mockResolvedValue({
      success: true,
      data: [mockCustomPeriod],
    });

    vi.mocked(rekapActions.getRekapRingkasanPeriodeList).mockResolvedValue([]);

    render(<RekapCustomTab settings={defaultSettings} />);

    await waitFor(() => {
      expect(screen.getByText("Liburan Jepang 2026")).toBeInTheDocument();
    });

    const fab = screen.getByRole("button", { name: "Tambah Periode Kustom Baru" });
    fireEvent.click(fab);

    await waitFor(() => {
      expect(screen.getByText("Tambah Periode Kustom")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Buat Periode" })).toBeInTheDocument();
    });
  });
});
