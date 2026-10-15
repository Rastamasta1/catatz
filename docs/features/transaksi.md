# Feature: Transaksi

## Status

Status: **Production (Aktif)**.

## Deskripsi

Fitur transaksi digunakan untuk mencatat pemasukan, pengeluaran, transfer antar rekening, dan koreksi saldo.

## Route

- `/transactions`
- Shortcut PWA: `/transactions?new=true`

## Lokasi File

- Page: `src/app/(dashboard)/transactions/page.tsx`
- Loading: `src/app/(dashboard)/transactions/loading.tsx`
- Client page: `src/app/(dashboard)/transactions/_components/transaksi-page-client.tsx`
- Filter Bar: `src/app/(dashboard)/transactions/_components/transaksi-filter-bar.tsx`
- Filter Sheet: `src/app/(dashboard)/transactions/_components/transaksi-filter-sheet.tsx`
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

- `getTransaksi()`
- `getRekening()`
- `getKategori()`

## Tabel Database Terkait

- `transaksi`
- `rekening`
- `kategori`

## Server Action Terkait

- `getTransaksi`
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

- User bisa menyaring transaksi berdasarkan pencarian teks (judul/catatan/kategori), periode tanggal aktif, serta panel Filter di sisi kanan.
- Menu filter diakses melalui tombol `Filter` yang menampilkan badge angka jumlah filter aktif. Mengklik tombol ini membuka side panel (Sheet) dari sisi kanan layar.
- Formulir filter di dalam panel mencakup:
  - Tipe Transaksi menggunakan segmented control (Semua, Pengeluaran, Pemasukan, Transfer).
  - Filter Transfer khusus: hanya muncul ketika tipe transaksi Transfer dipilih, menyediakan pilihan Sumber Dana (Rekening Asal) dan Tujuan Transfer (Rekening Tujuan).
  - Filter Rekening dan Kategori: tersedia saat tipe bukan Transfer untuk mempersempit hasil transaksi.
  - Rentang Nominal: menyediakan input nominal minimum dan maksimum dalam rupiah (Rp Min - Rp Max) dengan format mata uang otomatis.
  - Urutkan: dropdown pilihan pengurutan transaksi (Terbaru, Terlama, Terbesar, Terkecil).
- Badge Filter Aktif: setiap filter yang dipilih ditampilkan di bawah baris pencarian sebagai badge pill yang dapat ditutup satu per satu tanpa harus membuka panel filter.
- Tombol "Hapus Semua" tersedia di samping badge aktif untuk menghapus seluruh filter aktif sekaligus.
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

## TODO / Improvement

- Review apakah update/delete offline untuk semua skenario sudah memiliki feedback konflik data yang cukup.
- Jika recurring transaction diaktifkan, tambahkan UI dan dokumentasi khusus recurring.
