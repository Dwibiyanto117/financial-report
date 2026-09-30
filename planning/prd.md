# Product Requirements Document — Personal Finance Web App (FinReport)

> **Status:** APPROVED — Baseline for MVP
> **Purpose:** Single source of truth untuk visi produk, user stories, dan spesifikasi fungsional.

---

## 1. Product Vision

### Elevator Pitch
FinReport adalah platform pencatatan keuangan personal berbasis web responsif yang memberikan kemudahan pencatatan transaksi harian, analisis tren dan pola pengeluaran secara visual, serta ekspor laporan instan lintas perangkat secara aman di cloud.

### Problem Statement
Pengguna membutuhkan solusi pencatatan keuangan yang fleksibel dan cepat saat mobile, namun memiliki visibilitas mendalam saat dianalisis di PC, dengan jaminan keamanan data finansial pribadi.

### Target Users
| Role | Deskripsi | Kebutuhan Utama |
|------|-----------|----------------|
| Personal User | Individu / Profesional yang ingin memantau dan mendisiplinkan arus kas pribadinya | Pencatatan cepat, dashboard ringkas, filter data periodik, dan laporan cetak |

---

## 2. User Stories / Use Cases

### Epic 1: Autentikasi & Akun Pengguna
| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-001 | Sebagai pengguna baru, saya ingin mendaftarkan akun dengan email dan password agar dapat memiliki ruang penyimpanan data keuangan pribadi saya sendiri. | P0 | Validasi format email unik, password minimal 8 karakter dengan hashing bcrypt. |
| US-002 | Sebagai pengguna terdaftar, saya ingin login menggunakan email dan password agar dapat mengakses data keuangan saya. | P0 | Otentikasi sukses mengembalikan JWT token; proteksi brute-force dasar. |
| US-003 | Sebagai pengguna yang lupa password, saya ingin mengatur ulang password dengan metode verifikasi pemulihan sederhana agar tetap dapat mengakses akun saya. | P0 | Verifikasi email + kode PIN pemulihan (Recovery Token) untuk mengubah password baru. |
| US-004 | Sebagai pengguna aktif, saya ingin logout agar sesi saya di perangkat tersebut ditutup dengan aman. | P0 | Token sesi dinonaktifkan di sisi client dan status ter-reset. |

### Epic 2: Manajemen Kategori
| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-005 | Sebagai pengguna baru, saya ingin langsung memiliki daftar kategori umum (default) agar tidak perlu membuat dari nol. | P0 | Sistem otomatis menyediakan kategori bawaan (Gaji, Makanan, Transport, Belanja, dll). |
| US-006 | Sebagai pengguna, saya ingin membuat kategori kustom sendiri (nama, tipe, warna/ikon) agar sesuai dengan kebutuhan gaya hidup saya. | P0 | Kategori tersimpan dengan relasi `user_id` dan tipe transaksi (pemasukan/pengeluaran). |
| US-007 | Sebagai pengguna, saya ingin mengedit atau menghapus kategori kustom saya agar kategori tetap terorganisir. | P1 | Kategori bawaan sistem tidak bisa dihapus; kategori kustom dapat diedit/dihapus aman. |

### Epic 3: Transaksi Pemasukan & Pengeluaran
| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-008 | Sebagai pengguna, saya ingin mencatat transaksi pemasukan atau pengeluaran baru dengan nominal, tanggal, kategori, dan catatan agar riwayat pengeluaran tercatat rapi. | P0 | Validasi nominal positif, format mata uang Rupiah, input tanggal fleksibel. |
| US-009 | Sebagai pengguna, saya ingin melihat daftar riwayat transaksi saya lengkap dengan pagination/infinite scroll dan filter. | P0 | Daftar menampilkan tanggal, kategori, catatan, dan nominal (format hijau/merah). |
| US-010 | Sebagai pengguna, saya ingin mengubah atau menghapus transaksi yang salah catat agar saldo akurat. | P0 | Update dan delete transaksi langsung memperbarui saldo agregat secara real-time. |

### Epic 4: Dashboard Analitik & Filter
| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-011 | Sebagai pengguna, saya ingin melihat ringkasan metrik (Total Pemasukan, Total Pengeluaran, Selisih Bersih, dan Saldo Berjalan) pada dashboard agar langsung tahu kondisi kas saya. | P0 | Perhitungan saldo berjalan akurat berdasarkan seluruh transaksi historis atau filter waktu. |
| US-012 | Sebagai pengguna, saya ingin melihat grafik komposisi pengeluaran per kategori agar paham pos pengeluaran terbesar saya. | P0 | Grafik donat/pie interaktif dengan tooltip persentase dan nominal. |
| US-013 | Sebagai pengguna, saya ingin melihat grafik tren perbandingan bulanan agar dapat membandingkan arus kas antar bulan. | P0 | Grafik batang/garis tren pemasukan vs pengeluaran bulanan. |
| US-014 | Sebagai pengguna, saya ingin memfilter tampilan transaksi dan dashboard berdasarkan rentang tanggal atau kategori tertentu. | P0 | Filter instan: Bulan ini, Bulan lalu, Tahun ini, atau Rentang Tanggal Kustom. |

### Epic 5: Ekspor Laporan
| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-015 | Sebagai pengguna, saya ingin mengekspor data transaksi terpilih ke format Excel (.xlsx) agar bisa saya olah lebih lanjut di spreadsheet. | P0 | File Excel terunduh dengan kolom tanggal, tipe, kategori, nominal, dan catatan. |
| US-016 | Sebagai pengguna, saya ingin mengunduh laporan ringkasan berkala dalam bentuk dokumen PDF (.pdf) agar rapi untuk diarsipkan atau dicetak. | P0 | Dokumen PDF terformat rapi dengan kop laporan, tabel ringkasan agregat, dan daftar transaksi. |

---

## 3. Feature Matrix

### MVP (Minimum Viable Product)
- Autentikasi JWT (Register, Login, Simple Reset Password, Logout)
- Kategori Transaksi (Sistem Default + Kustom Pengguna)
- CRUD Transaksi Finansial
- Dashboard Ringkasan Finansial (Cards, Donut Chart, Trend Bar Chart)
- Filter Rentang Tanggal & Kategori
- Ekspor Laporan ke Excel (.xlsx) dan PDF (.pdf)
- Desain Responsif Desktop & Mobile Browser
- Abstraksi Arsitektur Mata Uang (Format IDR bawaan)

### Post-MVP / Roadmap Masa Depan
- Multi-currency live exchange rate conversion
- Pencatatan target tabungan (*budgeting & goals*)
- Upload foto struk / bukti transaksi
- Notifikasi pengingat pencatatan harian
- Integrasi bank API / Open Finance (Read-only)

---

## 4. Non-Functional Requirements
- **Keamanan**: Hash password dengan bcrypt (salt rounds >= 10), token JWT dengan waktu kedaluwarsa, sanitasi input untuk mencegah SQL injection dan XSS.
- **Isolasi Data**: Enforce `WHERE user_id = :current_user` di semua query query data transaksi dan kategori.
- **Responsif**: Kompatibel dengan layar smartphone (>= 320px) hingga layar monitor desktop (>= 1920px).

---

## 5. Post-MVP Feature: Bank Statement Import (PROPOSED)
Integrasi bank tahap 1: multi rekening (US-017 s/d US-019) dan import mutasi CSV/XLSX (US-020 s/d US-025). PDF ditunda. Spesifikasi: `planning/bank-import.md`.
