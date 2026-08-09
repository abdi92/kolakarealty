# MASTER PROMPT

## MIGRASI & REBUILD GOOGLE APPS SCRIPT → GITHUB FREE + GITHUB PAGES

Anda bertindak sebagai **Senior Full-Stack Engineer, Google Apps Script Engineer, Frontend Engineer, GitHub Engineer, UI/UX Engineer, Security Engineer, dan Software Architect**.

Saya memiliki aplikasi web yang saat ini sudah berjalan menggunakan:

* `Code.gs`
* `Index.html`
* Google Apps Script
* Google Sheets sebagai database

Saya ingin membangun ulang dan memindahkan **frontend aplikasi ke GitHub Pages**, tetapi **backend tetap menggunakan Google Apps Script dan database tetap menggunakan Google Sheets**.

JANGAN mengubah arsitektur menjadi Node.js, Express, PHP, Laravel, Firebase, Supabase, atau database lain.

---

# ARSITEKTUR TARGET WAJIB

Bangun aplikasi dengan arsitektur berikut:

```text
                    GITHUB FREE
                        │
                        │
                  GitHub Repository
                        │
             ┌──────────┴──────────┐
             │                     │
       Code.gs                Index.html
             │                     │
             ↓                     ↓
     Google Apps Script       GitHub Pages
          Backend              Frontend
             │                     │
             └──────────┬──────────┘
                        ↓
                  Google Sheets
                     Database
```

Secara teknis:

```text
USER
  │
  ↓
GitHub Pages
  │
  │ HTTPS
  ↓
Index.html
  │
  │ fetch()
  ↓
Google Apps Script Web App
  │
  │ Code.gs
  ↓
Google Sheets
```

---

# TUJUAN UTAMA

Ubah aplikasi lama yang sebelumnya:

```text
Google Apps Script
      │
      ├── Code.gs
      ├── Index.html
      │
      ↓
Google Sheets
```

menjadi:

```text
GitHub Free
      │
      ├── GitHub Repository
      │
      └── GitHub Pages
              │
              ↓
          Index.html
              │
              ↓
       Google Apps Script
          Code.gs
              │
              ↓
        Google Sheets
```

Tujuan utama:

* frontend dapat di-host di GitHub Pages
* source code tersimpan di GitHub
* backend tetap Apps Script
* database tetap Google Sheets
* aplikasi tetap memiliki seluruh fungsi lama
* aplikasi dapat dikembangkan dan di-custom dengan mudah melalui VS Code + GitHub Copilot
* tidak menggunakan server Node.js
* tidak menggunakan database baru

---

# ATURAN PALING PENTING

## 1. JANGAN MENGHILANGKAN FITUR

Aplikasi lama adalah sumber utama kebutuhan bisnis.

Baca dan pahami seluruh:

```text
Code.gs
Index.html
```

Identifikasi seluruh:

* menu
* halaman
* dashboard
* form
* tabel
* CRUD
* pencarian
* filter
* sorting
* pagination
* login
* authentication
* authorization
* role
* permission
* modal
* notifikasi
* validasi
* upload
* download
* export
* import
* laporan
* konfigurasi
* business logic
* komunikasi dengan Google Sheets
* fungsi Apps Script
* trigger jika ada
* integrasi eksternal jika ada

Jangan menghapus fitur hanya karena proses migrasi.

---

# 2. JANGAN MENGUBAH BACKEND

`Code.gs` tetap menjadi backend utama.

Jangan mengubah:

```text
Google Apps Script
```

menjadi:

```text
Node.js
Express
PHP
Laravel
Firebase
Supabase
```

Backend tetap:

```text
Code.gs
   ↓
Google Apps Script Web App
   ↓
Google Sheets
```

Jika terdapat fungsi backend yang perlu diperbaiki agar dapat dipanggil dari GitHub Pages, perbaiki secara aman tanpa menghilangkan fungsi existing.

---

# 3. JANGAN MENGUBAH DATABASE

Google Sheets tetap menjadi database.

Jangan memindahkan data ke:

* MySQL
* PostgreSQL
* MongoDB
* Firebase
* Supabase

Pertahankan struktur Spreadsheet yang sudah digunakan kecuali ada perbaikan yang benar-benar diperlukan.

Jangan menghapus data.

Jangan mengubah nama sheet secara sembarangan.

Jangan mengubah header kolom secara sembarangan.

---

# 4. REFACTOR FRONTEND

`Index.html` harus dapat berjalan sebagai static website di GitHub Pages.

Jika aplikasi lama menggunakan:

```javascript
google.script.run
```

ubah mekanisme komunikasi frontend menjadi:

```javascript
fetch()
```

yang memanggil:

```text
Google Apps Script Web App URL
```

Contoh arsitektur:

```text
Index.html
     │
     ↓
JavaScript
     │
     ↓
fetch()
     │
     ↓
Apps Script Web App
     │
     ↓
Code.gs
     │
     ↓
Google Sheets
```

---

# 5. APPS SCRIPT API

Jika diperlukan, buat endpoint API di `Code.gs`.

Gunakan:

```javascript
doGet(e)
```

dan/atau:

```javascript
doPost(e)
```

sesuai kebutuhan.

Pastikan backend dapat menerima request dari frontend GitHub Pages.

---

# 6. CORS

Perhatikan bahwa frontend akan berasal dari:

```text
https://USERNAME.github.io/REPOSITORY/
```

sedangkan backend berasal dari:

```text
https://script.google.com/
```

Implementasikan komunikasi yang kompatibel dengan kondisi tersebut.

Jika menggunakan `POST`, gunakan pendekatan yang kompatibel dengan Apps Script Web App.

Jangan mengandalkan custom HTTP header yang tidak dapat dibaca Apps Script Web App.

Jika authentication/token diperlukan, gunakan body request atau mekanisme yang kompatibel.

---

# 7. GOOGLE APPS SCRIPT WEB APP

Pastikan `Code.gs` dapat digunakan sebagai:

```text
Google Apps Script Web App
```

Konfigurasi target:

```text
Execute as:
Me

Who has access:
sesuai kebutuhan aplikasi
```

Jangan mengasumsikan konfigurasi deployment tanpa memeriksa kebutuhan authentication aplikasi.

---

# 8. API CONFIGURATION

Jangan hardcode URL Apps Script berulang kali di seluruh kode.

Gunakan satu konfigurasi.

Contoh:

```javascript
const API_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL";
```

atau konfigurasi yang lebih baik.

Semua request API harus menggunakan konfigurasi tersebut.

Contoh:

```javascript
fetch(API_URL, ...)
```

---

# 9. JANGAN MEMASUKKAN SECRET KE GITHUB

Jangan menyimpan:

```text
password
API secret
private key
token rahasia
credential
database password
```

di repository GitHub.

Jika ada credential sensitif:

* jangan commit
* jangan masukkan ke source code
* gunakan konfigurasi yang aman
* dokumentasikan cara memasukkannya

---

# 10. GOOGLE SHEETS SECURITY

Jangan pernah memberikan akses edit Spreadsheet secara langsung kepada user hanya karena frontend berada di GitHub Pages.

User harus berinteraksi melalui:

```text
GitHub Pages
     ↓
Apps Script
     ↓
Google Sheets
```

Apps Script menjadi lapisan backend.

---

# 11. AUTHENTICATION

Jika aplikasi lama sudah memiliki login:

PERTAHANKAN.

Analisis bagaimana login bekerja.

Pastikan:

```text
User
 ↓
Login
 ↓
Apps Script
 ↓
Validation
 ↓
Google Sheets
 ↓
Session/Auth
 ↓
Application
```

Jangan memindahkan password ke frontend.

Jangan menyimpan password plaintext di browser.

Jangan membuat sistem login baru yang merusak sistem lama.

Jika sistem lama memiliki kelemahan keamanan, perbaiki tanpa mengubah workflow pengguna.

---

# 12. UI/UX

Pertahankan:

* desain
* warna
* layout
* menu
* sidebar
* dashboard
* tabel
* form
* modal
* ikon
* tombol
* workflow

jika sudah sesuai dengan aplikasi lama.

Namun perbaiki:

* responsive
* mobile layout
* loading
* error state
* empty state
* accessibility
* performa
* konsistensi komponen

Target:

```text
Aplikasi lama
      ↓
UI/UX tetap familiar
      +
GitHub Pages compatible
```

---

# 13. RESPONSIVE

Pastikan aplikasi berjalan dengan baik pada:

```text
Desktop
Laptop
Tablet
Android
iPhone
```

Prioritaskan penggunaan aplikasi administrasi melalui smartphone.

---

# 14. STRUKTUR REPOSITORY

Gunakan struktur sederhana.

Minimal:

```text
PROJECT/
│
├── Index.html
├── Code.gs
└── README.md
```

Jika diperlukan untuk membuat frontend lebih rapi, boleh menggunakan:

```text
PROJECT/
│
├── Index.html
├── Code.gs
├── assets/
│   ├── css/
│   ├── js/
│   └── images/
│
└── README.md
```

Jangan membuat struktur berlebihan.

Jika `Index.html` sudah besar, boleh dipisahkan menjadi file frontend modular, tetapi hanya jika memberikan manfaat nyata dan tetap kompatibel dengan GitHub Pages.

---

# 15. GITHUB PAGES

Pastikan frontend dapat diakses melalui GitHub Pages.

Target:

```text
https://USERNAME.github.io/REPOSITORY/
```

Jangan menggunakan backend Node.js.

GitHub Pages hanya digunakan sebagai:

```text
STATIC FRONTEND HOSTING
```

---

# 16. GITHUB REPOSITORY

Repository harus berisi source code:

```text
Index.html
Code.gs
```

serta dokumentasi.

Buat:

```text
README.md
```

yang menjelaskan:

* nama aplikasi
* fungsi aplikasi
* struktur project
* cara menjalankan
* cara deploy Apps Script
* cara deploy GitHub Pages
* konfigurasi API URL
* konfigurasi Google Sheets
* cara update aplikasi
* troubleshooting

---

# 17. GOOGLE APPS SCRIPT DEPLOYMENT

Dokumentasikan langkah:

```text
1. Buka Apps Script
2. Upload/replace Code.gs
3. Deploy Web App
4. Copy Web App URL
5. Masukkan URL ke konfigurasi frontend
6. Push ke GitHub
7. Aktifkan GitHub Pages
```

---

# 18. LOCAL DEVELOPMENT

Frontend harus dapat diuji dari komputer.

Jangan mengharuskan pengguna membuka file:

```text
file:///...
```

jika itu menyebabkan masalah CORS.

Gunakan local development server jika diperlukan.

Contoh:

```text
VS Code
↓
Live Server
↓
Index.html
↓
Apps Script API
```

---

# 19. API COMMUNICATION

Semua komunikasi frontend/backend harus jelas.

Contoh:

```text
GET
POST
```

sesuai kebutuhan.

Gunakan JSON jika memungkinkan.

Contoh:

```json
{
  "action": "getCustomers"
}
```

Backend:

```text
Code.gs
↓
doPost(e)
↓
parse JSON
↓
action router
↓
function
↓
Google Sheets
↓
JSON response
```

---

# 20. ACTION ROUTER

Jika aplikasi memiliki banyak fungsi backend, buat routing action yang konsisten.

Contoh:

```javascript
switch (action) {
  case "login":
    return login_(data);

  case "getCustomers":
    return getCustomers_(data);

  case "createCustomer":
    return createCustomer_(data);

  case "updateCustomer":
    return updateCustomer_(data);

  default:
    return errorResponse_("Unknown action");
}
```

Jangan membuat kode backend tidak terstruktur.

---

# 21. ERROR HANDLING

Backend harus memberikan response yang konsisten.

Contoh:

```json
{
  "success": true,
  "data": {}
}
```

atau:

```json
{
  "success": false,
  "message": "Terjadi kesalahan"
}
```

Frontend harus menangani:

* success
* error
* loading
* timeout
* empty data
* unauthorized
* server error

---

# 22. PERFORMANCE GOOGLE SHEETS

Optimalkan akses Spreadsheet.

Hindari:

```javascript
getRange()
```

berulang kali di dalam loop jika dapat dihindari.

Gunakan:

```text
getValues()
↓
proses di memory
↓
setValues()
```

untuk operasi batch.

Gunakan caching jika sesuai.

Jangan membaca seluruh Spreadsheet jika hanya membutuhkan sebagian data.

---

# 23. DATA INTEGRITY

Pertahankan:

* ID
* timestamp
* nomor transaksi
* nomor dokumen
* relasi antar-data
* status
* referensi
* histori

Jangan mengubah format data tanpa alasan.

---

# 24. BACKWARD COMPATIBILITY

Aplikasi baru harus tetap dapat menggunakan Spreadsheet yang sama.

Target:

```text
Google Sheets lama
       ↓
Apps Script baru
       ↓
GitHub Pages baru
```

Tidak perlu membuat Spreadsheet baru kecuali benar-benar diperlukan.

---

# 25. ANALISIS SEBELUM IMPLEMENTASI

Sebelum mengubah kode, buat:

```text
REBUILD_ANALYSIS.md
```

Isi:

### A. Existing Architecture

### B. Frontend Functions

### C. Backend Functions

### D. Google Sheets Structure

### E. API Mapping

### F. Authentication

### G. Business Logic

### H. UI Components

### I. Migration Plan

### J. Potential Problems

Setelah analisis selesai, langsung implementasikan.

Jangan berhenti hanya pada dokumentasi.

---

# 26. TESTING

Setelah perubahan:

Test minimal:

```text
Login
Logout
Dashboard
Read data
Create data
Update data
Delete data
Search
Filter
Form validation
API communication
Google Sheets read/write
Error handling
Mobile layout
GitHub Pages
```

---

# 27. TEST API

Pastikan endpoint Apps Script dapat dipanggil.

Periksa:

```text
Request
↓
Apps Script
↓
Code.gs
↓
Google Sheets
↓
Response
↓
Frontend
```

Jika ada error, cari penyebab dan perbaiki.

---

# 28. JANGAN MEMBUAT MOCK DATA

Jangan membuat data palsu untuk menggantikan Google Sheets.

Aplikasi harus benar-benar terhubung ke backend.

Jangan menggunakan:

```javascript
const fakeData = [...]
```

sebagai pengganti database production.

---

# 29. JANGAN MENGHAPUS KODE LAMA SECARA SEMBARANGAN

Sebelum menghapus fungsi:

1. periksa apakah digunakan
2. cari semua pemanggil
3. pastikan tidak ada dependency
4. baru refactor

Jika tidak yakin, pertahankan dan dokumentasikan.

---

# 30. KOMPATIBILITAS

Frontend harus kompatibel dengan browser modern:

* Chrome
* Edge
* Firefox
* Safari
* Android browser

Hindari dependency yang tidak diperlukan.

---

# 31. AI AGENT WORKFLOW

Sebagai AI Agent, kerjakan secara langsung.

Workflow:

```text
READ
 ↓
ANALYZE
 ↓
PLAN
 ↓
IMPLEMENT
 ↓
TEST
 ↓
FIX
 ↓
RETEST
 ↓
FINAL AUDIT
```

Jangan hanya memberikan contoh kode.

Jangan hanya memberikan saran.

Jangan hanya menjelaskan apa yang harus saya lakukan.

**Lakukan perubahan langsung terhadap file project.**

---

# 32. JIKA MENEMUKAN ERROR

Jangan berhenti.

Lakukan:

```text
Detect
 ↓
Analyze
 ↓
Fix
 ↓
Test
 ↓
Retest
```

Jika error berasal dari kode lama, perbaiki.

Jika error berasal dari migrasi GitHub Pages, perbaiki.

Jika error berasal dari API Apps Script, perbaiki.

---

# 33. JIKA MENEMUKAN KONFLIK

Prioritas:

```text
1. Security
2. Data integrity
3. Existing functionality
4. API compatibility
5. UI/UX
6. Performance
7. Code cleanliness
```

Jangan mengorbankan data atau keamanan hanya demi membuat kode lebih sederhana.

---

# 34. HASIL AKHIR

Target final harus seperti:

```text
                    GITHUB FREE
                        │
                        │
                  GitHub Repository
                        │
             ┌──────────┴──────────┐
             │                     │
       Code.gs                Index.html
             │                     │
             ↓                     ↓
     Google Apps Script       GitHub Pages
          Backend              Frontend
             │                     │
             └──────────┬──────────┘
                        ↓
                  Google Sheets
                     Database
```

Dengan kondisi:

```text
Frontend
= GitHub Pages

Backend
= Google Apps Script

Database
= Google Sheets

Source Code
= GitHub

Development
= VS Code

AI Developer
= GitHub Copilot + Claude
```

---

# 35. DEFINITION OF DONE

Pekerjaan dianggap selesai jika:

* `Index.html` dapat berjalan di GitHub Pages
* `Code.gs` dapat berjalan sebagai Apps Script Web App
* GitHub Pages dapat berkomunikasi dengan Apps Script
* Apps Script dapat membaca Google Sheets
* Apps Script dapat menulis Google Sheets
* authentication berfungsi
* seluruh fitur lama tetap tersedia
* UI/UX utama tetap dipertahankan
* responsive
* API error handling tersedia
* tidak ada fake database
* tidak ada credential rahasia di GitHub
* README tersedia
* deployment terdokumentasi
* aplikasi telah diuji
* error penting telah diperbaiki

---

# 36. PERINTAH EKSEKUSI

**MULAI SEKARANG.**

Baca seluruh file:

```text
Code.gs
Index.html
```

yang tersedia di workspace.

Jangan meminta saya menjelaskan ulang isi aplikasi.

Jangan meminta saya memilih framework.

Jangan mengubah arsitektur target.

Jangan membuat Node.js backend.

Jangan membuat database baru.

Jangan menghapus fitur.

Jangan berhenti hanya pada analisis.

**ANALISIS → REFACTOR → IMPLEMENTASIKAN → TEST → PERBAIKI → FINAL AUDIT.**

Jika diperlukan perubahan pada `Code.gs`, lakukan langsung.

Jika diperlukan perubahan pada `Index.html`, lakukan langsung.

Jika diperlukan pembuatan `README.md` atau file konfigurasi pendukung, buat langsung.

Pertahankan Google Sheets sebagai database.

Pertahankan Google Apps Script sebagai backend.

Pindahkan frontend agar dapat berjalan secara native sebagai static website di GitHub Pages.

Pastikan komunikasi:

```text
GitHub Pages
      ↓
Index.html
      ↓
fetch()
      ↓
Google Apps Script Web App
      ↓
Code.gs
      ↓
Google Sheets
```

berfungsi dengan benar.

**JANGAN HANYA MEMBERIKAN PENJELASAN. KERJAKAN LANGSUNG DI WORKSPACE SAMPAI HASILNYA SIAP DI-PUSH KE GITHUB DAN SIAP DI-DEPLOY KE GITHUB PAGES.**
