# AGENTS.md (Dev-Docs Level) — AI Working Agreement

> **Status:** ACTIVE
> Dokumen ini diturunkan dari `ai-rules/AGENTS.md`.

## Aturan Utama
1. **Git Execution**: Dilarang menjalankan perintah git dari root project. Wajib `cd backend` atau `cd frontend`.
2. **Branching**: Commit selalu dilakukan di branch `dev` atau `feat/*`. Dilarang push langsung ke `main`.
3. **Dokumentasi Output**: Setiap selesai batch task, perbarui dokumen terkait di `dev-docs/ai/CURRENT_STATE.md`, `TASKS.md`, dan `CHANGELOG.md`.
4. **Security**: Tidak ada password, token, atau secret database di kode sumber. Semua secret di `.env`.
5. **No Decorative Emojis**: Dilarang menambahkan decorative emoji di dalam kode maupun UI teks.
