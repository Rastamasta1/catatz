# Feature: Laporan/Rekap

## Status

Status: **Production (Aktif)** untuk rekap dan export PDF/XLSX/CSV. Budget usage tampil jika data budget tersedia.

## Deskripsi

Fitur laporan/rekap menampilkan ringkasan pemasukan, pengeluaran, detail bulanan, breakdown kategori/judul, chart, dan export transaksi.

## Route

- `/reports`
- Export data berada di `/settings` tab `Export Data`.

## Lokasi File

- Rekap page: `src/app/(dashboard)/reports/page.tsx`
- Loading: `src/app/(dashboard)/reports/loading.tsx`
- Client page: `src/app/(dashboard)/reports/_components/rekap-page-client.tsx`
- Chart: `src/app/(dashboard)/reports/_components/rekap-charts.tsx`
- Detail bulanan: `src/app/(dashboard)/reports/_components/rekap-monthly-detail-section.tsx`
- Rekap actions: `src/actions/rekap-action.ts`
- Export actions: `src/actions/export-action.ts`
- PDF generator: `src/lib/pdf-generator.ts`
- Spreadsheet generator: `src/lib/spreadsheet-generator.ts`
- Export section: `src/app/(dashboard)/settings/_components/export-section.tsx`

## Data Source

Rekap initial data:

- `getRekapBulanan(tahun)`
- `getRekapDetailBulanan(bulan, tahun)`
- `getBudgetWithUsage(bulan, tahun)`

Export data:

- `getExportData(filter)`
- `getExportCount()`

## Tabel Database Terkait

- `transaksi`
- `kategori`
- `rekening`
- `hutang`
- `hutang_cicilan`
- `profiles`
- `budget`

## Server Action Terkait

- `getRekapBulanan`
- `getRekapDetailBulanan`
- `getRekapDetailByRange`
- `getRekapRingkasanPeriodeList`
- `getRekapKategori`
- `getBudgetWithUsage`
- `upsertBudget`
- `getExportData`
- `getExportCount`

## Business Rules

- Rekap bulanan menghitung `income` dan `expense`; `transfer` dan `correction` tidak masuk selisih utama (D12).
- Detail bulan menampilkan selisih pemasukan/pengeluaran, rata-rata harian, serta total selisih koreksi saldo dan hutang/piutang jika ada aktivitas pada bulan tersebut.
- Koreksi saldo dan hutang/piutang tidak diselisihkan ke nominal utama pemasukan dikurangi pengeluaran.
- Breakdown detail dapat dilihat berdasarkan kategori atau judul untuk transaksi `income` dan `expense`.
- Detail hutang/piutang dihitung dari hutang/piutang baru dan cicilan pada rentang tanggal terpilih.
- **Catatan Rekonsiliasi Arus Kas Hutang/Piutang (D8)**:
  - Rumus lama `hutangPiutangNet` pada komponen UI `rekap-monthly-detail-section.tsx` saat ini menghitung:
    `piutang_baru + cicilan_piutang - hutang_baru - cicilan_hutang`
  - Rumus tersebut berbeda tanda (+ / -) dengan Keputusan Arsitektur D8 untuk arus kas riil bersih:
    `hutang_baru - piutang_baru - cicilan_hutang + cicilan_piutang` (menerima pinjaman dan terima cicilan piutang menambah saldo uang riil/kas masuk; memberi pinjaman dan bayar cicilan hutang mengurangi saldo uang riil/kas keluar).
  - Komponen `rekap-monthly-detail-section.tsx` dipertahankan tanpa perubahan pada Fase 4 dan direkonsiliasi pada fase UI terkait berikutnya (Fase 5/6).
- Budget usage menghitung expense per kategori pada bulan/tahun terpilih.
- Export PDF, XLSX, dan CSV dapat difilter dengan tanggal `dari` dan `sampai`.
- Export PDF menampilkan summary, count transaksi, periode, top kategori, dan detail transaksi.
- Export XLSX menampilkan sheet `Ringkasan` dan `Transaksi`.
- Export CSV menampilkan detail transaksi dalam format comma-separated values.

## UI Behavior

- Chart memakai Recharts dan di-lazy load untuk mengurangi bundle awal.
- Pilihan bulan berada di panel `Detail Rekap` melalui tombol bulan sebelumnya/berikutnya dan dropdown bulan.
- Summary card menampilkan pemasukan/pengeluaran bulan aktif dan total tahunan.
- Panel detail bulanan menampilkan rincian finansial dan hanya menampilkan baris total `Koreksi Saldo` atau `Hutang Piutang` jika bulan tersebut memiliki aktivitas terkait.
- Switch pada panel rincian mengubah breakdown dari kategori ke judul.
- Item kategori atau judul dapat dibuka untuk melihat daftar detail transaksi dengan pola visual seperti list transaksi.
- Budget section hanya tampil jika ada data budget untuk bulan aktif.
- Export PDF memakai dynamic import `src/lib/pdf-generator.ts`.
- Export XLSX/CSV memakai dynamic import `src/lib/spreadsheet-generator.ts`.

## TODO / Improvement

- UI untuk membuat/mengubah budget belum terlihat, walaupun action `upsertBudget` dan table `budget` sudah ada.
- Pertimbangkan filter periode di halaman `/reports` jika kebutuhan analisis lebih luas.
