const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");
const mammoth = require("mammoth");

const root = path.resolve(__dirname, "..");
const outputDirectory = path.join(root, "templates");
const logoPath = path.join(root, "logo-kolakabumirealty.png");

const templateDefinitions = [
  {
    fileName: "Template-Draft-SPK-Rumah-Subsidi.docx",
    title: "DRAFT SPK RUMAH SUBSIDI",
    opening: "Pada tanggal {{tanggalSurat}}, PT Kolaka Bumi Realty dan {{namaPihak}} menerangkan kesepakatan pekerjaan untuk unit {{nomorUnit}} pada proyek {{proyek}}.",
    body: "Ruang lingkup, nilai pekerjaan, jangka waktu, hak, kewajiban, dan ketentuan lain dapat ditulis atau disesuaikan pada bagian ini. {{isiRingkas}}",
    closing: "Surat perjanjian kerja ini dibuat untuk dipatuhi dan dilaksanakan oleh para pihak dengan penuh tanggung jawab.",
  },
  {
    fileName: "Template-Form-SPPR-Royal-Paradise.docx",
    title: "FORM SPPR ROYAL PARADISE",
    opening: "Nomor SPPR: {{nomorSPPR}}\nTanggal SPPR: {{tanggalSPPR}}\nNama Pemohon: {{namaPihak}}\nUnit: {{blokUnit}} / {{nomorUnit}}\nProyek: {{proyek}}",
    body: "Dengan ini pemohon mengajukan pemesanan unit tersebut sesuai data, harga, cara pembayaran, dan persyaratan yang disepakati. {{isiRingkas}}",
    closing: "Formulir ini menjadi dasar pemrosesan pemesanan dan dokumen lanjutan setelah diverifikasi oleh perusahaan.",
  },
  {
    fileName: "Template-SPJB-RPD.docx",
    title: "SURAT PERJANJIAN JUAL BELI (SPJB RPD)",
    opening: "Nomor SPJB: {{nomorSPJB}}\nTanggal SPJB: {{tanggalSPJB}}\nPihak Pembeli: {{namaPihak}}\nUnit: {{blokUnit}} / {{nomorUnit}}\nProyek: {{proyek}}",
    body: "Para pihak sepakat mengikatkan diri dalam jual beli unit tersebut berdasarkan harga, pembayaran, serah terima, dan ketentuan yang disepakati. {{isiRingkas}}",
    closing: "SPJB ini dibuat dengan itikad baik dan berlaku sejak ditandatangani oleh para pihak.",
  },
  {
    fileName: "Template-Surat-Perjanjian-Jual-Beli.docx",
    title: "SURAT PERJANJIAN JUAL BELI",
    opening: "Pada tanggal {{tanggalSurat}}, PT Kolaka Bumi Realty selaku pihak penjual dan {{namaPihak}} selaku pihak pembeli sepakat melakukan jual beli unit {{nomorUnit}} pada proyek {{proyek}}.",
    body: "Objek perjanjian, nilai transaksi, tata cara pembayaran, penyerahan, wanprestasi, dan penyelesaian perselisihan dapat disesuaikan pada bagian ini. {{isiRingkas}}",
    closing: "Perjanjian ini dibuat dalam keadaan sadar, tanpa paksaan, dan untuk dilaksanakan oleh kedua belah pihak.",
  },
  {
    fileName: "Template-Surat-Tagihan-Piutang.docx",
    title: "SURAT TAGIHAN PIUTANG",
    opening: "Pemberitahuan ke-{{pemberitahuanKe}}\nPeriode tagihan: {{periodeTagihan}}\nNilai tagihan: {{nominalTagihan}}\nJatuh tempo: {{tanggalJatuhTempo}}",
    body: "Kepada {{namaPihak}}, berdasarkan catatan administrasi kami masih terdapat kewajiban pembayaran atas unit {{nomorUnit}} di {{proyek}}. Mohon pembayaran diselesaikan paling lambat pada tanggal jatuh tempo tersebut. {{isiRingkas}}",
    closing: "Apabila pembayaran telah dilakukan, mohon mengabaikan surat ini dan menyampaikan bukti pembayaran kepada bagian administrasi.",
  },
  {
    fileName: "Template-Surat-Lainnya.docx",
    title: "{{jenisSurat}}",
    opening: "Kepada Yth.\nBapak/Ibu/Saudara {{namaPihak}}\nPemilik/Pemesan Unit {{nomorUnit}} - {{proyek}}\nDi tempat",
    body: "Dengan hormat,\n\n{{isiRingkas}}",
    closing: "Demikian surat ini kami sampaikan. Atas perhatian dan kerja samanya, kami mengucapkan terima kasih.",
  },
];

const xml = (value) => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;");

function run(text, options = {}) {
  const properties = [
    options.bold ? "<w:b/>" : "",
    options.italic ? "<w:i/>" : "",
    options.underline ? '<w:u w:val="single"/>' : "",
    options.size ? `<w:sz w:val="${options.size}"/><w:szCs w:val="${options.size}"/>` : "",
    options.font ? `<w:rFonts w:ascii="${xml(options.font)}" w:hAnsi="${xml(options.font)}"/>` : "",
  ].join("");
  return `<w:r><w:rPr>${properties}</w:rPr><w:t xml:space="preserve">${xml(text)}</w:t></w:r>`;
}

function paragraph(content, options = {}) {
  const align = options.align ? `<w:jc w:val="${options.align}"/>` : "";
  const spacing = `<w:spacing w:before="${options.before || 0}" w:after="${options.after == null ? 120 : options.after}" w:line="${options.line || 360}" w:lineRule="auto"/>`;
  const indent = options.firstLine ? `<w:ind w:firstLine="${options.firstLine}"/>` : "";
  return `<w:p><w:pPr>${align}${spacing}${indent}</w:pPr>${content}</w:p>`;
}

function tableCell(content, width, options = {}) {
  const vertical = options.vertical ? `<w:vAlign w:val="${options.vertical}"/>` : "";
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${vertical}</w:tcPr>${content}</w:tc>`;
}

const logoDrawing = `
  <w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">
    <wp:extent cx="914400" cy="914400"/><wp:docPr id="1" name="Logo PT Kolaka Bumi Realty"/>
    <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
        <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
          <pic:nvPicPr><pic:cNvPr id="0" name="logo-kolakabumirealty.png"/><pic:cNvPicPr/></pic:nvPicPr>
          <pic:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
          <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></pic:spPr>
        </pic:pic>
      </a:graphicData>
    </a:graphic>
  </wp:inline></w:drawing></w:r>`;

const headerTable = `
  <w:tbl>
    <w:tblPr>
      <w:tblW w:w="0" w:type="auto"/>
      <w:tblBorders><w:bottom w:val="double" w:sz="12" w:space="2" w:color="000000"/></w:tblBorders>
      <w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/></w:tblCellMar>
    </w:tblPr>
    <w:tblGrid><w:gridCol w:w="1500"/><w:gridCol w:w="7850"/></w:tblGrid>
    <w:tr>
      ${tableCell(paragraph(logoDrawing, { align: "center", after: 0, line: 240 }), 1500, { vertical: "center" })}
      ${tableCell([
        paragraph(run("PT Kolaka Bumi Realty", { bold: true, size: 34, font: "Times New Roman" }), { align: "left", after: 40, line: 300 }),
        paragraph(run("Developer & Contraktor", { italic: true, size: 22, font: "Times New Roman" }), { align: "left", after: 30, line: 260 }),
        paragraph(run("Office : Jl. Repelita No. 54 · Telp (0405) 2321613 · HP 0852 4197 4777", { size: 18, font: "Times New Roman" }), { align: "left", after: 20, line: 220 }),
        paragraph(run("Email : kolakakbr@gmail.com", { size: 18, font: "Times New Roman" }), { align: "left", after: 0, line: 220 }),
      ].join(""), 7850, { vertical: "center" })}
    </w:tr>
  </w:tbl>`;

function bodyParagraphs(text) {
  return String(text).split("\n").map((line) => paragraph(run(line || " ", { size: 24, font: "Times New Roman" }), {
    align: line ? "both" : "left",
    firstLine: line ? 720 : 0,
    after: line ? 120 : 40,
    line: 360,
  })).join("");
}

function buildDocumentBody(definition) {
  return [
  headerTable,
  paragraph(run(definition.title, { bold: true, underline: true, size: 28, font: "Times New Roman" }), { align: "center", before: 180, after: 30, line: 300 }),
  paragraph(run("Nomor: {{nomorSurat}}", { size: 22, font: "Times New Roman" }), { align: "center", after: 220, line: 280 }),
  paragraph(run("{{kotaSurat}}, {{tanggalSurat}}", { size: 24, font: "Times New Roman" }), { align: "right", after: 160 }),
  `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/></w:tblPr><w:tblGrid><w:gridCol w:w="1200"/><w:gridCol w:w="200"/><w:gridCol w:w="7950"/></w:tblGrid><w:tr>${tableCell(paragraph(run("Perihal", { size: 24 }), { after: 40 }), 1200)}${tableCell(paragraph(run(":"), { after: 40 }), 200)}${tableCell(paragraph(run("{{perihal}}", { bold: true, size: 24 }), { after: 40 }), 7950)}</w:tr></w:tbl>`,
  bodyParagraphs(definition.opening),
  bodyParagraphs(definition.body),
  bodyParagraphs(definition.closing),
  `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/></w:tblPr><w:tblGrid><w:gridCol w:w="4700"/><w:gridCol w:w="4650"/></w:tblGrid><w:tr>${tableCell(paragraph(run("", { size: 24 }), { after: 0 }), 4700)}${tableCell([
    paragraph(run("Hormat kami,", { size: 24 }), { align: "center", after: 20 }),
    paragraph(run("{{namaPerusahaan}}", { bold: true, size: 24 }), { align: "center", after: 900 }),
    paragraph(run("{{penandatangan}}", { bold: true, underline: true, size: 24 }), { align: "center", after: 20 }),
    paragraph(run("Penandatangan", { size: 22 }), { align: "center", after: 0 }),
  ].join(""), 4650)}</w:tr></w:tbl>`,
  paragraph(run("Referensi data: ID Pihak {{ID_Pihak}} | ID Unit {{ID_Unit}}", { italic: true, size: 16, font: "Times New Roman" }), { before: 360, after: 0, align: "center", line: 220 }),
  ].join("");
}

function buildDocumentXml(definition) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>${buildDocumentBody(definition)}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708"/><w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr></w:body>
</w:document>`;
}

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="360" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
</w:styles>`;

async function main() {
  fs.mkdirSync(outputDirectory, { recursive: true });
  for (const definition of templateDefinitions) {
    const outputPath = path.join(outputDirectory, definition.fileName);
    const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
  zip.file("word/document.xml", buildDocumentXml(definition));
  zip.file("word/styles.xml", stylesXml);
  zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.file("word/media/logo.png", fs.readFileSync(logoPath));
  zip.file("docProps/core.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Template Surat KBR Custom</dc:title><dc:creator>PT Kolaka Bumi Realty</dc:creator><dc:subject>Template Generate Surat</dc:subject><dcterms:created xsi:type="dcterms:W3CDTF">2026-08-10T00:00:00Z</dcterms:created></cp:coreProperties>`);
  zip.file("docProps/app.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Microsoft Office Word</Application><Company>PT Kolaka Bumi Realty</Company></Properties>`);

  fs.writeFileSync(outputPath, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  const generated = await JSZip.loadAsync(fs.readFileSync(outputPath));
  ["[Content_Types].xml", "word/document.xml", "word/styles.xml", "word/media/logo.png"].forEach((entry) => {
    if (!generated.file(entry)) throw new Error(`DOCX tidak lengkap: ${entry}`);
  });
  const extracted = await mammoth.extractRawText({ path: outputPath });
  ["{{nomorSurat}}", "{{tanggalSurat}}", "{{namaPihak}}", "{{nomorUnit}}", "{{proyek}}", "{{isiRingkas}}", "{{penandatangan}}"].forEach((placeholder) => {
    if (!extracted.value.includes(placeholder)) throw new Error(`Placeholder hilang: ${placeholder}`);
  });
  console.log(`DOCX valid: ${outputPath}`);
  console.log(`Ukuran: ${fs.statSync(outputPath).size} byte | Placeholder: lengkap`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});