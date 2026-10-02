# CURRENT STATE — FinReport

> **Last Updated:** 2026-10-02
> **Phase:** Phase 4 — Multi-Account & Transfer Complete (M7 Selesai)

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