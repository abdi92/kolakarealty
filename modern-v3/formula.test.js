const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const context = {
  console,
  Utilities: { formatDate: () => "2026-08-20" },
  Session: { getScriptTimeZone: () => "Asia/Makassar" },
};
vm.createContext(context);
vm.runInContext(fs.readFileSync("Code.gs", "utf8"), context);

const apply = (entity, record, allData = {}, existingRecord = null) =>
  context.applyDerivedFields_(entity, record, { allData, existingRecord });

assert.strictEqual(context.parseBusinessNumber_("Rp 1.250.000,50", "Nilai"), 1250000.5);
assert.strictEqual(apply("pph", { nilaiTransaksi: 1000000, tarifPph: 2.5, nilaiPph: 999999 }).nilaiPph, 25000);
assert.strictEqual(apply("bphtb", { nilaiTransaksi: 100000000, npoptkp: 80000000, tarifBphtb: 5 }).nilaiBphtb, 1000000);

const budget = apply("budgetcontrol", { rencanaBudget: 1000000, realisasi: 1500000 });
assert.strictEqual(budget.sisaBudget, -500000);
assert.strictEqual(budget.prosSisaBudget, -50);

const commission = apply("komisi", { nilaiTransaksi: 200000000, persenKomisi: 2, potonganPajak: 500000 });
assert.strictEqual(commission.nominalKomisi, 4000000);
assert.strictEqual(commission.komisiDiterima, 3500000);
assert.throws(() => apply("komisi", { nilaiTransaksi: 100, persenKomisi: 5, potonganPajak: 6 }), /melebihi/);
assert.throws(() => apply("pengajuankpr", { nilaiRumah: 100, uangMuka: 101 }), /melebihi/);
assert.throws(() => apply("pph", { nilaiTransaksi: 100, tarifPph: 101 }), /rentang/);

const contract = apply("spkborong", { nilaiBorongan: 1000000, ppnPersen: 11 });
assert.strictEqual(contract.ppnNilai, 110000);
assert.strictEqual(contract.totalNilai, 1110000);
assert.strictEqual(apply("pricelist", { hargaDasar: 100000000, kenaikanPersen: 10, diskonMaksimal: 5000000 }).hargaMinimal, 105000000);
assert.throws(() => apply("pricelist", { hargaDasar: 100, kenaikanPersen: 0, diskonMaksimal: 101 }), /melebihi/);
assert.strictEqual(apply("targetmarketing", { targetUnit: 4, realisasiUnit: 5 }).status, "Melebihi Target");

const receivable = apply("piutang", { hargaTransaksi: 100, totalDibayarSebelumnya: 80, dibayarBulanIni: 20, status: "Cicilan Berjalan" });
assert.strictEqual(receivable.sisaPiutang, 0);
assert.strictEqual(receivable.status, "Lunas");

const card = apply("kartupiutang", {
  id: "current", proyek: "P1", namaPembeli: "A", blokUnit: "U1", tanggal: "2026-02-01",
  hargaResmi: 100, diskon: 10, debet: 20, kredit: 0,
}, {
  kartupiutang: [
    { id: "prior", proyek: "P1", namaPembeli: "A", blokUnit: "U1", tanggal: "2026-01-01", debet: 30, kredit: 0 },
    { id: "other-unit", proyek: "P1", namaPembeli: "A", blokUnit: "U2", tanggal: "2026-01-01", debet: 50, kredit: 0 },
  ],
});
assert.strictEqual(card.saldo, 40);

assert.throws(() => apply("approval", { level1Status: "Menunggu", level2Status: "Disetujui" }), /level 2/);
assert.strictEqual(apply("tagihan", { jumlah: 100, jatuhTempo: "2026-08-01", status: "Belum Lunas" }).status, "Terlambat");

const stock = {
  kartubarangmasuk: [{ namaBarang: "Semen", gudang: "A", jumlahMasuk: 10, jumlahKeluar: 0 }],
  barangkeluar: [{ id: "prior", namaBarang: "Semen", gudang: "A", jumlahKeluar: 3, status: "Dikeluarkan" }],
};
assert.strictEqual(apply("barangkeluar", { id: "current", namaBarang: "Semen", gudang: "A", jumlahKeluar: 7, hargaSatuan: 50000, status: "Dikeluarkan" }, stock).sisaStok, 0);
assert.throws(() => apply("barangkeluar", { id: "current", namaBarang: "Semen", gudang: "A", jumlahKeluar: 8, hargaSatuan: 50000, status: "Dikeluarkan" }, stock), /Stok tidak cukup/);

assert.throws(() => apply("transaksi", { status: "Lunas" }), /tidak diizinkan/);
assert.strictEqual(apply("transaksi", { status: "PPJB" }, {}, { status: "Booking" }).status, "PPJB");

console.log("Formula and business-logic tests passed.");