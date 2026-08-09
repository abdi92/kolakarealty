const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const context = {
  console,
  Utilities: { formatDate: () => "2026-08-20" },
  Session: { getScriptTimeZone: () => "Asia/Makassar" },
};
vm.createContext(context);
vm.runInContext(fs.readFileSync("apps-script/Code.gs", "utf8"), context);

const derive = (entity, record, existing = null) => context.validateAndDerive_(entity, record, existing);

assert.strictEqual(derive("pph", { nilaiTransaksi: 1000000, tarifPph: 2.5 }).nilaiPph, 25000);
assert.strictEqual(derive("bphtb", { nilaiTransaksi: 100000000, npoptkp: 80000000, tarifBphtb: 5 }).nilaiBphtb, 1000000);
assert.strictEqual(derive("pricelist", { hargaDasar: 100000000, kenaikanPersen: 10, diskonMaksimal: 5000000 }).hargaMinimal, 105000000);
assert.throws(() => derive("pricelist", { hargaDasar: 100, kenaikanPersen: 0, diskonMaksimal: 101 }), /melebihi/);

const commission = derive("komisi", { nilaiTransaksi: 200000000, persenKomisi: 2, potonganPajak: 500000 });
assert.strictEqual(commission.nominalKomisi, 4000000);
assert.strictEqual(commission.komisiDiterima, 3500000);

assert.throws(() => derive("approval", { level1Status: "Menunggu", level2Status: "Disetujui" }), /level 2/);
assert.throws(() => derive("transaksi", { status: "Lunas" }), /tidak diizinkan/);
assert.strictEqual(derive("transaksi", { status: "PPJB" }, { status: "Booking" }).status, "PPJB");
assert.strictEqual(derive("tagihan", { jumlah: 100, jatuhTempo: "2026-08-01", status: "Belum Lunas" }).status, "Terlambat");

const settings = derive("pengaturan", { id: "other", warnaUtama: "#2E6FB7", logoUrl: "https://cdn.example.com/logo.png" });
assert.strictEqual(settings.id, "default");
assert.throws(() => derive("pengaturan", { warnaUtama: "blue" }), /HEX/);
assert.throws(() => derive("pengaturan", { logoUrl: "http://example.com/logo.png" }), /HTTPS/);
const templatedSettings = derive("pengaturan", { customSuratTemplates: [{ id: "tpl-123", nama: "Surat Uji", isi: "Yth. {{namaPihak}}", aktif: true }] });
assert.strictEqual(templatedSettings.customSuratTemplates[0].nama, "Surat Uji");
assert.throws(() => derive("pengaturan", { customSuratTemplates: [{ id: "invalid", nama: "Surat", isi: "Isi" }] }), /ID template/);
assert.throws(() => derive("pengaturan", { customSuratTemplates: Array.from({ length: 11 }, (_, index) => ({ id: `tpl-${index}`, nama: "Surat", isi: "Isi" })) }), /maksimal 10/);

console.log("Firebase Admin API business-rule tests passed.");
