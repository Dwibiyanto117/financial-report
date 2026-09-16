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
