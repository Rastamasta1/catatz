# Rekap Feature Overhaul: Phased Implementation Plan

Dokumen ini adalah **sumber kebenaran tunggal (Single Source of Truth)** untuk rencana dan eksekusi perombakan fitur **Rekap Keuangan (`/reports`)** pada aplikasi CatatZ.

Dokumen ini dirancang agar setiap fase mandiri, memiliki batasan ruang lingkup (*scope*) yang tegas, aman untuk sistem berstatus **Production (Live)**, dan dapat dikerjakan secara berurutan oleh AI coding agent (Codex, Claude Code, Antigravity) tanpa membebani context window dalam satu sesi eksekusi.

---

## 1. Ground Rules & Production Constraints

Wajib dipatuhi oleh seluruh AI coding agent pada setiap fase pengerjaan:

1. **Production Status (Zero-Destructive)**:
   - Dilarang mengubah migration lama (`src/migrations/001-*.sql` s/d `014-*.sql`).
   - Penambahan schema database WAJIB menggunakan file migration baru yang additive dan backward-compatible (`src/migrations/015-rekap-preferences-and-custom-reports.sql`).
2. **Financial Data Integrity**:
   - Perhitungan saldo awal, pengeluaran, pemasukan, utang piutang, dan saldo akhir harus matematis presisi dan konsisten dengan saldo rekening riil.
   - Triggers database pada tabel `transaksi`, `rekening`, dan `hutang` tidak boleh diutak-atik.
3. **Design Contract Compliance (`DESIGN.md`)**:
   - Seluruh CTA button WAJIB `rounded-full` (pill).
   - Container card menggunakan `rounded-[24px]` (`rounded-card`) dengan batas `border-hairline` (#dee1e6).
   - Seluruh nominal uang WAJIB menggunakan `font-mono` (Geist Mono) via formatter `formatRupiah()`.
   - Heading display (`h1`) wajib `text-[32px] font-normal tracking-[-0.4px]` (bukan `font-bold`).
   - Elevation bersifat FLAT; hover hanya menggunakan satu tier shadow `hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]`.
   - Warna `text-semantic-up` (#05b169) dan `text-semantic-down` (#cf202f) **hanya untuk teks**, bukan background.
4. **Stateless AI Session Friendly**:
   - Setiap fase memiliki batasan file yang disentuh dan checklist verifikasi mandiri.
   - Setiap fase harus lulus `npm run verify:quick` sebelum lanjut ke fase berikutnya.
5. **Bahasa UI**:
   - Seluruh UI user-facing menggunakan Bahasa Indonesia, sesuai aturan repository.

---

## 2. Arsitektur & Spesifikasi Fungsional

### 2.1 Konfigurasi Rekap & Periode Dinamis
- **Tanggal Mulai Periode (`rekap_start_day`)**: Angka 1 s/d 31 (default: 1).
  - Contoh: Jika `rekap_start_day = 10`, periode bulanan berjalan dari tanggal 10 bulan berjalan s/d tanggal 9 bulan berikutnya (contoh: 10 Okt 2026 - 09 Nov 2026).
  - Penanganan bulan pendek (Februari, April, dsb.): Tanggal dipotong otomatis ke hari terakhir bulan terkait (`Math.min(startDay, daysInMonth)`).
- **Saldo Akumulasi (`rekap_accumulate_balance`)**: Boolean (default: `true`).
  - **Aktif (`true`)**: Saldo awal dihitung dari carryover akumulasi saldo masa lalu sebelum tanggal mulai periode. Saldo akhir = Saldo Awal + Selisih (+ Penyesuaian Utang/Piutang & Koreksi).
  - **Nonaktif (`false`)**: Saldo awal dianggap 0. Laporan hanya fokus pada pergerakan arus kas (*cashflow net*) dalam periode tersebut.

### 2.2 Struktur Data Informasi Rekap
Informasi yang disajikan pada setiap periode rekap:
1. **Saldo Awal**: Saldo akumulatif rekening sebelum tanggal mulai periode (jika saldo akumulasi aktif).
2. **Pemasukan**: Total transaksi tipe `income` dalam periode.
3. **Pengeluaran**: Total transaksi tipe `expense` dalam periode.
4. **Selisih**: `Pemasukan - Pengeluaran`.
5. **Utang Piutang**: Arus kas atau aktivitas utang/piutang (piutang diberikan, cicilan diterima, utang ditarik, cicilan dibayar).
6. **Saldo Akhir**: `Saldo Awal + Selisih (+ Penyesuaian Mutasi Terkait)`.

### 2.3 Navigasi & Struktur View
Halaman `/reports` dirancang memiliki struktur:
```text
/reports
├── Header: Judul "Rekap Keuangan" + Tombol "Pengaturan" (kanan atas)
├── Tab Bar Utama:
│   ├── Tab 1: Bulanan (Daftar kartu periode bulanan + selector tahun)
│   ├── Tab 2: Kustom (Daftar kartu rekap kustom + tombol tambah '+')
│   └── Tab 3: Waktu Nyata (Grafik & rincian kategori periode aktif berjalan)
└── Sub-View / Route Detail Rekap (Ketika periode bulanan atau kustom diklik):
    ├── Header: Tombol "Kembali", Judul Periode, Rentang Tanggal
    ├── Ringkasan Finansial Card (Saldo Awal, Pemasukan, Pengeluaran, Selisih, Utang Piutang, Saldo Akhir)
    └── Tab Bar Detail:
        ├── Tab 1: Grafik (Visualisasi arus kas periode)
        ├── Tab 2: Kategori (Breakdown per kategori -> Klik untuk Drill-down)
        └── Tab 3: Judul (Breakdown per judul transaksi -> Klik untuk Drill-down)
```

---

## 3. Matriks Fase Implementasi (Phase Matrix)

| Fase | Nama Fase | Scope Utama | Estimasi Kompleksitas |
| :--- | :--- | :--- | :--- |
| **Fase 1** | Database Migration & Preferences | Migration `015`, types, `user_preferences` handler | Rendah |
| **Fase 2** | Core Calculation Engine | Pure logic `rekap-calculator.ts` + unit tests 100% | Sedang |
| **Fase 3** | Server Actions Layer | Data fetching bulanan, kustom CRUD, detail actions | Sedang |
| **Fase 4** | Tab Bulanan & Pengaturan Rekap | UI Tab Bulanan, list periode, Modal Pengaturan | Sedang |
| **Fase 5** | Halaman Detail Rekap | View Detail: Header, Metric Card, 3 Tab (Grafik, Kategori, Judul) | Sedang - Tinggi |
| **Fase 6** | Drill-down Transaksi Individual | Drawer/Sheet daftar transaksi per Kategori & Judul | Sedang |
| **Fase 7** | Fitur Rekap Kustom | Tab Kustom, Dialog Create/Edit, CRUD, Link ke Detail | Sedang |
| **Fase 8** | Tab Grafik Rekap Waktu Nyata | Tab Waktu Nyata, Donut Chart, Legend Kategori | Sedang |
| **Fase 9** | Polish, Verifikasi Menyeluruh & Docs | Responsiveness audit, PWA test, Docs update | Rendah - Sedang |

---

## 4. Rincian Eksekusi Per Fase

### Fase 1: Database Migration & Configuration Foundation
- **Tujuan**: Menyediakan persistensi database untuk pengaturan rekap dan data rekap kustom.
- **Scope Perubahan**:
  1. Buat file migration `src/migrations/015-rekap-preferences-and-custom-reports.sql`:
     - Tambahkan kolom pada `public.user_preferences`:
       - `rekap_start_day INT NOT NULL DEFAULT 1 CHECK (rekap_start_day BETWEEN 1 AND 31)`
       - `rekap_accumulate_balance BOOLEAN NOT NULL DEFAULT TRUE`
     - Buat tabel `public.rekap_kustom`:
       - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
       - `user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE`
       - `nama TEXT NOT NULL`
       - `tanggal_mulai DATE NOT NULL`
       - `tanggal_selesai DATE NOT NULL`
       - `catatan TEXT`
       - `created_at TIMESTAMPTZ DEFAULT NOW()`
       - `updated_at TIMESTAMPTZ DEFAULT NOW()`
       - Index `idx_rekap_kustom_user_tanggal` pada `(user_id, tanggal_mulai DESC)`
       - RLS Policy: SELECT, INSERT, UPDATE, DELETE untuk `auth.uid() = user_id`
       - Grant permissions ke role `authenticated`.
  2. Update `src/lib/user-preferences.ts`:
     - Tambahkan definisi tipe dan default values untuk preferensi rekap.
     - Tambahkan validasi pada `validateUserPreferenceUpdate`.
  3. Update `src/types/rekap.ts` (atau buat baru jika belum ada) untuk tipe data `RekapKustom` dan `RekapPreferences`.
- **Deliverables**:
  - `src/migrations/015-rekap-preferences-and-custom-reports.sql`
  - `src/lib/user-preferences.ts`
  - `src/types/rekap.ts`
- **Validasi**:
  - `npm run verify:quick` (lint & typecheck lolos).
- **Suggested Commit**:
  ```text
  feat(rekap): add database migration for rekap preferences and custom reports

  Add migration 015 with rekap_start_day and rekap_accumulate_balance columns on user_preferences,
  and create the rekap_kustom table with RLS policies and indexes.
  Update user-preferences helper and TypeScript definitions.
  ```

---

### Fase 2: Core Calculation Engine (`rekap-calculator.ts`)
- **Tujuan**: Membangun modul pure utility function yang independen dan 100% teruji untuk seluruh logika matematika rekap dan penanggalan dinamis.
- **Scope Perubahan**:
  1. Buat `src/lib/rekap-calculator.ts`:
     - `getDynamicMonthRange(year: number, month: number, startDay: number)`:
       - Menghasilkan `{ startDate: string, endDate: string, label: string }`.
       - Mengatasi hari batas (misal `startDay = 31` pada bulan yang hanya memiliki 28/30 hari).
     - `calculateRekapSummary({ transactions, previousBalance, accumulateBalance, debts, corrections })`:
       - Menghitung Saldo Awal, Pemasukan, Pengeluaran, Selisih, Net Utang/Piutang, Net Koreksi, dan Saldo Akhir.
     - `calculateBreakdownByCategory(transactions, type: 'income' | 'expense')`:
       - Menghasilkan daftar kategori dengan total nominal, persentase dari total, dan jumlah transaksi.
     - `calculateBreakdownByTitle(transactions, type: 'income' | 'expense')`:
       - Menghasilkan daftar judul transaksi dengan total nominal, persentase, dan frekuensi.
  2. Buat unit test `tests/unit/rekap-calculator.test.ts`:
     - Test perhitungan cut-off tanggal 1 (normal).
     - Test perhitungan cut-off tanggal 10 (lintas bulan: 10 Okt s/d 9 Nov).
     - Test penanganan edge cases (tanggal 31 di Februari).
     - Test perhitungan saldo akumulasi aktif vs non-aktif.
     - Test agregasi kategori dan judul transaksi.
- **Deliverables**:
  - `src/lib/rekap-calculator.ts`
  - `tests/unit/rekap-calculator.test.ts`
- **Validasi**:
  - `npm run test` (unit test lulus 100%).
  - `npm run verify:quick`.
- **Suggested Commit**:
  ```text
  feat(rekap): implement pure calculation engine and period utilities

  Create rekap-calculator with dynamic month range calculation, financial summary aggregation,
  and category/title breakdown generators.
  Add unit tests covering edge-case date boundaries and balance accumulation logic.
  ```

---

### Fase 3: Server Actions Layer (Monthly, Custom, & Detail)
- **Tujuan**: Mengimplementasikan Server Actions untuk mengambil dan mengelola data rekap bulanan, rekap kustom, dan detail periode secara aman dan efisien.
- **Scope Perubahan**:
  1. Perbarui `src/actions/rekap-action.ts`:
     - `getRekapBulananList(year: number)`:
       - Membaca preferensi `rekap_start_day` dan `rekap_accumulate_balance` user.
       - Menghitung 12 periode bulanan dalam tahun tersebut dengan saldo awal, pengeluaran, pemasukan, selisih, utang piutang, dan saldo akhir.
     - `getRekapDetailPeriode(startDate: string, endDate: string)`:
       - Mengambil seluruh transaksi, kategori, rekening, hutang, dan cicilan dalam rentang tanggal tersebut.
       - Memanfaatkan `rekap-calculator` untuk menghasilkan summary, chart series, breakdown kategori, dan breakdown judul.
     - `updateRekapPreferences(startDay: number, accumulateBalance: boolean)`.
  2. Buat `src/actions/rekap-kustom-action.ts`:
     - `getRekapKustomList()`: Mengambil semua rekap kustom user dengan ringkasan finansial masing-masing.
     - `createRekapKustom({ nama, tanggal_mulai, tanggal_selesai, catatan })`.
     - `updateRekapKustom(id, { nama, tanggal_mulai, tanggal_selesai, catatan })`.
     - `deleteRekapKustom(id)`.
- **Deliverables**:
  - `src/actions/rekap-action.ts`
  - `src/actions/rekap-kustom-action.ts`
- **Validasi**:
  - `npm run verify:quick` (typecheck & lint).
- **Suggested Commit**:
  ```text
  feat(rekap): implement server actions for monthly recap, custom recap, and details

  Update rekap-action to use dynamic cut-off periods and balance calculations.
  Add rekap-kustom-action with complete CRUD operations and user-level RLS queries.
  ```

---

### Fase 4: Halaman Rekap Bulanan & Modal Pengaturan Rekap
- **Tujuan**: Membangun tampilan utama tab Bulanan pada `/reports` dan modal pengaturan konfigurasi rekap.
- **Scope Perubahan**:
  1. Komponen `src/app/(dashboard)/reports/_components/rekap-settings-dialog.tsx`:
     - Dialog Pengaturan:
       - Pilihan Tanggal Mulai Periode (Select 1-31).
       - Switch Saldo Akumulasi (Aktif/Nonaktif) dengan keterangan fungsi.
       - Tombol Batal & Simpan (CTA pill `rounded-full`).
       - Toast feedback saat berhasil disimpan & revalidasi data.
  2. Komponen `src/app/(dashboard)/reports/_components/rekap-bulanan-tab.tsx`:
     - Bar atas: Pemilih Tahun (Chevron navigasi & select tahun) + tombol "Pengaturan" di header pojok kanan atas.
     - Daftar kartu periode bulanan (12 periode):
       - Setiap kartu menampilkan:
         - Label periode (misal: "10 Okt - 09 Nov 2026")
         - Grid metrik ringkas: Saldo Awal, Pemasukan (`text-semantic-up`), Pengeluaran (`text-semantic-down`), Selisih, Utang Piutang, Saldo Akhir.
         - Format nominal dengan `font-mono`.
         - Styling card: `rounded-card`, `border-hairline`, flat elevation, hover transition.
       - Interaksi klik kartu: membuka sub-view / routing ke Detail Rekap periode tersebut.
  3. Integrasikan ke `src/app/(dashboard)/reports/_components/rekap-page-client.tsx`.
- **Deliverables**:
  - `src/app/(dashboard)/reports/_components/rekap-settings-dialog.tsx`
  - `src/app/(dashboard)/reports/_components/rekap-bulanan-tab.tsx`
  - `src/app/(dashboard)/reports/_components/rekap-page-client.tsx`
- **Validasi**:
  - `npm run verify:quick`.
  - Cek visual di light mode dan dark mode.
- **Suggested Commit**:
  ```text
  feat(rekap): build monthly recap tab and settings configuration dialog

  Add RekapSettingsDialog for configuring cut-off start day and balance accumulation toggle.
  Implement RekapBulananTab with responsive period summary cards following DESIGN.md tokens.
  ```

---

### Fase 5: Halaman Detail Rekap (Grafik, Kategori, & Judul)
- **Tujuan**: Membangun antarmuka Detail Rekap dengan tiga tab: Grafik, Kategori, dan Judul Transaksi.
- **Scope Perubahan**:
  1. Komponen Header & Summary Metric Detail Rekap:
     - Tombol kembali (`<Button variant="ghost" className="rounded-full">` dengan icon `ArrowLeft`).
     - Judul periode & rentang tanggal terpilih.
     - Card ringkasan finansial utama (Saldo Awal, Pemasukan, Pengeluaran, Selisih, Utang Piutang, Saldo Akhir).
  2. Tab 1: **Grafik** (`rekap-detail-grafik-tab.tsx`):
     - Visualisasi Recharts (Bar chart komparasi Pemasukan vs Pengeluaran per hari atau per minggu).
     - Tooltip kustom dengan format rupiah dan `font-mono`.
  3. Tab 2: **Kategori** (`rekap-detail-kategori-tab.tsx`):
     - Filter switch Pemasukan / Pengeluaran.
     - List item kategori: Icon, nama kategori, badge persentase, nominal total (`font-mono`), bar progress.
     - Hover state interaktif dengan cursor pointer (persiapan drill-down).
  4. Tab 3: **Judul** (`rekap-detail-judul-tab.tsx`):
     - Filter switch Pemasukan / Pengeluaran.
     - List item judul transaksi: Judul, frekuensi (jumlah transaksi), persentase, total nominal (`font-mono`).
     - Hover state interaktif dengan cursor pointer.
- **Deliverables**:
  - `src/app/(dashboard)/reports/_components/rekap-detail-view.tsx`
  - `src/app/(dashboard)/reports/_components/rekap-detail-grafik-tab.tsx`
  - `src/app/(dashboard)/reports/_components/rekap-detail-kategori-tab.tsx`
  - `src/app/(dashboard)/reports/_components/rekap-detail-judul-tab.tsx`
- **Validasi**:
  - `npm run verify:quick`.
  - Uji responsivitas pada layar mobile (<640px) dan desktop (>1024px).
- **Suggested Commit**:
  ```text
  feat(rekap): implement detailed recap view with charts, categories, and titles tabs

  Create RekapDetailView with comprehensive financial summary cards and three sub-tabs:
  trend charts using Recharts, category breakdown with progress bars, and transaction title breakdown.
  ```

---

### Fase 6: Drill-down Transaksi Individual (Kategori & Judul)
- **Tujuan**: Menghubungkan klik pada item kategori atau judul transaksi untuk menampilkan daftar transaksi individual yang membentuk total tersebut.
- **Scope Perubahan**:
  1. Buat komponen Sheet / Drawer / Dialog `rekap-transaction-drilldown.tsx`:
     - Header: Menampilkan nama kategori/judul yang sedang di-drill-down, icon, serta total nominal akumulatif (`font-mono`) dan jumlah transaksi.
     - Konten: Daftar transaksi individual dalam periode tersebut:
       - Tanggal dan jam transaksi.
       - Nama rekening sumber (dengan logo/ikon rekening).
       - Judul dan catatan transaksi.
       - Nominal dengan warna semantik (`text-semantic-up` atau `text-semantic-down`) dan `font-mono`.
     - Empty state jika tidak ada transaksi.
  2. Sambungkan event `onClick` pada item kategori di `rekap-detail-kategori-tab.tsx` dan item judul di `rekap-detail-judul-tab.tsx`.
- **Deliverables**:
  - `src/app/(dashboard)/reports/_components/rekap-transaction-drilldown.tsx`
  - Update `rekap-detail-kategori-tab.tsx` & `rekap-detail-judul-tab.tsx`
- **Validasi**:
  - `npm run verify:quick`.
  - Uji interaksi klik di mobile dan desktop.
- **Suggested Commit**:
  ```text
  feat(rekap): implement transaction drill-down sheet for category and title breakdowns

  Add RekapTransactionDrilldown sheet displaying individual transactions composing a selected
  category or title total, with account badges, timestamps, and semantic amounts.
  ```

---

### Fase 7: Fitur Rekap Kustom (Tab Kustom & CRUD)
- **Tujuan**: Mengimplementasikan tab Rekap Kustom dengan kemampuan membuat, mengedit, menghapus, dan membuka detail rekap periode kustom.
- **Scope Perubahan**:
  1. Komponen `rekap-kustom-tab.tsx`:
     - Tombol CTA tambah (+ Rekap Baru) di bagian atas (pill `rounded-full`).
     - Daftar kartu rekap kustom:
       - Nama rekap (misal: "Quarter 1", "Liburan Akhir Tahun").
       - Rentang tanggal kustom (misal: "01 Jan 2026 - 31 Mei 2026").
       - Ringkasan angka finansial: Pemasukan, Pengeluaran, Selisih, Saldo Awal/Akhir.
       - Menu aksi (Dropdown menu: Edit, Hapus) dengan konfirmasi hapus aman.
       - Klik kartu: Membuka Detail Rekap dengan rentang tanggal rekap kustom tersebut.
  2. Komponen `rekap-kustom-dialog.tsx`:
     - Modal form tambah / edit rekap kustom:
       - Input Nama Rekap (`h-12 rounded-input`).
       - Input Tanggal Mulai dan Tanggal Selesai.
       - Validasi: Tanggal selesai tidak boleh lebih awal dari tanggal mulai.
       - Tombol Simpan & Batal (pill `rounded-full`).
  3. Integrasikan ke `rekap-page-client.tsx` pada Tab "Kustom".
- **Deliverables**:
  - `src/app/(dashboard)/reports/_components/rekap-kustom-tab.tsx`
  - `src/app/(dashboard)/reports/_components/rekap-kustom-dialog.tsx`
  - Update `src/app/(dashboard)/reports/_components/rekap-page-client.tsx`
- **Validasi**:
  - `npm run verify:quick`.
  - Uji alur Create, Read, Update, Delete rekap kustom.
- **Suggested Commit**:
  ```text
  feat(rekap): implement custom recap tab with creation, editing, and custom detail view

  Add RekapKustomTab and RekapKustomDialog for creating and managing custom period recaps.
  Connect custom recaps to the detailed recap view with custom date range calculations.
  ```

---

### Fase 8: Tab Grafik Rekap Waktu Nyata
- **Tujuan**: Mengimplementasikan tab Waktu Nyata di halaman utama rekap untuk melihat visualisasi donat/pie chart instan pada periode aktif.
- **Scope Perubahan**:
  1. Komponen `rekap-realtime-tab.tsx`:
     - Donut Chart interaktif menggunakan Recharts dengan lazy loading.
     - Toggle filter antara "Pengeluaran" dan "Pemasukan".
     - Legend detail di samping/bawah grafik:
       - Badge warna & icon kategori.
       - Nama kategori.
       - Persentase pengeluaran/pemasukan.
       - Nominal terformat (`font-mono`).
     - Card ringkasan cepat periode waktu nyata (Pemasukan vs Pengeluaran bulan berjalan).
  2. Integrasikan ke `rekap-page-client.tsx` pada Tab "Waktu Nyata".
- **Deliverables**:
  - `src/app/(dashboard)/reports/_components/rekap-realtime-tab.tsx`
  - Update `src/app/(dashboard)/reports/_components/rekap-page-client.tsx`
- **Validasi**:
  - `npm run verify:quick`.
  - Cek responsivitas donat chart pada layar mobile.
- **Suggested Commit**:
  ```text
  feat(rekap): implement real-time recap tab with interactive category donut chart

  Add RekapRealtimeTab featuring an interactive donut chart with category legends, percentages,
  and mono-formatted values for the current active period.
  ```

---

### Fase 9: Final Polish, Verifikasi Menyeluruh & Documentation Gate
- **Tujuan**: Memastikan keharmonisan visual, tidak ada regresi finansial/PWA, serta menyinkronkan seluruh dokumentasi project.
- **Scope Perubahan**:
  1. Audit Kepatuhan `DESIGN.md`:
     - Cek seluruh tombol CTA menggunakan `rounded-full`.
     - Cek seluruh nominal angka menggunakan `font-mono`.
     - Cek kontras kartu di dark mode vs light mode.
     - Cek tidak ada teks yang truncate atau overflow di viewport mobile (<640px).
  2. Audit PWA & Build:
     - PWA cache & service worker check (`next build --webpack`).
     - Jalankan `npm run verify:quick` dan `npm run test`.
  3. Pembaruan Dokumentasi:
     - `docs/features/laporan.md`: Update penjelasan fitur Rekap baru, konfigurasi cut-off, rekap kustom, dan tab waktu nyata.
     - `docs/database-schema.md` & `docs/database-migrations.md`: Catat migration `015`.
     - `docs/server-actions-api.md`: Catat API signature baru untuk `rekap-action` dan `rekap-kustom-action`.
     - `CHANGELOG.md`: Catat ringkasan perubahan fitur Rekap.
- **Deliverables**:
  - Update `docs/features/laporan.md`
  - Update `docs/database-schema.md`
  - Update `docs/database-migrations.md`
  - Update `docs/server-actions-api.md`
  - Update `CHANGELOG.md`
- **Validasi**:
  - `npm run verify:quick`.
  - `npm run build`.
- **Suggested Commit**:
  ```text
  docs(rekap): synchronize documentation and complete final polish for rekap overhaul

  Update documentation in docs/features/laporan.md, database schema, migrations list,
  and server actions API to reflect the overhauled Rekap feature.
  Perform final UI and PWA build checks.
  ```

---

## 5. Checklist Verifikasi Mandiri per Sesi AI Agent

Sebelum menyelesaikan setiap sesi/fase, agent WAJIB mencentang checklist berikut:

- [ ] Tidak mengubah migration lama (`001` - `014`).
- [ ] Seluruh tombol CTA utama menggunakan `rounded-full`.
- [ ] Seluruh nominal uang menggunakan `font-mono`.
- [ ] Teks user-facing menggunakan Bahasa Indonesia.
- [ ] Menjalankan `npm run verify:quick` dan memastikan 0 errors / 0 lint warnings baru.
- [ ] Menyertakan suggested Conventional Commit message lengkap dengan body teknis.
