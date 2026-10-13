/**
 * Pure Rekap Aggregate Engine
 *
 * Mengelompokkan dan mengagregasi data transaksi, hutang/piutang, dan cicilan
 * ke dalam daftar periode kustom atau siklus bulanan berdasarkan perbandingan
 * string tanggal YYYY-MM-DD (GR-9) tanpa new Date() timezone dependency.
 */

export type AggregateTransaksiItem = {
  id?: string;
  tipe: string;
  nominal: number | string;
  tanggal: string;
  tags?: string[] | null;
};

export type AggregateHutangItem = {
  id?: string;
  tipe: 'memberi' | 'menerima' | string;
  total_pinjaman: number | string;
  tanggal_mulai: string;
};

export type AggregateCicilanItem = {
  id?: string;
  nominal: number | string;
  tanggal: string;
  tipe_hutang_snapshot?: 'memberi' | 'menerima' | string;
  hutang?: {
    tipe: 'memberi' | 'menerima' | string;
  } | null;
};

export type RekapRingkasanHutangPiutang = {
  piutang_baru: number;
  hutang_baru: number;
  cicilan_piutang: number;
  cicilan_hutang: number;
  net_arus_kas: number; // Formula D8: (hutang_baru + cicilan_piutang) - (piutang_baru + cicilan_hutang)
};

export type RekapRingkasanKoreksi = {
  total_tambah: number;
  total_kurang: number;
  net: number;
  count: number;
};

export type RekapRingkasanPeriode = {
  startDate: string;
  endDate: string;
  total_income: number;
  total_expense: number;
  net: number; // total_income - total_expense
  net_arus_kas_hutang_piutang: number; // Formula D8
  hutang_piutang: RekapRingkasanHutangPiutang;
  koreksi: RekapRingkasanKoreksi;
};

export type AggregateDataSource = {
  transaksi?: AggregateTransaksiItem[];
  hutang?: AggregateHutangItem[];
  cicilan?: AggregateCicilanItem[];
};

/**
 * Normalisasi objek periode agar memiliki `startDate` dan `endDate` bertipe string YYYY-MM-DD.
 * Mendukung variasi properti seperti `dari`/`sampai` atau `tanggal_mulai`/`tanggal_selesai`.
 */
function extractPeriodDates(period: Record<string, unknown>): {
  startDate: string;
  endDate: string;
} {
  const startDate = String(
    period.startDate ?? period.dari ?? period.tanggal_mulai ?? '',
  );
  const endDate = String(
    period.endDate ?? period.sampai ?? period.tanggal_selesai ?? '',
  );
  return { startDate, endDate };
}

/**
 * Mengelompokkan dan mengagregasi data finansial ke setiap periode dalam `periods`.
 * Mengembalikan array ringkasan yang mempertahankan seluruh atribut awal periode.
 */
export function aggregateRekapByPeriods<P extends Record<string, unknown>>(
  periods: P[],
  data: AggregateDataSource,
): (P & RekapRingkasanPeriode)[] {
  if (!Array.isArray(periods) || periods.length === 0) {
    return [];
  }

  const transaksiList = data.transaksi ?? [];
  const hutangList = data.hutang ?? [];
  const cicilanList = data.cicilan ?? [];

  return periods.map((period) => {
    const { startDate, endDate } = extractPeriodDates(period);

    let total_income = 0;
    let total_expense = 0;

    let koreksi_tambah = 0;
    let koreksi_kurang = 0;
    let koreksi_count = 0;

    // 1. Agregasi Transaksi (GR-9: perbandingan leksikografis string tanggal YYYY-MM-DD)
    for (const t of transaksiList) {
      if (!t.tanggal || t.tanggal < startDate || t.tanggal > endDate) {
        continue;
      }

      const nominal = Number(t.nominal) || 0;

      if (t.tipe === 'income') {
        total_income += nominal;
      } else if (t.tipe === 'expense') {
        total_expense += nominal;
      } else if (t.tipe === 'correction') {
        // D12: Koreksi tidak masuk income/expense
        koreksi_count += 1;
        if (t.tags?.includes('correction_sub')) {
          koreksi_kurang += nominal;
        } else {
          koreksi_tambah += nominal;
        }
      }
      // D12: Transfer tidak masuk income/expense/koreksi
    }

    // 2. Agregasi Hutang Baru
    let piutang_baru = 0;
    let hutang_baru = 0;

    for (const h of hutangList) {
      if (
        !h.tanggal_mulai ||
        h.tanggal_mulai < startDate ||
        h.tanggal_mulai > endDate
      ) {
        continue;
      }

      const pinjaman = Number(h.total_pinjaman) || 0;
      if (h.tipe === 'memberi') {
        piutang_baru += pinjaman;
      } else if (h.tipe === 'menerima') {
        hutang_baru += pinjaman;
      }
    }

    // 3. Agregasi Cicilan
    let cicilan_piutang = 0;
    let cicilan_hutang = 0;

    for (const c of cicilanList) {
      if (!c.tanggal || c.tanggal < startDate || c.tanggal > endDate) {
        continue;
      }

      const nominal = Number(c.nominal) || 0;
      const tipe = c.hutang?.tipe ?? c.tipe_hutang_snapshot;

      if (tipe === 'memberi') {
        cicilan_piutang += nominal;
      } else if (tipe === 'menerima') {
        cicilan_hutang += nominal;
      }
    }

    // D8: Arus kas bersih hutang/piutang
    // hutang baru (kas masuk +) − piutang baru (kas keluar -) − bayar cicilan hutang (kas keluar -) + terima cicilan piutang (kas masuk +)
    const net_arus_kas =
      hutang_baru - piutang_baru - cicilan_hutang + cicilan_piutang;

    const ringkasanHutangPiutang: RekapRingkasanHutangPiutang = {
      piutang_baru,
      hutang_baru,
      cicilan_piutang,
      cicilan_hutang,
      net_arus_kas,
    };

    const ringkasanKoreksi: RekapRingkasanKoreksi = {
      total_tambah: koreksi_tambah,
      total_kurang: koreksi_kurang,
      net: koreksi_tambah - koreksi_kurang,
      count: koreksi_count,
    };

    return {
      ...period,
      startDate,
      endDate,
      total_income,
      total_expense,
      net: total_income - total_expense,
      net_arus_kas_hutang_piutang: net_arus_kas,
      hutang_piutang: ringkasanHutangPiutang,
      koreksi: ringkasanKoreksi,
    };
  });
}
