# Modernization Report

Tanggal audit dan implementasi: 2026-08-09

## Kesimpulan

Versi root sebelumnya fungsional dan memiliki arsitektur schema-driven yang baik, tetapi belum layak disebut modern sepenuhnya karena JSX dikompilasi Babel di browser, frontend monolitik, belum memiliki error boundary, request baca dapat terduplikasi, serta motion belum menghormati reduced-motion.

Versi `modern-v3` memperbaiki area tersebut tanpa mengganti API action, schema Spreadsheet, atau workflow existing.

## Cakupan Fungsi Terverifikasi

- Source frontend mempertahankan komponen Dashboard, EntityPage, Login, Profile, Audit Log, Finance Report, Backup, dan App.
- Seluruh 15 action yang dipanggil frontend sama dengan versi stabil.
- Seluruh 17 route backend sama dengan versi stabil.
- Anti-double-booking backend existing ditemukan untuk entity `booking` dan `transaksi`.
- Permission read/write tetap dihitung dan diperiksa backend.
- Optimistic save/delete frontend tetap memiliki rollback ketika API gagal.

## Perbaikan Arsitektur

| Area | Sebelum | Modern v3 |
|---|---|---|
| Runtime JSX | Babel standalone di browser | Build-time esbuild |
| HTML awal | Sekitar 410 KB | Sekitar 1,8 KB |
| Bundle | Inline dan tidak terpisah | `app.js` minified sekitar 300 KB |
| Recovery render | Tidak ada boundary | `AppErrorBoundary` dengan reload UI |
| Request baca | Setiap call membuat fetch baru | In-flight request deduplication |
| Search | Query langsung | `useDeferredValue` |
| Session restore | Timeout/response dapat memanggil finish dua kali | Guard `settled` |
| Build | Tidak eksplisit | npm script + lockfile |

## Perbaikan UI dan Motion

- View baru masuk dengan slide horizontal pendek dan fade.
- Submenu menggunakan reveal dari origin atas.
- Dropdown memiliki transform-origin dan transisi terukur.
- Modal menggunakan backdrop blur, elevation, dan scale transition.
- Sidebar mobile menggunakan easing yang konsisten.
- Hover card/button dibuat lebih terkendali.
- Focus keyboard memakai outline yang terlihat.
- Semua animasi/transisi dinonaktifkan secara efektif saat `prefers-reduced-motion: reduce`.
- Layout operasional tetap padat dan tidak diubah menjadi landing page/card dekoratif.

## Hardening Backend Modern

### Race Condition Booking

Sebelumnya `assertNoDoubleBooking_()` berjalan sebelum `LockService`. Dua request bersamaan dapat membaca kondisi lama sebelum salah satunya menulis.

Pada `modern-v3/Code.gs`:

1. script lock diperoleh terlebih dahulu;
2. unique username/email diperiksa di dalam lock;
3. anti-double-booking diperiksa di dalam lock;
4. record baru ditulis setelah seluruh validasi lulus;
5. timeout lock dinaikkan dari 15 menjadi 30 detik.

### Upload

Frontend sudah membatasi 8 MB, tetapi pembatasan client-side dapat dilewati. Backend modern mendecode payload lalu menolak file bila `bytes.length > 8 * 1024 * 1024` sebelum membuat file Drive.

## Hasil Pengujian

| Pemeriksaan | Hasil |
|---|---|
| Diagnostics `index.html`, `app.jsx`, `app.js`, `Code.gs`, worker, manifest | Lulus |
| npm build esbuild | Lulus, sekitar 74 ms pada mesin audit |
| `node --check app.js` | Lulus |
| Syntax `Code.gs` melalui salinan `.js` sementara | Lulus |
| Frontend action parity | 15 vs 15, identik |
| Backend route parity | 17 vs 17, identik |
| Browser tidak meminta Babel | Lulus |
| Login render dan input | Lulus |
| Dashboard render dengan API sintetis nonproduksi | Lulus |
| Navigasi Dashboard -> Proyek -> tabel | Lulus |
| View transition `kbr-view-enter` | Lulus |
| Desktop 1440x900 tanpa overflow | Lulus |
| Mobile 390x844 tanpa overflow | Lulus |
| Reduced-motion aktif dan transition menjadi 0 | Lulus |
| Manifest standalone dan start URL relatif | Lulus |
| Worker cache unik dan `app.js` masuk app shell | Lulus |
| Backend validation berada setelah lock | Lulus secara struktural |
| Resource lokal index/worker/app.js HTTP 200 | Lulus |

## Audit Fungsi, Rumus, dan Logika

Audit lanjutan menemukan bahwa field hasil sebelumnya dihitung di frontend, tetapi backend menerima nilai dari request tanpa menghitung ulang. Request langsung dapat menyimpan hasil yang usang atau dimanipulasi. `saveRecord()` modern sekarang menjalankan `applyDerivedFields_()` setelah lock diperoleh dan sebelum JSON ditulis ke Spreadsheet.

| Modul | Rumus atau aturan yang dijaga backend |
|---|---|
| PPh | `nilaiPph = round(nilaiTransaksi * tarifPph / 100)` |
| BPHTB | `nilaiBphtb = round(max(0, nilaiTransaksi - NPOPTKP) * tarif / 100)` |
| SPK Borong | PPN dan total nilai kontrak dihitung ulang |
| Budget Control | Sisa dan persentase sisa dihitung ulang, termasuk over-budget negatif |
| Price List | Harga jual dan harga minimal dihitung ulang; diskon di atas harga jual ditolak |
| Target Marketing | Persentase dan status pencapaian diturunkan dari target/realisasi |
| Komisi | Nominal dan komisi bersih dihitung ulang; pajak di atas komisi ditolak |
| Pengajuan KPR | Plafon dihitung ulang; DP di atas harga rumah ditolak |
| Piutang/Hutang | Total bayar dan saldo dihitung ulang; pembayaran berlebih ditolak; saldo nol menjadi Lunas |
| Kartu Piutang | Saldo dibatasi oleh proyek, pembeli, dan unit; transaksi unit lain tidak tercampur |
| Kartu/Stok Barang | Total, saldo, dan pengeluaran dihitung dari snapshot dalam lock; stok negatif ditolak |
| Tagihan | Record nonlunas yang melewati jatuh tempo menjadi Terlambat saat disimpan |
| Approval | Level 2 tidak dapat diproses sebelum level 1 disetujui; status akhir dihitung ulang |
| Transaksi | Transisi dibatasi ke Booking -> PPJB -> Akad Kredit -> Lunas, dengan Batal sebagai terminal |

Parser angka backend menerima angka murni dan format Indonesia seperti `Rp 1.250.000,50`. Ringkasan keuangan memakai parser yang sama. Nilai saldo eksplisit `0` tidak lagi dianggap kosong oleh fallback piutang/hutang.

Frontend menampilkan alasan validasi formula sebelum simpan dan mempertahankan modal beserta input ketika backend menolak record. Preview price list, komisi, KPR, dan kartu piutang tidak lagi menyembunyikan input salah dengan clamp nol.

### Regression Test Formula

`formula.test.js` menguji payload hasil yang dimanipulasi, parser angka Indonesia, persentase di luar rentang, pembayaran berlebih, scoping piutang multi-unit, stok tidak cukup, urutan approval, status jatuh tempo, serta transisi transaksi. `npm run check` sekarang memeriksa bundle dan menjalankan suite ini.

| Pemeriksaan tambahan | Hasil |
|---|---|
| Build ulang `app.js` | Lulus, sekitar 298 KB |
| Diagnostics source/backend/test/package | 0 error |
| Formula dan business-logic regression suite | Lulus |
| Payload derived field palsu dikoreksi server | Lulus |
| Stok negatif dan pembayaran berlebih ditolak | Lulus |
| Action frontend memiliki route backend | Lulus |

### Keputusan Bisnis yang Belum Diasumsikan

1. Metode pembulatan PPh/BPHTB (`round` atau `floor`) dan pengecualian pajak harus mengikuti kebijakan/regulasi yang disahkan perusahaan.
2. Batas DP dan plafon KPR per bank memerlukan tabel kebijakan bank, bukan angka hardcoded.
3. Komisi bertahap, pembatalan komisi, dan tarif potongan PPh 21 memerlukan aturan HR/keuangan.
4. Closing period akuntansi dan opening balance belum memiliki master periode terkunci.
5. Pembatalan transaksi belum mengarsipkan otomatis PPJB, kuitansi, atau dokumen legal terkait.
6. Record kartu piutang bertanggal setelah record lama tidak dihitung ulang massal ketika transaksi lama diedit; rekalkulasi ledger terpusat perlu keputusan mekanisme closing.

API sintetis hanya digunakan di browser test melalui request interception. Tidak ada data yang dikirim ke Apps Script atau Spreadsheet selama uji dashboard.

## Belum Diuji

- Login dengan credential produksi.
- CRUD terhadap record Spreadsheet nyata.
- Simulasi dua eksekusi Apps Script paralel pada deployment staging.
- Upload Drive staging di bawah/di atas 8 MB.
- Backup/restore, email reminder, dan trigger pada project staging.
- Seluruh kombinasi role dengan akun nyata.
- Save/deploy theme atau frontend produksi.

## Gap Lanjutan

1. Approval sudah berurutan, tetapi aturan approver berdasarkan role, rejection reason wajib, dan entity yang wajib approval belum ditetapkan.
2. Password masih memakai SHA-256 tanpa salt; migrasi harus versioned agar akun existing tetap dapat login.
3. Validasi formula inti sudah server-side, tetapi required field dan enum umum belum berasal dari schema bersama.
4. Multi-record workflow belum memiliki transaction/saga API.
5. Penghapusan file Drive belum membuktikan file terkait entity/record pemanggil.
6. Frontend source masih monolitik dan sebaiknya dipecah per domain setelah regression suite tersedia.

Gap tersebut tidak ditutup dengan asumsi karena dapat mengubah aturan bisnis, data existing, atau kompatibilitas login.