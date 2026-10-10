# FINAL SYSTEM HANDOVER — FinReport

> **Status:** M8.4 Track A COMPLETE (Security Audit, Generic PDF Reader Engine, Parser Registry)
> **Version:** 0.5.1
> **Handover Date:** 2026-10-11

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
- **MOD-08**: Statement Import Mutasi Rekening:
  - Backend Pipeline Core & Atomic Commit (2000 baris ~230 ms).
  - Proteksi Keamanan: Decompression limit zip bomb (maks 50 MB / 2000 entri), rate limit commit (30 req / 10m), rate limit preview (10 req / 10m), proteksi IDOR multi-user terisolasi.
  - Generic PDF Reader Engine (`pdfjs-dist@4.10.38` legacy, batas 50 halaman, timeout 15 detik, koordinat baris/sel cerdas, in-memory buffer).
  - Registry Parser Dinamis (`GET /api/imports/parsers`) & allowlist upload diturunkan dinamis.
  - Template Generator Standar FinReport (CSV/XLSX) untuk semua bank & dompet digital.
  - Frontend UI `/import`: Wizard 3 langkah (Konfigurasi, Pratinjau & Review, Hasil & Riwayat).

## 3. Alur Antarmuka Pengguna Import (`/import`)
1. **Langkah 1: Konfigurasi & Berkas**:
   - Pilih rekening tujuan aktif.
   - Unggah berkas via dropzone (.csv/.xlsx, maks 5 MB).
   - Pilihan parser dinamis dari API: Otomatis, Mandiri, Template FinReport, atau Generik (pemetaan kolom kustom).
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
  node backend/scripts/test-export-formula-m8.4.js
  ```
- **Uji Rate Limiter Terisolasi**:
  Dijalankan terhadap server backend yang berjalan dengan batas bawaan:
  ```bash
  node backend/scripts/verify-rate-limit.js
  node backend/scripts/test-commit-rate-limit-m8.4.js
  ```
- **Suite Sintetis Komprehensif (M8.1 s/d M8.4)**:
  Memerlukan variabel lingkungan shell yang diisi oleh developer/tester:
  ```powershell
  $env:M8_TEST_PASSWORD = "<test_user_password>"
  $env:M8_FIXTURE_PASSWORD = "<fixture_password>"
  $env:IMPORT_RATE_LIMIT_MAX = "200"
  $env:IMPORT_COMMIT_RATE_LIMIT_MAX = "200"

  # 1. Generate data uji sintetis
  node backend/scripts/seed-m8-testdata.js

  # 2. Jalankan skrip verifikasi
  node backend/scripts/verify-m8.1-synthetic.js
  node backend/scripts/verify-m8.2.js
  node backend/scripts/verify-m8.3-backend.js
  node backend/scripts/test-zipbomb-m8.4.js
  node backend/scripts/test-idor-m8.4.js
  node backend/scripts/test-pdf-reader-m8.4.js
  node backend/scripts/test-parsers-registry-m8.4.js

  # 3. WAJIB: Bersihkan data uji setelah selesai
  node backend/scripts/seed-m8-testdata.js --clean
  ```

## 5. Akun Percobaan (Demo Account)
- **Email**: `budi@example.com`
- **Password**: `NewPassword456`
- **Recovery Token (Sample)**: `REC-811000`