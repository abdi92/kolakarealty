# KBR Legal Management

Aplikasi administrasi PT Kolaka Bumi Realty dengan frontend statis di GitHub Pages, backend Google Apps Script, dan Google Sheets sebagai database.

## Arsitektur

```text
Browser
  -> GitHub Pages (index.html)
  -> HTTPS fetch (JSON lewat text/plain)
  -> Google Apps Script Web App (Code.gs)
  -> Google Sheets / Google Drive
```

Tidak ada Node.js backend, server tambahan, atau database lain.

## Struktur

```text
.
|-- index.html            # Frontend React statis dan entry point GitHub Pages
|-- manifest.webmanifest # Metadata instalasi PWA
|-- service-worker.js    # Cache aplikasi dan fallback offline
|-- offline.html         # Halaman saat koneksi terputus
|-- icons/               # Ikon Android, iOS, dan maskable
|-- Code.gs               # Backend Apps Script Web App
|-- README.md             # Panduan ini
|-- REBUILD_ANALYSIS.md   # Analisis migrasi dan pemetaan API
|-- TEST_REPORT.md        # Hasil pengujian dan checklist integrasi
|-- MASTER_PROMPT_MIGRASI_APP_SCRIPT_TO_GITHUB_COPILOT.md
|                         # Template migrasi dengan VS Code + GitHub Copilot
|-- MASTER_PROMPT_MIGRASI_APP_SCRIPT_TO_GITHUB_TANPA_COPILOT.md
|                         # Template migrasi netral untuk developer/tool lain
`-- Master_Prompt.md      # Spesifikasi migrasi
```

## Template Migrasi Aplikasi Lain

- Gunakan [MASTER_PROMPT_MIGRASI_APP_SCRIPT_TO_GITHUB_COPILOT.md](MASTER_PROMPT_MIGRASI_APP_SCRIPT_TO_GITHUB_COPILOT.md) untuk workflow agent di VS Code dengan GitHub Copilot.
- Gunakan [MASTER_PROMPT_MIGRASI_APP_SCRIPT_TO_GITHUB_TANPA_COPILOT.md](MASTER_PROMPT_MIGRASI_APP_SCRIPT_TO_GITHUB_TANPA_COPILOT.md) untuk developer, tim engineering, konsultan, atau AI coding assistant lain.
- Edit blok `KONFIGURASI_CUSTOM` di bagian atas prompt sebelum dipakai. Parameter mencakup aplikasi, repository, Apps Script, Spreadsheet, role, fitur, branding, PWA, dan aturan keamanan.
- Jangan memasukkan nilai password, token, private key, atau secret ke dalam blok konfigurasi yang akan disimpan di GitHub.

## Fitur

- Login, session, logout, role, dan permission backend.
- Dashboard KPI dan workflow properti.
- Modul Proyek, Legal, Marketing, Penjualan, Bank, Notaris, Pajak, Keuangan, dan Gudang.
- CRUD, pencarian, filter, sorting, pagination, validasi, serta relasi antarmodul.
- Upload dokumen Drive, impor/ekspor CSV, pencetakan dokumen, dan arsip.
- Audit log, backup/restore, laporan keuangan, anti-double-booking, dan reminder pembayaran.
- Tampilan responsif desktop, tablet, Android, dan iPhone.
- PWA yang dapat dipasang ke layar utama HP.

## Persiapan Google Sheets

Gunakan Spreadsheet lama agar seluruh data tetap tersedia. Backend mempertahankan struktur:

- `Data`: `entity | id | value | updatedAt`
- `AuditLog`: `timestamp | userId | username | role | action | entity | recordId | details`

Cara termudah adalah membuat Apps Script yang terikat pada Spreadsheet lama melalui **Extensions > Apps Script**. Jangan mengubah nama sheet atau header.

## Konfigurasi Apps Script

1. Buka Apps Script yang terikat pada Spreadsheet.
2. Ganti isi `Code.gs` dengan file [Code.gs](Code.gs).
3. Buka **Project Settings > Script Properties**.
4. Tambahkan `SUPERADMIN_USERNAME` dengan username bootstrap yang dipilih.
5. Tambahkan `SUPERADMIN_PASSWORD` dengan password kuat dan unik.
6. Jangan menaruh nilai kedua property tersebut di GitHub atau frontend.
7. Pastikan timezone proyek sesuai, misalnya `Asia/Jakarta`.

Akses Spreadsheet dan Drive dilakukan oleh akun yang melakukan deployment. User aplikasi tidak perlu dan tidak boleh diberi akses edit langsung ke Spreadsheet.

## Deploy Backend

1. Di Apps Script pilih **Deploy > New deployment**.
2. Pilih **Web app**.
3. Atur **Execute as: Me**.
4. Atur akses sesuai pengguna aplikasi. Untuk frontend GitHub Pages tanpa login Google, endpoint harus dapat diakses oleh siapa pun yang memiliki URL; login aplikasi tetap diwajibkan oleh backend untuk setiap aksi data.
5. Klik **Deploy**, berikan otorisasi yang diminta, lalu salin URL berakhiran `/exec`.
6. Buka URL `/exec` di browser. Respons health check harus berupa JSON dengan `success: true`.

Setiap perubahan `Code.gs` memerlukan deployment versi baru melalui **Deploy > Manage deployments > Edit > New version**. URL deployment dapat tetap sama.

## Konfigurasi Frontend

Di [index.html](index.html), ubah satu baris berikut:

```javascript
const API_URL = window.KBR_API_URL || "YOUR_APPS_SCRIPT_WEB_APP_URL";
```

Ganti placeholder dengan URL `/exec`, contoh format:

```javascript
const API_URL = window.KBR_API_URL || "https://script.google.com/macros/s/DEPLOYMENT_ID/exec";
```

Jangan gunakan URL `/dev`; URL tersebut hanya untuk editor Apps Script.

Frontend mengirim request sederhana `POST` dengan `Content-Type: text/plain;charset=utf-8`. Token sesi berada di body JSON, bukan custom header, sehingga request lintas origin tidak memicu preflight yang tidak didukung Apps Script Web App.

## Deploy GitHub Pages

1. Buat repository GitHub dan push seluruh file project.
2. Buka **Settings > Pages**.
3. Pilih **Deploy from a branch**.
4. Pilih branch utama dan folder `/ (root)`.
5. Simpan, lalu buka `https://USERNAME.github.io/REPOSITORY/`.

GitHub Pages memuat `index.html` langsung dari root repository. Semua asset eksternal memakai HTTPS.

## Instalasi di HP

### Android (Chrome)

1. Buka URL GitHub Pages aplikasi melalui Chrome.
2. Ketuk menu tiga titik, lalu pilih **Instal aplikasi** atau **Tambahkan ke layar utama**.
3. Konfirmasi **Instal**. Aplikasi akan muncul di layar utama dan daftar aplikasi.

### iPhone/iPad (Safari)

1. Buka URL GitHub Pages aplikasi melalui Safari.
2. Ketuk tombol **Bagikan**.
3. Pilih **Tambahkan ke Layar Utama**, lalu ketuk **Tambah**.

PWA tetap memerlukan internet untuk login dan mengakses data Apps Script. Saat perangkat offline, aplikasi menampilkan halaman koneksi terputus dan tidak menggunakan data kantor yang mungkin sudah kedaluwarsa.

## Development Lokal

Jangan menguji melalui `file:///`. Jalankan static server dari folder project, misalnya ekstensi VS Code **Live Server**, lalu buka URL yang diberikan ekstensi. Alternatif bila Python tersedia:

```powershell
python -m http.server 5500
```

Buka `http://localhost:5500/`. Frontend tetap berkomunikasi langsung dengan Apps Script `/exec`.

## Kontrak API

Request:

```json
{
  "action": "listAllData",
  "token": "SESSION_TOKEN",
  "args": []
}
```

Response berhasil:

```json
{
  "success": true,
  "data": {}
}
```

Response gagal:

```json
{
  "success": false,
  "message": "Pesan kesalahan"
}
```

Router backend menggunakan allowlist. Aksi yang tidak dikenal tidak dapat memanggil fungsi Apps Script secara dinamis.

## Checklist Pengujian Deployment

1. Buka `/exec` dan pastikan health check JSON berhasil.
2. Buka GitHub Pages dan login dengan akun yang tersimpan di Sheet `Data` atau akun bootstrap dari Script Properties.
3. Verifikasi Dashboard dan pembacaan data.
4. Buat, ubah, cari, filter, urutkan, lalu hapus satu record uji yang sah.
5. Pastikan perubahan muncul pada Sheet `Data` dan aktivitas muncul di `AuditLog`.
6. Uji upload/hapus lampiran dan pastikan file muncul di folder Drive aplikasi.
7. Uji import/export CSV, cetak dokumen, laporan keuangan, dan backup.
8. Logout, lalu pastikan token lama tidak dapat mengakses data.
9. Uji ukuran desktop, tablet, Android, dan iPhone melalui browser DevTools atau perangkat nyata.

Jangan melakukan pengujian create/update/delete pada data produksi yang tidak boleh berubah.

## Update Aplikasi

- Perubahan frontend: edit `index.html`, push ke branch Pages, lalu tunggu deployment GitHub Pages selesai.
- Perubahan file PWA: naikkan `CACHE_VERSION` pada `service-worker.js` agar perangkat mengambil cache terbaru.
- Perubahan backend: edit `Code.gs`, buat versi deployment Apps Script baru, lalu uji health check dan login.
- Perubahan schema form tidak otomatis mengubah header Sheet karena record disimpan sebagai JSON pada kolom `value`.

## Troubleshooting

### URL API belum dikonfigurasi

Ganti `YOUR_APPS_SCRIPT_WEB_APP_URL` pada `index.html` dengan URL `/exec`.

### Respons API tidak valid

Pastikan URL adalah deployment Web App `/exec`, deployment masih aktif, dan akses deployment sesuai kebutuhan. Membuka halaman login Google biasanya berarti konfigurasi akses deployment belum cocok.

### Login gagal karena credential belum dikonfigurasi

Tambahkan `SUPERADMIN_USERNAME` dan `SUPERADMIN_PASSWORD` pada Script Properties. Akun pengguna biasa tetap dibaca dari entity `pengguna` di Sheet `Data`.

### Session berakhir

Session memakai Apps Script `CacheService`. Login ulang jika cache kedaluwarsa atau dikeluarkan lebih awal.

### Upload gagal

Periksa ukuran file (maksimal aplikasi 8 MB), izin Drive akun deployment, kuota Apps Script/Drive, dan koneksi pengguna.

### Data tidak muncul

Pastikan Apps Script terikat ke Spreadsheet lama, sheet bernama `Data`, header tidak berubah, dan role pengguna memiliki permission baca entity tersebut.

### Perubahan backend belum terlihat

Buat versi deployment baru. Menyimpan file Apps Script saja tidak memperbarui URL `/exec` yang sedang aktif.

## Keamanan

- Jangan commit credential, token, private key, atau URL yang mengandung secret.
- URL Web App bukan pengganti autentikasi; semua operasi data tetap memerlukan token sesi backend.
- Jangan memberikan akses edit Spreadsheet kepada user aplikasi.
- Gunakan password unik dan rotasi Script Properties bila repository lama pernah memuat credential.
