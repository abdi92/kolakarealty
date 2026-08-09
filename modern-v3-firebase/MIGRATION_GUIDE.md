# Migrasi Blogger + Firebase

## Arsitektur

```text
Blogger
  -> React app.js dari GitHub/jsDelivr
  -> Firebase Authentication
  -> Firestore untuk baca dan CRUD biasa
  -> Apps Script Admin API untuk user, approval, booking, keuangan, stok, file, backup, dan audit
```

`modern-v3` tidak diubah. Semua pekerjaan migrasi berada di folder ini.

## 1. Firebase

1. Buat project Firebase dan Web App.
2. Aktifkan Authentication > Email/Password.
3. Buat Cloud Firestore pada region produksi yang dipilih.
4. Tambahkan domain Blogger, domain custom, dan domain preview ke Authentication > Authorized domains.
5. Isi konfigurasi publik Firebase pada `runtime-config.js` dan `blogger-template.xml`.
6. Deploy Rules dari folder ini:

```powershell
npx.cmd firebase-tools login
npx.cmd firebase-tools use YOUR_PROJECT_ID
npx.cmd firebase-tools deploy --only firestore:rules,firestore:indexes,storage
```

Firebase Web API key bukan secret. Service-account JSON dan private key tidak boleh masuk repository atau template Blogger.

## 2. Superadmin Pertama

Bootstrap dilakukan satu kali melalui Firebase Console:

1. Authentication > Users > Add user.
2. Salin UID user tersebut.
3. Buat dokumen `users/{uid}` di Firestore:

```json
{
  "nama": "Super Admin",
  "username": "Superadmin",
  "email": "EMAIL_SUPERADMIN",
  "role": "Superadmin",
  "status": "Aktif"
}
```

Setelah bootstrap, Superadmin dapat membuat akun lain dari modul Pengguna. Password diproses Firebase Auth dan tidak disimpan di Firestore.

## 3. Apps Script Admin API

1. Buat project Apps Script dengan standard Google Cloud project yang sama dengan project Firebase.
2. Salin isi folder `apps-script/` ke project tersebut.
3. Pastikan akun deployer memiliki IAM `Firebase Authentication Admin` dan `Cloud Datastore User` pada project.
4. Tambahkan Script Properties:

```text
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_WEB_API_KEY=your-web-api-key
```

5. Jalankan satu fungsi dari editor untuk memberikan consent scope.
6. Deploy sebagai Web App: execute as deployer, access anyone. Endpoint tetap aman karena setiap request diverifikasi dengan Firebase ID token dan role Firestore.
7. Masukkan URL `/exec` ke `KBR_ADMIN_API_URL` pada kedua konfigurasi frontend.

Jangan menerima request administratif yang hanya membawa role dari browser. Backend ini selalu mengambil role ulang dari `users/{uid}`.

## 4. GitHub dan Blogger

1. Isi `YOUR_GITHUB_USER`, `YOUR_REPOSITORY`, konfigurasi Firebase, URL Apps Script, dan URL aset dalam `blogger-template.xml`.
2. Build dan validasi:

```powershell
npm.cmd install
npm.cmd run build
npm.cmd run check
```

3. Push folder ke GitHub.
4. Pastikan URL jsDelivr `app.js` dapat dibuka dan menghasilkan JavaScript, bukan halaman 404.
5. Upload `blogger-template.xml` melalui Theme > Restore.
6. Setelah rilis baru, gunakan tag Git atau purge cache jsDelivr agar versi bundle dapat diprediksi. Untuk produksi, URL bertag lebih aman daripada `@main`.

Blogger tidak menjalankan service worker aplikasi. File PWA hanya berlaku saat frontend dibuka melalui GitHub Pages/local preview.

## 5. Migrasi Data

Fungsi `migrateLegacySheetToFirestore()` tersedia di Apps Script dan membaca sheet `Data` dengan format `entity | id | value | updatedAt`. Jalankan hanya dari salinan project yang terikat ke Spreadsheet staging.

Urutan aman:

1. Backup Spreadsheet dan Drive.
2. Gunakan project Firebase staging.
3. Jalankan migrator dan catat hasil `migrated/skipped`.
4. Migrator sengaja melewati entity `pengguna`; akun dibuat melalui Firebase Auth agar UID valid.
5. Bandingkan jumlah record per entity.
6. Uji login, semua role, CRUD, double booking, approval, stok, audit, upload, dan backup.
7. Baru ulangi pada project produksi saat staging lulus.

## 6. App Check

Buat reCAPTCHA v3 App Check untuk domain Blogger, isi `appCheckSiteKey`, lalu aktifkan enforcement Firestore setelah trafik staging terbukti valid. Jangan mengaktifkan enforcement sebelum domain Blogger dan key diuji karena seluruh request frontend dapat ditolak.

## Batas Operasional

- Firestore Rules menolak seluruh write ke `users` dan `auditLogs` dari browser.
- Entity sensitif ditolak oleh Rules dan dialihkan ke Apps Script.
- Firebase Storage ditutup default; file saat ini tetap disimpan ke Google Drive melalui Apps Script.
- Reset dan perubahan password memakai Firebase Authentication, bukan hash Spreadsheet.
- Restore backup Firestore belum diaktifkan dari UI untuk mencegah overwrite massal tanpa prosedur recovery yang disetujui.