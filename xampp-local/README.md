# KBR Office Lokal - XAMPP

Instalasi lokal terpisah dari aplikasi produksi Apps Script. Frontend modern tetap memakai kontrak action API yang sama, sedangkan data disimpan di MySQL melalui PHP/PDO.

## Lokasi dan URL

- Source: `xampp-local/`
- Deployment: `C:\xampp\htdocs\kbr-office`
- Aplikasi: `http://localhost/kbr-office/`
- API health: `http://localhost/kbr-office/api/index.php`
- Database: `kbr_office`

## Akun Awal

- Superadmin: `Superadmin` / `Kolakarealty@2026`
- Admin: `Admkolaka` / `Kolaka@2026`

Username tidak peka huruf besar/kecil. Password disimpan dengan `password_hash()` dan diverifikasi dengan `password_verify()`.

## Menjalankan

1. Jalankan Apache dan MySQL melalui XAMPP Control Panel.
2. Buka `http://localhost/kbr-office/`.
3. Login menggunakan salah satu akun awal.

Database dan akun awal dibuat ketika installer CLI dijalankan. File `install.php` diblokir dari akses web oleh `.htaccess`.

## Konfigurasi Database

Default XAMPP memakai host `127.0.0.1`, port `3306`, user `root`, dan password kosong. Konfigurasi dapat diganti tanpa mengedit source melalui environment variable:

- `KBR_DB_HOST`
- `KBR_DB_PORT`
- `KBR_DB_NAME`
- `KBR_DB_USER`
- `KBR_DB_PASSWORD`

## Struktur

- `api/index.php`: router JSON.
- `api/lib/App.php`: auth, permission, CRUD, upload, backup, audit, search, finance.
- `api/lib/BusinessRules.php`: formula dan validasi workflow backend.
- `database/schema.sql`: schema MySQL/MariaDB.
- `storage/backups/`: file backup JSON, tidak dapat diunduh langsung.
- `uploads/`: lampiran lokal; eksekusi script diblokir.

## Catatan Operasional

Versi lokal tidak mengirim email pengingat pembayaran. Route tetap tersedia dan mengembalikan status `skipped`. Untuk komputer produksi jaringan kantor, ubah password akun awal setelah login dan gunakan password MySQL khusus, bukan akun root.
