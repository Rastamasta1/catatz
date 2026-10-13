import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RekapPageClient from "@/app/(dashboard)/reports/_components/rekap-page-client";
import { RekapSettingsDialog } from "@/app/(dashboard)/reports/_components/rekap-settings-dialog";
import * as rekapPeriodActions from "@/actions/rekap-period-action";
import type { RekapSettings } from "@/types/rekap";

const mockReplace = vi.fn();
const mockRefresh = vi.fn();
let mockSearchParamTab: string | null = null;

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    refresh: mockRefresh,
  }),
  usePathname: () => "/reports",
  useSearchParams: () => ({
    get: (key: string) => (key === "tab" ? mockSearchParamTab : null),
    toString: () => (mockSearchParamTab ? `tab=${mockSearchParamTab}` : ""),
  }),
}));

vi.mock("@/actions/rekap-period-action", () => ({
  updateRekapSettings: vi.fn(),
}));

describe("RekapPageClient & RekapSettingsDialog", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockSearchParamTab = null;
  });

  it("renders page header with title and 44px settings button", () => {
    render(<RekapPageClient />);

    expect(screen.getByRole("heading", { name: "Rekap Keuangan" })).toBeInTheDocument();

    const settingsButton = screen.getByRole("button", { name: "Pengaturan Rekap" });
    expect(settingsButton).toBeInTheDocument();
    expect(settingsButton.className).toContain("size-11");
    expect(settingsButton.className).toContain("rounded-full");
  });

  it("renders tabs Realtime, Bulanan, and Custom, defaulting to Realtime", () => {
    render(<RekapPageClient />);

    expect(screen.getByRole("tab", { name: "Realtime" })).toHaveAttribute("data-state", "active");
    expect(screen.getByRole("tab", { name: "Bulanan" })).toHaveAttribute("data-state", "inactive");
    expect(screen.getByRole("tab", { name: "Custom" })).toHaveAttribute("data-state", "inactive");

    expect(screen.getByText("Tab Realtime")).toBeInTheDocument();
  });

  it("navigates tabs and replaces URL with scroll: false", () => {
    render(<RekapPageClient />);

    const bulananTab = screen.getByRole("tab", { name: "Bulanan" });
    fireEvent.mouseDown(bulananTab, { button: 0 });
    fireEvent.click(bulananTab);

    expect(mockReplace).toHaveBeenCalledWith("/reports?tab=bulanan", { scroll: false });
  });

  it("respects tab from query params", () => {
    mockSearchParamTab = "custom";
    render(<RekapPageClient />);

    expect(screen.getByRole("tab", { name: "Custom" })).toHaveAttribute("data-state", "active");
    expect(screen.getByText("Tab Custom")).toBeInTheDocument();
  });

  it("opens rekap settings dialog when settings button is clicked", () => {
    render(<RekapPageClient />);

    const settingsButton = screen.getByRole("button", { name: "Pengaturan Rekap" });
    fireEvent.click(settingsButton);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pengaturan Rekap" })).toBeInTheDocument();
    expect(screen.getByText(/Pratinjau Siklus Berjalan/i)).toBeInTheDocument();
  });

  it("saves rekap settings via updateRekapSettings with optimistic update", async () => {
    const initialSettings: RekapSettings = {
      cutoff_day: 1,
      akumulasi_saldo: false,
    };

    const updateMock = vi.mocked(rekapPeriodActions.updateRekapSettings).mockResolvedValue({
      success: true,
      data: {
        id: "test-id",
        user_id: "user-1",
        cutoff_day: 1,
        akumulasi_saldo: true,
      },
    });

    const onSettingsSaved = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <RekapSettingsDialog
        open={true}
        onOpenChange={onOpenChange}
        settings={initialSettings}
        onSettingsSaved={onSettingsSaved}
      />,
    );

    // Toggle switch akumulasi
    const switchEl = screen.getByRole("switch", { name: "Saldo Akumulasi" });
    fireEvent.click(switchEl);

    // Click Simpan
    const simpanBtn = screen.getByRole("button", { name: "Simpan" });
    fireEvent.click(simpanBtn);

    // Optimistic update call
    expect(onSettingsSaved).toHaveBeenCalledWith(
      expect.objectContaining({
        cutoff_day: 1,
        akumulasi_saldo: true,
      }),
    );

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith({
        cutoff_day: 1,
        akumulasi_saldo: true,
      });
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("rolls back optimistic state if updateRekapSettings fails", async () => {
    const initialSettings: RekapSettings = {
      cutoff_day: 5,
      akumulasi_saldo: false,
    };

    vi.mocked(rekapPeriodActions.updateRekapSettings).mockResolvedValue({
      success: false,
      error: "Gagal menyimpan ke server",
    });

    const onSettingsSaved = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <RekapSettingsDialog
        open={true}
        onOpenChange={onOpenChange}
        settings={initialSettings}
        onSettingsSaved={onSettingsSaved}
      />,
    );

    const switchEl = screen.getByRole("switch", { name: "Saldo Akumulasi" });
    fireEvent.click(switchEl);

    const simpanBtn = screen.getByRole("button", { name: "Simpan" });
    fireEvent.click(simpanBtn);

    await waitFor(() => {
      // First optimistic, then rollback
      expect(onSettingsSaved).toHaveBeenLastCalledWith(initialSettings);
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });
  });
});
