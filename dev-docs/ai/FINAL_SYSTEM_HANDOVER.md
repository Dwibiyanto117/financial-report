# FINAL SYSTEM HANDOVER — FinReport

> **Status:** M8.3 COMPLETE (Statement Import Frontend UI & Backend Support)
> **Version:** 0.5.0
> **Handover Date:** 2026-10-10

---

## 1. Arsitektur & Lingkungan Operasional
- **Project Root**: `d:\Projects\AntiGravity\Financial_report`
- **Backend Directory**: `backend/`
  - URL Service: `http://localhost:5000`
  - Database: MySQL `finreport_db` (koneksi terpusat di `backend/.env`)
  - Server start command: `npm run dev` atau `npm start`
- **Frontend Directory**: `frontend/`
  - URL Service: `http://localhost:5173`
  - Client start command: `npm run dev`
  - Production build command: `npm run build`

## 2. Fitur Aktif
- **MOD-01**: Autentikasi JWT & Simple Password Reset.
- **MOD-02**: Kategori Transaksi (15 kategori sistem + kustom).
- **MOD-03**: CRUD Transaksi Keuangan & Filter multi-kriteria.
- **MOD-04**: Dashboard Analitik (Saldo Berjalan, Donut Chart, Tren 12 Bulan).
- **MOD-05**: Ekspor Laporan Excel (.xlsx) & PDF (.pdf).
- **MOD-07**: Multi Rekening (Bank, E-Wallet, Cash) & Atomic Transfer Antar Rekening.
- **MOD-08**: Statement Import Mutasi Rekening (Backend Pipeline Core, Template Generator Standar FinReport, & Frontend UI `/import`).

## 3. Alur Antarmuka Pengguna Import (`/import`)
1. **Langkah 1: Konfigurasi & Berkas**:
   - Pilih rekening tujuan aktif.
   - Unggah berkas via dropzone (.csv/.xlsx, maks 5 MB).
   - Pilih parser: Otomatis, Mandiri, Template FinReport, atau Generik (pemetaan kolom kustom).
   - Menu modal "Unduh Template Standar" (pilihan bank dinamis dari backend, format XLSX/CSV via blob).
   - Modal password muncul otomatis bila berkas terenkripsi (input in-memory zero-logging).
2. **Langkah 2: Tinjau & Konfirmasi Pratinjau**:
   - Banner usulan rekening tujuan (`suggested_account`) 1-klik bila cocok dengan nomor rekening berkas.
   - Bar metrik ringkasan (Total, Baru, Duplikat, Tidak Valid) & panel collapsible peringatan.
   - Tampilan tinjau transaksi (desktop table >= 768px / mobile cards < 768px): aksi massal, seleksi baris, dropdown kategori tipe sama, badge duplikat, badge rekomendasi kategori, badge potensi transfer ("Mungkin Transfer"), kontrol simpan aturan kata kunci (`learn_rule`).
3. **Langkah 3: Commit & Riwayat**:
   - Simpan atomic transaksi & aturan kata kunci.
   - Layar konfirmasi hasil commit.
   - Tab Riwayat Impor dengan filter rekening & status (`ALL`, `COMMITTED`, `CANCELLED`, `PREVIEW`).
   - Pembatalan batch pratinjau (`PREVIEW`) tanpa transaksi terhapus.
   - Rollback atomik batch `COMMITTED` dengan modal konfirmasi dan pemulihan saldo otomatis.

## 4. Panduan Menjalankan Skrip Pengujian
Skrip uji mandiri berada di `backend/scripts/`:
- **Uji Unit Inti (Tanpa dependensi server/password)**:
  ```bash
  node backend/scripts/test-utils-m8.1.js
  node backend/scripts/test-parsers-m8.1.js
  node backend/scripts/test-tz-template.js
  ```
- **Uji Rate Limiter Terisolasi**:
  Dijalankan terhadap server backend yang berjalan dengan batas bawaan (tanpa `IMPORT_RATE_LIMIT_MAX`):
  ```bash
  node backend/scripts/verify-rate-limit.js
  ```
- **Suite Sintetis Komprehensif (M8.1, M8.2, M8.3)**:
  Memerlukan variabel lingkungan shell yang diisi oleh developer/tester (jangan ditulis di file kode/chat):
  ```powershell
  $env:M8_TEST_PASSWORD = "<test_user_password>"
  $env:M8_FIXTURE_PASSWORD = "<fixture_password>"
  $env:IMPORT_RATE_LIMIT_MAX = "200"

  # 1. Generate data uji sintetis
  node backend/scripts/seed-m8-testdata.js

  # 2. Jalankan skrip verifikasi
  node backend/scripts/verify-m8.3-backend.js
  node backend/scripts/verify-m8.2.js

  # 3. WAJIB: Bersihkan data uji setelah selesai
  node backend/scripts/seed-m8-testdata.js --clean
  ```

## 5. Akun Percobaan (Demo Account)
- **Email**: `budi@example.com`
- **Password**: `NewPassword456`
- **Recovery Token (Sample)**: `REC-811000`