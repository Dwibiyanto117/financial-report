# API Contract — Personal Finance Web App (FinReport)

> **Status:** APPROVED — REST API Contract
> **Base URL:** `http://localhost:5000/api`

---

## 1. Konvensi Umum

### Header Standar
```http
Content-Type: application/json
Authorization: Bearer <jwt_access_token>
```

### Struktur Respon Berhasil
```json
{
  "success": true,
  "message": "Operasi berhasil",
  "data": {}
}
```

### Struktur Respon Gagal / Validasi
```json
{
  "success": false,
  "message": "Pesan kesalahan",
  "errors": [
    {
      "field": "amount",
      "message": "Nominal transaksi harus berupa angka positif"
    }
  ]
}
```

---

## 2. Rincian Endpoint

### 2.1 Autentikasi (`/api/auth`)

#### `POST /api/auth/register`
- **Request Body**:
  ```json
  {
    "name": "John Doe",
    "email": "user@example.com",
    "password": "Password123"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Registrasi berhasil",
    "data": {
      "user": { "id": 1, "name": "John Doe", "email": "user@example.com" },
      "token": "eyJhbGciOi..."
    }
  }
  ```

#### `POST /api/auth/login`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "Password123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Login berhasil",
    "data": {
      "user": { "id": 1, "name": "John Doe", "email": "user@example.com" },
      "token": "eyJhbGciOi..."
    }
  }
  ```

#### `POST /api/auth/forgot-password`
- **Request Body**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Kode pemulihan berhasil digenerate",
    "data": {
      "recovery_token": "REC-789123"
    }
  }
  ```

#### `POST /api/auth/reset-password`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "recovery_token": "REC-789123",
    "new_password": "NewPassword123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Password berhasil diperbarui"
  }
  ```

---

### 2.2 Kategori (`/api/categories`)

#### `GET /api/categories?type=EXPENSE`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "name": "Makanan & Minuman",
        "type": "EXPENSE",
        "icon": "utensils",
        "color": "#EF4444",
        "is_default": true
      }
    ]
  }
  ```

#### `POST /api/categories`
- **Request Body**:
  ```json
  {
    "name": "Hobi Fotografi",
    "type": "EXPENSE",
    "icon": "camera",
    "color": "#8B5CF6"
  }
  ```

---

### 2.3 Transaksi (`/api/transactions`)

#### `GET /api/transactions`
- **Query Params**: `page=1&limit=20&start_date=2026-09-01&end_date=2026-09-30&type=EXPENSE&category_id=1`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": 101,
          "type": "EXPENSE",
          "amount": 45000,
          "currency": "IDR",
          "transaction_date": "2026-09-16",
          "description": "Makan siang",
          "category": { "id": 1, "name": "Makanan & Minuman", "color": "#EF4444", "icon": "utensils" }
        }
      ],
      "pagination": { "page": 1, "limit": 20, "total": 1, "total_pages": 1 }
    }
  }
  ```

#### `POST /api/transactions`
- **Request Body**:
  ```json
  {
    "category_id": 1,
    "type": "EXPENSE",
    "amount": 45000,
    "transaction_date": "2026-09-16",
    "description": "Makan siang"
  }
  ```

---

### 2.4 Dashboard Agregat (`/api/dashboard`)

#### `GET /api/dashboard/summary?start_date=...&end_date=...`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "total_income": 15000000,
      "total_expense": 4500000,
      "net_balance": 10500000,
      "running_balance": 25750000,
      "currency": "IDR"
    }
  }
  ```

#### `GET /api/dashboard/category-breakdown?month=9&year=2026`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      { "category_name": "Makanan & Minuman", "color": "#EF4444", "total_amount": 1800000, "percentage": 40.0 },
      { "category_name": "Transportasi", "color": "#3B82F6", "total_amount": 900000, "percentage": 20.0 }
    ]
  }
  ```

#### `GET /api/dashboard/monthly-trend?year=2026`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      { "month": "Jan", "income": 12000000, "expense": 5000000 },
      { "month": "Feb", "income": 12500000, "expense": 4800000 }
    ]
  }
  ```

---

### 2.5 Ekspor Laporan (`/api/reports`)

#### `GET /api/reports/export/excel?start_date=...&end_date=...`
- **Content-Type**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Deskripsi**: Menghasilkan file `.xlsx` dengan streaming download.

#### `GET /api/reports/export/pdf?start_date=...&end_date=...`
- **Content-Type**: `application/pdf`
- **Deskripsi**: Menghasilkan berkas PDF siap cetak laporan ringkasan dan daftar mutasi transaksi.

---

## 3. Endpoint Post-MVP
Detail lengkap: `planning/bank-import.md` bagian 8 dan `dev-docs/modules/import.md`.

### 3.1 Template Standar FinReport (`GET /api/imports/template`)
- **Query Params**:
  - `bank`: Kode bank dari allowlist (`BCA`, `MANDIRI`, `BRI`, `BNI`, `CIMB`, `JAGO`, `DANA`, `OVO`, `GOPAY`, `LAINNYA`), default `LAINNYA`.
  - `format`: `xlsx` atau `csv`, default `xlsx`.
- **Response**: File streaming attachment (`Content-Disposition: attachment; filename="finreport-template-<bank>.<format>"`).

### 3.1.1 Daftar Bank Template (`GET /api/imports/template/banks`)
- **Headers**: `Authorization: Bearer <token>`
- **Deskripsi**: Mengambil allowlist bank dan dompet digital yang didukung untuk unduhan template mutasi.
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Daftar template bank berhasil diambil",
    "data": [
      { "code": "BCA", "label": "Bank Central Asia (BCA)" },
      { "code": "MANDIRI", "label": "Bank Mandiri" },
      { "code": "BRI", "label": "Bank Rakyat Indonesia (BRI)" },
      { "code": "BNI", "label": "Bank Negara Indonesia (BNI)" },
      { "code": "CIMB", "label": "CIMB Niaga" },
      { "code": "JAGO", "label": "Bank Jago" },
      { "code": "DANA", "label": "DANA" },
      { "code": "OVO", "label": "OVO" },
      { "code": "GOPAY", "label": "GoPay" },
      { "code": "LAINNYA", "label": "Bank / Dompet Digital Lainnya" }
    ]
  }
  ```

### 3.1.2 Registry Parser Mutasi (`GET /api/imports/parsers`)
- **Headers**: `Authorization: Bearer <token>`
- **Deskripsi**: Mengambil daftar adapter parser yang terdaftar secara dinamis di backend beserta metadata format berkas dan pemetaan.
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Daftar parser import berhasil diambil",
    "data": [
      {
        "name": "mandiri",
        "label": "e-Statement Bank Mandiri (XLSX)",
        "description": "Parser e-Statement resmi Bank Mandiri (format XLSX / terenkripsi password)",
        "formats": ["xlsx"],
        "requiresMapping": false
      },
      {
        "name": "template",
        "label": "Template Standar FinReport",
        "description": "Format template mutasi resmi FinReport (CSV / XLSX)",
        "formats": ["csv", "xlsx"],
        "requiresMapping": false
      },
      {
        "name": "generic",
        "label": "Generik (Kustom)",
        "description": "Format berkas mutasi generik dengan pemetaan kolom tanggal, keterangan, dan nominal",
        "formats": ["csv", "xlsx"],
        "requiresMapping": true
      }
    ]
  }
  ```

### 3.2 Pratinjau Mutasi (`POST /api/imports/preview`)
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`
- **Body**: `file` (File), `account_id` (Integer), opsional `parser`, `mapping` (JSON), `file_password` (String).
- **Format Berkas**: Dinamis berdasarkan allowlist format registry parser (`csv`, `xlsx` pada Jalur A).
- **Rate Limit**: 10 request per 10 menit per pengguna.
- **Catatan Pembersihan Malas**: Saat endpoint ini dipanggil, batch berstatus `PREVIEW` milik user yang berusia lebih dari 24 jam otomatis ditandai `CANCELLED`.
- **Error Response — Format .pdf Belum Didukung (400 Bad Request)**:
  ```json
  {
    "success": false,
    "message": "Format berkas .pdf belum didukung langsung. Gunakan berkas .csv/.xlsx atau unduh template standar FinReport."
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "batch_id": 12,
      "parser": "template",
      "file_name": "finreport-template-mandiri.xlsx",
      "meta": { "template_version": "FINREPORT-IMPORT-V1", "bank": "MANDIRI", "accountNumberMasked": "...1234" },
      "warnings": [],
      "suggested_account": { "id": 1, "name": "Bank Mandiri", "institution": "MANDIRI", "match": "last4" },
      "summary": { "total": 10, "duplicate": 1, "new": 9, "invalid": 0 },
      "rows": [
        {
          "index": 1,
          "date": "2026-08-15",
          "time": "10:30:00",
          "description": "Pembayaran Toko",
          "type": "EXPENSE",
          "amount": 50000,
          "balance": 1500000,
          "suggested_category_id": 3,
          "suggestion_source": "template",
          "suggested_keyword": "Pembayaran Toko",
          "is_duplicate": false
        }
      ]
    }
  }
  ```
- **Error Response — Password Diperlukan / Salah (400 Bad Request)**:
  ```json
  {
    "success": false,
    "message": "File terenkripsi membutuhkan password untuk dibuka",
    "errors": [
      { "field": "file_password", "message": "File terenkripsi membutuhkan password untuk dibuka" }
    ]
  }
  ```

### 3.3 Commit Import Mutasi (`POST /api/imports/:id/commit`)
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Rate Limit**: 30 request per 10 menit per pengguna (dapat disesuaikan via `IMPORT_COMMIT_RATE_LIMIT_MAX`).
- **Body**:
  ```json
  {
    "rows": [
      { "index": 1, "category_id": 3, "include": true, "learn_rule": true, "keyword": "Pembayaran Toko" }
    ]
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Impor mutasi berhasil diselesaikan",
    "data": {
      "batch_id": 12,
      "imported_rows": 9,
      "duplicate_rows": 1,
      "skipped_rows": 0,
      "rules_saved": 1,
      "rule_warnings": []
    }
  }
  ```

### 3.4 Update Aturan Kategori (`PUT /api/category-rules/:id`)
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Body**:
  ```json
  {
    "keyword": "toko kelontong",
    "category_id": 3
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Aturan kategori berhasil diperbarui",
    "data": { "id": 5, "userId": 1, "keyword": "toko kelontong", "categoryId": 3 }
  }
  ```

### 3.5 Pembatalan & Rollback Batch Import (`DELETE /api/imports/:id`)
- **Headers**: `Authorization: Bearer <token>`
- **Path Params**: `id` (Integer)
- **Perilaku**:
  - **Batch berstatus PREVIEW**: Mengubah status batch menjadi `CANCELLED` dan mengosongkan `parsed_payload` tanpa menghapus transaksi (karena belum di-commit).
    ```json
    {
      "success": true,
      "message": "Batch preview berhasil dibatalkan",
      "data": { "batch_id": 12, "status": "CANCELLED", "deleted_transactions": 0, "message": "Batch preview berhasil dibatalkan" }
    }
    ```
  - **Batch berstatus COMMITTED**: Menghapus seluruh transaksi terkait secara atomik, memulihkan saldo akun, dan mengubah status batch menjadi `CANCELLED`.
    ```json
    {
      "success": true,
      "message": "Batch import berhasil di-rollback dan transaksi telah dihapus",
      "data": { "batch_id": 12, "status": "CANCELLED", "deleted_transactions": 9, "message": "Batch import berhasil di-rollback dan transaksi telah dihapus" }
    }
    ```
  - **Batch berstatus CANCELLED**: Menolak pembatalan ulang dengan HTTP 400 (`Batch import sudah dibatalkan sebelumnya`).

