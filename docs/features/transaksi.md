# Feature: Transaksi

## Status

Status: **Production (Aktif)**.

## Deskripsi

Fitur transaksi digunakan untuk mencatat pemasukan, pengeluaran, transfer antar rekening, dan koreksi saldo.

## Route

- `/transactions`
- Shortcut PWA: `/transactions?new=true`
- Detail Transaksi: `/transactions/[id]` (menggunakan UUID transaksi)

## Lokasi File

- Page: `src/app/(dashboard)/transactions/page.tsx`
- Loading: `src/app/(dashboard)/transactions/loading.tsx`
- Client page: `src/app/(dashboard)/transactions/_components/transaksi-page-client.tsx`
- Detail Page: `src/app/(dashboard)/transactions/[id]/page.tsx`
- Detail Loading: `src/app/(dashboard)/transactions/[id]/loading.tsx`
- Detail Client: `src/app/(dashboard)/transactions/[id]/_components/transaksi-detail-client.tsx`
- Detail Content Presentational: `src/app/(dashboard)/transactions/_components/transaksi-detail-content.tsx`
- Detail Sheet Drawer: `src/app/(dashboard)/transactions/_components/transaksi-detail-sheet.tsx`
- Detail Helper: `src/lib/transaksi-detail.ts`
- Filter Bar: `src/app/(dashboard)/transactions/_components/transaksi-filter-bar.tsx`
- Filter Sheet: `src/app/(dashboard)/transactions/_components/transaksi-filter-sheet.tsx`
- List Container: `src/app/(dashboard)/transactions/_components/transaksi-list.tsx`
- List Item: `src/app/(dashboard)/transactions/_components/transaksi-list-item.tsx`
- Dialog: `src/app/(dashboard)/transactions/_components/transaksi-dialog.tsx`
- Dialog Hook: `src/app/(dashboard)/transactions/_components/use-transaksi-dialog.ts`
- Dialog Header: `src/app/(dashboard)/transactions/_components/transaksi-dialog-header.tsx`
- Dialog AI Section: `src/app/(dashboard)/transactions/_components/transaksi-ai-section.tsx`
- Dialog Tipe Tabs: `src/app/(dashboard)/transactions/_components/transaksi-tipe-tabs.tsx`
- Dialog Form Fields: `src/app/(dashboard)/transactions/_components/transaksi-form-fields.tsx`
- Dialog Footer: `src/app/(dashboard)/transactions/_components/transaksi-dialog-footer.tsx`
- Voice button: `src/app/(dashboard)/transactions/_components/voice-input-button.tsx`
- File Auto Fill button: `src/app/(dashboard)/transactions/_components/transaction-file-auto-fill-button.tsx`
- Actions: `src/actions/transaksi-action.ts`
- File parsing action: `src/actions/transaction-file-action.ts`
- Validation: `src/validations/transaksi-validation.ts`
- Types: `src/types/transaksi.d.ts`
- AI parser types: `src/types/transaction-parser.d.ts`
- Offline queue: `src/lib/offline-queue.ts`

## Data Source

Initial data diambil di Server Component dengan:

- `getTransaksi()` (atau `getTransaksiById(id)` untuk route detail)
- `getRekening()`
- `getKategori()`

## Tabel Database Terkait

- `transaksi`
- `rekening`
- `kategori`

## Server Action Terkait

- `getTransaksi`
- `getTransaksiById`
- `getKategori`
- `createTransaksi`
- `updateTransaksi`
- `deleteTransaksi`
- `getJudulSuggestions`
- `getRecentJudul`
- `suggestKategori`
- `processVoiceInput` untuk input suara
- `processTransactionFile` untuk Auto Fill gambar/PDF

## Business Rules

- `nominal` wajib lebih dari 0.
- `income` dan `expense` wajib memiliki `judul` dan `kategori_id`.
- `transfer` wajib memiliki `rekening_tujuan`.
- `rekening_id` dan `rekening_tujuan` tidak boleh sama untuk transfer.
- `transfer` dan `correction` tidak boleh memiliki `judul` berdasarkan schema UI.
- Server Action create/update memvalidasi payload dengan `transaksiSchema` agar proteksi tidak hanya bergantung pada UI.
- Database juga memastikan `correction` tidak memiliki `judul`.
- Trigger database otomatis mengubah saldo rekening untuk `income`, `expense`, dan `transfer`.
- `correction` tidak diproses trigger dan ditangani manual oleh Server Action rekening/transaksi.
- Setelah create/update/delete, route `/transactions`, `/wallets`, dan `/reports` di-revalidate.

## UI Behavior

- Toolbar transaksi disusun dalam 1 baris terpadu baik di desktop maupun mobile dengan urutan: `[Filter]` - `[Search]` - `[Tambah Transaksi]`. Pada tampilan mobile, tombol tambah transaksi diringkas menjadi tombol ikon `+` (tanpa label teks) agar hemat ruang dan muat dalam satu baris.
- Menu filter diakses melalui tombol `Filter` yang menampilkan badge angka jumlah filter aktif. Mengklik tombol ini membuka panel Filter: pada mobile layar penuh muncul dari bawah ke atas (fullscreen slide-up drawer dengan safe-area padding), sedangkan pada desktop meluncur dari sisi kanan (side sheet).
- Formulir filter di dalam panel mencakup:
  - Tipe Transaksi menggunakan segmented control (Semua, Pengeluaran, Pemasukan, Transfer) dengan tata letak grid 2x2 yang lapang di drawer desktop maupun mobile untuk mencegah teks saling bertumpuk.
  - Filter Transfer khusus: hanya muncul ketika tipe transaksi Transfer dipilih, menyediakan pilihan Sumber Dana (Rekening Asal) dan Tujuan Transfer (Rekening Tujuan).
  - Filter Rekening dan Kategori: tersedia saat tipe bukan Transfer untuk mempersempit hasil transaksi.
  - Rentang Nominal: menyediakan input nominal minimum dan maksimum dalam rupiah (Rp Min - Rp Max) dengan format mata uang otomatis.
  - Urutkan: dropdown pilihan pengurutan transaksi (Terbaru, Terlama, Terbesar, Terkecil).
- Badge Filter Aktif: setiap filter yang dipilih ditampilkan di bawah baris pencarian sebagai badge pill yang dapat ditutup satu per satu tanpa harus membuka panel filter.
- Tombol "Hapus Semua" tersedia di samping badge aktif untuk menghapus seluruh filter aktif sekaligus.
- Pada daftar transaksi di mobile, metadata tanggal dan waktu dijaga tetap utuh (`whitespace-nowrap`). Khusus transaksi bertipe Transfer, alur perpindahan dana (`Rekening Asal → Rekening Tujuan`) ditampilkan pada baris terpisah di bawah baris waktu dengan `truncate` otomatis. Hal ini mencegah teks nama rekening dan simbol panah/titik pecah menjadi kolom-kolom bertumpuk yang berantakan pada layar ponsel yang sempit.
- Query `?new=true` membuka dialog transaksi baru otomatis.
- Dialog mendukung mode create, edit, copy, dan correction readonly behavior.
- Dialog mobile dipusatkan di area aman dan memisahkan frame tetap dari scroll container form. Struktur ini menjaga tombol aksi tetap normal setelah momentum scroll cepat di iOS/PWA.
- Tanggal default dialog create normal mengikuti tanggal/periode yang sedang dipilih di halaman transaksi; waktu tetap memakai waktu saat dialog dibuka.
- Field kategori hanya tampil untuk income/expense.
- Field rekening tujuan hanya tampil untuk transfer.
- Dialog membersihkan field yang tidak relevan saat tipe transaksi berubah, misalnya kategori untuk transfer dan rekening tujuan untuk non-transfer.
- Judul suggestion diambil dari histori transaksi.
- Input suara memakai browser Speech Recognition dan Gemini parser server-side.
- Tombol Auto Fill berada di sebelah Voice Input pada mode tambah transaksi.
- Voice Input dan Auto Fill memakai dua kolom dengan lebar serta tinggi tombol yang seragam pada mobile.
- Footer edit transaksi menampilkan Copy, Batal, dan Perbarui dalam satu baris tiga kolom pada mobile; mode tanpa Copy memakai dua kolom.
- Auto Fill menerima satu file JPEG, PNG, WebP, HEIC/HEIF, atau PDF maksimal 4 MB dan langsung menganalisis file setelah dipilih.
- File Auto Fill hanya diproses sementara di memory request, tidak disimpan ke Supabase Storage/database, dan hasil AI tidak membuat transaksi sampai user menekan `Simpan`.
- Hanya field yang dikenali dengan cukup yakin yang menimpa form. Kategori dan rekening dipilih otomatis hanya jika ada satu kecocokan nama/logo yang kuat.
- Jika satu file memuat beberapa transaksi, transaksi pertama mengisi form dan UI memberi informasi bahwa hasil lain perlu dimasukkan terpisah.
- Voice Input dan Auto Fill tidak dapat berjalan bersamaan. Auto Fill bersifat online-only.
- Saat offline, create/update/delete transaksi dapat masuk ke IndexedDB queue.
- Pending transaksi offline ditampilkan sebagai data sementara dengan status menunggu sinkronisasi.
- **Drawer Detail Transaksi (`TransaksiDetailSheet`) & Komponen Detail (`TransaksiDetailContent`)**:
  - Pengguna dapat melihat detail transaksi secara cepat tanpa berpindah halaman melalui tombol ikon mata (`Detail`) pada baris transaksi atau dengan mengklik baris transaksi tersebut.
  - Pada index daftar transaksi, transaksi bertipe Transfer dan Koreksi Saldo selalu menggunakan nama default sebagai judul (tidak di-override oleh catatan transaksi) serta menyembunyikan badge label tipe agar tampilan ringkas dan tidak redundan.
  - Mengikuti pola responsif yang konsisten dengan Filter Transaksi: fullscreen drawer meluncur dari bawah ke atas pada mobile dengan safe-area insets, dan right-side sheet pada layar desktop.
  - Hero card menyajikan ikon tipe bulat tetap (fixed circular type icon dengan aksen warna semantik, tidak mengikuti emoji kategori), label tipe kapital semantik, nominal besar (`font-mono`), baris tanggal dan waktu tepat di bawah nominal (`[Tanggal] - [Waktu]`), serta badge status (`_pendingSync` / `is_recurring`).
  - Untuk transaksi transfer, alur perpindahan rekening disajikan secara vertikal dengan panah ke bawah (`ArrowDown`) yang menghubungkan Rekening Asal dan Rekening Tujuan.
  - Untuk transaksi non-transfer, informasi Rekening, Judul (jika ada), dan Kategori (jika ada) disatukan dalam satu card metadata.
  - Bagian Catatan dan Tag disajikan di card terpisah, sedangkan ID Referensi transaksi diletakkan rapi di posisi paling bawah.
  - Tag sistem internal (`correction_add`, `correction_sub`) otomatis disaring dari UI dan dimanfaatkan untuk menentukan arah koreksi saldo ("Penambahan" vs "Pengurangan").
  - Footer drawer menyajikan tombol Buka Halaman Penuh, Edit Transaksi, dan Hapus Transaksi (dilengkapi dialog konfirmasi).
  - Untuk transaksi pending offline (`_pendingSync: true`), drawer tetap dapat dibuka untuk inspeksi data, namun tombol Edit dan Buka Halaman Penuh dinonaktifkan/disembunyikan guna mencegah 404/konflik server.
- **Halaman Penuh Detail Transaksi (`/transactions/[id]`)**:
  - Halaman khusus standalone yang dapat diakses langsung melalui route URL dengan UUID transaksi.
  - Dilengkapi validasi parameter Zod UUID server-side dan penanganan `notFound()` aman (HTTP 404 seragam untuk data tidak ada maupun data milik pengguna lain guna mencegah eksploitasi IDOR/enumerasi).
  - Memiliki tombol navigasi kembali ke `/transactions`, tombol Salin Transaksi (mode create prefilled), Edit Transaksi, dan Hapus Transaksi.
  - Terintegrasi dengan breadcrumb dashboard yang secara cerdas mendeteksi segmen UUID di bawah `transactions` dan melabelinya sebagai "Detail Transaksi".

## TODO / Improvement

- Review apakah update/delete offline untuk semua skenario sudah memiliki feedback konflik data yang cukup.
- Jika recurring transaction diaktifkan, tambahkan UI dan dokumentasi khusus recurring.
