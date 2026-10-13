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
- Settings dialog: `src/app/(dashboard)/reports/_components/rekap-settings-dialog.tsx`
- Chart (legacy, dipertahankan): `src/app/(dashboard)/reports/_components/rekap-charts.tsx`
- Detail bulanan (legacy, dipertahankan): `src/app/(dashboard)/reports/_components/rekap-monthly-detail-section.tsx`
- Summary cards (legacy, dipertahankan): `src/app/(dashboard)/reports/_components/rekap-summary-cards.tsx`
- Category breakdown (legacy, dipertahankan): `src/app/(dashboard)/reports/_components/rekap-kategori-section.tsx`
- Bar breakdown (legacy, dipertahankan): `src/app/(dashboard)/reports/_components/rekap-bar-section.tsx`
- Budget section (legacy, dipertahankan): `src/app/(dashboard)/reports/_components/rekap-budget-section.tsx`
- Rekap period engine: `src/lib/rekap-period.ts`
- Rekap aggregation: `src/lib/rekap-aggregate.ts`
- Rekap balance calculator: `src/lib/rekap-balance.ts`
- Rekap actions: `src/actions/rekap-action.ts`
- Rekap period & settings actions: `src/actions/rekap-period-action.ts`
- Rekap balance action: `src/actions/rekap-saldo-action.ts`
- Export actions: `src/actions/export-action.ts`
- PDF generator: `src/lib/pdf-generator.ts`
- Spreadsheet generator: `src/lib/spreadsheet-generator.ts`
- Export section: `src/app/(dashboard)/settings/_components/export-section.tsx`

## Data Source

Rekap initial data:

- `getRekapSettings()` (pengaturan cut-off & akumulasi saldo)
- `getRekapBulanan(tahun)`
- `getRekapDetailBulanan(bulan, tahun)`
- `getBudgetWithUsage(bulan, tahun)`

Export data:

- `getExportData(filter)`
- `getExportCount()`

## Tabel Database Terkait

- `rekap_settings`
- `rekap_periode_custom`
- `transaksi`
- `kategori`
- `rekening`
- `hutang`
- `hutang_cicilan`
- `profiles`
- `budget`

## Server Action Terkait

- `getRekapSettings`
- `updateRekapSettings`
- `listCustomPeriods`
- `createCustomPeriod`
- `updateCustomPeriod`
- `deleteCustomPeriod`
- `getSaldoPeriodeList`
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

- Shell baru rekap (`RekapPageClient`) menampilkan `PageHeader` dengan judul "Rekap Keuangan" dan tombol pengaturan (tap target 44px, `size-11`, `rounded-full`) dengan `aria-label="Pengaturan Rekap"` di pojok kanan atas.
- Navigasi tab utama: "Realtime", "Bulanan", dan "Custom".
- Tab aktif disinkronkan ke URL query parameter `?tab=` via `router.replace(..., { scroll: false })` (default: `realtime`) agar navigasi kembali dari halaman detail tetap berada pada tab yang sama.
- Dialog pengaturan rekap (`RekapSettingsDialog`):
  - Aman safe-area pada viewport mobile (`rounded-card`, scrollable container).
  - Dropdown `Select` untuk tanggal cut-off siklus 1–31 dengan pratinjau live rentang siklus berjalan (menggunakan helper `rekap-period.ts`).
  - Toggle `Switch` untuk "Saldo Akumulasi" dengan deskripsi informatif.
  - Penyimpanan perubahan via Server Action `updateRekapSettings` dengan state optimistik, rollback bila gagal, notifikasi Sonner `toast`, dan `router.refresh()`.
- Komponen rekap legacy (`rekap-summary-cards`, `rekap-monthly-detail-section`, `rekap-kategori-section`, `rekap-bar-section`, `rekap-charts`, `rekap-budget-section`) tidak dihapus dan tidak diedit untuk menjamin backward compatibility, sementara tiap tab menampilkan placeholder `EmptyState` pada fase ini.
- Export PDF memakai dynamic import `src/lib/pdf-generator.ts`.
- Export XLSX/CSV memakai dynamic import `src/lib/spreadsheet-generator.ts`.

## TODO / Improvement

- UI untuk membuat/mengubah budget belum terlihat, walaupun action `upsertBudget` dan table `budget` sudah ada.
- Integrasi kartu ringkasan dan list siklus pada Tab Bulanan (Fase 7+).

