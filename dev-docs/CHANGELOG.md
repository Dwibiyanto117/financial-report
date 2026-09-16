# CHANGELOG — Personal Finance Web App (FinReport)

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.0.0/).
Versi mengikuti [Semantic Versioning](https://semver.org/lang/id/).

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