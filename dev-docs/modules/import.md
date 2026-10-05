# Modul Import Mutasi Rekening (MOD-08 / Batch M8.1)

> **Status:** Backend Core Selesai & Terverifikasi (v0.4.0)

---

## 1. Ringkasan Modul
Modul Import Mutasi Rekening memungkinkan pengguna mengunggah berkas mutasi bank/e-wallet dalam format CSV, XLSX standar, dan XLSX terenkripsi password (mis. e-Statement Bank Mandiri) untuk ditinjau (preview), dikoreksi, dan di-commit menjadi transaksi keuangan secara atomik.

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
| **Categorizer** | `backend/src/services/import/categorizer.js` | Mesin rekomendasi kategori (`category_rules` user -> keyword sistem -> fallback) |
| **Import Service** | `backend/src/services/import/import.service.js` | Logika bisnis preview, commit atomic, rollback atomic, riwayat |
| **Category Rule Service** | `backend/src/services/categoryRule.service.js` | CRUD aturan kata kunci per pengguna |
| **Upload Middleware** | `backend/src/middlewares/upload.middleware.js` | Multer memoryStorage, batas 5 MB, validasi ekstensi .csv/.xlsx |
| **Rate Limiter** | `backend/src/middlewares/rateLimiter.middleware.js` | Batas 10 request upload per 10 menit per user/IP |

---

## 4. Endpoint API

| Method | Endpoint | Deskripsi | Autentikasi |
|--------|----------|-----------|:-----------:|
| `POST` | `/api/imports/preview` | Upload berkas & buat preview batch (multipart: `account_id`, `file`, opsional `parser`, `mapping`, `file_password`) | Bearer Token |
| `POST` | `/api/imports/:id/commit` | Commit batch preview menjadi transaksi aktual (`rows` override) | Bearer Token |
| `DELETE` | `/api/imports/:id` | Rollback batch berstatus COMMITTED | Bearer Token |
| `GET` | `/api/imports` | Daftar riwayat batch pengguna | Bearer Token |
| `GET` | `/api/imports/:id` | Detail batch import | Bearer Token |
| `GET` | `/api/category-rules` | Daftar aturan kata kunci kategori pengguna | Bearer Token |
| `POST` | `/api/category-rules` | Tambah aturan kata kunci kategori (`keyword`, `category_id`) | Bearer Token |
| `DELETE` | `/api/category-rules/:id` | Hapus aturan kata kunci | Bearer Token |

---

## 5. Keamanan & Proteksi Data
- **In-Memory Processing:** Berkas tidak pernah ditulis ke disk server.
- **Zero-Logging Credential:** Password berkas (`file_password`) tidak pernah dicatat di log, database, maupun response.
- **Anti-CSV Injection:** Sel yang diawali `=`, `+`, `-`, atau `@` dinetralkan dengan menambahkan tanda petik tunggal (`'`).
- **Data Isolation:** Seluruh query difilter berdasarkan `userId`, dan `account_id` wajib diverifikasi kepemilikannya.
- **Payload Cleanup:** Kolom `parsed_payload` di `import_batches` dikosongkan segera setelah batch di-commit.
