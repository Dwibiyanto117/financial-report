# Modul Import Mutasi Rekening (MOD-08 / Batch M8.1 - M8.3)

> **Status:** Selesai & Terverifikasi (v0.5.0) — Backend Pipeline & Frontend UI Siap Pakai

---

## 1. Ringkasan Modul
Modul Import Mutasi Rekening memungkinkan pengguna mengunggah berkas mutasi bank/e-wallet dalam format CSV, XLSX standar, dan XLSX terenkripsi password (mis. e-Statement Bank Mandiri) melalui antarmuka pengguna `/import` yang responsif, untuk ditinjau (preview), dikoreksi kategorinya, dipelajari kata kuncinya, dan di-commit menjadi transaksi keuangan secara atomik, serta dapat di-rollback kapan saja.

---

## 2. Alur Kerja (Pipeline)

```
[Upload Berkas + Password]
            │
            ▼
┌───────────────────────┐
│       reader.js       │ ◄─── Dekripsi in-memory (officecrypto-tool) jika OLE/CFB
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│     parsers/index     │ ◄─── Auto-detect adapter (skor keyakinan >= 0.5)
└─────┬───────────┬─────┘
      │           │
      ▼           ▼
  [Mandiri]   [Generic]
      │           │
      └─────┬─────┘
            ▼
┌───────────────────────┐
│     normalize.js      │ ◄─── Angka Indonesia/Internasional, Tanggal & Jam, Anti-Formula Injection
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│    fingerprint.js     │ ◄─── SHA-256 Hash keunikan per rekening (cegah duplikasi)
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│    categorizer.js     │ ◄─── User custom rules -> Built-in keywords -> Fallback "Lainnya"
└───────────┬───────────┘
            │
            ▼
[Status PREVIEW: Simpan di import_batches dengan parsed_payload]
            │
            ▼
[POST /api/imports/:id/commit]
            │
            ▼
[Transaksi DB Atomic: Simpan transactions, update batch COMMITTED, hapus parsed_payload]
            │ (Jika dibatalkan)
            ▼
[DELETE /api/imports/:id -> Rollback: Hapus transactions batch, update CANCELLED]
```

---

## 3. Komponen Utama

| Komponen | Lokasi File | Fungsi |
|----------|-------------|--------|
| **Reader** | `backend/src/services/import/parsers/reader.js` | Membaca buffer CSV, XLSX (ExcelJS), dan dekripsi terenkripsi (officecrypto-tool) dari memori tanpa menulis ke disk |
| **Normalizer** | `backend/src/services/import/normalize.js` | Parsing angka ID (`1.234.567,00`) & EN, tanggal/waktu, sanitasi awalan formula (`= + - @`) |
| **Fingerprint** | `backend/src/services/import/fingerprint.js` | `sha256(accountId|tanggal|jam|nominal|tipe|deskripsi|urutan)` |
| **Parser Mandiri** | `backend/src/services/import/parsers/mandiri.js` | Adapter e-Statement Mandiri (header berbasis konten, transaksi 2 baris, metadata saldo) |
| **Parser Generic** | `backend/src/services/import/parsers/generic.js` | Adapter generik dengan mapping kolom dinamis (`mapping` JSON) |
| **Categorizer** | `backend/src/services/import/categorizer.js` | Mesin rekomendasi kategori (`template` -> `category_rules` user terpanjang -> keyword sistem -> fallback). Menyediakan `deriveKeyword()` dan metrik `suggestion_source` |
| **Import Service** | `backend/src/services/import/import.service.js` | Logika bisnis preview, commit atomic (dengan opt-in rule learning), rollback atomic, riwayat |
| **Category Rule Service** | `backend/src/services/categoryRule.service.js` | CRUD aturan kata kunci per pengguna (termasuk update PUT /api/category-rules/:id) |
| **Upload Middleware** | `backend/src/middlewares/upload.middleware.js` | Multer memoryStorage, batas 5 MB, validasi ekstensi .csv/.xlsx |
| **Rate Limiter** | `backend/src/middlewares/rateLimiter.middleware.js` | Batas bawaan 10 request upload per 10 menit per user/IP (bisa disesuaikan via `IMPORT_RATE_LIMIT_MAX`) |

### Komponen Frontend UI (M8.3)

| Komponen / Modul | Lokasi File | Fungsi |
|------------------|-------------|--------|
| **Halaman Utama Import** | `frontend/src/pages/Import.jsx` | Alur tab ganda ("Impor Baru" dan "Riwayat Impor"), state alur Preview -> Review -> Commit -> Result |
| **Import Service** | `frontend/src/services/importService.js` | Klien HTTP API (preview multipart, commit, rollback, list, download template blob, category rules) |
| **Dropzone Berkas** | `frontend/src/components/import/ImportDropzone.jsx` | Drag-and-drop & file picker dengan validasi klien .csv/.xlsx maks 5 MB |
| **Modal Unduh Template** | `frontend/src/components/import/TemplateDownloadModal.jsx` | Dialog unduhan template bank dinamis (allowlist backend) dalam format XLSX/CSV via blob |
| **Modal Password Berkas** | `frontend/src/components/import/FilePasswordModal.jsx` | Dialog input password in-memory zero-logging untuk berkas terenkripsi |
| **Form Pemetaan Generik** | `frontend/src/components/import/GenericMappingForm.jsx` | Form pemetaan kolom tanggal, keterangan, dan nominal (tunggal atau debit/kredit terpisah) |
| **Bar Ringkasan** | `frontend/src/components/import/ImportSummaryBar.jsx` | Metrik total baris, transaksi baru, duplikat, tidak valid & panel collapsible peringatan |
| **Tabel Review Desktop** | `frontend/src/components/import/ImportReviewTable.jsx` | Tampilan tabel desktop (>= 768px): aksi massal, seleksi baris, dropdown kategori, toggle learn_rule |
| **Kartu Review Mobile** | `frontend/src/components/import/ImportReviewCards.jsx` | Tampilan kartu responsif mobile (< 768px) dengan fungsionalitas review setara |
| **Layar Hasil Commit** | `frontend/src/components/import/ImportResultScreen.jsx` | Layar konfirmasi hasil commit (transaksi tersimpan, duplikat, dilewati, aturan tersimpan) |
| **Daftar Riwayat** | `frontend/src/components/import/ImportHistoryList.jsx` | Tab riwayat batch impor dengan filter rekening dan status, serta pemicu rollback |
| **Modal Konfirmasi Rollback** | `frontend/src/components/import/RollbackConfirmModal.jsx` | Dialog peringatan permanen dan konfirmasi rollback batch COMMITTED |
| **Helper Import** | `frontend/src/utils/importHelpers.js` | Badge usulan kategori (`user_rule`, `template`, `builtin`, `fallback`) dan deteksi informasional transfer |

### Daftar Kata Kunci Bawaan Sistem (Built-in Rules)

Hierarki penentuan kategori per baris transaksi:
1. **Template Explicit Category (`template`)**: Kategori yang diisi secara eksplisit di berkas template FinReport (bila ada dan cocok).
2. **User Custom Rules (`user_rule`)**: Aturan kustom pengguna diurutkan berdasarkan **panjang keyword terpanjang menang**. Jika panjangnya sama, aturan terbaru yang menang.
3. **Built-in Keywords (`builtin`)**: Kata kunci bawaan sistem berikut (dicocokkan terhadap teks ternormalisasi):
   - **Gaji (INCOME)**: GAJI, PAYROLL, SALARY, UPAH, HONOR, HONORARIUM
   - **Bonus & Tunjangan (INCOME)**: BONUS, THR, INSENTIF, TUNJANGAN, REWARD, CASHBACK, KOMISI
   - **Investasi & Dividen (INCOME)**: DIVIDEN, DIVIDEND, BUNGA DEPOSITO, INVESTASI, PROFIT, REKSADANA, OBLIGASI, COUPON, KUAPON, IMBAL HASIL
   - **Pendapatan Usaha (INCOME)**: PENDAPATAN USAHA, OMSET, PENJUALAN, INVOICE, PEMBAYARAN KLIEN, SETORAN USAHA, REVENUE
   - **Pemasukan Lainnya (INCOME)**: TRANSFER MASUK, KIRIMAN DANA, REFUND, PENGEMBALIAN DANA
   - **Makanan & Minuman (EXPENSE)**: MAKANAN, MINUMAN, RESTO, RESTORAN, CAFE, KOPI, WARUNG, WARTEG, KANTIN, BAKSO, MIE AYAM, NASI GORENG, FOOD, KULINER, SNACK, COFFEE, ROTI, BAKERY, BEVERAGE
   - **Transportasi (EXPENSE)**: BENSIN, PERTAMAX, PERTALITE, SOLAR, BBM, SPBU, PARKER, TOL, TARIF TOL, OJEK, TAKSI, KRL, KERETA, TIKET PESAWAT, TIKET KERETA, KAPAL, BUS, LOGISTIK, ONGKIR, PENGIRIMAN, EXPEDISI, SERVIS MOTOR, SERVIS MOBIL, BENGKEL, TAMBAL BAN, CUCI MOBIL, CUCI MOTOR
   - **Tempat Tinggal & Sewa (EXPENSE)**: SEWA KOST, SEWA KONTRAKAN, SEWA RUMAH, SEWA APARTEMEN, IPL, IURAN WARGA, KEBERSIHAN, KEAMANAN, RENOVASI, PERBAIKAN RUMAH
   - **Tagihan & Utilitas (EXPENSE)**: LISTRIK, TOKEN LISTRIK, PLN, AIR, PDAM, PULSA, PAKET DATA, INTERNET, WIFI, TELEPON, TAGIHAN, BPJS, GAS ELPIJI, ASURANSI
   - **Belanja Kebutuhan (EXPENSE)**: SUPERMARKET, MINIMARKET, GROSIR, PASAR, BELANJA, SABUN, SHAMPO, DETERJEN, MINYAK GORENG, BERAS, GALON, GAS, KASUR, PERABOTAN
   - **Hiburan & Rekreasi (EXPENSE)**: BIOSKOP, CINEMA, NONTON, TIKET WISATA, REKREASI, LIBURAN, HOTEL, VILLA, STREAMING, SUBSCRIPTION, GAME, MAINAN, KARAOKE
   - **Kesehatan & Medis (EXPENSE)**: APOTEK, OBAT, VITAMIN, KLINIK, DOKTER, RUMAH SAKIT, LABORATORIUM, TES DARAH, GIGI, KACAMATA, OPTIK, MEDIS, VAKSIN
   - **Pendidikan (EXPENSE)**: SEKOLAH, SPP, KULIAH, SEMESTER, KURSUS, PELATIHAN, WORKSHOP, BUKU, ALAT TULIS, ATK, BIMBEL, LES, SERTIFIKASI
   - **Donasi & Sosial (EXPENSE)**: ZAKAT, INFAQ, INFAK, SEDEKAH, DONASI, SUMBANGAN, BAKSOS, KONDANGAN, AMAL, PERPULUHAN, KORBAN
   - **Pengeluaran Lainnya (EXPENSE)**: BIAYA ADMIN, BIAYA TRANSFER, DENDA, BUNGA PINJAMAN, MATERAI, PAJAK
4. **Fallback (`fallback`)**: Kategori default bertipe sama yang memuat nama "Lainnya".

---

## 4. Endpoint API

| Method | Endpoint | Deskripsi | Autentikasi |
|--------|----------|-----------|:-----------:|
| `POST` | `/api/imports/preview` | Upload berkas & buat preview batch (multipart: `account_id`, `file`, opsional `parser`, `mapping`, `file_password`). Menghasilkan `suggested_account`, `suggested_keyword`, `suggestion_source`, dan `summary.invalid`. Jika berkas butuh password, merespons HTTP 400 dengan `errors: [{ field: "file_password" }]`. Melakukan pembersihan malas batch PREVIEW > 24 jam | Bearer Token |
| `POST` | `/api/imports/:id/commit` | Commit batch preview menjadi transaksi aktual (`rows` override: `[{ index, category_id, include, learn_rule, keyword }]`). Mengembalikan metrik `imported_rows`, `duplicate_rows`, `skipped_rows`, `rules_saved`, dan `rule_warnings` | Bearer Token |
| `DELETE` | `/api/imports/:id` | Batalkan batch PREVIEW (menjadi CANCELLED tanpa transaksi) atau Rollback batch COMMITTED (hapus transaksi dan kembalikan saldo). Tidak menghapus aturan kategori | Bearer Token |
| `GET` | `/api/imports/template/banks` | Daftar allowlist bank dan dompet digital yang didukung untuk template FinReport | Bearer Token |
| `GET` | `/api/imports/template` | Unduh berkas template standar FinReport (`?bank=...&format=xlsx|csv`) | Bearer Token |
| `GET` | `/api/imports` | Daftar riwayat batch pengguna | Bearer Token |
| `GET` | `/api/imports/:id` | Detail batch import | Bearer Token |
| `GET` | `/api/category-rules` | Daftar aturan kata kunci kategori pengguna | Bearer Token |
| `POST` | `/api/category-rules` | Tambah aturan kata kunci kategori (`keyword`, `category_id`) | Bearer Token |
| `PUT` | `/api/category-rules/:id` | Ubah aturan kata kunci kategori (`keyword`, `category_id`) dengan proteksi unik per pengguna | Bearer Token |
| `DELETE` | `/api/category-rules/:id` | Hapus aturan kata kunci | Bearer Token |

> **Metrik Hasil Commit:**
> - `imported_rows`: Jumlah baris yang berhasil tersimpan ke database.
> - `duplicate_rows`: Jumlah baris yang merupakan duplikat (preview duplicate + tabrakan fingerprint saat insert).
> - `skipped_rows`: Jumlah baris non-duplikat yang sengaja tidak disertakan/dibuang oleh pengguna (`include: false`). Dikembalikan pada respons tanpa menambah kolom baru di tabel `import_batches`.


---

## 5. Keamanan & Proteksi Data
- **In-Memory Processing:** Berkas tidak pernah ditulis ke disk server.
- **Zero-Logging Credential:** Password berkas (`file_password`) tidak pernah dicatat di log, database, maupun response.
- **Anti-CSV Injection:** Sel yang diawali `=`, `+`, `-`, atau `@` dinetralkan dengan menambahkan tanda petik tunggal (`'`).
- **Data Isolation:** Seluruh query difilter berdasarkan `userId`, dan `account_id` wajib diverifikasi kepemilikannya.
- **Payload Cleanup:** Kolom `parsed_payload` di `import_batches` dikosongkan segera setelah batch di-commit.

---

## 6. Protokol Penyerahan Sampel (Intake Protocol)

Untuk menjaga kerahasiaan data finansial nyata dan kepatuhan repository publik, setiap pengujian atau pengembangan parser terhadap sampel mutasi rekening bank/dompet digital nyata wajib mengikuti protokol ketat:

1. **Penyimpanan di Luar Repository**:
   - Seluruh berkas sampel nyata (misalnya PDF BCA, e-Statement, ekspor riwayat) **wajib disimpan di luar direktori repositori proyek** (misalnya di folder sementara atau direktori lokal pengguna di luar git tree).
   - Jalur berkas diberikan secara dinamis melalui variabel lingkungan:
     - `BCA_SAMPLE_PATH`
     - `DANA_SAMPLE_PATH`
     - `OVO_SAMPLE_PATH`
     - `GOPAY_SAMPLE_PATH`
   - Kredensial / password pembuka berkas terenkripsi diberikan melalui variabel lingkungan:
     - `BCA_SAMPLE_PASSWORD`
     - `MANDIRI_SAMPLE_PASSWORD`
     - `<NAMA>_SAMPLE_PASSWORD`
   - Dilarang keras menuliskan path absolut, nomor rekening asli, atau password sampel pada kode sumber, log terminal, obrolan chat, maupun pesan commit.
2. **Isolasi Analisis Struktur**:
   - Analisis terhadap berkas sampel hanya mendokumentasikan karakteristik struktur berkas (format lembar, header tabel, posisi kolom debit/kredit, format tanggal/angka, rekonsiliasi saldo).
   - Dilarang mencatat nama pemilik rekening, nomor rekening asli, saldo riil, atau catatan transaksi pribadi ke dalam dokumentasi proyek.
3. **Pengujian Berkelanjutan via Fixture Sintetis**:
   - Seluruh uji otomatis regresi (*automated regression suite*) di CI/CD atau repositori wajib menggunakan **fixture sintetis fiktif** (dihasilkan melalui skrip generator `seed-m8-testdata.js`) yang meniru struktur sampel tanpa menggunakan data nyata.
   - Pengujian terhadap berkas sampel nyata bersifat opsional (*conditional opt-in*) dan otomatis dilewati jika variabel lingkungan path berkas tidak didefinisikan.
