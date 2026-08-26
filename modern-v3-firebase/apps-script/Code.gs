var CONFIG_KEYS = {
  projectId: 'FIREBASE_PROJECT_ID',
  webApiKey: 'FIREBASE_WEB_API_KEY'
};
var DOC_FOLDER_NAME = 'KBR Firebase - Dokumen';
var BACKUP_FOLDER_NAME = 'KBR Firebase - Backup';
var MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
var PRIVILEGED_ENTITIES = [
  'pengguna', 'pengaturan', 'transaksi', 'booking', 'approval', 'kuitansi', 'voucher', 'pettycash',
  'bukubank', 'kartuanggaran', 'piutang', 'hutang', 'budgetcontrol', 'kartupiutang',
  'kartubarangmasuk', 'barangkeluar', 'komisi', 'pph', 'bphtb', 'pengajuankpr',
  'pencairankpr', 'spkborong', 'pricelist', 'targetmarketing', 'tagihan'
];
// Registry entitas kanonik. Sumber tunggal untuk cakupan backup/restore dan
// searchAll. HARUS konsisten dengan PRIVILEGED_ENTITIES di bawah serta
// ENTITY_GROUPS/PRIVILEGED_ENTITIES pada firebase-client.js (divalidasi oleh
// architecture.test.js).
var ALL_ENTITIES = [
  'proyek', 'clusterproyek', 'progressunit', 'updateharian', 'materialrequest',
  'budgetkonstruksi', 'blokkavling', 'unit', 'pricelist', 'sertifikat', 'perizinan',
  'dokumenlegal', 'ppjb', 'sppt', 'sengketa', 'berkaskpr', 'prosesbank', 'appraisal',
  'pencairankpr', 'akadajb', 'baliknama', 'royaht', 'pph', 'bphtb', 'pembeli',
  'transaksi', 'booking', 'jualicicilan', 'pengajuankpr', 'jadwalcicilan', 'unitpihak',
  'tagihan', 'marketing', 'prospek', 'followup', 'targetmarketing', 'komisi',
  'arsipdokumen', 'generatesurat', 'pettycash', 'bukubank', 'voucher', 'kartuanggaran',
  'piutang', 'hutang', 'budgetcontrol', 'kartupiutang', 'kartubarangmasuk', 'spkborong',
  'kuitansi', 'approval', 'supplier', 'masterbarang', 'barangkeluar',
  // Entitas warisan Google Sheets tetap dicakup backup/restore/search agar
  // data hasil migrasi tidak pernah tertinggal dari snapshot.
  'pembayaran', 'penjual', 'kprsubsidi', 'kprkomersil', 'kprsyariah',
  'skemapembayaran', 'masterpihak', 'masterunit', 'progressproyek',
  'timelinerencana', 'pajakpbb', 'prosesbanknotaris', 'stokgudang',
  'laporankeuangan', 'dashboardowner', 'laporan', 'pengaturan'
];

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

// Kode error stabil agar klien dapat bercabang tanpa parsing pesan teks.
var ERROR_CODES = {
  VALIDATION: 'VALIDATION_ERROR',
  AUTH: 'AUTH_ERROR',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT: 'RATE_LIMITED',
  INTERNAL: 'INTERNAL_ERROR'
};

function apiError_(code, message) {
  var error = new Error(String(message || 'Terjadi kesalahan.'));
  error.code = code || ERROR_CODES.INTERNAL;
  return error;
}

// Pesan untuk klien dibersihkan dari detail internal (path API, body upstream).
function sanitizeErrorMessage_(message) {
  var text = String(message || 'Terjadi kesalahan.');
  if (/Firestore API gagal \(\d+\)/.test(text)) {
    return apiError_(ERROR_CODES.INTERNAL, 'Operasi database sementara gagal. Coba lagi atau hubungi administrator.');
  }
  if (/Firebase Auth Admin gagal \(\d+\)/.test(text)) {
    return apiError_(ERROR_CODES.INTERNAL, 'Operasi akun pengguna sementara gagal. Coba lagi atau hubungi administrator.');
  }
  if (/Identity Toolkit|API key not valid|PERMISSION_DENIED|UNAUTHENTICATED/i.test(text)) {
    return apiError_(ERROR_CODES.AUTH, 'Sesi tidak valid. Silakan login ulang.');
  }
  return null;
}

function doGet() {
  return jsonResponse_({ success: true, data: { service: 'KBR Firebase Admin API', status: 'ok' } });
}

// Throttle sederhana per-user via CacheService: maksimal 120 aksi tulis
// berat per menit (backup/restore/search/save) untuk membatasi abuse.
var HEAVY_ACTION_LIMIT = 120;
var HEAVY_ACTION_WINDOW_SECONDS = 60;

function assertHeavyActionQuota_(uid, action) {
  var heavy = ['saveRecord', 'deleteRecord', 'uploadFile', 'deleteFile', 'backupData', 'restoreBackup', 'searchAll'];
  if (heavy.indexOf(String(action || '')) === -1) return;
  var cache = CacheService.getScriptCache();
  var key = 'kbr-admin-quota:' + String(uid || 'anon');
  var count = Number(cache.get(key) || 0);
  if (count >= HEAVY_ACTION_LIMIT) {
    throw apiError_(ERROR_CODES.RATE_LIMIT, 'Terlalu banyak operasi. Tunggu sebentar lalu coba lagi.');
  }
  cache.put(key, String(count + 1), HEAVY_ACTION_WINDOW_SECONDS);
}

function doPost(event) {
  try {
    var request = JSON.parse(event && event.postData && event.postData.contents || '{}');
    var session = requireFirebaseSession_(request.idToken);
    var args = Array.isArray(request.args) ? request.args : [];
    var action = String(request.action || '');
    assertHeavyActionQuota_(session.uid, action);
    var result = routeAction_(session, action, args);
    return jsonResponse_({ success: true, data: result });
  } catch (error) {
    var raw = String(error && error.message || error);
    var sanitized = sanitizeErrorMessage_(raw);
    if (sanitized) return jsonResponse_({ success: false, message: sanitized.message, error: sanitized.code });
    return jsonResponse_({
      success: false,
      message: raw,
      error: (error && error.code) || ERROR_CODES.VALIDATION
    });
  }
}

function routeAction_(session, action, args) {
  switch (action) {
    case 'saveRecord': return saveRecord_(session, args[0], args[1]);
    case 'deleteRecord': return deleteRecord_(session, args[0], args[1]);
    case 'uploadFile': return uploadFile_(session, args[0], args[1], args[2], args[3]);
    case 'deleteFile': return deleteFile_(session, args[0], args[1]);
    case 'listAuditLog': return listAuditLog_(session, args[0]);
    case 'backupData': return backupData_(session);
    case 'listBackups': return listBackups_(session);
    case 'restoreBackup': return restoreBackup_(session, args[0]);
    case 'searchAll': return searchAll_(session, args[0]);
    case 'getFinanceSummary': return getFinanceSummary_(session, args[0]);
    case 'resetUserPassword': return resetUserPassword_(session, args[0], args[1]);
    default: throw new Error('Aksi administratif belum tersedia: ' + action);
  }
}

function getConfig_() {
  var properties = PropertiesService.getScriptProperties();
  var projectId = String(properties.getProperty(CONFIG_KEYS.projectId) || '').trim();
  var webApiKey = String(properties.getProperty(CONFIG_KEYS.webApiKey) || '').trim();
  if (!projectId || !webApiKey) {
    throw apiError_(ERROR_CODES.INTERNAL, 'FIREBASE_PROJECT_ID dan FIREBASE_WEB_API_KEY wajib diisi di Script Properties.');
  }
  return { projectId: projectId, webApiKey: webApiKey };
}

function requireFirebaseSession_(idToken) {
  var token = String(idToken || '').trim();
  if (!token) throw apiError_(ERROR_CODES.AUTH, 'Firebase ID token wajib diisi.');
  var config = getConfig_();
  var response = UrlFetchApp.fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(config.webApiKey),
    {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ idToken: token }),
      muteHttpExceptions: true
    }
  );
  if (response.getResponseCode() !== 200) throw apiError_(ERROR_CODES.AUTH, 'Firebase ID token tidak valid atau kedaluwarsa.');
  var account = (JSON.parse(response.getContentText()).users || [])[0];
  if (!account || !account.localId) throw apiError_(ERROR_CODES.AUTH, 'Identitas Firebase tidak ditemukan.');
  var profile = getDocument_('users/' + encodeURIComponent(account.localId));
  if (!profile || String(profile.status || '').toLowerCase() !== 'aktif') throw apiError_(ERROR_CODES.FORBIDDEN, 'Akun tidak aktif.');
  return {
    uid: account.localId,
    email: account.email || '',
    nama: profile.nama || account.email || '',
    username: profile.username || account.email || '',
    role: String(profile.role || 'Manager')
  };
}

function requireAdministrator_(session) {
  if (session.role !== 'Superadmin' && session.role !== 'Admin') {
    throw apiError_(ERROR_CODES.FORBIDDEN, 'Operasi ini hanya dapat dilakukan Admin atau Superadmin.');
  }
}

function identityAdminFetch_(method, suffix, payload) {
  var config = getConfig_();
  var response = UrlFetchApp.fetch(
    'https://identitytoolkit.googleapis.com/v1/projects/' + encodeURIComponent(config.projectId) + suffix,
    {
      method: method,
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      payload: JSON.stringify(payload || {}),
      muteHttpExceptions: true
    }
  );
  var code = response.getResponseCode();
  var text = response.getContentText();
  if (code < 200 || code >= 300) {
    // Detail upstream hanya ke log internal, tidak pernah dikirim ke klien.
    console.error('Firebase Auth Admin gagal (' + code + '): ' + text.slice(0, 500));
    throw apiError_(ERROR_CODES.INTERNAL, 'Operasi akun pengguna sementara gagal.');
  }
  return text ? JSON.parse(text) : true;
}

function createAuthUser_(email, password, displayName) {
  var result = identityAdminFetch_('post', '/accounts', {
    email: String(email || '').trim().toLowerCase(),
    password: String(password || ''),
    displayName: String(displayName || ''),
    emailVerified: false,
    disabled: false
  });
  return result.localId;
}

function updateAuthPassword_(uid, password) {
  return identityAdminFetch_('post', '/accounts:update', { localId: String(uid), password: String(password) });
}

function deleteAuthUser_(uid) {
  return identityAdminFetch_('post', '/accounts:delete', { localId: String(uid) });
}

function firestoreUrl_(path) {
  return 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(getConfig_().projectId) +
    '/databases/(default)/documents/' + path;
}

function firestoreFetch_(method, path, payload, query) {
  var url = firestoreUrl_(path) + (query || '');
  var options = {
    method: method,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  };
  if (payload !== undefined && payload !== null) {
    options.contentType = 'application/json';
    options.payload = JSON.stringify(payload);
  }
  var response = UrlFetchApp.fetch(url, options);
  var code = response.getResponseCode();
  var text = response.getContentText();
  if (code === 404) return null;
  if (code < 200 || code >= 300) {
    console.error('Firestore API gagal (' + code + '): ' + text.slice(0, 500));
    throw apiError_(code === 429 ? ERROR_CODES.RATE_LIMIT : ERROR_CODES.INTERNAL,
      code === 429 ? 'Database sedang sibuk. Coba lagi sebentar.' : 'Operasi database sementara gagal.');
  }
  return text ? JSON.parse(text) : true;
}

// ===== Transaksi Firestore (REST) =====
// Menutup celah TOCTOU: baca-dalam-transaksi + commit atomik, dengan retry
// otomatis saat terjadi contention (ABORTED).
var TX_MAX_RETRIES = 3;

function firestoreBaseUrl_() {
  // Endpoint transaksi (:beginTransaction / :commit) menempel pada
  // koleksi 'documents', bukan pada resource database.
  return 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(getConfig_().projectId) +
    '/databases/(default)/documents';
}

function firestoreBeginTransaction_() {
  var response = UrlFetchApp.fetch(firestoreBaseUrl_() + ':beginTransaction', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({ options: { readWrite: {} } }),
    muteHttpExceptions: true
  });
  var text = response.getContentText();
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    console.error('beginTransaction gagal (' + response.getResponseCode() + '): ' + text.slice(0, 500));
    throw apiError_(ERROR_CODES.INTERNAL, 'Operasi database sementara gagal.');
  }
  return JSON.parse(text).transaction;
}

function firestoreGetInTransaction_(path, transaction) {
  var url = firestoreUrl_(path) + '?transaction=' + encodeURIComponent(transaction);
  var response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
  var code = response.getResponseCode();
  var text = response.getContentText();
  if (code === 404) return null;
  if (code < 200 || code >= 300) {
    console.error('Firestore tx get gagal (' + code + '): ' + text.slice(0, 500));
    throw apiError_(ERROR_CODES.INTERNAL, 'Operasi database sementara gagal.');
  }
  return JSON.parse(text);
}

function firestoreCommitTransaction_(transaction, writes) {
  var response = UrlFetchApp.fetch(firestoreBaseUrl_() + ':commit', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({ transaction: transaction, writes: writes }),
    muteHttpExceptions: true
  });
  var code = response.getResponseCode();
  var text = response.getContentText();
  if (code >= 200 && code < 300) return text ? JSON.parse(text) : true;
  // 409 ABORTED = contention; caller melakukan retry transaksi baru.
  if (code === 409) throw apiError_(ERROR_CODES.CONFLICT, '__TX_ABORTED__');
  console.error('commit gagal (' + code + '): ' + text.slice(0, 500));
  throw apiError_(ERROR_CODES.INTERNAL, 'Operasi database sementara gagal.');
}

// Patch dokumen di dalam transaksi (tanpa precondition tambahan â€” transaksi
// sudah menjamin snapshot konsisten).
function txPatchWrite_(path, data) {
  return { update: { name: recordDocName_(path), fields: toFields_(data) } };
}

function recordDocName_(path) {
  var base = 'projects/' + getConfig_().projectId + '/databases/(default)/documents/';
  return base + path;
}

function txDeleteWrite_(path) {
  return { delete: recordDocName_(path) };
}

function isTxAborted_(error) {
  return error && error.message === '__TX_ABORTED__';
}

function toValue_(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toValue_) } };
  if (Object.prototype.toString.call(value) === '[object Date]') return { timestampValue: value.toISOString() };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    if (!isFinite(value)) throw new Error('Nilai angka tidak valid.');
    return Math.floor(value) === value ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === 'object') return { mapValue: { fields: toFields_(value) } };
  return { stringValue: String(value) };
}

function toFields_(object) {
  var fields = {};
  Object.keys(object || {}).forEach(function (key) {
    if (object[key] !== undefined) fields[key] = toValue_(object[key]);
  });
  return fields;
}

function fromValue_(value) {
  if (!value) return null;
  if (Object.prototype.hasOwnProperty.call(value, 'nullValue')) return null;
  if (Object.prototype.hasOwnProperty.call(value, 'stringValue')) return value.stringValue;
  if (Object.prototype.hasOwnProperty.call(value, 'integerValue')) return Number(value.integerValue);
  if (Object.prototype.hasOwnProperty.call(value, 'doubleValue')) return Number(value.doubleValue);
  if (Object.prototype.hasOwnProperty.call(value, 'booleanValue')) return value.booleanValue;
  if (Object.prototype.hasOwnProperty.call(value, 'timestampValue')) return value.timestampValue;
  if (value.arrayValue) return (value.arrayValue.values || []).map(fromValue_);
  if (value.mapValue) return fromFields_(value.mapValue.fields || {});
  return null;
}

function fromFields_(fields) {
  var result = {};
  Object.keys(fields || {}).forEach(function (key) { result[key] = fromValue_(fields[key]); });
  return result;
}

function getDocument_(path) {
  var document = firestoreFetch_('get', path);
  return document ? fromFields_(document.fields || {}) : null;
}

function listCollection_(path, limit) {
  var take = Math.min(Math.max(Number(limit) || 10000, 1), 10000);
  var result = [];
  var pageToken = '';
  do {
    var pageSize = Math.min(1000, take - result.length);
    var query = '?pageSize=' + pageSize + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
    var response = firestoreFetch_('get', path, null, query);
    ((response && response.documents) || []).forEach(function (document) {
      var record = fromFields_(document.fields || {});
      if (!record.id) record.id = document.name.split('/').pop();
      result.push(record);
    });
    pageToken = response && response.nextPageToken || '';
  } while (pageToken && result.length < take);
  return result;
}

function setDocument_(path, data) {
  return firestoreFetch_('patch', path, { fields: toFields_(data) });
}

function deleteDocument_(path) {
  return firestoreFetch_('delete', path);
}

function recordPath_(entity, id) {
  return 'entities/' + encodeURIComponent(entity) + '/records/' + encodeURIComponent(id);
}

function normalized_(value) {
  return String(value == null ? '' : value).trim().toLowerCase();
}

function number_(value, label) {
  var number = Number(String(value == null ? '' : value).replace(/[^0-9.-]/g, ''));
  if (!isFinite(number) || number < 0) throw new Error((label || 'Nilai') + ' harus berupa angka nonnegatif.');
  return number;
}

function percentage_(value, label, defaultValue) {
  var source = value == null || value === '' ? defaultValue : value;
  var result = number_(source, label);
  if (result > 100) throw new Error((label || 'Persentase') + ' harus 0 sampai 100%.');
  return result;
}

function validateAndDerive_(entity, record, existing) {
  var result = JSON.parse(JSON.stringify(record || {}));
  if (entity === 'pengaturan') {
    var hexFields = ['warnaUtama', 'warnaSidebar', 'warnaAksen'];
    hexFields.forEach(function (field) {
      if (result[field] && !/^#[0-9a-fA-F]{6}$/.test(String(result[field]))) {
        throw new Error(field + ' wajib menggunakan format warna HEX, contoh #2E6FB7.');
      }
    });
    if (result.logoUrl && !/^https:\/\//i.test(String(result.logoUrl))) {
      throw new Error('URL logo wajib menggunakan HTTPS.');
    }
    ['namaPerusahaan', 'namaSingkat', 'tagline', 'alamat', 'telepon', 'email', 'footerDokumen'].forEach(function (field) {
      if (String(result[field] || '').length > 500) throw new Error(field + ' maksimal 500 karakter.');
    });
    ['templateSurat', 'templateKuitansi', 'templateSpk', 'templateDetail'].forEach(function (field) {
      if (String(result[field] || '').length > 5000) throw new Error(field + ' maksimal 5.000 karakter.');
    });
    var customTemplates = Array.isArray(result.customSuratTemplates) ? result.customSuratTemplates : [];
    if (customTemplates.length > 10) throw new Error('Template surat maksimal 10 file.');
    result.customSuratTemplates = customTemplates.map(function (template, index) {
      var item = template || {};
      if (!/^tpl-[0-9]+$/.test(String(item.id || ''))) throw new Error('ID template ke-' + (index + 1) + ' tidak valid.');
      if (!String(item.nama || '').trim() || String(item.nama).length > 120) throw new Error('Nama template wajib diisi dan maksimal 120 karakter.');
      if (!String(item.isi || '').trim() || String(item.isi).length > 30000) throw new Error('Isi template wajib diisi dan maksimal 30.000 karakter.');
      return { id: String(item.id), nama: String(item.nama).trim(), isi: String(item.isi), aktif: item.aktif !== false, file: item.file || null };
    });
    result.id = 'default';
  }
  if (entity === 'approval') {
    var level1 = String(result.level1Status || 'Menunggu');
    var level2 = String(result.level2Status || 'Menunggu');
    if (level2 !== 'Menunggu' && level1 !== 'Disetujui') throw new Error('Approval level 2 menunggu persetujuan level 1.');
    result.status = level1 === 'Ditolak' || level2 === 'Ditolak' ? 'Ditolak' :
      level1 === 'Disetujui' && level2 === 'Disetujui' ? 'Disetujui' :
      level1 === 'Disetujui' ? 'Disetujui Sebagian' : 'Menunggu';
  }
  if (entity === 'pph') {
    var tarifPph = number_(result.tarifPph == null || result.tarifPph === '' ? 2.5 : result.tarifPph, 'Tarif PPh');
    if (tarifPph > 100) throw new Error('Tarif PPh harus 0 sampai 100%.');
    result.nilaiPph = Math.round(number_(result.nilaiTransaksi, 'Nilai transaksi') * tarifPph / 100);
  }
  if (entity === 'bphtb') {
    var tarifBphtb = number_(result.tarifBphtb == null || result.tarifBphtb === '' ? 5 : result.tarifBphtb, 'Tarif BPHTB');
    if (tarifBphtb > 100) throw new Error('Tarif BPHTB harus 0 sampai 100%.');
    var npoptkp = number_(result.npoptkp == null || result.npoptkp === '' ? 80000000 : result.npoptkp, 'NPOPTKP');
    result.nilaiBphtb = Math.round(Math.max(0, number_(result.nilaiTransaksi, 'Nilai transaksi') - npoptkp) * tarifBphtb / 100);
  }
  if (entity === 'pengajuankpr') {
    var nilaiRumah = number_(result.nilaiRumah, 'Nilai rumah');
    var uangMuka = number_(result.uangMuka, 'Uang muka');
    if (uangMuka > nilaiRumah) throw new Error('Uang muka tidak boleh melebihi nilai rumah.');
    result.plafondKPR = nilaiRumah - uangMuka;
  }
  if (entity === 'budgetcontrol') {
    var rencana = number_(result.rencanaBudget, 'Rencana budget');
    var realisasi = number_(result.realisasi, 'Realisasi');
    result.sisaBudget = rencana - realisasi;
    result.prosSisaBudget = rencana > 0 ? Math.round(result.sisaBudget / rencana * 100) : 0;
  }
  if (entity === 'komisi') {
    var nominal = Math.round(number_(result.nilaiTransaksi, 'Nilai transaksi') * percentage_(result.persenKomisi, 'Persen komisi', 0) / 100);
    var potongan = number_(result.potonganPajak, 'Potongan pajak');
    if (potongan > nominal) throw new Error('Potongan pajak tidak boleh melebihi komisi.');
    result.nominalKomisi = nominal;
    result.komisiDiterima = nominal - potongan;
  }
  if (entity === 'spkborong') {
    var borongan = number_(result.nilaiBorongan, 'Nilai borongan');
    var ppn = percentage_(result.ppnPersen, 'PPN', 11);
    result.ppnNilai = Math.round(borongan * ppn / 100);
    result.totalNilai = borongan + result.ppnNilai;
  }
  if (entity === 'pricelist') {
    var hargaDasar = number_(result.hargaDasar, 'Harga dasar');
    var diskon = number_(result.diskonMaksimal, 'Diskon maksimal');
    result.hargaJual = Math.round(hargaDasar * (100 + percentage_(result.kenaikanPersen, 'Kenaikan harga', 0)) / 100);
    if (diskon > result.hargaJual) throw new Error('Diskon maksimal tidak boleh melebihi harga jual.');
    result.hargaMinimal = result.hargaJual - diskon;
  }
  if (entity === 'targetmarketing') {
    var targetNilai = number_(result.targetNilai, 'Target nilai');
    var targetUnit = number_(result.targetUnit, 'Target unit');
    var basisTarget = targetNilai > 0 ? targetNilai : targetUnit;
    var basisRealisasi = targetNilai > 0 ? number_(result.realisasiNilai, 'Realisasi nilai') : number_(result.realisasiUnit, 'Realisasi unit');
    result.pencapaianPersen = basisTarget > 0 ? Math.round(basisRealisasi / basisTarget * 100) : 0;
    result.status = result.pencapaianPersen > 100 ? 'Melebihi Target' : result.pencapaianPersen === 100 ? 'Tercapai' : 'Belum Tercapai';
  }
  if (entity === 'piutang' || entity === 'hutang') {
    var principal = number_(entity === 'piutang' ? result.hargaTransaksi : result.nilaiKontrak, entity === 'piutang' ? 'Harga transaksi' : 'Nilai kontrak');
    var paid = number_(result.totalDibayarSebelumnya, 'Total dibayar sebelumnya') + number_(result.dibayarBulanIni, 'Dibayar bulan ini');
    if (paid > principal) throw new Error('Total pembayaran tidak boleh melebihi nilai pokok.');
    result.totalDibayar = paid;
    result[entity === 'piutang' ? 'sisaPiutang' : 'sisaHutang'] = principal - paid;
    if (paid === principal && normalized_(result.status) !== 'batal') result.status = 'Lunas';
  }
  if (entity === 'tagihan') {
    number_(result.jumlah, 'Jumlah tagihan');
    if (normalized_(result.status) !== 'lunas') {
      var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      result.status = result.jatuhTempo && String(result.jatuhTempo) < today ? 'Terlambat' : 'Belum Lunas';
    }
  }
  if (entity === 'transaksi') {
    var previous = normalized_(existing && existing.status);
    var next = normalized_(result.status);
    var allowed = { '': ['booking'], booking: ['booking', 'ppjb', 'batal'], ppjb: ['ppjb', 'akad kredit', 'batal'], 'akad kredit': ['akad kredit', 'lunas', 'batal'], lunas: ['lunas'], batal: ['batal'] };
    if (!allowed[previous] || allowed[previous].indexOf(next) === -1) throw new Error('Transisi status transaksi tidak diizinkan.');
  }
  return result;
}

function assertNoDoubleBooking_(entity, record, otherRecords) {
  if (entity !== 'transaksi' && entity !== 'booking') return;
  if (['booking', 'ppjb', 'akad kredit', 'lunas'].indexOf(normalized_(record.status)) === -1) return;
  var key = normalized_(record.proyek) + '|' + normalized_(record.nomorUnit || record.unit);
  (otherRecords || []).forEach(function (other) {
    var otherKey = normalized_(other.proyek) + '|' + normalized_(other.nomorUnit || other.unit);
    if (String(other.id) !== String(record.id) && otherKey === key && ['booking', 'ppjb', 'akad kredit', 'lunas'].indexOf(normalized_(other.status)) !== -1) {
      throw apiError_(ERROR_CODES.CONFLICT, 'Double booking ditolak: unit sudah memiliki transaksi aktif.');
    }
  });
}

// Membaca seluruh dokumen koleksi DI DALAM transaksi sehingga pemeriksaan
// double-booking dan penulisan berbagi snapshot konsisten (menutup TOCTOU).
function listCollectionInTransaction_(entity, transaction) {
  var url = firestoreUrl_('entities/' + encodeURIComponent(entity)) + ':runQuery';
  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({
      transaction: transaction,
      structuredQuery: { from: [{ collectionId: 'records' }] }
    }),
    muteHttpExceptions: true
  });
  var code = response.getResponseCode();
  var text = response.getContentText();
  if (code < 200 || code >= 300) {
    console.error('runQuery tx gagal (' + code + '): ' + text.slice(0, 500));
    throw apiError_(ERROR_CODES.INTERNAL, 'Operasi database sementara gagal.');
  }
  var result = [];
  JSON.parse(text).forEach(function (row) {
    if (!row || !row.document) return;
    var record = fromFields_(row.document.fields || {});
    if (!record.id) record.id = row.document.name.split('/').pop();
    result.push(record);
  });
  return result;
}

function runWithTransaction_(fn) {
  var lastError = null;
  for (var attempt = 0; attempt < TX_MAX_RETRIES; attempt++) {
    var transaction = firestoreBeginTransaction_();
    try {
      return fn(transaction);
    } catch (error) {
      lastError = error;
      if (!isTxAborted_(error)) throw error;
      Utilities.sleep(150 * (attempt + 1));
    }
  }
  throw apiError_(ERROR_CODES.CONFLICT,
    'Database sedang sibuk oleh perubahan lain. Ulangi beberapa saat lagi.');
}

function saveRecord_(session, entity, record) {
  requireAdministrator_(session);
  entity = String(entity || '').trim();
  if (PRIVILEGED_ENTITIES.indexOf(entity) === -1) throw new Error('Entity ini harus ditulis langsung melalui Firestore Rules.');
  if (!record || !record.id) throw apiError_(ERROR_CODES.VALIDATION, 'record.id wajib diisi.');
  if (entity === 'pengaturan' && session.role !== 'Superadmin') {
    throw apiError_(ERROR_CODES.FORBIDDEN, 'Hanya Superadmin yang dapat mengubah pengaturan aplikasi.');
  }
  if (entity === 'pengguna') {
    if (session.role !== 'Superadmin') throw apiError_(ERROR_CODES.FORBIDDEN, 'Hanya Superadmin yang dapat mengelola profil pengguna.');
    var existingProfile = getDocument_('users/' + encodeURIComponent(record.id));
    var password = String(record.password || '');
    if (!existingProfile) {
      if (!record.email) throw apiError_(ERROR_CODES.VALIDATION, 'Email pengguna wajib diisi.');
      if (password.length < 8) throw apiError_(ERROR_CODES.VALIDATION, 'Password pengguna minimal 8 karakter.');
      record.id = createAuthUser_(record.email, password, record.nama);
    } else if (password) {
      if (password.length < 8) throw apiError_(ERROR_CODES.VALIDATION, 'Password pengguna minimal 8 karakter.');
      updateAuthPassword_(record.id, password);
    }
    delete record.password;
    delete record.passwordHash;
    delete record.pin;
    delete record.pinHash;
    // Status kanonik: selalu kapitalisasi 'Aktif' agar konsisten dengan rules.
    record.status = normalized_(record.status) === 'aktif' || !record.status ? 'Aktif' : String(record.status).trim();
    record.updatedAt = new Date().toISOString();
    if (!existingProfile) record.createdAt = record.updatedAt;
    setDocument_('users/' + encodeURIComponent(record.id), record);
    appendAudit_(session, existingProfile ? 'UPDATE' : 'CREATE', entity, record.id, {});
    return record;
  }
  var auditAction = '';
  var saved = runWithTransaction_(function (transaction) {
    var path = recordPath_(entity, record.id);
    var document = firestoreGetInTransaction_(path, transaction);
    var existing = document ? fromFields_(document.fields || {}) : null;
    var derived = validateAndDerive_(entity, record, existing);
    var needsScan = entity === 'transaksi' || entity === 'booking';
    var siblings = needsScan ? listCollectionInTransaction_(entity, transaction) : [];
    assertNoDoubleBooking_(entity, derived, siblings);
    derived.updatedAt = new Date().toISOString();
    derived.createdAt = existing && existing.createdAt ? existing.createdAt : derived.updatedAt;
    firestoreCommitTransaction_(transaction, [txPatchWrite_(path, derived)]);
    auditAction = existing ? 'UPDATE' : 'CREATE';
    return derived;
  });
  appendAudit_(session, auditAction, entity, record.id, {});
  return saved;
}

function deleteRecord_(session, entity, id) {
  requireAdministrator_(session);
  entity = String(entity || '').trim();
  if (PRIVILEGED_ENTITIES.indexOf(entity) === -1) throw new Error('Entity ini harus dihapus langsung melalui Firestore Rules.');
  if ((entity === 'pengguna' || entity === 'pengaturan') && session.role !== 'Superadmin') {
    throw apiError_(ERROR_CODES.FORBIDDEN, 'Hanya Superadmin yang dapat mengelola data ini.');
  }
  if (entity === 'pengguna') {
    deleteAuthUser_(id);
    deleteDocument_('users/' + encodeURIComponent(id));
  } else {
    runWithTransaction_(function (transaction) {
      var path = recordPath_(entity, id);
      var document = firestoreGetInTransaction_(path, transaction);
      if (!document) throw apiError_(ERROR_CODES.NOT_FOUND, 'Data tidak ditemukan atau sudah dihapus.');
      firestoreCommitTransaction_(transaction, [txDeleteWrite_(path)]);
      return true;
    });
  }
  appendAudit_(session, 'DELETE', entity, id, {});
  return true;
}

function resetUserPassword_(session, userId, newPassword) {
  if (session.role !== 'Superadmin') throw apiError_(ERROR_CODES.FORBIDDEN, 'Hanya Superadmin yang dapat mereset password.');
  if (String(newPassword || '').length < 8) throw new Error('Password baru minimal 8 karakter.');
  updateAuthPassword_(userId, newPassword);
  appendAudit_(session, 'RESET_PASSWORD', 'pengguna', userId, {});
  return true;
}

function appendAudit_(session, action, entity, recordId, details) {
  var id = Utilities.getUuid();
  setDocument_('auditLogs/' + id, {
    id: id, timestamp: new Date().toISOString(), userId: session.uid, username: session.username,
    role: session.role, action: action, entity: entity, recordId: String(recordId || ''), details: details || {}
  });
}

function listAuditLog_(session, limit) {
  if (session.role !== 'Superadmin') throw apiError_(ERROR_CODES.FORBIDDEN, 'Hanya Superadmin yang dapat melihat audit log.');
  return listCollection_('auditLogs', limit || 500).sort(function (a, b) { return String(b.timestamp).localeCompare(String(a.timestamp)); });
}

function ensureFolder_(name) {
  var folders = DriveApp.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(name);
}

function uploadFile_(session, entity, fileName, mimeType, base64Data) {
  requireAdministrator_(session);
  entity = String(entity || '').trim();
  fileName = String(fileName || '').trim();
  mimeType = String(mimeType || '').toLowerCase();
  if (entity === 'pengaturan' && session.role !== 'Superadmin') throw apiError_(ERROR_CODES.FORBIDDEN, 'Hanya Superadmin yang dapat mengunggah aset pengaturan.');
  var bytes = Utilities.base64Decode(String(base64Data || ''));
  if (!fileName || !bytes.length) throw new Error('File wajib diisi.');
  if (bytes.length > MAX_UPLOAD_BYTES) throw new Error('Ukuran file maksimal 8 MB.');
  var isLogo = /^image\/(png|jpeg|webp)$/.test(mimeType) && /\.(png|jpe?g|webp)$/i.test(fileName);
  var isWord = /\.(doc|docx)$/i.test(fileName) && [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/octet-stream',
    ''
  ].indexOf(mimeType) !== -1;
  if (entity === 'pengaturan' && !isLogo && !isWord) throw new Error('Aset pengaturan hanya menerima PNG/JPG/WebP atau DOC/DOCX.');
  if (entity === 'pengaturan' && isLogo && bytes.length > 2 * 1024 * 1024) throw new Error('Ukuran logo maksimal 2 MB.');
  var file = ensureFolder_(DOC_FOLDER_NAME).createFile(Utilities.newBlob(bytes, mimeType || 'application/octet-stream', fileName));
  var directUrl = '';
  if (entity === 'pengaturan' && isLogo) {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    directUrl = 'https://drive.google.com/uc?export=view&id=' + encodeURIComponent(file.getId());
  }
  appendAudit_(session, 'UPLOAD', entity, file.getId(), { name: file.getName(), size: file.getSize() });
  return { id: file.getId(), name: file.getName(), url: file.getUrl(), directUrl: directUrl, mimeType: file.getMimeType(), size: file.getSize(), uploadedAt: new Date().toISOString() };
}

function deleteFile_(session, entity, fileId) {
  requireAdministrator_(session);
  if (String(entity || '') === 'pengaturan' && session.role !== 'Superadmin') {
    throw apiError_(ERROR_CODES.FORBIDDEN, 'Hanya Superadmin yang dapat menghapus aset pengaturan.');
  }
  // Least privilege: hanya file dalam folder dokumen KBR yang boleh dihapus,
  // bukan file Drive lain mana pun yang kebetulan bisa dijangkau service account.
  var file = DriveApp.getFileById(String(fileId || '').trim());
  var allowedFolders = [ensureFolder_(DOC_FOLDER_NAME).getId(), ensureFolder_(BACKUP_FOLDER_NAME).getId()];
  var parents = file.getParents();
  var belongs = false;
  while (parents.hasNext()) {
    if (allowedFolders.indexOf(parents.next().getId()) !== -1) { belongs = true; break; }
  }
  if (!belongs) throw apiError_(ERROR_CODES.FORBIDDEN, 'File berada di luar penyimpanan dokumen aplikasi.');
  file.setTrashed(true);
  appendAudit_(session, 'DELETE_FILE', entity, fileId, {});
  return true;
}

function backupData_(session) {
  if (session.role !== 'Superadmin') throw apiError_(ERROR_CODES.FORBIDDEN, 'Hanya Superadmin yang dapat membuat backup.');
  var snapshot = { exportedAt: new Date().toISOString(), users: listCollection_('users'), entities: {} };
  ALL_ENTITIES.forEach(function (entity) {
    snapshot.entities[entity] = listCollection_('entities/' + encodeURIComponent(entity) + '/records');
  });
  var name = 'backup-firestore-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss') + '.json';
  var file = ensureFolder_(BACKUP_FOLDER_NAME).createFile(Utilities.newBlob(JSON.stringify(snapshot, null, 2), 'application/json', name));
  appendAudit_(session, 'BACKUP', 'system', file.getId(), { name: name });
  return { id: file.getId(), name: name, url: file.getUrl(), size: file.getSize(), createdAt: new Date().toISOString() };
}

function listBackups_(session) {
  if (session.role !== 'Superadmin') throw apiError_(ERROR_CODES.FORBIDDEN, 'Hanya Superadmin yang dapat melihat backup.');
  var files = ensureFolder_(BACKUP_FOLDER_NAME).getFiles();
  var result = [];
  while (files.hasNext()) {
    var file = files.next();
    result.push({ id: file.getId(), name: file.getName(), url: file.getUrl(), size: file.getSize(), createdAt: file.getDateCreated().toISOString() });
  }
  return result.sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
}

function restoreBackup_(session, fileId) {
  if (session.role !== 'Superadmin') throw apiError_(ERROR_CODES.FORBIDDEN, 'Hanya Superadmin yang dapat memulihkan backup.');
  var id = String(fileId || '').trim();
  if (!id) throw new Error('File backup wajib dipilih.');

  var file = DriveApp.getFileById(id);
  var backupFolder = ensureFolder_(BACKUP_FOLDER_NAME);
  var parentFolders = file.getParents();
  var belongsToBackupFolder = false;
  while (parentFolders.hasNext()) {
    if (parentFolders.next().getId() === backupFolder.getId()) {
      belongsToBackupFolder = true;
      break;
    }
  }
  if (!belongsToBackupFolder) throw new Error('File bukan bagian dari folder backup KBR.');

  var snapshot;
  try {
    snapshot = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  } catch (error) {
    throw new Error('File backup tidak valid atau rusak.');
  }
  if (!snapshot || !Array.isArray(snapshot.users) || !snapshot.entities || typeof snapshot.entities !== 'object') {
    throw new Error('Format file backup tidak dikenali.');
  }

  var snapshotUserIds = {};
  snapshot.users.forEach(function (user) {
    if (user && user.id) snapshotUserIds[String(user.id)] = true;
  });

  // Urutan aman: tulis SEMUA data snapshot lebih dulu, baru hapus dokumen
  // yang tidak ada di snapshot. Kegagalan di tengah jalan tidak pernah
  // meninggalkan database kosong.
  var written = 0;
  var deleted = 0;
  var orphanedAuthUsers = [];

  snapshot.users.forEach(function (user) {
    if (!user || !user.id) return;
    var cleanUser = JSON.parse(JSON.stringify(user));
    delete cleanUser.password;
    delete cleanUser.passwordHash;
    delete cleanUser.pin;
    delete cleanUser.pinHash;
    if (!cleanUser.createdAt) cleanUser.createdAt = snapshot.exportedAt || new Date().toISOString();
    setDocument_('users/' + encodeURIComponent(cleanUser.id), cleanUser);
    written++;
  });
  listCollection_('users').forEach(function (user) {
    if (user && user.id && !snapshotUserIds[String(user.id)]) {
      // Profil Firestore dihapus, namun akun Firebase Auth TIDAK dihapus
      // di sini agar kegagalan parsial tidak memutus akses secara permanen.
      // Daftarkan sebagai orphan untuk ditinjau Superadmin.
      orphanedAuthUsers.push(String(user.id));
      deleteDocument_('users/' + encodeURIComponent(user.id));
      deleted++;
    }
  });

  ALL_ENTITIES.forEach(function (entity) {
    var records = Array.isArray(snapshot.entities[entity]) ? snapshot.entities[entity] : [];
    var snapshotRecordIds = {};
    records.forEach(function (record) {
      if (record && record.id) snapshotRecordIds[String(record.id)] = true;
    });
    records.forEach(function (record) {
      if (record && record.id) {
        var clean = JSON.parse(JSON.stringify(record));
        if (!clean.createdAt) clean.createdAt = snapshot.exportedAt || new Date().toISOString();
        setDocument_(recordPath_(entity, record.id), clean);
        written++;
      }
    });
    listCollection_('entities/' + encodeURIComponent(entity) + '/records').forEach(function (record) {
      if (record && record.id && !snapshotRecordIds[String(record.id)]) {
        deleteDocument_(recordPath_(entity, record.id));
        deleted++;
      }
    });
  });

  appendAudit_(session, 'RESTORE_BACKUP', 'system', id, { name: file.getName(), written: written, deleted: deleted });
  return { restored: true, fileId: id, fileName: file.getName(), written: written, deleted: deleted, orphanedAuthUsers: orphanedAuthUsers };
}

function searchAll_(session, query) {
  var text = normalized_(query);
  if (text.length < 2) return [];
  var hits = [];
  ALL_ENTITIES.some(function (entity) {
    listCollection_('entities/' + encodeURIComponent(entity) + '/records', 300).some(function (record) {
      if (JSON.stringify(record).toLowerCase().indexOf(text) !== -1) hits.push({ entity: entity, id: record.id, label: record.nama || record.namaPembeli || record.nomorUnit || record.id, subtitle: record.status || record.proyek || '' });
      return hits.length >= 60;
    });
    return hits.length >= 60;
  });
  return hits;
}

function getFinanceSummary_(session) {
  var pettycash = listCollection_('entities/pettycash/records');
  var bukubank = listCollection_('entities/bukubank/records');
  var piutang = listCollection_('entities/piutang/records');
  var hutang = listCollection_('entities/hutang/records');
  var budget = listCollection_('entities/budgetcontrol/records');

  var totalMasuk = 0;
  var totalKeluar = 0;
  var perAkun = {};
  pettycash.concat(bukubank).forEach(function (row) {
    var masuk = Number(row.kredit || 0);
    var keluar = Number(row.debet || 0);
    totalMasuk += masuk;
    totalKeluar += keluar;
    var akun = String(row.akun || row.kategori || 'Tanpa Akun').trim() || 'Tanpa Akun';
    if (!perAkun[akun]) perAkun[akun] = { akun: akun, masuk: 0, keluar: 0 };
    perAkun[akun].masuk += masuk;
    perAkun[akun].keluar += keluar;
  });

  var openPiutang = 0;
  piutang.forEach(function (row) {
    if (normalized_(row.status) === 'batal') return;
    var sisa = Number(row.sisaPiutang == null ? (Number(row.hargaTransaksi || 0) - Number(row.totalDibayar || 0)) : row.sisaPiutang);
    if (sisa > 0) openPiutang += sisa;
  });
  var openHutang = 0;
  hutang.forEach(function (row) {
    if (normalized_(row.status) === 'batal') return;
    var sisa = Number(row.sisaHutang == null ? (Number(row.nilaiKontrak || 0) - Number(row.totalDibayar || 0)) : row.sisaHutang);
    if (sisa > 0) openHutang += sisa;
  });

  var totalBudgetRencana = 0;
  var totalBudgetRealisasi = 0;
  var perKategoriKeluar = {};
  budget.forEach(function (row) {
    var rencana = Number(row.rencanaBudget || 0);
    var realisasi = Number(row.realisasi || 0);
    totalBudgetRencana += rencana;
    totalBudgetRealisasi += realisasi;
    var kategori = String(row.kategori || row.pekerjaan || 'Lainnya').trim() || 'Lainnya';
    if (!perKategoriKeluar[kategori]) perKategoriKeluar[kategori] = { kategori: kategori, realisasi: 0 };
    perKategoriKeluar[kategori].realisasi += realisasi;
  });
  Object.keys(perKategoriKeluar).forEach(function (key) { perKategoriKeluar[key].realisasi = Math.round(perKategoriKeluar[key].realisasi); });

  return {
    totalMasuk: Math.round(totalMasuk),
    totalKeluar: Math.round(totalKeluar),
    netCashflow: Math.round(totalMasuk - totalKeluar),
    totalPiutangOpen: Math.round(openPiutang),
    totalHutangOpen: Math.round(openHutang),
    totalBudgetRencana: Math.round(totalBudgetRencana),
    totalBudgetRealisasi: Math.round(totalBudgetRealisasi),
    sisaBudget: Math.round(totalBudgetRencana - totalBudgetRealisasi),
    perAkun: Object.keys(perAkun).map(function (key) {
      return { akun: key, masuk: Math.round(perAkun[key].masuk), keluar: Math.round(perAkun[key].keluar) };
    }),
    perKategoriKeluar: Object.keys(perKategoriKeluar).map(function (key) {
      return { kategori: key, realisasi: perKategoriKeluar[key].realisasi };
    })
  };
}

function migrateLegacySheetToFirestore() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data');
  if (!sheet || sheet.getLastRow() < 2) return { migrated: 0, skipped: 0 };
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
  var migrated = 0;
  var skipped = 0;
  var skippedReasons = [];
  values.forEach(function (row) {
    try {
      var entity = String(row[0] || '').trim();
      var id = String(row[1] || '').trim();
      if (!entity || !id) throw new Error('Entity/id kosong');
      var record;
      try {
        record = JSON.parse(row[2]);
      } catch (parseError) {
        throw new Error('JSON tidak valid pada baris entity=' + entity + ', id=' + id);
      }
      record.id = id;
      if (entity === 'pengguna') {
        skipped++;
        skippedReasons.push(entity + '/' + id + ': akun dibuat melalui Firebase Auth');
        return;
      }
      if (!record.createdAt) record.createdAt = record.updatedAt || new Date().toISOString();
      setDocument_(recordPath_(entity, id), record);
      migrated++;
    } catch (error) {
      skipped++;
      skippedReasons.push(String(error && error.message || error));
    }
  });
  return { migrated: migrated, skipped: skipped, skippedReasons: skippedReasons };
}

// Maintenance satu kali (dijalankan manual oleh Superadmin dari editor GAS):
// menormalkan casing status profil pengguna ke 'Aktif' dan memastikan
// setiap profil memiliki createdAt.
function normalizeUserProfileStatuses() {
  var normalized = 0;
  listCollection_('users').forEach(function (user) {
    if (!user || !user.id) return;
    var patch = {};
    if (normalized_(user.status) === 'aktif' && user.status !== 'Aktif') {
      patch.status = 'Aktif';
    }
    if (!user.createdAt) {
      patch.createdAt = user.updatedAt || new Date().toISOString();
    }
    if (Object.keys(patch).length) {
      setDocument_('users/' + encodeURIComponent(user.id), Object.assign({}, user, patch));
      normalized++;
    }
  });
  return { normalized: normalized };
}