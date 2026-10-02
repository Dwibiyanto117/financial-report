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

## Dalam Pengerjaan (In Progress / Next)

### Batch M7.2: Multi-Account Frontend Integration
- [ ] API service client untuk `/api/accounts` dan `/api/transfers`.
- [ ] Halaman Manajemen Rekening (`/accounts`).
- [ ] Modal Transfer Dana antar rekening.
- [ ] Selector / filter rekening di Dashboard, Transaksi, dan Laporan.
- [ ] Field pilihan Rekening saat input/edit transaksi.