# Test Report

Tanggal pengujian: 2026-08-09

## Ringkasan

Migrasi transport dan static frontend telah diuji lokal. Deployment Google Apps Script `/exec` kemudian diberikan dan health check serta action router aman sudah diuji langsung. Pengujian yang memerlukan credential pengguna, perubahan data Spreadsheet, atau akses Drive belum dijalankan agar tidak menebak credential maupun memodifikasi data produksi tanpa konteks record uji.

## Hasil Lulus

| Area | Pemeriksaan | Hasil |
|---|---|---|
| Backend | Sintaks `Code.gs` melalui `node --check` | Lulus |
| API | `doGet()` health response JSON | Lulus |
| API | `doPost()` aksi valid `logout` | Lulus |
| API | Body JSON rusak menghasilkan error envelope | Lulus |
| Security | Aksi tidak dikenal ditolak allowlist | Lulus |
| Contract | Semua aksi unik yang dipanggil `gsCall()` memiliki route backend | Lulus |
| Transport | Tidak ada `google.script.run` di frontend produksi | Lulus |
| Transport | Frontend memakai `fetch`, `POST`, `text/plain`, body JSON, timeout, dan redirect follow | Lulus |
| Security | Credential bootstrap lama tidak ada di artefak produksi | Lulus |
| Security | Credential Superadmin dibaca dari Script Properties | Lulus |
| Diagnostics | `Code.gs`, `index.html`, README, dan analisis tanpa diagnostics editor | Lulus |
| Frontend | Static root `http://127.0.0.1:5501/` merender React login | Lulus |
| Frontend | Babel/JSX terkompilasi tanpa runtime error | Lulus |
| Mobile | Viewport 390 x 844 menampilkan form login | Lulus |
| Mobile | Tidak ada horizontal overflow pada login | Lulus |
| Error handling | Placeholder API menampilkan pesan konfigurasi yang jelas | Lulus |
| Encoding | Mojibake yang terdeteksi pada source produksi sudah dibersihkan | Lulus |
| Apps Script | GET `/exec` mengembalikan health JSON `success: true` | Lulus |
| Apps Script | POST `text/plain` untuk action aman `logout` mengembalikan envelope sukses | Lulus |
| GitHub Pages | Build dari `main:/` berstatus `built` dan login dirender dari URL produksi | Lulus |

## Menunggu Deployment

| Area | Alasan |
|---|---|
| Login bercredential dan logout sesi nyata | Memerlukan credential akun valid; credential tidak diminta atau ditebak selama pengujian |
| Dashboard dan read data | Memerlukan session valid dan data Google Sheets |
| Create, update, delete | Tidak aman dilakukan tanpa deployment dan target Spreadsheet yang terverifikasi |
| Search global | Memerlukan data dan backend deployed |
| Upload/hapus Drive | Memerlukan otorisasi Drive akun deployment |
| Backup/restore | Memerlukan folder Drive dan Spreadsheet target; restore bersifat destruktif |
| Laporan keuangan | Memerlukan data Sheets nyata |
| Trigger reminder | Memerlukan project Apps Script dan otorisasi MailApp |
| Browser lintas Chrome/Edge/Firefox/Safari perangkat nyata | Workspace hanya menyediakan browser pengujian terintegrasi |
| GitHub Pages production | Memerlukan repository/akun GitHub dan Git CLI atau upload melalui web |

## Uji Penerimaan Setelah Deployment

1. Konfigurasikan Script Properties tanpa menaruh nilainya di repository.
2. Deploy `Code.gs` sebagai Web App dan pastikan URL `/exec` mengembalikan health JSON.
3. Masukkan URL `/exec` pada `API_URL` di `index.html`.
4. Login dan pastikan `listAllData` memuat Dashboard.
5. Gunakan record uji terkontrol untuk create, update, search/filter, dan delete.
6. Periksa perubahan pada Sheet `Data` dan event pada `AuditLog`.
7. Uji upload/hapus satu lampiran kecil dan satu backup nonproduksi.
8. Logout dan pastikan token lama ditolak.
9. Deploy ke GitHub Pages dan ulangi pada desktop, Android, dan iPhone.

## Catatan Lingkungan

- `python.exe` di mesin ini adalah Windows Store alias, bukan runtime Python aktif.
- PowerShell melarang wrapper `npx.ps1`; pengujian tidak bergantung pada perubahan execution policy.
- Git CLI tidak tersedia, sehingga repository lokal dan push remote belum dapat dibuat dari terminal ini.
- Static browser test dijalankan menggunakan server sementara dari modul bawaan Node.js; Node.js tidak menjadi bagian aplikasi atau arsitektur deployment.
