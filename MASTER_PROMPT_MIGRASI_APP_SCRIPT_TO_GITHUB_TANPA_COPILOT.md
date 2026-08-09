# MASTER PROMPT MIGRASI APP SCRIPT TO GITHUB - VERSI TANPA GITHUB COPILOT

Dokumen ini dapat dipakai sebagai spesifikasi kerja untuk developer, tim engineering, konsultan, atau AI coding assistant selain GitHub Copilot. Tidak ada langkah yang bergantung pada fitur Copilot. Ganti semua nilai dalam `KONFIGURASI_CUSTOM` sebelum digunakan.

## KONFIGURASI_CUSTOM

```yaml
nama_aplikasi: "NAMA APLIKASI"
nama_perusahaan: "NAMA PERUSAHAAN"
tujuan_bisnis: "TUJUAN APLIKASI"
github_owner: "USERNAME_GITHUB"
github_repository: "NAMA_REPOSITORY"
branch_produksi: "main"
github_pages_url: "https://USERNAME_GITHUB.github.io/NAMA_REPOSITORY/"
apps_script_exec_url: "ISI_SETELAH_DEPLOYMENT"
timezone: "Asia/Jakarta"
bahasa_ui: "id-ID"

source_backend: "Code.gs"
source_frontend: "Index.html"
output_backend: "Code.gs"
output_frontend: "index.html"

database:
  jenis: "Google Sheets"
  spreadsheet: "SPREADSHEET_EXISTING"
  sheet_dan_header: "INVENTARISASI_DARI_SOURCE"
  larangan_hapus_data: true

role_dan_permission: "INVENTARISASI_DARI_SOURCE"
fitur_wajib: "INVENTARISASI_DARI_SOURCE"

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
  strategi_offline: "fallback-only"

repository_public: true
pertahankan_repository_lama: true
batas_upload_mb: 8
```

## TUGAS

Bertindak sebagai tim Senior Software Architect, Google Apps Script Engineer, Frontend Engineer, Security Engineer, GitHub Pages Engineer, PWA Engineer, UI/UX Engineer, dan QA Engineer.

Migrasikan frontend aplikasi Google Apps Script ke GitHub Pages, dengan ketentuan:

```text
Frontend: GitHub Pages
Backend: Google Apps Script Web App
Database: Google Sheets existing
Source control: GitHub
Komunikasi: HTTPS fetch JSON
```

Backend dan database tidak boleh diganti dengan Node.js, Express, PHP, Firebase, Supabase, MySQL, PostgreSQL, atau platform lain. Seluruh fitur aplikasi lama harus dipertahankan.

## DELIVERABLE

Hasilkan minimal:

```text
Code.gs
index.html
README.md
REBUILD_ANALYSIS.md
TEST_REPORT.md
```

Jika PWA aktif, hasilkan juga:

```text
manifest.webmanifest
service-worker.js
offline.html
icons/icon-192.png
icons/icon-512.png
icons/icon-maskable-512.png
```

## FASE 1 - INVENTARISASI

Baca seluruh source lama dan dokumentasikan:

1. fungsi backend dan fungsi publik;
2. semua penggunaan `google.script.run`;
3. struktur Sheet, header, ID, dan format data;
4. menu, halaman, dashboard, form, tabel, dan modal;
5. CRUD, search, filter, sort, pagination;
6. autentikasi, session, role, dan permission;
7. upload/download, Drive, email, trigger, backup/restore;
8. kalkulasi dan business rule;
9. library/CDN/aset;
10. credential atau secret dalam source;
11. risiko migrasi dan test case.

Tuliskan hasilnya ke `REBUILD_ANALYSIS.md`. Jangan mulai refactor besar sebelum peta call frontend-ke-backend dan struktur data selesai.

## FASE 2 - BACKUP DAN NORMALISASI

1. Buat backup source dan catat commit awal.
2. Ubah file berkonten Apps Script/HTML yang salah ekstensi menjadi `Code.gs` dan `index.html`.
3. Gunakan `index.html` huruf kecil karena GitHub Pages dan filesystem case-sensitive dapat berbeda dari Windows.
4. Jangan hapus file sumber sebelum hasil produksi tervalidasi.
5. Pertahankan UTF-8 dan perbaiki mojibake secara selektif.
6. Gunakan path aset relatif terhadap root repository.

## FASE 3 - API GOOGLE APPS SCRIPT

Tambahkan endpoint Web App tanpa menghapus fungsi bisnis existing:

```javascript
function doGet(e) {
  return jsonResponse_({
    success: true,
    data: { service: "NAMA APLIKASI API", status: "ok", timestamp: new Date().toISOString() }
  });
}

function doPost(e) {
  try {
    var body = JSON.parse((e.postData && e.postData.contents) || "{}");
    var data = routeApiAction_(body.action, body.token || "", body.args || []);
    return jsonResponse_({ success: true, data: data });
  } catch (error) {
    return jsonResponse_({ success: false, message: safeErrorMessage_(error) });
  }
}
```

Gunakan envelope:

```json
{ "success": true, "data": {} }
```

atau:

```json
{ "success": false, "message": "Pesan aman" }
```

Router harus berupa allowlist eksplisit. Setiap action wajib menetapkan apakah membutuhkan session, role, permission, dan validasi argumen. Jangan memakai evaluasi nama fungsi dinamis.

## FASE 4 - TRANSPORT FRONTEND

Jika aplikasi memakai `google.script.run`, pertahankan call site sebisa mungkin dan ganti adapter terpusat menjadi `fetch()`.

Pola yang direkomendasikan:

```javascript
async function apiCall(action, ...args) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, token: getSessionToken(), args }),
      redirect: "follow",
      credentials: "omit",
      signal: controller.signal
    });

    const text = await response.text();
    const payload = JSON.parse(text);
    if (!response.ok || !payload.success) {
      throw new Error(payload.message || "Request gagal");
    }
    return payload.data;
  } finally {
    clearTimeout(timeout);
  }
}
```

Gunakan `Content-Type: text/plain;charset=utf-8` agar request termasuk CORS simple request dan tidak memicu preflight `OPTIONS`. Gunakan `redirect: "follow"` karena Apps Script dapat mengalihkan response ke domain `script.googleusercontent.com`.

Tangani timeout, response non-JSON, URL belum dikonfigurasi, session kedaluwarsa, network error, dan pesan backend.

## FASE 5 - SECURITY

1. Pindahkan credential dari source ke Apps Script Script Properties.
2. Jangan meminta atau menyimpan secret dalam issue, chat, README, frontend, atau repository.
3. Hash password dan jangan mengembalikan hash/password ke frontend.
4. Lakukan permission check di backend untuk setiap action/entity.
5. Terapkan rate limiting login bila tersedia.
6. Validasi upload dan batasi ukuran file.
7. Gunakan `LockService` untuk operasi yang dapat bertabrakan.
8. Audit aksi login, perubahan data, permission, backup, dan restore bila relevan.
9. Jangan memberi user aplikasi akses edit langsung ke Spreadsheet.

## FASE 6 - UI DAN RESPONSIVE

1. Pertahankan workflow dan terminologi aplikasi lama.
2. Gunakan aset logo/background dari file, bukan base64 besar.
3. Pastikan card login responsif dengan `max-width`, padding adaptif, dan `box-sizing: border-box`.
4. Bila background harus terlihat utuh pada desktop, gunakan gambar utama `contain` di atas layer pengisi `cover`.
5. Pada smartphone gunakan `cover` dan atur focus position.
6. Untuk card center gunakan flex `align-items: center; justify-content: center` dan verifikasi pusatnya secara numerik.
7. Uji minimal 390x844, tablet, 1366x768, dan 1440x900.
8. Pastikan tidak ada horizontal overflow, teks terpotong, atau kontrol keluar viewport.

## FASE 7 - PWA

Jika PWA aktif:

1. Buat manifest dengan `display: standalone`.
2. Gunakan `id`, `start_url`, dan `scope` relatif `./` agar cocok pada `https://OWNER.github.io/REPOSITORY/`.
3. Buat ikon 192, 512, dan maskable 512 dengan safe zone.
4. Registrasikan worker `./service-worker.js` dengan scope `./`.
5. Cache shell same-origin saja.
6. Jangan cache POST, Apps Script API, token, atau data user.
7. Gunakan fallback offline yang menjelaskan internet dibutuhkan.
8. Naikkan `CACHE_VERSION` pada setiap perubahan frontend penting.
9. Uji installability Android, iOS, Chrome desktop, dan Edge desktop.

## FASE 8 - VALIDASI

Lakukan berurutan dan catat hasilnya:

1. syntax/diagnostics semua file;
2. pencarian sisa `google.script.run`;
3. pencocokan semua action frontend dengan router backend;
4. GET health `/exec`;
5. POST action aman/non-mutating;
6. static server lokal, bukan `file:///`;
7. render desktop dan mobile;
8. pengukuran overflow dan posisi elemen;
9. uji CORS menggunakan browser dari origin frontend;
10. uji manifest, worker scope, controller, dan cache;
11. uji login dengan credential yang dimasukkan pengguna langsung;
12. CRUD hanya memakai record uji terkontrol;
13. verifikasi Sheet, AuditLog, Drive, dan trigger bila diizinkan.

Contoh curl Apps Script yang aman terhadap redirect dan quoting PowerShell:

```powershell
$json | curl.exe -sS -L `
  -H 'Content-Type: text/plain;charset=utf-8' `
  --data-binary '@-' `
  'https://script.google.com/macros/s/DEPLOYMENT_ID/exec'
```

## FASE 9 - DEPLOYMENT

### Apps Script

1. Hubungkan project ke Spreadsheet existing yang benar.
2. Atur timezone.
3. Atur Script Properties secara manual dan rahasia.
4. Deploy Web App sebagai pemilik.
5. Pilih akses sesuai arsitektur; frontend publik biasanya membutuhkan endpoint dapat diakses tanpa Google login, sementara autentikasi aplikasi tetap wajib.
6. Gunakan URL `/exec`.
7. Setiap perubahan backend memerlukan New version pada deployment.

### GitHub

1. Pastikan repository target benar.
2. Jika repository sudah ada, periksa isinya sebelum push.
3. Jangan menimpa project lain.
4. Push branch produksi.
5. Aktifkan Pages dari branch produksi dan `/ (root)`.
6. Tunggu workflow Pages untuk commit SHA terbaru sampai sukses.
7. Verifikasi file live, bukan hanya status workflow.
8. Pertahankan repository lama sebagai cadangan kecuali penghapusan disetujui.

## TRIK DAN TROUBLESHOOTING

- **Apps Script POST gagal di PowerShell tetapi curl/browser berhasil:** gunakan `curl.exe -L` dan body dari stdin.
- **CORS/preflight gagal:** jangan gunakan `application/json` atau custom header; gunakan `text/plain;charset=utf-8`.
- **GitHub Pages 404:** periksa apakah workflow masih building dan file root bernama `index.html` huruf kecil.
- **Perubahan PWA tidak terlihat:** naikkan cache version, tunggu worker activate, lalu reload/tutup-buka aplikasi.
- **`npx.ps1` diblokir Windows:** gunakan `npx.cmd` tanpa mengubah execution policy.
- **Git tidak tersedia:** gunakan distribusi Git portable resmi atau instal Git; jangan mengunduh binary dari sumber tidak tepercaya.
- **Nama repository target sudah ada:** periksa apakah kosong; isi repository kosong atau gunakan nama lain. Jangan menimpa repository berisi data.
- **Background terpotong:** bedakan kebutuhan `contain` (gambar utuh) dan `cover` (layar penuh); gunakan dua layer bila keduanya dibutuhkan.
- **Logo gagal karena spasi nama file:** gunakan URL encoded path seperti `%20`, atau lebih baik normalisasi nama file sebelum deployment.
- **Status Pages tidak sinkron:** verifikasi workflow Actions, commit SHA, dan artefak live dengan cache-busting query.
- **Python Windows hanya alias Store:** gunakan static server lain, misalnya Live Server atau `npx.cmd http-server`.

## KRITERIA PENERIMAAN

- [ ] Arsitektur target dipertahankan.
- [ ] Seluruh fitur lama dipetakan dan tidak sengaja hilang.
- [ ] Database existing tidak rusak atau berubah tanpa migrasi.
- [ ] API menggunakan router allowlist dan envelope konsisten.
- [ ] Backend menegakkan session/permission.
- [ ] Secret tidak berada di repository.
- [ ] Frontend berjalan dari GitHub Pages subpath.
- [ ] CORS browser ke Apps Script berhasil.
- [ ] Desktop dan smartphone responsif tanpa overflow.
- [ ] PWA installable jika diaktifkan.
- [ ] Cache PWA tidak menyimpan API/data sensitif.
- [ ] Workflow Pages sukses pada commit terbaru.
- [ ] Dokumentasi dan laporan pengujian sesuai fakta.

## FORMAT SERAH TERIMA

Serahkan:

1. URL GitHub repository;
2. URL GitHub Pages;
3. URL health Apps Script atau cara memeriksanya;
4. commit SHA produksi;
5. daftar file dan perubahan;
6. hasil uji desktop/mobile/API/PWA;
7. langkah konfigurasi Script Properties tanpa menyebut nilainya;
8. risiko atau pengujian yang belum selesai;
9. prosedur update frontend, backend, dan cache PWA.
