# Rekap Revamp Master Plan

Dokumen ini adalah **sumber kebenaran tunggal (Single Source of Truth)** untuk rencana arsitektur, inventarisasi kode, mitigasi risiko, dan eksekusi perombakan fitur **Rekap Keuangan (`/reports`)** pada aplikasi CatatZ.

Dokumen ini dirancang dengan isolasi ketat antar-fase (*phase by phase*) agar setiap sesi AI coding agent (Codex, Claude Code, Antigravity) dapat mengeksekusi satu fase secara tuntas, aman, dan patuh terhadap status aplikasi **Production (Live)** serta sistem desain [DESIGN.md](file:///Users/kupzed/Code/kupzed/catatz/DESIGN.md).

---

## 1. Target Fitur (Ringkas)

Perombakan fitur Rekap bertujuan mentransformasi halaman `/reports` menjadi pusat analitik keuangan yang komprehensif, fleksibel, dan intuitif dengan cakupan fungsional utama:

1. **3 Tab Navigasi Utama pada `/reports`**:
   - **Tab Realtime (Waktu Nyata)**: Menampilkan visualisasi donat (*donut chart*) pembagian pengeluaran dan pemasukan per kategori untuk siklus berjalan aktif saat ini, disertai legend interaktif (persentase, nama kategori, dan nominal terformat). Data di-refetch otomatis saat window fokus, perangkat kembali online, atau setelah mutasi data.
   - **Tab Bulanan**: Menampilkan daftar kartu periode rekap siklus bulanan secara kronologis mundur (12 periode per batch dengan tombol *"Muat lebih banyak"*). Setiap kartu menyajikan metrik lengkap (Saldo Awal, Pemasukan, Pengeluaran, Selisih, Hutang Piutang, Saldo Akhir).
   - **Tab Custom (Kustom)**: Menyediakan kemampuan membuat periode kustom dengan rentang tanggal bebas (misal: "Quarter 1", "Liburan Akhir Tahun"). Dilengkapi fitur CRUD penuh (Tambah, Edit, dan Hapus via `ConfirmDialog`) serta kartu ringkasan untuk setiap periode kustom.
2. **Pengaturan Siklus & Preferensi Finansial**:
   - Akses via tombol **Pengaturan** di kanan atas header halaman.
   - **Tanggal Cut-off Siklus (1–31)**: Menentukan tanggal mulai siklus bulanan (misal: tanggal 10 berarti siklus berjalan 10 Okt s/d 9 Nov). Bulan yang lebih pendek di-clamp ke hari terakhir bulan terkait. Cut-off 1 merepresentasikan bulan kalender normal.
   - **Toggle Saldo Akumulasi**: Menentukan apakah saldo awal dihitung kumulatif dari ledger masa lalu (aktif) atau dimulai dari nol sebagai murni evaluasi arus kas periode berjalan (nonaktif).
   - Seluruh pengaturan disimpan pada tabel terisolasi `rekap_settings`.
3. **Halaman Detail Rekap Periode**:
   - Dapat diakses saat pengguna mengeklik salah satu kartu periode (baik Bulanan maupun Custom).
   - Header informatif dengan tombol navigasi kembali, judul periode, dan label rentang tanggal.
   - Kartu metrik utama (Saldo Awal, Pemasukan, Pengeluaran, Selisih, Hutang Piutang, Saldo Akhir).
   - **3 Sub-tab Detail**:
     - **Tab Grafik**: Visualisasi grafik tren keuangan serta visualisasi "sisa saldo" (pemasukan [+ saldo awal bila akumulasi aktif] − pengeluaran; jika defisit, tampil 100% pengeluaran dengan indikator defisit).
     - **Tab Kategori**: Rincian breakdown pengeluaran dan pemasukan per kategori dengan persentase, nominal, dan jumlah transaksi.
     - **Tab Judul**: Rincian breakdown pengeluaran dan pemasukan berdasarkan judul transaksi dengan persentase, nominal, dan jumlah transaksi.
4. **Drill-Down Transaksi Individual**:
   - Interaksi klik pada setiap item kategori atau judul di halaman detail akan membuka drawer/sheet interaktif.
   - Menampilkan daftar transaksi individual pembentuk item tersebut lengkap dengan tanggal, waktu, nama rekening, judul, catatan, dan nominal semantik.

---

## 2. Ground Rules (GR-1..GR-9) & Keputusan Desain (D1..D12)

### 2.1 Keputusan Desain & Arsitektur (D1..D12)

| ID | Keputusan | Alasan Teknis & Rationale |
| :--- | :--- | :--- |
| **D1** | Setting siklus disimpan di tabel baru `rekap_settings`, bukan di `user_preferences`. | `USER_PREFERENCE_SELECT` dipakai layout, `page.tsx`, dan export. Kolom baru yang belum termigrasi akan mematahkan semua halaman. |
| **D2** | Periode custom disimpan di tabel `rekap_periode_custom`. Edit juga menyediakan Hapus (`ConfirmDialog`). | Spesifikasi hanya menyebut tambah dan edit, tapi tanpa hapus periode tidak bisa dibuang. |
| **D3** | Cut-off hari ke-D (1–31). Bulan yang lebih pendek di-clamp ke hari terakhir bulan. Siklus berakhir sehari sebelum siklus berikutnya mulai. Cut-off 1 berarti bulan kalender. | Siklus selalu bersambung tanpa celah dan tanpa tumpang tindih. |
| **D4** | Tab Bulanan menampilkan siklus dari yang berjalan mundur sampai bulan transaksi paling awal, 12 per batch dengan tombol "Muat lebih banyak". | Menjaga beban query tetap kecil. |
| **D5** | "Realtime" berarti siklus berjalan, di-refetch saat window fokus, kembali online, atau setelah mutasi (`revalidatePath` sudah ada). Tidak memakai Supabase Realtime websocket. | Codebase memakai Server Actions, dan akses data privat via browser client tidak dianjurkan di repo ini. |
| **D6** | "Hari ini" dihitung dengan zona `Asia/Jakarta`, bukan `new Date()` server (UTC). | Kode rekap lama bisa salah siklus sekitar tengah malam WIB. |
| **D7** | Saldo akhir periode = total `saldo_saat_ini` rekening yang tidak di-exclude, dikurangi semua delta ledger setelah tanggal akhir periode (dihitung mundur). Saldo awal = saldo akhir sehari sebelum periode mulai. | Otomatis konsisten dengan saldo asli yang diubah trigger, tidak bergantung tanggal pembuatan rekening. |
| **D8** | Baris "Hutang Piutang" di kartu = arus kas bersih (`hutang baru − piutang baru − bayar hutang + terima cicilan piutang`). Rumus `hutangPiutangNet` lama di `rekap-monthly-detail-section.tsx` berbeda tanda, jadi harus direkonsiliasi. | Supaya Saldo Akhir bisa dicocokkan dengan angka kartu. |
| **D9** | Toggle akumulasi berlaku untuk kartu Bulanan, kartu Custom, dan metrik detail. "Sisa saldo" di grafik detail = pemasukan (+ saldo awal bila akumulasi aktif) − pengeluaran. Jika defisit, tampil 100% pengeluaran dengan penanda defisit. | Spesifikasi belum mendefinisikan "sisa saldo". |
| **D10** | Tab Judul menampilkan Pengeluaran dan Pemasukan per judul. | Spesifikasi hanya menyebut pengeluaran, tapi fitur lama sudah menampilkan keduanya. |
| **D11** | Bar chart tahunan dan Budget section tidak dirender di UI baru. File dan action-nya tidak dihapus. | Budget berbasis bulan kalender dan tidak cocok dengan siklus. |
| **D12** | Transfer dan koreksi tidak masuk Pemasukan/Pengeluaran (sama seperti sekarang). Koreksi hanya tampil sebagai baris tambahan bila ada aktivitas. | Konsisten dengan `docs/features/laporan.md`. |

---

### 2.2 Ground Rules Pengembangan (GR-1..GR-9)

* **GR-1**: Hanya area rekap yang disentuh. Jangan ubah action transaksi/rekening/hutang, trigger, atau migration 001–013.
* **GR-2**: Tidak me-rename route yang ada. Sub-route baru hanya di Fase 8.
* **GR-3**: Signature dan bentuk return di `rekap-action.ts` tetap kompatibel sampai Fase 12.
* **GR-4**: Akses DB lewat Server Actions dengan `ActionResult<T>`, Zod v4, RLS, dan `revalidatePath`.
* **GR-5**: UI mengikuti `DESIGN.md`. CTA `rounded-full`, container `rounded-card`, nominal `font-mono`, tanpa shadow default, warna lewat token, Bahasa Indonesia, tap target ≥44px, light dan dark dicek.
* **GR-6**: Logika keuangan harus pure dan teruji (Vitest), masuk `coverage.include`, target ≥80%, dan dikerjakan test-first.
* **GR-7**: Tanpa dependency baru.
* **GR-8**: Satu fase = satu commit. Jalankan `npm run verify:quick`, update docs sesuai matrix `AGENTS.md`, dan akhiri dengan format final response `AGENTS.md` (termasuk suggested Conventional Commit). Jangan commit otomatis. E2E yang bergantung pada UI lama diperbarui di fase yang mengubahnya.
* **GR-9**: Bucketing tanggal memakai perbandingan string `YYYY-MM-DD`, bukan konversi `Date` yang rawan timezone.

---

## 3. Inventaris Kode Rekap Saat Ini

### 3.1 Status Route Aplikasi
- **Nama route aktual**: `/reports` (berada di `src/app/(dashboard)/reports/`).
- **Status migrasi route `/rekap` -> `/reports`**: **SUDAH SELESAI PENUH**.
  - Migrasi telah diselesaikan pada Fase 4 dan divalidasi pada Fase 7 & 8 pemetaan rute dashboard (`docs/route-migration-plan.md`, commit `cf5fcef`).
  - Redirect 308 permanen dari `/rekap` ke `/reports` aktif di `next.config.ts`.
  - Folder fisik route bernama `src/app/(dashboard)/reports`.

### 3.2 Pemetaan & Klasifikasi Kode Aktual

| File / Modul | Item / Fungsi Spesifik | Klasifikasi | Rencana Penanganan |
| :--- | :--- | :--- | :--- |
| `src/app/(dashboard)/reports/page.tsx` | `RekapPage` (Server Component) | **UBAH (Fase 4 & 7)** | Diperbarui untuk mengambil data siklus bulanan awal, setting rekap, dan periode kustom, lalu menyalurkannya ke client container. |
| `src/app/(dashboard)/reports/loading.tsx` | Skeleton fallback | **UBAH (Fase 11)** | Menyesuaikan layout skeleton baru (header, tab trigger, kartu siklus). |
| `src/app/(dashboard)/reports/_components/rekap-page-client.tsx` | `RekapPageClient` | **UBAH (Fase 4)** | Dirombak untuk menampung 3 tab utama (Realtime, Bulanan, Custom) serta modal Pengaturan Rekap. |
| `src/app/(dashboard)/reports/_components/rekap-summary-cards.tsx` | `RekapSummaryCards` | **UBAH (Fase 5)** | Diadaptasi menjadi komponen reusable untuk kartu ringkasan siklus (Bulanan, Custom, dan Detail). |
| `src/app/(dashboard)/reports/_components/rekap-monthly-detail-section.tsx` | `RekapMonthlyDetailSection` | **UBAH (Fase 5 & 6)** | Dipecah dan digantikan oleh arsitektur baru: `RekapDetailView`, sub-tab Kategori/Judul, dan Sheet Drill-Down. Rumus lama `hutangPiutangNet` direkonsiliasi. |
| `src/app/(dashboard)/reports/_components/rekap-kategori-section.tsx` | `RekapKategoriSection` | **REUSE / UBAH (Fase 9)** | Diintegrasikan kembali ke Tab Realtime untuk visualisasi donat dan rincian kategori. |
| `src/app/(dashboard)/reports/_components/rekap-bar-section.tsx` | `RekapBarSection` | **JANGAN SENTUH** | Sesuai **D11**, bar chart tahunan tidak dirender di UI baru namun file dipertahankan agar tidak menimbulkan regresi eksternal. |
| `src/app/(dashboard)/reports/_components/rekap-charts.tsx` | `RekapBarChart`<br>`RekapPieChart` | **REUSE / UBAH (Fase 9)** | `RekapPieChart` di-reuse/diperluas menjadi donut chart dengan tooltip rupiah; `RekapBarChart` jangan disentuh. |
| `src/app/(dashboard)/reports/_components/rekap-budget-section.tsx` | `RekapBudgetSection` | **JANGAN SENTUH** | Sesuai **D11**, section budget kalender tidak dirender di UI baru namun file dipertahankan. |
| `src/actions/rekap-action.ts` | `getRekapBulanan` | **REUSE / UBAH (Fase 3)** | Sesuai **GR-3**, signature dan return type dipertahankan kompatibel sampai Fase 12. Di internalnya diintegrasikan dengan cut-off dinamis. |
| `src/actions/rekap-action.ts` | `getRekapDetailBulanan` | **REUSE / UBAH (Fase 3)** | Sesuai **GR-3**, signature dipertahankan kompatibel sampai Fase 12. Logika perhitungannya didelegasikan ke engine pure baru. |
| `src/actions/rekap-action.ts` | `getRekapKategori` | **REUSE** | Di-reuse untuk kebutuhan data kategori tab Realtime. |
| `src/actions/rekap-action.ts` | `getBudgetWithUsage`<br>`upsertBudget` | **JANGAN SENTUH** | Dipertahankan sesuai **D11** dan **GR-1**. |
| `src/constants/rekap.ts` | `BULAN_NAMES` | **REUSE** | Di-reuse untuk pelabelan bulan pendek. |
| `src/actions/transaksi-action.ts` | Seluruh action transaksi | **JANGAN SENTUH** | Dilarang disentuh sesuai **GR-1**. |
| `src/actions/rekening-action.ts` | Seluruh action rekening | **JANGAN SENTUH** | Dilarang disentuh sesuai **GR-1**. |
| `src/actions/hutang-action.ts` | Seluruh action hutang/cicilan | **JANGAN SENTUH** | Dilarang disentuh sesuai **GR-1**. |
| `src/actions/preference-action.ts` | `updateUserPreferences` | **JANGAN SENTUH** | Sesuai **D1**, preferensi siklus rekap TIDAK ditaruh di `user_preferences`. |

---

## 4. Daftar Temuan Risiko & Mitigasi

### 4.1 Bug Timezone & Konversi Tanggal (D6, GR-9)
- **Temuan Masalah**: Pada kode lama `rekap-action.ts:391`, bulan diekstraksi via `new Date(t.tanggal).getMonth() + 1`. Tanggal transaksi bertipe `DATE` (`YYYY-MM-DD`). Di runtime server (misal Vercel yang beroperasi di UTC), evaluasi `new Date("2026-06-01")` rentan bergeser ke hari/bulan sebelumnya (`2026-05-31T17:00:00Z` bila offset WIB). Hal ini menyebabkan transaksi salah masuk siklus atau salah kelompok bulan sekitar tengah malam.
- **Mitigasi**:
  1. Bucketing tanggal WAJIB memakai perbandingan string leksikografis `YYYY-MM-DD` murni (`string comparison`) tanpa instansiasi objek `Date` untuk filter rentang (**GR-9**).
  2. Penentuan "Hari Ini" dan rentang siklus berjalan aktif WAJIB menggunakan zona waktu `Asia/Jakarta` (WIB) melalui helper waktu terstandarisasi (**D6**).

### 4.2 Cacat Tanda Rumus `hutangPiutangNet` (D8)
- **Temuan Masalah**: Pada `rekap-monthly-detail-section.tsx:412-416`, rumus tertulis:
  ```ts
  const hutangPiutangNet =
    detail.hutang_piutang.piutang_baru +
    detail.hutang_piutang.cicilan_piutang -
    detail.hutang_piutang.hutang_baru -
    detail.hutang_piutang.cicilan_hutang;
  ```
  Rumus ini memiliki tanda terbalik dari perspektif arus kas riil rekening:
  - Memberi pinjaman baru (`piutang_baru`) = uang keluar (-).
  - Menarik pinjaman baru (`hutang_baru`) = uang masuk (+).
  - Membayar cicilan hutang (`cicilan_hutang`) = uang keluar (-).
  - Menerima cicilan piutang (`cicilan_piutang`) = uang masuk (+).
- **Mitigasi**: Baris "Hutang Piutang" di kartu periode direkonsiliasi menjadi arus kas bersih riil:
  $$\text{Net Hutang Piutang} = (\text{hutang\_baru} + \text{cicilan\_piutang}) - (\text{piutang\_baru} + \text{cicilan\_hutang})$$
  Dengan rumus ini, rekonsiliasi persamaan Saldo Akhir kartu menjadi klop:
  $$\text{Saldo Akhir} = \text{Saldo Awal} + (\text{Pemasukan} - \text{Pengeluaran}) + \text{Net Hutang Piutang} + \text{Net Koreksi}$$

### 4.3 Kebutuhan Mock Database E2E (`tests/e2e/mock-supabase.mjs`)
- **Temuan Masalah**: Server mock Supabase lokal untuk suite Playwright (`tests/e2e/mock-supabase.mjs`) saat ini hanya memiliki tabel mock: `profiles`, `user_preferences`, `rekening`, `kategori`, `transaksi`, `hutang`, dan `user_sessions`. Tabel baru `rekap_settings` (**D1**) dan `rekap_periode_custom` (**D2**) belum terdaftar di `getTableRows()`.
- **Mitigasi**: Pada Fase 11, perbarui `tests/e2e/mock-supabase.mjs` dengan menyertakan endpoint REST mock untuk tabel `rekap_settings` (default: cut-off 1, akumulasi true) dan `rekap_periode_custom` agar pengetesan end-to-end tidak mengalami kegagalan 404/network error.

### 4.4 Dampak Pengujian E2E Playwright Eksisting
- **Temuan Masalah**: `tests/e2e/mobile-layout.spec.ts` saat ini melakukan verifikasi viewport dan interaksi form pada `/transactions` dan `/debts`. Meskipun belum ada suite spesifik yang menguji `/reports`, penyesuaian navigasi atau selektor tidak boleh merusak alur auth dan header global.
- **Mitigasi**: E2E test yang bergantung pada UI lama atau perubahan struktur rute diperbarui pada fase yang menyentuhnya (**GR-8**).

### 4.5 Konsistensi Perhitungan Saldo Awal & Saldo Akhir Mundur (D7)
- **Temuan Masalah**: Menghitung saldo awal berdasarkan snapshot masa lalu seringkali tidak sinkron jika akun memiliki koreksi saldo atau jika transaksi baru dibuat dengan tanggal *backdated*.
- **Mitigasi**: Terapkan metode **Ledger Mundur** (**D7**):
  1. Ambil total `saldo_saat_ini` seluruh rekening user yang tidak ditandai `exclude_total`.
  2. Kurangkan seluruh mutasi ledger (transaksi income/expense/transfer/correction/hutang/cicilan) yang terjadi *setelah* tanggal akhir periode yang dihitung.
  3. Hasilnya adalah Saldo Akhir periode yang 100% konsisten dengan trigger database.
  4. Saldo Awal periode dihitung dari Saldo Akhir pada hari $H-1$ sebelum periode mulai (jika toggle akumulasi aktif), atau 0 (jika toggle akumulasi nonaktif).

---

## 5. Matriks & Checklist Status Fase 0-12

| Fase | Nama & Ruang Lingkup Utama | Status | Target Verifikasi & Gate |
| :---: | :--- | :---: | :--- |
| **Fase 0** | **Audit Awal, Inventarisasi & Master Revamp Plan**<br>Analisis komprehensif seluruh file rekap, konfirmasi rute `/reports`, perumusan mitigasi risiko, dan pembuatan dokumen rencana master `docs/rekap-revamp-plan.md`. | **SELESAI** | Dokumen master tuntas, verifikasi rute bersih, read-only audit. |
| **Fase 1** | **Rekap Period Engine (`rekap-period.ts`)**<br>Pure calculation engine untuk siklus cut-off dinamis (clamp hari), bucketing string YYYY-MM-DD, penentuan zona Asia/Jakarta, dan pelabelan periode terformat. | **SELESAI** | Unit test Vitest 100% (37 test passing). |
| **Fase 2** | **Database Migration & Schema Isolation**<br>Pembuatan file migration additive baru `src/migrations/014-rekap-periode.sql` untuk tabel `rekap_settings` dan `rekap_periode_custom` lengkap dengan RLS dan indexes. | **SELESAI** | Idempotent SQL, RLS own authenticated, docs schema & RLS. |
| **Fase 3** | **Validation & Period Server Actions**<br>Zod validation schema (`rekap-validation.ts`), types (`rekap.d.ts`), dan Server Actions CRUD (`rekap-period-action.ts`) dengan error handling ramah. | **SELESAI** | Zod test (32 tests passing), `ActionResult<T>`, server-side auth. |
| **Fase 4** | **Agregasi Rentang & Agregator Periode**<br>Agregasi murni `rekap-aggregate.ts`, Server Actions `getRekapDetailByRange` dan `getRekapRingkasanPeriodeList`, refaktor `getRekapDetailBulanan`. | **SELESAI** | Pure module test (11 tests passing), signature compatibility. |
| **Fase 5** | **Ledger Hitung Mundur & Rekonsiliasi Saldo**<br>Kalkulator saldo mundur `rekap-balance.ts` dan Server Action `getSaldoPeriodeList` (`rekap-saldo-action.ts`) dengan simulasi mutasi komprehensif. | **SELESAI** | Pure balance test (13 tests passing), 100% delta reconciliation. |
| **Fase 6** | **Shell Tab Rekap & Modal Pengaturan Siklus**<br>Rekap shell `rekap-page-client.tsx` (PageHeader + 44px settings button, Tabs Realtime/Bulanan/Custom tersinkronisasi `?tab=`), dialog pengaturan `rekap-settings-dialog.tsx` (safe-area, preview live, switch akumulasi, optimistik update), `page.tsx` getRekapSettings, dan `loading.tsx` skeleton. | **SELESAI** | Verify:quick clean (lint, typecheck, vitest 126 tests), DESIGN.md pill/mono compliance. |
| **Fase 8** | **Route Detail Rekap (`/reports/detail`)**<br>Membangun route detail Server Component (`/reports/detail`), validasi async `searchParams` via Zod (`rekapDetailQuerySchema`), tombol kembali ke `?tab=<jenis>`, metrik finansial (Pengeluaran, Pemasukan, Selisih, Koreksi, Arus Kas Hutang/Piutang D8, Saldo Awal & Saldo Akhir bila akumulasi aktif), grafik proporsi Pengeluaran vs Sisa Saldo D9, breadcrumb detail, dan skeleton `loading.tsx`. | **SELESAI** | Async searchParams Next.js 16, Zod notFound() gate, D8 & D9 verified, verify:quick clean (143 unit tests). |
| **Fase 9** | **Rincian Breakdown Kategori & Judul serta Drill-Down Transaksi (`RekapDetailBreakdown`)**<br>Tab segmented aksesibel "Kategori | Judul", breakdown Pengeluaran & Pemasukan per Kategori, Pengeluaran & Pemasukan per Judul (D10), baris interaktif (ikon, label, total `font-mono`, persentase, count, batang proporsi `Progress`), collapsible drill-down transaksi per bagian (`aria-expanded`, single expanded row per section) tanpa query database baru, dan mobile overflow protection. | **SELESAI** | Radix Tabs aksesibel, single expanded row per section, zero new query, 149 unit tests passing. |
| **Fase 10** | **Halaman Detail Rekap & Drill-Down Transaksi**<br>Membangun view detail periode rekap (metrik finansial, breakdown kategori/judul, dan drill-down transaksi individual). | **BELUM** | Routing konsisten tanpa rename rute utama, zero regression. |
| **Fase 11** | **E2E Mock Update, Skeleton Polishing & Error Boundaries**<br>Update `tests/e2e/mock-supabase.mjs` untuk tabel baru, penyempurnaan skeleton loading, dan error boundaries khusus area rekap. | **BELUM** | `npm run test:e2e` lolos tanpa flakiness. |
| **Fase 12** | **Deprecations Cleanup, Final Verification, Documentation Gate & Polish**<br>Pembersihan unused legacy code (dengan tetap menjaga file D11), full audit responsivitas, PWA build verify (`next build --webpack`), dan sinkronisasi seluruh dokumentasi `docs/`. | **BELUM** | `npm run verify` lolos 100%, Documentation Gate terpenuhi. |

---

## 6. Checklist Kepatuhan Mandiri Sebelum Setiap Fase Selesai

Setiap agent AI yang mengeksekusi fase di atas wajib memverifikasi item berikut sebelum menandai fase selesai:

- [ ] Tidak mengubah migration lama (`001` s/d `014`) atau trigger ledger database (**GR-1**).
- [ ] Route utama dashboard tetap `/reports` tanpa perubahan nama folder (**GR-2**).
- [ ] Menggunakan Server Actions dengan `ActionResult<T>` dan validasi runtime Zod (**GR-4**).
- [ ] Seluruh CTA button berbentuk pill (`rounded-full`), kartu `rounded-card` (`rounded-[24px]`), dan nominal berformat `font-mono` (**GR-5**).
- [ ] Tidak menambahkan dependency baru pada `package.json` (**GR-7**).
- [ ] Modul pure logic diuji dengan Vitest hingga target coverage ≥80% (**GR-6**).
- [ ] Menjalankan `npm run verify:quick` dengan hasil 0 error dan 0 lint warning (**GR-8**).
- [ ] Memperbarui dokumentasi terkait sesuai Documentation Contract pada `AGENTS.md`.
- [ ] Menyajikan Conventional Commit message teknis di akhir laporan sesi.
