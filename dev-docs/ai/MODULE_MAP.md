# MODULE MAP — FinReport

Pemetaan modul fungsional ke struktur direktori kode:

| Modul | Backend File Path | Frontend File Path |
|-------|-------------------|--------------------|
| **Auth** | `backend/src/controllers/auth.controller.js`<br>`backend/src/services/auth.service.js`<br>`backend/src/routes/auth.routes.js` | `frontend/src/pages/Login.jsx`<br>`frontend/src/pages/Register.jsx`<br>`frontend/src/pages/ForgotPassword.jsx`<br>`frontend/src/pages/ResetPassword.jsx` |
| **Categories** | `backend/src/controllers/category.controller.js`<br>`backend/src/services/category.service.js`<br>`backend/src/routes/category.routes.js` | `frontend/src/pages/Categories.jsx`<br>`frontend/src/components/CategoryModal.jsx` |
| **Transactions** | `backend/src/controllers/transaction.controller.js`<br>`backend/src/services/transaction.service.js`<br>`backend/src/routes/transaction.routes.js` | `frontend/src/pages/Transactions.jsx`<br>`frontend/src/components/TransactionModal.jsx`<br>`frontend/src/components/TransactionFilter.jsx` |
| **Dashboard** | `backend/src/controllers/dashboard.controller.js`<br>`backend/src/services/dashboard.service.js`<br>`backend/src/routes/dashboard.routes.js` | `frontend/src/pages/Dashboard.jsx`<br>`frontend/src/components/SummaryCards.jsx`<br>`frontend/src/components/CategoryChart.jsx`<br>`frontend/src/components/TrendChart.jsx` |
| **Accounts** | `backend/src/controllers/account.controller.js`<br>`backend/src/services/account.service.js`<br>`backend/src/routes/account.routes.js` | `frontend/src/pages/Accounts.jsx`<br>`frontend/src/components/AccountModal.jsx` |
| **Transfers** | `backend/src/controllers/transfer.controller.js`<br>`backend/src/services/transfer.service.js`<br>`backend/src/routes/transfer.routes.js` | `frontend/src/components/TransferModal.jsx` |
| **Common / Utils**| `backend/src/utils/currency.js`<br>`backend/src/utils/query.js`<br>`backend/src/middlewares/auth.middleware.js` | `frontend/src/utils/currency.js`<br>`frontend/src/context/AuthContext.jsx` |
