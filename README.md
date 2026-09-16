# FinReport — Personal Finance Management Web Application

Aplikasi pencatatan keuangan personal berbasis web responsif yang memberikan kemudahan pencatatan transaksi harian, analisis tren dan pola pengeluaran secara visual, serta ekspor laporan instan lintas perangkat (desktop & mobile) secara aman.

---

## Fitur Utama (MVP)
- **Autentikasi & Akun**: Registrasi, login dengan JWT, dan reset password dengan verifikasi kode pemulihan sederhana.
- **Kategori Transaksi**: Kategori bawaan sistem (15 kategori) dan pembuatan kategori kustom (nama, tipe, ikon, warna).
- **Pencatatan Transaksi**: CRUD pemasukan dan pengeluaran, format mata uang Rupiah, pencarian catatan, dan filter multi-kriteria (rentang tanggal, tipe, kategori).
- **Dashboard Analitik**:
  - Saldo Berjalan (Running Balance) akumulasi sepanjang masa.
  - Ringkasan pemasukan, pengeluaran, dan selisih bersih (net) periode aktif.
  - Grafik Donut komposisi pengeluaran per kategori.
  - Grafik Batang perbandingan tren arus kas 12 bulan.
- **Ekspor Laporan**:
  - Unduh berkas spreadsheet **Excel (.xlsx)** terformat rapi dengan kalkulasi total.
  - Unduh berkas dokumen **PDF (.pdf)** siap cetak lengkap dengan ringkasan visual.

---

## Arsitektur & Tech Stack
- **Backend API (`backend/`)**: Node.js, Express.js, Prisma ORM, MySQL 8.0+, JWT, bcryptjs, ExcelJS, PDFMake.
- **Frontend SPA (`frontend/`)**: React 18 (Vite), Tailwind CSS, Lucide Icons, Recharts, Axios, React Router.
- **Dokumentasi & Perencanaan**:
  - `planning/`: Dokumen PRD, Arsitektur, Skema DB, Kontrak API, Wireframe, Timeline.
  - `dev-docs/`: Panduan pengembang, mental model, modul mapping, changelog.

---

## Cara Menjalankan Aplikasi

### 1. Prasyarat
- Node.js >= 18 LTS
- MySQL Database (misal via XAMPP)

### 2. Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Pastikan DATABASE_URL dan JWT_SECRET sudah sesuai di .env

npx prisma db push
node prisma/seed.js
npm run dev
```
Backend akan berjalan di `http://localhost:5000`.

### 3. Setup Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
Frontend akan berjalan di `http://localhost:5173`.

---

## Akun Demo
- **Email**: `budi@example.com`
- **Password**: `NewPassword456`