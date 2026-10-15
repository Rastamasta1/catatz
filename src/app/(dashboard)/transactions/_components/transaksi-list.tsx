"use client";

import type { DisplayTransaksi } from "@/hooks/use-offline-queue-sync";
import { EmptyState } from "@/components/common";
import { ArrowLeftRight } from "lucide-react";
import { TransaksiListItem } from "./transaksi-list-item";

export type TransaksiListProps = {
  transaksi: DisplayTransaksi[];
  onEdit: (transaksi: DisplayTransaksi) => void;
  onDelete: (id: string) => void;
  onDetail?: (transaksi: DisplayTransaksi) => void;
  deleting: string | null;
};

export function TransaksiList({
  transaksi,
  onEdit,
  onDelete,
  onDetail,
  deleting,
}: TransaksiListProps) {
  return (
    <div className="rounded-card border border-hairline overflow-hidden">
      {transaksi.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="Belum ada transaksi"
          description="Klik tombol Tambah untuk mulai mencatat"
        />
      ) : (
        transaksi.map((item) => (
          <TransaksiListItem
            key={item.id}
            transaksi={item}
            onEdit={onEdit}
            onDelete={onDelete}
            onDetail={onDetail}
            isDeleting={deleting === item.id}
          />
        ))
      )}
    </div>
  );
}
