## v1.2.0

The third release of CatatZ, introducing a **comprehensive overhaul of financial reporting (Rekap)**, **English URL routes migration with zero-downtime redirects**, **bidirectional transfer accounting and deletion protection for wallets**, **transaction dialog modularization**, and **streamlined CI testing**.

This release includes 37 commits (29 non-merge) touching 147 files since v1.1.0.

---

### ✨ New Features

#### 📊 Financial Reports Overhaul (Rekap Revamp) ([#11](https://github.com/kupzed/catatz/pull/11), [#12](https://github.com/kupzed/catatz/pull/12))

- **Tabbed Rekap Shell:**
  - **Realtime:** Real-time expense & income overview featuring an interactive category Donut Chart (Recharts) with segmented breakdown tabs (Categories & Transaction Titles).
  - **Monthly Cycles (Siklus Bulanan):** Track finances based on custom salary/cut-off dates (1–31) with cycle status badges (Active/Past), previous cycle comparisons, and accumulated balance tracking.
  - **Custom Periods (Periode Kustom):** Create and manage custom date ranges (events, holidays, projects) with complete CRUD management dialogs.
- **Dedicated Period Detail Route (`/reports/detail`):**
  - Drill down into any monthly cycle or custom period.
  - **Asset Distribution Chart:** Interactive balance proportion chart visualizing funds across all wallets at that historical period.
  - **Interactive Breakdown:** Segmented tabs for Category and Title breakdown with expandable accordion drill-down to view individual transactions.
- **Historical Ledger Rollback Engine:**
  - Implemented pure calculation engines (`rekap-period.ts`, `rekap-balance.ts`, `rekap-aggregate.ts`) capable of rolling back live balances to accurately reconstruct starting/ending balances for any past period.
- **Rekap Settings Dialog:**
  - Configurable cut-off day (1–31) and toggle for balance accumulation stored in user preferences.

#### 🌐 English Dashboard Routes Migration ([#9](https://github.com/kupzed/catatz/pull/9), [#10](https://github.com/kupzed/catatz/pull/10))

- Standardized all dashboard URL paths to English conventions:
  - `/transaksi` ➔ `/transactions`
  - `/rekening` ➔ `/wallets`
  - `/rekap` ➔ `/reports`
  - `/hutang` ➔ `/debts`
  - `/kategori` ➔ `/categories`
- **Zero-Downtime Backward Compatibility:** Added HTTP 307/308 permanent redirects in `next.config.ts` for all legacy paths, ensuring existing bookmarks and links continue working seamlessly.
- Updated Server Action revalidations, breadcrumbs, sidebar navigation, user preferences, PWA shortcuts, and offline fallback pages.

#### 🏦 Wallet Safety & Granular Deletion Warning ([#15](https://github.com/kupzed/catatz/pull/15), [#16](https://github.com/kupzed/catatz/pull/16))

- **Granular Financial Breakdown:** When attempting to delete a wallet, a detailed summary is displayed showing total income, expenses, incoming transfers, outgoing transfers, and related debt/credit counts to prevent accidental data loss.

---

### 🐛 Bug Fixes & Refactoring

- **fix(wallets):** Account for transfer transactions bidirectionally in wallet transaction filters and usage checks, ensuring transfers appear correctly whether the account is the sender or recipient ([d4ad74d](https://github.com/kupzed/catatz/commit/d4ad74d)).
- **refactor(transactions):** Decompose the monolithic 747-line `TransaksiDialog` into 6 maintainable subcomponents (`use-transaksi-dialog`, `transaksi-form-fields`, `transaksi-tipe-tabs`, `transaksi-dialog-header`, `transaksi-dialog-footer`, and `transaksi-ai-section`) ([ef871e9](https://github.com/kupzed/catatz/commit/ef871e9)).
- **fix(transactions):** Automatically clear category selection when switching transaction type to _Transfer_ ([010653b](https://github.com/kupzed/catatz/commit/010653b)).
- **fix(reports):** Resolve realtime breakdown title label bug, synchronize tab query params with browser history without unneeded re-renders, and align card proportions ([b15533a](https://github.com/kupzed/catatz/commit/b15533a), [74f918c](https://github.com/kupzed/catatz/commit/74f918c)).

---

### 🗄️ Database Migrations

- **`014-fix-default-landing-page-values.sql`**: Updates column default for `default_landing_page` to `/transactions` and migrates existing user preference records to new English routes.
- **`014-rekap-periode.sql`**: Adds `cutoff_day` and `akumulasi_saldo` columns to `user_preferences`, and creates the `rekap_periode_custom` table with full Row Level Security (RLS) policies and indexes.

---

### 🧪 Tests & CI Workflow

- **CI Pipeline Streamlining:** Removed flaky Playwright E2E suite and optimized `.github/workflows/quality.yml` for fast, reliable CI execution.
- **Expanded Unit Test Suite:** Vitest unit test suite expanded to **190 tests across 15 test files** (up from 98 tests in v1.1.0), covering all pure rekap calculation engines, validation schemas, and UI components.

---

### 📊 Release Stats

| Metric               | Value                                 |
| -------------------- | ------------------------------------- |
| Commits since v1.1.0 | 37 (29 non-merge)                     |
| Files changed        | 147                                   |
| Lines added          | 11,930                                |
| Lines removed        | 1,935                                 |
| Pull Requests merged | #9, #10, #11, #12, #13, #14, #15, #16 |
| Unit Tests Passing   | 190 / 190 (100%)                      |

---

### 🔗 Links

- [Full Changelog](https://github.com/kupzed/catatz/compare/v1.1.0...v1.2.0)
- [README](./README.md)
- [Technical Documentation](./docs/README.md)
- [Database Migrations](./docs/database-migrations.md)
