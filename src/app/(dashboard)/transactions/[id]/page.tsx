import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTransaksiById, getKategori } from "@/actions/transaksi-action";
import { getRekening } from "@/actions/rekening-action";
import { transaksiIdParamSchema } from "@/validations/transaksi-validation";
import TransaksiDetailClient from "./_components/transaksi-detail-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const parsed = transaksiIdParamSchema.safeParse(id);
  if (!parsed.success) {
    return { title: "Transaksi Tidak Ditemukan" };
  }

  const res = await getTransaksiById(parsed.data);
  const title =
    res.success && res.data?.judul
      ? `Detail: ${res.data.judul}`
      : "Detail Transaksi";

  return {
    title,
    description: "Detail informasi dan riwayat transaksi keuangan Anda.",
  };
}

export default async function TransaksiDetailPage({ params }: PageProps) {
  const { id } = await params;

  const parsedId = transaksiIdParamSchema.safeParse(id);
  if (!parsedId.success) {
    notFound();
  }

  const [transaksiRes, rekening, kategori] = await Promise.all([
    getTransaksiById(parsedId.data),
    getRekening(),
    getKategori(),
  ]);

  if (!transaksiRes.success || !transaksiRes.data) {
    notFound();
  }

  return (
    <TransaksiDetailClient
      initialTransaksi={transaksiRes.data}
      rekening={rekening}
      kategori={kategori}
    />
  );
}
