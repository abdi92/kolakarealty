const assert = require("assert");
const fs = require("fs");

const read = (file) => fs.readFileSync(file, "utf8");
const client = read("firebase-client.js");
const rules = read("firestore.rules");
const blogger = read("blogger-template.xml");
const bloggerConfig = read("blogger-runtime-config.js");
const adminApi = read("apps-script/Code.gs");
const bundle = read("app.js");
const appSource = read("app.jsx");

assert.match(client, /signInWithEmailAndPassword/);
assert.match(client, /getIdToken\(\)/);
assert.match(client, /initializeAppCheck/);
assert.match(rules, /allow create, update, delete: if false;/);
assert.match(rules, /request\.resource\.data\.id == recordId/);
assert.match(rules, /match \/auditLogs\/\{logId\}/);
assert.doesNotMatch(blogger, /<iframe/i);
assert.doesNotMatch(blogger, /<script><!\[CDATA\[/i);
assert.match(blogger, /cdn\.jsdelivr\.net\/gh\/abdi92\/kolakarealty@0be162b/);
assert.match(blogger, /logo-kolakabumirealty\.png" rel="icon"/);
assert.match(blogger, /logo-kolakabumirealty\.png" rel="apple-touch-icon"/);
assert.ok(blogger.indexOf("blogger-runtime-config.js") < blogger.indexOf("modern-v3-firebase/app.js"));
assert.match(bloggerConfig, /KBR_FIREBASE_CONFIG/);
assert.match(bloggerConfig, /kolakarealty-fd4d7/);
assert.match(bloggerConfig, /KBR_ADMIN_API_URL/);
assert.match(bloggerConfig, /KBR_ASSET_BASE_URL/);
assert.match(adminApi, /accounts:lookup/);
assert.match(adminApi, /requireAdministrator_/);
assert.match(adminApi, /assertNoDoubleBooking_/);
assert.doesNotMatch(adminApi, /PRIVATE KEY/);
assert.doesNotMatch(bundle, /AKfycbygpx_rYzPXJpDTVwBBN/);
assert.match(bundle, /logo-kolakabumirealty\.png/);
assert.doesNotMatch(appSource, /LOGO%20\(1\)\.png|LOGO \(1\)\.png/);

[
	"buildGenerateSuratPrintHtml",
	"buildSpkBorongPrintHtml",
	"buildSuratPesananRumahHtml",
	"buildKuitansiPrintHtml",
	"buildRecordDetailPrintHtml",
].forEach((functionName) => {
	const start = appSource.indexOf(`function ${functionName}`);
	const nextFunction = appSource.indexOf("\nfunction ", start + 1);
	const functionSource = appSource.slice(start, nextFunction === -1 ? undefined : nextFunction);
	assert.ok(start >= 0, `${functionName} harus tersedia`);
	assert.match(functionSource, /buildKopSuratHtml\(\)/, `${functionName} harus memakai kop dan logo resmi`);
});

JSON.parse(read("firebase.json"));
JSON.parse(read("firestore.indexes.json"));
JSON.parse(read("apps-script/appsscript.json"));

console.log("Firebase/Blogger architecture tests passed.");
