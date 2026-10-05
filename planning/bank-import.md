# Multi-Account & Statement Import — Post-MVP Feature Spec (FinReport)

> **Status:** PROPOSED — menunggu review user sebelum implementasi
> **Modul:** MOD-07: Account (multi rekening) dan MOD-08: Statement Import
> **Pendekatan:** Import mutasi (CSV/XLSX) per rekening. Tanpa kredensial bank, tanpa API pihak ketiga.
> **Keputusan user:** prioritas BCA, Mandiri, serta Dana, OVO, GoPay. PDF ditunda ke fase berikutnya (tetap terbuka jika ada cara parsing yang andal). Sistem multi rekening: 1 rekening = 1 institusi, satu institusi dapat memiliki banyak rekening.
> **Fase berikutnya:** adapter Open Finance API dan parser PDF memakai pipeline yang sama.

---

## 1. Tujuan
1. User memiliki beberapa rekening (bank dan dompet digital) dengan saldo masing-masing.
2. User mengunggah mutasi ke rekening tertentu, memeriksa preview, lalu mengimpor tanpa duplikasi.
3. Dashboard tetap menampilkan saldo total dan bisa difilter per rekening.

## 2. User Stories
| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-017 | Sebagai pengguna, saya ingin membuat beberapa rekening (BCA, Mandiri, Dana, OVO, GoPay, dst.) agar tiap sumber dana tercatat terpisah. | P0 | Rekening punya nama, institusi, tipe (BANK/EWALLET/CASH), saldo awal, warna. Satu institusi boleh punya banyak rekening. |
| US-018 | Sebagai pengguna, saya ingin setiap transaksi terhubung ke satu rekening agar saldo per rekening akurat. | P0 | Form transaksi wajib memilih rekening. Transaksi lama (pra-fitur) dimigrasikan ke rekening bawaan "Umum". |
| US-019 | Sebagai pengguna, saya ingin mencatat transfer antar rekening tanpa dianggap pemasukan/pengeluaran. | P0 | Transfer membuat dua sisi (keluar dan masuk) yang terhubung; tidak masuk total pemasukan/pengeluaran dan grafik kategori; saldo kedua rekening berubah. |
| US-020 | Sebagai pengguna, saya ingin mengunggah file mutasi CSV/XLSX ke rekening tertentu. | P0 | Format terdeteksi otomatis atau dipilih manual. Batas 5 MB / 2000 baris. |
| US-021 | Sebagai pengguna, saya ingin preview hasil parsing sebelum disimpan. | P0 | Preview: tanggal, deskripsi, tipe, nominal, kategori usulan, status duplikat; baris bisa dicentang/dibuang dan kategori diubah. |
| US-022 | Sebagai pengguna, saya ingin file yang tumpang tindih tidak menghasilkan transaksi ganda. | P0 | Baris dengan fingerprint sama ditandai duplikat dan tidak dicentang default. |
| US-023 | Sebagai pengguna, saya ingin kategori ditebak otomatis dan belajar dari koreksi saya. | P1 | Rule keyword bawaan + rule kustom per user. |
| US-024 | Sebagai pengguna, saya ingin melihat riwayat impor dan membatalkan satu batch. | P1 | Pembatalan hanya menghapus transaksi milik batch tersebut. |
| US-025 | Sebagai pengguna, saya ingin transfer antar rekening pada file impor terdeteksi (mis. "TRSF ke DANA") dan diusulkan sebagai transfer. | P2 | Hanya usulan; user mengonfirmasi di preview. |

## 3. Multi Rekening

### 3.1 Konsep
- `accounts`: sumber dana. Tipe `BANK`, `EWALLET`, `CASH`.
- Saldo rekening = `opening_balance` + INCOME - EXPENSE + TRANSFER_IN - TRANSFER_OUT. Dihitung dari transaksi (tanpa kolom saldo tersimpan) agar tidak bisa tidak sinkron.
- Running balance dashboard = jumlah saldo semua rekening aktif. Parameter `account_id` opsional pada endpoint dashboard, transaksi, dan ekspor.
- Rekening dapat diarsipkan (`is_archived`); tidak dapat dihapus jika masih punya transaksi.

### 3.2 Transfer
Transfer disimpan sebagai dua baris `transactions` bertipe `TRANSFER_OUT` dan `TRANSFER_IN`, terhubung lewat `transfer_group_id` (UUID), kategori null. Agregasi income/expense/kategori hanya memakai INCOME dan EXPENSE sehingga transfer tidak mengotori laporan. Biaya admin transfer dicatat sebagai transaksi EXPENSE terpisah.

### 3.3 Dampak pada fitur MVP
- Enum `TransactionType` bertambah `TRANSFER_IN`, `TRANSFER_OUT`; `category_id` menjadi nullable (hanya untuk transfer).
- Semua query agregat di `dashboard.service.js`, `export.service.js`, dan `transaction.service.js` harus memfilter tipe transfer secara eksplisit. Ini titik regresi utama dan wajib diuji.
- Migrasi: buat rekening "Umum" per user existing dan isi `account_id` semua transaksi lama.
- Ekspor Excel/PDF: tambah kolom Rekening.

## 4. Alur Import
1. `POST /api/imports/preview` (multipart: `account_id`, `file`, opsional `parser`/`mapping`) -> parse, deteksi format, hitung fingerprint, tandai duplikat, usulkan kategori. Batch berstatus `PREVIEW`, belum menulis transaksi.
2. User mengoreksi di UI.
3. `POST /api/imports/:id/commit` -> transaksi dibuat atomic dalam satu transaksi DB, batch `COMMITTED`.
4. `DELETE /api/imports/:id` -> rollback batch beserta transaksinya.

## 5. Parser Adapter
Setiap format = 1 file di `backend/src/services/import/parsers/` dengan kontrak `detect(headers) -> bool` dan `parse(rows) -> [{date, description, type, amount, balance?}]`.

| Adapter | Status | Catatan |
|---------|--------|---------|
| `generic` | Dijamin | Kolom dipetakan user: tanggal, deskripsi, debit/kredit atau nominal+tipe |
| `bca` | Perlu sampel | Perkiraan kolom: Tanggal, Keterangan, Cabang, Jumlah (CR/DB), Saldo |
| `mandiri` | Struktur dari sampel (screenshot); belum diuji dengan file asli | Lihat bagian 5.1 |
| `dana`, `ovo`, `gopay` | Belum terverifikasi | Ketersediaan ekspor riwayat dari aplikasi belum dipastikan (bisa berupa laporan via e-mail, atau tidak ada ekspor sama sekali). Sampai ada file nyata dipakai jalur `generic` (mis. hasil salin ke spreadsheet). |

### 5.1 Struktur e-Statement Mandiri (dari sampel Agu 2026)
- Nama file `e-Statement_XXXXXXXXX<4 digit akhir>_<periode>`. 4 digit terakhir dipakai untuk mengusulkan rekening tujuan.
- Baris atas berupa blok metadata (nama, cabang, periode, tanggal cetak, jenis tabungan, nomor rekening, mata uang) dengan sel gabungan dan kolom tidak berurutan. Parser tidak boleh mengandalkan posisi tetap: cari baris header berisi "Tanggal", "Keterangan", "Dana Masuk", "Dana Keluar", "Saldo". Baris di bawahnya berisi terjemahan Inggris dan dilewati.
- Ringkasan Saldo Awal, Dana Masuk, Dana Keluar, Saldo Akhir dipakai untuk rekonsiliasi: Saldo Awal + Dana Masuk - Dana Keluar = Saldo Akhir dan harus sama dengan hasil parsing (sampel: 3.823.391 + 10.250.000 - 12.620.969 = 1.452.422). Selisih menghasilkan peringatan jelas di preview.
- Baris data: No, Tanggal + jam dalam satu sel (`01 Agu 2026 17:10:32 WIB`; nama bulan Indonesia dan Inggris didukung), Keterangan (bisa multi baris), Dana Masuk, Dana Keluar, Saldo. Tipe ditentukan dari kolom yang terisi. Angka berformat `1.234.567,00`.
- Jam transaksi masuk ke fingerprint sehingga transaksi kembar dalam sehari tidak dianggap duplikat.

> Perkiraan kolom lain di atas BUKAN spesifikasi. Setiap adapter wajib divalidasi terhadap contoh file asli (dianonimkan) sebelum dinyatakan selesai; format bank bisa berubah antar versi internet banking.

## 5.2 Jalur Template FinReport (Standard Template)
Untuk menjembatani institusi perbankan dan dompet digital yang belum memiliki parser spesifik (termasuk BCA dan e-wallet yang ekspor mutasinya belum memiliki format baku), FinReport menyediakan format berkas standar seragam (XLSX dan CSV):
- **Alasan & Pendekatan**:
  1. Memberikan format input yang konsisten, bersih, dan mudah diisi oleh pengguna (cukup salin data mutasi dari e-statement/m-banking ke kolom template).
  2. Format kolom seragam untuk semua bank/institusi: `Tanggal | Waktu | Keterangan | Jenis | Nominal | Saldo | Kategori`.
  3. Header pada berkas XLSX dibekukan (freeze panes), diberi styling rapi, dan dilengkapi validasi data dropdown pada kolom `Jenis` (`MASUK`, `KELUAR`).
  4. Disertai sheet `Info` yang memuat metadata template (`FINREPORT-IMPORT-V1`, kode bank, dan 4 digit akhir rekening opsional) serta sheet `Petunjuk` dengan instruksi pemakaian dan contoh data fiktif.
  5. Pengguna dapat mengisi nama kategori secara eksplisit pada kolom `Kategori`; bila cocok dengan kategori sistem/user bertipe sama, maka usulan kategori ini memiliki prioritas tertinggi (`suggestion_source: "template"`).
  6. **Status BCA & E-Wallet**: Parser khusus BCA dan e-wallet (PDF/format asli aplikasi) ditunda hingga sampel berkas asli yang valid tersedia. Pengguna BCA, BRI, BNI, CIMB, Jago, Dana, OVO, GoPay, dan institusi lainnya diarahkan menggunakan jalur Template FinReport ini.

## 6. Aturan Bisnis Import
- **Fingerprint:** `sha256(account_id | tanggal | nominal | tipe | deskripsi_ternormalisasi | urutan_kemunculan_dalam_hari)`, unique per rekening. Urutan kemunculan mencegah dua transaksi identik yang sah di hari yang sama dianggap duplikat.
- Nominal format Indonesia ("1.250.000,00") dan internasional dinormalisasi ke Decimal.
- Kategori fallback: "Lainnya" sesuai tipe.
- Keamanan: validasi ekstensi dan MIME, batas ukuran/baris, file diproses di memori dan tidak disimpan, semua query difilter `user_id`, `account_id` divalidasi milik user, rate limit pada endpoint upload, sel yang diawali `= + - @` dinetralkan.
- Bila file memuat kolom saldo, tampilkan rekonsiliasi (saldo akhir file vs saldo hasil hitung) sebagai peringatan, bukan pemblokir.

## 7. Skema Database (tambahan)
**`accounts`**: id, user_id FK, name VARCHAR(100), institution VARCHAR(50) (BCA, MANDIRI, DANA, OVO, GOPAY, LAINNYA), type ENUM(BANK, EWALLET, CASH), account_no_masked VARCHAR(30) NULL (opsional, hanya 4 digit terakhir), opening_balance DECIMAL(15,2) DEFAULT 0, color, is_archived BOOLEAN, created_at, updated_at. Index (user_id, institution). Tanpa UNIQUE pada institusi sehingga satu bank bisa punya banyak rekening.

**`import_batches`**: id, user_id FK, account_id FK, parser VARCHAR(30), file_name, status ENUM(PREVIEW, COMMITTED, CANCELLED), total_rows, imported_rows, duplicate_rows, parsed_payload JSON (hanya saat PREVIEW), created_at, updated_at.

**`category_rules`**: id, user_id FK, keyword VARCHAR(100), category_id FK, created_at. UNIQUE(user_id, keyword).

**`transactions`** (kolom baru): `account_id` FK NOT NULL (setelah migrasi), `transfer_group_id` CHAR(36) NULL, `import_batch_id` FK NULL ON DELETE SET NULL, `import_fingerprint` VARCHAR(64) NULL dengan UNIQUE(`account_id`, `import_fingerprint`). `category_id` NULL untuk transfer. Index (account_id, transaction_date).

## 8. API Contract (tambahan)
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET/POST | `/api/accounts` | Daftar (dengan saldo terhitung) / buat rekening |
| PUT/DELETE | `/api/accounts/:id` | Ubah / arsipkan (hapus hanya bila tanpa transaksi) |
| POST | `/api/transfers` | body: from_account_id, to_account_id, amount, date, description |
| DELETE | `/api/transfers/:groupId` | Hapus kedua sisi transfer |
| POST | `/api/imports/preview` | multipart preview, lihat bagian 4 |
| POST | `/api/imports/:id/commit` | body: `rows: [{index, category_id, include}]` |
| GET | `/api/imports` | Riwayat batch |
| DELETE | `/api/imports/:id` | Rollback batch |
| GET/POST/DELETE | `/api/category-rules` | Kelola rule keyword -> kategori |
| (ubah) | `/api/transactions`, `/api/dashboard/*`, `/api/reports/*` | Parameter opsional `account_id`; pembuatan transaksi wajib `account_id` |

## 9. Frontend
- Halaman `/accounts`: kartu rekening dikelompokkan per institusi (saldo, tombol tambah rekening pada institusi yang sama), form transfer.
- Halaman `/import`: pilih rekening + parser, dropzone, tabel preview (checkbox, dropdown kategori, badge duplikat), tab Riwayat.
- Dashboard: selector rekening ("Semua rekening" default), kartu saldo per rekening.
- Modal transaksi: field Rekening. Mobile: card list. Tanpa emoji dekoratif, ikon Lucide.

## 10. Sub-Milestone
| Kode | Output |
|------|--------|
| M7.1 | Multi rekening: schema + migrasi data lama, CRUD accounts, `account_id` di transaksi, transfer, penyesuaian agregasi dashboard/ekspor + uji regresi |
| M7.2 | UI accounts, selector rekening di dashboard/transaksi/laporan |
| M8.1 | Pipeline import: schema, parser `generic`, preview/commit, fingerprint, rollback |
| M8.2 | Adapter BCA dan Mandiri (butuh sampel file), category rules |
| M8.3 | UI `/import`, riwayat |
| M8.4 | Adapter Dana/OVO/GoPay (bergantung pada format ekspor), uji file nyata, audit keamanan upload, sinkron dev-docs |

Urutan sengaja: multi rekening lebih dulu karena import bergantung pada `account_id`.

## 11. Keputusan & Pertanyaan Terbuka
**Diputuskan user:**
- Rekening tunai (`CASH`) dipakai.
- Saldo awal rekening diinput manual saat membuat rekening. Saldo di file mutasi hanya dipakai untuk rekonsiliasi (peringatan), bukan sumber saldo awal.
- PDF ditunda.

**Masih terbuka:**
1. Sampel BCA (baru ada sampel Mandiri, berupa screenshot).
2. Sampel riwayat Dana/OVO/GoPay, jika aplikasinya menyediakan ekspor.
3. File .xlsx asli sampel Mandiri (anonim) untuk pengujian otomatis; screenshot saja tidak cukup untuk menguji parser terhadap sel gabungan dan format sel sebenarnya.
