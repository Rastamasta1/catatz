# Changelog

Format mengikuti Keep a Changelog sederhana.

## [1.2.0] — 2026-10-15

### Added

- **Perombakan Menyeluruh Rekap Keuangan (`/reports`)**:
  - Tiga tab navigasi utama tersinkronisasi URL (`?tab=`): Realtime (dengan grafik Donut Chart Recharts), Bulanan, dan Custom.
  - Dialog pengaturan siklus rekap: tanggal cut-off dinamis (1–31) dan toggle Saldo Akumulasi tersimpan pada tabel `user_preferences`.
  - Halaman detail rekap periode (`/reports/detail`) tervalidasi Zod dengan metrik finansial terpadu, arus kas hutang/piutang riil, rekonsiliasi saldo awal/akhir mundur (*historical ledger rollback balance engine*), dan grafik proporsi saldo antar rekening (`proporsi-saldo-chart.tsx`).
  - Rincian breakdown transaksi interaktif (sub-tab Kategori & Judul) dengan drawer/accordion drill-down transaksi individual per item.
  - Tab Periode Kustom dengan kemampuan CRUD penuh (dialog tambah/edit serta hapus via `ConfirmDialog`).
  - Pure calculation engines terisolasi: `rekap-period.ts`, `rekap-balance.ts`, dan `rekap-aggregate.ts`.
- **Peningkatan Rekening & Keamanan Transaksi**:
  - Breakdown granular transaksi finansial (pemasukan, pengeluaran, transfer masuk, transfer keluar, dan hutang/piutang terkait) pada dialog konfirmasi hapus rekening untuk mencegah kehilangan data secara tidak sengaja.
- **Pengujian & CI**:
  - Ekspansi unit test Vitest menjadi 190 tests di 15 file test yang mencakup engine rekap, validasi, dan komponen UI.

### Changed

- Migrasi seluruh 5 route dashboard Next.js App Router dari Bahasa Indonesia ke Bahasa Inggris untuk standarisasi konvensi URL path:
  - `/kategori` -> `/categories`
  - `/hutang` -> `/debts`
  - `/rekap` -> `/reports`
  - `/rekening` -> `/wallets`
  - `/transaksi` -> `/transactions`
- Menambahkan HTTP 307 temporary redirects di `next.config.ts` untuk backward compatibility semua URL lama ke URL baru.
- Memperbarui revalidasi Server Actions, breadcrumb keys, user preferences, PWA shortcuts (`public/manifest.json`), dan offline fallback link (`public/offline.html`).
- Dekomposisi komponen monolitik `TransaksiDialog` (747 baris) menjadi 6 sub-komponen modular (`use-transaksi-dialog.ts`, `transaksi-form-fields.tsx`, `transaksi-tipe-tabs.tsx`, `transaksi-dialog-header.tsx`, `transaksi-dialog-footer.tsx`, `transaksi-ai-section.tsx`).
- Penyederhanaan workflow CI di `.github/workflows/quality.yml` dengan memfokuskan pada ESLint, Typecheck, dan Vitest unit test.

### Fixed

- Perhitungan transaksi transfer dua arah (*bidirectional*) pada filter transaksi rekening dan deteksi penggunaan rekening (`rekening-action.ts`).
- Reset otomatis pilihan kategori saat berpindah ke tipe transaksi Transfer.
- Sinkronisasi URL query params tab rekap dan perbaikan tampilan judul pada breakdown realtime.

### Removed

- Suite pengujian Playwright E2E dan konfigurasi terkait untuk mengeliminasi kelemahan timeout/flakiness pada runner headless CI.

---

## [1.1.0] — 2026-08-06

### Added

- Multi-select combo filter pada halaman transaksi untuk Tipe, Rekening, dan Kategori.
- Komponen reusable `ClearableInput` dan tombol pembersih pada `NominalInput` di seluruh dialog dashboard.
- Dokumentasi `SECURITY.md`.

### Changed

- Standarisasi tinggi trigger filter transaksi menjadi `h-12` sesuai `DESIGN.md`.

### Fixed

- Penanganan double-click pada tombol clear input nominal/teks.
- Word wrapping pada tampilan voice transcript layar kecil.
- Guard `event.source` pada pesan service worker (CWE-20, CWE-940).
- Sanitasi protokol URL avatar (CWE-79, CWE-116).

---

## [1.0.0] — 2026-06-19

First public release.

### Added

- Initial project documentation.
- Documentation index in `docs/README.md`.
- Project overview documentation.
- Architecture documentation.
- Folder structure documentation.
- Local setup documentation.
- Environment variables documentation.
- Database schema documentation.
- Database migrations documentation.
- Supabase Auth documentation.
- RLS policies documentation.
- Server Actions and API documentation.
- Frontend guidelines.
- Feature documentation for transaksi, rekening, kategori, hutang/piutang, laporan, settings, and auth.
- Vercel deployment checklist.
- PWA documentation.
- Security checklist.
- Troubleshooting guide.
- AI development rules.
- Repository-level Codex workflow instructions in `AGENTS.md`.
- Conventional Commit guidance for Codex task summaries.
- Technical commit message body requirements for Codex final responses.
- Documentation references for the Codex operating instructions.
- Root `.env.example`.
- `DESIGN.md` — Coinbase institutional design system reference (colors, typography, components, spacing).
- `CHANGELOG.md` — root-level release notes consumed by GitHub Actions release workflow.
- `.github/FUNDING.yml` — GitHub Sponsors and PayPal support links.

### Changed

- Full UI redesign mengikuti `DESIGN.md` (Coinbase institutional style):
  - Design tokens (CSS variables) di `globals.css`: Coinbase Blue primary, surface tiers, semantic colors, Inter font, Geist Mono.
  - UI primitives (`button`, `input`, `select`, `card`, `badge`, `dialog`): pill CTA, rounded-card container, rounded-input form, flat shadow.
  - Navigation: sidebar institutional style, active state left-border, brand blue hemat.
  - Dashboard pages (transaksi, rekening, rekap, hutang, kategori, settings, auth): dark hero card, asset-row pattern, mono font pada nominal.
  - Auth pages: clean light canvas, card `rounded-[24px]`, pill CTA.
- `AGENTS.md` diperbarui dengan **Design Contract** — setiap perubahan UI wajib mengikuti `DESIGN.md`.
- `docs/frontend-guidelines.md` diperbarui secara komprehensif dengan token warna, typography hierarchy, shape rules, pola komponen, dan checklist review UI.
- `docs/github-workflows.md` diperbarui untuk mencerminkan workflow `release.yml` aktual: tanpa build step, menggunakan `CHANGELOG.md` sebagai body release, dan dokumentasi `FUNDING.yml`.
- `package.json` version bump ke `1.0.0`.
