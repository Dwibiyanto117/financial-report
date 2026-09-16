# START HERE — FinReport Developer & AI Onboarding

Selamat datang di proyek **FinReport** (Personal Finance Web Application).
File ini adalah titik masuk utama (entry point) bagi developer atau AI agent baru.

---

## 1. Quick Orientation

- **Tipe Proyek**: Decoupled Fullstack (Dual Git Repo)
- **Folder Backend**: `backend/` (Node.js Express + Prisma ORM + MySQL)
- **Folder Frontend**: `frontend/` (React + Vite + Tailwind CSS + Lucide Icons)
- **Folder Perencanaan**: `planning/`
- **Aturan Kerja & Kontrak AI**: `AGENTS.md` dan `ai-rules/` (Immutable)

---

## 2. Aturan Git Penting

Root project **BUKAN** Git repository.
Setiap perintah Git HARUS dijalankan dari dalam folder kode:
```bash
# Untuk backend
cd backend
git status

# Untuk frontend
cd frontend
git status
```

---

## 3. Peta Dokumen

| Dokumen | Lokasi | Kegunaan |
|---------|--------|----------|
| Arsitektur Sistem | `dev-docs/architecture/` | Alur API, skema DB, struktur modul |
| Konteks Proyek | `dev-docs/ai/PROJECT_CONTEXT.md` | Gambaran umum sistem dan tech stack |
| Mental Model | `dev-docs/ai/PROJECT_MENTAL_MODEL.md` | Pola desain dan konvensi arsitektur |
| Peta Modul | `dev-docs/ai/MODULE_MAP.md` | Pemetaan modul ke file kode |
| Status & Task | `dev-docs/ai/CURRENT_STATE.md` & `TASKS.md` | Progress aktif dan backlog |
| Riwayat Perubahan | `dev-docs/CHANGELOG.md` | Catatan versi dan rilis |
