# TASKS — FinReport Task Tracking

> **Status:** SPRINT COMPLETED (MVP RELEASED)

---

## Selesai Dikerjakan (Done)

### Batch 1: Project Skeleton & Architecture Foundation
- [x] Setup `planning/` documentation set.
- [x] Setup `dev-docs/` baseline documentation.
- [x] Setup `backend/` skeleton with package.json, Express, Prisma, and git init.
- [x] Setup `frontend/` skeleton with Vite + React + Tailwind CSS and git init.

### Batch 2: Database & Backend Auth
- [x] Buat schema Prisma (Users, Categories, Transactions) di `backend/prisma/schema.prisma`.
- [x] Sinkronisasi schema ke MySQL via `prisma db push`.
- [x] Seed data kategori default di `backend/prisma/seed.js`.
- [x] Implementasi User Registration, Login JWT, dan Recovery Token password reset.

### Batch 3: Category & Transaction Engine
- [x] Implementasi API Categories (List, Create, Update, Delete).
- [x] Implementasi API Transactions (CRUD + Filtering rentang tanggal/kategori).
- [x] Kalkulasi real-time saldo berjalan.

### Batch 4: Dashboard & Analytics Engine
- [x] Implementasi API Summary metric cards.
- [x] Implementasi API Category Breakdown (Donut/Pie data).
- [x] Implementasi API Monthly Trend (Pemasukan vs Pengeluaran per bulan).

### Batch 5: Export Engine (Excel & PDF)
- [x] Service ekspor transaksi ke format .xlsx (ExcelJS).
- [x] Service ekspor laporan ringkasan ke format .pdf (PDFMake).

### Batch 6: Frontend UI & Mobile Responsive Integration
- [x] Setup Tailwind theme, layout Navbar, Sidebar desktop, dan Bottom Nav mobile.
- [x] Halaman Login, Register, dan Reset Password.
- [x] Halaman Dashboard dengan Chart interaktif (Recharts).
- [x] Halaman Riwayat Transaksi + Modal Add/Edit Transaksi.
- [x] Halaman Kategori & Ekspor Laporan.

### Batch B1: API Contract Normalisation & Validation
- [x] Normalisasi parameter query (`query.js` helper).
- [x] Validasi input tanggal ISO 8601 & penolakan format ambigu.
- [x] Validasi kategori terhadap tipe transaksi.

### Batch M7.1: Multi-Account Core & Transfer Engine (Backend)
- [x] Skema Prisma `Account`, `AccountType`, dan relasi `Transaction`.
- [x] Sinkronisasi MySQL & migrasi rekening default "Kas Utama".
- [x] CRUD API Rekening (`/api/accounts`) dengan kalkulasi saldo dinamis.
- [x] Atomic Transfer API (`/api/transfers`) & rollback support.
- [x] Penyesuaian Dashboard, Transaksi, dan Ekspor dengan perlindungan regresi transfer.
- [x] Verifikasi end-to-end API M7.1.

---

### Batch M7.2: Multi-Account Frontend Integration
- [x] API service client untuk `/api/accounts` dan `/api/transfers`.
- [x] Halaman Manajemen Rekening (`/accounts`).
- [x] Modal Transfer Dana antar rekening (`TransferModal.jsx`).
- [x] Selector / filter rekening di Dashboard, Transaksi, dan Laporan.
- [x] Field pilihan Rekening saat input/edit transaksi.

---

## Milestone Selanjutnya (Next: M8 Statement Import)

> **Status: SIAP DIKERJAKAN.** Rencana teknis lengkap (termasuk temuan sampel Mandiri terenkripsi, keputusan user, dan urutan batch) ada di `planning/M8-implementation-plan.md`.

### Batch M8.1: Statement Import Pipeline Core (Backend)
- [x] Model `ImportBatch`, `CategoryRule`, dan kolom `import_fingerprint` di database (`prisma db push`).
- [x] Utilitas normalisasi angka ID/EN, tanggal/jam, sanitasi sel anti-injeksi formula (`normalize.js`).
- [x] Utilitas fingerprint SHA-256 transaksi unik per rekening (`fingerprint.js`).
- [x] Reader in-memory CSV, XLSX biasa, dan XLSX terenkripsi via `officecrypto-tool` (`reader.js`).
- [x] Parser adapter: `mandiri.js` (header berbasis konten, transaksi 2 baris, metadata saldo) dan `generic.js` (pemetaan kolom dinamis).
- [x] Engine auto-categorization berbasis `category_rules` user, built-in keywords, dan fallback (`categorizer.js`).
- [x] Engine import: `preview`, `commit` atomic, `rollback` atomic, riwayat (`import.service.js`).
- [x] Endpoint REST API & Upload: `/api/imports/preview`, `/api/imports/:id/commit`, `/api/imports/:id` (rollback), `/api/imports` (history), `/api/category-rules`.
- [x] Keamanan upload: Multer memoryStorage, batas 5 MB, batas 2000 baris, rate limit 10/10m.
- [x] Skrip verifikasi 8 skenario wajib (`backend/scripts/verify-m8.1.js`) lulus 100%.
- [x] **Hardening M8.1 (Batch M8.1-H1 s/d H6)**:
  - [x] H1: `commit` batch dengan `createMany` + `skipDuplicates: true` & timeout eksplisit 30 detik (2000 baris ~230 ms).
  - [x] H2: Perhitungan `duplicate_rows` akurat & penambahan `skipped_rows` di respons commit.
  - [x] H3: Validasi ketat integer positif (`parsePositiveInt`) pada rute dan parameter import / category-rules.
  - [x] H4: Sanitasi skrip uji dari jalur privat dan nomor rekening nyata.
  - [x] H5: Dokumentasi technical debt (TD-004 s/d TD-007) di `dev-docs/ai/TECHNICAL_DEBT.md`.
  - [x] H6: Data uji sintetis mandiri (`seed-m8-testdata.js`) & extended verification (`verify-m8.1-synthetic.js`) lulus 100%.

---

## Milestone Selanjutnya (Next: M8.2 & M8.3)
- [x] **Batch M8.2: Statement Import Enhancements & Standard Template**:
  - [x] Batch M8.2-0: Strict default rate limit (10/10m), netralkan komentar nomor rekening, sinkronisasi docs technical debt & plan.
  - [x] Batch M8.2-1: Usulan rekening tujuan dari 4 digit akhir nomor rekening berkas (`suggested_account`).
  - [x] Batch M8.2-2: Aturan belajar kategori dari koreksi user (`learn_rule: true`, max 500 rules) & endpoint update `PUT /api/category-rules/:id`.
  - [x] Batch M8.2-3: Penyempurnaan prioritas kategorisasi (longest-keyword precedence & `suggestion_source`).
  - [x] Batch M8.2-4: Template standar FinReport (allowlist `bankTemplates.js`, `templateGenerator.js`, download endpoint `GET /api/imports/template`, adapter parser `template.js`).
  - [x] Batch M8.2-5: Extended synthetic test suite (`verify-m8.2.js`) & sinkronisasi dokumentasi proyek.
- [ ] **Batch M8.3**: Frontend UI `/import` (dropzone berkas, modal password, tabel review preview transaksi, dropdown kategori, badge duplikat, tab riwayat import & rollback), menu UI "Unduh Template" (pilih bank), usulan transfer antar-rekening.
- [ ] **Batch M8.4**: Adapter e-wallet & parser BCA / PDF (menunggu ketersediaan sampel berkas) & audit keamanan akhir M8.