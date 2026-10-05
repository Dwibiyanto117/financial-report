# Rencana Pengerjaan M8 — Statement Import (RESUME POINT)

> **Status:** M8.1 SELESAI — Titik lanjut: M8.2 & M8.3
> **Sumber:** `planning/bank-import.md`, `dev-docs/ai/TASKS.md` Batch M8.1
> **Diperbarui:** 2026-10-05

---

## 1. Cara Melanjutkan (mulai dari sini)

1. `git pull` di branch `dev`.
2. Batch M8.1 (core backend, skema, parser Mandiri & Generic, fingerprint, commit, rollback) sudah selesai dan lulus verifikasi 100%.
3. Lanjutkan ke **Batch M8.2** (Adapter BCA & penyempurnaan rules) atau **Batch M8.3** (Frontend UI `/import`).

---

## 2. Posisi Proyek Saat Ini

| Item | Status |
|------|--------|
| MVP (M1-M6) | Selesai & terverifikasi |
| MOD-07 Multi Rekening + Transfer (M7.1, M7.2) | Selesai (`67c91cc`) |
| **M8.1 Pipeline Import Core (Backend)** | **Selesai & terverifikasi (v0.4.0)** |
| **M8.2 & M8.3 UI & Extended Adapters** | **Siap dikerjakan berikutnya** |
| Sampel Mandiri terenkripsi | Terintegrasi & teruji penuh pada pipeline |

---

## 3. Sub-Milestone M8 (dari `planning/bank-import.md` bagian 10)

| Kode | Output |
|------|--------|
| M8.1 | Pipeline import: skema, parser `generic`, preview/commit, fingerprint, rollback |
| M8.2 | Adapter BCA dan Mandiri, category rules |
| M8.3 | UI `/import`, riwayat |
| M8.4 | Adapter Dana/OVO/GoPay, uji file nyata, audit keamanan upload |

---

## 4. Temuan Sampel Mandiri (sudah diverifikasi, bukan asumsi)

File: `e-Statement_XXXXXXXXX9456_01 Agu 2026-31 Agu 2026 Sample.xlsx` (27 KB, terenkripsi).

| Aspek | Temuan |
|-------|--------|
| Enkripsi | Container OLE/CFB (`D0CF11E0`), skema ECMA-376 Agile (AES-256). Setelah didekripsi menjadi ZIP xlsx normal |
| Password salah | Mengembalikan pesan bersih `The password is incorrect`, bukan crash |
| Sheet | Satu sheet saja |
| Blok metadata | Label di kolom A/L/Q, nilai di G/N/J/V — posisi tidak berurutan |
| Nomor rekening | 13 digit; nama file memakai pola 9 huruf X + 4 digit akhir |
| Rekonsiliasi | Saldo Awal + Dana Masuk - Dana Keluar = Saldo Akhir, cocok persis pada sampel |
| Header tabel | Dua baris: baris 16 (Indonesia) dan baris 17 (Inggris), data mulai baris 18 |
| **1 transaksi = 2 baris** | Baris tanggal+nominal, lalu baris jam (`17:10:32 WIB`) di baris berikutnya |
| Format nilai | Semua string: tanggal `01 Aug 2026`, nominal `283.000,00` (format Indonesia) |
| Kolom bergabung | Puluhan merge range; nilai hanya ada di sel master |
| Isi sampel | Hanya 2 transaksi (file terpotong) |

**Konsekuensi wajib:** rekonsiliasi harus berupa peringatan, bukan pemblokir, karena sampel yang terpotong akan selalu memicu peringatan selisih.

---

## 5. Ruang Lingkup Batch M8.1

### 5.1 Skema database
- `ImportBatch` (`import_batches`): user, account, parser, file_name, status `PREVIEW|COMMITTED|CANCELLED`, total/imported/duplicate rows, `parsed_payload` JSON, timestamps.
- `CategoryRule` (`category_rules`): user, keyword, category, UNIQUE(user_id, keyword).
- `Transaction`: kolom `import_batch_id` (FK, ON DELETE SET NULL), `import_fingerprint` VARCHAR(64), UNIQUE(account_id, import_fingerprint).

### 5.2 Parser adapter (`backend/src/services/import/parsers/`)
Kontrak: `detect(ctx) -> number` (skor keyakinan), `parse(ctx) -> { rows, meta, warnings }`.
- `generic.js` — pemetaan kolom manual.
- `mandiri.js` — cari baris header berdasarkan isi ("Tanggal", "Keterangan", "Dana Masuk", "Dana Keluar", "Saldo"), bukan nomor baris tetap; lewati baris terjemahan Inggris; gabungkan baris jam; berhenti di baris footer.

### 5.3 Engine
- `import.service.js` — preview/commit/rollback, commit atomic.
- `fingerprint.js` — `sha256(accountId|tanggal|nominal|tipe|deskripsi_ternormalisasi|urutan_dalam_hari)`.
- `categorizer.js` — rule keyword bawaan + kustom user; fallback kategori "Lainnya" sesuai tipe.
- `normalize.js` — angka Indonesia ke Decimal; tanggal Indonesia/Inggris ke Date.

### 5.4 Endpoint
`POST /api/imports/preview`, `POST /api/imports/:id/commit`, `GET /api/imports`, `GET /api/imports/:id`, `DELETE /api/imports/:id`, `GET|POST|DELETE /api/category-rules`.

### 5.5 Keamanan
Validasi ekstensi + MIME, batas 5 MB / 2000 baris, rate limit upload, file diproses di memori (tidak ditulis ke disk), semua query difilter user_id, `account_id` diverifikasi milik user, netralisasi sel berawalan `= + - @`, password tidak pernah masuk log.

---

## 6. Verifikasi yang Harus Dijalankan Sebelum Batch M8.1 Dinyatakan Selesai
1. Preview sampel asli dengan password benar → baris terparse benar (tanggal, jam, keterangan multi-baris, nominal).
2. Preview dengan password salah → HTTP 400 pesan jelas.
3. Preview file xlsx tidak terenkripsi → tetap berjalan.
4. Preview ulang file yang sama → semua baris ditandai duplikat.
5. Commit → transaksi tercipta, saldo rekening berubah, dashboard dan ekspor tidak terpolusi transfer.
6. Rollback → transaksi batch hilang, saldo kembali.
7. Rekonsiliasi → peringatan selisih muncul tanpa memblokir.
8. Rekening milik user lain → ditolak, tanpa kebocoran data.

---

## 7. Catatan Lingkungan
- Repo ini menempatkan git di **root project** (bukan `backend/` dan `frontend/` terpisah). Aturan "git wajib dari folder kode" di `AGENTS.md` tidak berlaku apa adanya di proyek ini; semua perintah git dijalankan dari root.
- Test framework otomatis belum ada di repo. Verifikasi M8.1 memakai skrip uji terhadap API dan MySQL nyata, mengikuti pola verifikasi batch B1 dan M7.1.
