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
var ALL_ENTITIES = [
  'proyek', 'clusterproyek', 'progressunit', 'updateharian', 'materialrequest',
  'budgetkonstruksi', 'blokkavling', 'unit', 'pricelist', 'sertifikat', 'perizinan',
  'dokumenlegal', 'ppjb', 'sppt', 'sengketa', 'berkaskpr', 'prosesbank', 'appraisal',
  'pencairankpr', 'akadajb', 'baliknama', 'royaht', 'pph', 'bphtb', 'pembeli',
  'transaksi', 'jualicicilan', 'pengajuankpr', 'jadwalcicilan', 'unitpihak', 'tagihan',
  'marketing', 'prospek', 'followup', 'targetmarketing', 'komisi', 'arsipdokumen',
  'pettycash', 'bukubank', 'voucher', 'kartuanggaran', 'piutang', 'hutang',
  'budgetcontrol', 'kartupiutang', 'kartubarangmasuk', 'spkborong', 'kuitansi',
  'approval', 'supplier', 'masterbarang', 'barangkeluar', 'arsipdokumen', 'generatesurat',
  'laporan', 'pengaturan'
];

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return jsonResponse_({ success: true, data: { service: 'KBR Firebase Admin API', status: 'ok' } });
}

function doPost(event) {
  try {
    var request = JSON.parse(event && event.postData && event.postData.contents || '{}');
    var session = requireFirebaseSession_(request.idToken);
    var args = Array.isArray(request.args) ? request.args : [];
    var result = routeAction_(session, String(request.action || ''), args);
    return jsonResponse_({ success: true, data: result });
  } catch (error) {
    return jsonResponse_({ success: false, message: String(error && error.message || error) });
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
    throw new Error('FIREBASE_PROJECT_ID dan FIREBASE_WEB_API_KEY wajib diisi di Script Properties.');
  }
  return { projectId: projectId, webApiKey: webApiKey };
}

function requireFirebaseSession_(idToken) {
  var token = String(idToken || '').trim();
  if (!token) throw new Error('Firebase ID token wajib diisi.');
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
  if (response.getResponseCode() !== 200) throw new Error('Firebase ID token tidak valid atau kedaluwarsa.');
  var account = (JSON.parse(response.getContentText()).users || [])[0];
  if (!account || !account.localId) throw new Error('Identitas Firebase tidak ditemukan.');
  var profile = getDocument_('users/' + encodeURIComponent(account.localId));
  if (!profile || String(profile.status || '').toLowerCase() !== 'aktif') throw new Error('Akun tidak aktif.');
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
    throw new Error('Operasi ini hanya dapat dilakukan Admin atau Superadmin.');
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
  if (code < 200 || code >= 300) throw new Error('Firebase Auth Admin gagal (' + code + '): ' + text.slice(0, 500));
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
  if (code < 200 || code >= 300) throw new Error('Firestore API gagal (' + code + '): ' + text.slice(0, 500));
  return text ? JSON.parse(text) : true;
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

function assertNoDoubleBooking_(entity, record) {
  if (entity !== 'transaksi' && entity !== 'booking') return;
  if (['booking', 'ppjb', 'akad kredit', 'lunas'].indexOf(normalized_(record.status)) === -1) return;
  var key = normalized_(record.proyek) + '|' + normalized_(record.nomorUnit || record.unit);
  listCollection_('entities/' + encodeURIComponent(entity) + '/records').forEach(function (other) {
    var otherKey = normalized_(other.proyek) + '|' + normalized_(other.nomorUnit || other.unit);
    if (String(other.id) !== String(record.id) && otherKey === key && ['booking', 'ppjb', 'akad kredit', 'lunas'].indexOf(normalized_(other.status)) !== -1) {
      throw new Error('Double booking ditolak: unit sudah memiliki transaksi aktif.');
    }
  });
}

function saveRecord_(session, entity, record) {
  requireAdministrator_(session);
  entity = String(entity || '').trim();
  if (PRIVILEGED_ENTITIES.indexOf(entity) === -1) throw new Error('Entity ini harus ditulis langsung melalui Firestore Rules.');
  if (!record || !record.id) throw new Error('record.id wajib diisi.');
  if (entity === 'pengaturan' && session.role !== 'Superadmin') {
    throw new Error('Hanya Superadmin yang dapat mengubah pengaturan aplikasi.');
  }
  if (entity === 'pengguna') {
    if (session.role !== 'Superadmin') throw new Error('Hanya Superadmin yang dapat mengelola profil pengguna.');
    var existingProfile = getDocument_('users/' + encodeURIComponent(record.id));
    var password = String(record.password || '');
    if (!existingProfile) {
      if (!record.email) throw new Error('Email pengguna wajib diisi.');
      if (password.length < 8) throw new Error('Password pengguna minimal 8 karakter.');
      record.id = createAuthUser_(record.email, password, record.nama);
    } else if (password) {
      if (password.length < 8) throw new Error('Password pengguna minimal 8 karakter.');
      updateAuthPassword_(record.id, password);
    }
    delete record.password;
    delete record.passwordHash;
    delete record.pin;
    delete record.pinHash;
    record.updatedAt = new Date().toISOString();
    setDocument_('users/' + encodeURIComponent(record.id), record);
  } else {
    var path = recordPath_(entity, record.id);
    var existing = getDocument_(path);
    record = validateAndDerive_(entity, record, existing);
    assertNoDoubleBooking_(entity, record);
    record.updatedAt = new Date().toISOString();
    setDocument_(path, record);
  }
  appendAudit_(session, existing ? 'UPDATE' : 'CREATE', entity, record.id, {});
  return record;
}

function deleteRecord_(session, entity, id) {
  requireAdministrator_(session);
  if (PRIVILEGED_ENTITIES.indexOf(String(entity)) === -1) throw new Error('Entity ini harus dihapus langsung melalui Firestore Rules.');
  if ((entity === 'pengguna' || entity === 'pengaturan') && session.role !== 'Superadmin') throw new Error('Hanya Superadmin yang dapat mengelola data ini.');
  if (entity === 'pengguna') {
    deleteAuthUser_(id);
    deleteDocument_('users/' + encodeURIComponent(id));
  } else {
    deleteDocument_(recordPath_(entity, id));
  }
  appendAudit_(session, 'DELETE', entity, id, {});
  return true;
}

function resetUserPassword_(session, userId, newPassword) {
  if (session.role !== 'Superadmin') throw new Error('Hanya Superadmin yang dapat mereset password.');
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
  if (session.role !== 'Superadmin') throw new Error('Hanya Superadmin yang dapat melihat audit log.');
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
  if (entity === 'pengaturan' && session.role !== 'Superadmin') throw new Error('Hanya Superadmin yang dapat mengunggah aset pengaturan.');
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
  if (String(entity || '') === 'pengaturan' && session.role !== 'Superadmin') throw new Error('Hanya Superadmin yang dapat menghapus aset pengaturan.');
  DriveApp.getFileById(fileId).setTrashed(true);
  appendAudit_(session, 'DELETE_FILE', entity, fileId, {});
  return true;
}

function backupData_(session) {
  if (session.role !== 'Superadmin') throw new Error('Hanya Superadmin yang dapat membuat backup.');
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
  if (session.role !== 'Superadmin') throw new Error('Hanya Superadmin yang dapat melihat backup.');
  var files = ensureFolder_(BACKUP_FOLDER_NAME).getFiles();
  var result = [];
  while (files.hasNext()) {
    var file = files.next();
    result.push({ id: file.getId(), name: file.getName(), url: file.getUrl(), size: file.getSize(), createdAt: file.getDateCreated().toISOString() });
  }
  return result.sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
}

function restoreBackup_(session, fileId) {
  if (session.role !== 'Superadmin') throw new Error('Hanya Superadmin yang dapat memulihkan backup.');
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
  listCollection_('users').forEach(function (user) {
    if (user && user.id && !snapshotUserIds[String(user.id)]) {
      deleteDocument_('users/' + encodeURIComponent(user.id));
    }
  });
  snapshot.users.forEach(function (user) {
    if (!user || !user.id) return;
    var cleanUser = JSON.parse(JSON.stringify(user));
    delete cleanUser.password;
    delete cleanUser.passwordHash;
    delete cleanUser.pin;
    delete cleanUser.pinHash;
    setDocument_('users/' + encodeURIComponent(cleanUser.id), cleanUser);
  });
  ALL_ENTITIES.forEach(function (entity) {
    var records = Array.isArray(snapshot.entities[entity]) ? snapshot.entities[entity] : [];
    var snapshotRecordIds = {};
    records.forEach(function (record) {
      if (record && record.id) snapshotRecordIds[String(record.id)] = true;
    });
    listCollection_('entities/' + encodeURIComponent(entity) + '/records').forEach(function (record) {
      if (record && record.id && !snapshotRecordIds[String(record.id)]) {
        deleteDocument_(recordPath_(entity, record.id));
      }
    });
    records.forEach(function (record) {
      if (record && record.id) setDocument_(recordPath_(entity, record.id), record);
    });
  });
  appendAudit_(session, 'RESTORE_BACKUP', 'system', id, { name: file.getName() });
  return { restored: true, fileId: id, fileName: file.getName() };
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
  var totalMasuk = 0;
  var totalKeluar = 0;
  pettycash.concat(bukubank).forEach(function (row) {
    totalMasuk += Number(row.kredit || 0);
    totalKeluar += Number(row.debet || 0);
  });
  return { totalMasuk: totalMasuk, totalKeluar: totalKeluar, netCashflow: totalMasuk - totalKeluar, totalPiutangOpen: 0, totalHutangOpen: 0, totalBudgetRencana: 0, totalBudgetRealisasi: 0, sisaBudget: 0, perAkun: [], perKategoriKeluar: [] };
}

function migrateLegacySheetToFirestore() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data');
  if (!sheet || sheet.getLastRow() < 2) return { migrated: 0, skipped: 0 };
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
  var migrated = 0;
  var skipped = 0;
  values.forEach(function (row) {
    try {
      var entity = String(row[0] || '').trim();
      var id = String(row[1] || '').trim();
      var record = JSON.parse(row[2]);
      if (!entity || !id) throw new Error('Entity/id kosong');
      record.id = id;
      if (entity === 'pengguna') {
        skipped++;
        return;
      }
      setDocument_(recordPath_(entity, id), record);
      migrated++;
    } catch (error) {
      skipped++;
    }
  });
  return { migrated: migrated, skipped: skipped };
}