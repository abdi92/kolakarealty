import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import {
  browserLocalPersistence,
  EmailAuthProvider,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

const ENTITY_GROUPS = {
  proyek: "PROYEK", clusterproyek: "PROYEK", progressunit: "PROYEK", updateharian: "PROYEK",
  materialrequest: "PROYEK", budgetkonstruksi: "PROYEK", blokkavling: "PROYEK", unit: "PROYEK",
  pricelist: "PROYEK", sertifikat: "LEGAL", perizinan: "LEGAL", dokumenlegal: "LEGAL",
  ppjb: "LEGAL", sppt: "LEGAL", sengketa: "LEGAL", berkaskpr: "BANK", prosesbank: "BANK",
  appraisal: "BANK", pencairankpr: "BANK", akadajb: "NOTARIS", baliknama: "NOTARIS",
  royaht: "NOTARIS", pph: "PAJAK", bphtb: "PAJAK", pembeli: "PENJUALAN",
  transaksi: "PENJUALAN", jualicicilan: "PENJUALAN", pengajuankpr: "PENJUALAN",
  jadwalcicilan: "PENJUALAN", unitpihak: "PENJUALAN", tagihan: "PENJUALAN",
  marketing: "MARKETING", prospek: "MARKETING", followup: "MARKETING", targetmarketing: "MARKETING",
  komisi: "MARKETING", arsipdokumen: "LEGAL", generatesurat: "LEGAL", pettycash: "KEUANGAN", bukubank: "KEUANGAN",
  voucher: "KEUANGAN", kartuanggaran: "KEUANGAN", piutang: "KEUANGAN", hutang: "KEUANGAN",
  budgetcontrol: "KEUANGAN", kartupiutang: "KEUANGAN", kartubarangmasuk: "KEUANGAN",
  spkborong: "KEUANGAN", kuitansi: "KEUANGAN", approval: "KEUANGAN", supplier: "GUDANG",
  masterbarang: "GUDANG", barangkeluar: "GUDANG", laporan: null, pengguna: null, pengaturan: null,
};

const PRIVILEGED_ENTITIES = new Set([
  "pengguna", "pengaturan", "transaksi", "booking", "approval", "kuitansi", "voucher", "pettycash", "bukubank",
  "kartuanggaran", "piutang", "hutang", "budgetcontrol", "kartupiutang", "kartubarangmasuk",
  "barangkeluar", "komisi", "pph", "bphtb", "pengajuankpr", "pencairankpr", "spkborong",
  "pricelist", "targetmarketing", "tagihan",
]);

let app;
let auth;
let db;

function config() {
  const value = window.KBR_FIREBASE_CONFIG;
  if (!value || !value.apiKey || !value.projectId || !value.appId) {
    throw new Error("Konfigurasi Firebase belum diisi pada shell Blogger.");
  }
  return value;
}

function services() {
  if (!app) {
    const firebaseConfig = config();
    app = initializeApp(firebaseConfig);
    if (firebaseConfig.appCheckSiteKey) {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(firebaseConfig.appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    }
    auth = getAuth(app);
    db = getFirestore(app);
  }
  return { auth, db };
}

function normalizeRole(role) {
  const value = String(role || "").trim().toLowerCase();
  if (value === "superadmin" || value === "super admin") return "Superadmin";
  if (value === "admin") return "Admin";
  if (value === "direktur") return "Direktur";
  if (value === "pengawas proyek" || value === "pengawasproyek") return "Pengawas Proyek";
  return "Manager";
}

function permissionsFor(role) {
  const normalized = normalizeRole(role);
  const entities = Object.keys(ENTITY_GROUPS);
  const canManageUsers = normalized === "Superadmin";
  const canWrite = normalized === "Superadmin" || normalized === "Admin";
  return {
    role: normalized,
    readableEntities: entities.filter((entity) => entity !== "pengguna" || canManageUsers).sort(),
    writableEntities: canWrite
      ? entities.filter((entity) => entity !== "pengguna" || canManageUsers).sort()
      : [],
    canBackup: canManageUsers,
    canManageUsers,
  };
}

async function sessionFor(user) {
  if (!user) return null;
  const snapshot = await getDoc(doc(services().db, "users", user.uid));
  if (!snapshot.exists()) throw new Error("Profil pengguna belum dibuat oleh Superadmin.");
  const profile = snapshot.data();
  if (String(profile.status || "").toLowerCase() !== "aktif") {
    throw new Error("Akun pengguna nonaktif.");
  }
  const role = normalizeRole(profile.role);
  return {
    user: {
      id: user.uid,
      nama: String(profile.nama || user.displayName || user.email || "Pengguna"),
      username: String(profile.username || user.email || ""),
      email: String(user.email || profile.email || ""),
      role,
    },
    permissions: permissionsFor(role),
    bootstrapMode: false,
  };
}

export async function authenticate(email, password) {
  const { auth: firebaseAuth } = services();
  await setPersistence(firebaseAuth, browserLocalPersistence);
  const credential = await signInWithEmailAndPassword(firebaseAuth, String(email || "").trim(), password);
  return { token: await credential.user.getIdToken(), session: await sessionFor(credential.user) };
}

export function observeSession(callback) {
  return onAuthStateChanged(services().auth, async (user) => {
    try {
      callback(user ? await sessionFor(user) : null, null);
    } catch (error) {
      callback(null, error);
    }
  });
}

export async function currentSession() {
  return sessionFor(services().auth.currentUser);
}

export async function logout() {
  await signOut(services().auth);
}

export async function loadAllData(session) {
  const result = {};
  const readable = (session && session.permissions && session.permissions.readableEntities) || [];
  await Promise.all(readable.map(async (entity) => {
    if (entity === "pengguna") {
      const users = await getDocs(collection(services().db, "users"));
      result[entity] = users.docs.map((item) => ({ id: item.id, ...item.data() }));
      return;
    }
    const records = await getDocs(collection(services().db, "entities", entity, "records"));
    result[entity] = records.docs.map((item) => ({ id: item.id, ...item.data() }));
  }));
  return result;
}

async function callAdmin(action, args) {
  const url = window.KBR_ADMIN_API_URL;
  const user = services().auth.currentUser;
  if (!url || url === "YOUR_APPS_SCRIPT_WEB_APP_URL") {
    throw new Error("URL Apps Script administratif belum dikonfigurasi.");
  }
  if (!user) throw new Error("Sesi Firebase tidak tersedia.");
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, idToken: await user.getIdToken(), args }),
    redirect: "follow",
    credentials: "omit",
  });
  const payload = await response.json();
  if (!response.ok || !payload.success) throw new Error(payload.message || "Operasi administratif gagal.");
  return payload.data;
}

export async function saveRecord(entity, record) {
  if (PRIVILEGED_ENTITIES.has(entity)) return callAdmin("saveRecord", [entity, record]);
  if (!record || !record.id) throw new Error("record.id wajib diisi.");
  const clean = { ...record, updatedAt: serverTimestamp() };
  await setDoc(doc(services().db, "entities", entity, "records", String(record.id)), clean, { merge: true });
  return record;
}

export async function deleteRecord(entity, id) {
  if (PRIVILEGED_ENTITIES.has(entity)) return callAdmin("deleteRecord", [entity, id]);
  await deleteDoc(doc(services().db, "entities", entity, "records", String(id)));
  return true;
}

export function adminCall(action, args) {
  if (action === "changeOwnPassword") {
    const user = services().auth.currentUser;
    if (!user || !user.email) return Promise.reject(new Error("Sesi Firebase tidak tersedia."));
    const credential = EmailAuthProvider.credential(user.email, args[0]);
    return reauthenticateWithCredential(user, credential)
      .then(() => updatePassword(user, args[1]))
      .then(() => true);
  }
  return callAdmin(action, args);
}
