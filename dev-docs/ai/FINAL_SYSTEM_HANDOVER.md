# FINAL SYSTEM HANDOVER — FinReport

> **Status:** M8.1 COMPLETE (Statement Import Pipeline Core)
> **Version:** 0.4.0
> **Handover Date:** 2026-10-05

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

## 2. Fitur Aktif
- **MOD-01**: Autentikasi JWT & Simple Password Reset.
- **MOD-02**: Kategori Transaksi (15 kategori sistem + kustom).
- **MOD-03**: CRUD Transaksi Keuangan & Filter multi-kriteria.
- **MOD-04**: Dashboard Analitik (Saldo Berjalan, Donut Chart, Tren 12 Bulan).
- **MOD-05**: Ekspor Laporan Excel (.xlsx) & PDF (.pdf).
- **MOD-07**: Multi Rekening (Bank, E-Wallet, Cash) & Atomic Transfer Antar Rekening.
- **MOD-08 (Core)**: Pipeline Import Mutasi Rekening (CSV, XLSX, Encrypted XLSX Mandiri, Fingerprint Deduplikasi SHA-256, Auto-Categorization, Atomic Commit & Rollback).

## 3. Akun Percobaan (Demo Account)
- **Email**: `budi@example.com`
- **Password**: `NewPassword456`
- **Recovery Token (Sample)**: `REC-811000`