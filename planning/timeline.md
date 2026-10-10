# Timeline & Milestones — Personal Finance Web App (FinReport)

> **Status:** APPROVED — Development Milestone Schedule

---

## 1. Milestone Roadmap

| Milestone | Target Output | Scope |
|-----------|---------------|-------|
| **M1: Foundation & Planning** | `planning/*` & `dev-docs/*` | Setup arsitektur, baseline dokumentasi, inisialisasi skeleton folder `backend/` dan `frontend/` |
| **M2: Backend Core & Auth** | API Auth & Categories | Prisma schema, migration, seed categories, JWT Auth, Recovery Token reset, Category CRUD |
| **M3: Transaction & Agregat Engine** | API Transactions & Stats | CRUD transaksi, kalkulasi saldo berjalan, agregasi komposisi kategori, tren bulanan |
| **M4: Report & Export Engine** | API Export | Generator file Excel (.xlsx) dan dokumen cetak PDF (.pdf) |
| **M5: Frontend Responsive SPA** | React UI Complete | Integrasi Auth, Dashboard Charts, Transaction List/Modal, Filter Bar, dan Bottom Nav mobile |
| **M6: Verification & Polish** | End-to-End Test | Audit keamanan OWASP, penanganan error, validasi cross-device, dan final handover |

---

## 2. Definisi Selesai (Definition of Done) per Milestone
- Kode rapi mengikuti batas ukuran file (Coding Standards).
- Tidak ada credentials di source code (`.env` only).
- Sinkronisasi dokumentasi `dev-docs/` di setiap milestone.
- Commit dan push teratur ke branch pengembangan.

---

## 3. Post-MVP
| Milestone | Target Output | Scope |
|-----------|---------------|-------|
| **M7: Multi Rekening** | MOD-07 | Rekening, transfer, migrasi data, UI (M7.1-M7.2) |
| **M8: Statement Import** | MOD-08 | Pipeline import, adapter BCA/Mandiri/e-wallet, UI (M8.1-M8.4) |

> **M8.1, M8.2, dan M8.3 selesai (Backend Pipeline, Template Generator, & Frontend UI `/import`).** Titik lanjut berikutnya adalah M8.4 (adapter e-wallet & parser BCA/PDF) saat sampel berkas mutasi disediakan oleh pemilik proyek.
