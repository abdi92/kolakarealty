# RELEASE v4.2.0-document-templates-final — LOCK

**Tanggal lock:** 2026-09-03
**APP_VERSION:** `4.2.0-document-templates` (`app.jsx:34`)
**Package:** `kbr-office-firebase-blogger@4.2.0` (`package.json:3`)
**Firebase project:** `kolakarealty-fd4d7` (`runtime-config.js:3`, `blogger-runtime-config.js:3`)
**CDN:** `https://cdn.jsdelivr.net/gh/abdi92/kolakarealty@v4.2.0/modern-v3-firebase/` (tetap `@v4.2.0` sesuai keputusan, tidak pin SHA)
**Blogger shell:** `blogger-template.xml:29-32` (React CDN + app.js + runtime-config)
**GAS exec:** `https://script.google.com/macros/s/AKfycbwglAUaOZpzoMTxvkndi7PH_qR6eFDyrgtgyASA13LZzo-1V1EOkQj9w7SkIlEat1c/exec` — health `{"success":true,"data":{"service":"KBR Firebase Admin API","status":"ok"}}` verified 2026-09-03 03:11 UTC (CORS `Access-Control-Allow-Origin:*` ✅)
**GAS project:** `1NRSrOXtwR4qVGZ-s56Mkv75kiEkCKjznkC76aucfNQzcTnxa3lbejCqK` — manual deploy done, previous `AKfycbwrZ5Z...` retired

## Status LOCK
- `app.js` rebuilt 2026-09-03 via `npm run build` (esbuild IIFE, 1.4 MB) — **SHA256: B1DB51B0071D1ECD9CF8F95A76874CD51A705CFC0579385F183164711BD3E674**
- `apps-script/Code.gs` patched CORS include — **SHA256: D77C137ECBAF4C7E6A2057BC15D38831331AAB44A7BCCED28922CDC261E0CCE5**
- Tests: `npm run check` PASS (formula.test.js, admin-api.test.js, architecture.test.js)
- Firestore rules deployed: `firebase deploy --only firestore:rules,firestore:indexes` ✅ via `abdy.audit@gmail.com`
- Storage skip (not set up) — expected, Drive used

## Perubahan vs histori 26-08-2026
- **INCLUDE CORS patch** `apps-script/Code.gs:36`:
  - `jsonResponse_()` tambah `Access-Control-Allow-Origin:*`, `Allow-Methods: GET,POST,OPTIONS`, `Allow-Headers: Content-Type` (guard `setHeader` jika tersedia)
  - `doOptions()` handler baru + `doGet(e)` dengan CORS
  - Tujuan: fix `Failed to fetch` dari Blogger `blogspot.com` -> `script.google.com` via `firebase-client.js:172 fetch(text/plain)`
- Tidak ada perubahan schema, `PRIVILEGED_ENTITIES` (`firebase-client.js:43` / `apps-script/Code.gs:8`), atau `APP_VERSION`
- CDN tetap `@v4.2.0` (tidak SHA pin)

## Git
- Repo lokal BUKAN git repository (`C:\tools\git\bin\git.exe status` = `not a git repository`) — lock via file hash ini sebagai pengganti tag
- Jika repo `abdi92/kolakarealty` dibuat, tag lokal yang disarankan: `git tag -a v4.2.0-document-templates-final -m "LOCK v4.2.0-document-templates-final - CORS included, CDN @v4.2.0"`

## Deployment verified 2026-09-03
- GAS `Code.gs` CORS patch deployed & health OK `AKfycbwglAU...`
- `runtime-config.js:11` + `blogger-runtime-config.js:11` updated to `AKfycbwglAU...`
- Firestore rules deployed via `abdy.audit@gmail.com` — no further manual step

## Cadangan
- File lock ini + hash di atas adalah bukti immutable. Next changes wajib di `v4.3.0` (jangan edit `v4.2.0-document-templates-final` tanpa tag baru).

## Verifikasi
```
powershell -ExecutionPolicy Bypass -Command "Get-FileHash app.js -Algorithm SHA256; Get-FileHash apps-script/Code.gs -Algorithm SHA256; npm run check"
firebase deploy --dry-run --only firestore:rules
```
