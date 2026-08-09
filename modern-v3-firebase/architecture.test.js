const assert = require("assert");
const fs = require("fs");

const read = (file) => fs.readFileSync(file, "utf8");
const client = read("firebase-client.js");
const rules = read("firestore.rules");
const blogger = read("blogger-template.xml");
const bloggerConfig = read("blogger-runtime-config.js");
const adminApi = read("apps-script/Code.gs");
const bundle = read("app.js");

assert.match(client, /signInWithEmailAndPassword/);
assert.match(client, /getIdToken\(\)/);
assert.match(client, /initializeAppCheck/);
assert.match(rules, /allow create, update, delete: if false;/);
assert.match(rules, /request\.resource\.data\.id == recordId/);
assert.match(rules, /match \/auditLogs\/\{logId\}/);
assert.doesNotMatch(blogger, /<iframe/i);
assert.doesNotMatch(blogger, /<script><!\[CDATA\[/i);
assert.match(blogger, /cdn\.jsdelivr\.net\/gh\/abdi92\/kolakarealty@main/);
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

JSON.parse(read("firebase.json"));
JSON.parse(read("firestore.indexes.json"));
JSON.parse(read("apps-script/appsscript.json"));

console.log("Firebase/Blogger architecture tests passed.");
