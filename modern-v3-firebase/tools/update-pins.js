#!/usr/bin/env node
/**
 * Tool release: satukan semua pin CDN jsDelivr ke SATU commit SHA.
 *
 * Pemakaian:
 *   node tools/update-pins.js <commit-sha>
 *
 * File yang disinkronkan:
 *   - blogger-template.xml        (manifest, logo, runtime-config, app.js)
 *   - blogger-manifest.webmanifest (ikon)
 *   - blogger-runtime-config.js   (KBR_ASSET_BASE_URL)
 *
 * Alasan: sebelumnya keempat sumber memakai pin berbeda (@163361a, @8fea78c,
 * @0be162b, @main) sehingga shell, config, kode, dan ikon bisa skew antar
 * rilis. Setelah tool ini dijalankan, satu SHA dipakai di semua tempat.
 */
const fs = require("fs");
const path = require("path");

const KNOWN_PINS = ["163361a", "8fea78c", "0be162b", "main"];

const sha = String(process.argv[2] || "").trim();
if (!/^[0-9a-f]{7,40}$/.test(sha)) {
  console.error("Pemakaian: node tools/update-pins.js <commit-sha (7-40 hex)>");
  process.exit(1);
}

const targets = [
  "blogger-template.xml",
  "blogger-manifest.webmanifest",
  "blogger-runtime-config.js",
];

let changed = 0;
for (const name of targets) {
  const file = path.join(__dirname, "..", name);
  if (!fs.existsSync(file)) {
    console.warn(`Lewati (tidak ditemukan): ${name}`);
    continue;
  }
  let content = fs.readFileSync(file, "utf8");
  let count = 0;
  for (const pin of KNOWN_PINS) {
    const needle = `@${pin}`;
    let idx = content.indexOf(needle);
    while (idx !== -1) {
      // Hanya ganti pin pada konteks URL kolakarealty jsDelivr.
      const before = content.slice(Math.max(0, idx - 60), idx);
      if (/kolakarealty/.test(before)) {
        content =
          content.slice(0, idx) + `@${sha}` + content.slice(idx + needle.length);
        count++;
        idx = content.indexOf(needle, idx + sha.length + 1);
      } else {
        idx = content.indexOf(needle, idx + needle.length);
      }
    }
  }
  if (count > 0) {
    fs.writeFileSync(file, content);
    console.log(`${name}: ${count} pin diganti -> @${sha}`);
    changed += count;
  } else {
    console.log(`${name}: sudah konsisten / tidak ada pin lama`);
  }
}

console.log(`Selesai. Total ${changed} pin disinkronkan ke @${sha}`);
console.log("Jalankan ulang: npm run check");
