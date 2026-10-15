# Transaksi Detail Master Plan

Dokumen ini adalah **sumber kebenaran tunggal (Single Source of Truth)** untuk rencana arsitektur, inventarisasi kode, mitigasi risiko keamanan/offline, dan eksekusi bertahap fitur **Detail Transaksi** pada aplikasi CatatZ.

Dokumen ini disusun dengan pemisahan fase yang ketat (_phase-by-phase isolation_) agar setiap sesi AI coding agent (Codex, Claude Code, Antigravity) dapat membaca dan mengeksekusi satu fase secara tuntas, aman, dan patuh terhadap status aplikasi **Production (Live)** serta sistem desain [DESIGN.md](file:///Users/kupzed/Code/kupzed/catatz/DESIGN.md).

---

## 1. Tujuan Fitur

Fitur **Detail Transaksi** menyediakan antarmuka inspeksi lengkap untuk setiap transaksi keuangan di CatatZ, melengkapi daftar ringkas transaksi dengan visualisasi informasi komprehensif:

1. **Drawer / Sheet Detail Transaksi**:
   - Terintegrasi langsung pada daftar transaksi (`/transactions`).
   - Dapat dibuka secara instan saat pengguna menekan baris atau tombol detail transaksi.
   - Mengikuti pola responsif CatatZ: _fullscreen slide-up drawer_ dengan safe-area di mobile (`<640px`) dan _side sheet_ di desktop (`>=640px`).
   - Menyajikan data tanpa jeda jaringan (membaca langsung dari state lokal list) dan menyinkronkan perubahan (edit/hapus) secara reaktif.
   - Menyediakan tautan cepat untuk membuka halaman penuh dan tombol aksi cepat (Edit & Hapus).

2. **Halaman Standalone `/transactions/[id]`**:
   - Halaman Server Component penuh yang dapat diakses langsung via URL atau tautan dari Sheet.
   - Menjamin keamanan data tingkat tinggi: validasi parameter UUID, proteksi RLS Supabase berbasis `user_id`, dan penanganan `notFound()` tanpa membocorkan eksistensi data pengguna lain.
   - Menyediakan manajemen transaksi lengkap: Edit dan Salin (Copy) via `TransaksiDialog`, serta Hapus permanen via `ConfirmDialog` dan `deleteTransaksi`.
   - Terintegrasi rapi dengan sistem breadcrumb dashboard (`DashboardBreadcrumb`).
   - Bersifat _online-only_ dengan feedback toast ramah bila diakses tanpa koneksi internet.

3. **Komponen Presentasional Bersama (`TransaksiDetailContent`)**:
   - Satu komponen inti yang dipakai secara konsisten baik di dalam Sheet maupun di Halaman Standalone.
   - Menampilkan nominal heroik dengan pewarnaan semantik teks, arah arus kas, detail rekening sumber & tujuan, kategori, tanggal & waktu terformat, catatan lengkap, tags (tanpa tag internal sistem), serta indikator mutasi koreksi.

---

## 2. Ground Rules (GR-1..GR-8)

- **GR-1**: **Zero Database & Trigger Changes**. Dilarang mengubah migration lama (`001` s/d `014`), skema tabel, fungsi trigger database, maupun invariant saldo.
- **GR-2**: **Backward-Compatible Routing**. Route yang sudah ada (`/transactions`, `/wallets`, `/reports`, `/debts`, `/categories`, `/settings`) dilarang diubah. Route `/transactions/[id]` bersifat murni aditif.
- **GR-3**: **Server Action Signatures**. Dilarang mengubah signature atau nilai return dari Server Action transaksi yang sudah ada (`getTransaksi`, `createTransaksi`, `updateTransaksi`, `deleteTransaksi`). Action baru `getTransaksiById(id)` ditambahkan secara terpisah.
- **GR-4**: **Standard Security & Server Actions Contract**. Akses database wajib melalui Server Action terproteksi dengan verifikasi autentikasi `supabase.auth.getUser()`, Zod validation v4, filter `user_id`, RLS, dan return type standar `ActionResult<T>`.
- **GR-5**: **Design System Strict Compliance**. Wajib mematuhi [DESIGN.md](file:///Users/kupzed/Code/kupzed/catatz/DESIGN.md) dan [docs/frontend-guidelines.md](file:///Users/kupzed/Code/kupzed/catatz/docs/frontend-guidelines.md):
  - Semua CTA button wajib `rounded-full` (pill).
  - Card/container wajib `rounded-card` (`rounded-[24px]`).
  - Nominal keuangan wajib `font-mono` (Geist Mono).
  - Warna semantik (`text-semantic-up`, `text-semantic-down`, `text-accent-yellow`) hanya pada teks, bukan background.
  - Elevasi default datar (FLAT) dengan `border-hairline`.
  - Inset safe-area wajib diperhitungkan di perangkat mobile.
  - Tap target interaktif minimal 44px (WCAG AAA).
- **GR-6**: **Pure Logic Isolation & Test-Driven**. Logika turunan (label, penentuan tanda +/- nominal, arah koreksi, dan pemfilteran tag sistem) harus berada pada modul murni `src/lib/transaksi-detail.ts`, bebas dari efek samping browser/DOM, dan diuji test-first dengan Vitest (target coverage >= 80%).
- **GR-7**: **Zero New Dependencies**. Dilarang menambahkan package baru ke `package.json`.
- **GR-8**: **Phase Execution & Verification Gate**. Setiap fase wajib dieksekusi secara terisolasi. Sebelum menandai fase selesai, wajib menjalankan `npm run verify:quick` (lint, typecheck, unit test) hingga 100% hijau, memperbarui dokumen terkait sesuai Documentation Gate, dan menyertakan Conventional Commit message teknis.

---

## 3. Keputusan Desain & Arsitektur (D1..D10)

Berikut adalah 10 keputusan teknis fundamental yang mengikat seluruh implementasi fitur:

| ID | Keputusan | Rationale & Alasan Teknis |
| :--- | :--- | :--- |
| **D1** | **Route `/transactions/[id]` & Penanganan `notFound()`**<br>Parameter `id` divalidasi dengan Zod UUID. Jika format UUID tidak valid ATAU transaksi tidak ditemukan di database, wajib memanggil `notFound()`. | Menjaga keamanan privasi (mencegah Enumerasi Objek / IDOR). Penyerang tidak dapat membedakan antara ID yang formatnya salah, ID yang tidak ada, atau ID transaksi milik pengguna lain. |
| **D2** | **Action Baru `getTransaksiById(id)`**<br>Fetch data tunggal dilakukan lewat Server Action baru `getTransaksiById(id)` dengan relasi join yang sama dengan `getTransaksi`, filter `eq('id', id).eq('user_id', user.id).maybeSingle()`, serta proteksi RLS Supabase. Action lama tidak diubah. | Menjaga stabilitas production dan backward compatibility (**GR-3**). Join mengambil data lengkap `kategori:kategori_id(*)`, `rekening:rekening_id(...)`, dan `rekening_tujuan_data:rekening_tujuan(...)`. |
| **D3** | **Komponen Presentasional `TransaksiDetailContent` & Pure Logic Helper**<br>Satu komponen UI presentasional dipakai bersama oleh Sheet dan Halaman Penuh. Logika turunan (label tipe, tanda nominal `+/-`, arah koreksi saldo, dan pemfilteran tag tersembunyi) diisolasi di `src/lib/transaksi-detail.ts` (pure). | Menghindari duplikasi markup tampilan dan inkonsistensi visual antara Sheet dan Halaman Standalone, sekaligus mempermudah pengujian logika keuangan via unit test. |
| **D4** | **State Synchronization Sheet Berbasis `detailId`**<br>Sheet detail pada `/transactions` membaca data dari state list lokal (tanpa fetch ulang ke server) dan hanya menyimpan `detailId: string | null` di state parent, bukan menyimpan objek transaksi. | Mencegah masalah *stale state*. Ketika transaksi diedit atau dihapus melalui dialog, state `transaksi` di `TransaksiPageClient` ter-update, dan tampilan Sheet otomatis ikut tersinkronisasi tanpa request jaringan tambahan. |
| **D5** | **Reuse Dialog & Komponen Eksisting pada Halaman Detail**<br>Halaman detail meng-reuse `TransaksiDialog` untuk alur Edit dan Salin (Copy), `ConfirmDialog` untuk konfirmasi hapus, dan `deleteTransaksi` untuk penghapusan. Halaman detail berstatus *online-only* (menampilkan toast jika offline). | Menghemat kode, menjaga konsistensi behavior form, dan mencegah inkonsistensi cache dokumen pada Service Worker Serwist saat perangkat luring. |
| **D6** | **Penanganan Item Pending Sinkronisasi Offline**<br>Untuk transaksi yang dibuat saat offline (`_pendingSync: true`), Sheet detail tetap dapat dibuka untuk inspeksi data sementara, namun tautan menuju halaman penuh (`/transactions/[id]`) dan tombol Edit disembunyikan/dinonaktifkan. | Transaksi pending hanya memiliki ID lokal sementara di IndexedDB dan belum memiliki record riil di database Supabase. Membuka halaman penuh atau mengedit data pending via server akan memicu 404/konflik. |
| **D7** | **Penyembunyian Tag Internal Sistem**<br>Tag sistem `correction_add` dan `correction_sub` disaring (disembunyikan) dari daftar tag yang dirender ke pengguna. Tag ini dimanfaatkan secara internal oleh helper untuk menentukan arah mutasi koreksi ("Penambahan Saldo" vs "Pengurangan Saldo") dan tanda nominalnya. | Tag sistem adalah metadata internal Server Action koreksi saldo (`transaksi-action.ts:209-210`). Menampilkannya sebagai tag biasa akan membingungkan pengguna dan merusak estetika antarmuka. |
| **D8** | **Zero Database Migration & Safe Additive Changes**<br>Tidak ada penambahan kolom atau tabel database, tidak ada dependency baru di `package.json`, dan tidak ada pengubahan signature Server Action maupun trigger database. | Menjamin integritas data saldo riil pengguna pada sistem live production (**GR-1**, **GR-7**). |
| **D9** | **Pelabelan UUID pada Breadcrumb Dashboard**<br>Komponen `DashboardBreadcrumb` diperbarui agar segmen URL berupa UUID di bawah segmen `transactions` dirender dengan label manusiawi: `"Detail Transaksi"`. | Standar Next.js breadcrumb fallback akan menampilkan string UUID mentah (misal `123e4567-e89b...`) yang sangat panjang dan merusak tata letak header dashboard. |
| **D10** | **Kepatuhan Desain Institusional Coinbase (DESIGN.md)**<br>Semua tombol CTA wajib `rounded-full`, kartu container `rounded-card` (`rounded-[24px]`), nominal keuangan wajib `font-mono`, warna semantik text-only (tanpa background tombol), elevasi default datar (FLAT), safe-area insets di mobile, dan tap target >= 44px. | Menjaga integritas visual aplikasi yang tenang, rapi, dan konsisten dengan seluruh halaman CatatZ lainnya. |

---

## 4. Inventarisasi Kode & Pemetaan File

### 4.1 Modul Baru yang Akan Dibuat

| No | Lokasi File | Peran & Deskripsi |
| :--- | :--- | :--- |
| 1 | `src/lib/transaksi-detail.ts` | **Pure helper**: fungsi penyaring tag sistem, penentu arah nominal & semantik koreksi, format view model detail transaksi (**D3**, **D7**). |
| 2 | `tests/unit/transaksi-detail.test.ts` | **Unit test**: pengujian 100% cakupan untuk semua skenario `transaksi-detail.ts` (income, expense, transfer, correction, tags). |
| 3 | `src/app/(dashboard)/transactions/_components/transaksi-detail-content.tsx` | **Komponen presentasional bersama**: merender header nominal, info kartu, rekening alur transfer, kategori, catatan, dan tags (**D3**, **D10**). |
| 4 | `src/app/(dashboard)/transactions/_components/transaksi-detail-sheet.tsx` | **Drawer / Sheet detail**: mengintegrasikan `SheetContent` responsif (bottom mobile, right desktop), state `detailId`, tombol Buka Halaman, Edit, dan Hapus (**D4**, **D6**). |
| 5 | `src/app/(dashboard)/transactions/[id]/page.tsx` | **Server Component**: validasi Zod UUID, fetch `getTransaksiById(id)`, handle `notFound()`, fetch rekening & kategori untuk opsi dialog (**D1**, **D2**). |
| 6 | `src/app/(dashboard)/transactions/[id]/loading.tsx` | **Loading skeleton**: fallback visual saat halaman detail sedang dimuat di server. |
| 7 | `src/app/(dashboard)/transactions/[id]/_components/transaksi-detail-client.tsx` | **Client container halaman detail**: wrapper interaktif untuk Edit, Copy, Delete via `TransaksiDialog`, `ConfirmDialog`, dan navigasi kembali. |

### 4.2 Modul Eksisting yang Akan Diubah (Additive & Non-Breaking)

| No | Lokasi File | Rencana Perubahan |
| :--- | :--- | :--- |
| 1 | `src/actions/transaksi-action.ts` | Tambahkan Server Action baru `getTransaksiById(id: string)` dengan query joined relation lengkap, verifikasi `user.id`, dan `maybeSingle()` (**D2**). Signature action eksisting tetap utuh. |
| 2 | `src/validations/transaksi-validation.ts` | Tambahkan skema validasi UUID param `transaksiIdParamSchema = z.string().uuid()` untuk validasi route dan Server Action. |
| 3 | `src/app/(dashboard)/transactions/_components/transaksi-list-item.tsx` | Tambahkan prop/handler untuk membuka detail sheet saat baris transaksi diklik atau via tombol aksi info/detail. Pertahankan tombol quick action Edit & Delete. |
| 4 | `src/app/(dashboard)/transactions/_components/transaksi-list.tsx` | Teruskan prop handler `onDetail` ke setiap `TransaksiListItem`. |
| 5 | `src/app/(dashboard)/transactions/_components/transaksi-page-client.tsx` | Tambahkan state `detailId: string | null`, integrasikan `TransaksiDetailSheet`, dan sinkronkan aksi edit/hapus dari dalam sheet ke list parent (**D4**). |
| 6 | `src/app/(dashboard)/_components/dashboard-breadcrumb.tsx` | Tambahkan deteksi format UUID di bawah segmen `transactions` agar dirender sebagai label `"Detail Transaksi"` (**D9**). |

### 4.3 Modul Eksisting yang Di-Reuse (Tanpa Perubahan)

| No | Modul / Komponen | Lokasi File | Pemanfaatan |
| :--- | :--- | :--- | :--- |
| 1 | `TransaksiDialog` | `src/app/(dashboard)/transactions/_components/transaksi-dialog.tsx` | Form modal untuk mode edit transaksi dan mode copy transaksi pada halaman detail. |
| 2 | `ConfirmDialog` | `src/components/common/confirm-dialog.tsx` | Dialog konfirmasi sebelum mengeksekusi penghapusan transaksi. |
| 3 | `deleteTransaksi` | `src/actions/transaksi-action.ts` | Server Action untuk menghapus transaksi dari database dan membalik saldo koreksi bila relevan. |
| 4 | `Sheet`, `SheetContent`, dll. | `src/components/ui/sheet.tsx` | Primitif Radix UI Sheet untuk drawer responsif. |
| 5 | `useSystemPreferences` | `src/providers/system-preference-provider.tsx` | Penyedia format mata uang rupiah, tanggal, dan waktu sesuai konfigurasi pengguna. |
| 6 | `proxy.ts` / `middleware.ts` | `src/proxy.ts` & `src/configs/supabase/middleware.ts` | Proteksi sesi autentikasi dan pengecekan sesi revoke secara otomatis untuk route `/transactions/[id]`. |
| 7 | `next.config.ts` | Root `next.config.ts` | Rule redirect `/transaksi/:path*` -> `/transactions/:path*` sudah otomatis menangani sub-rute baru. |

---

## 5. Daftar Temuan Risiko & Mitigasi

### 5.1 Risiko Keamanan: Insecure Direct Object Reference (IDOR) & Enumerasi Data (D1, D2)
- **Temuan Masalah**: Jika pengguna memasukkan UUID sembarang atau UUID milik transaksi user lain pada `/transactions/[id]`, sistem tidak boleh membocorkan informasi keberadaan transaksi tersebut ataupun mengizinkan akses modifikasi.
- **Mitigasi**:
  1. Validasi awal dengan Zod `z.string().uuid()`. Jika format bukan UUID valid, langsung panggil `notFound()`.
  2. Query database pada `getTransaksiById` wajib mengombinasikan `eq('id', id)` dan `eq('user_id', user.id)` serta mengandalkan RLS Supabase.
  3. Jika query menghasilkan `null` (data tidak ada atau milik user lain), halaman wajib memanggil `notFound()`. Respon untuk data non-eksis dan data milik user lain sengaja dibuat identik (HTTP 404) sehingga penyerang tidak dapat melakukan enumerasi UUID.

### 5.2 Risiko Sinkronisasi: Stale State pada Drawer / Sheet Detail (D4)
- **Temuan Masalah**: Jika komponen Sheet menyimpan salinan data transaksi di state internalnya (`const [selectedTrx, setSelectedTrx] = useState<Transaksi | null>(null)`), saat pengguna melakukan Edit di form dialog atau Hapus, data yang tertampil di Sheet menjadi basi (*stale*) atau bahkan tetap terbuka padahal transaksi telah terhapus dari state list.
- **Mitigasi**:
  1. Di `TransaksiPageClient`, state yang disimpan hanyalah `detailId: string | null`.
  2. Objek transaksi aktif diambil secara derivatif:
     ```ts
     const activeTransaksi = useMemo(
       () => displayTransaksi.find((t) => t.id === detailId) ?? null,
       [displayTransaksi, detailId]
     );
     ```
  3. Ketika mutasi edit atau hapus terjadi, `displayTransaksi` ter-update, dan konten Sheet otomatis langsung merefleksikan perubahan tanpa perlu fetch ulang. Jika item terhapus, Sheet otomatis menutup.

### 5.3 Risiko Offline & PWA Navigation (D5, D6)
- **Temuan Masalah**:
  - Transaksi yang dibuat saat offline disimpan di IndexedDB queue (`_pendingSync: true`) dan belum memiliki ID riil di server.
  - Route dokumen dinamis Next.js seperti `/transactions/[id]` tidak di-precache dalam Service Worker Serwist (`appShellStrategy` hanya mem-cache icon, manifest, dan static assets). Jika pengguna membuka `/transactions/[id]` saat offline, browser akan menampilkan `/offline.html`.
- **Mitigasi**:
  1. Pada Sheet detail: jika `transaksi._pendingSync === true`, sembunyikan tombol tautan ke halaman penuh dan nonaktifkan tombol Edit (**D6**).
  2. Saat pengguna sedang offline (`!navigator.onLine`), jika pengguna mencoba menekan tombol "Buka Halaman Lengkap", cegah navigasi dan tampilkan `toast.error("Halaman detail hanya dapat diakses saat online.")` (**D5**).

### 5.4 Risiko Kebocoran Metadata Teknis: Tag Sistem `correction_add` / `correction_sub` (D7)
- **Temuan Masalah**: Pada fitur koreksi saldo, Server Action menyematkan tag internal `correction_add` atau `correction_sub` ke dalam array `tags` transaksi (`transaksi-action.ts:209-210`). Jika array `tags` dirender mentah sebagai badge, pengguna akan melihat label teknis internal yang membingungkan.
- **Mitigasi**:
  1. Fungsi murni `filterDisplayTags(tags: string[]): string[]` di `src/lib/transaksi-detail.ts` memfilter keluar tag `correction_add` dan `correction_sub`.
  2. Fungsi `getCorrectionDirection(tags: string[])` membaca tag tersebut untuk mengembalikan status arah mutasi ("Penambahan Saldo" / "Pengurangan Saldo") yang ditampilkan secara elegan pada antarmuka.

### 5.5 Risiko Tampilan Breadcrumb: String UUID Mentah pada Header Dashboard (D9)
- **Temuan Masalah**: `DashboardBreadcrumb` membaca segmen URL via `pathname.split("/").filter(Boolean)`. Jika pengguna berada pada `/transactions/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`, fallback breadcrumb akan menampilkan teks UUID mentah 36 karakter yang jelek dan merusak tampilan header desktop/mobile.
- **Mitigasi**:
  Perbarui `DashboardBreadcrumb` dengan aturan: jika segmen sebelumnya adalah `transactions` dan segmen saat ini cocok dengan pola regex UUID, gunakan label `"Detail Transaksi"`.

---

## 6. Matriks & Checklist Status Fase 0-6

```text
- [x] Fase 0: Audit Awal, Inventarisasi & Master Detail Plan
- [x] Fase 1: Pure Logic Engine & Unit Tests
- [x] Fase 2: Validation Schema & Server Action
- [x] Fase 3: Komponen Presentasional Bersama
- [x] Fase 4: Halaman Standalone /transactions/[id] & Breadcrumb Integration
- [x] Fase 5: Integrasi Sheet Detail & Trigger pada List Transaksi
- [x] Fase 6: Dokumentasi Final, Documentation Gate & QA Verifikasi
```

---

## 7. Rencana Eksekusi Rinci Per Fase

### Fase 0: Audit Awal, Inventarisasi & Master Detail Plan (Selesai)
- [x] Audit mendalam terhadap `transaksi-list-item.tsx`, `transaksi-list.tsx`, `transaksi-page-client.tsx`, dan hook `useOfflineQueueSync`.
- [x] Audit pola `Sheet` di `transaksi-filter-sheet.tsx` dan `components/ui/sheet.tsx`.
- [x] Audit bentuk join select di `transaksi-action.ts` dan tipe data di `types/transaksi.d.ts`.
- [x] Audit mekanisme routing segmen pada `dashboard-breadcrumb.tsx`.
- [x] Audit middleware autentikasi `proxy.ts`, `configs/supabase/middleware.ts`, konfigurasi redirect di `next.config.ts`, serta Serwist `sw.ts`.
- [x] Perumusan 10 Keputusan Desain & Arsitektur (D1..D10) dan Ground Rules (GR-1..GR-8).
- [x] Pembuatan dokumen Single Source of Truth `docs/features/transaksi-detail-plan.md`.
- [x] Validasi `npm run verify:quick` dipastikan 100% hijau (0 error, 0 warning).

---

### Fase 1: Pure Logic Engine & Unit Tests
- [x] Buat file baru `src/lib/transaksi-detail.ts` berisi fungsi-fungsi murni:
  - `filterDisplayTags(tags: string[] | null | undefined): string[]`: menyaring tag internal `correction_add` dan `correction_sub`.
  - `getCorrectionDirection(tags: string[] | null | undefined): 'add' | 'sub' | 'unknown'`: mendeteksi arah mutasi koreksi saldo dari tag internal.
  - `getTransaksiNominalDisplay(transaksi: Pick<Transaksi, 'tipe' | 'nominal' | 'tags'>)`: menghitung sign prefix (`+`, `-`, atau kosong), label semantik tipe, dan warna semantik Tailwind (`text-semantic-up`, `text-semantic-down`, `text-accent-yellow`, atau `text-foreground`).
  - `getTransaksiDetailMetadata(transaksi: Transaksi)`: mengekstrak ringkasan informasi rekening asal, rekening tujuan (khusus transfer), badge kategori, dan status recurring.
- [x] Buat file unit test `tests/unit/transaksi-detail.test.ts` menggunakan Vitest:
  - Uji seluruh skenario tipe transaksi (`income`, `expense`, `transfer`, `correction`).
  - Uji koreksi saldo penambahan (`correction_add`) dan pengurangan (`correction_sub`).
  - Uji penanganan tag kosong, null, atau undefined.
  - Uji pemfilteran tag sistem yang bercampur dengan user tags.
- [x] Verifikasi: `npm run verify:quick` wajib hijau dan mencakup 100% test baru.

---

### Fase 2: Validation Schema & Server Action
- [x] Tambahkan skema validasi UUID pada `src/validations/transaksi-validation.ts`:
  ```ts
  export const transaksiIdParamSchema = z.string().uuid({
    message: 'ID transaksi harus berupa UUID yang valid',
  });
  ```
- [x] Tambahkan Server Action baru `getTransaksiById(id: string): Promise<ActionResult<Transaksi | null>>` pada `src/actions/transaksi-action.ts`:
  - Validasi parameter `id` dengan `transaksiIdParamSchema`. Jika gagal, return `{ success: false, error: 'ID transaksi tidak valid' }`.
  - Periksa sesi user via `supabase.auth.getUser()`. Jika tidak ada user, return `{ success: false, error: 'Tidak terautentikasi' }`.
  - Jalankan query Supabase:
    ```ts
    const { data, error } = await supabase
      .from('transaksi')
      .select(`
        *,
        kategori:kategori_id(*),
        rekening:rekening_id(id, nama, jenis, logo, warna),
        rekening_tujuan_data:rekening_tujuan(id, nama, jenis, logo, warna)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    ```
  - Jika error query, kembalikan `{ success: false, error: error.message }`.
  - Kembalikan `{ success: true, data: data as Transaksi | null }`.
- [x] Pastikan tidak ada perubahan pada Server Action yang sudah ada (`getTransaksi`, `createTransaksi`, `updateTransaksi`, `deleteTransaksi`).
- [x] Verifikasi: `npm run verify:quick` wajib hijau.

---

### Fase 3: Komponen Presentasional Bersama (`TransaksiDetailContent`)
- [x] Buat file baru `src/app/(dashboard)/transactions/_components/transaksi-detail-content.tsx`:
  - Menerima props:
    ```ts
    export type TransaksiDetailContentProps = {
      transaksi: Transaksi | DisplayTransaksi;
      className?: string;
    };
    ```
  - Memanfaatkan `useSystemPreferences()` untuk `formatRupiah`, `formatTanggal`, dan `formatWaktu`.
  - Memanfaatkan pure helpers dari `src/lib/transaksi-detail.ts`.
  - Layout Card & Container mengikuti [DESIGN.md](file:///Users/kupzed/Code/kupzed/catatz/DESIGN.md):
    - **Header Nominal**: Angka besar `font-mono text-3xl font-semibold` dengan warna semantik teks (`text-semantic-up` / `text-semantic-down` / `text-accent-yellow`).
    - **Badge Status & Tipe**: Badge pill `rounded-full` untuk tipe transaksi dan status `Menunggu sinkronisasi` jika `_pendingSync: true`.
    - **Judul & Kategori**: Nama transaksi utama atau catatan, disertai ikon & nama kategori (untuk expense/income).
    - **Alur Perpindahan Dana**: Menampilkan rekening asal dan rekening tujuan (`Rekening Asal → Rekening Tujuan`) secara terstruktur lengkap dengan ikon/logo bank dan dot warna.
    - **Detail Grid Metadata**: Tanggal, waktu, status berulang (recurring), timestamp pembuatan (`created_at`).
    - **Catatan & Tags**: Area catatan terformat dan daftar badge pill tag pengguna (bebas dari tag sistem `correction_*`).
- [x] Pastikan responsif: tidak ada teks truncate/overflow pada layar kecil (<640px).
- [x] Verifikasi: `npm run verify:quick` wajib hijau.

---

### Fase 4: Halaman Standalone `/transactions/[id]` & Breadcrumb Integration
- [x] Buat file Server Component `src/app/(dashboard)/transactions/[id]/page.tsx`:
  - Menangkap `params: Promise<{ id: string }>` sesuai standar Next.js 16 App Router.
  - Validasi param `id` menggunakan Zod UUID. Jika tidak valid, panggil `notFound()`.
  - Panggil `getTransaksiById(id)`. Jika terjadi error atau data bernilai `null`, panggil `notFound()`.
  - Fetch data pendukung untuk modal edit: `getRekening()` dan `getKategori()`.
  - Render client container `TransaksiDetailClient`.
- [x] Buat file skeleton loading `src/app/(dashboard)/transactions/[id]/loading.tsx`:
  - Skeleton header nominal, skeleton card metadata, dan skeleton tombol aksi.
- [x] Buat file client container `src/app/(dashboard)/transactions/[id]/_components/transaksi-detail-client.tsx`:
  - Mengelola local state transaksi aktif untuk menampung pembaruan setelah edit.
  - Mengintegrasikan tombol navigasi kembali: tombol pill `rounded-full` menuju `/transactions`.
  - Mengintegrasikan aksi:
    - **Edit Transaksi**: membuka `TransaksiDialog` dengan `editData`.
    - **Salin Transaksi**: membuka `TransaksiDialog` dengan `copyFrom`.
    - **Hapus Transaksi**: memicu `ConfirmDialog` lalu memanggil `deleteTransaksi(id)`. Setelah sukses, tampilkan `toast.success` dan redirect ke `/transactions`.
- [x] Perbarui `src/app/(dashboard)/_components/dashboard-breadcrumb.tsx`:
  - Deteksi segmen URL: jika segmen didahului oleh `transactions` dan cocok dengan format regex UUID, tampilkan label `"Detail Transaksi"`.
- [x] Verifikasi: `npm run verify:quick` wajib hijau.

---

### Fase 5: Integrasi Sheet Detail & Trigger pada List Transaksi
- [x] Buat file `src/app/(dashboard)/transactions/_components/transaksi-detail-sheet.tsx`:
  - Menggunakan `Sheet` dan `SheetContent` dengan adaptasi `side={isMobile ? "bottom" : "right"}`.
  - Safe-area header `pt-[max(1.25rem,env(safe-area-inset-top))]` dan footer `pb-[max(1rem,env(safe-area-inset-bottom))]`.
  - Menampilkan `TransaksiDetailContent`.
  - Sheet footer menyajikan:
    - Tombol "Buka Halaman Lengkap" (link ke `/transactions/${transaksi.id}`) — disembunyikan bila `_pendingSync`. Jika offline saat ditekan, tampilkan toast peringatan.
    - Tombol Edit — disembunyikan bila `_pendingSync`.
    - Tombol Hapus via `ConfirmDialog`.
- [x] Perbarui `src/app/(dashboard)/transactions/_components/transaksi-list-item.tsx`:
  - Tambahkan interaksi klik pada item baris atau tombol detail untuk memicu `onDetail(transaksi)`.
  - Pertahankan tombol aksi cepat Pencil (edit) dan Trash (delete).
- [x] Perbarui `src/app/(dashboard)/transactions/_components/transaksi-list.tsx`:
  - Meneruskan prop `onDetail` ke seluruh item.
- [x] Perbarui `src/app/(dashboard)/transactions/_components/transaksi-page-client.tsx`:
  - Tambahkan state `detailId: string | null`.
  - Integrasikan `TransaksiDetailSheet`.
  - Pastikan derivasi transaksi aktif selalu sinkron dengan state transaksi list (**D4**).
- [x] Verifikasi: `npm run verify:quick` wajib hijau.

---

### Fase 6: Dokumentasi Final, Documentation Gate & QA Verifikasi
- [x] Perbarui dokumentasi fitur `docs/features/transaksi.md`:
  - Dokumentasikan rute baru `/transactions/[id]`.
  - Dokumentasikan Server Action baru `getTransaksiById`.
  - Dokumentasikan interaksi Sheet drawer detail dan halaman detail penuh.
  - Dokumentasikan penanganan offline pending sync dan pemfilteran tag internal koreksi.
- [x] Perbarui struktur folder di `docs/folder-structure.md`:
  - Tambahkan rincian sub-rute `src/app/(dashboard)/transactions/[id]/`.
  - Tambahkan helper `src/lib/transaksi-detail.ts`.
- [x] Perbarui dokumentasi API di `docs/server-actions-api.md`:
  - Tambahkan signature, skema input, output `ActionResult<Transaksi | null>`, dan auth rules untuk `getTransaksiById`.
- [x] Jalankan verifikasi menyeluruh:
  - `npm run verify:quick` (linting, typecheck, vitest).
  - Pastikan tidak ada regresi pada halaman transaksi eksisting.
- [x] Sajikan laporan final dan suggested Conventional Commit message.
