# FinReport Backend — REST API Server

> **Auto-generated oleh AI.** Diupdate setiap milestone. Lihat `../dev-docs/` untuk dokumentasi development lengkap.

---

## Apa Ini?
Layanan backend REST API untuk aplikasi FinReport (Personal Finance Web Application). Bertanggung jawab atas autentikasi pengguna, manajemen kategori, pencatatan transaksi, agregasi dashboard finansial, serta ekspor laporan Excel dan PDF.

---

## Tech Stack
| Layer | Teknologi |
|-------|-----------|
| Runtime | Node.js (ES Module) |
| Framework | Express.js |
| ORM | Prisma ORM |
| Database | MySQL 8.0+ |
| Security | Helmet, CORS, JWT, bcryptjs |
| Export | ExcelJS, PDFMake |

---

## Quick Start

### Prerequisites
- Node.js >= 18 LTS
- MySQL >= 8.0
- npm / pnpm / yarn

### Setup
```bash
# Pindah ke direktori backend
cd backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Sesuaikan DATABASE_URL dan JWT_SECRET di .env

# Generate client dan migrate database
npx prisma generate
npx prisma db push
node prisma/seed.js

# Jalankan server development
npm run dev
```

### Access
| Service | URL |
|---------|-----|
| REST API | `http://localhost:5000/api` |
| Health Check | `http://localhost:5000/api/health` |

---

## Project Structure
```text
backend/
├── prisma/
│   ├── schema.prisma
│   └── seed.js
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── routes/
│   ├── services/
│   └── utils/
├── .env.example
├── .gitignore
└── package.json
```

---

## Modules
| Module | Deskripsi | Status |
|--------|-----------|--------|
| Auth | Registrasi, login, reset password token | Production |
| Accounts | Manajemen rekening/sumber dana, saldo terhitung, arsip | Production |
| Transfers | Transfer dana atomik 2-arah antar-rekening via transferGroupId | Production |
| Categories | Default & custom categories | Production |
| Transactions | CRUD transaksi keuangan & filter per-rekening | Production |
| Dashboard | Agregasi saldo multi-rekening, komposisi & tren | Production |
| Reports | Generator ekspor Excel & PDF dengan kolom Rekening | Production |