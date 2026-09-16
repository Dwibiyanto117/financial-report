# Frontend Directory Structure — FinReport

```text
frontend/
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── assets/
    ├── components/
    │   ├── Navbar.jsx          # Header desktop
    │   ├── Sidebar.jsx         # Navigasi sidebar desktop
    │   ├── BottomNav.jsx       # Navigasi bawah responsif mobile
    │   ├── SummaryCards.jsx    # Metrik saldo & arus kas
    │   ├── CategoryChart.jsx   # Donut chart komposisi
    │   ├── TrendChart.jsx      # Bar chart tren bulanan
    │   ├── TransactionModal.jsx# Form tambah/edit transaksi
    │   ├── CategoryModal.jsx   # Form kategori kustom
    │   └── ExportModal.jsx     # Pilihan ekspor Excel/PDF
    ├── pages/
    │   ├── Login.jsx
    │   ├── Register.jsx
    │   ├── ForgotPassword.jsx
    │   ├── ResetPassword.jsx
    │   ├── Dashboard.jsx
    │   ├── Transactions.jsx
    │   ├── Categories.jsx
    │   └── Reports.jsx
    ├── context/
    │   └── AuthContext.jsx     # State autentikasi global
    ├── services/
    │   ├── api.js              # Axios instance terpusat
    │   ├── auth.service.js
    │   ├── transaction.service.js
    │   ├── category.service.js
    │   └── report.service.js
    └── utils/
        └── currency.js         # Formatting mata uang Rupiah extensible
```
