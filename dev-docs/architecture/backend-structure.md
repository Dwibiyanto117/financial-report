# Backend Directory Structure — FinReport

```text
backend/
├── .env.example
├── .gitignore
├── package.json
├── prisma/
│   ├── schema.prisma       # Skema deklaratif database
│   └── seed.js             # Data kategori bawaan
└── src/
    ├── app.js              # Inisialisasi Express & middlewares
    ├── server.js           # Server entry point & listener
    ├── config/             # Konfigurasi environment & database
    ├── controllers/        # Request handling & HTTP response
    │   ├── auth.controller.js
    │   ├── category.controller.js
    │   ├── transaction.controller.js
    │   ├── dashboard.controller.js
    │   └── report.controller.js
    ├── services/           # Logika bisnis & kalkulasi finansial
    │   ├── auth.service.js
    │   ├── category.service.js
    │   ├── transaction.service.js
    │   ├── dashboard.service.js
    │   └── export.service.js
    ├── routes/             # Definisi routing API
    │   ├── auth.routes.js
    │   ├── category.routes.js
    │   ├── transaction.routes.js
    │   ├── dashboard.routes.js
    │   └── report.routes.js
    ├── middlewares/        # Auth JWT & validation middleware
    │   ├── auth.middleware.js
    │   └── error.middleware.js
    └── utils/              # Helper mata uang & response wrapper
        ├── currency.js
        └── response.js
```
