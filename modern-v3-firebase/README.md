# KBR Office Firebase + Blogger

Versi migrasi terpisah dengan Blogger sebagai shell frontend, bundle statis dari GitHub/jsDelivr, Firebase Authentication, Cloud Firestore, dan Google Apps Script untuk operasi administratif sensitif.

Panduan instalasi dan deployment lengkap tersedia di `MIGRATION_GUIDE.md`.

Versi modern terpisah dari aplikasi produksi PT Kolaka Bumi Realty. Folder ini mempertahankan kontrak Apps Script, schema entity, role, data Google Sheets, dan seluruh modul existing, tetapi memperbarui runtime frontend, resilience, motion, serta hardening backend tertentu.

## Model Arsitektur (Hybrid, 2026-08)

- **Cloud Firestore** = database primer untuk CRUD non-privileged langsung dari klien (diatur `firestore.rules`).
- **Apps Script Web App** (`apps-script/Code.gs`) = API privileged (users, transaksi, booking, finance, backup, audit) dengan verifikasi Firebase ID token; menulis ke Firestore via REST **dalam transaksi** dengan retry.
- **Google Sheets** (`Code.gs` di root folder ini) = jalur warisan yang masih berfungsi dan dipelihara; TIDAK lagi database primer untuk varian ini.
- PWA jujur soal status data: antrean offline IndexedDB (`offline-queue.js`) + badge "menunggu sinkron"; mutasi privileged tidak pernah masuk antrean offline.

## Struktur

```text
modern-v3-firebase/
|-- index.html                 # Shell HTML produksi
|-- app.jsx                    # Source React/JSX
|-- app.js                     # Bundle produksi hasil esbuild (~1.4 MB: Firebase SDK + mammoth ikut terbundle)
|-- offline-queue.js           # Antrean mutasi offline (IndexedDB)
|-- firebase-client.js         # Auth + Firestore client + proxy admin
|-- runtime-config.js          # Konfigurasi publik (hosting sendiri)
|-- blogger-runtime-config.js  # Konfigurasi publik (Blogger)
|-- Code.gs                    # Backend legacy Google Sheets (warisan, masih berfungsi)
|-- apps-script/Code.gs        # Admin API privileged -> Firestore REST (transaksional)
|-- firestore.rules            # Rules RBAC (status case-insensitive, pengguna Superadmin-only read)
|-- storage.rules              # Storage ditutup total
|-- firebase.json / firestore.indexes.json
|-- blogger-template.xml       # Shell Blogger (tanpa service worker — batasan platform)
|-- blogger-manifest.webmanifest / manifest.webmanifest
|-- service-worker.js / offline.html / icons/
|-- templates/ + tools/generate-word-template.js   # Generator template surat .docx
|-- tools/update-pins.js       # Satukan pin CDN jsDelivr ke satu commit SHA
|-- package.json               # Build + test reproducible (npm run build / npm test)
|-- formula.test.js / admin-api.test.js / architecture.test.js
|-- MIGRATION_GUIDE.md / MODERNIZATION_REPORT.md
`-- logo-kolakabumirealty.png, bachground.png
```

## Build

Prasyarat: Node.js dan npm.

```powershell
Set-Location modern-v3-firebase
npm.cmd install
npm.cmd run build
npm.cmd test
```

Edit source di `app.jsx`, bukan `app.js`. Jalankan build setelah setiap perubahan JSX. File `app.js` harus ikut dideploy karena browser tidak mengompilasi JSX.

## Jalankan Lokal

Sajikan root repository dengan static server, lalu buka path `/modern-v3-firebase/`. Jangan membuka `index.html` melalui `file:///` karena service worker dan aturan origin tidak akan mewakili deployment produksi.

Contoh:

```powershell
npx.cmd http-server . -p 4175
```

URL lokal:

```text
http://127.0.0.1:4175/modern-v3-firebase/
```

## Deploy Frontend

Folder dapat dipublikasikan sebagai root repository/branch terpisah setelah uji penerimaan. Untuk deployment pada subpath, seluruh path PWA tetap relatif `./`.

Sebelum deploy:

1. Jalankan `node tools/update-pins.js <commit-sha>` agar SEMUA referensi jsDelivr (app.js, manifest, logo, config) memakai SATU commit SHA — jangan pernah `@main` untuk produksi.
2. Jalankan `npm.cmd run build` dan `npm.cmd test`.
3. Pastikan `app.js`, `index.html`, manifest, worker, offline page, gambar, dan ikon ikut dipublikasikan.
4. Uji URL `/exec` pada `blogger-runtime-config.js`.
5. Naikkan `CACHE_VERSION` bila application shell berubah.
6. Verifikasi worker baru mengontrol halaman dan cache baru berisi `app.js`.
7. Deploy rules: `npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage`.

## Deploy Backend

Ada dua backend Apps Script:

1. **Admin API Firestore** (`apps-script/Code.gs`) — deploy via clasp/editor ke project GAS yang terikat GCP project Firebase; Script Properties: `FIREBASE_PROJECT_ID`, `FIREBASE_WEB_API_KEY`. Acceptance: health GET, login/session, dua request booking bersamaan (hanya satu berhasil), restore backup dry-run di project staging.
2. **Legacy Sheets** (`Code.gs`) — jalur warisan; deploy sebagai versi baru hanya bila jalur ini masih dipakai produksi.

Setelah deploy pertama kali pasca-hardening, jalankan SEKALI fungsi `normalizeUserProfileStatuses()` di editor Apps Script untuk menormalkan casing status & `createdAt` profil user existing.

Jangan menempelkan secret ke source. Script Properties tetap dikonfigurasi langsung pada Apps Script.

## Keamanan (wajib sebelum produksi)

- Isi `appCheckSiteKey` (reCAPTCHA v3) di kedua file runtime-config, jalankan mode monitor App Check, lalu enforce setelah trafik staging valid.
- Restrict Firebase Web API key di GCP console (HTTP referrer: domain Blogger + hosting).
- Opsional: hash credential superadmin legacy via `kredensialPasswordSuperadmin()` → simpan ke `SUPERADMIN_PASSWORD_HASH`, hapus property plaintext.

## Perubahan Utama

- Babel standalone dihapus dari runtime produksi.
- JSX dipisahkan dari HTML dan dibangun menjadi bundle minified (Firebase SDK + mammoth ikut terbundle; lazy-split tidak memungkinkan pada format IIFE).
- Error boundary mencegah satu error render menjatuhkan halaman tanpa recovery UI.
- Request baca identik yang masih berjalan dideduplikasi.
- Global search menggunakan deferred value agar input tetap responsif.
- Session restore dilindungi dari penyelesaian ganda antara timeout dan response.
- Transisi view, submenu, dropdown, modal, sidebar, toast, dan dashboard diselaraskan.
- `prefers-reduced-motion` dihormati.
- Focus-visible diperjelas untuk keyboard.
- Service worker memakai cache modern terpisah dan menyimpan `app.js`.
- Anti-double-booking dan validasi user dilakukan di dalam script lock (legacy) dan transaksi Firestore (admin API).
- Batas upload 8 MB ditegakkan di backend, bukan hanya frontend.

## Remediasi Audit 2026-08

- `firestore.rules`: read direktori pengguna dibatasi Superadmin; status dicek case-insensitive; `createdAt` immutable.
- Admin API (`apps-script/Code.gs`): penulisan transaksional dengan retry contention; double-booking diverifikasi dalam snapshot transaksi; restore backup tulis-dulu-hapus-belakangan + laporan detail; kontrak respons `{success,message,data,error}` dengan kode error stabil dan pesan tersanitasi; rate limit per-user untuk aksi berat; `deleteFile_` ter-scope folder aplikasi; ringkasan keuangan diagregasi nyata (tanpa stub).
- Registry entitas disatukan & divalidasi test: duplikat `arsipdokumen` dihapus, `booking` + entitas warisan masuk cakupan backup/restore/search.
- Legacy Sheets: hashing password salted+iterated (`sha256s:`), dukungan `SUPERADMIN_PASSWORD_HASH`, pesan login seragam (anti user-enumeration).
- PWA: antrean offline IndexedDB + badge pending-vs-synced; SW hardening (fallback fetch, cache per-URL, Background Sync listener).
- Aksesibilitas: focus trap + Escape pada modal, aria-live toast, aria-label tombol ikon; side effect render dihapus.

## Batasan

- Login/CRUD produksi tidak diuji tanpa credential dan record uji yang disetujui.
- Approval state machine lintas modul belum ditegakkan backend karena urutan status dan otoritas approver harus ditetapkan sebagai aturan bisnis resmi.
- Password hash lama (plaintext/unsalted) tetap diverifikasi demi kompatibilitas; upgrade ke format salted terjadi otomatis saat user mengganti password. Jalankan reset massal bila ingin memaksa migrasi penuh.
- Source masih satu file JSX besar. Build-time compilation sudah mengurangi beban runtime, tetapi modularisasi per domain sebaiknya dilakukan bertahap setelah regression test tersedia.
- Blogger tidak dapat mendaftarkan service worker (batasan platform); fitur offline/PWA hanya aktif pada hosting non-Blogger.
- App Check belum aktif sampai `appCheckSiteKey` diisi dan enforcement dinyalakan bertahap.
- Formula-injection Sheets dinilai berisiko laten rendah: record ditulis sebagai satu string JSON (diawali `{`) sehingga tidak pernah dievaluasi sebagai formula oleh Sheets. Sanitasi nilai per-field sengaja TIDAK dilakukan karena berisiko merusak data sah (mis. nomor telepon "+62…"). Bila kelak ada fitur ekspor CSV, escaping wajib ditambahkan di titik ekspor.
