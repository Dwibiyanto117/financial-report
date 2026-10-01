# CURRENT STATE — FinReport

> **Last Updated:** 2026-10-01
> **Phase:** Phase 3 — Stabilisasi Kontrak API (Batch B1 selesai)

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

### Risiko yang belum tertutup
- Belum ada rangkaian pengujian otomatis; verifikasi masih manual per batch.
- Belum ada pembatasan laju (rate limiting) pada endpoint autentikasi dan unggahan.
- Token pemulihan password masih dikembalikan di respons API (lihat `TECHNICAL_DEBT.md` TD-001).