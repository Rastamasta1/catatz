# Changelog

Format mengikuti Keep a Changelog sederhana.

## Unreleased

### Added

- **Perombakan Menyeluruh Rekap Keuangan (`/reports`)**:
  - Tiga tab navigasi utama tersinkronisasi URL (`?tab=`): Realtime, Bulanan, dan Custom.
  - Dialog pengaturan siklus rekap: tanggal cut-off dinamis (1–31) dan toggle Saldo Akumulasi tersimpan pada tabel `rekap_settings`.
  - Halaman detail rekap periode (`/reports/detail`) tervalidasi Zod dengan metrik finansial terpadu, arus kas hutang/piutang riil (D8), rekonsiliasi saldo awal/akhir mundur (D7), dan grafik proporsi pengeluaran vs sisa saldo (D9).
  - Rincian breakdown transaksi interaktif (sub-tab Kategori & Judul) dengan drawer/accordion drill-down transaksi individual per item.
  - Tab Periode Kustom dengan kemampuan CRUD penuh (dialog tambah/edit serta hapus via `ConfirmDialog`) dan tombol aksi melayang (FAB) pill anti-tabrakan.
  - Suite pengujian E2E Playwright terisolasi (`tests/e2e/rekap-flow.spec.ts`) tanpa ketergantungan Supabase produksi.
  - Inventarisasi audit komponen dan Server Actions legacy untuk menjamin backward compatibility tanpa penghapusan prematur.

### Changed

- Migrasi seluruh 5 route dashboard Next.js App Router dari Bahasa Indonesia ke Bahasa Inggris untuk standarisasi konvensi URL path:
  - `/kategori` -> `/categories`
  - `/hutang` -> `/debts`
  - `/rekap` -> `/reports`
  - `/rekening` -> `/wallets`
  - `/transaksi` -> `/transactions`
- Menambahkan HTTP 307 temporary redirects di `next.config.ts` untuk backward compatibility semua URL lama ke URL baru.
- Memperbarui revalidasi Server Actions, breadcrumb keys, user preferences, PWA shortcuts (`public/manifest.json`), dan offline fallback link (`public/offline.html`).
- Seluruh teks UI, label menu, nama tabel database, tipe TypeScript, dan file actions tetap dipertahankan tanpa perubahan fungsional.

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
