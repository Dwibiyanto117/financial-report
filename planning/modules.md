# Modules Breakdown — Personal Finance Web App (FinReport)

> **Status:** APPROVED — Functional Modules Specification

---

## 1. Modul Overview

Sistem dipecah menjadi 5 modul fungsional utama dan 1 modul utilitas:

| Modul | Deskripsi | Status |
|-------|-----------|--------|
| `MOD-01: Auth` | Registrasi, login, logout, reset password verifikasi sederhana | Planned |
| `MOD-02: Category` | Pengelolaan kategori bawaan sistem dan kustom per user | Planned |
| `MOD-03: Transaction` | Pencatatan, pengubahan, penghapusan, dan filter transaksi keuangan | Planned |
| `MOD-04: Dashboard` | Kalkulasi saldo berjalan, total pemasukan/pengeluaran, grafik komposisi & tren | Planned |
| `MOD-05: Export` | Pembuatan berkas laporan terformat Excel (.xlsx) dan PDF (.pdf) | Planned |
| `MOD-06: Common` | Format mata uang (extensible), middleware keamanan, response wrapper | Planned |

---

## 2. Rincian Modul

### MOD-01: Auth Module
- **Endpoints**:
  - `POST /api/auth/register`: Mendaftar pengguna baru
  - `POST /api/auth/login`: Otentikasi dan penerbitan JWT
  - `POST /api/auth/forgot-password`: Permintaan kode PIN pemulihan (Simple Recovery Token)
  - `POST /api/auth/reset-password`: Reset password menggunakan token verifikasi
  - `GET /api/auth/me`: Mengambil data profil pengguna aktif
- **Frontend Pages**:
  - `/login`: Form masuk
  - `/register`: Form pendaftaran
  - `/forgot-password`: Form permintaan token pemulihan
  - `/reset-password`: Form penginputan token & password baru

### MOD-02: Category Module
- **Endpoints**:
  - `GET /api/categories`: Mengambil kategori aktif (gabungan bawaan sistem + kustom milik user)
  - `POST /api/categories`: Menambahkan kategori kustom
  - `PUT /api/categories/:id`: Mengubah nama/warna/ikon kategori kustom
  - `DELETE /api/categories/:id`: Menghapus kategori kustom (hanya milik user)
- **Frontend Components**:
  - Modal tambah/edit kategori
  - Dropdown selector kategori dengan ikon & warna

### MOD-03: Transaction Module
- **Endpoints**:
  - `GET /api/transactions`: Mendapatkan daftar transaksi dengan query parameter (start_date, end_date, category_id, type, search, page, limit)
  - `POST /api/transactions`: Mencatat transaksi baru
  - `GET /api/transactions/:id`: Detail 1 transaksi
  - `PUT /api/transactions/:id`: Update data transaksi
  - `DELETE /api/transactions/:id`: Hapus transaksi
- **Frontend Components**:
  - Form Input Transaksi (Quick Add Modal / Page)
  - Tabel Riwayat Transaksi (Desktop) dan List Card Transaksi (Mobile)
  - Bar Filter Interaktif (Tanggal, Kategori, Tipe)

### MOD-04: Dashboard & Analytics Module
- **Endpoints**:
  - `GET /api/dashboard/summary`: Mengambil ringkasan saldo berjalan, total pemasukan, total pengeluaran, dan net
  - `GET /api/dashboard/category-breakdown`: Agregasi pengeluaran dan pemasukan per kategori
  - `GET /api/dashboard/monthly-trend`: Data tren komparasi pemasukan vs pengeluaran per bulan
- **Frontend Components**:
  - Summary Cards (Total Saldo, Pemasukan Bulan Ini, Pengeluaran Bulan Ini, Selisih)
  - Donut Chart Komposisi Kategori (Recharts / Chart.js)
  - Bar Chart Tren Bulanan
  - Recent Transactions Widget

### MOD-05: Export Module
- **Endpoints**:
  - `GET /api/reports/export/excel`: Download file `.xlsx` berisi lembar transaksi dan ringkasan
  - `GET /api/reports/export/pdf`: Download file `.pdf` dokumen cetak rekapitulasi keuangan
- **Frontend Components**:
  - Tombol aksi "Ekspor Laporan" dengan pilihan format Excel / PDF dan modal pemilihan rentang waktu

### MOD-06: Common & Utility Module
- **Currency Helper**: `formatCurrency(amount, currency = 'IDR')` terstandarisasi di frontend dan backend.
- **Error Handling**: Format respon API terpusat `{ success: boolean, message: string, data: any, errors?: any[] }`.

---

## 3. Modul Post-MVP

| Modul | Deskripsi | Status |
|-------|-----------|--------|
| `MOD-07: Account` | Multi rekening (bank, e-wallet, tunai), saldo per rekening, transfer | Proposed |
| `MOD-08: Statement Import` | Import mutasi CSV/XLSX per rekening, preview, deteksi duplikat, auto-kategori, rollback | Proposed |
