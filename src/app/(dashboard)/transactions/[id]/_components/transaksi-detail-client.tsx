"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Kategori, Transaksi } from "@/types/transaksi";
import type { Rekening } from "@/types/rekening";
import { deleteTransaksi } from "@/actions/transaksi-action";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import TransaksiDialog from "../../_components/transaksi-dialog";
import { TransaksiDetailContent } from "../../_components/transaksi-detail-content";

export type TransaksiDetailClientProps = {
  initialTransaksi: Transaksi;
  rekening: Rekening[];
  kategori: Kategori[];
};

export default function TransaksiDetailClient({
  initialTransaksi,
  rekening,
  kategori,
}: TransaksiDetailClientProps) {
  const router = useRouter();
  const [transaksi, setTransaksi] = useState<Transaksi>(initialTransaksi);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState<Transaksi | null>(null);
  const [copyFrom, setCopyFrom] = useState<Transaksi | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function handleOpenEdit() {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("Edit transaksi memerlukan koneksi internet.");
      return;
    }
    setEditData(transaksi);
    setCopyFrom(null);
    setDialogOpen(true);
  }

  function handleOpenCopy() {
    setEditData(null);
    setCopyFrom(transaksi);
    setDialogOpen(true);
  }

  async function handleDelete() {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("Hapus transaksi memerlukan koneksi internet.");
      return;
    }

    setIsDeleting(true);
    const res = await deleteTransaksi(transaksi.id);
    if (res.success) {
      toast.success("Transaksi berhasil dihapus");
      router.push("/transactions");
    } else {
      toast.error(res.error ?? "Gagal menghapus transaksi");
      setIsDeleting(false);
    }
  }

  function handleUpdated(t: Transaksi & { _isCopySignal?: boolean }) {
    if (t._isCopySignal) {
      const original = editData || transaksi;
      setEditData(null);
      setDialogOpen(false);
      setTimeout(() => {
        setCopyFrom(original);
        setDialogOpen(true);
      }, 150);
      return;
    }

    setTransaksi(t);
    setDialogOpen(false);
    setEditData(null);
    setCopyFrom(null);
    toast.success("Transaksi berhasil diperbarui");
  }

  function handleCreated() {
    setDialogOpen(false);
    setEditData(null);
    setCopyFrom(null);
    toast.success("Transaksi baru berhasil dibuat");
    router.push("/transactions");
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Top Bar: Navigasi Kembali & Aksi Cepat */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Button
          asChild
          variant="outline"
          className="rounded-full h-10 px-4 text-xs font-medium border-hairline hover:bg-surface-soft gap-2 w-fit cursor-pointer"
        >
          <Link href="/transactions">
            <ArrowLeft className="h-4 w-4" />
            <span>Semua Transaksi</span>
          </Link>
        </Button>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Tombol Salin */}
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenCopy}
            className="rounded-full h-10 px-3.5 text-xs font-medium border-hairline hover:bg-surface-soft gap-1.5 cursor-pointer"
            id="btn-copy-transaksi-page"
          >
            <Copy className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Salin</span>
          </Button>

          {/* Tombol Edit */}
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenEdit}
            className="rounded-full h-10 px-3.5 text-xs font-medium border-hairline hover:bg-surface-soft gap-1.5 cursor-pointer"
            id="btn-edit-transaksi-page"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Edit</span>
          </Button>

          {/* Tombol Hapus */}
          <ConfirmDialog
            title={
              transaksi.tipe === "correction"
                ? "Hapus Koreksi Saldo?"
                : "Hapus Transaksi?"
            }
            description={
              transaksi.tipe === "correction"
                ? "Koreksi saldo ini akan dihapus. Saldo rekening TIDAK akan otomatis dibalik."
                : "Transaksi ini akan dihapus secara permanen dari catatan keuangan Anda."
            }
            onConfirm={handleDelete}
          >
            <Button
              type="button"
              variant="ghost"
              disabled={isDeleting}
              className="rounded-full h-10 px-3.5 text-xs font-medium bg-semantic-down/10 text-semantic-down hover:bg-semantic-down/20 gap-1.5 cursor-pointer"
              id="btn-delete-transaksi-page"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Hapus</span>
            </Button>
          </ConfirmDialog>
        </div>
      </div>

      {/* Konten Detail Transaksi */}
      <TransaksiDetailContent transaksi={transaksi} />

      {/* Modal Dialog untuk Edit & Salin */}
      <TransaksiDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        rekening={rekening}
        kategori={kategori}
        editData={editData}
        copyFrom={copyFrom}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
      />
    </div>
  );
}
