---
name: docs-ai
description: AI Vibe Coding Documentation and Workflow Framework based on frandika06/docs-ai. Provides comprehensive templates, standards, and rules for project planning (PROJECT_BRIEF, PRD, TASKS), architecture, dev-docs, coding standards, and security standards located in ai-rules/.
---

# docs-ai Skill

Framework panduan dan template dokumentasi AI Vibe Coding berdasarkan repositori [frandika06/docs-ai](https://github.com/frandika06/docs-ai).

## 1. Prinsip Utama
- **`ai-rules/` = IMMUTABLE**: AI hanya membaca aturan dan template dari `ai-rules/`. Jangan pernah mengubah isi folder `ai-rules/`.
- **Folder Output**: AI membuat dan mengelola file output di root project (`planning/`, `dev-docs/`, `revamp/`, `prod-docs/`, `reports/`).
- **Aturan Git**:
  - Root project BUKAN git repository. Jangan pernah `git init` di root.
  - Kode dan repository Git berada di subfolder:
    - **Monolith:** `apps/`
    - **Fullstack:** `backend/` dan `frontend/`

## 2. Struktur Template di `ai-rules/`
- `ai-rules/AGENTS.md`: Kontrak kerja utama AI Agent.
- `ai-rules/planning-templates/`: Template untuk `planning/` (`PROJECT_BRIEF.md`, `PRD.md`, `ROADMAP.md`, `ARCHITECTURE.md`, `TASKS.md`, `PROGRESS.md`, dll).
- `ai-rules/dev-docs-ai-templates/`: Template untuk `dev-docs/ai/`.
- `ai-rules/architecture-templates/`: Template untuk `dev-docs/architecture/`.
- `ai-rules/modules-template/`: Template untuk `dev-docs/modules/`.
- `ai-rules/coding-standards/`: Standar coding (naming convention, error handling, DB, API, dll).
- `ai-rules/security/`: Standar keamanan komprehensif.
- `ai-rules/revamp-templates/`, `ai-rules/reports-templates/`, `ai-rules/prod-docs-templates/`.

## 3. Cara Penggunaan Skenario
- **Skenario 1 (New Project)**:
  1. Jika user sudah mengisi `planning/PROJECT_BRIEF.md`, baca brief lalu generate `planning/` dan `dev-docs/`.
  2. Jika belum ada brief, tanyakan kebutuhan proyek secara interaktif (atau gunakan Mode C jika detail arsitektur sudah diberikan).
  3. Siapkan struktur subfolder kode (`apps/` atau `backend/` + `frontend/`).
