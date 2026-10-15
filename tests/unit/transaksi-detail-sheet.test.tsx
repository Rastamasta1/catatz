import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, afterEach } from "vitest";
import { TransaksiDetailSheet } from "@/app/(dashboard)/transactions/_components/transaksi-detail-sheet";
import type { DisplayTransaksi } from "@/hooks/use-offline-queue-sync";

const mockExpenseItem: DisplayTransaksi = {
  id: "trx-expense-1",
  user_id: "user-1",
  tipe: "expense",
  nominal: 75000,
  judul: "Makan Siang",
  catatan: "Nasi padang",
  tanggal: "2026-10-15",
  waktu: "12:30",
  kategori_id: "kat-1",
  rekening_id: "rek-1",
  rekening_tujuan: null,
  tags: ["makan"],
  is_recurring: false,
  recurring_id: null,
  created_at: "2026-10-15T12:30:00Z",
  updated_at: "2026-10-15T12:30:00Z",
  kategori: {
    id: "kat-1",
    user_id: "user-1",
    nama: "Kuliner",
    ikon: "🍲",
    warna: "#cf202f",
    tipe: "expense",
    is_system: false,
    created_at: "2026-01-01T00:00:00Z",
  },
  rekening: {
    id: "rek-1",
    nama: "BCA",
    jenis: "Bank",
    logo: null,
    warna: "#0052ff",
  },
};

const mockCorrectionItem: DisplayTransaksi = {
  id: "trx-corr-1",
  user_id: "user-1",
  tipe: "correction",
  nominal: 10000,
  judul: null,
  catatan: "Koreksi selisih kas",
  tanggal: "2026-10-15",
  waktu: "10:00",
  kategori_id: null,
  rekening_id: "rek-1",
  rekening_tujuan: null,
  tags: ["correction_add"],
  is_recurring: false,
  recurring_id: null,
  created_at: "2026-10-15T10:00:00Z",
  updated_at: "2026-10-15T10:00:00Z",
  rekening: {
    id: "rek-1",
    nama: "BCA",
    jenis: "Bank",
    logo: null,
    warna: "#0052ff",
  },
};

describe("TransaksiDetailSheet Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders detail modal content with edit and copy buttons for normal transaction", async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();
    const handleCopy = vi.fn();

    render(
      <TransaksiDetailSheet
        open={true}
        onOpenChange={vi.fn()}
        transaksi={mockExpenseItem}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCopy={handleCopy}
      />
    );

    // Detail header & content
    expect(screen.getByText("Detail Transaksi")).toBeInTheDocument();
    expect(screen.getByText("Makan Siang")).toBeInTheDocument();
    expect(screen.getByText(/Rp\s*75\.000/i)).toBeInTheDocument();

    // Copy and Edit buttons exist
    const copyBtn = screen.getByRole("button", { name: /Copy Transaksi/i });
    expect(copyBtn).toBeInTheDocument();

    const editBtn = screen.getByRole("button", { name: /Edit Transaksi/i });
    expect(editBtn).toBeInTheDocument();

    // Trigger Copy
    await user.click(copyBtn);
    expect(handleCopy).toHaveBeenCalledWith(mockExpenseItem);

    // Trigger Edit
    await user.click(editBtn);
    expect(handleEdit).toHaveBeenCalledWith(mockExpenseItem);
  });

  it("omits copy button for correction transactions", () => {
    render(
      <TransaksiDetailSheet
        open={true}
        onOpenChange={vi.fn()}
        transaksi={mockCorrectionItem}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCopy={vi.fn()}
      />
    );

    expect(screen.getByText("Detail Transaksi")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Copy Transaksi/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Edit Transaksi/i })).toBeInTheDocument();
  });

  it("disables action buttons when transaction is pending sync", () => {
    const pendingItem: DisplayTransaksi = {
      ...mockExpenseItem,
      _pendingSync: true,
    };

    render(
      <TransaksiDetailSheet
        open={true}
        onOpenChange={vi.fn()}
        transaksi={pendingItem}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCopy={vi.fn()}
      />
    );

    const copyBtn = screen.getByRole("button", { name: /Copy Transaksi/i });
    expect(copyBtn).toBeDisabled();

    const editBtn = screen.getByRole("button", { name: /Edit Transaksi/i });
    expect(editBtn).toBeDisabled();
  });
});
