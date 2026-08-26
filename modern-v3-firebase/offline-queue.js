// ---------- antrean mutasi offline (IndexedDB outbox) ----------
// Menyimpan mutasi (save/delete) entitas NON-privilegied saat perangkat offline,
// lalu memutar ulang ke Firestore ketika koneksi kembali.
// Data di outbox = PENDING, belum tentu tersimpan di server.

const DB_NAME = "kbr-offline";
const DB_VERSION = 1;
const STORE_NAME = "outbox";

// Harus identik dengan PRIVILEGED_ENTITIES pada firebase-client.js.
// Entitas privilegied tidak boleh masuk antrean offline (ditolak secara diam-diam).
const PRIVILEGED_ENTITIES = new Set([
  "pengguna", "pengaturan", "transaksi", "booking", "approval", "kuitansi", "voucher", "pettycash", "bukubank",
  "kartuanggaran", "piutang", "hutang", "budgetcontrol", "kartupiutang", "kartubarangmasuk",
  "barangkeluar", "komisi", "pph", "bphtb", "pengajuankpr", "pencairankpr", "spkborong",
  "pricelist", "targetmarketing", "tagihan",
]);

function reqAsPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Operasi IndexedDB gagal."));
  });
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB tidak tersedia di lingkungan ini."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Gagal membuka IndexedDB."));
    request.onblocked = () => reject(new Error("IndexedDB diblokir oleh koneksi lain."));
  });
}

async function withStore(mode, action) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      let actionResult;
      try {
        actionResult = action(transaction.objectStore(STORE_NAME));
      } catch (error) {
        reject(error);
        return;
      }
      transaction.oncomplete = () => resolve(actionResult);
      transaction.onerror = () => reject(transaction.error || new Error("Transaksi IndexedDB gagal."));
      transaction.onabort = () => reject(transaction.error || new Error("Transaksi IndexedDB dibatalkan."));
    });
  } finally {
    db.close();
  }
}

async function readAllEntries() {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const entries = [];
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          entries.push({ key: cursor.key, value: cursor.value });
          cursor.continue();
        } else {
          resolve(entries);
        }
      };
      request.onerror = () => reject(request.error || new Error("Gagal membaca antrean offline."));
    });
  } finally {
    db.close();
  }
}

async function removeEntry(key) {
  return withStore("readwrite", (store) => {
    store.delete(key);
    return Promise.resolve();
  });
}

async function countEntries() {
  const db = await openDb();
  try {
    return await reqAsPromise(db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).count());
  } finally {
    db.close();
  }
}

// ---- notifikasi jumlah pending ----
let cachedCount = 0;
const listeners = new Set();

function emitCount(count) {
  cachedCount = Number(count) || 0;
  listeners.forEach((cb) => {
    try { cb(cachedCount); } catch (e) { /* listener pihak pemanggil tidak boleh mengganggu */ }
  });
}

async function refreshCount() {
  try {
    emitCount(await countEntries());
  } catch (e) {
    // biarkan nilai terakhir; perangkat mungkin masih tanpa IndexedDB
  }
}

export async function enqueueMutation({ kind, entity, id, record }) {
  if (kind !== "save" && kind !== "delete") return false;
  if (!entity || PRIVILEGED_ENTITIES.has(entity)) return false; // tolak diam-diam
  if (kind === "save" && (!record || !record.id)) return false;
  if (kind === "delete" && !id && !(record && record.id)) return false;

  const payload = {
    kind,
    entity,
    id: id || (record && record.id),
    // simpan payload bersih: penanda _pendingSync tidak boleh ikut ke Firestore
    record: kind === "save" ? cleanRecord(record) : null,
    queuedAt: Date.now(),
  };

  try {
    await withStore("readwrite", (store) => {
      store.add(payload);
      return Promise.resolve();
    });
  } catch (e) {
    return false;
  }
  await refreshCount();
  return true;
}

function cleanRecord(record) {
  const copy = { ...(record || {}) };
  delete copy._pendingSync;
  return copy;
}

export async function getPendingCount() {
  try {
    const count = await countEntries();
    cachedCount = count;
    return count;
  } catch (e) {
    return cachedCount;
  }
}

export function subscribePendingCount(cb) {
  if (typeof cb !== "function") return () => {};
  listeners.add(cb);
  getPendingCount().then((count) => cb(count)).catch(() => {});
  return () => listeners.delete(cb);
}

/**
 * Memutar ulang seluruh antrean secara berurutan memakai handler ONLINE.
 * handlers = { saveRecord(entity, record), deleteRecord(entity, id) }
 * Berhenti pada kegagalan pertama dan menyisa entri untuk dicoba lagi.
 */
export async function flushQueue(handlers) {
  if (!handlers || typeof handlers.saveRecord !== "function" || typeof handlers.deleteRecord !== "function") {
    throw new Error("flushQueue membutuhkan handler saveRecord dan deleteRecord.");
  }
  const entries = await readAllEntries();
  let flushed = 0;
  for (const entry of entries) {
    const mutation = entry.value || {};
    try {
      if (mutation.kind === "save") {
        // _pendingSync tidak pernah boleh tertulis ke Firestore
        await handlers.saveRecord(mutation.entity, cleanRecord(mutation.record));
      } else if (mutation.kind === "delete") {
        await handlers.deleteRecord(mutation.entity, mutation.id);
      } else {
        // entri tidak dikenal: buang agar tidak menyumbat antrean selamanya
        await removeEntry(entry.key);
        flushed += 1;
        continue;
      }
      await removeEntry(entry.key);
      flushed += 1;
    } catch (error) {
      break; // pertahankan sisa entri untuk percobaan berikutnya
    }
  }
  await refreshCount();
  return { flushed, remaining: entries.length - flushed };
}
