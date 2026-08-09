const assert = require("assert");
const fs = require("fs");

const read = (file) => fs.readFileSync(file, "utf8");
const client = read("firebase-client.js");
const rules = read("firestore.rules");
const blogger = read("blogger-template.xml");
const adminApi = read("apps-script/Code.gs");
const bundle = read("app.js");

assert.match(client, /signInWithEmailAndPassword/);
assert.match(client, /getIdToken\(\)/);
assert.match(client, /initializeAppCheck/);
assert.match(rules, /allow create, update, delete: if false;/);
assert.match(rules, /request\.resource\.data\.id == recordId/);
assert.match(rules, /match \/auditLogs\/\{logId\}/);
assert.doesNotMatch(blogger, /<iframe/i);
assert.match(blogger, /cdn\.jsdelivr\.net\/gh\/YOUR_GITHUB_USER/);
assert.match(adminApi, /accounts:lookup/);
assert.match(adminApi, /requireAdministrator_/);
assert.match(adminApi, /assertNoDoubleBooking_/);
assert.doesNotMatch(adminApi, /PRIVATE KEY/);
assert.doesNotMatch(bundle, /AKfycbygpx_rYzPXJpDTVwBBN/);

JSON.parse(read("firebase.json"));
JSON.parse(read("firestore.indexes.json"));
JSON.parse(read("apps-script/appsscript.json"));

console.log("Firebase/Blogger architecture tests passed.");
