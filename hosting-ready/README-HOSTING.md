# KBR Office - Paket Hosting PHP/MySQL

Paket ini siap dipasang pada shared hosting/cPanel/Plesk yang menyediakan PHP dan MySQL/MariaDB. Paket berdiri sendiri dan tidak memerlukan Google Apps Script atau Google Sheets.

## Persyaratan

- Domain atau subdomain dengan HTTPS.
- PHP 7.4 atau lebih baru; PHP 8.1/8.2 direkomendasikan.
- MySQL 5.7+ atau MariaDB 10.3+.
- Extension PHP: `pdo_mysql`, `json`, `openssl`, `fileinfo`, dan `mbstring`.
- Apache dengan `.htaccess` direkomendasikan.
- Batas upload PHP minimal 12 MB agar payload base64 file 8 MB dapat diterima.

## Isi Paket

- `index.html`, `app.js`, dan aset PWA: frontend aplikasi.
- `api/`: API PHP, formula, autentikasi, permission, dan endpoint unduh aman.
- `database/schema.sql`: tabel aplikasi; tidak membuat database baru.
- `setup.php`: wizard instalasi satu kali.
- `storage/`: backup privat.
- `uploads/`: lampiran privat.

## Instalasi cPanel

1. Buka **MySQL Databases**.
2. Buat database, misalnya `namaakun_kbr`.
3. Buat user database dengan password kuat.
4. Tambahkan user ke database dan berikan **ALL PRIVILEGES** pada database tersebut.
5. Buka **Select PHP Version** dan pilih PHP 8.1/8.2.
6. Aktifkan `pdo_mysql`, `json`, `openssl`, `fileinfo`, dan `mbstring`.
7. Buka **File Manager** dan masuk ke `public_html`, subdomain, atau subfolder tujuan.
8. Upload `kbr-office-hosting.zip`, lalu pilih **Extract**.
9. Pastikan file `.htaccess` ikut terunggah. Aktifkan **Show Hidden Files** pada File Manager.
10. Buka `https://domainanda.com/setup.php` atau `https://domainanda.com/kbr-office/setup.php`.
11. Pastikan seluruh pemeriksaan server berstatus **Lulus**.
12. Isi host, port, nama database, user, dan password database. Nama database/user harus menyertakan prefix cPanel.
13. Tentukan username dan password awal Superadmin/Admin. Password minimal 10 karakter.
14. Klik **Pasang aplikasi**.
15. Setelah berhasil, hapus `setup.php` dari hosting.
16. Buka aplikasi dan login menggunakan akun yang dibuat pada wizard.

## Instalasi Plesk

1. Buka **Databases**, buat database dan database user.
2. Pada **PHP Settings**, pilih PHP 8.1/8.2 dan pastikan extension yang diperlukan aktif.
3. Upload dan extract paket melalui **Files** ke document root domain/subdomain.
4. Jalankan `setup.php` melalui HTTPS dan isi kredensial database Plesk.
5. Setelah berhasil, hapus `setup.php`.

## Permission Folder

Gunakan permission berikut bila hosting meminta pengaturan manual:

```text
Folder              755
File                644
api/config.local.php 600 atau 640
storage/             755 atau 775
uploads/             755 atau 775
```

Jangan menggunakan permission `777` kecuali diminta sementara oleh dukungan hosting. Wizard memerlukan hak tulis pada `api/`, `storage/`, dan `uploads/` selama instalasi.

## Pengaturan PHP

Untuk lampiran maksimal 8 MB, gunakan nilai sekurang-kurangnya:

```ini
upload_max_filesize = 12M
post_max_size = 16M
memory_limit = 128M
max_execution_time = 120
```

Aplikasi mengirim file sebagai base64 di JSON sehingga ukuran request lebih besar daripada file asli. Pada sebagian hosting, pengaturan ini dilakukan melalui **MultiPHP INI Editor**.

## Keamanan Setelah Instalasi

1. Hapus `setup.php`.
2. Pastikan aplikasi hanya dapat dibuka melalui HTTPS.
3. Jangan membagikan `api/config.local.php`; file ini berisi password database dan application key.
4. Simpan password database dan akun Superadmin dalam password manager.
5. Uji bahwa URL berikut menghasilkan HTTP 403:

```text
https://domainanda.com/api/config.local.php
https://domainanda.com/database/schema.sql
https://domainanda.com/storage/installed.lock
https://domainanda.com/uploads/
```

6. Ganti password akun awal secara berkala.
7. Aktifkan backup hosting/cPanel selain backup dari aplikasi.

## Backup dan Restore

Superadmin dapat membuat backup JSON dari menu sistem. File backup berada di `storage/backups/` dan hanya dapat diunduh lewat tautan bertanda tangan dari aplikasi.

Sebelum update:

1. Buat backup dari aplikasi.
2. Export database melalui phpMyAdmin.
3. Download folder `uploads/`.
4. Simpan `api/config.local.php` secara aman.

## Update Aplikasi

1. Backup database, upload, dan konfigurasi.
2. Upload versi baru ke folder sementara.
3. Pertahankan file `api/config.local.php`, `storage/installed.lock`, isi `storage/backups/`, dan isi `uploads/`.
4. Timpa file aplikasi lainnya.
5. Jangan menjalankan `setup.php` lagi pada database produksi.
6. Bersihkan cache browser/service worker bila bundle frontend berubah.

## Rollback

1. Kembalikan file aplikasi versi sebelumnya.
2. Import dump database sebelum update bila schema/data berubah.
3. Kembalikan folder `uploads/` dan `storage/backups/`.
4. Pastikan `api/config.local.php` mengarah ke database yang benar.

## Troubleshooting

### Setup menampilkan extension gagal

Aktifkan extension pada **Select PHP Version** atau hubungi penyedia hosting. `mbstring` dan `pdo_mysql` wajib tersedia.

### Database access denied

- Gunakan nama database/user lengkap dengan prefix akun.
- Pastikan user sudah ditambahkan ke database.
- Berikan privilege pada database tersebut.
- Gunakan host database dari provider; tidak selalu `localhost`.

### Folder tidak dapat ditulis

Ubah permission `api`, `storage`, dan `uploads` menjadi `755` atau `775`. Setelah setup, batasi `api/config.local.php` ke `600/640`.

### Error 500 setelah upload

- Periksa **Errors** atau `error_log` di panel hosting.
- Pastikan `.htaccess` didukung Apache.
- Bila provider memakai Nginx murni, minta provider memblokir `api/config.local.php`, `database/`, `storage/`, dan `uploads/` pada konfigurasi server.

### Lampiran lebih dari 8 MB gagal

Batas aplikasi adalah 8 MB. Kompres dokumen atau naikkan `post_max_size`/`memory_limit` jika file di bawah 8 MB tetap gagal.

### Tampilan versi lama setelah update

Hapus cache situs/service worker melalui DevTools browser atau naikkan versi cache pada `service-worker.js` sebelum deployment.

## Catatan Fitur Lokal

Route pengingat pembayaran tersedia tetapi tidak mengirim email pada paket ini. Integrasi SMTP perlu dikonfigurasi terpisah sesuai provider hosting. Seluruh permission, formula, workflow transaksi, audit, upload, backup, dan autentikasi tetap ditegakkan di backend PHP.
