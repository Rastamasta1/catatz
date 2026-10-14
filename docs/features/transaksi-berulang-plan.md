# Implementation Plan: Fitur Transaksi Berulang (Recurring Transactions)

> **Dokumen Perencanaan Implementasi**  
> **Status:** Draft / Review  
> **Target:** CatatZ Production (Live-grade)  
> **Design Compliance:** `DESIGN.md` & `AGENTS.md` (Coinbase Flat Design System)  

---

## 1. Latar Belakang & Ringkasan

Fitur **Transaksi Berulang** (*Recurring Transactions*) dirancang untuk mengotomatisasi pencatatan transaksi yang terjadi secara rutin dan berulang (seperti langganan Netflix/Spotify, tagihan internet/listrik, cicilan non-hutang, gaji rutin, atau transfer tabungan berkala).

Saat ini, skema dasar tabel `recurring_transaksi` dan tipe enum `interval_recurring` sudah dibuat di `src/migrations/007-recurring.sql`, dan tabel `transaksi` sudah memiliki kolom `is_recurring` dan `recurring_id`. Namun, belum tersedia Server Action, routing `/recurring`, navigasi sidebar, maupun antarmuka pengguna (UI).

Dokumen ini menjabarkan rencana implementasi menyeluruh yang aman untuk production, modular, dan mematuhi aturan desain CatatZ.

---

## 2. Navigasi Sidebar

Sesuai permintaan, menu **Transaksi Berulang** akan ditempatkan pada sidebar di grup **"Lainnya"** berdampingan dengan menu Kategori.

**Perubahan pada [`src/components/common/app-sidebar.tsx`](file:///Users/kupzed/Code/kupzed/catatz/src/components/common/app-sidebar.tsx):**
```ts
const NAV_ITEMS = [
  {
    group: "Menu Utama",
    items: [
      { href: "/transactions", label: "Transaksi", icon: ArrowLeftRight },
      { href: "/wallets", label: "Rekening", icon: Landmark },
      { href: "/reports", label: "Rekap", icon: BarChart3 },
      { href: "/debts", label: "Hutang", icon: HandCoins },
    ],
  },
  {
    group: "Lainnya",
    items: [
      { href: "/recurring", label: "Transaksi Berulang", icon: Repeat },
      { href: "/categories", label: "Kategori", icon: Tags },
    ],
  },
] as const;
```

---

## 3. Analisis Database & Skema Additive

### 3.1 Skema Saat Ini (`007-recurring.sql`)
```sql
CREATE TYPE interval_recurring AS ENUM ('harian', 'mingguan', 'bulanan', 'tahunan');

CREATE TABLE IF NOT EXISTS public.recurring_transaksi (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipe            tipe_transaksi NOT NULL,
  nominal         NUMERIC(15, 2) NOT NULL,
  kategori_id     UUID REFERENCES public.kategori(id) ON DELETE SET NULL,
  rekening_id     UUID REFERENCES public.rekening(id) ON DELETE SET NULL,
  rekening_tujuan UUID REFERENCES public.rekening(id) ON DELETE SET NULL,
  catatan         TEXT,
  tags            TEXT[] DEFAULT '{}',
  interval_type   interval_recurring NOT NULL DEFAULT 'bulanan',
  next_run        DATE NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 Temuan Kritis & Rekomendasi Migration Additive
Tabel `transaksi` mewajibkan kolom `judul VARCHAR(200)` untuk transaksi bertipe `income` dan `expense`. Skema awal `recurring_transaksi` belum memiliki kolom `judul`. 

Sesuai kaidah `AGENTS.md` (**Zero-Destructive / Safe Changes**), kita **tidak boleh** mengubah `007-recurring.sql`. Sebagai gantinya, dibuat migration baru yang murni additive:

**Migration Baru: `src/migrations/015-add-judul-to-recurring.sql`:**
```sql
-- Migration 015: Add Judul to Recurring Transaksi
ALTER TABLE public.recurring_transaksi 
ADD COLUMN IF NOT EXISTS judul VARCHAR(200);

-- Comment
COMMENT ON COLUMN public.recurring_transaksi.judul IS 'Nama atau judul template transaksi berulang (wajib untuk income/expense)';
```

---

## 4. Mesin Eksekusi Transaksi (Execution Strategy)

Karena CatatZ berjalan pada Next.js App Router (PWA) di Vercel dengan Supabase, ada dua pendekatan eksekusi yang saling melengkapi:

### 4.1 Strategi Utama: On-App Catch-up (Seamless User Experience)
- Dijalankan otomatis saat user membuka aplikasi atau masuk ke halaman `/transactions` maupun `/recurring` via Server Action `processDueRecurringTransactions()`.
- **Alur Kerja:**
  1. Cari semua data `recurring_transaksi` milik user di mana `is_active = TRUE` dan `next_run <= CURRENT_DATE`.
  2. Untuk setiap item yang jatuh tempo:
     - Insert transaksi baru ke tabel `transaksi`:
       - `tipe`, `nominal`, `judul`, `catatan`, `tags`, `kategori_id`, `rekening_id`, `rekening_tujuan`.
       - `tanggal = item.next_run`.
       - `is_recurring = true`.
       - `recurring_id = item.id`.
       - Database trigger CatatZ otomatis memperbarui saldo rekening asal/tujuan secara riil.
     - Hitung tanggal `next_run` baru berdasarkan `interval_type`:
       - `harian`: `next_run + interval '1 day'`
       - `mingguan`: `next_run + interval '1 week'`
       - `bulanan`: `next_run + interval '1 month'` (mempertahankan tanggal akhir bulan dengan aman)
       - `tahunan`: `next_run + interval '1 year'`
     - Update record `recurring_transaksi` dengan `next_run` baru dan `updated_at = NOW()`.
  3. Kembalikan jumlah transaksi yang berhasil dieksekusi agar UI dapat menampilkan notifikasi toast (misal: *"2 transaksi berulang berhasil dicatat otomatis!"*).

### 4.2 Strategi Pendukung: Headless Cron Endpoint (Opsional)
- Route handler: `/api/cron/process-recurring`
- Dilindungi oleh header `Authorization: Bearer CRON_SECRET` untuk dipanggil oleh Vercel Cron atau Supabase pg_cron setiap hari pukul 00:01 WIB.

---

## 5. Rincian File & Arsitektur Kode

### 5.1 Type Definitions (`src/types/recurring.ts`)
```ts
export type IntervalRecurring = 'harian' | 'mingguan' | 'bulanan' | 'tahunan';

export interface RecurringTransaksi {
  id: string;
  user_id: string;
  tipe: 'income' | 'expense' | 'transfer';
  judul: string | null;
  nominal: number;
  kategori_id: string | null;
  rekening_id: string | null;
  rekening_tujuan: string | null;
  catatan: string | null;
  tags: string[];
  interval_type: IntervalRecurring;
  next_run: string; // YYYY-MM-DD
  is_active: boolean;
  created_at: string;
  updated_at: string;
  kategori?: Kategori | null;
  rekening?: Rekening | null;
  rekening_tujuan_data?: Rekening | null;
}
```

### 5.2 Validasi Zod (`src/validations/recurring-validation.ts`)
- `recurringSchema`:
  - `tipe`: enum `['income', 'expense', 'transfer']` (tidak ada `correction` untuk recurring).
  - `judul`: required untuk income/expense, null untuk transfer.
  - `nominal`: positive number.
  - `interval_type`: enum `['harian', 'mingguan', 'bulanan', 'tahunan']`.
  - `next_run`: valid date format (default: hari ini atau tanggal awal siklus).
  - `kategori_id`: required untuk income/expense, forbidden untuk transfer.
  - `rekening_id`: required.
  - `rekening_tujuan`: required untuk transfer, forbidden untuk non-transfer, beda dengan `rekening_id`.
  - `is_active`: boolean default true.

### 5.3 Server Actions (`src/actions/recurring-action.ts`)
1. `getRecurringTransaksi()`: Mengambil daftar transaksi berulang user lengkap dengan relasi kategori dan rekening.
2. `createRecurringTransaksi(values)`: Membuat template transaksi berulang baru.
3. `updateRecurringTransaksi(id, values)`: Memperbarui template transaksi berulang.
4. `deleteRecurringTransaksi(id)`: Menghapus template (transaksi lama di `transaksi` tetap utuh, kolom `recurring_id` di-set NULL via FK ON DELETE SET NULL).
5. `toggleRecurringStatus(id, isActive)`: Mengaktifkan atau menjeda template.
6. `processDueRecurringTransactions()`: Memproses transaksi yang jatuh tempo.

### 5.4 Antarmuka Halaman (`/recurring`)
- **Route:** `src/app/(dashboard)/recurring/page.tsx` (Server Component, fetch initial data & auto catch-up).
- **Client Root:** `src/app/(dashboard)/recurring/_components/recurring-page-client.tsx`:
  - Header: Judul display (`text-[32px] font-normal tracking-[-0.4px]`), deskripsi, tombol CTA `+ Tambah Berulang` (pill `rounded-full`).
  - Ringkasan statistik (Total Aktif, Estimasi Beban Bulanan, dsb.).
  - Filter bar: Tab status (Semua / Aktif / Dijeda) & Interval filter.
  - List of Cards (`recurring-card.tsx`):
    - Ikon tipe/kategori.
    - Judul template & nama rekening.
    - Nominal (`font-mono font-semibold`).
    - Badge interval & tanggal eksekusi berikutnya (`Jatuh tempo: 25 Okt 2026`).
    - Switch toggle aktif/jeda cepat.
    - Menu dropdown edit & hapus.
- **Form Dialog:** `src/app/(dashboard)/recurring/_components/recurring-dialog.tsx`:
  - Modal form terstandar dengan design system CatatZ.

---

## 6. Kepatuhan Desain (`DESIGN.md` Contract)

- [x] **CTA Button:** Semua tombol aksi utama menggunakan `rounded-full` (pill).
- [x] **Card Container:** Menggunakan `rounded-card` (`rounded-[24px]`) dengan hairline border tipis (`border-hairline`).
- [x] **Input Height & Radius:** Input menggunakan `h-12` dan `rounded-input` (`rounded-[12px]`).
- [x] **Typography:** Font utama Inter, heading `h1` dengan `font-normal tracking-[-0.4px]`, angka nominal wajib Geist Mono (`font-mono`).
- [x] **Colors:** `bg-primary` untuk CTA, semantic up/down hanya pada teks, bukan background.
- [x] **Responsif:** Grid responsif (1 kolom pada mobile `< 640px`, 2-3 kolom pada desktop `> 1024px`).

---

## 7. Rencana Tahapan Kerja (Phasing)

| Tahap | Aktivitas | Estimasi Output |
|---|---|---|
| **Phase 1** | Migration & Types | File `src/migrations/015-add-judul-to-recurring.sql`, `src/types/recurring.ts` |
| **Phase 2** | Validasi & Actions | `src/validations/recurring-validation.ts`, `src/actions/recurring-action.ts` (termasuk auto-catchup) |
| **Phase 3** | Navigasi & Routing | Update `app-sidebar.tsx`, buat route `src/app/(dashboard)/recurring/page.tsx` |
| **Phase 4** | UI Components | `recurring-page-client.tsx`, `recurring-card.tsx`, `recurring-dialog.tsx` |
| **Phase 5** | Testing & Verification | Unit test Zod, Action, Dialog, dan verifikasi `npm run verify:quick` |
