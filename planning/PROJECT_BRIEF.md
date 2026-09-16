# PROJECT BRIEF — Personal Finance Web App (FinReport)

> **Status:** ACTIVE — Approved Baseline
> **Project Type:** Decoupled Fullstack (Dual Repository)
> **Git Locations:** `backend/` dan `frontend/`

---

## 1. Vision

### Elevator Pitch
Aplikasi pencatatan keuangan personal berbasis web responsif yang memberikan kemudahan bagi setiap individu untuk mencatat pemasukan dan pengeluaran, memantau saldo berjalan, menganalisis pola keuangan melalui visualisasi dashboard, dan mengekspor laporan keuangan secara instan lintas perangkat (desktop & mobile browser) secara aman di cloud.

### Problem Statement
- Pencatatan keuangan manual di catatan fisik atau spreadsheet seringkali tidak praktis saat berpindah perangkat (PC ke mobile).
- Kurangnya visualisasi terstruktur atas pola pengeluaran bulanan dan komposisi kategori membuat individu sulit mengevaluasi kondisi finansialnya.
- Data keuangan pribadi bersifat sensitif sehingga membutuhkan isolasi data per akun dengan mekanisme autentikasi dan enkripsi data yang aman.
- Pengguna membutuhkan laporan terformat siap cetak atau olah (PDF & Excel) untuk rekapitulasi periodik.

### Target Users
| Role | Deskripsi | Kebutuhan Utama |
|------|-----------|----------------|
| Personal User | Individu / profesional yang ingin mengelola keuangan pribadi | Mencatat transaksi harian cepat via smartphone, melihat grafik tren di laptop/PC, dan mengekspor rekap bulanan |

---

## 2. Project Type & Tech Stack

| Item | Pilihan | Rationale |
|------|---------|-----------|
| Project Type | Decoupled Fullstack | Memisahkan REST API backend dan SPA frontend untuk skalabilitas dan kemudahan deployment |
| Git Location | `backend/` dan `frontend/` | Sesuai aturan AGENTS.md, root bukan git repo |
| Backend | Node.js (Express + Prisma ORM) | Sintaks deklaratif Prisma sangat mudah dibaca oleh non-technical person, performa tinggi, dan ekosistem stabil |
| Frontend | React (Vite) + Tailwind CSS | Antarmuka cepat, modern, responsive di mobile & desktop, tanpa CSS custom yang rumit |
| Database | MySQL | Engine relational handal dengan integritas ACID untuk data transaksi finansial |
| UI Framework | Tailwind CSS + Lucide Icons | Framework UI standar established, responsive utility-first, clean design |
| Auth & Security | JWT (JSON Web Token) + bcryptjs | Stateless auth untuk API, enkripsi password aman, proteksi OWASP (Helmet, CORS, Rate-limiting) |
| Export Engine | ExcelJS (.xlsx) + PDFKit / PDFMake (.pdf) | Ekspor data laporan keuangan terformat rapi |
| Currency Support | Rupiah (IDR) default dengan arsitektur extensible | Memudahkan penambahan fitur multi-currency di kemudian hari |

---

## 2b. UI/UX Template & Design System

| Item | Value |
|------|-------|
| HTML Template Disediakan? | TIDAK |
| Framework UI | Tailwind CSS |
| Desain Karakter | Clean, modern, accessible, dashboard responsive (mobile-first navigation) |
| Konsistensi Visual | Palet warna emerald/indigo/slate untuk tema finansial, indikator pemasukan (hijau) & pengeluaran (merah) |
| Aturan Khusus | Bebas decorative emojis di kode dan teks antarmuka |

---

## 3. Core Features (MVP)

1. **Modul Autentikasi & Profil**:
   - Registrasi akun baru (nama, email, password terenkripsi).
   - Login & logout berbasis JWT token.
   - Reset password dengan metode verifikasi pemulihan sederhana (recovery token/PIN).
2. **Modul Kategori Transaksi**:
   - Kategori sistem bawaan (*default presets*): Gaji, Investasi, Makanan & Minuman, Transportasi, Belanja, Tagihan, Hiburan, dll.
   - Kategori buatan user (*custom user categories*): User bebas menambah, mengubah, dan menghapus kategori miliknya.
   - Tipe kategori terbagi jelas: Pemasukan (*income*) dan Pengeluaran (*expense*).
3. **Modul Transaksi (CRUD)**:
   - Pencatatan transaksi baru (nominal, tipe, kategori, tanggal, catatan/deskripsi).
   - Edit, hapus, dan riwayat transaksi.
   - Format angka mata uang standar Rupiah (Rp) dengan pemisah ribuan.
4. **Modul Dashboard & Agregasi**:
   - Kartu metrik: Total Pemasukan, Total Pengeluaran, Selisih Bersih (*Net*), dan Saldo Berjalan (*Running Balance*).
   - Grafik komposisi pengeluaran/pemasukan per kategori (Donut / Pie Chart).
   - Grafik tren keuangan bulanan (Bar / Line Chart).
   - Tabel transaksi terbaru.
5. **Modul Filter & Pencarian**:
   - Filter berdasarkan rentang tanggal (Hari Ini, Minggu Ini, Bulan Ini, Kustom).
   - Filter berdasarkan kategori transaksi dan tipe (Pemasukan/Pengeluaran).
6. **Modul Ekspor Laporan**:
   - Ekspor data transaksi terpilih ke format Excel (.xlsx).
   - Ekspor rekapitulasi laporan keuangan ke format PDF (.pdf) dengan header resmi dan ringkasan agregat.

---

## 4. Non-Functional Requirements & Security
- **Data Privacy**: Setiap data transaksi dan kategori terisolasi ketat per `user_id`. Pengguna tidak dapat melihat atau memanipulasi data pengguna lain.
- **Responsiveness**: Pengalaman penggunaan mulus pada browser mobile (smartphone) dan desktop/laptop.
- **Performance**: Waktu muat halaman cepat (< 2 detik) dan responsivitas API cepat (< 200 ms).
