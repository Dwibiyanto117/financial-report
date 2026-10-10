# CHANGELOG — Personal Finance Web App (FinReport)

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.0.0/).
Versi mengikuti [Semantic Versioning](https://semver.org/lang/id/).

---

## [0.5.0] — 2026-10-10

### Added
- **Frontend UI Import Mutasi Rekening (`/import`)**:
  - Halaman antarmuka `/import` responsif penuh (desktop, tablet, mobile 375px) dengan alur tab ganda: "Impor Baru" dan "Riwayat Impor".
  - Navigasi rute terintegrasi: entri menu `Sidebar.jsx`, tombol akses mobile/desktop di header `Transactions.jsx` dan `Accounts.jsx`.
  - Komponen dropzone berkas drag-and-drop (`ImportDropzone.jsx`) dengan validasi format (.csv/.xlsx), batas ukuran 5 MB, dan aksesibilitas keyboard.
  - Modal unduhan template standar (`TemplateDownloadModal.jsx`) dengan pilihan bank dinamis dari backend, format XLSX/CSV via blob, dan dialog ARIA.
  - Modal password berkas in-memory zero-logging (`FilePasswordModal.jsx`) dengan deteksi terstruktur `errors[].field === "file_password"`.
  - Form pemetaan kolom kustom generik (`GenericMappingForm.jsx`) mendukung kolom nominal tunggal atau debit/kredit terpisah.
  - Bar ringkasan pratinjau (`ImportSummaryBar.jsx`) dengan metrik total baris, transaksi baru, duplikat, tidak valid, dan collapsible panel peringatan.
  - Banner usulan rekening tujuan (`suggested_account`) berdasarkan nomor rekening di berkas mutasi dengan tombol penerapan satu-klik.
  - Tampilan tinjau transaksi desktop (`ImportReviewTable.jsx`) dan kartu mobile (`ImportReviewCards.jsx`) dengan aksi massal, seleksi baris, dropdown kategori sesuai tipe baris, badge asal rekomendasi kategori, badge informasional potensi transfer ("Mungkin Transfer"), dan opsi "Ingat aturan kata kunci" (`learn_rule`).
  - Layar hasil commit (`ImportResultScreen.jsx`) dengan metrik transaksi tersimpan, duplikat, dilewati, aturan tersimpan, dan tautan kembali.
  - Tab riwayat impor (`ImportHistoryList.jsx`) dengan penyaringan rekening, status filter (`ALL`, `COMMITTED`, `CANCELLED`, `PREVIEW`), aksi pembatalan pratinjau, dan rollback batch selesai.
  - Modal konfirmasi rollback atomik (`RollbackConfirmModal.jsx`) dengan rincian transaksi batch dan pemulihan saldo.
- **Dukungan Backend untuk UI (M8.3-1)**:
  - Format terstruktur galat berkas terenkripsi `error.errors = [{ field: "file_password", message: ... }]`.
  - Endpoint baru `GET /api/imports/template/banks` mengembalikan daftar allowlist institusi bank dan dompet digital dari `bankTemplates.js`.
  - Dukungan pembatalan batch `PREVIEW` via `DELETE /api/imports/:id` menjadi status `CANCELLED` tanpa menghapus transaksi.
  - Pembersihan malas (*lazy cleanup*) batch `PREVIEW` usang (> 24 jam) saat permintaan `POST /api/imports/preview`.
  - Dukungan komponen UTC pada kolom Waktu objek Date Excel di `parsers/template.js` serta peringatan per baris jika format waktu tidak valid.
  - Pembersihan nilai input mentah pada pesan galat 400 allowlist bank template.
- **Usulan Rekening Tujuan (4 Digit Akhir)**:
  - Pada pratinjau import mutasi, sistem mencocokkan nomor rekening berkas (`parseResult.meta.accountNumberMasked`) dengan 4 digit akhir rekening aktif pengguna.
  - Jika tepat satu rekening cocok, dikembalikan `suggested_account: { id, name, institution, match: "last4" }`. Jika ambigu atau tidak cocok, diberikan peringatan non-blocking tanpa membatalkan pratinjau.
- **Aturan Belajar Kategori (Learn Rule) & Edit Aturan**:
  - Pratinjau menyertakan kandidat kata kunci per baris (`suggested_keyword`) yang diekstrak lewat helper `deriveKeyword()`.
  - Pilihan opt-in `learn_rule: true` per baris saat commit untuk menyimpan aturan kata kunci ke `category_rules` secara atomik di dalam `$transaction` yang sama (maksimum 500 aturan per pengguna).
  - Endpoint baru `PUT /api/category-rules/:id` untuk mengubah `keyword` dan `category_id` dengan validasi integer positif dan penanganan tabrakan UNIQUE yang bersih (HTTP 400).
- **Penyempurnaan Prioritas Kategorisasi**:
  - Aturan kustom pengguna diurutkan dengan prioritas **keyword terpanjang menang** (longest keyword precedence), disusul aturan kata kunci bawaan sistem yang diperluas, dan fallback kategori bertipe sama.
  - Metrik `suggestion_source` (`"template" | "user_rule" | "builtin" | "fallback"`) untuk transparansi asal rekomendasi kategori.
- **Template Standar FinReport**:
  - Endpoint `GET /api/imports/template` untuk mengunduh template standar XLSX dan CSV untuk institusi yang didukung (`BCA`, `MANDIRI`, `BRI`, `BNI`, `CIMB`, `JAGO`, `DANA`, `OVO`, `GOPAY`, `LAINNYA`).
  - Berkas XLSX dilengkapi sheet `Mutasi` (header dibekukan, dropdown Jenis), sheet `Info` (`FINREPORT-IMPORT-V1`), dan sheet `Petunjuk`.
  - Parser adapter `template` (`parsers/template.js`) dengan deteksi skor 1.0 (info sheet) dan 0.9 (header mutasi standar), parsing tanggal komponen UTC bebas pergeseran timezone, dan pelaporan `summary.invalid`.
- **Suite Pengujian M8.2 & M8.3**:
  - Skrip verifikasi mandiri `backend/scripts/verify-m8.2.js` mencakup 7 skenario pengujian komprehensif termasuk invariansi 4 zona waktu (UTC, WIB, US PDT, Kiritimati) dan regresi saldo hitung baseline user non-uji.
  - Skrip uji terisolasi rate limiter `backend/scripts/verify-rate-limit.js`.
  - Skrip verifikasi fitur backend M8.3-1 `backend/scripts/verify-m8.3-backend.js`.

---

## [0.4.0] — 2026-10-05

### Added
- **M8.1 Hardening & Optimization**:
  - `commit` bulk insert menggunakan `prisma.transaction.createMany({ skipDuplicates: true })` dengan explicit timeout 30 detik untuk menghindari transaksi lambat pada 2000 baris.
  - Perhitungan `duplicate_rows` akurat (duplikasi preview + tabrakan fingerprint saat insert) dan penambahan field respons `skipped_rows`.
  - Utility `parsePositiveInt` di `backend/src/utils/query.js` untuk validasi integer 32-bit positif ketat pada seluruh parameter dan payload ID M8.1 (`account_id`, `:id`, `category_id`), mencegah dump query Prisma ke klien.
  - Skrip generator data sintetis mandiri `backend/scripts/seed-m8-testdata.js` dan suite pengujian verifikasi komprehensif `backend/scripts/verify-m8.1-synthetic.js`.
  - Sanitasi skrip uji dari jalur privat dan nomor rekening asli; mewajibkan env `MANDIRI_SAMPLE_PATH` tanpa default fallback.
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