# PROJECT CONTEXT — FinReport

> **Status:** ACTIVE
> **Target Audience:** Developers & AI Agents

---

## 1. System Overview
FinReport adalah aplikasi pencatatan keuangan personal responsif berbasis cloud yang memungkinkan pengguna mencatat pemasukan dan pengeluaran harian, mengelola kategori fleksibel, melihat saldo berjalan dan visualisasi komposisi pengeluaran, serta mengekspor laporan ke format Excel dan PDF.

---

## 2. Tech Stack Summary
- **Backend API**: Node.js (Express.js)
- **Database Access / ORM**: Prisma ORM
- **Database Engine**: MySQL 8.0+
- **Frontend SPA**: React 18+ (Vite)
- **Styling**: Tailwind CSS
- **Icon Set**: Lucide React
- **Autentikasi**: JWT (JSON Web Token) stateless + bcryptjs
- **Ekspor Dokumen**: ExcelJS (.xlsx) dan PDFMake / PDFKit (.pdf)

---

## 3. UI/UX Template & Framework
- Framework UI: Tailwind CSS (Established Framework)
- Responsive: Mobile-first bottom navigation untuk smartphone (<768px), sidebar untuk desktop (>=768px).
- Warna Semantik: Emerald (Pemasukan / Positif), Rose (Pengeluaran / Negatif), Slate (Netral).
