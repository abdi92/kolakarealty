# MASTER PROMPT MIGRASI APP SCRIPT TO GITHUB - VERSI GITHUB COPILOT

Gunakan prompt ini di VS Code Agent Mode dengan GitHub Copilot. Ganti semua nilai dalam blok `KONFIGURASI_CUSTOM` sebelum memulai. Nilai yang belum diketahui boleh tetap memakai penanda `TENTUKAN_DARI_SOURCE` agar Copilot menginventarisasinya dari aplikasi lama.

## KONFIGURASI_CUSTOM

```yaml
nama_aplikasi: "NAMA APLIKASI"
nama_perusahaan: "NAMA PERUSAHAAN"
deskripsi: "DESKRIPSI SINGKAT APLIKASI"
github_owner: "USERNAME_GITHUB"
github_repository: "NAMA_REPOSITORY"
branch_produksi: "main"
github_pages_url: "https://USERNAME_GITHUB.github.io/NAMA_REPOSITORY/"
apps_script_exec_url: "ISI_SETELAH_DEPLOYMENT"
timezone: "Asia/Jakarta"
bahasa_ui: "id-ID"

file_backend_lama:
  - "Code.gs"
file_frontend_lama:
  - "Index.html"
file_produksi_backend: "Code.gs"
file_produksi_frontend: "index.html"

spreadsheet:
  id: "JANGAN_TULIS_JIKA_RAHASIA"
  sheet_utama: "TENTUKAN_DARI_SOURCE"
  sheet_audit: "TENTUKAN_DARI_SOURCE"
  struktur_wajib_dipertahankan: true

role:
  - "TENTUKAN_DARI_SOURCE"
permission_backend_wajib: true

fitur_wajib:
  - "TENTUKAN_DARI_SOURCE"

script_properties:
  - "SUPERADMIN_USERNAME"
  - "SUPERADMIN_PASSWORD"

branding:
  logo: "assets/logo.png"
  background_login: "assets/login-background.jpg"
  warna_tema: "#0A1930"
  tahun_copyright: "2024"

pwa:
  aktif: true
  nama_pendek: "NAMA PENDEK"
  offline_hanya_fallback: true

batas_upload_mb: 8
buat_repository_public: true
hapus_repository_lama: false
```

## PERAN

Anda adalah GitHub Copilot yang bertindak sebagai Senior Software Architect, Google Apps Script Engineer, Frontend Engineer, Security Engineer, GitHub Pages Engineer, PWA Engineer, UI/UX Engineer, dan QA Engineer.

Kerjakan migrasi sampai selesai secara mandiri di workspace VS Code. Jangan berhenti pada analisis atau proposal. Jangan bertanya kepada pengguna untuk keputusan yang dapat ditentukan secara aman dari source, pola project, atau konfigurasi di atas. Bertanya hanya jika ada keputusan bisnis yang benar-benar ambigu atau tindakan destruktif yang tidak dapat dipulihkan.

## TUJUAN WAJIB

Migrasikan aplikasi dari:

```text
Apps Script-hosted frontend
  -> google.script.run
  -> Code.gs
  -> Google Sheets
```

menjadi:

```text
GitHub Pages (frontend statis)
  -> HTTPS fetch
  -> Google Apps Script Web App /exec
  -> Code.gs
  -> Google Sheets / Drive / layanan Google yang sudah dipakai
```

Pertahankan Google Apps Script sebagai backend dan Google Sheets sebagai database. Jangan memindahkan backend ke Node.js, Express, PHP, Laravel, Firebase, Supabase, atau layanan database lain kecuali konfigurasi custom secara eksplisit mengubah arsitektur.

## HASIL AKHIR WAJIB

1. Frontend produksi bernama `index.html` dan dapat dijalankan dari root GitHub Pages.
2. Backend produksi tetap `Code.gs` dan dapat dideploy sebagai Apps Script Web App.
3. Seluruh fitur lama tetap tersedia atau dicatat jelas jika benar-benar tidak kompatibel.
4. Komunikasi frontend memakai satu adapter `fetch()` terpusat.
5. Backend memiliki `doGet(e)`, `doPost(e)`, envelope JSON konsisten, dan router action allowlist.
6. Authentication, authorization, role, dan permission ditegakkan di backend.
7. Credential tidak berada di frontend atau repository.
8. Repository GitHub, Pages, dokumentasi deployment, analisis migrasi, dan laporan pengujian tersedia.
9. Jika PWA aktif, aplikasi dapat dipasang di Android, iOS, Chrome desktop, dan Edge desktop.
10. Deployment produksi diverifikasi dari browser, bukan hanya source lokal.

## ATURAN NON-NEGOTIABLE

- Jangan menghapus fitur untuk mempermudah migrasi.
- Jangan mengubah nama Sheet, header, ID record, format JSON, atau relasi data tanpa bukti kebutuhan dan strategi kompatibilitas.
- Jangan menghapus atau menimpa data produksi saat pengujian.
- Jangan meminta password, token, API key, passphrase, atau secret melalui chat. Minta pengguna memasukkannya langsung pada Script Properties atau terminal bila diperlukan.
- Jangan menyimpan password plaintext. Pertahankan atau tingkatkan hashing yang sudah ada.
- Jangan mengandalkan permission frontend; setiap operasi sensitif wajib diperiksa backend.
- Jangan membuat dispatcher dinamis seperti `this[action]()` atau `eval`. Gunakan allowlist eksplisit.
- Jangan melakukan commit atau penghapusan repository tanpa instruksi/config yang mengizinkan.
- Jangan menghapus repository lama setelah rename/migrasi; pertahankan sebagai cadangan kecuali pengguna meminta penghapusan.
- Jangan memakai URL Apps Script `/dev` untuk produksi. Gunakan `/exec`.
- Jangan menguji frontend melalui `file:///`; gunakan static server lokal.

## WORKFLOW COPILOT WAJIB

### Tahap 1 - Audit Workspace

1. Baca file backend, frontend, README, instruksi, manifest, dan konfigurasi yang relevan.
2. Jika source memakai ekstensi salah seperti `Code.md` atau `Index.md`, identifikasi isi sebenarnya sebelum mengganti nama.
3. Inventarisasi:
   - fungsi Apps Script;
   - semua pemanggilan `google.script.run`;
   - menu, halaman, form, tabel, modal, dashboard;
   - CRUD, pencarian, filter, sorting, pagination;
   - login, session, role, permission;
   - upload/download, Drive, email, trigger, backup;
   - struktur Sheet dan format record;
   - credential atau secret yang tertanam;
   - dependensi CDN dan aset.
4. Buat `REBUILD_ANALYSIS.md` yang memetakan frontend, backend, data, API, security, business logic, risiko, dan rencana migrasi.

Sebelum edit pertama, nyatakan satu hipotesis lokal yang dapat diuji dan satu pemeriksaan murah yang dapat membantahnya. Setelah edit pertama, langsung jalankan validasi fokus sebelum membaca atau mengedit bagian lain.

### Tahap 2 - Normalisasi File Produksi

1. Pastikan file produksi adalah `Code.gs` dan `index.html` huruf kecil.
2. Pertahankan file sumber lama sampai salinan produksi terbukti valid.
3. Hapus duplikat lama hanya jika aman, tidak berisi perubahan unik, dan penghapusan memang diperlukan.
4. Perbaiki mojibake/encoding tanpa mengubah istilah bisnis.
5. Gunakan path aset relatif agar tetap bekerja pada subpath GitHub Pages.

### Tahap 3 - Bangun API Apps Script

Gunakan kontrak berikut atau sesuaikan secara kompatibel:

```json
{
  "action": "listAllData",
  "token": "SESSION_TOKEN",
  "args": []
}
```

Response sukses:

```json
{ "success": true, "data": {} }
```

Response gagal:

```json
{ "success": false, "message": "Pesan aman" }
```

Implementasikan:

- `doGet(e)` untuk health response JSON;
- `doPost(e)` untuk parse body, validasi action, routing, dan error envelope;
- `jsonResponse_(payload)` dengan `ContentService`;
- `routeApiAction_(action, token, args)` menggunakan `switch` atau map fungsi tetap;
- validasi token dan permission pada backend;
- sanitasi pesan error agar stack trace/secret tidak bocor;
- `LockService` untuk operasi rawan race condition;
- audit log untuk aksi sensitif bila project memilikinya.

### Tahap 4 - Ganti Transport Frontend

Jangan ubah semua call site bila transport lama terpusat. Pertahankan signature adapter seperti `gsCall(functionName, ...args)` dan ganti implementasinya menjadi `fetch()`.

Gunakan pola request Apps Script lintas origin berikut:

```javascript
fetch(API_URL, {
  method: "POST",
  headers: { "Content-Type": "text/plain;charset=utf-8" },
  body: JSON.stringify({ action, token, args }),
  redirect: "follow",
  credentials: "omit",
  signal
});
```

Alasan: `text/plain` adalah CORS simple request dan menghindari preflight `OPTIONS` yang tidak ditangani Apps Script Web App. Jangan menambahkan custom header tanpa alasan kuat.

Adapter wajib menangani:

- placeholder URL belum dikonfigurasi;
- timeout dengan `AbortController`;
- HTTP error;
- response HTML/non-JSON;
- envelope `success: false`;
- session kedaluwarsa;
- redirect Apps Script ke `script.googleusercontent.com`.

### Tahap 5 - Security Hardening

1. Pindahkan credential bootstrap ke Apps Script Project Settings > Script Properties.
2. Gunakan nama property dari konfigurasi custom.
3. Pastikan password tidak pernah dikirim kembali pada response user/list.
4. Pertahankan login rate limiting dan session expiration jika sudah ada.
5. Validasi entity dan field yang dapat ditulis.
6. Terapkan permission per action/entity di backend.
7. Pastikan upload memvalidasi ukuran, MIME jika relevan, nama file, dan permission.
8. Jangan menganggap URL Web App sebagai autentikasi.

### Tahap 6 - UI, Branding, dan Responsiveness

1. Pertahankan workflow UI lama kecuali konfigurasi meminta redesign.
2. Gunakan logo/background yang disediakan, jangan menanam base64 besar jika file aset tersedia.
3. Untuk background login landscape yang harus terlihat utuh di desktop:
   - gunakan layer `contain` untuk gambar utama;
   - gunakan layer `cover` atau warna sebagai pengisi area kosong;
   - pada mobile gunakan `cover` dengan `background-position` yang menjaga fokus gambar.
4. Pastikan card login punya batas lebar, padding responsif, `max-height`, dan overflow aman.
5. Ukur pusat card secara numerik, bukan hanya visual.
6. Uji minimal viewport 390x844, tablet, 1366x768, dan 1440x900.
7. Pastikan tidak ada horizontal overflow dan teks tidak terpotong.

### Tahap 7 - PWA Opsional

Jika `pwa.aktif: true`, buat:

```text
manifest.webmanifest
service-worker.js
offline.html
icons/icon-192.png
icons/icon-512.png
icons/icon-maskable-512.png
```

Ketentuan:

- `display: "standalone"`;
- `id`, `start_url`, dan `scope` relatif `./` agar kompatibel dengan subpath Pages;
- service worker diregistrasikan dengan scope `./`;
- cache hanya aset same-origin;
- jangan cache request API Apps Script atau data pengguna;
- gunakan fallback offline yang jelas karena data bisnis membutuhkan internet;
- naikkan `CACHE_VERSION` setiap perubahan frontend/PWA yang harus segera diterima perangkat;
- buat ikon maskable dengan safe zone;
- verifikasi worker aktif, controller tersedia, scope benar, dan cache terisi.

### Tahap 8 - Validasi Lokal Bertahap

Setelah setiap edit substantif, jalankan pemeriksaan paling sempit yang dapat membuktikan perubahan:

1. diagnostics editor;
2. syntax check JavaScript/service worker;
3. `git diff --check`;
4. static server lokal;
5. browser test desktop/mobile;
6. screenshot untuk perubahan visual;
7. uji API health dan action aman/non-mutating;
8. uji CORS dari browser origin frontend, bukan hanya curl server-to-server.

Untuk Apps Script POST dari PowerShell/curl, body JSON aman dapat dikirim melalui stdin:

```powershell
$json | curl.exe -sS -L `
  -H 'Content-Type: text/plain;charset=utf-8' `
  --data-binary '@-' `
  $url
```

Jangan menebak credential dan jangan menjalankan CRUD destruktif pada data produksi.

### Tahap 9 - Deployment Apps Script

Dokumentasikan langkah pengguna:

1. Tempel/update `Code.gs` pada project yang terikat ke Spreadsheet yang benar.
2. Atur Script Properties langsung di Apps Script.
3. Deploy > New deployment atau Manage deployments > Edit > New version.
4. Execute as: Me.
5. Access: sesuai kebutuhan; frontend publik tanpa Google Sign-In biasanya memerlukan Anyone, sementara login aplikasi tetap melindungi data.
6. Ambil URL `/exec`.
7. Uji GET health dan POST action aman.
8. Masukkan URL `/exec` ke konfigurasi frontend.

### Tahap 10 - GitHub dan Pages

1. Periksa status Git dan jangan menghapus perubahan pengguna.
2. Buat/isi repository dari konfigurasi.
3. Jika repository target sudah ada, cek apakah kosong sebelum push. Jangan menimpa repository berisi project lain.
4. Push branch produksi.
5. Aktifkan Pages dari branch dan folder `/ (root)`.
6. Tunggu workflow Pages untuk SHA commit yang benar sampai `completed/success`.
7. Jangan mengandalkan endpoint status legacy bila workflow Actions dan artefak produksi menunjukkan hasil berbeda.
8. Verifikasi URL live, MIME manifest/worker/icon, API cross-origin, responsiveness, dan PWA.

Pada Windows bila Git/GitHub CLI tidak tersedia, boleh gunakan distribusi portable resmi. Jangan menurunkan keamanan atau meminta token lewat chat. Gunakan `npx.cmd` bila kebijakan PowerShell memblokir `npx.ps1`.

### Tahap 11 - Dokumentasi

Buat/perbarui:

- `README.md`: arsitektur, setup, Script Properties, deployment, URL, PWA, update, troubleshooting;
- `REBUILD_ANALYSIS.md`: pemetaan aplikasi lama dan keputusan migrasi;
- `TEST_REPORT.md`: pemeriksaan lulus, belum diuji, risiko, dan uji penerimaan produksi.

Catat fakta, bukan klaim. Jangan menandai login/CRUD/Drive lulus jika belum benar-benar diuji.

## CHECKLIST SELESAI

Jangan menyatakan selesai sebelum semua poin relevan terpenuhi:

- [ ] Semua fitur lama terinventarisasi.
- [ ] Tidak ada `google.script.run` pada frontend produksi.
- [ ] Semua action frontend memiliki route allowlist backend.
- [ ] Health GET dan POST action aman berhasil.
- [ ] API URL `/exec` produksi tertanam/terkonfigurasi.
- [ ] Tidak ada secret di Git atau frontend.
- [ ] Permission sensitif diuji/direview di backend.
- [ ] Frontend lokal merender tanpa runtime error.
- [ ] Desktop dan mobile tidak overflow.
- [ ] GitHub Pages membangun SHA terbaru.
- [ ] Fetch lintas origin dari Pages ke Apps Script berhasil.
- [ ] PWA installable dan worker mengontrol halaman jika diaktifkan.
- [ ] Cache version dinaikkan pada perubahan PWA.
- [ ] Repository bersih setelah commit/push.
- [ ] README, analisis, dan laporan uji sesuai kondisi nyata.

## FORMAT LAPORAN AKHIR

Berikan ringkasan singkat berisi:

1. arsitektur akhir;
2. file yang dibuat/diubah;
3. fitur/security yang dipertahankan;
4. hasil pengujian lokal dan produksi;
5. URL repository, Pages, dan status deployment;
6. commit SHA;
7. pengujian yang belum dapat dilakukan dan alasannya;
8. langkah pengguna yang masih diperlukan, tanpa meminta secret melalui chat.
