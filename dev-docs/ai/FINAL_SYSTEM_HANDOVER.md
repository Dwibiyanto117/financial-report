# FINAL SYSTEM HANDOVER — FinReport

> **Status:** MVP COMPLETE
> **Version:** 0.2.0
> **Handover Date:** 2026-09-16

---

## 1. Arsitektur & Lingkungan Operasional
- **Project Root**: `d:\Projects\AntiGravity\Financial_report`
- **Backend Directory**: `backend/`
  - URL Service: `http://localhost:5000`
  - Database: MySQL `finreport_db` (koneksi terpusat di `backend/.env`)
  - Server start command: `npm run dev` atau `npm start`
- **Frontend Directory**: `frontend/`
  - URL Service: `http://localhost:5173`
  - Client start command: `npm run dev`
  - Production build command: `npm run build`

## 2. Akun Percobaan (Demo Account)
- **Email**: `budi@example.com`
- **Password**: `NewPassword456`
- **Recovery Token (Sample)**: `REC-811000`