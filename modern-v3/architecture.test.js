const assert = require("assert");
const fs = require("fs");
const path = require("path");
const Docxtemplater = require("docxtemplater");
const PizZip = require("pizzip");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(__dirname, "app.jsx"), "utf8");

assert.match(source, /key: "templatesurat"/);
assert.match(source, /ref: "templatesurat\.nama"/);
assert.match(source, /new Docxtemplater\(zip/);
assert.match(source, /delimiters: \{ start: "\{\{", end: "\}\}" \}/);
assert.doesNotMatch(source, /gsCall\("searchAll"/);

for (const target of ["hosting-ready", "xampp-local"]) {
  const backend = fs.readFileSync(path.join(root, target, "api", "lib", "App.php"), "utf8");
  const worker = fs.readFileSync(path.join(root, target, "service-worker.js"), "utf8");
  assert.match(backend, /'templatesurat'/);
  assert.match(backend, /validateDocxPackage/);
  assert.match(backend, /word\/document\.xml/);
  assert.match(worker, /\/api\//);
  assert.match(worker, /\/uploads\//);
  assert.match(worker, /\/storage\//);
}

const templatePath = path.join(root, "modern-v3-firebase", "templates", "Template-Surat-Lainnya.docx");
const zip = new PizZip(fs.readFileSync(templatePath));
const document = new Docxtemplater(zip, {
  paragraphLoop: true,
  linebreaks: true,
  delimiters: { start: "{{", end: "}}" },
  nullGetter: () => "",
});
document.render({
  nomorSurat: "KBR-TEST-001",
  jenisSurat: "Surat Lainnya",
  tanggalSurat: "20 Agustus 2026",
  namaPihak: "Pihak Uji",
  nomorUnit: "A-01",
  proyek: "Royal Paradise",
  perihal: "Validasi Template",
  isiRingkas: "Dokumen hasil pengujian otomatis.",
  penandatangan: "Manajer KBR",
});
const renderedXml = document.getZip().file("word/document.xml").asText();
assert.match(renderedXml, /KBR-TEST-001/);
assert.doesNotMatch(renderedXml, /\{\{nomorSurat\}\}/);

console.log("Architecture and DOCX integration tests passed.");