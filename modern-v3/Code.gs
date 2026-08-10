/**
 * KBR Legal Management — Full Version
 * Backend Google Apps Script.
 *
 * Semua modul (Proyek, Sertifikat, Perizinan, Pembeli, dst — 22 modul)
 * memakai SATU mesin CRUD generik yang sama, disimpan dalam SATU sheet
 * bernama "Data" dengan kolom: entity | id | value(JSON) | updatedAt.
 *
 * Kenapa satu mesin, bukan 17 fungsi terpisah? Supaya jalur kode yang
 * diuji/divalidasi hanya satu, dipakai ulang oleh semua modul — jauh
 * lebih kecil kemungkinan ada modul yang bug sendiri-sendiri.
 */

var DATA_SHEET_NAME = 'Data';
var AUDIT_SHEET_NAME = 'AuditLog';
var USERS_ENTITY_KEY = 'pengguna';
var SESSION_CACHE_PREFIX = 'kbr-auth-session:';
var SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 jam
var SUPERADMIN_USERNAME_PROPERTY = 'SUPERADMIN_USERNAME';
var SUPERADMIN_PASSWORD_PROPERTY = 'SUPERADMIN_PASSWORD';
var LOGIN_RATE_PREFIX = 'kbr-login-attempt:';
var LOGIN_RATE_WINDOW_SECONDS = 15 * 60;
var LOGIN_RATE_MAX_ATTEMPTS = 5;

var ENTITY_GROUP_MAP = {
  proyek: 'PROYEK',
  clusterproyek: 'PROYEK',
  progressunit: 'PROYEK',
  updateharian: 'PROYEK',
  materialrequest: 'PROYEK',
  budgetkonstruksi: 'PROYEK',
  blokkavling: 'PROYEK',
  unit: 'PROYEK',
  pricelist: 'PROYEK',
  sertifikat: 'LEGAL',
  perizinan: 'LEGAL',
  dokumenlegal: 'LEGAL',
  ppjb: 'LEGAL',
  sppt: 'LEGAL',
  sengketa: 'LEGAL',
  progressproyek: 'PROYEK',
  timelinerencana: 'PROYEK',
  berkaskpr: 'BANK',
  prosesbank: 'BANK',
  appraisal: 'BANK',
  pencairankpr: 'BANK',
  akadajb: 'NOTARIS',
  masterunit: 'PROYEK',
  baliknama: 'NOTARIS',
  royaht: 'NOTARIS',
  pajakpbb: 'PAJAK',
  generateSurat: 'LEGAL',
  generatesurat: 'LEGAL',
  pph: 'PAJAK',
  bphtb: 'PAJAK',
  pembayaran: 'PAJAK',
  pembeli: 'PENJUALAN',
  penjual: 'PENJUALAN',
  prosesbanknotaris: 'BANK',
  transaksi: 'PENJUALAN',
  jualicicilan: 'PENJUALAN',
  pengajuankpr: 'PENJUALAN',
  kprsubsidi: 'PENJUALAN',
  kprkomersil: 'PENJUALAN',
  kprsyariah: 'PENJUALAN',
  jadwalcicilan: 'PENJUALAN',
  masterpihak: 'PENJUALAN',
  unitpihak: 'PENJUALAN',
  tagihan: 'PENJUALAN',
  marketing: 'MARKETING',
  prospek: 'MARKETING',
  followup: 'MARKETING',
  targetmarketing: 'MARKETING',
  komisi: 'MARKETING',
  booking: 'PENJUALAN',
  skemapembayaran: 'PENJUALAN',
  arsipdokumen: 'LEGAL',
  pettycash: 'KEUANGAN',
  bukubank: 'KEUANGAN',
  voucher: 'KEUANGAN',
  kartuanggaran: 'KEUANGAN',
  piutang: 'KEUANGAN',
  hutang: 'KEUANGAN',
  budgetcontrol: 'KEUANGAN',
  kartupiutang: 'KEUANGAN',
  kartubarangmasuk: 'KEUANGAN',
  spkborong: 'KEUANGAN',
  kuitansi: 'KEUANGAN',
  approval: 'KEUANGAN',
  supplier: 'GUDANG',
  masterbarang: 'GUDANG',
  barangkeluar: 'GUDANG',
  stokgudang: 'GUDANG',
  laporankeuangan: 'KEUANGAN',
  dashboardowner: null,
  laporan: null,
  pengguna: null,
};

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return jsonResponse_({
    success: true,
    data: {
      service: 'KBR Legal Management API',
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
  });
}

function doPost(e) {
  try {
    var rawBody = e && e.postData && e.postData.contents;
    if (!rawBody) throw new Error('Body request wajib diisi.');

    var request = JSON.parse(rawBody);
    var action = String(request.action || '').trim();
    var args = Array.isArray(request.args) ? request.args : [];
    var token = String(request.token || '').trim();
    var result = routeApiAction_(action, token, args);

    return jsonResponse_({ success: true, data: result });
  } catch (err) {
    return jsonResponse_({
      success: false,
      message: err && err.message ? String(err.message) : 'Terjadi kesalahan pada server.',
    });
  }
}

function routeApiAction_(action, token, args) {
  switch (action) {
    case 'authenticateUser': return authenticateUser(args[0], args[1]);
    case 'getSession': return getSession(token);
    case 'logout': return logout(token);
    case 'listAllData': return listAllData(token);
    case 'saveRecord': return saveRecord(token, args[0], args[1]);
    case 'deleteRecord': return deleteRecord(token, args[0], args[1]);
    case 'uploadFile': return uploadFile(token, args[0], args[1], args[2], args[3]);
    case 'deleteFile': return deleteFile(token, args[0], args[1]);
    case 'backupData': return backupData(token);
    case 'listBackups': return listBackups(token);
    case 'restoreBackup': return restoreBackup(token, args[0]);
    case 'listAuditLog': return listAuditLog(token, args[0]);
    case 'changeOwnPassword': return changeOwnPassword(token, args[0], args[1]);
    case 'resetUserPassword': return resetUserPassword(token, args[0], args[1]);
    case 'searchAll': return searchAll(token, args[0]);
    case 'getFinanceSummary': return getFinanceSummary(token, args[0]);
    case 'runPaymentReminders': return runPaymentReminders(token);
    default: throw new Error('Aksi API tidak dikenal atau tidak diizinkan.');
  }
}

function getSuperadminCredentials_() {
  var properties = PropertiesService.getScriptProperties();
  var username = String(properties.getProperty(SUPERADMIN_USERNAME_PROPERTY) || '').trim();
  var password = String(properties.getProperty(SUPERADMIN_PASSWORD_PROPERTY) || '');
  if (!username || !password) {
    throw new Error('Credential Superadmin belum dikonfigurasi di Script Properties.');
  }
  return { username: username, password: password };
}

/** Ambil (atau buat) sheet "Data" tempat seluruh modul menyimpan recordnya. */
function ensureDataSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(DATA_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(DATA_SHEET_NAME);
    sheet.appendRow(['entity', 'id', 'value', 'updatedAt']);
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 130);
    sheet.setColumnWidth(2, 170);
    sheet.setColumnWidth(3, 520);
  }
  return sheet;
}

function normalizeEmail_(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeUsername_(username) {
  return String(username || '').trim().toLowerCase();
}

function normalizePassword_(password) {
  return String(password || '');
}

function hashPassword_(password) {
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(password || ''),
    Utilities.Charset.UTF_8
  );
  var hex = digest.map(function (b) {
    var v = (b + 256) % 256;
    return (v < 16 ? '0' : '') + v.toString(16);
  }).join('');
  return 'sha256:' + hex;
}

function normalizeStoredPasswordHash_(stored) {
  var text = String(stored || '').trim();
  if (!text) return '';
  if (text.indexOf('sha256:') === 0) return text.toLowerCase();
  return hashPassword_(text);
}

function matchesPassword_(storedHash, rawPassword) {
  var normalizedHash = normalizeStoredPasswordHash_(storedHash);
  if (!normalizedHash) return false;
  return normalizedHash === hashPassword_(rawPassword).toLowerCase();
}

function normalizeRole_(role) {
  var value = String(role || '').trim().toLowerCase();
  if (value === 'superadmin' || value === 'super admin') return 'Superadmin';
  if (value === 'admin') return 'Admin';
  if (value === 'manager') return 'Manager';
  if (value === 'direktur') return 'Direktur';
  if (value === 'pengawas proyek' || value === 'pengawasproyek') return 'Pengawas Proyek';
  if (value === 'staff legal' || value === 'staff bank' || value === 'staff notaris' || value === 'staff keuangan' || value === 'viewer') return 'Manager';
  return 'Manager';
}

function roleRule_(role) {
  var norm = normalizeRole_(role);
  if (norm === 'Superadmin') {
    return {
      readAll: true,
      writeAll: true,
      readGroups: [],
      writeGroups: [],
      readEntities: [],
      writeEntities: [],
      canBackup: true,
      canManageUsers: true,
    };
  }
  if (norm === 'Admin') {
    return {
      readAll: true,
      writeAll: true,
      readGroups: [],
      writeGroups: [],
      readEntities: [],
      writeEntities: [],
      canBackup: false,
      canManageUsers: false,
    };
  }
  if (norm === 'Manager' || norm === 'Direktur' || norm === 'Pengawas Proyek') {
    return {
      readAll: true,
      writeAll: false,
      readGroups: [],
      writeGroups: [],
      readEntities: [],
      writeEntities: [],
      canBackup: false,
      canManageUsers: false,
    };
  }
  return {
    readAll: false,
    writeAll: false,
    readGroups: [],
    writeGroups: [],
    readEntities: [],
    writeEntities: [],
    canBackup: false,
    canManageUsers: false,
  };
}

function buildRolePermissions_(role) {
  var rule = roleRule_(role);
  var entities = Object.keys(ENTITY_GROUP_MAP);
  var readable = {};
  var writable = {};

  entities.forEach(function (entity) {
    var group = ENTITY_GROUP_MAP[entity];
    if (rule.readAll || rule.readGroups.indexOf(group) !== -1 || rule.readEntities.indexOf(entity) !== -1) {
      readable[entity] = true;
    }
    if (rule.writeAll || rule.writeGroups.indexOf(group) !== -1 || rule.writeEntities.indexOf(entity) !== -1) {
      writable[entity] = true;
    }
  });

  if (!rule.canManageUsers) {
    writable.pengguna = false;
    readable.pengguna = false;
  }

  return {
    role: normalizeRole_(role),
    readableEntities: Object.keys(readable).filter(function (k) { return readable[k]; }).sort(),
    writableEntities: Object.keys(writable).filter(function (k) { return writable[k]; }).sort(),
    canBackup: !!rule.canBackup,
    canManageUsers: !!rule.canManageUsers,
  };
}

function canReadEntity_(session, entity) {
  return session.permissions.readableEntities.indexOf(entity) !== -1;
}

function canWriteEntity_(session, entity) {
  return session.permissions.writableEntities.indexOf(entity) !== -1;
}

function sanitizeRecordForClient_(entity, record) {
  if (!record || typeof record !== 'object') return record;
  if (entity !== USERS_ENTITY_KEY) return record;
  var clean = JSON.parse(JSON.stringify(record));
  delete clean.password;
  delete clean.passwordHash;
  delete clean.pin;
  delete clean.pinHash;
  return clean;
}

function listAllDataRaw_() {
  var sheet = ensureDataSheet_();
  var lastRow = sheet.getLastRow();
  var result = {};
  if (lastRow < 2) return result;
  var values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  for (var i = 0; i < values.length; i++) {
    var entity = values[i][0];
    var raw = values[i][2];
    if (!entity || !raw) continue;
    try {
      var obj = JSON.parse(raw);
      if (!result[entity]) result[entity] = [];
      result[entity].push(obj);
    } catch (err) {
      // lewati baris yang datanya rusak, jangan hentikan seluruh proses
    }
  }
  return result;
}

function listUsersRaw_() {
  var all = listAllDataRaw_();
  return all[USERS_ENTITY_KEY] || [];
}

function findUserByIdRaw_(id) {
  if (!id) return null;
  var users = listUsersRaw_();
  for (var i = 0; i < users.length; i++) {
    if (users[i] && users[i].id === id) return users[i];
  }
  return null;
}

function assertUniqueUserEmail_(record) {
  var currentId = String(record.id || '');
  var nextEmail = normalizeEmail_(record.email);
  if (!nextEmail) return;
  var users = listUsersRaw_();
  for (var i = 0; i < users.length; i++) {
    var u = users[i] || {};
    if (String(u.id || '') === currentId) continue;
    if (normalizeEmail_(u.email) === nextEmail) {
      throw new Error('Email pengguna sudah dipakai oleh akun lain.');
    }
  }
}

function assertUniqueUsername_(record) {
  var currentId = String(record.id || '');
  var nextUsername = normalizeUsername_(record.username);
  if (!nextUsername) throw new Error('Username pengguna wajib diisi.');
  var superadmin = getSuperadminCredentials_();
  if (nextUsername === normalizeUsername_(superadmin.username)) {
    throw new Error('Username ini dipakai oleh Super Admin sistem. Gunakan username lain.');
  }
  var users = listUsersRaw_();
  for (var i = 0; i < users.length; i++) {
    var u = users[i] || {};
    if (String(u.id || '') === currentId) continue;
    if (normalizeUsername_(u.username) === nextUsername) {
      throw new Error('Username pengguna sudah dipakai oleh akun lain.');
    }
  }
}

function requireSession_(sessionToken) {
  var token = String(sessionToken || '').trim();
  if (!token) throw new Error('Anda belum login.');
  var cache = CacheService.getScriptCache();
  var raw = cache.get(SESSION_CACHE_PREFIX + token);
  if (!raw) throw new Error('Sesi login tidak valid atau sudah berakhir. Silakan login ulang.');
  return JSON.parse(raw);
}

function sanitizeSessionResponse_(session) {
  return {
    user: {
      id: session.user.id,
      nama: session.user.nama,
      username: session.user.username,
      email: session.user.email,
      role: session.user.role,
    },
    permissions: session.permissions,
    bootstrapMode: !!session.bootstrapMode,
  };
}

function authenticateUser(username, password) {
  var normalizedUsername = normalizeUsername_(username);
  var rawPassword = normalizePassword_(password);
  if (!normalizedUsername) throw new Error('Username wajib diisi.');
  if (!rawPassword) throw new Error('Password wajib diisi.');

  checkLoginRate_(normalizedUsername);
  var superadmin = getSuperadminCredentials_();

  var hasActiveUsers = listUsersRaw_().some(function (u) {
    return normalizeUsername_(u && u.username) && String(u.status || '').trim().toLowerCase() === 'aktif';
  });

  if (
    normalizedUsername === normalizeUsername_(superadmin.username) &&
    rawPassword === superadmin.password
  ) {
    var superSession = {
      user: {
        id: 'superadmin',
        nama: 'Super Admin',
        username: superadmin.username,
        email: '',
        role: 'Superadmin',
      },
      permissions: buildRolePermissions_('Superadmin'),
      bootstrapMode: !hasActiveUsers,
      issuedAt: new Date().toISOString(),
    };

    var superToken = Utilities.getUuid();
    CacheService.getScriptCache().put(SESSION_CACHE_PREFIX + superToken, JSON.stringify(superSession), SESSION_TTL_SECONDS);

    return {
      token: superToken,
      session: sanitizeSessionResponse_(superSession),
    };
  }

  var users = listUsersRaw_();
  var activeUsers = users.filter(function (u) {
    return normalizeUsername_(u && u.username) && String(u.status || '').trim().toLowerCase() === 'aktif';
  });

  var matched = null;

  for (var i = 0; i < activeUsers.length; i++) {
    if (normalizeUsername_(activeUsers[i].username) === normalizedUsername) {
      matched = activeUsers[i];
      break;
    }
  }

  if (!matched) { recordLoginFailure_(normalizedUsername); throw new Error('Username tidak terdaftar atau pengguna nonaktif.'); }
  var storedPassword = matched.passwordHash || matched.pinHash || matched.password || matched.pin || '';
  if (!matchesPassword_(storedPassword, rawPassword)) { recordLoginFailure_(normalizedUsername); throw new Error('Password salah.'); }

  resetLoginRate_(normalizedUsername);
  var user = matched;

  var session = {
    user: {
      id: user.id || Utilities.getUuid(),
      nama: String(user.nama || user.username || normalizedUsername),
      username: String(user.username || normalizedUsername),
      email: normalizeEmail_(user.email),
      role: normalizeRole_(user.role),
    },
    permissions: buildRolePermissions_(user.role),
    bootstrapMode: false,
    issuedAt: new Date().toISOString(),
  };

  var token = Utilities.getUuid();
  CacheService.getScriptCache().put(SESSION_CACHE_PREFIX + token, JSON.stringify(session), SESSION_TTL_SECONDS);
  appendAuditLog_(session, 'LOGIN', 'auth', user.id, { username: session.user.username });

  return {
    token: token,
    session: sanitizeSessionResponse_(session),
  };
}

function getSession(sessionToken) {
  var session = requireSession_(sessionToken);
  // Refresh TTL (heartbeat) supaya sesi tidak putus di tengah kerja panjang.
  CacheService.getScriptCache().put(SESSION_CACHE_PREFIX + String(sessionToken), JSON.stringify(session), SESSION_TTL_SECONDS);
  return sanitizeSessionResponse_(session);
}

function logout(sessionToken) {
  var token = String(sessionToken || '').trim();
  if (token) {
    try {
      var session = requireSession_(token);
      appendAuditLog_(session, 'LOGOUT', 'auth', session.user.id, {});
    } catch (e) {}
    CacheService.getScriptCache().remove(SESSION_CACHE_PREFIX + token);
  }
  return true;
}

/**
 * Ambil SEMUA data dari semua modul sekaligus (satu kali baca sheet),
 * dikelompokkan per entity. Dipanggil sekali saat aplikasi dibuka supaya
 * Dashboard dan semua halaman modul punya data yang konsisten & sinkron.
 * Return: { proyek: [...], sertifikat: [...], ... }
 */
function listAllData(sessionToken) {
  var session = requireSession_(sessionToken);
  var result = listAllDataRaw_();
  var filtered = {};
  Object.keys(result).forEach(function (entity) {
    if (canReadEntity_(session, entity)) {
      filtered[entity] = (result[entity] || []).map(function (row) {
        return sanitizeRecordForClient_(entity, row);
      });
    }
  });
  return filtered;
}

/** Cari baris berdasarkan entity + id. Return nomor baris (1-based) atau -1. */
function findRow_(sheet, entity, id) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === entity && values[i][1] === id) return i + 2;
  }
  return -1;
}

function parseBusinessNumber_(value, fieldLabel) {
  if (typeof value === 'number') {
    if (isFinite(value)) return value;
    throw new Error((fieldLabel || 'Nilai') + ' harus berupa angka yang valid.');
  }

  var text = String(value == null ? '' : value).trim();
  if (!text) return 0;
  text = text.replace(/\s/g, '').replace(/rp/gi, '');
  var lastComma = text.lastIndexOf(',');
  var lastDot = text.lastIndexOf('.');
  if (lastComma !== -1 && lastDot !== -1) {
    text = lastComma > lastDot
      ? text.replace(/\./g, '').replace(',', '.')
      : text.replace(/,/g, '');
  } else if (lastComma !== -1) {
    text = /,\d{1,2}$/.test(text) ? text.replace(',', '.') : text.replace(/,/g, '');
  } else if ((text.match(/\./g) || []).length > 1 || /^-?\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, '');
  }
  text = text.replace(/[^0-9.-]/g, '');

  var number = Number(text);
  if (!text || !isFinite(number)) {
    throw new Error((fieldLabel || 'Nilai') + ' harus berupa angka yang valid.');
  }
  return number;
}

function requireNonNegativeNumber_(value, fieldLabel) {
  var number = parseBusinessNumber_(value, fieldLabel);
  if (number < 0) throw new Error(fieldLabel + ' tidak boleh negatif.');
  return number;
}

function requirePercentage_(value, fieldLabel, defaultValue) {
  var source = value == null || String(value).trim() === '' ? defaultValue : value;
  var number = requireNonNegativeNumber_(source, fieldLabel);
  if (number > 100) throw new Error(fieldLabel + ' harus berada pada rentang 0 sampai 100%.');
  return number;
}

function normalizedKeyPart_(value) {
  return String(value == null ? '' : value).trim().toLowerCase();
}

function sameStockScope_(left, right) {
  return normalizedKeyPart_(left.namaBarang) === normalizedKeyPart_(right.namaBarang) &&
    normalizedKeyPart_(left.gudang) === normalizedKeyPart_(right.gudang);
}

function assertTransactionTransition_(record, existingRecord) {
  var nextStatus = normalizedKeyPart_(record.status);
  var previousStatus = normalizedKeyPart_(existingRecord && existingRecord.status);
  var allowed = {
    '': ['booking'],
    'booking': ['booking', 'ppjb', 'batal'],
    'ppjb': ['ppjb', 'akad kredit', 'batal'],
    'akad kredit': ['akad kredit', 'lunas', 'batal'],
    'lunas': ['lunas'],
    'batal': ['batal']
  };
  if (!allowed[previousStatus] || allowed[previousStatus].indexOf(nextStatus) === -1) {
    throw new Error('Transisi status transaksi dari ' + (previousStatus || 'record baru') + ' ke ' + (nextStatus || 'kosong') + ' tidak diizinkan.');
  }
}

function applyDerivedFields_(entity, sourceRecord, context) {
  var record = Object.assign({}, sourceRecord || {});
  var allData = context && context.allData ? context.allData : {};
  var existingRecord = context && context.existingRecord ? context.existingRecord : null;

  if (entity === 'pph') {
    var nilaiTransaksiPph = requireNonNegativeNumber_(record.nilaiTransaksi, 'Nilai transaksi');
    var tarifPph = requirePercentage_(record.tarifPph, 'Tarif PPh', 2.5);
    record.tarifPph = tarifPph;
    record.nilaiPph = Math.round(nilaiTransaksiPph * tarifPph / 100);
  }

  if (entity === 'bphtb') {
    var nilaiTransaksiBphtb = requireNonNegativeNumber_(record.nilaiTransaksi, 'Nilai transaksi');
    var npoptkp = requireNonNegativeNumber_(record.npoptkp == null || record.npoptkp === '' ? 80000000 : record.npoptkp, 'NPOPTKP');
    var tarifBphtb = requirePercentage_(record.tarifBphtb, 'Tarif BPHTB', 5);
    record.npoptkp = npoptkp;
    record.tarifBphtb = tarifBphtb;
    record.nilaiBphtb = Math.round(Math.max(0, nilaiTransaksiBphtb - npoptkp) * tarifBphtb / 100);
  }

  if (entity === 'budgetcontrol') {
    var rencanaBudget = requireNonNegativeNumber_(record.rencanaBudget, 'Rencana budget');
    var realisasi = requireNonNegativeNumber_(record.realisasi, 'Realisasi');
    record.sisaBudget = rencanaBudget - realisasi;
    record.prosSisaBudget = rencanaBudget > 0 ? Math.round(record.sisaBudget / rencanaBudget * 100) : 0;
  }

  if (entity === 'komisi') {
    var nilaiTransaksiKomisi = requireNonNegativeNumber_(record.nilaiTransaksi, 'Nilai transaksi');
    var persenKomisi = requirePercentage_(record.persenKomisi, 'Persen komisi', 0);
    var potonganPajak = requireNonNegativeNumber_(record.potonganPajak, 'Potongan pajak');
    var nominalKomisi = Math.round(nilaiTransaksiKomisi * persenKomisi / 100);
    if (potonganPajak > nominalKomisi) {
      throw new Error('Potongan pajak tidak boleh melebihi nominal komisi.');
    }
    record.nominalKomisi = nominalKomisi;
    record.komisiDiterima = nominalKomisi - potonganPajak;
  }

  if (entity === 'pengajuankpr') {
    var nilaiRumah = requireNonNegativeNumber_(record.nilaiRumah, 'Nilai rumah');
    var uangMuka = requireNonNegativeNumber_(record.uangMuka, 'Uang muka');
    if (uangMuka > nilaiRumah) throw new Error('Uang muka tidak boleh melebihi nilai rumah.');
    record.plafondKPR = nilaiRumah - uangMuka;
  }

  if (entity === 'spkborong') {
    var nilaiBorongan = requireNonNegativeNumber_(record.nilaiBorongan, 'Nilai borongan');
    var ppnPersen = requirePercentage_(record.ppnPersen, 'PPN', 11);
    record.ppnPersen = ppnPersen;
    record.ppnNilai = Math.round(nilaiBorongan * ppnPersen / 100);
    record.totalNilai = nilaiBorongan + record.ppnNilai;
  }

  if (entity === 'pricelist') {
    var hargaDasar = requireNonNegativeNumber_(record.hargaDasar, 'Harga dasar');
    var kenaikanPersen = requirePercentage_(record.kenaikanPersen, 'Kenaikan harga', 0);
    var diskonMaksimal = requireNonNegativeNumber_(record.diskonMaksimal, 'Diskon maksimal');
    record.hargaJual = Math.round(hargaDasar * (100 + kenaikanPersen) / 100);
    if (diskonMaksimal > record.hargaJual) throw new Error('Diskon maksimal tidak boleh melebihi harga jual.');
    record.hargaMinimal = record.hargaJual - diskonMaksimal;
  }

  if (entity === 'targetmarketing') {
    var targetNilai = requireNonNegativeNumber_(record.targetNilai, 'Target nilai');
    var realisasiNilai = requireNonNegativeNumber_(record.realisasiNilai, 'Realisasi nilai');
    var targetUnit = requireNonNegativeNumber_(record.targetUnit, 'Target unit');
    var realisasiUnit = requireNonNegativeNumber_(record.realisasiUnit, 'Realisasi unit');
    var basisTarget = targetNilai > 0 ? targetNilai : targetUnit;
    var basisRealisasi = targetNilai > 0 ? realisasiNilai : realisasiUnit;
    record.pencapaianPersen = basisTarget > 0 ? Math.round(basisRealisasi / basisTarget * 100) : 0;
    record.status = record.pencapaianPersen > 100 ? 'Melebihi Target' : record.pencapaianPersen === 100 ? 'Tercapai' : 'Belum Tercapai';
  }

  if (entity === 'piutang') {
    var hargaTransaksi = requireNonNegativeNumber_(record.hargaTransaksi, 'Harga transaksi');
    var dibayarSebelumnya = requireNonNegativeNumber_(record.totalDibayarSebelumnya, 'Total dibayar sebelumnya');
    var dibayarBulanIni = requireNonNegativeNumber_(record.dibayarBulanIni, 'Dibayar bulan ini');
    record.totalDibayar = dibayarSebelumnya + dibayarBulanIni;
    if (record.totalDibayar > hargaTransaksi) throw new Error('Total pembayaran tidak boleh melebihi harga transaksi.');
    record.sisaPiutang = hargaTransaksi - record.totalDibayar;
    if (record.sisaPiutang === 0 && normalizedKeyPart_(record.status) !== 'batal') record.status = 'Lunas';
  }

  if (entity === 'hutang') {
    var nilaiKontrak = requireNonNegativeNumber_(record.nilaiKontrak, 'Nilai kontrak');
    var hutangDibayarSebelumnya = requireNonNegativeNumber_(record.totalDibayarSebelumnya, 'Total dibayar sebelumnya');
    var hutangDibayarBulanIni = requireNonNegativeNumber_(record.dibayarBulanIni, 'Dibayar bulan ini');
    record.totalDibayar = hutangDibayarSebelumnya + hutangDibayarBulanIni;
    if (record.totalDibayar > nilaiKontrak) throw new Error('Total pembayaran tidak boleh melebihi nilai kontrak.');
    record.sisaHutang = nilaiKontrak - record.totalDibayar;
    if (record.sisaHutang === 0 && normalizedKeyPart_(record.status) !== 'batal') record.status = 'Lunas';
  }

  if (entity === 'approval') {
    var level1Status = String(record.level1Status || 'Menunggu');
    var level2Status = String(record.level2Status || 'Menunggu');
    if (level2Status !== 'Menunggu' && level1Status !== 'Disetujui') {
      throw new Error('Approval level 2 hanya dapat diproses setelah level 1 disetujui.');
    }
    if (level1Status === 'Ditolak' || level2Status === 'Ditolak') record.status = 'Ditolak';
    else if (level1Status === 'Disetujui' && level2Status === 'Disetujui') record.status = 'Disetujui';
    else if (level1Status === 'Disetujui') record.status = 'Disetujui Sebagian';
    else record.status = 'Menunggu';
  }

  if (entity === 'tagihan') {
    requireNonNegativeNumber_(record.jumlah, 'Jumlah tagihan');
    var statusTagihan = normalizedKeyPart_(record.status);
    var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    if (statusTagihan !== 'lunas') record.status = record.jatuhTempo && String(record.jatuhTempo) < today ? 'Terlambat' : 'Belum Lunas';
  }

  if (entity === 'kartupiutang') {
    var hargaResmi = requireNonNegativeNumber_(record.hargaResmi, 'Harga resmi');
    var diskon = requireNonNegativeNumber_(record.diskon, 'Diskon');
    if (diskon > hargaResmi) throw new Error('Diskon tidak boleh melebihi harga resmi.');
    record.hargaSetelahDiskon = hargaResmi - diskon;
    var saldoPiutang = record.hargaSetelahDiskon;
    (allData.kartupiutang || []).forEach(function (other) {
      if (String(other.id || '') === String(record.id || '')) return;
      if (normalizedKeyPart_(other.namaPembeli) !== normalizedKeyPart_(record.namaPembeli)) return;
      if (normalizedKeyPart_(other.blokUnit) !== normalizedKeyPart_(record.blokUnit)) return;
      if (normalizedKeyPart_(other.proyek) !== normalizedKeyPart_(record.proyek)) return;
      if (record.tanggal && other.tanggal && String(other.tanggal) > String(record.tanggal)) return;
      saldoPiutang -= parseBusinessNumber_(other.debet, 'Debet');
      saldoPiutang += parseBusinessNumber_(other.kredit, 'Kredit');
    });
    saldoPiutang -= requireNonNegativeNumber_(record.debet, 'Debet');
    saldoPiutang += requireNonNegativeNumber_(record.kredit, 'Kredit');
    if (saldoPiutang < 0) throw new Error('Pembayaran kartu piutang melebihi saldo unit.');
    record.saldo = saldoPiutang;
  }

  if (entity === 'kartubarangmasuk') {
    var jumlahMasuk = requireNonNegativeNumber_(record.jumlahMasuk, 'Jumlah masuk');
    var jumlahKeluarKartu = requireNonNegativeNumber_(record.jumlahKeluar, 'Jumlah keluar');
    var hargaSatuanKartu = requireNonNegativeNumber_(record.hargaSatuan, 'Harga satuan');
    record.totalNilai = Math.round((jumlahMasuk > 0 ? jumlahMasuk : jumlahKeluarKartu) * hargaSatuanKartu);
    var saldoStok = jumlahMasuk - jumlahKeluarKartu;
    (allData.kartubarangmasuk || []).forEach(function (other) {
      if (String(other.id || '') === String(record.id || '')) return;
      if (!sameStockScope_(other, record)) return;
      if (normalizedKeyPart_(other.proyek) !== normalizedKeyPart_(record.proyek)) return;
      if (record.tanggal && other.tanggal && String(other.tanggal) > String(record.tanggal)) return;
      saldoStok += parseBusinessNumber_(other.jumlahMasuk, 'Jumlah masuk') - parseBusinessNumber_(other.jumlahKeluar, 'Jumlah keluar');
    });
    if (saldoStok < 0) throw new Error('Saldo stok tidak boleh negatif.');
    record.saldoStok = saldoStok;
  }

  if (entity === 'barangkeluar') {
    var jumlahKeluar = requireNonNegativeNumber_(record.jumlahKeluar, 'Jumlah keluar');
    var hargaSatuan = requireNonNegativeNumber_(record.hargaSatuan, 'Harga satuan');
    var stokTersedia = 0;
    (allData.kartubarangmasuk || []).forEach(function (other) {
      if (!sameStockScope_(other, record)) return;
      stokTersedia += parseBusinessNumber_(other.jumlahMasuk, 'Jumlah masuk') - parseBusinessNumber_(other.jumlahKeluar, 'Jumlah keluar');
    });
    (allData.barangkeluar || []).forEach(function (other) {
      if (String(other.id || '') === String(record.id || '') || !sameStockScope_(other, record)) return;
      if (normalizedKeyPart_(other.status) === 'batal') return;
      stokTersedia -= parseBusinessNumber_(other.jumlahKeluar, 'Jumlah keluar');
    });
    if (normalizedKeyPart_(record.status) !== 'batal' && jumlahKeluar > stokTersedia) {
      throw new Error('Stok tidak cukup. Tersedia ' + stokTersedia + ', diminta ' + jumlahKeluar + '.');
    }
    record.totalNilai = Math.round(jumlahKeluar * hargaSatuan);
    record.sisaStok = normalizedKeyPart_(record.status) === 'batal' ? stokTersedia : stokTersedia - jumlahKeluar;
  }

  if (entity === 'transaksi') assertTransactionTransition_(record, existingRecord);

  return record;
}

/**
 * Simpan (tambah baru atau perbarui) satu record milik satu modul.
 * record wajib mempunyai field "id" (dibuat di sisi klien).
 */
function saveRecord(sessionToken, entity, record) {
  var session = requireSession_(sessionToken);
  if (!entity) throw new Error('entity wajib diisi');
  if (!record || !record.id) throw new Error('record.id wajib diisi');
  if (!canWriteEntity_(session, entity)) throw new Error('Akses ditolak untuk menyimpan data ini.');
  if (entity === USERS_ENTITY_KEY && !session.permissions.canManageUsers) throw new Error('Hanya Superadmin yang boleh mengelola pengguna.');

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = ensureDataSheet_();
    var row = findRow_(sheet, entity, record.id);
    var existingRecord = null;
    if (row !== -1) {
      try { existingRecord = JSON.parse(sheet.getRange(row, 3).getValue()); } catch (ignore) {}
    }

    if (entity === USERS_ENTITY_KEY) {
      assertUniqueUsername_(record);
      assertUniqueUserEmail_(record);
      record.username = normalizeUsername_(record.username);
      record.email = normalizeEmail_(record.email);
      var rawPassword = normalizePassword_(record.password);
      if (rawPassword) {
        if (rawPassword.length < 8) throw new Error('Password minimal 8 karakter.');
        record.passwordHash = hashPassword_(rawPassword);
      } else {
        var existingUser = findUserByIdRaw_(record.id);
        if (existingUser && (existingUser.passwordHash || existingUser.pinHash || existingUser.password || existingUser.pin)) {
          record.passwordHash = normalizeStoredPasswordHash_(existingUser.passwordHash || existingUser.pinHash || existingUser.password || existingUser.pin);
        }
      }
      delete record.password;
      delete record.pin;
      delete record.pinHash;
      if (!record.passwordHash) throw new Error('Password login wajib diisi (minimal 8 karakter).');
    }

    var allData = listAllDataRaw_();
    record = applyDerivedFields_(entity, record, { allData: allData, existingRecord: existingRecord });
    assertNoDoubleBooking_(entity, record);

    var json = JSON.stringify(record);
    var action = 'CREATE';
    if (row === -1) {
      sheet.appendRow([entity, record.id, json, new Date()]);
    } else {
      action = 'UPDATE';
      sheet.getRange(row, 3, 1, 2).setValues([[json, new Date()]]);
    }
    appendAuditLog_(session, action, entity, record.id, summarizeRecord_(entity, record));
    return record;
  } finally {
    lock.releaseLock();
  }
}

/** Hapus satu record milik satu modul berdasarkan id. */
function deleteRecord(sessionToken, entity, id) {
  var session = requireSession_(sessionToken);
  if (!entity || !id) throw new Error('entity dan id wajib diisi');
  if (!canWriteEntity_(session, entity)) throw new Error('Akses ditolak untuk menghapus data ini.');
  if (entity === USERS_ENTITY_KEY && !session.permissions.canManageUsers) throw new Error('Hanya Superadmin yang boleh mengelola pengguna.');
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sheet = ensureDataSheet_();
    var row = findRow_(sheet, entity, id);
    if (row !== -1) sheet.deleteRow(row);
    appendAuditLog_(session, 'DELETE', entity, id, {});
    return true;
  } finally {
    lock.releaseLock();
  }
}

/**
 * ============================================================
 * Upload Dokumen — lampiran file disimpan di folder Drive milik
 * akun yang men-deploy web app ini (sesuai executeAs: USER_DEPLOYING),
 * lalu metadatanya (id/url/nama) disimpan sebagai bagian dari record
 * JSON di sheet "Data" (field "lampiran").
 * ============================================================
 */
var DOC_FOLDER_NAME = 'KBR Legal Management - Dokumen';
var MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function ensureDocFolder_() {
  var folders = DriveApp.getFoldersByName(DOC_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(DOC_FOLDER_NAME);
}

/** Simpan satu file (base64) ke Drive. Dipanggil dari form lampiran di semua modul. */
function uploadFile(sessionToken, entity, fileName, mimeType, base64Data) {
  var session = requireSession_(sessionToken);
  if (!entity) throw new Error('entity wajib diisi');
  if (!canWriteEntity_(session, entity)) throw new Error('Akses ditolak untuk unggah lampiran di modul ini.');
  if (!fileName || !base64Data) throw new Error('fileName dan base64Data wajib diisi');
  var bytes = Utilities.base64Decode(base64Data);
  if (bytes.length > MAX_UPLOAD_BYTES) throw new Error('Ukuran file maksimal 8 MB.');
  var folder = ensureDocFolder_();
  var blob = Utilities.newBlob(bytes, mimeType || 'application/octet-stream', fileName);
  var file = folder.createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    // lewati jika kebijakan Drive akun tidak mengizinkan sharing publik
  }
  return {
    id: file.getId(),
    name: file.getName(),
    url: file.getUrl(),
    mimeType: file.getMimeType(),
    size: file.getSize(),
    uploadedAt: new Date().toISOString(),
  };
}

/** Hapus satu file Drive (lampiran record ATAU file backup) berdasarkan fileId. */
function deleteFile(sessionToken, entity, fileId) {
  var session = requireSession_(sessionToken);
  if (!entity) throw new Error('entity wajib diisi');
  if (!canWriteEntity_(session, entity)) throw new Error('Akses ditolak untuk menghapus lampiran di modul ini.');
  if (!fileId) throw new Error('fileId wajib diisi');
  DriveApp.getFileById(fileId).setTrashed(true);
  return true;
}

/**
 * ============================================================
 * Backup & Restore Data — ekspor seluruh isi sheet "Data" sebagai
 * satu file JSON di Drive, supaya bisa diunduh atau dipulihkan
 * kembali kapan saja tanpa bergantung pada versi Google Sheet.
 * ============================================================
 */
var BACKUP_FOLDER_NAME = 'KBR Legal Management - Backup';

function ensureBackupFolder_() {
  var folders = DriveApp.getFoldersByName(BACKUP_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(BACKUP_FOLDER_NAME);
}

/** Buat satu file backup baru berisi snapshot seluruh data saat ini. */
function backupData(sessionToken) {
  var session = requireSession_(sessionToken);
  if (!session.permissions.canBackup) throw new Error('Akses ditolak untuk membuat backup.');
  var data = listAllDataRaw_();
  var folder = ensureBackupFolder_();
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyyMMdd-HHmmss');
  var fileName = 'backup-kbr-legal-' + stamp + '.json';
  var blob = Utilities.newBlob(JSON.stringify(data, null, 2), 'application/json', fileName);
  var file = folder.createFile(blob);
  return {
    id: file.getId(),
    name: file.getName(),
    url: file.getUrl(),
    size: file.getSize(),
    createdAt: new Date().toISOString(),
  };
}

/** Daftar semua file backup yang pernah dibuat, terbaru dulu. */
function listBackups(sessionToken) {
  var session = requireSession_(sessionToken);
  if (!session.permissions.canBackup) throw new Error('Akses ditolak untuk melihat daftar backup.');
  var folder = ensureBackupFolder_();
  var it = folder.getFiles();
  var result = [];
  while (it.hasNext()) {
    var f = it.next();
    result.push({
      id: f.getId(),
      name: f.getName(),
      url: f.getUrl(),
      size: f.getSize(),
      createdAt: f.getDateCreated().toISOString(),
    });
  }
  result.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  return result;
}

/**
 * Pulihkan seluruh data dari satu file backup — MENIMPA seluruh isi
 * sheet "Data" saat ini. Dipanggil hanya setelah user mengonfirmasi
 * peringatan di UI, karena aksi ini tidak bisa dibatalkan.
 */
function restoreBackup(sessionToken, fileId) {
  var session = requireSession_(sessionToken);
  if (!session.permissions.canBackup) throw new Error('Akses ditolak untuk memulihkan backup.');
  if (!fileId) throw new Error('fileId wajib diisi');
  var file = DriveApp.getFileById(fileId);
  var data = JSON.parse(file.getBlob().getDataAsString());
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = ensureDataSheet_();
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, 4).clearContent();
    var rows = [];
    Object.keys(data).forEach(function (entity) {
      (data[entity] || []).forEach(function (record) {
        if (record && record.id) rows.push([entity, record.id, JSON.stringify(record), new Date()]);
      });
    });
    if (rows.length) sheet.getRange(2, 1, rows.length, 4).setValues(rows);
    appendAuditLog_(session, 'RESTORE_BACKUP', 'system', fileId, { fileName: file.getName() });
    return true;
  } finally {
    lock.releaseLock();
  }
}

/**
 * ============================================================
 * Audit Log — mencatat setiap tindakan penting (create/update/delete/
 * login/logout/backup/restore/password) supaya bisa diaudit siapa
 * melakukan apa dan kapan. Disimpan di sheet "AuditLog".
 * ============================================================
 */
function ensureAuditSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(AUDIT_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(AUDIT_SHEET_NAME);
    sheet.appendRow(['timestamp', 'userId', 'username', 'role', 'action', 'entity', 'recordId', 'details']);
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 170);
    sheet.setColumnWidth(2, 150);
    sheet.setColumnWidth(3, 140);
    sheet.setColumnWidth(4, 110);
    sheet.setColumnWidth(5, 110);
    sheet.setColumnWidth(6, 140);
    sheet.setColumnWidth(7, 170);
    sheet.setColumnWidth(8, 480);
  }
  return sheet;
}

function summarizeRecord_(entity, record) {
  if (!record || typeof record !== 'object') return {};
  var keys = ['nomorSurat', 'nomorSertifikat', 'nomorIzin', 'namaPembeli', 'namaPihak', 'nama', 'namaProyek', 'nomorUnit', 'judulDokumen', 'nomorPPJB', 'status'];
  var summary = {};
  keys.forEach(function (k) {
    if (record[k] !== undefined && record[k] !== null && record[k] !== '') {
      summary[k] = String(record[k]).slice(0, 120);
    }
  });
  return summary;
}

function appendAuditLog_(session, action, entity, recordId, details) {
  try {
    var sheet = ensureAuditSheet_();
    var user = (session && session.user) || {};
    sheet.appendRow([
      new Date(),
      user.id || '',
      user.username || '',
      user.role || '',
      String(action || ''),
      String(entity || ''),
      String(recordId || ''),
      JSON.stringify(details || {}),
    ]);
  } catch (err) {
    // audit log tidak boleh menggagalkan operasi utama
  }
}

/** Ambil audit log (paginated), hanya Superadmin. */
function listAuditLog(sessionToken, limit) {
  var session = requireSession_(sessionToken);
  if (!session.permissions.canManageUsers) throw new Error('Hanya Superadmin yang boleh melihat audit log.');
  var sheet = ensureAuditSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var take = Math.min(Math.max(Number(limit) || 200, 1), 1000);
  var startRow = Math.max(2, lastRow - take + 1);
  var count = lastRow - startRow + 1;
  var values = sheet.getRange(startRow, 1, count, 8).getValues();
  var rows = values.map(function (r) {
    var details = {};
    try { details = r[7] ? JSON.parse(r[7]) : {}; } catch (e) {}
    return {
      timestamp: r[0] instanceof Date ? r[0].toISOString() : String(r[0] || ''),
      userId: String(r[1] || ''),
      username: String(r[2] || ''),
      role: String(r[3] || ''),
      action: String(r[4] || ''),
      entity: String(r[5] || ''),
      recordId: String(r[6] || ''),
      details: details,
    };
  });
  return rows.reverse();
}

/**
 * ============================================================
 * Rate limit login — anti brute-force sederhana pakai CacheService.
 * Jika 5 kali gagal dalam 15 menit, akun/username diblokir sementara.
 * ============================================================
 */
function loginRateKey_(username) {
  return LOGIN_RATE_PREFIX + normalizeUsername_(username);
}

function checkLoginRate_(username) {
  var cache = CacheService.getScriptCache();
  var raw = cache.get(loginRateKey_(username));
  if (!raw) return;
  var info = null;
  try { info = JSON.parse(raw); } catch (e) { info = null; }
  if (info && Number(info.count) >= LOGIN_RATE_MAX_ATTEMPTS) {
    throw new Error('Terlalu banyak percobaan login gagal. Coba lagi setelah beberapa menit.');
  }
}

function recordLoginFailure_(username) {
  var cache = CacheService.getScriptCache();
  var key = loginRateKey_(username);
  var raw = cache.get(key);
  var info = { count: 0, firstAt: new Date().toISOString() };
  if (raw) { try { info = JSON.parse(raw); } catch (e) {} }
  info.count = (Number(info.count) || 0) + 1;
  info.lastAt = new Date().toISOString();
  cache.put(key, JSON.stringify(info), LOGIN_RATE_WINDOW_SECONDS);
}

function resetLoginRate_(username) {
  CacheService.getScriptCache().remove(loginRateKey_(username));
}

/**
 * ============================================================
 * Ganti Password Sendiri & Reset Password oleh Superadmin
 * ============================================================
 */
function changeOwnPassword(sessionToken, currentPassword, newPassword) {
  var session = requireSession_(sessionToken);
  if (session.user.id === 'superadmin') throw new Error('Super Admin bawaan sistem tidak bisa ganti password lewat halaman ini.');
  var current = normalizePassword_(currentPassword);
  var next = normalizePassword_(newPassword);
  if (!current) throw new Error('Password lama wajib diisi.');
  if (!next || next.length < 8) throw new Error('Password baru minimal 8 karakter.');
  var user = findUserByIdRaw_(session.user.id);
  if (!user) throw new Error('Data pengguna tidak ditemukan.');
  var stored = user.passwordHash || user.pinHash || user.password || user.pin || '';
  if (!matchesPassword_(stored, current)) throw new Error('Password lama salah.');
  user.passwordHash = hashPassword_(next);
  delete user.password;
  delete user.pin;
  delete user.pinHash;
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sheet = ensureDataSheet_();
    var row = findRow_(sheet, USERS_ENTITY_KEY, user.id);
    if (row === -1) throw new Error('Data pengguna tidak ditemukan.');
    sheet.getRange(row, 3, 1, 2).setValues([[JSON.stringify(user), new Date()]]);
    appendAuditLog_(session, 'CHANGE_PASSWORD_SELF', USERS_ENTITY_KEY, user.id, {});
    return true;
  } finally {
    lock.releaseLock();
  }
}

function resetUserPassword(sessionToken, userId, newPassword) {
  var session = requireSession_(sessionToken);
  if (!session.permissions.canManageUsers) throw new Error('Hanya Superadmin yang boleh mereset password pengguna.');
  var next = normalizePassword_(newPassword);
  if (!next || next.length < 8) throw new Error('Password baru minimal 8 karakter.');
  var user = findUserByIdRaw_(userId);
  if (!user) throw new Error('Pengguna tidak ditemukan.');
  user.passwordHash = hashPassword_(next);
  delete user.password;
  delete user.pin;
  delete user.pinHash;
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sheet = ensureDataSheet_();
    var row = findRow_(sheet, USERS_ENTITY_KEY, user.id);
    if (row === -1) throw new Error('Pengguna tidak ditemukan.');
    sheet.getRange(row, 3, 1, 2).setValues([[JSON.stringify(user), new Date()]]);
    appendAuditLog_(session, 'RESET_PASSWORD', USERS_ENTITY_KEY, user.id, { username: user.username || '' });
    return true;
  } finally {
    lock.releaseLock();
  }
}

/**
 * ============================================================
 * Global Search — pencarian lintas modul untuk topbar aplikasi.
 * ============================================================
 */
function searchAll(sessionToken, query) {
  var session = requireSession_(sessionToken);
  var q = String(query || '').trim().toLowerCase();
  if (!q || q.length < 2) return [];
  var data = listAllDataRaw_();
  var hits = [];
  Object.keys(data).forEach(function (entity) {
    if (!canReadEntity_(session, entity)) return;
    var rows = data[entity] || [];
    for (var i = 0; i < rows.length && hits.length < 60; i++) {
      var record = sanitizeRecordForClient_(entity, rows[i]);
      var haystack = JSON.stringify(record).toLowerCase();
      if (haystack.indexOf(q) !== -1) {
        hits.push({
          entity: entity,
          id: record.id,
          label: pickLabel_(entity, record),
          subtitle: pickSubtitle_(entity, record),
        });
      }
    }
  });
  return hits;
}

function pickLabel_(entity, record) {
  var candidates = ['nomorSurat', 'nomorSertifikat', 'nomorIzin', 'nomorPPJB', 'nomorSPPT', 'judulDokumen', 'judulSengketa', 'judulLaporan', 'namaProyek', 'nomorUnit', 'namaPembeli', 'namaPihak', 'nama', 'periode'];
  for (var i = 0; i < candidates.length; i++) {
    var v = record[candidates[i]];
    if (v) return String(v);
  }
  return String(record.id || entity);
}

function pickSubtitle_(entity, record) {
  var parts = [];
  ['proyek', 'unit', 'nomorUnit', 'bank', 'status', 'jenisSurat'].forEach(function (k) {
    if (record[k]) parts.push(String(record[k]));
  });
  return parts.join(' · ');
}

/**
 * ============================================================
 * Ringkasan Keuangan — agregasi cashflow, saldo per akun,
 * total penerimaan & pengeluaran per periode. Dipakai halaman
 * Laporan Keuangan (view read-only).
 * ============================================================
 */
function getFinanceSummary(sessionToken, opts) {
  var session = requireSession_(sessionToken);
  if (!canReadEntity_(session, 'laporankeuangan')) {
    throw new Error('Akses ditolak untuk melihat laporan keuangan.');
  }
  var data = listAllDataRaw_();
  // Konvensi user (sesuai file xlsx): DEBET = pengeluaran/keluar, KREDIT = penerimaan/masuk
  var pettycash = data.pettycash || [];
  var bukubank = data.bukubank || [];
  var piutang = data.piutang || [];
  var hutang = data.hutang || [];
  var kartuanggaran = data.kartuanggaran || [];
  var budgetcontrol = data.budgetcontrol || [];

  var options = opts || {};
  var fromDate = options.from ? new Date(options.from) : null;
  var toDate = options.to ? new Date(options.to) : null;

  function inRange(dateStr) {
    if (!fromDate && !toDate) return true;
    if (!dateStr) return false;
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  }

  function num(v) {
    try { return parseBusinessNumber_(v, 'Nilai keuangan'); } catch (ignore) { return 0; }
  }

  function explicitOrCalculated(record, explicitField, calculatedValue) {
    var explicit = record[explicitField];
    return explicit == null || String(explicit).trim() === '' ? calculatedValue : num(explicit);
  }

  var totalMasuk = 0;
  var totalKeluar = 0;
  var perAkun = {};       // saldo per akun kas (Petty Cash / Bank X)
  var perKategoriKeluar = {}; // dari kartuanggaran per kelompokBiaya

  function tallyMutasi(rows, akunLabelKey, defaultAkun) {
    rows.forEach(function (r) {
      if (!inRange(r.tanggal)) return;
      var masuk = num(r.kredit);
      var keluar = num(r.debet);
      totalMasuk += masuk;
      totalKeluar += keluar;
      var akun = String(r[akunLabelKey] || defaultAkun);
      perAkun[akun] = (perAkun[akun] || 0) + (masuk - keluar);
    });
  }
  tallyMutasi(pettycash, 'namaKas', 'Petty Cash');
  tallyMutasi(bukubank, 'bank', 'Bank');

  kartuanggaran.forEach(function (r) {
    if (!inRange(r.tanggal)) return;
    var v = num(r.debet); // realisasi keluar per kelompok biaya
    if (v <= 0) return;
    var kat = String(r.kelompokBiaya || 'Lainnya');
    perKategoriKeluar[kat] = (perKategoriKeluar[kat] || 0) + v;
  });

  var totalPiutangOpen = 0;
  piutang.forEach(function (r) {
    totalPiutangOpen += Math.max(0, explicitOrCalculated(r, 'sisaPiutang', num(r.hargaTransaksi) - num(r.totalDibayar)));
  });

  var totalHutangOpen = 0;
  hutang.forEach(function (r) {
    totalHutangOpen += Math.max(0, explicitOrCalculated(r, 'sisaHutang', num(r.nilaiKontrak) - num(r.totalDibayar)));
  });

  var totalBudgetRencana = 0;
  var totalBudgetRealisasi = 0;
  budgetcontrol.forEach(function (r) {
    totalBudgetRencana += num(r.rencanaBudget);
    totalBudgetRealisasi += num(r.realisasi);
  });

  return {
    range: {
      from: fromDate ? fromDate.toISOString() : null,
      to: toDate ? toDate.toISOString() : null,
    },
    totalMasuk: totalMasuk,
    totalKeluar: totalKeluar,
    netCashflow: totalMasuk - totalKeluar,
    totalPiutangOpen: totalPiutangOpen,
    totalHutangOpen: totalHutangOpen,
    totalBudgetRencana: totalBudgetRencana,
    totalBudgetRealisasi: totalBudgetRealisasi,
    sisaBudget: totalBudgetRencana - totalBudgetRealisasi,
    perAkun: Object.keys(perAkun).map(function (a) { return { akun: a, saldo: perAkun[a] }; }).sort(function (a, b) { return b.saldo - a.saldo; }),
    perKategoriKeluar: Object.keys(perKategoriKeluar).map(function (k) { return { kategori: k, jumlah: perKategoriKeluar[k] }; }).sort(function (a, b) { return b.jumlah - a.jumlah; }),
  };
}

/**
 * ============================================================
 * Kunci Anti Double Booking — satu unit hanya boleh dipegang
 * oleh satu booking/transaksi aktif. Divalidasi di backend agar
 * tidak bisa ditembus lewat manipulasi sisi klien.
 * ============================================================
 */
var ACTIVE_BOOKING_STATUSES = ['booking', 'ppjb', 'akad kredit', 'lunas'];

function bookingUnitKey_(record) {
  var proyek = String((record && record.proyek) || '').trim().toLowerCase();
  var unit = String((record && (record.nomorUnit || record.unit)) || '').trim().toLowerCase();
  if (!unit) return '';
  return proyek + '|' + unit;
}

function assertNoDoubleBooking_(entity, record) {
  if (entity !== 'transaksi' && entity !== 'booking') return;
  var status = String((record && record.status) || '').trim().toLowerCase();
  if (ACTIVE_BOOKING_STATUSES.indexOf(status) === -1) return;

  var key = bookingUnitKey_(record);
  if (!key) return;

  var rows = listAllDataRaw_()[entity] || [];
  for (var i = 0; i < rows.length; i++) {
    var other = rows[i] || {};
    if (String(other.id || '') === String(record.id || '')) continue;
    var otherStatus = String(other.status || '').trim().toLowerCase();
    if (ACTIVE_BOOKING_STATUSES.indexOf(otherStatus) === -1) continue;
    if (bookingUnitKey_(other) !== key) continue;
    throw new Error(
      'Double booking ditolak: unit ' + String(record.nomorUnit || record.unit) +
      ' sudah dipesan atas nama ' + String(other.namaPembeli || other.pembeli || 'pembeli lain') +
      ' (status ' + String(other.status || '-') + '). Batalkan booking lama terlebih dahulu.'
    );
  }
}

/**
 * ============================================================
 * Notifikasi Otomatis — pengingat email untuk angsuran/tagihan
 * yang akan atau sudah jatuh tempo. Dijalankan oleh trigger
 * harian (lihat installReminderTrigger).
 * ============================================================
 */
var REMINDER_DUE_SOON_DAYS = 7;
var REMINDER_TRIGGER_FN = 'sendPaymentReminders';

function dateOnly_(value) {
  if (!value) return null;
  var d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysUntil_(value) {
  var target = dateOnly_(value);
  if (!target) return null;
  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function formatRupiah_(value) {
  var n = Number(String(value == null ? '' : value).replace(/[^0-9.-]/g, ''));
  if (isNaN(n)) n = 0;
  return 'Rp ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Kumpulkan angsuran & tagihan yang jatuh tempo <= 7 hari lagi atau sudah lewat. */
function collectDueItems_(data) {
  var items = [];

  (data.jadwalcicilan || []).forEach(function (r) {
    var status = String(r.statusBayar || '').trim().toLowerCase();
    if (status === 'sudah bayar') return;
    var sisaHari = daysUntil_(r.tanggalJatuhTempo);
    if (sisaHari === null || sisaHari > REMINDER_DUE_SOON_DAYS) return;
    items.push({
      nama: String(r.namaPembeli || '').trim(),
      unit: String(r.nomorUnit || '').trim(),
      keterangan: 'Angsuran ' + String(r.periodeAngsuran || '-'),
      nominal: r.nominalAngsuran,
      jatuhTempo: r.tanggalJatuhTempo,
      sisaHari: sisaHari,
    });
  });

  (data.tagihan || []).forEach(function (r) {
    var status = String(r.status || '').trim().toLowerCase();
    if (status === 'lunas') return;
    var sisaHari = daysUntil_(r.jatuhTempo);
    if (sisaHari === null || sisaHari > REMINDER_DUE_SOON_DAYS) return;
    items.push({
      nama: String(r.pembeli || '').trim(),
      unit: String(r.unit || '').trim(),
      keterangan: String(r.jenisTagihan || 'Tagihan'),
      nominal: r.jumlah,
      jatuhTempo: r.jatuhTempo,
      sisaHari: sisaHari,
    });
  });

  return items;
}

function buildReminderBody_(nama, items) {
  var lines = [
    'Yth. Bapak/Ibu ' + nama + ',',
    '',
    'Berikut kewajiban pembayaran Anda yang akan/telah jatuh tempo:',
    '',
  ];
  items.forEach(function (it, idx) {
    var tempo = it.sisaHari < 0
      ? 'TERLAMBAT ' + Math.abs(it.sisaHari) + ' hari'
      : (it.sisaHari === 0 ? 'jatuh tempo HARI INI' : 'jatuh tempo ' + it.sisaHari + ' hari lagi');
    lines.push(
      (idx + 1) + '. ' + it.keterangan +
      (it.unit ? ' — Unit ' + it.unit : '') +
      ' | ' + formatRupiah_(it.nominal) +
      ' | ' + Utilities.formatDate(dateOnly_(it.jatuhTempo), Session.getScriptTimeZone(), 'dd MMM yyyy') +
      ' (' + tempo + ')'
    );
  });
  lines.push('', 'Mohon lakukan pembayaran sebelum tanggal jatuh tempo untuk menghindari denda keterlambatan.', '', 'Terima kasih.');
  return lines.join('\n');
}

/**
 * Kirim email pengingat ke pembeli yang punya angsuran/tagihan jatuh tempo.
 * Dipanggil otomatis oleh trigger harian; aman dipanggil manual dari editor.
 * Return: ringkasan { terkirim, dilewati, alasan }.
 */
function sendPaymentReminders() {
  var data = listAllDataRaw_();
  var items = collectDueItems_(data);
  if (!items.length) return { terkirim: 0, dilewati: 0, alasan: [] };

  var emailByName = {};
  (data.pembeli || []).forEach(function (p) {
    var nama = String(p.nama || '').trim().toLowerCase();
    var email = normalizeEmail_(p.email);
    if (nama && email) emailByName[nama] = email;
  });

  var grouped = {};
  items.forEach(function (it) {
    var key = String(it.nama || '').trim().toLowerCase();
    if (!key) return;
    if (!grouped[key]) grouped[key] = { nama: it.nama, items: [] };
    grouped[key].items.push(it);
  });

  var terkirim = 0;
  var dilewati = 0;
  var alasan = [];

  Object.keys(grouped).forEach(function (key) {
    var email = emailByName[key];
    if (!email) {
      dilewati++;
      alasan.push(grouped[key].nama + ': email pembeli belum diisi di Master Pihak.');
      return;
    }
    try {
      MailApp.sendEmail({
        to: email,
        subject: 'Pengingat Pembayaran — ' + grouped[key].nama,
        body: buildReminderBody_(grouped[key].nama, grouped[key].items),
      });
      terkirim++;
    } catch (err) {
      dilewati++;
      alasan.push(grouped[key].nama + ': ' + err.message);
    }
  });

  return { terkirim: terkirim, dilewati: dilewati, alasan: alasan };
}

/** Pasang trigger harian pengiriman pengingat (jalankan sekali dari editor Apps Script). */
function installReminderTrigger() {
  removeReminderTrigger();
  ScriptApp.newTrigger(REMINDER_TRIGGER_FN).timeBased().atHour(8).everyDays(1).create();
  return true;
}

/** Hapus trigger pengingat yang sudah terpasang. */
function removeReminderTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === REMINDER_TRIGGER_FN) ScriptApp.deleteTrigger(trigger);
  });
  return true;
}

/** Dipakai dari aplikasi: jalankan pengingat manual (khusus pengelola pengguna). */
function runPaymentReminders(sessionToken) {
  var session = requireSession_(sessionToken);
  if (!session.permissions.canManageUsers) throw new Error('Hanya Superadmin yang boleh menjalankan pengingat manual.');
  var result = sendPaymentReminders();
  appendAuditLog_(session, 'SEND_REMINDER', 'tagihan', '', result);
  return result;
}

