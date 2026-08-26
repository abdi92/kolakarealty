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
  // Ganti pin commit APA PUN (7-40 hex) pada referensi kolakarealty jsDelivr,
  // termasuk ref mutable @main.
  const re = /(kolakarealty)@([0-9a-f]{7,40}|main)/gi;
  const matches = content.match(re) || [];
  if (matches.length === 0) {
    console.log(`${name}: sudah konsisten / tidak ada pin`);
    continue;
  }
  content = content.replace(re, `$1@${sha}`);
  fs.writeFileSync(file, content);
  console.log(`${name}: ${matches.length} pin diganti -> @${sha}`);
  changed += matches.length;
}

console.log(`Selesai. Total ${changed} pin disinkronkan ke @${sha}`);
console.log("Jalankan ulang: npm run check");
