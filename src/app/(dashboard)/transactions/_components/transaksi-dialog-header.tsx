import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type TransaksiDialogHeaderProps = {
  isCorrection: boolean;
  isEdit: boolean;
  isCopy: boolean;
};

export function TransaksiDialogHeader({
  isCorrection,
  isEdit,
  isCopy,
}: TransaksiDialogHeaderProps) {
  const title = isCorrection
    ? "Edit Koreksi Saldo"
    : isEdit
      ? "Edit Transaksi"
      : isCopy
        ? "Copy Transaksi"
        : "Tambah Transaksi";

  const description = isCorrection
    ? "Perbarui catatan koreksi saldo rekening."
    : isEdit
      ? "Perbarui rincian transaksi Anda."
      : isCopy
        ? "Membuat transaksi baru dengan data yang sama."
        : "Catat pengeluaran, pemasukan, atau transfer baru.";

  return (
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
    </DialogHeader>
  );
}
