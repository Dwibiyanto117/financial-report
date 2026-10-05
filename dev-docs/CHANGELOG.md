# CHANGELOG — Personal Finance Web App (FinReport)

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.0.0/).
Versi mengikuti [Semantic Versioning](https://semver.org/lang/id/).

---

## [Unreleased]

### Planned
- **Batch M8.2**: Parser adapter BCA dan penyempurnaan rule kategori.
- **Batch M8.3**: Frontend UI `/import` (dropzone, password dialog, tabel review, tab riwayat & rollback).

---

## [0.4.0] — 2026-10-05

### Added
- **Database Schema**: Enum `ImportStatus` (`PREVIEW`, `COMMITTED`, `CANCELLED`), tabel `import_batches` dan `category_rules`, serta penambahan `import_batch_id` dan `import_fingerprint` dengan constraint `UNIQUE(account_id, import_fingerprint)` pada tabel `transactions`.
- **Import Utilitas**: `normalize.js` (parsing angka format ID & EN, tanggal/waktu fleksibel, sanitasi awalan formula `= + - @`) dan `fingerprint.js` (hash SHA-256 deduplikasi transaksi).
- **Parser Adapter Engine**:
  - `reader.js`: Pembacaan buffer in-memory untuk CSV, XLSX biasa, dan XLSX terenkripsi lewat `officecrypto-tool` tanpa menulis berkas ke disk.
  - `mandiri.js`: Adapter e-Statement Mandiri dengan penemuan header berbasis isi, penanganan transaksi multi-baris (tanggal + jam), ekstraksi ringkasan metadata, dan rekonsiliasi non-blocking.
  - `generic.js`: Adapter format generik dengan pemetaan kolom dinamis (`mapping` nama atau indeks).
  - `index.js`: Registry adapter dengan deteksi otomatis berbasis skor keyakinan (confidence >= 0.5).
- **Engine Auto-Categorization (`categorizer.js`)**: Rekomendasi kategori otomatis dengan urutan prioritas: aturan kustom pengguna (`category_rules`) -> aturan kata kunci bawaan sistem (Grab, Indomaret, PLN, Gaji, dll.) -> fallback kategori "Lainnya" sesuai tipe.
- **Import Business Logic Service (`import.service.js`)**:
  - `preview`: Menghasilkan pratinjau transaksi, kalkulasi fingerprint, deteksi duplikasi, rekomendasi kategori, dan penyimpanan status PREVIEW.
  - `commit`: Penyimpanan transaksi secara atomik dalam satu transaksi database, penanganan race condition fingerprint, dan pembersihan `parsed_payload`.
  - `rollback`: Pembatalan batch COMMITTED dan penghapusan transaksi batch terkait secara atomik.
  - `listBatches` & `getBatch`: Riwayat batch tanpa membocorkan payload besar pada daftar list.
- **Category Rule Service (`categoryRule.service.js`)**: CRUD aturan kata kunci per pengguna dengan validasi kepemilikan.
- **API Endpoints & Upload Security**:
  - `POST /api/imports/preview` dengan Multer memoryStorage, batas 5 MB, batas 2000 baris, dan rate limiting (10 upload per 10 menit per user/IP).
  - `POST /api/imports/:id/commit`
  - `DELETE /api/imports/:id` (rollback)
  - `GET /api/imports` dan `GET /api/imports/:id`
  - `GET`, `POST`, `DELETE` pada `/api/category-rules`
  - Zero-logging kredensial: password berkas tidak pernah dicatat di log atau disimpan permanen.
- **Verifikasi Komprehensif**: Skrip uji runtime nyata `backend/scripts/verify-m8.1.js` lulus 100% pada 8 skenario wajib dan uji batas keamanan.


---

## [0.2.0] — 2026-09-16

### Added
- **Backend Core**: Setup Node.js Express API dengan Prisma ORM dan MySQL database.
- **Database Schema**: Tabel `users`, `categories`, dan `transactions` dengan indexing optimal.
- **Seeding**: Data kategori bawaan sistem (15 kategori pemasukan & pengeluaran).
- **Modul Autentikasi**: Registrasi, login dengan token JWT stateless, recovery token untuk reset password sederhana.
- **Modul Kategori**: CRUD kategori kustom per pengguna dan proteksi kategori bawaan.
- **Modul Transaksi**: CRUD transaksi dengan validasi nominal, relasi kategori, dan filter komprehensif.
- **Modul Dashboard**: Perhitungan running balance sepanjang masa, ringkasan periode, agregasi kategori, dan tren bulanan.
- **Modul Ekspor**: Generator file Excel (.xlsx) dengan ExcelJS dan dokumen PDF (.pdf) dengan PDFMake.
- **Frontend SPA**: React (Vite) + Tailwind CSS + Lucide Icons + Recharts.
- **Responsive Navigation**: Sidebar untuk desktop dan fixed Bottom Navigation untuk mobile browser.
- **Halaman Lengkap**: Login, Register, Forgot Password, Reset Password, Dashboard dengan Chart interaktif, Riwayat Transaksi + Modal Add/Edit, Kategori Kustom, dan Laporan & Ekspor.

---

## [0.1.0] — 2026-09-16

### Added
- Inisialisasi struktur dokumen vibe coding sesuai framework `docs-ai` (`AGENTS.md`).
- Dokumen perencanaan lengkap di `planning/`.
- Baseline arsitektur decoupled fullstack.