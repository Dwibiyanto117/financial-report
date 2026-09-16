# Database Architecture & Schema — FinReport

Merujuk secara konsisten ke [database.md](../../planning/database.md) di folder planning.
- **Tabel `users`**: Identitas akun dan token verifikasi pemulihan sandi.
- **Tabel `categories`**: Pengelompokan pengeluaran dan pemasukan (default sistem + kustom user).
- **Tabel `transactions`**: Catatan transaksi dengan relasi kuat ke `user_id` dan `category_id`.
