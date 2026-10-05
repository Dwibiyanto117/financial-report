# CURRENT STATE — FinReport

> **Last Updated:** 2026-10-06
> **Phase:** M8.2 Selesai (Statement Import Enhancements & Standard Template) — v0.5.0

---

## Status Sistem
- [x] Template docs-ai terintegrasi di `ai-rules/` dan terdaftar sebagai skill.
- [x] Kontrak kerja `AGENTS.md` aktif di root.
- [x] Seluruh dokumen `planning/` dan `dev-docs/` tersinkronisasi.
- [x] Backend Express API aktif pada port 5000 (`http://localhost:5000`).
- [x] Frontend React SPA aktif pada port 5173 (`http://localhost:5173`).
- [x] Database MySQL terhubung dan tersinkronisasi via Prisma ORM (`finreport_db`).
- [x] Seluruh fungsionalitas MVP berjalan dan teruji:
  - Autentikasi JWT & Simple Password Reset.
  - CRUD Kategori (Default + Kustom).
  - CRUD Transaksi & Filter.
  - Dashboard Agregat (Saldo Berjalan, Donut Chart, Trend Bar Chart).
  - Ekspor Laporan Excel (.xlsx) & PDF (.pdf).

---

## Batch B1 — Stabilisasi Kontrak & Validasi (2026-10-01)

Perubahan menyentuh lapisan service dan middleware; skema database tidak berubah.

- [x] **Normalisasi parameter query** lewat helper bersama `backend/src/utils/query.js`.
  API menerima `start_date`/`startDate` dan `end_date`/`endDate` sekaligus, sehingga
  kontrak di `planning/api-contract.md` dan pemakaian frontend sama-sama sah.
- [x] **Penolakan tanggal tak valid** dengan HTTP 400 dan pesan manusia, bukan HTTP 500
  berisi dump query Prisma. Hanya format ISO 8601 yang diterima; format ambigu seperti
  `01/09/2026` ditolak karena JavaScript membacanya sebagai 8 Januari, bukan 1 September.
- [x] **`category-breakdown` menghormati `month`/`year`** sesuai kontrak API
  (sebelumnya parameter ini diabaikan tanpa peringatan).
- [x] **Validasi kategori dan tipe transaksi**: kategori INCOME tidak dapat dipakai untuk
  transaksi EXPENSE dan sebaliknya, berlaku pada create maupun update.
- [x] **Middleware error terpusat** mengenali `PrismaClientValidationError` dan
  `PrismaClientKnownRequestError` sebagai kesalahan input (400), dan tidak lagi
  membocorkan detail query ke klien. Detail lengkap tetap dicatat di log server.
- [x] **Parameter `type` tak dikenal ditolak 400**, tidak lagi diabaikan diam-diam.
- [x] **Batas nilai parameter bersifat validasi, bukan pemangkasan** (`backend/src/utils/query.js`).
  Sebelumnya `min`/`max` memangkas nilai ke batas terdekat, sehingga `?month=13`
  diam-diam mengembalikan November–Desember dan `?month=0` mengembalikan Desember–Januari.
  Kini nilai di luar rentang ditolak dengan 400. Berlaku untuk `month`, `year`, `page`,
  `limit`, dan `categoryId`.
- [x] **Ambang password diselaraskan dengan PRD** (minimal 8 karakter) pada registrasi
  dan reset password.

### Verifikasi B1
Pengujian dijalankan terhadap API dan database MySQL nyata:
- Kedua gaya penulisan parameter mengembalikan hasil identik.
- `garbage`, `01/09/2026`, `30-09-2026`, `2026-13-45` menghasilkan 400 dengan pesan jelas.
- `type=BOGUS` dan `categoryId=abc` menghasilkan 400.
- Kategori lintas tipe menghasilkan 400; kategori sesuai tipe menghasilkan 201.
- Ekspor Excel dan PDF tetap menghasilkan berkas valid pada kedua gaya parameter.
- Registrasi password 6 karakter ditolak; 8 karakter diterima.
- Rute tanpa token tetap 401.


---

## Batch M7.1 — Multi-Account Core, Transfer Engine & Agregasi (2026-10-02)

Pondasi backend untuk multi rekening (MOD-07) dan transfer antar rekening selesai diimplementasikan:

- [x] **Skema Prisma**:
  - Model `Account` (`accounts`) dengan relasi ke `User` dan `Transaction`.
  - Enum `AccountType` (`BANK`, `EWALLET`, `CASH`) dan `AccountInstitution`.
  - Enum `TransactionType` diperluas: `INCOME`, `EXPENSE`, `TRANSFER_IN`, `TRANSFER_OUT`.
  - Relasi `Transaction` ke `Account` (`account_id`), `transfer_group_id` UUID, dan `category_id` nullable (untuk transfer).
- [x] **Migrasi Data**:
  - Rekening default "Kas Utama" (CASH) dibuat otomatis untuk pengguna yang ada (`backend/prisma/seed-accounts.js`).
  - Pembuatan user baru di `auth.service.js` otomatis mengikutsertakan pembuatan rekening default.
- [x] **Account CRUD Service & Controller** (`backend/src/services/account.service.js`):
  - `GET /api/accounts`: Menghitung saldo dinamis per rekening (`openingBalance + income - expense + transferIn - transferOut`).
  - `POST /api/accounts`: Tambah rekening baru (Bank, E-Wallet, Cash).
  - `GET /api/accounts/:id`: Detail rekening + saldo kalkulasi.
  - `PUT /api/accounts/:id`: Update rekening.
  - `DELETE /api/accounts/:id`: Proteksi penghapusan jika ada transaksi terkait atau jika merupakan satu-satunya rekening aktif.
- [x] **Transfer Engine** (`backend/src/services/transfer.service.js`):
  - `POST /api/transfers`: Eksekusi atomik transfer 2 sisi (`TRANSFER_OUT` & `TRANSFER_IN`) terhubung UUID `transfer_group_id`.
  - `DELETE /api/transfers/:groupId`: Rollback transfer 2 sisi secara bersamaan.
- [x] **Pencegahan Regresi Agregasi (Critical Guardrail)**:
  - `dashboard.service.js`: Transaksi transfer tidak dihitung ke pemasukan/pengeluaran total. Dukungan parameter filter `accountId`.
  - `transaction.service.js`: Menolak pengubahan tipe langsung pada transfer, filter `accountId`, dan penghapusan otomatis pasangan transfer.
  - `export.service.js`: Tambah kolom Rekening di Excel & PDF, filter `accountId`, dan pelabelan transfer.

### Verifikasi M7.1
- Login & perolehan token JWT.
- Pembuatan rekening Mandiri & BCA dengan saldo awal.
- Transaksi pemasukan, pengeluaran, dan transfer antar rekening.
- Verifikasi saldo dinamis masing-masing rekening 100% akurat.
- Verifikasi dashboard running balance dan laporan arus kas bebas polusi transfer.
- Verifikasi ekspor Excel & PDF 200 OK.

---

## Batch M7.2 — Multi-Account Frontend Integration (2026-10-02)

Antarmuka pengguna (Frontend React) untuk pengelolaan multi rekening dan transfer dana selesai:

- [x] **Service API Client**:
  - `accountService.js`: pemanggilan endpoint `/api/accounts` (get, create, update, delete).
  - `transferService.js`: pemanggilan endpoint `/api/transfers` (execute, get, delete).
- [x] **Halaman Manajemen Rekening (`frontend/src/pages/Accounts.jsx`)**:
  - Kartu rekening informatif dengan visual warna kustom, badge tipe, nomor akun tersamarkan, dan saldo terhitung.
  - Kartu agregat: Total Saldo Tergabung, Total Rekening Aktif, Akumulasi Masuk, dan Akumulasi Keluar.
  - Filter tab: Semua Rekening, Bank, E-Wallet, Kas Tunai, dan Diarsipkan.
  - Aksi: Edit rekening, Arsipkan/Pulihkan rekening, dan Hapus rekening.
- [x] **Komponen Modal**:
  - `AccountModal.jsx`: Tambah dan edit rekening dengan pilihan institusi bank/e-wallet, tipe, saldo awal, dan palet warna.
  - `TransferModal.jsx`: Form transfer dana antar rekening dengan validasi rekening berbeda, peringatan saldo tidak mencukupi, dan opsi biaya admin.
- [x] **Navigasi & Routing**:
  - Penambahan rute `/accounts` di `App.jsx`.
  - Penambahan menu navigasi "Rekening" di Sidebar desktop dan BottomNav mobile.
- [x] **Integrasi Antar Halaman**:
  - **Dashboard (`Dashboard.jsx`)**: Filter dropdown rekening ("Semua Rekening" vs akun spesifik), baris pill saldo cepat per rekening, badge rekening pada transaksi terbaru.
  - **Transaksi (`Transactions.jsx`)**: Filter rekening pada filter bar, kolom Rekening pada tabel dan card mobile, pilihan Rekening wajib pada modal input/edit transaksi, penanda badge untuk transaksi transfer.
  - **Laporan (`Reports.jsx`)**: Filter rekening untuk pratinjau tabel serta unduhan file Excel dan PDF.
- [x] **Verifikasi Bundle**:
  - `npm run build` sukses 100% tanpa error kompilasi/bundle.

---

## Batch M8.1 — Statement Import Pipeline Core (2026-10-05)

Pondasi backend untuk modul Statement Import (MOD-08) selesai diimplementasikan dan terverifikasi penuh:

- [x] **Skema Database & Migrasi**:
  - Enum `ImportStatus` (`PREVIEW`, `COMMITTED`, `CANCELLED`).
  - Model `ImportBatch` (`import_batches`) untuk siklus hidup berkas mutasi dan penampung baris pratinjau (`parsed_payload`).
  - Model `CategoryRule` (`category_rules`) untuk pemetaan kata kunci ke kategori per-pengguna dengan indeks unik `(user_id, keyword)`.
  - Tabel `transactions`: Penambahan foreign key `import_batch_id` (SetNull) dan constraint `import_fingerprint` dengan `UNIQUE(account_id, import_fingerprint)`.
  - Migrasi sukses via `prisma db push` dengan verifikasi nol data loss.
- [x] **Utilitas Inti (`backend/src/services/import/`)**:
  - `normalize.js`: Konversi format angka Indonesia (`1.234.567,00`) dan Internasional, parsing tanggal/jam fleksibel (termasuk nama bulan ID/EN), dan fungsi `sanitizeCell()` untuk menetralkan awalan formula berbahaya (`= + - @`).
  - `fingerprint.js`: Hash unik `sha256(accountId|tanggal|jam|nominal|tipe|deskripsi|urutan)` untuk proteksi duplikasi data mutasi.
- [x] **Reader & Parsers (`backend/src/services/import/parsers/`)**:
  - `reader.js`: Pembacaan buffer in-memory untuk CSV, XLSX (ExcelJS), dan berkas terenkripsi menggunakan `officecrypto-tool` tanpa menulis ke disk.
  - `mandiri.js`: Adapter parser e-Statement Mandiri dengan pelacakan header berbasis teks dinamis, penggabungan baris tanggal + jam (format 2-baris per transaksi), pembacaan ringkasan metadata saldo, dan kalkulasi rekonsiliasi non-blocking.
  - `generic.js`: Adapter parser generik dengan pemetaan kolom dinamis (`mapping` nama kolom atau indeks).
  - `index.js`: Registry parser dengan auto-detection skor keyakinan (confidence >= 0.5) dan penolakan 400 jika tidak dikenali.
- [x] **Engine & Auto-Categorization**:
  - `categorizer.js`: Mesin penentu kategori dengan prioritas aturan kustom pengguna (`category_rules`), aturan kata kunci bawaan (Grab, Indomaret, PLN, Gaji, dll.), dan fallback kategori "Lainnya" sesuai tipe transaksi.
  - `import.service.js`:
    - `preview`: Validasi berkas, ekstraksi baris, kalkulasi fingerprint, penandaan duplikat, dan penyimpanan batch PREVIEW.
    - `commit`: Penyimpanan transaksi atomik dalam satu transaksi database, resolusi race condition fingerprint (P2002), dan pembersihan `parsed_payload`.
    - `rollback`: Pembatalan batch COMMITTED menjadi CANCELLED dan penghapusan transaksi terkait secara atomik.
    - `listBatches` & `getBatch`: Riwayat dan detail batch pengguna.
  - `categoryRule.service.js`: CRUD aturan kata kunci per pengguna.
- [x] **Endpoint REST API & Keamanan Upload**:
  - Rute `/api/imports/preview` dengan Multer memoryStorage, batas 5 MB, batas 2000 baris, dan proteksi rate limiter (10 upload per 10 menit per user/IP).
  - Rute `/api/imports/:id/commit`, `/api/imports/:id` (rollback), `/api/imports` (riwayat).
  - Rute `/api/category-rules` (GET, POST, DELETE).
  - Isolasi data pengguna: seluruh query difilter `userId` dan kepemilikan rekening divalidasi.
  - Zero-logging kredensial: password berkas tidak pernah dicatat pada log atau disimpan permanen.
- [x] **M8.1 Hardening & Extended Synthetic Verification**:
  - `commit` batch menggunakan `createMany` + `skipDuplicates: true` dengan timeout eksplisit 30 detik pada `$transaction` (pengujian 2000 baris tereksekusi dalam ~230 ms).
  - Pemotongan otomatis `description` ke 255 karakter sebelum insert.
  - Perhitungan `duplicate_rows` akurat dan pengembalian baris non-duplikat yang tidak dipilih user sebagai `skipped_rows`.
  - Validasi ketat integer positif 32-bit (`parsePositiveInt`) pada semua parameter M8 (`account_id`, `id`, `category_id`), menolak string non-numerik dan angka float dengan HTTP 400 bersih tanpa dump query Prisma.
  - Sanitasi menyeluruh terhadap skrip pengujian dari jalur file lokal absolut dan digit rekening nyata.
  - Dokumentasi teknis terpusat di `dev-docs/ai/TECHNICAL_DEBT.md` (TD-004 s/d TD-007).
  - Generator berkas uji sintetis mandiri (`backend/scripts/seed-m8-testdata.js`) dan test suite extended (`backend/scripts/verify-m8.1-synthetic.js`) lulus 11 skenario 100%.

---

## Batch M8.2 — Statement Import Enhancements & Standard Template (2026-10-06)

Penyempurnaan fungsionalitas cerdas dan penyediaan template standar seragam pada backend modul Statement Import (MOD-08) selesai diimplementasikan dan terverifikasi penuh:

- [x] **Strict Default Rate Limit & Hardening (Batch M8.2-0)**:
  - Nilai bawaan upload rate limiter diatur ketat ke 10 request per 10 menit di seluruh lingkungan melalui fungsi pembaca aman `parseRateLimitMax()`. Pelonggaran hanya dimungkinkan via env eksplisit `IMPORT_RATE_LIMIT_MAX`.
  - Placeholder `IMPORT_RATE_LIMIT_MAX=10` ditambahkan pada `backend/.env.example`.
  - Komentar yang memuat digit spesifik pada `parsers/mandiri.js` dinetralkan.
  - Dokumentasi TD-007 pada `commit-logs/2026-10-05.md` dan digit sampel pada `M8-implementation-plan.md` diselaraskan.
- [x] **Usulan Rekening Tujuan dari 4 Digit Akhir (Batch M8.2-1)**:
  - Pada `import.service.js` `preview()`, sistem membaca metadata `parseResult.meta.accountNumberMasked` (dari nama file berkas Mandiri atau sheet Info template) dan mencocokkan 4 digit terakhir ke rekening aktif pengguna (`userId`).
  - Mengembalikan `suggested_account: { id, name, institution, match: "last4" }` jika tepat 1 rekening cocok. Jika 0 atau >= 2 rekening cocok, mengembalikan `null`.
  - Menghasilkan peringatan non-blocking pada `warnings[]` bila nomor rekening berkas tidak cocok dengan rekening yang dipilih pengguna, tanpa membatalkan proses import.
- [x] **Aturan Belajar Kategori (Learn Rule) & Endpoint Edit Aturan (Batch M8.2-2)**:
  - Helper `deriveKeyword()` pada `categorizer.js` mengekstrak kandidat kata kunci (`suggested_keyword`) dari deskripsi dengan membuang angka, tanggal, waktu, dan nomor referensi panjang.
  - Parameter opt-in `learn_rule: true` per baris saat `commit` menyimpan aturan kategori ke tabel `category_rules` secara atomik di dalam `$transaction` yang sama (maksimum 500 aturan per pengguna).
  - Kata kunci yang sudah ada diperbarui kategorinya (upsert semantics).
  - Endpoint baru `PUT /api/category-rules/:id` memungkinkan pembaruan `keyword` dan `category_id` dengan validasi integer positif, pengecekan hak milik, dan penanganan konflik `UNIQUE(userId, keyword)` dengan HTTP 400 bersih.
- [x] **Penyempurnaan Prioritas Kategorisasi (Batch M8.2-3)**:
  - Prioritas penentuan kategori pada `suggestCategory()`:
    1. Kategori eksplisit dari template (`suggestion_source: "template"`).
    2. Aturan kustom pengguna dengan urutan **keyword terpanjang menang** (longest keyword precedence; seri: id terbaru menang) (`suggestion_source: "user_rule"`).
    3. Aturan kata kunci bawaan sistem yang diperluas (`suggestion_source: "builtin"`).
    4. Kategori fallback "Lainnya" sesuai tipe (`suggestion_source: "fallback"`).
- [x] **Template Standar FinReport & Adapter Parser Template (Batch M8.2-4)**:
  - Allowlist institusi bank dan dompet digital yang didukung pada `bankTemplates.js`: `BCA`, `MANDIRI`, `BRI`, `BNI`, `CIMB`, `JAGO`, `DANA`, `OVO`, `GOPAY`, `LAINNYA`.
  - In-memory generator pada `templateGenerator.js` untuk format XLSX (sheet `Mutasi` dengan freeze header & dropdown validation, sheet `Info`, sheet `Petunjuk`) dan CSV.
  - Endpoint `GET /api/imports/template` dengan validasi parameter `bank` dan `format` (`xlsx` / `csv`).
  - Parser adapter `template` (`parsers/template.js`) dengan deteksi skor 1.0 (sheet Info `FINREPORT-IMPORT-V1`) dan 0.9 (header mutasi standar), ekstraksi tanggal Date object berbasis komponen UTC untuk mencegah pergeseran zona waktu (WIB vs UTC), sanitasi formula, dan penghitungan baris rusak pada `summary.invalid`.
- [x] **Suite Pengujian Sintetis & Regresi (Batch M8.2-5)**:
  - Skrip pengujian mandiri `backend/scripts/verify-m8.2.js` lulus 100% pada 7 skenario pengujian komprehensif (usulan rekening, belajar aturan, endpoint PUT, longest-keyword precedence, download template, roundtrip XLSX, invariansi zona waktu UTC vs Asia/Jakarta, batas 2000 baris, dan regresi baseline pengguna lama `budi@example.com`).


