import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, afterEach } from "vitest";
import { TransaksiFilterBar } from "@/app/(dashboard)/transactions/_components/transaksi-filter-bar";
import type { TransaksiFilter, Kategori } from "@/types/transaksi";
import type { Rekening } from "@/types/rekening";

const mockRekening: Rekening[] = [
  {
    id: "rek-bca",
    user_id: "user-1",
    nama: "BCA",
    jenis: "Bank",
    saldo_awal: 10000000,
    saldo_saat_ini: 10000000,
    logo: null,
    warna: "#0052ff",
    exclude_total: false,
    urutan: 1,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "rek-mandiri",
    user_id: "user-1",
    nama: "Mandiri",
    jenis: "Bank",
    saldo_awal: 5000000,
    saldo_saat_ini: 5000000,
    logo: null,
    warna: "#f4b000",
    exclude_total: false,
    urutan: 2,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const mockKategori: Kategori[] = [
  {
    id: "kat-makan",
    user_id: "user-1",
    nama: "Makan & Minum",
    ikon: "🍔",
    warna: "#cf202f",
    tipe: "expense",
    is_system: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "kat-gaji",
    user_id: "user-1",
    nama: "Gaji",
    ikon: "💰",
    warna: "#05b169",
    tipe: "income",
    is_system: true,
    created_at: "2026-01-01T00:00:00Z",
  },
];

describe("TransaksiFilterBar Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders search input, filter button, and add transaction button", () => {
    const handleSearchChange = vi.fn();
    const handleFilterChange = vi.fn();
    const handleAddClick = vi.fn();

    render(
      <TransaksiFilterBar
        search=""
        onSearchChange={handleSearchChange}
        filter={{
          tipe: [],
          rekening_id: [],
          kategori_id: [],
          sortBy: "tanggal",
          sortOrder: "desc",
        }}
        onFilterChange={handleFilterChange}
        rekening={mockRekening}
        kategori={mockKategori}
        onAddClick={handleAddClick}
      />
    );

    expect(
      screen.getByPlaceholderText(/Cari judul, catatan, atau kategori.../i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Filter/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Transaksi Baru/i })
    ).toBeInTheDocument();

    // No active filter badges when no filter is applied
    expect(screen.queryByText(/Hapus Semua/i)).not.toBeInTheDocument();
  });

  it("displays filter count badge and active filter badges when filters are set", () => {
    const handleFilterChange = vi.fn();

    const activeFilter: TransaksiFilter = {
      tipe: ["transfer"],
      transfer_tujuan_id: "rek-mandiri",
      sortBy: "tanggal",
      sortOrder: "desc",
    };

    render(
      <TransaksiFilterBar
        search=""
        onSearchChange={vi.fn()}
        filter={activeFilter}
        onFilterChange={handleFilterChange}
        rekening={mockRekening}
        kategori={mockKategori}
        onAddClick={vi.fn()}
      />
    );

    // Active count badge should show 2 (tipe: transfer + transfer_tujuan_id)
    const badgeCount = screen.getByText("2");
    expect(badgeCount).toBeInTheDocument();

    // Badges: Tipe: Transfer and Rekening Tujuan: Mandiri
    expect(screen.getByText(/Tipe: Transfer/i)).toBeInTheDocument();
    expect(screen.getByText(/Rekening Tujuan: Mandiri/i)).toBeInTheDocument();
    expect(screen.getByText(/Hapus Semua/i)).toBeInTheDocument();
  });

  it("removes a single badge when its close button is clicked", async () => {
    const user = userEvent.setup();
    let currentFilter: TransaksiFilter = {
      tipe: ["transfer"],
      transfer_tujuan_id: "rek-mandiri",
      sortBy: "tanggal",
      sortOrder: "desc",
    };

    const handleFilterChange = vi.fn((update) => {
      if (typeof update === "function") {
        currentFilter = update(currentFilter);
      }
    });

    render(
      <TransaksiFilterBar
        search=""
        onSearchChange={vi.fn()}
        filter={currentFilter}
        onFilterChange={handleFilterChange}
        rekening={mockRekening}
        kategori={mockKategori}
        onAddClick={vi.fn()}
      />
    );

    const closeTujuanBtn = screen.getByLabelText(/Hapus filter rekening tujuan/i);
    await user.click(closeTujuanBtn);

    expect(handleFilterChange).toHaveBeenCalled();
    expect(currentFilter.transfer_tujuan_id).toBeUndefined();
  });

  it("clears all active filters when Hapus Semua is clicked", async () => {
    const user = userEvent.setup();
    let currentFilter: TransaksiFilter = {
      tipe: ["transfer"],
      transfer_tujuan_id: "rek-mandiri",
      nominal_min: 50000,
      sortBy: "nominal",
      sortOrder: "desc",
    };

    const handleFilterChange = vi.fn((update) => {
      if (typeof update === "function") {
        currentFilter = update(currentFilter);
      }
    });

    render(
      <TransaksiFilterBar
        search=""
        onSearchChange={vi.fn()}
        filter={currentFilter}
        onFilterChange={handleFilterChange}
        rekening={mockRekening}
        kategori={mockKategori}
        onAddClick={vi.fn()}
      />
    );

    const clearAllBtn = screen.getByText(/Hapus Semua/i);
    await user.click(clearAllBtn);

    expect(handleFilterChange).toHaveBeenCalled();
    expect(currentFilter.tipe).toEqual([]);
    expect(currentFilter.transfer_tujuan_id).toBeUndefined();
    expect(currentFilter.nominal_min).toBeUndefined();
    expect(currentFilter.sortBy).toBe("tanggal");
    expect(currentFilter.sortOrder).toBe("desc");
  });

  it("opens filter sheet when Filter button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <TransaksiFilterBar
        search=""
        onSearchChange={vi.fn()}
        filter={{
          tipe: [],
          rekening_id: [],
          kategori_id: [],
          sortBy: "tanggal",
          sortOrder: "desc",
        }}
        onFilterChange={vi.fn()}
        rekening={mockRekening}
        kategori={mockKategori}
        onAddClick={vi.fn()}
      />
    );

    const filterBtn = screen.getByRole("button", { name: /Filter/i });
    await user.click(filterBtn);

    // Sheet heading
    expect(screen.getByText("Filter Transaksi")).toBeInTheDocument();
    expect(screen.getByText("Tipe Transaksi")).toBeInTheDocument();
    expect(screen.getByText("Rentang Nominal")).toBeInTheDocument();
  });

  it("renders nominal range badge and allows dismissal", async () => {
    const user = userEvent.setup();
    let currentFilter: TransaksiFilter = {
      nominal_min: 50000,
      nominal_max: 200000,
      sortBy: "tanggal",
      sortOrder: "desc",
    };

    const handleFilterChange = vi.fn((update) => {
      if (typeof update === "function") {
        currentFilter = update(currentFilter);
      }
    });

    render(
      <TransaksiFilterBar
        search=""
        onSearchChange={vi.fn()}
        filter={currentFilter}
        onFilterChange={handleFilterChange}
        rekening={mockRekening}
        kategori={mockKategori}
        onAddClick={vi.fn()}
      />
    );

    // Should display Nominal badge
    expect(screen.getByText(/Nominal:/i)).toBeInTheDocument();

    const closeNominalBtn = screen.getByLabelText(/Hapus filter rentang nominal/i);
    await user.click(closeNominalBtn);

    expect(handleFilterChange).toHaveBeenCalled();
    expect(currentFilter.nominal_min).toBeUndefined();
    expect(currentFilter.nominal_max).toBeUndefined();
  });

  it("renders rekening and kategori badges and allows individual dismissal", async () => {
    const user = userEvent.setup();
    let currentFilter: TransaksiFilter = {
      rekening_id: ["rek-bca"],
      kategori_id: ["kat-makan"],
      sortBy: "tanggal",
      sortOrder: "desc",
    };

    const handleFilterChange = vi.fn((update) => {
      if (typeof update === "function") {
        currentFilter = update(currentFilter);
      }
    });

    render(
      <TransaksiFilterBar
        search=""
        onSearchChange={vi.fn()}
        filter={currentFilter}
        onFilterChange={handleFilterChange}
        rekening={mockRekening}
        kategori={mockKategori}
        onAddClick={vi.fn()}
      />
    );

    expect(screen.getByText(/Rekening: BCA/i)).toBeInTheDocument();
    expect(screen.getByText(/Kategori: Makan & Minum/i)).toBeInTheDocument();

    // Dismiss rekening
    const closeRekBtn = screen.getByLabelText(/Hapus filter rekening BCA/i);
    await user.click(closeRekBtn);
    expect(currentFilter.rekening_id).toEqual([]);

    // Dismiss kategori
    const closeKatBtn = screen.getByLabelText(/Hapus filter kategori Makan & Minum/i);
    await user.click(closeKatBtn);
    expect(currentFilter.kategori_id).toEqual([]);
  });

  it("allows switching transaction type tabs inside the filter sheet", async () => {
    const user = userEvent.setup();

    function TestWrapper() {
      const [filter, setFilter] = useState<TransaksiFilter>({
        tipe: [],
        rekening_id: [],
        kategori_id: [],
        sortBy: "tanggal",
        sortOrder: "desc",
      });

      return (
        <TransaksiFilterBar
          search=""
          onSearchChange={vi.fn()}
          filter={filter}
          onFilterChange={setFilter}
          rekening={mockRekening}
          kategori={mockKategori}
          onAddClick={vi.fn()}
        />
      );
    }

    render(<TestWrapper />);

    // Open sheet
    await user.click(screen.getByRole("button", { name: /Filter/i }));

    // Click 'Transfer' tab
    const transferTab = screen.getByRole("tab", { name: /Transfer/i });
    await user.click(transferTab);

    // When transfer is selected, transfer routing fields should appear
    expect(screen.getByText("Sumber Dana (Rekening Asal)")).toBeInTheDocument();
    expect(screen.getByText("Tujuan Transfer (Rekening Tujuan)")).toBeInTheDocument();
  });

  it("renders [Filter] - [Search] - [Tambah Transaksi] in correct order within a single-row container", () => {
    const handleAddClick = vi.fn();

    const { container } = render(
      <TransaksiFilterBar
        search=""
        onSearchChange={vi.fn()}
        filter={{
          tipe: [],
          rekening_id: [],
          kategori_id: [],
          sortBy: "tanggal",
          sortOrder: "desc",
        }}
        onFilterChange={vi.fn()}
        rekening={mockRekening}
        kategori={mockKategori}
        onAddClick={handleAddClick}
      />
    );

    // Verify container uses single-row flex layout
    const rowContainer = container.querySelector(".flex.items-center.gap-2.w-full");
    expect(rowContainer).toBeInTheDocument();

    const filterBtn = container.querySelector("#btn-filter-trigger");
    const searchInput = container.querySelector("#input-cari-transaksi");
    const addBtn = container.querySelector("#btn-tambah-transaksi");

    expect(filterBtn).toBeInTheDocument();
    expect(searchInput).toBeInTheDocument();
    expect(addBtn).toBeInTheDocument();

    // Verify ordering in DOM: Filter comes before Search, Search comes before Add
    expect(
      filterBtn!.compareDocumentPosition(searchInput!) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      searchInput!.compareDocumentPosition(addBtn!) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});

