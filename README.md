# FinReport — Personal Finance Management Web Application

Aplikasi pencatatan keuangan personal berbasis web responsif yang memberikan kemudahan pencatatan transaksi harian, analisis tren dan pola pengeluaran secara visual, serta ekspor laporan instan lintas perangkat (desktop & mobile) secara aman.

---

## Fitur Utama
- **Autentikasi & Akun**: Registrasi, login dengan JWT, dan reset password dengan verifikasi kode pemulihan sederhana.
- **Multi-Rekening & Dompet Digital**: Pengelolaan berbagai sumber dana (Bank Mandiri, BCA, BRI, BNI, BSI, GoPay, OVO, DANA, ShopeePay, Kas Tunai) dengan saldo independen dan kustomisasi warna kartu.
- **Transfer Antar Rekening**: Pemindahan saldo atomik 2-arah (`TRANSFER_OUT` dan `TRANSFER_IN` via `transferGroupId`) dengan validasi kecukupan saldo dan pencatatan biaya admin terpisah tanpa mencemari grafik pengeluaran/pemasukan.
- **Kategori Transaksi**: Kategori bawaan sistem (15 kategori) dan pembuatan kategori kustom (nama, tipe, ikon, warna).
- **Pencatatan Transaksi**: CRUD transaksi pemasukan dan pengeluaran dengan pemilihan rekening sumber dana, format pengetikan Rupiah otomatis (`.` dan `,00`), pencarian catatan, dan filter multi-kriteria.
- **Dashboard Analitik**:
  - Saldo Berjalan (Running Balance) akumulasi semua rekening atau per rekening tertentu.
  - Ringkasan pemasukan, pengeluaran, dan selisih bersih (net) periode aktif.
  - Grafik Donut komposisi pengeluaran per kategori.
  - Grafik Batang perbandingan tren arus kas 12 bulan.
- **Ekspor Laporan**:
  - Unduh berkas spreadsheet **Excel (.xlsx)** terformat rapi dengan kolom Rekening dan kalkulasi total.
  - Unduh berkas dokumen **PDF (.pdf)** siap cetak lengkap dengan ringkasan visual per periode.
- **Statement Import Mutasi Rekening (v0.5.0)**:
  - **Antarmuka Pengguna Interaktif (`/import`)**: Alur bertahap dengan dropzone berkas drag & drop, tab pratinjau transaksi, dan tab riwayat batch impor dengan aksi rollback.
  - **Dukungan Format Fleksibel**: Menerima mutasi CSV, XLSX standar, dan e-Statement Bank Mandiri terenkripsi password (dekripsi aman di memori tanpa menulis berkas ke disk).
  - **Template Standar FinReport**: Unduhan template mutasi seragam (XLSX dan CSV) untuk semua bank (BCA, Mandiri, BRI, BNI, CIMB, Bank Jago) dan dompet digital (Dana, OVO, GoPay) dengan validasi dropdown dan petunjuk pengisian.
  - **Deteksi Cerdas Rekening Tujuan**: Rekomendasi otomatis rekening tujuan berdasarkan kecocokan 4 digit akhir nomor rekening berkas.
  - **Pembelajaran Kategori Otomatis (Rule Learning)**: Pilihan simpan aturan kata kunci saat konfirmasi impor mutasi dengan hierarki pencocokan keyword terpanjang (longest-keyword precedence).
  - **Pencegahan Transaksi Ganda**: Deduplikasi transaksi berbasis fingerprint SHA-256 unik per rekening dan per urutan kemunculan transaksi kembar.
  - **Pembatalan Aman (Rollback Atomic)**: Batalkan import satu batch sekaligus beserta transaksinya dengan pemulihan saldo otomatis.
- **Mobile-First UX**: Modal dialog otomatis bertransformasi menjadi *bottom-sheet* dengan scroll body mandiri dan sticky buttons saat dibuka di smartphone.

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