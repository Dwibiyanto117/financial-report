# API Flow Architecture — FinReport

```text
[ Browser Client ]
        │
        ├── 1. POST /api/auth/login ──────────► [ Auth Controller ] ──► [ DB Validate ]
        │                                             │
        │◄── 2. Return JWT Access Token ──────────────┘
        │
        ├── 3. GET /api/transactions ─────────► [ Auth Middleware (Verify JWT) ]
        │      (Header: Bearer <token>)               │
        │                                       [ Transaction Controller ]
        │                                             │
        │                                       [ Transaction Service ]
        │                                             │ (Enforce WHERE user_id = current_user)
        │                                       [ Prisma Client / MySQL ]
        │                                             │
        │◄── 4. Return Paginated JSON Response ───────┘
```
