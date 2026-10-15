import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, afterEach } from "vitest";
import { TransaksiListItem } from "@/app/(dashboard)/transactions/_components/transaksi-list-item";
import type { DisplayTransaksi } from "@/hooks/use-offline-queue-sync";

const mockExpenseItem: DisplayTransaksi = {
  id: "trx-expense-1",
  user_id: "user-1",
  tipe: "expense",
  nominal: 25000,
  judul: "ShopeeFood",
  catatan: "Makan siang",
  tanggal: "2026-10-12",
  waktu: "22:05",
  kategori_id: "kat-makan",
  rekening_id: "rek-krom",
  rekening_tujuan: null,
  tags: [],
  is_recurring: false,
  recurring_id: null,
  created_at: "2026-10-12T22:05:00Z",
  updated_at: "2026-10-12T22:05:00Z",
  kategori: {
    id: "kat-makan",
    user_id: "user-1",
    nama: "Makan & Minum",
    ikon: "🍔",
    warna: "#cf202f",
    tipe: "expense",
    is_system: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  rekening: {
    id: "rek-krom",
    nama: "Krom",
    jenis: "Bank",
    logo: null,
    warna: "#6b21a8",
  },
};

const mockTransferItem: DisplayTransaksi = {
  id: "trx-transfer-1",
  user_id: "user-1",
  tipe: "transfer",
  nominal: 3214876,
  judul: null,
  catatan: null,
  tanggal: "2026-10-12",
  waktu: "17:57",
  kategori_id: null,
  rekening_id: "rek-qris",
  rekening_tujuan: "rek-krom",
  tags: [],
  is_recurring: false,
  recurring_id: null,
  created_at: "2026-10-12T17:57:00Z",
  updated_at: "2026-10-12T17:57:00Z",
  rekening: {
    id: "rek-qris",
    nama: "QRIS AW",
    jenis: "E-Wallet",
    logo: null,
    warna: "#0052ff",
  },
  rekening_tujuan_data: {
    id: "rek-krom",
    nama: "Krom",
    jenis: "Bank",
    logo: null,
    warna: "#6b21a8",
  },
};

describe("TransaksiListItem Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders expense item with title, category, formatted amount, and account name", () => {
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();

    render(
      <TransaksiListItem
        transaksi={mockExpenseItem}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isDeleting={false}
      />
    );

    // Title and Category
    expect(screen.getAllByText("ShopeeFood").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Makan & Minum/i).length).toBeGreaterThan(0);

    // Rekening name displayed
    expect(screen.getAllByText(/Krom/i).length).toBeGreaterThan(0);

    // Edit and Delete buttons present
    const editBtn = screen.getByLabelText(/Edit transaksi ShopeeFood/i);
    expect(editBtn).toBeInTheDocument();
    const deleteBtn = screen.getByLabelText(/Hapus transaksi ShopeeFood/i);
    expect(deleteBtn).toBeInTheDocument();
  });

  it("renders transfer item with source and destination accounts cleanly separated", () => {
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();

    const { container } = render(
      <TransaksiListItem
        transaksi={mockTransferItem}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isDeleting={false}
      />
    );

    // Title and Transfer Badge
    expect(screen.getAllByText("Transfer").length).toBeGreaterThan(0);

    // Source account QRIS AW and Destination account Krom
    expect(screen.getAllByText("QRIS AW").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Krom").length).toBeGreaterThan(0);

    // Check arrow separator exists
    expect(screen.getAllByText("→").length).toBeGreaterThan(0);

    // Mobile layout: verify separate line for transfer routing
    const mobileMetaContainer = container.querySelector(".sm\\:hidden.flex-col");
    expect(mobileMetaContainer).toBeInTheDocument();

    // Verify source and destination are rendered inside the mobile transfer routing line
    const routingLine = mobileMetaContainer?.querySelector(".text-foreground\\/80");
    expect(routingLine).toBeInTheDocument();
    expect(routingLine?.textContent).toContain("QRIS AW");
    expect(routingLine?.textContent).toContain("→");
    expect(routingLine?.textContent).toContain("Krom");
  });

  it("triggers onEdit when edit button is clicked", async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();

    render(
      <TransaksiListItem
        transaksi={mockExpenseItem}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isDeleting={false}
      />
    );

    const editBtn = screen.getByLabelText(/Edit transaksi ShopeeFood/i);
    await user.click(editBtn);

    expect(handleEdit).toHaveBeenCalledWith(mockExpenseItem);
  });

  it("triggers onDetail when detail button is clicked", async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();
    const handleDetail = vi.fn();

    render(
      <TransaksiListItem
        transaksi={mockExpenseItem}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDetail={handleDetail}
        isDeleting={false}
      />
    );

    const detailBtn = screen.getByLabelText(/Detail transaksi ShopeeFood/i);
    await user.click(detailBtn);

    expect(handleDetail).toHaveBeenCalledWith(mockExpenseItem);
  });

  it("triggers onDetail when item row is clicked", async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();
    const handleDetail = vi.fn();

    render(
      <TransaksiListItem
        transaksi={mockExpenseItem}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDetail={handleDetail}
        isDeleting={false}
      />
    );

    const title = screen.getAllByText("ShopeeFood")[0];
    await user.click(title);

    expect(handleDetail).toHaveBeenCalledWith(mockExpenseItem);
  });

  it("keeps default title and omits type badge for transfer with catatan", () => {
    const transferWithNote: DisplayTransaksi = {
      ...mockTransferItem,
      catatan: "Kirim uang saku adik",
    };

    render(
      <TransaksiListItem
        transaksi={transferWithNote}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        isDeleting={false}
      />
    );

    // Title remains default "Transfer", not the catatan
    expect(screen.getAllByText("Transfer").length).toBeGreaterThan(0);
    // Catatan is not used as title in transaction index
    expect(screen.queryByText("Kirim uang saku adik")).not.toBeInTheDocument();
  });

  it("keeps default title and omits type badge for correction with catatan", () => {
    const correctionWithNote: DisplayTransaksi = {
      id: "trx-corr-1",
      user_id: "user-1",
      tipe: "correction",
      nominal: 50000,
      judul: null,
      catatan: "Penyesuaian kas fisik",
      tanggal: "2026-10-12",
      waktu: "12:00",
      kategori_id: null,
      rekening_id: "rek-krom",
      rekening_tujuan: null,
      tags: ["correction_add"],
      is_recurring: false,
      recurring_id: null,
      created_at: "2026-10-12T12:00:00Z",
      updated_at: "2026-10-12T12:00:00Z",
      rekening: {
        id: "rek-krom",
        nama: "Krom",
        jenis: "Bank",
        logo: null,
        warna: "#6b21a8",
      },
    };

    render(
      <TransaksiListItem
        transaksi={correctionWithNote}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        isDeleting={false}
      />
    );

    // Title remains default "Koreksi Saldo", not the catatan
    expect(screen.getAllByText("Koreksi Saldo").length).toBeGreaterThan(0);
    expect(screen.queryByText("Penyesuaian kas fisik")).not.toBeInTheDocument();
  });
});

