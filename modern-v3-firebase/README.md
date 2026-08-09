# KBR Office Firebase + Blogger

Versi migrasi terpisah dengan Blogger sebagai shell frontend, bundle statis dari GitHub/jsDelivr, Firebase Authentication, Cloud Firestore, dan Google Apps Script untuk operasi administratif sensitif.

Panduan instalasi dan deployment lengkap tersedia di `MIGRATION_GUIDE.md`.

Versi modern terpisah dari aplikasi produksi PT Kolaka Bumi Realty. Folder ini mempertahankan kontrak Apps Script, schema entity, role, data Google Sheets, dan seluruh modul existing, tetapi memperbarui runtime frontend, resilience, motion, serta hardening backend tertentu.

Versi stabil di root repository tidak diubah oleh pekerjaan modernisasi ini.

## Struktur

```text
modern-v3/
|-- index.html            # Shell HTML produksi tanpa Babel runtime
|-- app.jsx               # Source React/JSX
|-- app.js                # Bundle produksi hasil build
|-- Code.gs               # Backend modern yang tetap kompatibel
|-- package.json          # Build reproducible dengan esbuild
|-- package-lock.json     # Versi dependency terkunci
|-- manifest.webmanifest
|-- service-worker.js
|-- offline.html
|-- icons/
|-- logo-kolakabumirealty.png
|-- bachground.png
`-- MODERNIZATION_REPORT.md
```

## Build

Prasyarat: Node.js dan npm.

```powershell
Set-Location modern-v3
npm.cmd install
npm.cmd run build
npm.cmd run check
```

Edit source di `app.jsx`, bukan `app.js`. Jalankan build setelah setiap perubahan JSX. File `app.js` harus ikut dideploy karena browser tidak mengompilasi JSX.

## Jalankan Lokal

Sajikan root repository dengan static server, lalu buka path `/modern-v3/`. Jangan membuka `index.html` melalui `file:///` karena service worker dan aturan origin tidak akan mewakili deployment produksi.

Contoh:

```powershell
npx.cmd http-server . -p 4175
```

URL lokal:

```text
http://127.0.0.1:4175/modern-v3/
```

## Deploy Frontend

Folder dapat dipublikasikan sebagai root repository/branch terpisah setelah uji penerimaan. Untuk deployment pada subpath, seluruh path PWA tetap relatif `./`.

Sebelum deploy:

1. Jalankan `npm.cmd run build` dan `npm.cmd run check`.
2. Pastikan `app.js`, `index.html`, manifest, worker, offline page, gambar, dan ikon ikut dipublikasikan.
3. Uji API URL `/exec` pada `app.jsx`/bundle.
4. Naikkan `CACHE_VERSION` bila application shell berubah.
5. Verifikasi worker baru mengontrol halaman dan cache baru berisi `app.js`.

## Deploy Backend

`Code.gs` dalam folder ini adalah versi hardening yang kompatibel dengan router existing. Deploy ke project Apps Script/Spreadsheet uji terlebih dahulu, lalu:

1. Uji GET health.
2. Uji login dan session dengan akun uji.
3. Uji dua request booking bersamaan pada unit uji yang sama; hanya satu boleh berhasil.
4. Uji file tepat di bawah 8 MB dan file di atas 8 MB.
5. Uji seluruh role dan permission.
6. Setelah lulus, deploy sebagai New version menggunakan URL `/exec` existing atau URL staging.

Jangan menempelkan secret ke source. Script Properties tetap dikonfigurasi langsung pada Apps Script.

## Perubahan Utama

- Babel standalone dihapus dari runtime produksi.
- JSX dipisahkan dari HTML dan dibangun menjadi bundle minified.
- Error boundary mencegah satu error render menjatuhkan halaman tanpa recovery UI.
- Request baca identik yang masih berjalan dideduplikasi.
- Global search menggunakan deferred value agar input tetap responsif.
- Session restore dilindungi dari penyelesaian ganda antara timeout dan response.
- Transisi view, submenu, dropdown, modal, sidebar, toast, dan dashboard diselaraskan.
- `prefers-reduced-motion` dihormati.
- Focus-visible diperjelas untuk keyboard.
- Service worker memakai cache modern terpisah dan menyimpan `app.js`.
- Anti-double-booking dan validasi user dilakukan di dalam script lock.
- Batas upload 8 MB ditegakkan di backend, bukan hanya frontend.

## Batasan

- Login/CRUD produksi tidak diuji tanpa credential dan record uji yang disetujui.
- Approval state machine lintas modul belum ditegakkan backend karena urutan status dan otoritas approver harus ditetapkan sebagai aturan bisnis resmi.
- Migrasi password hash ke algoritma salted/versioned memerlukan strategi kompatibilitas dan reset/migrasi pengguna.
- Source masih satu file JSX besar. Build-time compilation sudah mengurangi beban runtime, tetapi modularisasi per domain sebaiknya dilakukan bertahap setelah regression test tersedia.
