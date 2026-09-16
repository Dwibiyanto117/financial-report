# FinReport Frontend — Web SPA

> **Auto-generated oleh AI.** Diupdate setiap milestone. Lihat `../dev-docs/` untuk dokumentasi development lengkap.

---

## Apa Ini?
Aplikasi web Single Page Application (SPA) responsif untuk FinReport (Personal Finance Web Application). Mendukung pengalaman penggunaan optimal di desktop browser (dengan sidebar) dan mobile browser (dengan bottom navigation).

---

## Tech Stack
| Layer | Teknologi |
|-------|-----------|
| Runtime | Node.js |
| Framework | React 18+ (Vite) |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Charts | Recharts |
| Routing | React Router DOM |
| HTTP Client | Axios |

---

## Quick Start

### Setup & Run
```bash
# Pindah ke direktori frontend
cd frontend

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Jalankan server development Vite
npm run dev
```

### Access
- URL lokal: `http://localhost:5173`

---

## Modules
| Module | Deskripsi | Status |
|--------|-----------|--------|
| Auth | Login, Register, Forgot Password, Reset Password | Production |
| Dashboard | Summary Cards, Donut Chart, Trend Bar Chart, Recent Activity | Production |
| Transactions | Filter Bar, Desktop Table, Mobile Feed, Modal CRUD | Production |
| Categories | Default & Custom Categories Management with Color Picker | Production |
| Reports | Period Filter, Preview, Excel (.xlsx) & PDF (.pdf) Download | Production |