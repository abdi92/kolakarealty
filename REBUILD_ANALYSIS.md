# Rebuild Analysis

## A. Existing Architecture

Aplikasi lama adalah web app Google Apps Script satu proyek: `Code.md` berisi backend Apps Script dan `Index.md` berisi dokumen HTML/React. Frontend memanggil fungsi server melalui `google.script.run`. Backend memakai Spreadsheet aktif dan Drive milik akun deployment.

Target migrasi mempertahankan backend, Spreadsheet, struktur data, dan seluruh fitur. Frontend menjadi situs statis GitHub Pages dan berkomunikasi dengan deployment Apps Script melalui HTTPS `fetch()`.

## B. Frontend Functions

Frontend React 18 berbasis Babel browser mencakup:

- Login, pemulihan sesi, logout, profil, dan ganti password.
- Dashboard KPI dan workflow Proyek, Legal, Marketing, Penjualan, Bank, Notaris, Pajak, Keuangan, dan Gudang.
- Halaman CRUD generik berbasis schema, modal form/detail, validasi wajib, referensi antarmodul, kalkulasi otomatis, pencarian, filter, sorting, pagination, duplikasi, serta approval cepat.
- Upload dan hapus lampiran, impor/ekspor CSV, pencetakan dokumen, arsip otomatis, backup/restore, audit log, laporan keuangan, notifikasi, dan pencarian global.
- Layout responsif untuk desktop, tablet, dan ponsel.

Transport lama terpusat pada `gsCall()`, sehingga migrasi dapat dilakukan tanpa mengubah pemanggil fitur.

## C. Backend Functions

Backend menyediakan autentikasi/sesi, permission role, sanitasi data pengguna, CRUD generik, upload Drive, backup/restore, audit log, rate limiting, ganti/reset password, pencarian global, agregasi keuangan, anti-double-booking, serta trigger pengingat pembayaran.

Fungsi publik yang dipakai frontend: `authenticateUser`, `getSession`, `logout`, `listAllData`, `saveRecord`, `deleteRecord`, `uploadFile`, `deleteFile`, `backupData`, `listBackups`, `restoreBackup`, `listAuditLog`, `changeOwnPassword`, `searchAll`, dan `getFinanceSummary`.

## D. Google Sheets Structure

Database tetap memakai Spreadsheet yang sama:

- Sheet `Data`: `entity | id | value(JSON) | updatedAt`.
- Sheet `AuditLog`: `timestamp | userId | username | role | action | entity | recordId | details`.

Tidak ada perubahan nama sheet, header, ID, format JSON record, atau relasi data. Folder Drive dokumen dan backup juga dipertahankan.

## E. API Mapping

Semua request dikirim ke satu `doPost(e)` dengan body JSON berformat:

```json
{
  "action": "saveRecord",
  "token": "session-token",
  "args": ["proyek", { "id": "..." }]
}
```

Response konsisten:

```json
{ "success": true, "data": {} }
```

atau:

```json
{ "success": false, "message": "Pesan aman untuk pengguna" }
```

Router memakai allowlist eksplisit agar nama fungsi arbitrary tidak dapat dieksekusi. `authenticateUser` tidak menerima token; aksi lain menerima token sebagai argumen pertama, sama seperti kontrak lama `gsCall()`.

Request frontend menggunakan `POST` dan `Content-Type: text/plain;charset=utf-8` agar menjadi CORS simple request tanpa preflight/header kustom yang tidak didukung Apps Script Web App.

## F. Authentication

Username dan password hanya dikirim melalui HTTPS ke Apps Script. Password pengguna tetap diverifikasi dan disimpan sebagai hash SHA-256 sesuai implementasi lama. Token sesi tetap dibuat backend dan disimpan sementara dalam `CacheService`.

Credential Superadmin tidak boleh berada di repository publik. Username dan password bootstrap dipindahkan ke Script Properties `SUPERADMIN_USERNAME` dan `SUPERADMIN_PASSWORD`. Frontend hanya menyimpan token sesi, tidak menyimpan password.

## G. Business Logic

Seluruh aturan lama dipertahankan, termasuk role/permission backend, sanitasi password, email/username unik, audit, rate limiting, double booking, kalkulasi laporan, reminder, upload, backup, serta workflow lintas modul. Kalkulasi frontend tetap dipertahankan untuk UX; otorisasi dan operasi data tetap melalui backend.

## H. UI Components

Tampilan, warna, sidebar, dashboard, schema modul, tabel, form, modal, ikon, cetak, toast, loading/error/empty state, dan responsive CSS dipertahankan. Perubahan UI hanya menambahkan state konfigurasi API yang jelas jika URL deployment belum diisi.

## I. Migration Plan

1. Salin sumber lama menjadi file produksi `Code.gs` dan `index.html`.
2. Tambahkan router API allowlist dan response JSON di `Code.gs`.
3. Pindahkan credential bootstrap ke Script Properties.
4. Ganti implementasi terpusat `gsCall()` dengan `fetch()` bertimeout di `index.html`.
5. Tambahkan konfigurasi tunggal `API_URL` dan pesan konfigurasi yang dapat ditindaklanjuti.
6. Tambahkan dokumentasi deployment, konfigurasi, pengujian, dan troubleshooting.
7. Jalankan pemeriksaan sintaks dan audit statis mapping API/secret/transport.

## J. Potential Problems

- URL `/dev` hanya berlaku untuk editor; produksi wajib memakai URL `/exec`.
- Deployment harus `Execute as: Me` dan dapat diakses oleh pengguna aplikasi agar GitHub Pages dapat memanggilnya.
- Apps Script tidak menyediakan kontrol header CORS penuh. Simple request `text/plain` dan tanpa header kustom menghindari preflight.
- Deployment Apps Script dapat melakukan redirect ke `script.googleusercontent.com`; `fetch` browser mengikuti redirect secara otomatis.
- API tidak dapat diuji end-to-end tanpa URL deployment dan Spreadsheet terikat yang valid. Validasi lokal mencakup sintaks, kontrak router, pemetaan aksi, serta static serving; pengujian integrasi dilakukan setelah deployment.
- `CacheService` bukan session store permanen; sesi dapat berakhir sebelum TTL dalam kondisi cache eviction. Perilaku ini dipertahankan untuk kompatibilitas.
- React/Babel CDN memerlukan internet. Tidak ada Node.js runtime atau backend baru yang ditambahkan.
