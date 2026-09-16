# Architecture Plan — Personal Finance Web App (FinReport)

> **Status:** APPROVED — System Architecture Blueprint
> **Project Type:** Decoupled Fullstack (Dual Repository)
> **Git Location:** `backend/` dan `frontend/`

---

## 1. Project Type Declaration

| Item | Value |
|------|-------|
| Project Type | Decoupled Fullstack |
| Git Location | `backend/` (REST API) dan `frontend/` (SPA) |
| Root Project | Non-Git Root (Sesuai AGENTS.md) |

---

## 2. Tech Stack Specification

| Layer | Teknologi | Versi | Rationale |
|-------|-----------|-------|-----------|
| Backend Runtime | Node.js | >= 18 LTS | Ekosistem matang, performa asynchronous efisien |
| Backend Framework | Express.js | ^4.19 / ^5.0 | Minimalis, fleksibel, mudah dipahami alur request-nya |
| ORM / Database Client | Prisma ORM | ^5.x | Skema deklaratif (`schema.prisma`) sangat mudah dibaca non-technical person, type-safe, migrasi otomatis |
| Database | MySQL | >= 8.0 | ACID compliant, sangat stabil untuk data transaksi keuangan |
| Frontend Framework | React + Vite | ^18 / ^19 | SPA reaktif, bundling super cepat dengan Vite |
| Styling & UI | Tailwind CSS | ^3.4 | Utility-first, clean, zero CSS bloat, mudah dipadukan untuk desain responsive PC & mobile |
| Icons | Lucide React | Latest | Kumpulan ikon profesional, konsisten tanpa emoji dekoratif |
| Charting | Recharts / Chart.js | Latest | Visualisasi grafik donat kategori & batang tren bulanan yang interaktif dan responsif |
| Authentication | JWT + bcryptjs | Latest | Stateless token authentication, standard bcrypt hashing |
| Data Export | ExcelJS & PDFKit/PDFMake | Latest | Pembuatan file .xlsx dan dokumen PDF langsung dari backend/client |

---

## 3. System Design & Layering

### Architecture Pattern: Layered Decoupled Architecture

```text
[ Browser Client (Desktop / Mobile) ]
                │
         HTTP/HTTPS (REST API)
                ▼
[ Express API Server (backend/) ]
  ├── Middleware Layer (Auth JWT, CORS, Helmet, Rate-Limit, Validator)
  ├── Route Layer (auth.routes, category.routes, transaction.routes, report.routes)
  ├── Controller Layer (Menerima input, memanggil service, format respons)
  ├── Service Layer (Logika bisnis, kalkulasi saldo berjalan, agregasi, ekspor)
  └── Data Access Layer (Prisma Client)
                ▼
        [ MySQL Database ]
```

### Flow Autentikasi & Otorisasi
1. Client mengirim kredensial (email & password) ke `/api/auth/login`.
2. Backend memvalidasi data, mencocokkan hash password bcrypt.
3. Backend merespons dengan JWT access token dan profile user.
4. Client menyimpan token (localStorage / secure memory) dan menyertakan header `Authorization: Bearer <token>` pada setiap request terproteksi.
5. Middleware autentikasi di backend mengekstrak `user_id` dan menginjeksi ke `req.user`. Semua query database selanjutnya WAJIB difilter dengan `user_id`.

---

## 4. Component Breakdown

| Komponen | Tanggung Jawab | Lokasi Kode |
|----------|----------------|-------------|
| Auth Module | Registrasi, Login, Password Reset Token, Verifikasi | `backend/src/controllers/auth.controller.js` |
| Category Module | CRUD kategori bawaan & kustom | `backend/src/controllers/category.controller.js` |
| Transaction Module | Pencatatan pemasukan & pengeluaran, filter, validasi nominal | `backend/src/controllers/transaction.controller.js` |
| Dashboard / Stats Module | Kalkulasi agregat (total income/expense, net, running balance, tren) | `backend/src/controllers/dashboard.controller.js` |
| Export Module | Generator file Excel (.xlsx) dan PDF (.pdf) | `backend/src/services/export.service.js` |
| Currency Utility | Format mata uang (Default: IDR, extensibility pattern) | `frontend/src/utils/currency.js` & `backend/src/utils/currency.js` |

---

## 5. Security & Isolation Architecture

1. **Multi-Tenant Data Isolation**: Setiap tabel operasional (`categories`, `transactions`) memiliki relasi langsung ke `user_id`. Backend secara otomatis membatasi scope data hanya untuk user yang sedang login.
2. **Password Security**: Password di-hash menggunakan `bcryptjs` dengan minimum 10 salt rounds sebelum disimpan ke database.
3. **HTTP Security Headers**: Menggunakan `helmet` untuk proteksi XSS, Clickjacking, dan header security lainnya.
4. **CORS Policy**: CORS dikonfigurasi untuk hanya mengizinkan origin dari frontend yang terdaftar.
5. **No Credentials in Code**: Semua konfigurasi sensitif (DB connection, JWT secret, port) dimuat via environment variable (`.env`).
