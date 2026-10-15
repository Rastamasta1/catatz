import { cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it, afterEach } from "vitest";
import { TransaksiDetailContent } from "@/app/(dashboard)/transactions/_components/transaksi-detail-content";
import type { DisplayTransaksi } from "@/hooks/use-offline-queue-sync";

const mockExpense: DisplayTransaksi = {
  id: "trx-exp-1",
  user_id: "user-1",
  tipe: "expense",
  nominal: 50000,
  judul: "Makan Malam",
  catatan: "Sate Padang enak",
  tanggal: "2026-10-15",
  waktu: "19:30",
  kategori_id: "kat-1",
  rekening_id: "rek-1",
  rekening_tujuan: null,
  tags: ["makan", "dinner", "correction_sub"],
  is_recurring: false,
  recurring_id: null,
  created_at: "2026-10-15T19:30:00Z",
  updated_at: "2026-10-15T19:30:00Z",
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
    nama: "BCA Tabungan",
    jenis: "Bank",
    logo: null,
    warna: "#0052ff",
  },
};

const mockTransfer: DisplayTransaksi = {
  id: "trx-trf-1",
  user_id: "user-1",
  tipe: "transfer",
  nominal: 250000,
  judul: "Transfer Kas Operasional",
  catatan: "Top up e-wallet",
  tanggal: "2026-10-15",
  waktu: "10:00",
  kategori_id: null,
  rekening_id: "rek-1",
  rekening_tujuan: "rek-2",
  tags: [],
  is_recurring: true,
  recurring_id: "rec-1",
  created_at: "2026-10-15T10:00:00Z",
  updated_at: "2026-10-15T10:00:00Z",
  rekening: {
    id: "rek-1",
    nama: "BCA Tabungan",
    jenis: "Bank",
    logo: null,
    warna: "#0052ff",
  },
  rekening_tujuan_data: {
    id: "rek-2",
    nama: "GoPay",
    jenis: "E-Wallet",
    logo: null,
    warna: "#05b169",
  },
};

describe("TransaksiDetailContent Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders expense details with filtered tags, notes, category, and account", () => {
    render(<TransaksiDetailContent transaksi={mockExpense} />);

    // Title and Amount
    expect(screen.getByText("Makan Malam")).toBeInTheDocument();
    expect(screen.getByText(/Rp\s*50\.000/i)).toBeInTheDocument();

    // Type badge
    expect(screen.getByText("Pengeluaran")).toBeInTheDocument();

    // Account & Category
    expect(screen.getByText("BCA Tabungan")).toBeInTheDocument();
    expect(screen.getByText("Kuliner")).toBeInTheDocument();

    // Notes
    expect(screen.getByText("Sate Padang enak")).toBeInTheDocument();

    // User tags rendered, system tag filtered out
    expect(screen.getByText("#makan")).toBeInTheDocument();
    expect(screen.getByText("#dinner")).toBeInTheDocument();
    expect(screen.queryByText(/#correction_sub/i)).not.toBeInTheDocument();
  });

  it("renders transfer routing with source and destination accounts", () => {
    render(<TransaksiDetailContent transaksi={mockTransfer} />);

    // Transfer title and notes
    expect(screen.getByText("Transfer Kas Operasional")).toBeInTheDocument();
    expect(screen.getByText("Top up e-wallet")).toBeInTheDocument();
    expect(screen.getByText("Transfer")).toBeInTheDocument();

    // Both source and destination accounts displayed
    expect(screen.getByText("BCA Tabungan")).toBeInTheDocument();
    expect(screen.getByText("GoPay")).toBeInTheDocument();

    // Recurring badge
    expect(screen.getByText("Berulang")).toBeInTheDocument();
  });

  it("renders pending sync badge when _pendingSync is true", () => {
    const pendingItem: DisplayTransaksi = {
      ...mockExpense,
      _pendingSync: true,
    };

    render(<TransaksiDetailContent transaksi={pendingItem} />);
    expect(screen.getByText("Menunggu sinkronisasi")).toBeInTheDocument();
  });
});
