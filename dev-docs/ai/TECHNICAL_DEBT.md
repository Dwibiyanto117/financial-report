# TECHNICAL DEBT — FinReport

Daftar utang teknis yang diketahui dan rencana perbaikannya:

| ID | Modul | Deskripsi Hutang Teknis | Dampak | Rencana Penyelesaian |
|----|-------|-------------------------|--------|----------------------|
| TD-001 | Auth | Reset password menggunakan recovery token sederhana (tanpa SMTP) | Pengguna perlu melihat token pemulihan secara langsung pada respon/layanan | Tambahkan provider email SMTP (Resend/Mailgun) pada fase pasca-MVP |
