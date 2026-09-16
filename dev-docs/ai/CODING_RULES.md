# CODING RULES — FinReport

> **Status:** ACTIVE

## 1. File Size Limits
- Controller: Maksimal 1000 baris (pindahkan logika kompleks ke Service)
- Service: Maksimal 800 baris
- Model / Schema: Maksimal 300 baris
- Route: Maksimal 200 baris

## 2. Naming Conventions
- Backend files: `camelCase.js` atau `{entity}.controller.js`, `{entity}.service.js`, `{entity}.routes.js`
- Frontend components: `PascalCase.jsx` (contoh: `SummaryCards.jsx`, `TransactionModal.jsx`)
- Frontend hooks/utils: `camelCase.js` (contoh: `useAuth.js`, `currency.js`)
- Database tables: `snake_case` jamak (contoh: `users`, `categories`, `transactions`)

## 3. Error Handling
- Selalu gunakan blok `try...catch` pada asynchronous controller functions.
- Format respon error seragam via error handling middleware.
