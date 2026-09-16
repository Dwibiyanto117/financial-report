# PROJECT MENTAL MODEL — FinReport

> **Status:** ACTIVE
> **Purpose:** Pola pikir arsitektural dan filosofi desain sistem

---

## 1. Prinsip Utama (Core Principles)

1. **Multi-User Isolation**:
   Data keuangan adalah data sangat sensitif. Setiap query database untuk transaksi dan kategori kustom WAJIB difilter dengan `user_id` yang terotentikasi. Tidak ada data yang boleh bocor lintas akun.

2. **Keterbacaan bagi Non-Technical Person**:
   - Skema database di Prisma didefinisikan dengan nama model dan relasi yang jelas dan deskriptif.
   - Penamaan fungsi di controller dan service menggunakan istilah domain yang mudah dipahami: `calculateRunningBalance`, `getCategoryBreakdown`, `exportTransactionsToExcel`.

3. **Separation of Concerns (Layered Backend)**:
   - `routes/`: Hanya mendefinisikan rute URL dan middleware.
   - `controllers/`: Menerima input request, validasi skema dasar, dan memformat respon HTTP.
   - `services/`: Memuat logika bisnis murni, kalkulasi keuangan, dan pemanggilan database.
   - `prisma/`: Definisi skema dan query data.

4. **Extensible Currency Pattern**:
   Saat ini mata uang default adalah IDR (Rupiah). Fungsi formatting dienkapsulasi dalam helper terpusat `formatCurrency(amount, currency)` sehingga dapat dengan mudah diperluas menjadi multi-currency tanpa merefaktor ratusan komponen.
