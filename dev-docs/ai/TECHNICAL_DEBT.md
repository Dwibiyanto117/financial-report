# TECHNICAL DEBT — FinReport

Daftar utang teknis yang diketahui dan rencana perbaikannya:

| ID | Modul | Deskripsi Hutang Teknis | Dampak | Rencana Penyelesaian |
|----|-------|-------------------------|--------|----------------------|
| TD-001 | Auth | Reset password menggunakan recovery token sederhana (tanpa SMTP) | Pengguna perlu melihat token pemulihan secara langsung pada respon/layanan | Tambahkan provider email SMTP (Resend/Mailgun) pada fase pasca-MVP |
| TD-002 | Import | Batch PREVIEW yang menggantung belum dibersihkan otomatis | Record `import_batches` berstatus PREVIEW yang tidak pernah di-commit dapat menumpuk di database | Buat background cleanup job / cron scheduler berkala untuk membersihkan batch PREVIEW berumur > 24 jam |
| TD-003 | Testing | Belum ada test runner / test framework otomatis (Jest/Vitest/Mocha) | Pengujian regresi dijalankan lewat skrip ad-hoc (`scripts/verify-m8.1.js`) | Integrasikan Vitest atau Jest pada pipeline CI/CD untuk otomatisasi test suite |

