# TECHNICAL DEBT — FinReport

Daftar utang teknis yang diketahui dan rencana perbaikannya:

| ID | Modul | Deskripsi Hutang Teknis | Dampak | Rencana Penyelesaian |
|----|-------|-------------------------|--------|----------------------|
| TD-001 | Auth | Reset password menggunakan recovery token sederhana (tanpa SMTP) | Pengguna perlu melihat token pemulihan secara langsung pada respon/layanan | Tambahkan provider email SMTP (Resend/Mailgun) pada fase pasca-MVP |
| TD-002 | Import | Batch PREVIEW yang menggantung belum dibersihkan otomatis | Record `import_batches` berstatus PREVIEW yang tidak pernah di-commit dapat menumpuk di database | Buat background cleanup job / cron scheduler berkala untuk membersihkan batch PREVIEW berumur > 24 jam |
| TD-003 | Testing | Belum ada test runner / test framework otomatis (Jest/Vitest/Mocha) | Pengujian regresi dijalankan lewat skrip ad-hoc (`scripts/verify-m8.1.js`) | Integrasikan Vitest atau Jest pada pipeline CI/CD untuk otomatisasi test suite |
| TD-004 | Core / Error Handling | Global error handler di `backend/src/app.js` berpotensi membocorkan Prisma query dump / raw database error jika unhandled error tembus | Raw database errors yang bocor ke respon HTTP dapat membocorkan skema tabel dan data internal saat terjadi unhandled error | Pasang centralized error mapping layer untuk memetakan Prisma error codes (`P2002`, `P2003`, `P2025`) dan sanitize pesan error internal sebelum dikembalikan ke client |
| TD-005 | Core / Validation | Endpoint legacy di modul accounts, transactions, categories belum memakai `parsePositiveInt` secara konsisten pada route params | Input non-integer pada `:id` berpotensi lolos ke Prisma query engine atau menghasilkan response 500 tidak seragam | Terapkan utility validator `parsePositiveInt` dari `backend/src/utils/query.js` di seluruh controller legacy |
| TD-006 | Import | Validasi MIME type untuk CSV sengaja tidak diwajibkan secara ketat pada multer upload | Berkas CSV sering dilaporkan browser sebagai `application/vnd.ms-excel`, `text/plain`, atau `application/octet-stream` sehingga strict MIME filter berisiko menolak berkas CSV valid | Pertahankan validasi format via ekstensi nama file dan parser structure parsing (header + content parsing), pertimbangkan buffer magic byte / sniff checking jika diperlukan |
| TD-007 | Database / Import | Perhitungan duplikasi pada commit bergantung pada `skipDuplicates: true` createMany MySQL | Selisih baris yang gagal diinsert karena duplikasi fingerprint dianggap duplikat runtime, tetapi tidak mencatat id duplikat per baris | Pada iterasi lanjutan M8, simpan fingerprint log detail per baris di tabel audit jika riwayat rinci dibutuhkan pengguna |


