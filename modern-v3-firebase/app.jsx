import {
  adminCall,
  authenticate,
  currentSession,
  deleteRecord as deleteFirestoreRecord,
  loadAllData,
  logout as firebaseLogout,
  observeSession,
  saveRecord as saveFirestoreRecord,
} from "./firebase-client.js";
import * as mammoth from "mammoth";

const { useState, useEffect, useRef, useDeferredValue } = React;

const APP_VERSION = "4.2.0-document-templates";

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("KBR UI error boundary:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="kbr-fatal" role="alert">
        <CompanyLogo size={54} radius={12} ring={true} />
        <div>
          <div className="kbr-fatal-kicker">Pemulihan tampilan</div>
          <h1>Aplikasi perlu dimuat ulang</h1>
          <p>Data Anda tetap tersimpan. Muat ulang untuk memulihkan sesi tampilan.</p>
        </div>
        <button type="button" onClick={() => window.location.reload()}>Muat ulang aplikasi</button>
      </main>
    );
  }
}

// ---------- ikon (inline SVG, tanpa dependensi npm) ----------
function makeIcon(paths) {
  return function IconCmp({ size = 20, strokeWidth = 1.8, color = "currentColor", style, ...rest }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style} {...rest}>
        {paths}
      </svg>
    );
  };
}
const Home = makeIcon(<><path d="M4 11l8-7 8 7" /><path d="M6 10v10h12V10" /><path d="M10 20v-6h4v6" /></>);
const Menu = makeIcon(<><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></>);
const Search = makeIcon(<><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>);
const Bell = makeIcon(<><path d="M6 8a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 21a2 2 0 004 0" /></>);
const ChevronDown = makeIcon(<polyline points="6 9 12 15 18 9" />);
const Building2 = makeIcon(<><path d="M4 21V7l8-4 8 4v14" /><path d="M9 21v-6h6v6" /><path d="M9 11h.01M15 11h.01M9 15h.01M15 15h.01" /></>);
const LayoutGrid = makeIcon(<><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" /></>);
const FileCheck = makeIcon(<><path d="M6 2h9l5 5v15H6z" /><path d="M15 2v5h5" /><path d="M9 14l2 2 4-4" /></>);
const FileText = makeIcon(<><path d="M6 2h9l5 5v15H6z" /><path d="M15 2v5h5" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="15" y2="17" /></>);
const FolderOpen = makeIcon(<><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v1H5" /><path d="M3 8l1.5 11h15L21 8" /></>);
const Landmark = makeIcon(<><path d="M4 21h16" /><path d="M5 21V10M9 21V10M15 21V10M19 21V10" /><path d="M3 10l9-6 9 6z" /></>);
const FileSignature = makeIcon(<><path d="M6 2h9l5 5v6" /><path d="M15 2v5h5" /><path d="M4 21c1-3.2 2-4.2 3-4.2s1 2.2 2 2.2 1-3.2 2-3.2 1 3.2 2 3.2" /></>);
const RefreshCw = makeIcon(<><path d="M21 12a9 9 0 01-15.5 6.5L3 16" /><path d="M3 12a9 9 0 0115.5-6.5L21 8" /><polyline points="21 3 21 8 16 8" /><polyline points="3 21 3 16 8 16" /></>);
const FileLock2 = makeIcon(<><path d="M6 2h9l5 5v15H6z" /><path d="M15 2v5h5" /><rect x="9" y="14" width="6" height="5" rx="1" /><path d="M10.5 14v-1.5a1.5 1.5 0 013 0V14" /></>);
const Receipt = makeIcon(<><path d="M6 2h12v20l-2-1.5L14 22l-2-1.5L10 22l-2-1.5L6 22z" /><line x1="8.5" y1="7" x2="15.5" y2="7" /><line x1="8.5" y1="11" x2="15.5" y2="11" /></>);
const Users = makeIcon(<><circle cx="9" cy="8" r="3" /><path d="M3 21v-1a6 6 0 0112 0v1" /><circle cx="17" cy="8.5" r="2.4" /><path d="M15.3 21v-.7a5 5 0 00-2-4" /></>);
const TrendingUp = makeIcon(<><polyline points="3 17 9 11 13 15 21 6" /><polyline points="15 6 21 6 21 12" /></>);
const Archive = makeIcon(<><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v11a1 1 0 001 1h12a1 1 0 001-1V8" /><line x1="10" y1="12" x2="14" y2="12" /></>);
const FileBarChart2 = makeIcon(<><path d="M6 2h9l5 5v15H6z" /><path d="M15 2v5h5" /><line x1="9" y1="18" x2="9" y2="14" /><line x1="12" y1="18" x2="12" y2="11" /><line x1="15" y1="18" x2="15" y2="15" /></>);
const UserCog = makeIcon(<><circle cx="9" cy="8" r="3" /><path d="M3 21v-1a6 6 0 0110.5-4" /><circle cx="18" cy="16.5" r="2.2" /><line x1="18" y1="12.7" x2="18" y2="13.7" /><line x1="18" y1="19.3" x2="18" y2="20.3" /><line x1="14.2" y1="16.5" x2="15.2" y2="16.5" /><line x1="20.8" y1="16.5" x2="21.8" y2="16.5" /></>);
const Eye = makeIcon(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>);
const Download = makeIcon(<><path d="M12 3v12" /><polyline points="7 11 12 16 17 11" /><path d="M5 19h14" /></>);
const Upload = makeIcon(<><path d="M12 16V4" /><polyline points="7 9 12 4 17 9" /><path d="M5 19h14" /></>);
const Check = makeIcon(<polyline points="4 12 9 17 20 6" />);
const ArrowRight = makeIcon(<><line x1="4" y1="12" x2="20" y2="12" /><polyline points="14 6 20 12 14 18" /></>);
const Calendar = makeIcon(<><rect x="3" y="5" width="18" height="16" rx="2" /><line x1="16" y1="3" x2="16" y2="7" /><line x1="8" y1="3" x2="8" y2="7" /><line x1="3" y1="10" x2="21" y2="10" /></>);
const X = makeIcon(<><line x1="6" y1="6" x2="18" y2="18" /><line x1="6" y1="18" x2="18" y2="6" /></>);
const Settings = makeIcon(<><circle cx="12" cy="12" r="3.2" /><path d="M12 3v2.4M12 18.6V21M21 12h-2.4M5.4 12H3M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3L5.6 5.6" /></>);
const LogOut = makeIcon(<><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></>);
const UserRound = makeIcon(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></>);
const Plus = makeIcon(<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>);
const Pencil = makeIcon(<><path d="M4 20l1-4L16 5l3 3L8 19l-4 1z" /><path d="M14 6.5l3 3" /></>);
const Trash2 = makeIcon(<><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></>);
const Save = makeIcon(<><path d="M5 3h11l3 3v15H5z" /><path d="M8 3v6h8V3" /><rect x="7" y="13" width="10" height="7" /></>);
const Inbox = makeIcon(<><path d="M3 12h5l1.5 3h5L16 12h5" /><path d="M5.5 6h13L21 12v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6z" /></>);
const AlertTriangle = makeIcon(<><path d="M12 3l10 18H2z" /><line x1="12" y1="10" x2="12" y2="15" /><line x1="12" y1="18" x2="12" y2="18" /></>);
const ArrowLeft = makeIcon(<><line x1="20" y1="12" x2="4" y2="12" /><polyline points="10 6 4 12 10 18" /></>);
const Paperclip = makeIcon(<path d="M21 11.5L12.5 20a4.5 4.5 0 01-6.36-6.36L14.6 5.18a3 3 0 014.24 4.24L10.4 17.9a1.5 1.5 0 01-2.12-2.12l7.07-7.07" />);
const Printer = makeIcon(<><path d="M6 9V3h12v6" /><rect x="4" y="9" width="16" height="8" rx="1.5" /><path d="M6 17v4h12v-4" /></>);
const DatabaseBackup = makeIcon(<><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" /><path d="M4 11v6c0 1.66 3.58 3 8 3 .34 0 .67-.01 1-.03" /><path d="M17.5 15.5v2.5l1.7 1" /><circle cx="18" cy="19" r="3.2" /></>);
const Copy = makeIcon(<><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></>);
const Wallet = makeIcon(<><path d="M3 7a2 2 0 012-2h13v4H5a2 2 0 01-2-2z" /><path d="M3 7v10a2 2 0 002 2h14a1 1 0 001-1V9H5a2 2 0 01-2-2z" /><circle cx="17" cy="14" r="1.4" /></>);
const ArrowDownCircle = makeIcon(<><circle cx="12" cy="12" r="9" /><polyline points="8 12 12 16 16 12" /><line x1="12" y1="8" x2="12" y2="16" /></>);
const ArrowUpCircle = makeIcon(<><circle cx="12" cy="12" r="9" /><polyline points="8 12 12 8 16 12" /><line x1="12" y1="16" x2="12" y2="8" /></>);
const HandCoins = makeIcon(<><circle cx="16" cy="8" r="3" /><path d="M3 15l4-4 3 3 5-5 6 6" /><path d="M3 20h18" /></>);
const Scale = makeIcon(<><line x1="12" y1="3" x2="12" y2="21" /><path d="M6 8l-3 7h6z" /><path d="M18 8l-3 7h6z" /><line x1="4" y1="21" x2="20" y2="21" /></>);
const PieChart = makeIcon(<><path d="M21 12A9 9 0 1112 3v9z" /><path d="M12 3a9 9 0 019 9h-9z" /></>);
const ClipboardList = makeIcon(<><rect x="7" y="4" width="10" height="4" rx="1" /><path d="M17 6h2a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h2" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="15" y2="16" /></>);
const BookOpen = makeIcon(<><path d="M2 5a2 2 0 012-2h6v16H4a2 2 0 01-2-2z" /><path d="M22 5a2 2 0 00-2-2h-6v16h6a2 2 0 002-2z" /><line x1="10" y1="19" x2="14" y2="19" /></>);
const Package = makeIcon(<><path d="M12 3l9 5v8l-9 5-9-5V8z" /><path d="M3 8l9 5 9-5" /><line x1="12" y1="13" x2="12" y2="21" /><path d="M7.5 5.5l9 5" /></>);
const Target = makeIcon(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" /></>);
const Megaphone = makeIcon(<><path d="M3 11v2a1 1 0 001 1h3l7 4V6L7 10H4a1 1 0 00-1 1z" /><path d="M18 9a3.5 3.5 0 010 6" /><path d="M7 14v5" /></>);
const PhoneCall = makeIcon(<><path d="M4 4h4l2 5-2.5 1.5a12 12 0 006 6L15 14l5 2v4a1 1 0 01-1 1A16 16 0 013 5a1 1 0 011-1z" /><path d="M15 4a5 5 0 015 5" /></>);
const Percent = makeIcon(<><line x1="19" y1="5" x2="5" y2="19" /><circle cx="7.5" cy="7.5" r="2.5" /><circle cx="16.5" cy="16.5" r="2.5" /></>);
const Tag = makeIcon(<><path d="M3 12V4a1 1 0 011-1h8l9 9-9 9z" /><circle cx="7.5" cy="7.5" r="1.4" /></>);
const Warehouse = makeIcon(<><path d="M3 21V9l9-5 9 5v12" /><path d="M7 21v-7h10v7" /><line x1="7" y1="17" x2="17" y2="17" /></>);
const Truck = makeIcon(<><rect x="1" y="6" width="13" height="10" rx="1" /><path d="M14 9h4l3 3v4h-7z" /><circle cx="6" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>);
const ShieldCheck = makeIcon(<><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><polyline points="9 12 11.5 14.5 16 10" /></>);
const UserPlus = makeIcon(<><circle cx="9" cy="8" r="3.4" /><path d="M2.5 21v-1a6.5 6.5 0 0113 0v1" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="16" y1="11" x2="22" y2="11" /></>);

// ---------- donut chart (SVG murni, tanpa dependensi recharts) ----------
function Donut({ data, size = 148, thickness = 24 }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF0F4" strokeWidth={thickness} />
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {data.map((d, i) => {
          const frac = d.value / total;
          const len = frac * c;
          const gap = data.length > 1 ? 2.5 : 0;
          const dash = Math.max(len - gap, 0.001);
          const dashArray = `${dash} ${c - dash}`;
          const dashOffset = -acc;
          acc += len;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
            />
          );
        })}
      </g>
    </svg>
  );
}

// ---------- tema ----------
const C = {
  navy: "#0A1930",
  navyActive: "#112A4F",
  accent: "#B8863B",
  page: "#F4F6F9",
  card: "#FFFFFF",
  border: "#E1E5ED",
  ink: "#121A2F",
  muted: "#5C6A82",
  mutedLight: "#8D9CB3",
  navyText: "#B0BBD0",
  navyTextDim: "#8395B1",
  red: "#C93D34",
  blue: "#2952B6",
};

const palette = {
  blue: { fg: "#2952B6", bg: "#E8EEFA" },
  green: { fg: "#188A58", bg: "#E2F4EB" },
  brown: { fg: "#A6752C", bg: "#F8EEDB" },
  purple: { fg: "#6A45B8", bg: "#ECE6FA" },
  amber: { fg: "#AD7B24", bg: "#FAEFDB" },
  teal: { fg: "#0A8378", bg: "#E0F4F2" },
  red: { fg: "#C93D34", bg: "#FBE9E7" },
  gray: { fg: "#5C6A82", bg: "#EAEFF4" },
};

// Skema warna mengikuti tampilan SIDPRO (AdminLTE): sidebar navy pekat, konten abu terang.
const SIDE = {
  bg: "#33475B",
  brandBg: "#2D3F52",
  text: "#C2C7D0",
  textDim: "#94A2B3",
  activeBg: "#41586E",
  submenuBg: "rgba(0,0,0,0.14)",
  divider: "rgba(255,255,255,0.10)",
};
const UI = {
  primary: "#2E6FB7",
  headingText: "#6C757D",
  boxBorder: "#E3E6EC",
  boxShadow: "0 0 1px rgba(0,0,0,0.125), 0 1px 3px rgba(0,0,0,0.16)",
  radius: 4,
};

const DEFAULT_APP_SETTINGS = {
  id: "default",
  namaPerusahaan: "PT Kolaka Bumi Realty",
  namaSingkat: "PT Kolaka Bumi Realty",
  tagline: "Developer & Contraktor",
  alamat: "Office : Jl. Repelita No. 54",
  telepon: "Telp (0405) 2321613 · HP 0852 4197 4777",
  email: "kolakakbr@gmail.com",
  logoUrl: `${window.KBR_ASSET_BASE_URL || "./"}logo-kolakabumirealty.png`,
  warnaUtama: "#2E6FB7",
  warnaSidebar: "#33475B",
  warnaAksen: "#B8863B",
  templateSurat: "Dokumen ini dicetak dari modul Generate Surat.",
  templateKuitansi: "Kuitansi sah bila ditandatangani dan distempel perusahaan.",
  templateSpk: "Dokumen ini dicetak dari modul Keuangan — SPK Borong Upah.",
  templateDetail: "Dokumen dicetak dari sistem administrasi perusahaan.",
  footerDokumen: "PT Kolaka Bumi Realty",
  customSuratTemplates: [],
};

let ACTIVE_APP_SETTINGS = { ...DEFAULT_APP_SETTINGS };

const BRAND = {
  shortName: "PT Kolaka Bumi Realty",
  fullName: "PT Kolaka Bumi Realty",
  subtitle: "Aplikasi Management Administrasi",
  appLabel: "Aplikasi Management Administrasi",
  companyLine: "PT Kolaka Bumi Realty",
  logoSrc: "data:image/png;base64,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",
};

BRAND.logoSrc = DEFAULT_APP_SETTINGS.logoUrl;

function applyAppSettings(record) {
  ACTIVE_APP_SETTINGS = { ...DEFAULT_APP_SETTINGS, ...(record || {}), id: "default" };
  BRAND.shortName = ACTIVE_APP_SETTINGS.namaSingkat;
  BRAND.fullName = ACTIVE_APP_SETTINGS.namaPerusahaan;
  BRAND.companyLine = ACTIVE_APP_SETTINGS.namaPerusahaan;
  BRAND.logoSrc = ACTIVE_APP_SETTINGS.logoUrl;
  C.blue = ACTIVE_APP_SETTINGS.warnaUtama;
  C.navy = ACTIVE_APP_SETTINGS.warnaSidebar;
  C.accent = ACTIVE_APP_SETTINGS.warnaAksen;
  UI.primary = ACTIVE_APP_SETTINGS.warnaUtama;
  SIDE.bg = ACTIVE_APP_SETTINGS.warnaSidebar;
  SIDE.brandBg = ACTIVE_APP_SETTINGS.warnaSidebar;
  SIDE.activeBg = ACTIVE_APP_SETTINGS.warnaUtama;
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    window.__kbrInstallPrompt = event;
    window.dispatchEvent(new CustomEvent("kbr-install-ready"));
  });
  window.addEventListener("appinstalled", () => {
    window.__kbrInstallPrompt = null;
    window.dispatchEvent(new CustomEvent("kbr-app-installed"));
  });
}

function CompanyLogo({ size = 36, radius = 10, ring = false }) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = !!BRAND.logoSrc && !imageFailed;
  const initials = BRAND.shortName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: "hidden",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: hasImage ? "#fff" : "linear-gradient(135deg, #E9EFFD 0%, #D6E2F9 100%)",
        border: ring ? "1px solid rgba(255,255,255,0.34)" : `1px solid ${C.border}`,
      }}
    >
      {hasImage ? (
        <img
          src={BRAND.logoSrc}
          alt={BRAND.fullName}
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span style={{ color: C.navy, fontWeight: 800, fontSize: Math.max(10, Math.floor(size * 0.34)), letterSpacing: "0.02em" }}>{initials || "KB"}</span>
      )}
    </div>
  );
}

// Kop surat resmi — hanya tampil saat cetak (window.print) di dalam aplikasi
function KopSuratPrint() {
  return (
    <div className="kbr-kop-print" style={{ display: "none" }}>
      <div style={{ display: "flex", alignItems: "center", borderBottom: "3px double #000", paddingBottom: 8, marginBottom: 14, color: "#000", fontFamily: "'Times New Roman', Times, serif" }}>
        {BRAND.logoSrc ? <img src={BRAND.logoSrc} alt="Logo" style={{ width: 78, height: 78, objectFit: "contain", marginRight: 14, padding: 4, background: "#fff" }} /> : null}
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>PT Kolaka Bumi Realty</div>
          <div style={{ fontStyle: "italic", fontSize: 11, marginTop: 2 }}>Developer &amp; Contraktor</div>
          <div style={{ fontSize: 10.5, marginTop: 3 }}>Office : Jl. Repelita No. 54 · Telp (0405) 2321613 · HP 0852 4197 4777</div>
          <div style={{ fontSize: 10.5, marginTop: 2 }}>Email : kolakakbr@gmail.com</div>
        </div>
      </div>
    </div>
  );
}

// ---------- pemetaan status -> warna (mencakup semua istilah status di 17 modul) ----------
const STATUS_TONE = {
  "aktif": "green", "tersedia": "green", "lunas": "green", "disetujui": "green", "selesai": "blue",
  "proses": "amber", "menunggu": "blue", "terjadwal": "blue", "dipesan": "amber", "berjalan": "blue",
  "kadaluarsa": "red", "ditolak": "red", "terlambat": "red", "belum lunas": "amber", "belum": "amber",
  "menunggak": "red", "nonaktif": "gray", "terjual": "blue", "perencanaan": "gray", "ditunda": "amber",
  "jatuh tempo": "red",
};
function statusTone(status) {
  const key = String(status || "").trim().toLowerCase();
  return STATUS_TONE[key] || "gray";
}
function StatusBadge({ status }) {
  if (!status) return <span style={{ color: C.mutedLight, fontSize: 12.5 }}>-</span>;
  const tone = palette[statusTone(status)];
  return (
    <span style={{ background: tone.bg, color: tone.fg, fontSize: 11.5, fontWeight: 600, padding: "4px 11px", borderRadius: 999, whiteSpace: "nowrap", display: "inline-block" }}>
      {status}
    </span>
  );
}

// ---------- util ----------
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
function formatTanggal(isoStr) {
  if (!isoStr) return "-";
  const d = new Date(isoStr + "T00:00:00");
  if (isNaN(d.getTime())) return String(isoStr);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}
function formatFieldValue(value, field) {
  if (value === undefined || value === null || value === "") return "-";
  if (field.type === "date") return formatTanggal(value);
  if (field.type === "number") {
    const n = Number(value);
    if (isNaN(n)) return String(value);
    return field.currency ? formatRupiah(n) : n.toLocaleString("id-ID");
  }
  return String(value);
}
function formatRupiah(value) {
  if (value === undefined || value === null || value === "") return "-";
  const n = Number(value);
  if (isNaN(n)) return String(value);
  return `Rp ${n.toLocaleString("id-ID")}`;
}

// ---------- CSV Export helper (schema-driven, aman dari koma/kutip) ----------
function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes("\"") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
function exportRecordsToCsv(schema, records) {
  const cols = schema.fields.filter((f) => !f.secure);
  const header = cols.map((f) => csvEscape(f.label)).join(",");
  const rows = records.map((r) => cols.map((f) => {
    const v = r[f.key];
    if (f.type === "date" && v) return csvEscape(v);
    if (f.type === "number") return csvEscape(v === "" || v === undefined || v === null ? "" : Number(v));
    return csvEscape(v === undefined || v === null ? "" : v);
  }).join(","));
  const csv = "\uFEFF" + [header, ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${schema.key}-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function compareFieldValue(a, b, field) {
  const emptyA = a === undefined || a === null || a === "";
  const emptyB = b === undefined || b === null || b === "";
  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;
  if (field && field.type === "number") return Number(a) - Number(b);
  if (field && field.type === "date") return String(a).localeCompare(String(b));
  return String(a).localeCompare(String(b), "id", { numeric: true, sensitivity: "base" });
}

/** Parser CSV yang menghormati tanda kutip ganda dan newline di dalam sel. */
function parseCsvText(text) {
  const src = String(text || "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === ",") { row.push(cell); cell = ""; continue; }
    if (ch === "\r") continue;
    if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; continue; }
    cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
}

/** Ubah teks CSV jadi kandidat record sesuai schema. Header dicocokkan ke label ATAU key field. */
function parseCsvToRecords(schema, text) {
  const rows = parseCsvText(text);
  if (rows.length < 2) return { records: [], errors: ["File CSV kosong atau hanya berisi baris header."] };

  const normalize = (s) => String(s || "").trim().toLowerCase();
  const importable = schema.fields.filter((f) => !f.secure && f.type !== "file");
  const header = rows[0].map(normalize);
  const colToField = header.map((h) => importable.find((f) => normalize(f.label) === h || normalize(f.key) === h) || null);

  if (!colToField.some(Boolean)) {
    return { records: [], errors: ["Tidak ada kolom header yang cocok dengan field modul ini. Gunakan hasil Export CSV sebagai contoh format."] };
  }

  const errors = [];
  const records = [];
  for (let i = 1; i < rows.length; i++) {
    const raw = rows[i];
    const rec = { id: uid() };
    let rowError = "";
    colToField.forEach((field, idx) => {
      if (!field) return;
      const value = String(raw[idx] === undefined ? "" : raw[idx]).trim();
      if (!value) return;
      if (field.type === "number") {
        const num = Number(value.replace(/[^0-9.-]/g, ""));
        if (isNaN(num)) { rowError = `kolom "${field.label}" bukan angka valid ("${value}")`; return; }
        rec[field.key] = num;
      } else if (field.type === "date") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) { rowError = `kolom "${field.label}" harus format YYYY-MM-DD ("${value}")`; return; }
        rec[field.key] = value;
      } else if (field.type === "select" && Array.isArray(field.options) && field.options.length) {
        const match = field.options.find((o) => normalize(o) === normalize(value));
        if (!match) { rowError = `kolom "${field.label}" harus salah satu dari: ${field.options.join(", ")}`; return; }
        rec[field.key] = match;
      } else {
        rec[field.key] = value;
      }
    });

    if (rowError) { errors.push(`Baris ${i + 1}: ${rowError}`); continue; }
    const missing = importable.filter((f) => f.required && !rec[f.key]);
    if (missing.length) { errors.push(`Baris ${i + 1}: field wajib kosong — ${missing.map((f) => f.label).join(", ")}`); continue; }
    records.push(rec);
  }
  return { records, errors };
}

function monthKeyFromDate(dateStr) {
  return dateStr ? String(dateStr).slice(0, 7) : "";
}

function monthLabelFromKey(monthKey) {
  if (!monthKey) return "";
  const [year, month] = String(monthKey).split("-");
  const index = Number(month) - 1;
  if (isNaN(index) || !MONTH_SHORT[index]) return monthKey;
  return `${MONTH_SHORT[index]} ${year}`;
}

function getCombinedTaxPayments(data) {
  const pphList = (data && data.pph) || [];
  const bphtbList = (data && data.bphtb) || [];
  const rows = [];
  pphList.forEach((record) => {
    rows.push({
      ...record,
      _sourceKey: "pph",
      jenisPajak: "PPh",
      nominalPajak: record.nilaiPph,
      periode: record.periode || monthKeyFromDate(record.tanggalPengajuan),
    });
  });
  bphtbList.forEach((record) => {
    rows.push({
      ...record,
      _sourceKey: "bphtb",
      jenisPajak: "BPHTB",
      nominalPajak: record.nilaiBphtb,
      periode: record.periode || monthKeyFromDate(record.tanggalPengajuan),
    });
  });
  return rows.sort((a, b) => String(b.tanggalSetor || b.tanggalPengajuan || "").localeCompare(String(a.tanggalSetor || a.tanggalPengajuan || "")));
}

/**
 * Stok material real-time: gabungan Kartu Barang Masuk (mutasi masuk/keluar)
 * dan Barang Keluar Gudang, dikelompokkan per barang + gudang.
 */
function computeStokGudang(data) {
  const toNumber = (v) => { const n = Number(String(v == null ? "" : v).replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
  const bucket = new Map();
  const keyOf = (nama, gudang) => `${String(nama || "").trim().toLowerCase()}|${String(gudang || "").trim().toLowerCase()}`;
  const touch = (nama, gudang) => {
    const key = keyOf(nama, gudang);
    if (!bucket.has(key)) {
      bucket.set(key, { id: key, namaBarang: String(nama || "").trim(), gudang: String(gudang || "").trim(), kategori: "", satuan: "", totalMasuk: 0, totalKeluar: 0, hargaTerakhir: 0, stokMinimum: 0 });
    }
    return bucket.get(key);
  };

  ((data && data.masterbarang) || []).forEach((r) => {
    if (!String(r.namaBarang || "").trim()) return;
    const row = touch(r.namaBarang, r.gudang);
    row.kategori = row.kategori || r.kategori || "";
    row.satuan = row.satuan || r.satuan || "";
    row.stokMinimum = toNumber(r.stokMinimum);
    row.hargaTerakhir = row.hargaTerakhir || toNumber(r.hargaStandar);
  });

  ((data && data.kartubarangmasuk) || []).forEach((r) => {
    if (!String(r.namaBarang || "").trim()) return;
    const row = touch(r.namaBarang, r.gudang);
    row.kategori = row.kategori || r.kategoriBarang || "";
    row.satuan = row.satuan || r.satuan || "";
    row.totalMasuk += toNumber(r.jumlahMasuk);
    row.totalKeluar += toNumber(r.jumlahKeluar);
    const harga = toNumber(r.hargaSatuan);
    if (harga > 0) row.hargaTerakhir = harga;
  });

  ((data && data.barangkeluar) || []).forEach((r) => {
    if (!String(r.namaBarang || "").trim()) return;
    if (String(r.status || "") === "Batal") return;
    const row = touch(r.namaBarang, r.gudang);
    row.kategori = row.kategori || r.kategoriBarang || "";
    row.satuan = row.satuan || r.satuan || "";
    row.totalKeluar += toNumber(r.jumlahKeluar);
    const harga = toNumber(r.hargaSatuan);
    if (harga > 0) row.hargaTerakhir = harga;
  });

  return Array.from(bucket.values())
    .map((row) => {
      const sisaStok = row.totalMasuk - row.totalKeluar;
      const minimum = row.stokMinimum;
      const status = sisaStok <= 0 ? "Habis" : (minimum > 0 && sisaStok <= minimum ? "Menipis" : "Aman");
      return { ...row, sisaStok, nilaiStok: Math.round(sisaStok * row.hargaTerakhir), status };
    })
    .sort((a, b) => a.namaBarang.localeCompare(b.namaBarang, "id"));
}

/** Data untuk modul "virtual" (tidak disimpan di sheet, dihitung dari modul lain). */
function computeVirtualRecords(entityKey, data) {
  if (entityKey === "stokgudang") return computeStokGudang(data);
  return getCombinedTaxPayments(data);
}

// ---------- lapisan komunikasi ke backend Apps Script ----------
const IDEMPOTENT_ACTIONS = new Set(["getSession", "listAllData", "listBackups", "listAuditLog", "searchAll", "getFinanceSummary"]);
const pendingApiRequests = new Map();
function gsCall(fnName, ...args) {
  const requestKey = IDEMPOTENT_ACTIONS.has(fnName)
    ? `${fnName}:${JSON.stringify(args)}`
    : "";
  if (requestKey && pendingApiRequests.has(requestKey)) {
    return pendingApiRequests.get(requestKey);
  }
  let request;
  if (fnName === "authenticateUser") request = authenticate(args[0], args[1]);
  else if (fnName === "getSession") request = currentSession();
  else if (fnName === "logout") request = firebaseLogout().then(() => true);
  else if (fnName === "listAllData") request = currentSession().then(loadAllData);
  else if (fnName === "saveRecord") request = saveFirestoreRecord(args[0], args[1]);
  else if (fnName === "deleteRecord") request = deleteFirestoreRecord(args[0], args[1]);
  else request = adminCall(fnName, args);

  request = Promise.resolve(request)
    .finally(() => {
      if (requestKey) pendingApiRequests.delete(requestKey);
    });

  if (requestKey) pendingApiRequests.set(requestKey, request);
  return request;
}

// ---------- status simpan (umpan balik visual berhasil/gagal) ----------
function useSaveStatus() {
  const [status, setStatus] = useState(null); // null | "ok" | "error"
  const flash = (ok) => {
    setStatus(ok ? "ok" : "error");
    window.clearTimeout(flash._t);
    flash._t = window.setTimeout(() => setStatus(null), 3000);
  };
  return [status, flash];
}
function SaveStatus({ status }) {
  if (!status) return null;
  const ok = status === "ok";
  return (
    <span role="status" style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: "0.03em", color: ok ? "#17A768" : C.red, display: "inline-flex", alignItems: "center", gap: 5 }}>
      {ok ? "✓ Tersimpan" : "✕ Gagal menyimpan — periksa koneksi & coba lagi"}
    </span>
  );
}

// ---------- Toast global (single source of truth) ----------
const TOAST_EVENT = "kbr-toast-event";
function pushToast(message, tone) {
  if (typeof window === "undefined" || !message) return;
  const detail = { id: Date.now() + Math.random(), message: String(message), tone: tone || "info" };
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail }));
}
function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const handler = (e) => {
      const t = e.detail;
      setToasts((prev) => [...prev, t]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 4200);
    };
    window.addEventListener(TOAST_EVENT, handler);
    return () => window.removeEventListener(TOAST_EVENT, handler);
  }, []);
  const tones = {
    success: { bg: "#0F9F5E", icon: "✓" },
    error: { bg: "#DC4C42", icon: "✕" },
    info: { bg: "#355DCC", icon: "ℹ" },
    warning: { bg: "#D19A2A", icon: "!" },
  };
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none" }}>
      {toasts.map((t) => {
        const tone = tones[t.tone] || tones.info;
        return (
          <div key={t.id} className="kbr-toast" style={{ background: tone.bg, color: "#fff", padding: "12px 16px", borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.2)", minWidth: 260, maxWidth: 380, display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600, pointerEvents: "auto" }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0 }}>{tone.icon}</div>
            <div style={{ flex: 1 }}>{t.message}</div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- definisi seluruh modul (satu tempat, dipakai sidebar + form + tabel + dashboard) ----------
const ENTITIES = [
  {
    key: "proyek", label: "Proyek", group: "PROYEK", icon: Building2,
    fields: [
      { key: "namaProyek", label: "Nama Proyek", type: "text", required: true },
      { key: "lokasi", label: "Lokasi Proyek", type: "text" },
      { key: "tanggalMulai", label: "Tanggal Mulai Konstruksi", type: "date" },
      { key: "totalUnit", label: "Total Unit Rencana", type: "number" },
      { key: "status", label: "Status Proyek", type: "select", options: ["Perencanaan", "Aktif", "Selesai"] },
    ],
    columns: ["namaProyek", "lokasi", "tanggalMulai", "totalUnit"], statusField: "status",
    searchFields: ["namaProyek", "lokasi"],
  },
  {
    key: "clusterproyek", label: "Cluster Proyek", group: "PROYEK", icon: LayoutGrid,
    fields: [
      { key: "proyek", label: "Proyek", type: "text", required: true, ref: "proyek.namaProyek" },
      { key: "namaCluster", label: "Nama Cluster", type: "text", required: true },
      { key: "kodeCluster", label: "Kode Cluster", type: "text" },
      { key: "totalUnit", label: "Total Unit Rencana", type: "number" },
      { key: "status", label: "Status Cluster", type: "select", options: ["Perencanaan", "Aktif", "Selesai"] },
    ],
    columns: ["proyek", "namaCluster", "kodeCluster", "totalUnit"], statusField: "status",
    searchFields: ["proyek", "namaCluster", "kodeCluster"],
  },
  {
    key: "progressunit", label: "Progress Proyek", group: "PROYEK", icon: TrendingUp,
    fields: [
      { key: "proyek", label: "Proyek", type: "text", required: true, ref: "proyek.namaProyek" },
      { key: "cluster", label: "Cluster", type: "text", ref: "clusterproyek.namaCluster" },
      { key: "unit", label: "Unit", type: "text", required: true, ref: "unit.nomorUnit" },
      { key: "tahapPembangunan", label: "Tahap Pembangunan", type: "select", options: ["Persiapan", "Pondasi", "Struktur", "Arsitektur", "MEP", "Finishing", "Serah Terima"] },
      { key: "progressPersen", label: "Progress (%)", type: "number" },
      { key: "targetSelesai", label: "Target Selesai", type: "date" },
      { key: "status", label: "Status Monitoring", type: "select", options: ["Belum Mulai", "Berjalan", "Terlambat", "Selesai"] },
    ],
    columns: ["proyek", "cluster", "unit", "progressPersen"], statusField: "status",
    searchFields: ["proyek", "cluster", "unit", "tahapPembangunan"],
  },
  {
    key: "updateharian", label: "Update Harian Lapangan", group: "PROYEK", icon: Calendar,
    fields: [
      { key: "tanggal", label: "Tanggal", type: "date", required: true },
      { key: "proyek", label: "Proyek", type: "text", required: true, ref: "proyek.namaProyek" },
      { key: "cluster", label: "Cluster", type: "text", ref: "clusterproyek.namaCluster" },
      { key: "unit", label: "Unit", type: "text", ref: "unit.nomorUnit" },
      { key: "petugas", label: "Mandor / PJ Lapangan", type: "text" },
      { key: "shift", label: "Shift", type: "select", options: ["Pagi", "Siang", "Sore", "Malam"] },
      { key: "cuaca", label: "Cuaca", type: "select", options: ["Cerah", "Berawan", "Mendung", "Hujan"] },
      { key: "uraianPekerjaan", label: "Uraian Pekerjaan", type: "text", required: true },
      { key: "tenagaKerja", label: "Jumlah Tenaga Kerja", type: "number" },
      { key: "progresHariIni", label: "Progres Hari Ini (%)", type: "number" },
      { key: "materialDipakai", label: "Material yang Dipakai", type: "text" },
      { key: "hambatan", label: "Hambatan", type: "text" },
      { key: "catatan", label: "Catatan Mandor", type: "text" },
    ],
    columns: ["tanggal", "petugas", "unit", "progresHariIni"], statusField: null,
    searchFields: ["tanggal", "proyek", "cluster", "unit", "petugas", "uraianPekerjaan", "hambatan"],
  },
  {
    key: "materialrequest", label: "Permintaan Material", group: "PROYEK", icon: Inbox,
    fields: [
      { key: "tanggalPermintaan", label: "Tanggal Permintaan", type: "date", required: true },
      { key: "proyek", label: "Proyek", type: "text", required: true, ref: "proyek.namaProyek" },
      { key: "cluster", label: "Cluster", type: "text", ref: "clusterproyek.namaCluster" },
      { key: "unit", label: "Unit", type: "text", ref: "unit.nomorUnit" },
      { key: "material", label: "Material", type: "text", required: true },
      { key: "jumlah", label: "Jumlah Diminta", type: "number" },
      { key: "satuan", label: "Satuan", type: "text" },
      { key: "prioritas", label: "Prioritas", type: "select", options: ["Rendah", "Sedang", "Tinggi", "Mendesak"] },
      { key: "status", label: "Status Permintaan", type: "select", options: ["Diajukan", "Disetujui", "Dikirim", "Selesai", "Ditolak"] },
    ],
    columns: ["tanggalPermintaan", "proyek", "unit", "material"], statusField: "status",
    searchFields: ["tanggalPermintaan", "proyek", "cluster", "unit", "material"],
  },
  {
    key: "budgetkonstruksi", label: "Budget vs Realisasi", group: "PROYEK", icon: FileBarChart2,
    fields: [
      { key: "tanggalUpdate", label: "Tanggal Update", type: "date", required: true },
      { key: "proyek", label: "Proyek", type: "text", required: true, ref: "proyek.namaProyek" },
      { key: "cluster", label: "Cluster", type: "text", ref: "clusterproyek.namaCluster" },
      { key: "unit", label: "Unit", type: "text", ref: "unit.nomorUnit" },
      { key: "kategoriBiaya", label: "Kategori Biaya", type: "select", options: ["Material", "Upah", "Alat", "Subkon", "Operasional", "Lainnya"] },
      { key: "anggaran", label: "Anggaran (Rp)", type: "number" },
      { key: "realisasi", label: "Realisasi (Rp)", type: "number" },
      { key: "status", label: "Status Budget", type: "select", options: ["Aman", "Hampir Batas", "Over Budget"] },
      { key: "catatan", label: "Catatan Budget", type: "text" },
    ],
    columns: ["tanggalUpdate", "proyek", "unit", "anggaran"], statusField: "status",
    searchFields: ["tanggalUpdate", "proyek", "cluster", "unit", "kategoriBiaya"],
  },
  {
    key: "blokkavling", label: "Blok & Kavling", group: "PROYEK", icon: LayoutGrid,
    fields: [
      { key: "proyek", label: "Proyek", type: "text", required: true, ref: "proyek.namaProyek" },
      { key: "blok", label: "Blok", type: "text", required: true },
      { key: "nomorKavling", label: "Nomor Kavling", type: "text" },
      { key: "luasM2", label: "Luas (M²)", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["Tersedia", "Dipesan", "Terjual"] },
    ],
    columns: ["proyek", "blok", "nomorKavling", "luasM2"], statusField: "status",
    searchFields: ["proyek", "blok", "nomorKavling"],
  },
  {
    key: "unit", label: "Master Unit", group: "PROYEK", icon: Home,
    fields: [
      { key: "proyek", label: "Proyek", type: "text", required: true, ref: "proyek.namaProyek" },
      { key: "nomorUnit", label: "Nomor Unit", type: "text", required: true },
      { key: "tipe", label: "Tipe", type: "text" },
      { key: "luasBangunan", label: "Luas Bangunan (M²)", type: "number" },
      { key: "luasTanah", label: "Luas Tanah (M²)", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["Tersedia", "Proses", "Terjual"] },
    ],
    columns: ["proyek", "nomorUnit", "tipe", "luasBangunan"], statusField: "status",
    searchFields: ["proyek", "nomorUnit", "tipe"],
  },
  {
    key: "pricelist", label: "Price List Unit", group: "PROYEK", icon: Tag,
    fields: [
      { key: "proyek", label: "Proyek", type: "text", required: true, ref: "proyek.namaProyek" },
      { key: "cluster", label: "Cluster", type: "text", ref: "clusterproyek.namaCluster" },
      { key: "tipeUnit", label: "Tipe Unit (mis. 36/98)", type: "text", required: true },
      { key: "kategori", label: "Kategori", type: "select", options: ["Subsidi", "Komersil", "Syariah", "Ruko", "Kavling"] },
      { key: "luasTanah", label: "Luas Tanah (m²)", type: "number" },
      { key: "luasBangunan", label: "Luas Bangunan (m²)", type: "number" },
      { key: "hargaDasar", label: "Harga Dasar (Rp)", type: "number", currency: true, required: true },
      { key: "kenaikanPersen", label: "Kenaikan / Markup (%)", type: "number" },
      { key: "hargaJual", label: "Harga Jual (Rp)", type: "number", currency: true, readOnly: true },
      { key: "diskonMaksimal", label: "Diskon Maksimal (Rp)", type: "number", currency: true },
      { key: "hargaMinimal", label: "Harga Minimal / Floor (Rp)", type: "number", currency: true, readOnly: true },
      { key: "bookingFee", label: "Booking Fee (Rp)", type: "number", currency: true },
      { key: "uangMukaMinimal", label: "Uang Muka Minimal (Rp)", type: "number", currency: true },
      { key: "berlakuMulai", label: "Berlaku Mulai", type: "date" },
      { key: "berlakuSampai", label: "Berlaku Sampai", type: "date" },
      { key: "catatan", label: "Catatan", type: "text" },
      { key: "status", label: "Status Price List", type: "select", options: ["Draft", "Aktif", "Kadaluarsa"] },
    ],
    columns: ["proyek", "cluster", "tipeUnit", "hargaDasar", "hargaJual"], statusField: "status",
    searchFields: ["proyek", "cluster", "tipeUnit", "kategori"],
    filterFields: ["proyek", "kategori", "status"],
  },
  {
    key: "sertifikat", label: "Sertifikat", group: "LEGAL", icon: FileCheck,
    fields: [
      { key: "nomorSertifikat", label: "Nomor Sertifikat", type: "text", required: true },
      { key: "jenis", label: "Jenis Sertifikat", type: "select", options: ["SHM", "SHGB", "SHGU", "Girik", "SHMSRS"] },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "nomorUnit", label: "Nomor Unit", type: "text", ref: "unit.nomorUnit" },
      { key: "atasNama", label: "Atas Nama", type: "text", ref: "pembeli.nama" },
      { key: "luasTanah", label: "Luas Tanah (m²)", type: "number" },
      { key: "luasBangunan", label: "Luas Bangunan (m²)", type: "number" },
      { key: "penerbit", label: "Kantor BPN / Penerbit", type: "text" },
      { key: "tanggalTerbit", label: "Tanggal Terbit", type: "date" },
      { key: "tanggalHabis", label: "Berlaku s/d (SHGB/SHGU)", type: "date" },
      { key: "lokasiTanah", label: "Lokasi / Alamat Tanah", type: "text" },
      { key: "catatan", label: "Catatan", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Aktif", "Proses", "Kadaluarsa", "Diblokir"] },
    ],
    columns: ["nomorSertifikat", "jenis", "proyek", "nomorUnit", "atasNama"], statusField: "status",
    searchFields: ["nomorSertifikat", "proyek", "nomorUnit", "atasNama"],
  },
  {
    key: "perizinan", label: "Perizinan", group: "LEGAL", icon: FileText,
    fields: [
      { key: "nomorIzin", label: "Nomor Izin", type: "text", required: true },
      { key: "jenisIzin", label: "Jenis Izin", type: "select", options: ["IMB", "PBG", "SLF", "Izin Lingkungan", "AMDAL", "Izin Lokasi", "SIPPT", "Lainnya"] },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "penerbitIzin", label: "Dinas / Penerbit Izin", type: "text" },
      { key: "nomorBerkas", label: "Nomor Berkas Pengajuan", type: "text" },
      { key: "penanggungJawab", label: "PIC / Penanggung Jawab", type: "text" },
      { key: "tanggalPengajuan", label: "Tanggal Pengajuan", type: "date" },
      { key: "tanggalTerbit", label: "Tanggal Terbit", type: "date" },
      { key: "masaBerlaku", label: "Masa Berlaku s/d", type: "date" },
      { key: "catatan", label: "Catatan / Syarat", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Aktif", "Proses", "Menunggu", "Kadaluarsa", "Dicabut"] },
    ],
    columns: ["nomorIzin", "jenisIzin", "proyek", "masaBerlaku"], statusField: "status",
    searchFields: ["nomorIzin", "jenisIzin", "proyek", "penerbitIzin"],
  },
  {
    key: "dokumenlegal", label: "Dokumen Legal", group: "LEGAL", icon: FolderOpen,
    fields: [
      { key: "nomorDokumen", label: "Nomor Dokumen", type: "text" },
      { key: "judulDokumen", label: "Judul Dokumen", type: "text", required: true },
      { key: "kategori", label: "Kategori", type: "select", options: ["PPJB", "AJB", "Akta Notaris", "Sertifikat", "Perizinan", "Kontrak Kontraktor", "Perjanjian Kerjasama", "Berita Acara", "Lainnya"] },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "nomorUnit", label: "Nomor Unit", type: "text", ref: "unit.nomorUnit" },
      { key: "pihakTerkait", label: "Pihak Terkait", type: "text" },
      { key: "tanggal", label: "Tanggal Dokumen", type: "date" },
      { key: "tanggalBerlaku", label: "Berlaku Mulai", type: "date" },
      { key: "tanggalHabis", label: "Berlaku Hingga", type: "date" },
      { key: "catatan", label: "Catatan", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Aktif", "Proses", "Selesai", "Kadaluarsa"] },
    ],
    columns: ["nomorDokumen", "judulDokumen", "kategori", "proyek"], statusField: "status",
    searchFields: ["nomorDokumen", "judulDokumen", "kategori", "proyek"],
  },
  {
    key: "ppjb", label: "PPJB", group: "LEGAL", icon: FileSignature,
    fields: [
      { key: "nomorPPJB", label: "Nomor PPJB", type: "text", required: true },
      { key: "namaPembeli", label: "Nama Pembeli", type: "text", required: true, ref: "pembeli.nama" },
      { key: "nomorUnit", label: "Nomor Unit", type: "text", required: true, ref: "unit.nomorUnit" },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "cluster", label: "Cluster", type: "text", ref: "clusterproyek.namaCluster" },
      { key: "notaris", label: "Notaris / PPAT", type: "text" },
      { key: "tanggalPPJB", label: "Tanggal PPJB", type: "date", required: true },
      { key: "hargaJual", label: "Harga Jual (Rp)", type: "number", currency: true, required: true },
      { key: "uangMuka", label: "Uang Muka (Rp)", type: "number", currency: true },
      { key: "skemaPembayaran", label: "Skema Pembayaran", type: "select", options: ["Cicil Developer", "KPR Subsidi", "KPR Komersil", "KPR Syariah"] },
      { key: "catatan", label: "Catatan", type: "text" },
      { key: "status", label: "Status PPJB", type: "select", options: ["Draft", "Ditandatangani", "Selesai", "Batal"] },
    ],
    columns: ["nomorPPJB", "namaPembeli", "nomorUnit", "tanggalPPJB"], statusField: "status",
    searchFields: ["nomorPPJB", "namaPembeli", "nomorUnit", "proyek"],
  },
  {
    key: "sppt", label: "SPPT PBB", group: "LEGAL", icon: Receipt,
    fields: [
      { key: "nomorSPPT", label: "Nomor SPPT", type: "text", required: true },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "nomorUnit", label: "Nomor Unit", type: "text", ref: "unit.nomorUnit" },
      { key: "tahunPajak", label: "Tahun Pajak", type: "text", required: true },
      { key: "njop", label: "NJOP (Rp)", type: "number", currency: true },
      { key: "nominalPBB", label: "Nominal PBB (Rp)", type: "number", currency: true, required: true },
      { key: "tanggalJatuhTempo", label: "Jatuh Tempo", type: "date" },
      { key: "tanggalBayar", label: "Tanggal Bayar", type: "date" },
      { key: "catatan", label: "Catatan", type: "text" },
      { key: "statusBayar", label: "Status Bayar", type: "select", options: ["Belum Bayar", "Sudah Bayar", "Terlambat"] },
    ],
    columns: ["nomorSPPT", "proyek", "nomorUnit", "tahunPajak", "nominalPBB"], statusField: "statusBayar",
    searchFields: ["nomorSPPT", "proyek", "nomorUnit", "tahunPajak"],
  },
  {
    key: "sengketa", label: "Sengketa Legal", group: "LEGAL", icon: AlertTriangle,
    fields: [
      { key: "judulSengketa", label: "Judul / Deskripsi Singkat", type: "text", required: true },
      { key: "jenisSengketa", label: "Jenis Sengketa", type: "select", options: ["Sengketa Lahan", "Tumpang Tindih Sertifikat", "Wanprestasi Pembeli", "Gugatan Pihak Ketiga", "Permasalahan Perizinan", "Permasalahan AJB/PPJB", "Lainnya"] },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "nomorUnit", label: "Nomor Unit", type: "text", ref: "unit.nomorUnit" },
      { key: "pihakLawan", label: "Pihak Lawan / Penggugat", type: "text" },
      { key: "penanggungJawab", label: "PIC Internal", type: "text" },
      { key: "tanggalMulai", label: "Tanggal Mulai Sengketa", type: "date", required: true },
      { key: "tanggalSelesai", label: "Tanggal Selesai", type: "date" },
      { key: "upayaPenyelesaian", label: "Upaya Penyelesaian", type: "select", options: ["Identifikasi", "Negosiasi", "Mediasi", "Arbitrase", "Litigasi (Pengadilan)"] },
      { key: "catatan", label: "Kronologi / Catatan", type: "text" },
      { key: "statusSengketa", label: "Status", type: "select", options: ["Aktif", "Dalam Proses", "Selesai", "Ditangguhkan"] },
    ],
    columns: ["judulSengketa", "jenisSengketa", "proyek", "upayaPenyelesaian"], statusField: "statusSengketa",
    searchFields: ["judulSengketa", "jenisSengketa", "proyek", "nomorUnit", "pihakLawan"],
  },
  {
    key: "berkaskpr", label: "Berkas KPR", group: "BANK", icon: FileText,
    fields: [
      { key: "namaPembeli", label: "Nama Pembeli", type: "text", required: true, ref: "pembeli.nama" },
      { key: "unit", label: "Nomor Unit", type: "text", required: true, ref: "unit.nomorUnit" },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "jenisKPR", label: "Jenis KPR", type: "select", options: ["KPR Subsidi", "KPR Komersil", "KPR Syariah"] },
      { key: "bank", label: "Bank", type: "text", required: true, ref: ["berkaskpr.bank", "prosesbank.bank", "pencairankpr.bank"] },
      { key: "nomorBerkas", label: "Nomor Berkas", type: "text" },
      { key: "plafondKPR", label: "Plafond KPR (Rp)", type: "number", currency: true },
      { key: "uangMuka", label: "Uang Muka (Rp)", type: "number", currency: true },
      { key: "tenorTahun", label: "Tenor (tahun)", type: "number" },
      { key: "namaPIC", label: "Nama Analis / PIC Bank", type: "text" },
      { key: "tanggalAjukan", label: "Tanggal Ajukan", type: "date", required: true },
      { key: "tanggalPersetujuan", label: "Tanggal Persetujuan", type: "date" },
      { key: "catatan", label: "Catatan", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Proses", "Menunggu Dokumen Tambahan", "Disetujui", "Ditolak"] },
    ],
    columns: ["namaPembeli", "unit", "bank", "jenisKPR"], statusField: "status",
    searchFields: ["namaPembeli", "unit", "bank", "jenisKPR"],
  },
  {
    key: "prosesbank", label: "Proses Bank/Notaris", group: "BANK", icon: Landmark,
    fields: [
      { key: "namaPembeli", label: "Nama Pembeli", type: "text", required: true, ref: "pembeli.nama" },
      { key: "unit", label: "Nomor Unit", type: "text", ref: "unit.nomorUnit" },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "bank", label: "Bank", type: "text", ref: ["berkaskpr.bank", "prosesbank.bank", "pencairankpr.bank"] },
      { key: "tahap", label: "Tahap Saat Ini", type: "select", options: ["Pengajuan Berkas", "Verifikasi Dokumen", "Appraisal", "Komite Kredit", "Persetujuan SP3K", "Akad Kredit", "Pencairan"] },
      { key: "tanggal", label: "Tanggal Tahap", type: "date", required: true },
      { key: "estimasiSelesai", label: "Estimasi Selesai", type: "date" },
      { key: "catatan", label: "Catatan / Kendala", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Berjalan", "Selesai", "Ditolak", "Ditangguhkan"] },
    ],
    columns: ["namaPembeli", "unit", "bank", "tahap"], statusField: "status",
    searchFields: ["namaPembeli", "unit", "bank"],
  },
  {
    key: "appraisal", label: "Appraisal", group: "BANK", icon: Eye,
    fields: [
      { key: "namaPembeli", label: "Nama Pembeli", type: "text", required: true, ref: "pembeli.nama" },
      { key: "nomorUnit", label: "Nomor Unit", type: "text", required: true, ref: "unit.nomorUnit" },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "bank", label: "Bank", type: "text", ref: ["berkaskpr.bank", "prosesbank.bank", "pencairankpr.bank"] },
      { key: "penilai", label: "Perusahaan Penilai / Appraiser", type: "text" },
      { key: "tanggalAppraisal", label: "Tanggal Appraisal", type: "date", required: true },
      { key: "tanggalHasil", label: "Tanggal Keluar Hasil", type: "date" },
      { key: "nilaiPengajuan", label: "Nilai Pengajuan (Rp)", type: "number", currency: true },
      { key: "nilaiAppraisal", label: "Nilai Appraisal (Rp)", type: "number", currency: true },
      { key: "catatan", label: "Catatan / Hasil", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Terjadwal", "Selesai", "Bermasalah"] },
    ],
    columns: ["namaPembeli", "nomorUnit", "bank", "tanggalAppraisal"], statusField: "status",
    searchFields: ["namaPembeli", "nomorUnit", "bank", "penilai"],
  },
  {
    key: "pencairankpr", label: "Pencairan KPR", group: "BANK", icon: Download,
    fields: [
      { key: "namaPembeli", label: "Nama Pembeli", type: "text", required: true, ref: "pembeli.nama" },
      { key: "nomorUnit", label: "Nomor Unit", type: "text", required: true, ref: "unit.nomorUnit" },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "bank", label: "Bank", type: "text", required: true, ref: ["berkaskpr.bank", "prosesbank.bank", "pencairankpr.bank"] },
      { key: "jenisKPR", label: "Jenis KPR", type: "select", options: ["KPR Subsidi", "KPR Komersil", "KPR Syariah"] },
      { key: "nomorSP3K", label: "Nomor SP3K", type: "text" },
      { key: "tanggalPencairan", label: "Tanggal Pencairan", type: "date", required: true },
      { key: "jumlahCair", label: "Jumlah Cair (Rp)", type: "number", currency: true, required: true },
      { key: "nomorRekeningDeveloper", label: "No. Rekening Developer Penerima", type: "text" },
      { key: "catatan", label: "Catatan", type: "text" },
      { key: "status", label: "Status Pencairan", type: "select", options: ["Menunggu", "Cair Sebagian", "Cair Penuh"] },
    ],
    columns: ["namaPembeli", "nomorUnit", "bank", "jumlahCair"], statusField: "status",
    searchFields: ["namaPembeli", "nomorUnit", "bank", "nomorSP3K"],
  },
  {
    key: "akadajb", label: "Akad & AJB", group: "NOTARIS", icon: FileSignature,
    fields: [
      { key: "namaPembeli", label: "Nama Pembeli", type: "text", required: true, ref: "pembeli.nama" },
      { key: "unit", label: "Nomor Unit", type: "text", ref: "unit.nomorUnit" },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "bank", label: "Bank KPR", type: "text", ref: ["berkaskpr.bank", "prosesbank.bank", "pencairankpr.bank"] },
      { key: "jenisAkad", label: "Jenis Akad", type: "select", options: ["KPR Subsidi", "KPR Komersil", "KPR Syariah", "Tunai"] },
      { key: "plafondKPR", label: "Plafond KPR (Rp)", type: "number", currency: true },
      { key: "notaris", label: "Notaris / PPAT", type: "text", ref: "akadajb.notaris" },
      { key: "tanggalAkad", label: "Tanggal Akad", type: "date", required: true },
      { key: "jamAkad", label: "Jam (mis. 10:00)", type: "text" },
      { key: "catatan", label: "Catatan", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Terjadwal", "Selesai", "Ditunda"] },
    ],
    columns: ["namaPembeli", "unit", "bank", "tanggalAkad"], statusField: "status",
    searchFields: ["namaPembeli", "unit", "notaris", "bank"],
  },
  {
    key: "baliknama", label: "Balik Nama", group: "NOTARIS", icon: RefreshCw,
    fields: [
      { key: "namaPembeli", label: "Nama Pembeli", type: "text", required: true, ref: "pembeli.nama" },
      { key: "unit", label: "Nomor Unit", type: "text", ref: "unit.nomorUnit" },
      { key: "sertifikat", label: "Nomor Sertifikat", type: "text", ref: "sertifikat.nomorSertifikat" },
      { key: "bank", label: "Bank KPR", type: "text", ref: ["berkaskpr.bank", "prosesbank.bank", "pencairankpr.bank"] },
      { key: "notaris", label: "Notaris / PPAT", type: "text", ref: "akadajb.notaris" },
      { key: "tanggalProses", label: "Tanggal Mulai Proses", type: "date", required: true },
      { key: "tanggalSelesai", label: "Tanggal Selesai", type: "date" },
      { key: "catatan", label: "Catatan", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Proses", "Selesai"] },
    ],
    columns: ["namaPembeli", "unit", "sertifikat", "bank"], statusField: "status",
    searchFields: ["namaPembeli", "unit", "sertifikat", "bank"],
  },
  {
    key: "royaht", label: "Roya & HT", group: "NOTARIS", icon: FileLock2,
    fields: [
      { key: "namaDebitur", label: "Nama Debitur", type: "text", required: true, ref: "pembeli.nama" },
      { key: "unit", label: "Nomor Unit", type: "text", ref: "unit.nomorUnit" },
      { key: "bank", label: "Bank", type: "text", required: true, ref: ["berkaskpr.bank", "prosesbank.bank", "pencairankpr.bank"] },
      { key: "nomorSertifikat", label: "Nomor Sertifikat", type: "text", ref: "sertifikat.nomorSertifikat" },
      { key: "jenisAksi", label: "Jenis", type: "select", options: ["Hak Tanggungan", "Roya"] },
      { key: "tanggal", label: "Tanggal Proses", type: "date", required: true },
      { key: "tanggalSelesai", label: "Tanggal Selesai", type: "date" },
      { key: "catatan", label: "Catatan", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Proses", "Selesai"] },
    ],
    columns: ["namaDebitur", "unit", "bank", "jenisAksi"], statusField: "status",
    searchFields: ["namaDebitur", "unit", "bank"],
  },
  {
    key: "pph", label: "PPh", group: "PAJAK", icon: Receipt,
    fields: [
      { key: "periode", label: "Periode", type: "text", required: true },
      { key: "tanggalPengajuan", label: "Tanggal Pengajuan", type: "date", required: true },
      { key: "proyek", label: "Proyek", type: "text", required: true, ref: "proyek.namaProyek" },
      { key: "unit", label: "Unit", type: "text", ref: "unit.nomorUnit" },
      { key: "nilaiTransaksi", label: "Nilai Transaksi", type: "number", currency: true, required: true },
      { key: "tarifPph", label: "Tarif PPh (%)", type: "number", defaultValue: "2.5" },
      { key: "nilaiPph", label: "Nominal PPh (Rp)", type: "number", currency: true, readOnly: true },
      { key: "statusPembayaran", label: "Status Pembayaran", type: "select", options: ["Belum Bayar", "Sudah Bayar"] },
      { key: "tanggalSetor", label: "Tanggal Setor", type: "date" },
      { key: "catatan", label: "Catatan", type: "text" },
    ],
    columns: ["periode", "proyek", "unit", "nilaiPph"], statusField: "statusPembayaran",
    searchFields: ["periode", "proyek", "unit", "statusPembayaran"],
  },
  {
    key: "bphtb", label: "BPHTB", group: "PAJAK", icon: Receipt,
    fields: [
      { key: "periode", label: "Periode", type: "text", required: true },
      { key: "tanggalPengajuan", label: "Tanggal Pengajuan", type: "date", required: true },
      { key: "proyek", label: "Proyek", type: "text", required: true, ref: "proyek.namaProyek" },
      { key: "unit", label: "Unit", type: "text", ref: "unit.nomorUnit" },
      { key: "nilaiTransaksi", label: "NPOP / Nilai Transaksi", type: "number", currency: true, required: true },
      { key: "npoptkp", label: "NPOPTKP", type: "number", currency: true, defaultValue: "80000000" },
      { key: "tarifBphtb", label: "Tarif BPHTB (%)", type: "number", defaultValue: "5" },
      { key: "nilaiBphtb", label: "Nominal BPHTB (Rp)", type: "number", currency: true, readOnly: true },
      { key: "statusPembayaran", label: "Status Pembayaran", type: "select", options: ["Belum Bayar", "Sudah Bayar"] },
      { key: "tanggalSetor", label: "Tanggal Setor", type: "date" },
      { key: "catatan", label: "Catatan", type: "text" },
    ],
    columns: ["periode", "proyek", "unit", "nilaiBphtb"], statusField: "statusPembayaran",
    searchFields: ["periode", "proyek", "unit", "statusPembayaran"],
  },
  {
    key: "pembayaran", label: "Daftar Pembayaran PPh & BPHTB", group: "PAJAK", icon: FileBarChart2, virtual: true,
    fields: [
      { key: "periode", label: "Periode", type: "text" },
      { key: "jenisPajak", label: "Jenis Pajak", type: "text" },
      { key: "proyek", label: "Proyek", type: "text" },
      { key: "unit", label: "Unit", type: "text" },
      { key: "nilaiTransaksi", label: "Nilai Transaksi", type: "number", currency: true },
      { key: "nominalPajak", label: "Nominal Pajak", type: "number", currency: true },
      { key: "statusPembayaran", label: "Status Pembayaran", type: "select", options: ["Belum Bayar", "Sudah Bayar"] },
      { key: "tanggalSetor", label: "Tanggal Setor", type: "date" },
    ],
    columns: ["periode", "jenisPajak", "proyek", "unit", "nominalPajak"], statusField: "statusPembayaran",
    searchFields: ["periode", "jenisPajak", "proyek", "unit", "statusPembayaran"],
    filterFields: ["proyek", "unit", "periode"],
    readOnly: true,
  },
  {
    key: "marketing", label: "Tim Marketing", group: "MARKETING", icon: Megaphone,
    fields: [
      { key: "kodeMarketing", label: "Kode Marketing", type: "text" },
      { key: "namaMarketing", label: "Nama Marketing", type: "text", required: true },
      { key: "tipe", label: "Tipe", type: "select", options: ["In-House", "Agen Properti", "Freelance", "Referral"] },
      { key: "agensi", label: "Agensi / Kantor", type: "text" },
      { key: "telepon", label: "Telepon / WhatsApp", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "proyek", label: "Proyek Penugasan", type: "text", ref: "proyek.namaProyek" },
      { key: "targetUnitBulanan", label: "Target Unit / Bulan", type: "number" },
      { key: "persenKomisi", label: "Persen Komisi (%)", type: "number" },
      { key: "tanggalBergabung", label: "Tanggal Bergabung", type: "date" },
      { key: "status", label: "Status", type: "select", options: ["Aktif", "Nonaktif"] },
    ],
    columns: ["kodeMarketing", "namaMarketing", "tipe", "proyek", "targetUnitBulanan"], statusField: "status",
    searchFields: ["kodeMarketing", "namaMarketing", "tipe", "agensi", "proyek", "telepon"],
    filterFields: ["tipe", "proyek", "status"],
  },
  {
    key: "prospek", label: "Database Konsumen (Prospek)", group: "MARKETING", icon: UserPlus,
    fields: [
      { key: "tanggalMasuk", label: "Tanggal Masuk", type: "date", required: true },
      { key: "namaProspek", label: "Nama Prospek", type: "text", required: true },
      { key: "telepon", label: "Telepon / WhatsApp", type: "text", required: true },
      { key: "email", label: "Email", type: "text" },
      { key: "alamat", label: "Alamat", type: "text" },
      { key: "pekerjaan", label: "Pekerjaan", type: "text" },
      { key: "sumberLead", label: "Sumber Lead", type: "select", options: ["Iklan Facebook/Instagram", "Google/Website", "Pameran", "Spanduk/Baliho", "Referensi", "Walk-in Kantor", "WhatsApp Broadcast", "Kanvasing", "Lainnya"] },
      { key: "proyek", label: "Proyek Diminati", type: "text", ref: "proyek.namaProyek" },
      { key: "cluster", label: "Cluster Diminati", type: "text", ref: "clusterproyek.namaCluster" },
      { key: "tipeMinat", label: "Tipe Unit Diminati", type: "text", ref: "pricelist.tipeUnit" },
      { key: "budget", label: "Estimasi Budget (Rp)", type: "number", currency: true },
      { key: "skemaMinat", label: "Skema Pembayaran Diminati", type: "select", options: ["Cicil Developer", "KPR Subsidi", "KPR Komersil", "KPR Syariah", "Tunai / Cash"] },
      { key: "marketing", label: "Marketing Penanggung Jawab", type: "text", ref: "marketing.namaMarketing" },
      { key: "tanggalFollowUpBerikut", label: "Rencana Follow Up Berikutnya", type: "date" },
      { key: "catatan", label: "Catatan", type: "text" },
      { key: "status", label: "Status Prospek", type: "select", options: ["Baru", "Follow Up", "Hot Prospect", "Booking", "Closing", "Batal"] },
    ],
    columns: ["tanggalMasuk", "namaProspek", "telepon", "proyek", "marketing"], statusField: "status",
    searchFields: ["namaProspek", "telepon", "email", "proyek", "cluster", "marketing", "sumberLead"],
    filterFields: ["proyek", "marketing", "sumberLead", "status"],
  },
  {
    key: "followup", label: "Jejak Follow Up", group: "MARKETING", icon: PhoneCall,
    fields: [
      { key: "tanggal", label: "Tanggal Follow Up", type: "date", required: true },
      { key: "namaProspek", label: "Nama Prospek", type: "text", required: true, ref: "prospek.namaProspek" },
      { key: "telepon", label: "Telepon / WhatsApp", type: "text" },
      { key: "marketing", label: "Marketing", type: "text", ref: "marketing.namaMarketing" },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "media", label: "Media Kontak", type: "select", options: ["Telepon", "WhatsApp", "Email", "Kunjungan Kantor", "Survey Lokasi", "Meeting"] },
      { key: "tujuan", label: "Tujuan Follow Up", type: "text" },
      { key: "hasil", label: "Hasil", type: "select", options: ["Tertarik", "Masih Ragu", "Butuh Waktu", "Janji Survey", "Deal / Booking", "Tidak Tertarik", "Tidak Terhubung"] },
      { key: "catatanHasil", label: "Catatan Hasil", type: "text" },
      { key: "rencanaBerikut", label: "Rencana Tindak Lanjut", type: "text" },
      { key: "tanggalBerikut", label: "Tanggal Tindak Lanjut", type: "date" },
      { key: "status", label: "Status", type: "select", options: ["Terjadwal", "Selesai", "Batal"] },
    ],
    columns: ["tanggal", "namaProspek", "marketing", "media", "hasil"], statusField: "status",
    searchFields: ["namaProspek", "marketing", "proyek", "media", "hasil", "catatanHasil"],
    filterFields: ["marketing", "media", "hasil", "status"],
  },
  {
    key: "targetmarketing", label: "Target & Realisasi Penjualan", group: "MARKETING", icon: Target,
    fields: [
      { key: "periode", label: "Periode (mis. Agustus 2026)", type: "text", required: true },
      { key: "marketing", label: "Marketing", type: "text", required: true, ref: "marketing.namaMarketing" },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "targetUnit", label: "Target Unit", type: "number" },
      { key: "realisasiUnit", label: "Realisasi Unit", type: "number" },
      { key: "targetNilai", label: "Target Nilai (Rp)", type: "number", currency: true },
      { key: "realisasiNilai", label: "Realisasi Nilai (Rp)", type: "number", currency: true },
      { key: "pencapaianPersen", label: "Pencapaian (%)", type: "number", readOnly: true },
      { key: "catatan", label: "Catatan", type: "text" },
      { key: "status", label: "Status Pencapaian", type: "select", options: ["Belum Tercapai", "Tercapai", "Melebihi Target"] },
    ],
    columns: ["periode", "marketing", "targetUnit", "realisasiUnit", "pencapaianPersen"], statusField: "status",
    searchFields: ["periode", "marketing", "proyek"],
    filterFields: ["periode", "marketing", "proyek", "status"],
  },
  {
    key: "komisi", label: "Komisi Marketing", group: "MARKETING", icon: Percent,
    fields: [
      { key: "tanggal", label: "Tanggal Pengajuan", type: "date", required: true },
      { key: "marketing", label: "Marketing", type: "text", required: true, ref: "marketing.namaMarketing" },
      { key: "namaPembeli", label: "Nama Pembeli", type: "text", ref: "pembeli.nama" },
      { key: "nomorUnit", label: "Nomor Unit", type: "text", ref: "unit.nomorUnit" },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "nilaiTransaksi", label: "Nilai Transaksi (Rp)", type: "number", currency: true, required: true },
      { key: "persenKomisi", label: "Persen Komisi (%)", type: "number", required: true },
      { key: "nominalKomisi", label: "Nominal Komisi (Rp)", type: "number", currency: true, readOnly: true },
      { key: "potonganPajak", label: "Potongan Pajak PPh 21 (Rp)", type: "number", currency: true },
      { key: "komisiDiterima", label: "Komisi Diterima (Rp)", type: "number", currency: true, readOnly: true },
      { key: "tahapPembayaran", label: "Tahap Pembayaran", type: "select", options: ["Booking / DP", "Akad Kredit", "Pelunasan", "Full"] },
      { key: "tanggalBayar", label: "Tanggal Dibayar", type: "date" },
      { key: "catatan", label: "Catatan", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Diajukan", "Disetujui", "Dibayar", "Ditolak"] },
    ],
    columns: ["tanggal", "marketing", "namaPembeli", "nomorUnit", "nominalKomisi"], statusField: "status",
    searchFields: ["marketing", "namaPembeli", "nomorUnit", "proyek"],
    filterFields: ["marketing", "proyek", "tahapPembayaran", "status"],
  },
  {
    key: "pembeli", label: "Master Pihak", group: "PENJUALAN", icon: Users,
    fields: [
      { key: "nama", label: "Nama", type: "text", required: true },
      { key: "alamat", label: "Alamat Lengkap", type: "text" },
      { key: "unit", label: "Unit", type: "text", ref: "unit.nomorUnit" },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "telepon", label: "Telepon", type: "text" },
      { key: "tanggalBeli", label: "Tanggal Beli", type: "date" },
      { key: "statusCicilan", label: "Status Cicilan", type: "select", options: ["Lunas", "Berjalan", "Menunggak"] },
    ],
    columns: ["nama", "unit", "proyek", "telepon"], statusField: "statusCicilan",
    searchFields: ["nama", "unit", "proyek"],
  },
  {
    key: "tagihan", label: "Monitoring Tagihan", group: "PENJUALAN", icon: TrendingUp,
    fields: [
      { key: "pembeli", label: "Pembeli", type: "text", required: true, ref: "pembeli.nama" },
      { key: "unit", label: "Unit", type: "text", ref: "unit.nomorUnit" },
      { key: "jenisTagihan", label: "Jenis Tagihan", type: "select", options: ["Cicilan", "DP", "Booking Fee", "BPHTB", "Lainnya"] },
      { key: "jumlah", label: "Jumlah (Rp)", type: "number" },
      { key: "jatuhTempo", label: "Jatuh Tempo", type: "date" },
      { key: "status", label: "Status", type: "select", options: ["Lunas", "Belum Lunas", "Terlambat"] },
    ],
    columns: ["pembeli", "unit", "jenisTagihan", "jatuhTempo"], statusField: "status",
    searchFields: ["pembeli", "unit"],
  },
  {
    key: "transaksi", label: "Booking", group: "PENJUALAN", icon: Receipt,
    fields: [
      { key: "namaPembeli", label: "Nama Pembeli", type: "text", required: true, ref: "pembeli.nama" },
      { key: "proyek", label: "Proyek", type: "text", required: true, ref: "proyek.namaProyek" },
      { key: "cluster", label: "Cluster", type: "text", ref: "clusterproyek.namaCluster" },
      { key: "nomorUnit", label: "Nomor Unit", type: "text", required: true, ref: "unit.nomorUnit" },
      { key: "hargaJual", label: "Harga Jual (Rp)", type: "number", currency: true, required: true },
      { key: "diskon", label: "Diskon (Rp)", type: "number", currency: true },
      { key: "skemaPembayaran", label: "Skema Pembayaran", type: "select", required: true, options: ["Cicil Developer", "KPR Subsidi", "KPR Komersil", "KPR Syariah"] },
      { key: "tanggalBooking", label: "Tanggal Booking", type: "date" },
      { key: "tanggalPPJB", label: "Tanggal PPJB", type: "date" },
      { key: "status", label: "Status Transaksi", type: "select", options: ["Booking", "PPJB", "Akad Kredit", "Lunas", "Batal"] },
    ],
    columns: ["namaPembeli", "nomorUnit", "skemaPembayaran", "hargaJual"], statusField: "status",
    searchFields: ["namaPembeli", "proyek", "nomorUnit", "skemaPembayaran"],
  },
  {
    key: "jualicicilan", label: "Cicil via Developer", group: "PENJUALAN", icon: Calendar,
    fields: [
      { key: "namaPembeli", label: "Nama Pembeli", type: "text", required: true, ref: "pembeli.nama" },
      { key: "nomorUnit", label: "Nomor Unit", type: "text", required: true, ref: "unit.nomorUnit" },
      { key: "hargaNet", label: "Harga Net (Rp)", type: "number", currency: true, required: true },
      { key: "uangMuka", label: "Uang Muka / DP (Rp)", type: "number", currency: true, required: true },
      { key: "tenorBulan", label: "Tenor (bulan)", type: "number", required: true },
      { key: "besarCicilanBulanan", label: "Cicilan / Bulan (Rp)", type: "number", currency: true },
      { key: "tanggalMulaiCicil", label: "Tanggal Mulai Cicil", type: "date" },
      { key: "tanggalJatuhTempo", label: "Tanggal Jatuh Tempo (tgl ke-)", type: "number" },
      { key: "catatan", label: "Catatan", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Berjalan", "Lunas", "Macet"] },
    ],
    columns: ["namaPembeli", "nomorUnit", "tenorBulan", "besarCicilanBulanan"], statusField: "status",
    searchFields: ["namaPembeli", "nomorUnit"],
  },
  {
    key: "pengajuankpr", label: "Pengajuan KPR", group: "PENJUALAN", icon: Landmark,
    fields: [
      { key: "namaPembeli", label: "Nama Pembeli", type: "text", required: true, ref: "pembeli.nama" },
      { key: "nomorUnit", label: "Nomor Unit", type: "text", required: true, ref: "unit.nomorUnit" },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "jenisKPR", label: "Jenis KPR", type: "select", required: true, options: ["KPR Subsidi", "KPR Komersil", "KPR Syariah"] },
      { key: "bank", label: "Bank", type: "text", required: true },
      { key: "jenisSubsidi", label: "Jenis Subsidi (jika Subsidi)", type: "select", options: ["-", "FLPP", "BP2BT", "BSPS", "Tapera"] },
      { key: "jenisAkad", label: "Jenis Akad (jika Syariah)", type: "select", options: ["-", "Murabahah", "Musyarakah Mutanaqisah", "IMBT"] },
      { key: "nilaiRumah", label: "Nilai / Harga Rumah (Rp)", type: "number", currency: true, required: true },
      { key: "uangMuka", label: "Uang Muka / DP (Rp)", type: "number", currency: true },
      { key: "plafondKPR", label: "Plafond KPR (Rp)", type: "number", currency: true },
      { key: "tenorTahun", label: "Tenor (tahun)", type: "number" },
      { key: "bungaMargin", label: "Bunga / Nisbah / Margin (%)", type: "number" },
      { key: "angsuranBulanan", label: "Angsuran / Bulan (Rp)", type: "number", currency: true },
      { key: "nomorSPK", label: "Nomor SPK", type: "text" },
      { key: "tanggalSPK", label: "Tanggal SPK", type: "date" },
      // Field pelengkap Surat Keterangan Pesanan Rumah (auto-fill dari master pembeli/unit/proyek bila tersedia)
      { key: "alamatPembeli", label: "Alamat Pembeli (Surat Pesanan)", type: "text" },
      { key: "teleponPembeli", label: "Telepon Pembeli (Surat Pesanan)", type: "text" },
      { key: "tipeRumah", label: "Tipe Rumah (mis. 36/98)", type: "text" },
      { key: "blokUnit", label: "Blok - No. Unit (mis. E-11)", type: "text" },
      { key: "namaPerumahan", label: "Nama Perumahan", type: "text" },
      { key: "kelurahan", label: "Kelurahan / Desa", type: "text" },
      { key: "kecamatan", label: "Kecamatan", type: "text" },
      { key: "kabupaten", label: "Kabupaten", type: "text" },
      { key: "tanggalPesanan", label: "Tanggal Surat Pesanan", type: "date" },
      { key: "penerimaPesanan", label: "Penerima Pesanan (Direktur/Developer)", type: "text" },
      { key: "catatan", label: "Catatan", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Draft", "Diajukan", "Disetujui", "Ditolak"] },
    ],
    columns: ["namaPembeli", "nomorUnit", "jenisKPR", "bank"], statusField: "status",
    searchFields: ["namaPembeli", "nomorUnit", "jenisKPR", "bank"],
  },
  {
    key: "jadwalcicilan", label: "Skema Pembayaran", group: "PENJUALAN", icon: TrendingUp,
    fields: [
      { key: "namaPembeli", label: "Nama Pembeli", type: "text", required: true, ref: "pembeli.nama" },
      { key: "nomorUnit", label: "Nomor Unit", type: "text", ref: "unit.nomorUnit" },
      { key: "skemaPembayaran", label: "Skema", type: "select", options: ["Cicil Developer", "KPR Subsidi", "KPR Komersil", "KPR Syariah"] },
      { key: "periodeAngsuran", label: "Periode (mis. Agustus 2026)", type: "text", required: true },
      { key: "tanggalJatuhTempo", label: "Jatuh Tempo", type: "date", required: true },
      { key: "nominalAngsuran", label: "Nominal Angsuran (Rp)", type: "number", currency: true, required: true },
      { key: "denda", label: "Denda Keterlambatan (Rp)", type: "number", currency: true },
      { key: "tanggalBayar", label: "Tanggal Bayar Aktual", type: "date" },
      { key: "statusBayar", label: "Status", type: "select", options: ["Belum Bayar", "Sudah Bayar", "Terlambat"] },
    ],
    columns: ["namaPembeli", "nomorUnit", "periodeAngsuran", "nominalAngsuran"], statusField: "statusBayar",
    searchFields: ["namaPembeli", "nomorUnit", "periodeAngsuran", "skemaPembayaran"],
    filterFields: ["skemaPembayaran"],
    defaultFilters: { skemaPembayaran: "Cicil Developer" },
  },
  {
    key: "unitpihak", label: "Unit_Pihak", group: "PENJUALAN", icon: Users,
    fields: [
      { key: "ID_Unit", label: "ID Unit", type: "text", required: true, ref: ["unit.ID_Unit", "unit.id", "unit.nomorUnit"] },
      { key: "nomorUnit", label: "Nomor Unit", type: "text", required: true, ref: "unit.nomorUnit" },
      { key: "ID_Pihak", label: "ID Pihak", type: "text", required: true, ref: ["pembeli.ID_Pihak", "pembeli.id", "pembeli.nama"] },
      { key: "namaPihak", label: "Nama Pihak", type: "text", required: true, ref: "pembeli.nama" },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "peran", label: "Peran Pihak", type: "select", options: ["Prospek", "Booking", "Pembeli", "Pemilik", "Debitur"] },
      { key: "tanggalMulai", label: "Tanggal Mulai Relasi", type: "date" },
      { key: "tanggalSelesai", label: "Tanggal Selesai Relasi", type: "date" },
      { key: "status", label: "Status Relasi", type: "select", options: ["Aktif", "Selesai", "Nonaktif"] },
      { key: "catatan", label: "Catatan", type: "text" },
    ],
    columns: ["ID_Unit", "nomorUnit", "ID_Pihak", "namaPihak", "peran"], statusField: "status",
    searchFields: ["ID_Unit", "nomorUnit", "ID_Pihak", "namaPihak", "proyek", "peran"],
    filterFields: ["proyek", "status"],
  },
  {
    key: "generatesurat", label: "Generate Surat", group: "LEGAL", icon: FileSignature,
    fields: [
      { key: "nomorSurat", label: "Nomor Surat", type: "text", required: true },
      { key: "jenisSurat", label: "Jenis Surat", type: "select", required: true, options: [
        "Draft SPK Rumah Subsidi",
        "Form SPPR Royal Paradise",
        "SPJB RPD",
        "Surat Perjanjian Jual Beli",
        "Surat Tagihan Piutang",
        "Surat Lainnya",
      ] },
      { key: "customTemplateId", label: "Template Upload (opsional)", type: "select", options: [""] },
      { key: "tanggalSurat", label: "Tanggal Surat", type: "date", required: true },
      { key: "ID_Pihak", label: "ID Pihak", type: "text", ref: ["pembeli.ID_Pihak", "pembeli.id", "pembeli.nama"] },
      { key: "namaPihak", label: "Nama Pihak", type: "text", required: true, ref: "pembeli.nama" },
      { key: "ID_Unit", label: "ID Unit", type: "text", ref: ["unit.ID_Unit", "unit.id", "unit.nomorUnit"] },
      { key: "nomorUnit", label: "Nomor Unit", type: "text", ref: "unit.nomorUnit" },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "perihal", label: "Perihal", type: "text", required: true },
      { key: "periodeTagihan", label: "Periode Tagihan", type: "text" },
      { key: "nominalTagihan", label: "Nominal Tagihan (Rp)", type: "number", currency: true },
      { key: "tanggalJatuhTempo", label: "Jatuh Tempo", type: "date" },
      { key: "pemberitahuanKe", label: "Pemberitahuan ke- (I / II / III) — utk Surat Tagihan Piutang", type: "select", options: ["I", "II", "III"] },
      { key: "kotaSurat", label: "Kota Surat (mis. Kolaka)", type: "text" },
      { key: "nomorSPPR", label: "Nomor SPPR (opsional, auto dari Pengajuan KPR)", type: "text" },
      { key: "tanggalSPPR", label: "Tanggal SPPR (opsional)", type: "date" },
      { key: "nomorSPJB", label: "Nomor SPJB / PPJB (opsional, auto dari Booking)", type: "text" },
      { key: "tanggalSPJB", label: "Tanggal SPJB / PPJB (opsional)", type: "date" },
      { key: "blokUnit", label: "Blok - No. Unit (mis. B-12)", type: "text" },
      { key: "isiRingkas", label: "Isi Ringkas", type: "text" },
      { key: "penandatangan", label: "Penandatangan", type: "text" },
      { key: "status", label: "Status Surat", type: "select", options: ["Draft", "Siap Cetak", "Dikirim", "Selesai"] },
    ],
    columns: ["nomorSurat", "jenisSurat", "namaPihak", "nomorUnit", "tanggalSurat"], statusField: "status",
    searchFields: ["nomorSurat", "jenisSurat", "namaPihak", "nomorUnit", "proyek", "perihal", "periodeTagihan"],
    filterFields: ["jenisSurat", "status"],
  },
  {
    // 1. PETTY CASH — Buku Kas Kecil (mengikuti sheet "Petty Cash" xlsx)
    // Kolom: TANGGAL | KODE VOUCHER | URAIAN | DEBET (Keluar) | KREDIT (Masuk) | SALDO
    key: "pettycash", label: "Petty Cash (Kas Kecil)", group: "KEUANGAN", icon: Wallet,
    fields: [
      { key: "tanggal", label: "Tanggal", type: "date", required: true },
      { key: "kodeVoucher", label: "Kode Voucher (KK-xxxx / KD-xxxx)", type: "text", required: true },
      { key: "uraian", label: "Uraian", type: "text", required: true },
      { key: "namaKas", label: "Kas", type: "select", options: ["Petty Cash Utama", "Petty Cash Proyek", "Kas Operasional"] },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "debet", label: "Debet / Keluar (Rp)", type: "number", currency: true },
      { key: "kredit", label: "Kredit / Masuk (Rp)", type: "number", currency: true },
      { key: "saldo", label: "Saldo (Rp)", type: "number", currency: true },
      { key: "verifStaf", label: "Verifikasi Staf", type: "text" },
      { key: "verifPM", label: "Verifikasi Project Manager", type: "text" },
      { key: "verifDir", label: "Verifikasi Direktur", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Draft", "Terverifikasi", "Ditolak"] },
    ],
    columns: ["tanggal", "kodeVoucher", "uraian", "debet", "kredit", "saldo"], statusField: "status",
    searchFields: ["tanggal", "kodeVoucher", "uraian", "namaKas", "proyek"],
    filterFields: ["namaKas", "status", "proyek"],
  },
  {
    // 2. BUKU BANK — mengikuti sheet "Bank 1"
    key: "bukubank", label: "Buku Bank", group: "KEUANGAN", icon: Landmark,
    fields: [
      { key: "tanggal", label: "Tanggal", type: "date", required: true },
      { key: "kodeVoucher", label: "Kode Voucher (BK-xxxx / BD-xxxx)", type: "text", required: true },
      { key: "uraian", label: "Uraian", type: "text", required: true },
      { key: "bank", label: "Nama Bank / Rekening", type: "text", required: true },
      { key: "nomorRekening", label: "Nomor Rekening", type: "text" },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "debet", label: "Debet / Keluar (Rp)", type: "number", currency: true },
      { key: "kredit", label: "Kredit / Masuk (Rp)", type: "number", currency: true },
      { key: "saldo", label: "Saldo (Rp)", type: "number", currency: true },
      { key: "verifStaf", label: "Verifikasi Staf", type: "text" },
      { key: "verifPM", label: "Verifikasi Project Manager", type: "text" },
      { key: "verifDir", label: "Verifikasi Direktur", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Draft", "Terverifikasi", "Ditolak"] },
    ],
    columns: ["tanggal", "kodeVoucher", "uraian", "bank", "debet", "kredit", "saldo"], statusField: "status",
    searchFields: ["tanggal", "kodeVoucher", "uraian", "bank", "nomorRekening", "proyek"],
    filterFields: ["bank", "status", "proyek"],
  },
  {
    // 3. VOUCHER — Voucher Penerimaan/Pengeluaran Kas (untuk cetak)
    key: "voucher", label: "Voucher Kas", group: "KEUANGAN", icon: Receipt,
    fields: [
      { key: "kodeVoucher", label: "Kode Voucher", type: "text", required: true },
      { key: "jenis", label: "Jenis Voucher", type: "select", required: true, options: ["KK - Kas Masuk", "KD - Kas Keluar", "BK - Bank Masuk", "BD - Bank Keluar"] },
      { key: "tanggal", label: "Tanggal", type: "date", required: true },
      { key: "pihak", label: "Diterima Dari / Dibayarkan Ke", type: "text", required: true },
      { key: "uraian", label: "Uraian", type: "text", required: true },
      { key: "jumlah", label: "Jumlah (Rp)", type: "number", currency: true, required: true },
      { key: "metode", label: "Metode", type: "select", options: ["Tunai", "Transfer Bank", "Cek", "Bilyet Giro"] },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "verifStaf", label: "Staf Keuangan", type: "text" },
      { key: "verifPM", label: "Project Manager", type: "text" },
      { key: "verifDir", label: "Direktur", type: "text" },
      { key: "verifDirUtama", label: "Direktur Utama", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Draft", "Disetujui", "Dicetak", "Selesai"] },
    ],
    columns: ["kodeVoucher", "jenis", "tanggal", "pihak", "jumlah"], statusField: "status",
    searchFields: ["kodeVoucher", "jenis", "tanggal", "pihak", "uraian", "proyek"],
    filterFields: ["jenis", "status", "proyek"],
  },
  {
    // 4. KARTU ANGGARAN — Buku Besar per Kelompok Biaya (sheet "Kartu Hutang Piutang" xlsx)
    key: "kartuanggaran", label: "Kartu Anggaran (Buku Besar)", group: "KEUANGAN", icon: BookOpen,
    fields: [
      { key: "kelompokBiaya", label: "Kelompok Biaya", type: "select", required: true, options: [
        "#1. Perolehan Tanah", "#2. Desain & Perizinan", "#3. Pekerjaan Persiapan", "#4. Infrastruktur",
        "#5. Konstruksi Bangunan", "#6. Marketing & Penjualan", "#7. Operasional Kantor", "#8. Gaji & SDM",
        "#9. Pajak & Legal", "#10. Overhead & Lain-lain"
      ]},
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "tanggal", label: "Tanggal", type: "date", required: true },
      { key: "kodeVoucher", label: "Kode Voucher", type: "text", required: true },
      { key: "uraian", label: "Uraian", type: "text", required: true },
      { key: "debet", label: "Debet / Realisasi (Rp)", type: "number", currency: true },
      { key: "kredit", label: "Kredit / Pengembalian (Rp)", type: "number", currency: true },
      { key: "saldo", label: "Saldo Kumulatif (Rp)", type: "number", currency: true },
      { key: "verifStaf", label: "Verifikasi Staf", type: "text" },
      { key: "verifPM", label: "Verifikasi PM", type: "text" },
      { key: "verifDir", label: "Verifikasi Direktur", type: "text" },
    ],
    columns: ["tanggal", "kelompokBiaya", "kodeVoucher", "uraian", "debet", "saldo"], statusField: null,
    searchFields: ["tanggal", "kelompokBiaya", "kodeVoucher", "uraian", "proyek"],
    filterFields: ["kelompokBiaya", "proyek"],
  },
  {
    // 5. LAPORAN PIUTANG — per pembeli (sheet "Kartu Anggaran" xlsx sebenarnya LAPORAN PIUTANG)
    key: "piutang", label: "Laporan Piutang", group: "KEUANGAN", icon: HandCoins,
    fields: [
      { key: "noUrut", label: "No Urut", type: "number" },
      { key: "transaksiBulan", label: "Bulan Transaksi", type: "text" },
      { key: "namaPembeli", label: "Nama Pembeli", type: "text", required: true, ref: "pembeli.nama" },
      { key: "blokUnit", label: "Blok - No Unit", type: "text", required: true, ref: "unit.nomorUnit" },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "hargaResmi", label: "Harga Resmi (Rp)", type: "number", currency: true, required: true },
      { key: "diskon", label: "Diskon (Rp)", type: "number", currency: true },
      { key: "hargaTransaksi", label: "Harga Transaksi (Rp)", type: "number", currency: true, required: true },
      { key: "totalDibayarSebelumnya", label: "Total Dibayar Sebelumnya (Rp)", type: "number", currency: true },
      { key: "dibayarBulanIni", label: "Dibayar Bulan Ini (Rp)", type: "number", currency: true },
      { key: "totalDibayar", label: "Total Dibayar (Rp)", type: "number", currency: true },
      { key: "sisaPiutang", label: "Sisa Piutang (Rp)", type: "number", currency: true },
      { key: "status", label: "Status", type: "select", options: ["Belum Bayar", "Cicilan Berjalan", "Lunas", "Jatuh Tempo", "Batal"] },
      { key: "catatan", label: "Catatan", type: "text" },
    ],
    columns: ["noUrut", "namaPembeli", "blokUnit", "hargaTransaksi", "totalDibayar", "sisaPiutang"], statusField: "status",
    searchFields: ["namaPembeli", "blokUnit", "proyek", "transaksiBulan"],
    filterFields: ["status", "proyek", "transaksiBulan"],
  },
  {
    // 6. LAPORAN HUTANG — per kreditur/kontraktor (sheet "Lap PIUTANG" xlsx sebenarnya LAPORAN HUTANG)
    key: "hutang", label: "Laporan Hutang", group: "KEUANGAN", icon: Scale,
    fields: [
      { key: "noUrut", label: "No Urut", type: "number" },
      { key: "kategoriHutang", label: "Kategori Hutang", type: "select", required: true, options: ["Hutang Kontraktor", "Hutang Supplier Material", "Hutang Sewa Alat", "Hutang Perizinan", "Hutang Notaris", "Hutang Pajak", "Hutang Bank", "Hutang Lain-lain"] },
      { key: "namaKreditur", label: "Nama Kreditur", type: "text", required: true },
      { key: "spkNo", label: "SPK / Kontrak No", type: "text" },
      { key: "itemPekerjaan", label: "Item Pekerjaan / Barang", type: "text", required: true },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "nilaiKontrak", label: "Nilai Kontrak (Rp)", type: "number", currency: true, required: true },
      { key: "totalDibayarSebelumnya", label: "Total Dibayar Sebelumnya (Rp)", type: "number", currency: true },
      { key: "dibayarBulanIni", label: "Dibayar Bulan Ini (Rp)", type: "number", currency: true },
      { key: "totalDibayar", label: "Total Dibayar (Rp)", type: "number", currency: true },
      { key: "sisaHutang", label: "Sisa Hutang (Rp)", type: "number", currency: true },
      { key: "status", label: "Status", type: "select", options: ["Belum Bayar", "Sebagian", "Lunas", "Jatuh Tempo", "Batal"] },
      { key: "catatan", label: "Catatan", type: "text" },
    ],
    columns: ["noUrut", "namaKreditur", "kategoriHutang", "itemPekerjaan", "nilaiKontrak", "sisaHutang"], statusField: "status",
    searchFields: ["namaKreditur", "spkNo", "itemPekerjaan", "proyek"],
    filterFields: ["kategoriHutang", "status", "proyek"],
  },
  {
    // SPK BORONG UPAH — Surat Perintah Kerja untuk Kontraktor/Pemborong (sesuai format xlsx)
    key: "spkborong", label: "SPK Borong Upah", group: "KEUANGAN", icon: FileSignature,
    fields: [
      { key: "nomorSpk", label: "Nomor SPK (No. .../SPK/.../.../YYYY)", type: "text", required: true },
      { key: "tanggalSpk", label: "Tanggal SPK", type: "date", required: true },
      { key: "tempatDibuat", label: "Tempat Dibuat", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Draft", "Ditandatangani", "Berjalan", "Serah Terima", "Selesai", "Batal"] },
      { key: "pihak1Nama", label: "Pihak I - Nama", type: "text", required: true },
      { key: "pihak1Jabatan", label: "Pihak I - Jabatan", type: "text" },
      { key: "pihak1AtasNama", label: "Pihak I - Atas Nama Perusahaan", type: "text" },
      { key: "pihak1Alamat", label: "Pihak I - Alamat", type: "text" },
      { key: "pihak2Nama", label: "Pihak II - Nama Kontraktor/Pemborong", type: "text", required: true },
      { key: "pihak2Jabatan", label: "Pihak II - Jabatan", type: "text" },
      { key: "pihak2Nik", label: "Pihak II - NIK", type: "text" },
      { key: "pihak2HpWa", label: "Pihak II - No HP / WA", type: "text" },
      { key: "pihak2Alamat", label: "Pihak II - Alamat", type: "text" },
      { key: "proyek", label: "Nama Proyek", type: "text", required: true, ref: "proyek.namaProyek" },
      { key: "lokasiProyek", label: "Lokasi Proyek", type: "text" },
      { key: "blokUnit", label: "Blok - No Unit", type: "text", ref: "unit.nomorUnit" },
      { key: "jenisPekerjaan", label: "Jenis Pekerjaan", type: "text", required: true },
      { key: "hargaSatuan", label: "Harga Satuan (mis. Rp 1.562.500/m²)", type: "text" },
      { key: "nilaiBorongan", label: "Nilai Borongan (Rp)", type: "number", currency: true, required: true },
      { key: "ppnPersen", label: "PPN (%)", type: "number" },
      { key: "ppnNilai", label: "PPN (Rp)", type: "number", currency: true },
      { key: "totalNilai", label: "Total Nilai Kontrak (Rp)", type: "number", currency: true },
      { key: "terbilang", label: "Terbilang", type: "text" },
      { key: "waktuPelaksanaanHari", label: "Waktu Pelaksanaan (hari)", type: "number" },
      { key: "tanggalMulai", label: "Tanggal Mulai Pekerjaan", type: "date" },
      { key: "tanggalSelesai", label: "Tanggal Selesai Pekerjaan", type: "date" },
      { key: "masaPemeliharaanHari", label: "Masa Pemeliharaan (hari)", type: "number" },
      { key: "termin1Persen", label: "Termin I (%) - DP saat SPK ditandatangani", type: "number" },
      { key: "termin2Persen", label: "Termin II (%) - progress ≥ 20%", type: "number" },
      { key: "termin3Persen", label: "Termin III (%) - progress ≥ 40%", type: "number" },
      { key: "termin4Persen", label: "Termin IV (%) - progress ≥ 60%", type: "number" },
      { key: "termin5Persen", label: "Termin V (%) - progress ≥ 80%", type: "number" },
      { key: "termin6Persen", label: "Termin VI (%) - pemeliharaan hari 1-90", type: "number" },
      { key: "termin7Persen", label: "Termin VII (%) - pemeliharaan hari 90-180", type: "number" },
      { key: "ketentuanTambahan", label: "Ketentuan Tambahan (opsional)", type: "text" },
      { key: "catatan", label: "Catatan Internal", type: "text" },
    ],
    columns: ["nomorSpk", "tanggalSpk", "pihak2Nama", "jenisPekerjaan", "totalNilai"], statusField: "status",
    searchFields: ["nomorSpk", "pihak2Nama", "pihak2Nik", "jenisPekerjaan", "proyek", "blokUnit"],
    filterFields: ["status", "proyek"],
  },
  {
    // 7. BUDGET CONTROL — Cost & Budget Controlling (sheet "Lap HUTANG" xlsx sebenarnya BUDGET CONTROL)
    key: "budgetcontrol", label: "Cost & Budget Control", group: "KEUANGAN", icon: FileBarChart2,
    fields: [
      { key: "kodeItem", label: "Kode Item (A.1, A.2, B.1, ...)", type: "text", required: true },
      { key: "kelompokBiaya", label: "Kelompok Biaya (A/B/C/...)", type: "select", options: [
        "A - Perolehan Lahan", "B - Desain & Perizinan", "C - Pekerjaan Persiapan", "D - Infrastruktur",
        "E - Konstruksi Bangunan", "F - Marketing & Penjualan", "G - Operasional", "H - Gaji & SDM",
        "I - Pajak & Legal", "J - Overhead & Lain-lain"
      ]},
      { key: "itemBiaya", label: "Item Biaya", type: "text", required: true },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "rencanaBudget", label: "Rencana Budget (Rp)", type: "number", currency: true, required: true },
      { key: "realisasi", label: "Realisasi (Rp)", type: "number", currency: true },
      { key: "sisaBudget", label: "Sisa Budget (Rp)", type: "number", currency: true },
      { key: "prosSisaBudget", label: "% Sisa Budget", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["Belum Mulai", "On Track", "Hampir Habis", "Over Budget", "Selesai"] },
      { key: "catatan", label: "Catatan", type: "text" },
    ],
    columns: ["kodeItem", "itemBiaya", "rencanaBudget", "realisasi", "sisaBudget", "prosSisaBudget"], statusField: "status",
    searchFields: ["kodeItem", "itemBiaya", "kelompokBiaya", "proyek"],
    filterFields: ["kelompokBiaya", "status", "proyek"],
  },
  {
    // 8. KARTU PIUTANG — Mutasi cicilan per pembeli (sheet "Budget Control" xlsx sebenarnya KARTU PIUTANG)
    key: "kartupiutang", label: "Kartu Piutang (per Pembeli)", group: "KEUANGAN", icon: BookOpen,
    fields: [
      { key: "namaPembeli", label: "Nama Pembeli", type: "text", required: true, ref: "pembeli.nama" },
      { key: "blokUnit", label: "Blok - No Unit", type: "text", ref: "unit.nomorUnit" },
      { key: "typeLuasTanah", label: "Type / Luas Tanah", type: "text" },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "hargaResmi", label: "Harga Resmi Incl. PPN (Rp)", type: "number", currency: true },
      { key: "diskon", label: "Diskon (Rp)", type: "number", currency: true },
      { key: "hargaSetelahDiskon", label: "Harga Setelah Diskon (Rp)", type: "number", currency: true },
      { key: "tanggal", label: "Tanggal Transaksi", type: "date", required: true },
      { key: "uraian", label: "Uraian (Uang Tanda Jadi / Angsuran UM ke-N / dst)", type: "text", required: true },
      { key: "debet", label: "Debet / Pembayaran (Rp)", type: "number", currency: true },
      { key: "kredit", label: "Kredit / Retur (Rp)", type: "number", currency: true },
      { key: "saldo", label: "Saldo Piutang (Rp)", type: "number", currency: true },
      { key: "verifStaf", label: "Verifikasi Staf", type: "text" },
      { key: "verifPM", label: "Verifikasi PM", type: "text" },
      { key: "verifDir", label: "Verifikasi Direktur", type: "text" },
    ],
    columns: ["tanggal", "namaPembeli", "blokUnit", "uraian", "debet", "saldo"], statusField: null,
    searchFields: ["namaPembeli", "blokUnit", "uraian", "proyek"],
    filterFields: ["namaPembeli", "proyek"],
  },
  {
    // 9. KARTU BARANG MASUK — Monitoring stok & pemakaian material proyek
    key: "kartubarangmasuk", label: "Kartu Barang Masuk (Material)", group: "KEUANGAN", icon: Package,
    fields: [
      { key: "tanggal", label: "Tanggal", type: "date", required: true },
      { key: "noBukti", label: "No. Bukti / Bon", type: "text", required: true },
      { key: "jenisTransaksi", label: "Jenis Transaksi", type: "select", options: ["Masuk", "Keluar / Pemakaian", "Retur Masuk", "Retur Keluar", "Adjustment"], required: true },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek", required: true },
      { key: "blokUnit", label: "Blok / Unit / Lokasi Pakai", type: "text", ref: "unit.nomorUnit" },
      { key: "namaBarang", label: "Nama Barang / Material", type: "text", required: true },
      { key: "kategoriBarang", label: "Kategori", type: "select", options: [
        "Semen & Perekat", "Besi & Baja", "Batu & Pasir", "Bata & Batako", "Kayu & Papan",
        "Keramik & Granit", "Cat & Finishing", "Pipa & Sanitair", "Kelistrikan", "Atap & Rangka",
        "Kusen & Pintu", "Alat & Consumable", "Lain-lain"
      ]},
      { key: "satuan", label: "Satuan (sak/kg/m³/btg)", type: "text", required: true },
      { key: "jumlahMasuk", label: "Jumlah Masuk", type: "number" },
      { key: "jumlahKeluar", label: "Jumlah Keluar / Pakai", type: "number" },
      { key: "saldoStok", label: "Saldo Stok", type: "number" },
      { key: "hargaSatuan", label: "Harga Satuan (Rp)", type: "number", currency: true },
      { key: "totalNilai", label: "Total Nilai (Rp)", type: "number", currency: true },
      { key: "supplier", label: "Supplier / Toko", type: "text" },
      { key: "gudang", label: "Gudang / Lokasi Simpan", type: "text" },
      { key: "penerima", label: "Penerima / Petugas Gudang", type: "text" },
      { key: "pemakaiUntuk", label: "Digunakan Untuk (Pekerjaan)", type: "text" },
      { key: "verifPM", label: "Verifikasi PM / Pengawas", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Draft", "Diterima", "Terpakai", "Kembali ke Gudang", "Selesai"] },
      { key: "catatan", label: "Catatan", type: "text" },
    ],
    columns: ["tanggal", "noBukti", "jenisTransaksi", "namaBarang", "satuan", "jumlahMasuk", "jumlahKeluar", "saldoStok"], statusField: "status",
    searchFields: ["noBukti", "namaBarang", "supplier", "proyek", "blokUnit", "pemakaiUntuk"],
    filterFields: ["jenisTransaksi", "kategoriBarang", "proyek", "status", "gudang"],
  },
  {
    key: "kuitansi", label: "Kuitansi Penerimaan", group: "KEUANGAN", icon: Receipt,
    fields: [
      { key: "nomorKuitansi", label: "Nomor Kuitansi", type: "text", required: true },
      { key: "tanggal", label: "Tanggal Kuitansi", type: "date", required: true },
      { key: "namaPembeli", label: "Diterima Dari (Nama Pembeli)", type: "text", required: true, ref: "pembeli.nama" },
      { key: "nomorUnit", label: "Nomor Unit", type: "text", ref: "unit.nomorUnit" },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "jenisPenerimaan", label: "Untuk Pembayaran", type: "select", required: true, options: ["Booking Fee", "Uang Muka / DP", "Angsuran DP", "Cicilan Bulanan", "Pelunasan", "Biaya KPR", "Biaya Notaris & BPHTB", "Denda Keterlambatan", "Lainnya"] },
      { key: "periode", label: "Periode / Angsuran ke-", type: "text" },
      { key: "nominal", label: "Nominal (Rp)", type: "number", currency: true, required: true },
      { key: "terbilang", label: "Terbilang", type: "text", readOnly: true },
      { key: "metodeBayar", label: "Metode Pembayaran", type: "select", options: ["Tunai", "Transfer Bank", "Cek / Giro", "Debit / EDC"] },
      { key: "bank", label: "Bank Tujuan", type: "text", ref: "bukubank.bank" },
      { key: "nomorRekening", label: "Nomor Rekening", type: "text" },
      { key: "penerima", label: "Penerima / Kasir", type: "text" },
      { key: "disetujuiOleh", label: "Disetujui Oleh", type: "text" },
      { key: "statusApproval", label: "Status Approval", type: "select", options: ["Menunggu Approval", "Disetujui", "Ditolak"] },
      { key: "catatan", label: "Catatan", type: "text" },
      { key: "status", label: "Status Kuitansi", type: "select", options: ["Draft", "Terbit", "Batal"] },
    ],
    columns: ["nomorKuitansi", "tanggal", "namaPembeli", "jenisPenerimaan", "nominal"], statusField: "status",
    searchFields: ["nomorKuitansi", "namaPembeli", "nomorUnit", "proyek", "jenisPenerimaan"],
    filterFields: ["proyek", "jenisPenerimaan", "statusApproval", "status"],
  },
  {
    key: "approval", label: "Approval Berjenjang", group: "KEUANGAN", icon: ShieldCheck,
    fields: [
      { key: "tanggalPengajuan", label: "Tanggal Pengajuan", type: "date", required: true },
      { key: "jenisDokumen", label: "Jenis Dokumen", type: "select", required: true, options: ["Kuitansi Penerimaan", "Voucher Kas", "Permintaan Material", "SPK Borong Upah", "Komisi Marketing", "Diskon Harga", "Pencairan Dana", "Pembayaran Hutang", "Lainnya"] },
      { key: "nomorReferensi", label: "Nomor Referensi Dokumen", type: "text", required: true },
      { key: "pemohon", label: "Diajukan Oleh", type: "text", required: true },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "uraian", label: "Uraian Pengajuan", type: "text" },
      { key: "nominal", label: "Nominal (Rp)", type: "number", currency: true },
      { key: "level1Nama", label: "Approval 1 — Manager", type: "text" },
      { key: "level1Status", label: "Status Approval 1", type: "select", options: ["Menunggu", "Disetujui", "Ditolak"] },
      { key: "level1Tanggal", label: "Tanggal Approval 1", type: "date" },
      { key: "level1Catatan", label: "Catatan Approval 1", type: "text" },
      { key: "level2Nama", label: "Approval 2 — Direktur / Owner", type: "text" },
      { key: "level2Status", label: "Status Approval 2", type: "select", options: ["Menunggu", "Disetujui", "Ditolak"] },
      { key: "level2Tanggal", label: "Tanggal Approval 2", type: "date" },
      { key: "level2Catatan", label: "Catatan Approval 2", type: "text" },
      { key: "status", label: "Status Akhir", type: "select", options: ["Menunggu", "Disetujui Sebagian", "Disetujui", "Ditolak"], readOnly: true },
    ],
    columns: ["tanggalPengajuan", "jenisDokumen", "nomorReferensi", "pemohon", "nominal"], statusField: "status",
    searchFields: ["jenisDokumen", "nomorReferensi", "pemohon", "proyek", "uraian"],
    filterFields: ["jenisDokumen", "proyek", "status"],
  },
  {
    key: "supplier", label: "Master Supplier", group: "GUDANG", icon: Truck,
    fields: [
      { key: "kodeSupplier", label: "Kode Supplier", type: "text" },
      { key: "namaSupplier", label: "Nama Supplier / Toko", type: "text", required: true },
      { key: "kategori", label: "Kategori", type: "select", options: ["Material Bangunan", "Alat & Peralatan", "Jasa", "Subkontraktor", "Lainnya"] },
      { key: "kontakPerson", label: "Kontak Person", type: "text" },
      { key: "telepon", label: "Telepon / WhatsApp", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "alamat", label: "Alamat", type: "text" },
      { key: "npwp", label: "NPWP", type: "text" },
      { key: "bank", label: "Bank", type: "text" },
      { key: "nomorRekening", label: "Nomor Rekening", type: "text" },
      { key: "termPembayaran", label: "Term Pembayaran", type: "select", options: ["Tunai", "7 Hari", "14 Hari", "30 Hari", "60 Hari"] },
      { key: "catatan", label: "Catatan", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Aktif", "Nonaktif"] },
    ],
    columns: ["kodeSupplier", "namaSupplier", "kategori", "telepon", "termPembayaran"], statusField: "status",
    searchFields: ["kodeSupplier", "namaSupplier", "kategori", "kontakPerson", "telepon"],
    filterFields: ["kategori", "status"],
  },
  {
    key: "masterbarang", label: "Master Barang / Material", group: "GUDANG", icon: Package,
    fields: [
      { key: "kodeBarang", label: "Kode Barang", type: "text", required: true },
      { key: "namaBarang", label: "Nama Barang", type: "text", required: true },
      { key: "kategori", label: "Kategori", type: "select", options: ["Semen", "Besi & Baja", "Pasir & Batu", "Kayu", "Bata & Hebel", "Keramik", "Cat & Finishing", "Sanitair", "Listrik", "Atap & Rangka", "Pintu & Jendela", "Alat Kerja", "Lainnya"] },
      { key: "satuan", label: "Satuan", type: "select", options: ["Sak", "Batang", "M3", "M2", "Buah", "Dus", "Lembar", "Kg", "Roll", "Set", "Liter"] },
      { key: "hargaStandar", label: "Harga Standar (Rp)", type: "number", currency: true },
      { key: "stokMinimum", label: "Stok Minimum", type: "number" },
      { key: "gudang", label: "Gudang / Lokasi Simpan", type: "text" },
      { key: "supplierUtama", label: "Supplier Utama", type: "text", ref: "supplier.namaSupplier" },
      { key: "catatan", label: "Catatan", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Aktif", "Nonaktif"] },
    ],
    columns: ["kodeBarang", "namaBarang", "kategori", "satuan", "hargaStandar"], statusField: "status",
    searchFields: ["kodeBarang", "namaBarang", "kategori", "gudang", "supplierUtama"],
    filterFields: ["kategori", "gudang", "status"],
  },
  {
    key: "barangkeluar", label: "Barang Keluar Gudang", group: "GUDANG", icon: Upload,
    fields: [
      { key: "tanggal", label: "Tanggal Keluar", type: "date", required: true },
      { key: "noBukti", label: "No. Bukti Pengeluaran", type: "text", required: true },
      { key: "namaBarang", label: "Nama Barang", type: "text", required: true, ref: ["masterbarang.namaBarang", "kartubarangmasuk.namaBarang"] },
      { key: "kategoriBarang", label: "Kategori Barang", type: "text" },
      { key: "satuan", label: "Satuan", type: "text" },
      { key: "jumlahKeluar", label: "Jumlah Keluar", type: "number", required: true },
      { key: "hargaSatuan", label: "Harga Satuan (Rp)", type: "number", currency: true },
      { key: "totalNilai", label: "Total Nilai (Rp)", type: "number", currency: true, readOnly: true },
      { key: "sisaStok", label: "Sisa Stok Setelah Keluar", type: "number", readOnly: true },
      { key: "gudang", label: "Gudang Asal", type: "text" },
      { key: "proyek", label: "Proyek Tujuan", type: "text", ref: "proyek.namaProyek" },
      { key: "cluster", label: "Cluster", type: "text", ref: "clusterproyek.namaCluster" },
      { key: "unit", label: "Unit / Blok", type: "text", ref: "unit.nomorUnit" },
      { key: "pekerjaan", label: "Digunakan Untuk (Pekerjaan)", type: "text" },
      { key: "pemohon", label: "Pemohon / Mandor", type: "text" },
      { key: "penyetuju", label: "Disetujui Oleh", type: "text" },
      { key: "catatan", label: "Catatan", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Draft", "Disetujui", "Dikeluarkan", "Batal"] },
    ],
    columns: ["tanggal", "noBukti", "namaBarang", "jumlahKeluar", "proyek", "unit"], statusField: "status",
    searchFields: ["noBukti", "namaBarang", "proyek", "unit", "pemohon", "pekerjaan"],
    filterFields: ["proyek", "gudang", "status"],
  },
  {
    key: "stokgudang", label: "Stok Material Real-Time", group: "GUDANG", icon: Warehouse, virtual: true,
    fields: [
      { key: "namaBarang", label: "Nama Barang", type: "text" },
      { key: "kategori", label: "Kategori", type: "text" },
      { key: "satuan", label: "Satuan", type: "text" },
      { key: "gudang", label: "Gudang", type: "text" },
      { key: "totalMasuk", label: "Total Masuk", type: "number" },
      { key: "totalKeluar", label: "Total Keluar", type: "number" },
      { key: "sisaStok", label: "Sisa Stok", type: "number" },
      { key: "stokMinimum", label: "Stok Minimum", type: "number" },
      { key: "nilaiStok", label: "Nilai Stok (Rp)", type: "number", currency: true },
      { key: "status", label: "Status Stok", type: "select", options: ["Aman", "Menipis", "Habis"] },
    ],
    columns: ["namaBarang", "kategori", "satuan", "totalMasuk", "totalKeluar", "sisaStok", "nilaiStok"], statusField: "status",
    searchFields: ["namaBarang", "kategori", "gudang"],
    filterFields: ["kategori", "gudang", "status"],
    readOnly: true,
  },
  {
    key: "laporankeuangan", label: "Laporan Keuangan", group: "KEUANGAN", icon: PieChart, virtual: true,
    fields: [],
    columns: [], statusField: null,
    searchFields: [],
  },
  {
    key: "arsipdokumen", label: "Arsip Dokumen", group: null, icon: Archive,
    fields: [
      { key: "judulDokumen", label: "Judul Dokumen", type: "text", required: true },
      { key: "kategori", label: "Kategori", type: "text" },
      { key: "proyek", label: "Proyek", type: "text", ref: "proyek.namaProyek" },
      { key: "tanggalArsip", label: "Tanggal Arsip", type: "date" },
      { key: "lokasiFisik", label: "Lokasi Fisik / Catatan", type: "text" },
    ],
    columns: ["judulDokumen", "kategori", "proyek", "tanggalArsip"], statusField: null,
    searchFields: ["judulDokumen", "kategori", "proyek"],
  },
  {
    key: "laporan", label: "Laporan", group: null, icon: FileBarChart2,
    fields: [
      { key: "judulLaporan", label: "Judul Laporan", type: "text", required: true },
      { key: "jenisLaporan", label: "Jenis", type: "select", options: ["Bulanan", "Tahunan", "Khusus"] },
      { key: "periode", label: "Periode", type: "text" },
      { key: "tanggalDibuat", label: "Tanggal Dibuat", type: "date" },
      { key: "dibuatOleh", label: "Dibuat Oleh", type: "text" },
    ],
    columns: ["judulLaporan", "jenisLaporan", "periode", "tanggalDibuat"], statusField: null,
    searchFields: ["judulLaporan", "jenisLaporan"],
  },
  {
    key: "pengguna", label: "Pengguna & Hak Akses", group: null, icon: UserCog,
    fields: [
      { key: "nama", label: "Nama", type: "text", required: true },
      { key: "username", label: "Username", type: "text", required: true },
      { key: "email", label: "Email", type: "text" },
      { key: "password", label: "Password Login", type: "password", secure: true },
      { key: "role", label: "Role", type: "select", options: ["Superadmin", "Admin", "Manager", "Direktur", "Pengawas Proyek"] },
      { key: "status", label: "Status", type: "select", options: ["Aktif", "Nonaktif"] },
    ],
    columns: ["nama", "username", "email", "role"], statusField: "status",
    searchFields: ["nama", "username", "email"],
  },
];
const GROUP_ORDER = ["PROYEK", "LEGAL", "MARKETING", "PENJUALAN", "BANK", "NOTARIS", "PAJAK", "KEUANGAN", "GUDANG", null];
const MENU_SHORT_LABELS = {
  clusterproyek: "Cluster",
  progressunit: "Progress Proyek",
  updateharian: "Update Harian",
  materialrequest: "Permintaan Material",
  budgetkonstruksi: "Budget vs Realisasi",
  blokkavling: "Blok & Kavling",
  pricelist: "Price List",
  marketing: "Tim Marketing",
  prospek: "Database Prospek",
  followup: "Follow Up",
  targetmarketing: "Target Penjualan",
  komisi: "Komisi",
  kuitansi: "Kuitansi",
  approval: "Approval",
  supplier: "Supplier",
  masterbarang: "Master Barang",
  barangkeluar: "Barang Keluar",
  stokgudang: "Stok Material",
  dokumenlegal: "Dokumen",
  ppjb: "PPJB",
  sppt: "SPPT PBB",
  sengketa: "Sengketa",
  berkaskpr: "Berkas KPR",
  appraisal: "Appraisal",
  pencairankpr: "Pencairan KPR",
  prosesbank: "Proses Bank/Notaris",
  akadajb: "Akad & AJB",
  baliknama: "Balik Nama",
  royaht: "Roya & HT",
  pembayaran: "Pembayaran Pajak",
  tagihan: "Tagihan",
  transaksi: "Booking",
  jualicicilan: "Cicil Developer",
  kprsubsidi: "KPR Subsidi",
  kprkomersil: "KPR Komersil",
  kprsyariah: "KPR Syariah",
  pengajuankpr: "Pengajuan KPR",
  jadwalcicilan: "Skema Pembayaran",
  unit: "Master Unit",
  pembeli: "Master Pihak",
  unitpihak: "Unit_Pihak",
  generatesurat: "Generate Surat",
  arsipdokumen: "Arsip",
  pettycash: "Petty Cash",
  bukubank: "Buku Bank",
  voucher: "Voucher",
  kartuanggaran: "Kartu Anggaran",
  piutang: "Piutang",
  hutang: "Hutang",
  budgetcontrol: "Budget Control",
  kartupiutang: "Kartu Piutang",
  kartubarangmasuk: "Kartu Barang",
  spkborong: "SPK Borong",
  laporankeuangan: "Laporan Keuangan",
  laporan: "Laporan",
  pengguna: "Hak Akses",
};
const NAV_MISC_GROUP_KEY = "MISC";
const NAV_SYSTEM_GROUP_KEY = "SISTEM";
const SIDEBAR_PREF_KEY = "kbr-sidebar-collapsed";

const GROUP_ICONS = {
  PROYEK: Building2,
  LEGAL: FileCheck,
  MARKETING: Megaphone,
  PENJUALAN: Users,
  BANK: Landmark,
  NOTARIS: FileSignature,
  PAJAK: Receipt,
  KEUANGAN: Wallet,
  GUDANG: Warehouse,
  [NAV_MISC_GROUP_KEY]: FolderOpen,
  [NAV_SYSTEM_GROUP_KEY]: Settings,
};

function getNavGroupIcon(groupKey) {
  return GROUP_ICONS[groupKey] || FolderOpen;
}

/** Semua grup menu dalam keadaan tertutup — otomatis ikut GROUP_ORDER agar grup baru tidak terlewat. */
function buildClosedMenus() {
  const state = {};
  GROUP_ORDER.forEach((group) => { state[getNavGroupKey(group)] = false; });
  state[NAV_SYSTEM_GROUP_KEY] = false;
  return state;
}

function getNavGroupKey(group) {
  return group === null ? NAV_MISC_GROUP_KEY : group;
}

function getNavGroupLabel(group) {
  if (group === null) return "LAINNYA";
  return group;
}

function getMenuLabel(entity) {
  return MENU_SHORT_LABELS[entity.key] || entity.label;
}

function entityByKey(key) {
  return ENTITIES.find((e) => e.key === key) || null;
}

function canReadEntity(session, entityKey) {
  const list = (session && session.permissions && session.permissions.readableEntities) || [];
  return list.includes(entityKey);
}

function canWriteEntity(session, entityKey) {
  const list = (session && session.permissions && session.permissions.writableEntities) || [];
  return list.includes(entityKey);
}

function normalizeRefText(value) {
  return String(value || "").trim().toLowerCase();
}

function findRecordByField(records, fieldKey, value) {
  const target = normalizeRefText(value);
  if (!target) return null;
  return (records || []).find((row) => normalizeRefText(row[fieldKey]) === target) || null;
}

function attachWorkflowIds(entityKey, record, allData) {
  const next = { ...record };
  const unitRows = (allData && allData.unit) || [];
  const pihakRows = (allData && allData.pembeli) || [];

  const matchRow = (rows, fieldKey, value) => {
    const target = normalizeRefText(value);
    if (!target) return null;
    return (rows || []).find((row) => {
      const rowId = normalizeRefText(row && row.id);
      const rowExplicitUnitId = normalizeRefText(row && row.ID_Unit);
      const rowExplicitPihakId = normalizeRefText(row && row.ID_Pihak);
      const rowField = normalizeRefText(row && row[fieldKey]);
      return rowId === target || rowExplicitUnitId === target || rowExplicitPihakId === target || rowField === target;
    }) || null;
  };

  if (entityKey === "unit") {
    next.ID_Unit = next.ID_Unit || next.id || "";
  }
  if (entityKey === "pembeli") {
    next.ID_Pihak = next.ID_Pihak || next.id || "";
  }

  const unitValue = next.ID_Unit || next.unit || next.nomorUnit;
  if (String(unitValue || "").trim()) {
    const unitRecord = matchRow(unitRows, "nomorUnit", unitValue);
    if (unitRecord) {
      next.ID_Unit = unitRecord.ID_Unit || unitRecord.id || next.ID_Unit || "";
    }
  }

  const pihakValue = next.ID_Pihak || next.pembeli || next.namaPembeli || next.namaDebitur || next.atasNama;
  if (String(pihakValue || "").trim()) {
    const pihakRecord = matchRow(pihakRows, "nama", pihakValue);
    if (pihakRecord) {
      next.ID_Pihak = pihakRecord.ID_Pihak || pihakRecord.id || next.ID_Pihak || "";
    }
  }

  return next;
}

function applyRefScope(records, entityKey, values) {
  const rows = records || [];
  const proyek = normalizeRefText(values && values.proyek);
  const cluster = normalizeRefText(values && values.cluster);
  const unit = normalizeRefText(values && values.unit);
  const nomorUnit = normalizeRefText(values && values.nomorUnit);
  const targetUnit = unit || nomorUnit;

  return rows.filter((row) => {
    if (proyek && row.proyek && normalizeRefText(row.proyek) !== proyek) return false;
    if (cluster && row.cluster && normalizeRefText(row.cluster) !== cluster) return false;
    if (targetUnit) {
      const rowUnit = normalizeRefText(row.unit || row.nomorUnit);
      if (rowUnit && rowUnit !== targetUnit) return false;
    }

    // Bank reference biasanya dipilih berdasarkan nama pembeli/debitur atau unit.
    if (entityKey === "berkaskpr" || entityKey === "prosesbank" || entityKey === "appraisal" || entityKey === "pencairankpr" || entityKey === "akadajb" || entityKey === "baliknama" || entityKey === "royaht") {
      const namaPembeli = normalizeRefText((values && values.namaPembeli) || (values && values.pembeli) || (values && values.namaDebitur));
      if (namaPembeli) {
        const rowNama = normalizeRefText(row.namaPembeli || row.namaDebitur || row.pembeli);
        if (rowNama && rowNama !== namaPembeli) return false;
      }
    }

    return true;
  });
}

function deriveLinkedDefaults(values, allData) {
  if (!values || !allData) return null;

  const patch = {};
  const hasValue = (v) => String(v || "").trim() !== "";
  const matchByAnyKey = (rows, value, fieldKeys) => {
    const target = normalizeRefText(value);
    if (!target) return null;
    return (rows || []).find((row) => {
      return (fieldKeys || []).some((k) => normalizeRefText(row && row[k]) === target);
    }) || null;
  };
  const isApprovedBankStatus = (status) => {
    const t = normalizeRefText(status);
    return t === "disetujui" || t === "cair" || t === "cair sebagian" || t === "cair penuh";
  };

  const isGenerateSuratContext = Object.prototype.hasOwnProperty.call(values, "jenisSurat")
    && (Object.prototype.hasOwnProperty.call(values, "nominalTagihan")
      || Object.prototype.hasOwnProperty.call(values, "periodeTagihan")
      || Object.prototype.hasOwnProperty.call(values, "tanggalJatuhTempo"));

  // Generate Surat: namaPihak/nomorUnit -> tarik data dari modul tagihan
  if (isGenerateSuratContext) {
    const pihakRef = values.namaPihak || values.namaPembeli || values.pembeli || "";
    const unitRef = values.nomorUnit || values.unit || "";
    const tagihanRows = allData.tagihan || [];
    const filtered = tagihanRows.filter((row) => {
      const matchPihak = !hasValue(pihakRef) || normalizeRefText(row && row.pembeli) === normalizeRefText(pihakRef);
      const matchUnit = !hasValue(unitRef) || normalizeRefText(row && row.unit) === normalizeRefText(unitRef);
      return matchPihak && matchUnit;
    });

    if (filtered.length) {
      const unpaid = filtered.filter((row) => normalizeRefText(row && row.status) !== "lunas");
      const pool = unpaid.length ? unpaid : filtered;

      const ranked = pool.slice().sort((a, b) => {
        const da = daysFromToday(a && a.jatuhTempo);
        const db = daysFromToday(b && b.jatuhTempo);
        const ra = da === null ? 999999 : (da < 0 ? 10000 + Math.abs(da) : da);
        const rb = db === null ? 999999 : (db < 0 ? 10000 + Math.abs(db) : db);
        if (ra !== rb) return ra - rb;
        return String(b && b.jatuhTempo || "").localeCompare(String(a && a.jatuhTempo || ""));
      });

      const tagihan = ranked[0] || {};

      if (!hasValue(values.namaPihak) && tagihan.pembeli) patch.namaPihak = tagihan.pembeli;
      if (!hasValue(values.nomorUnit) && tagihan.unit) patch.nomorUnit = tagihan.unit;
      if (!hasValue(values.unit) && tagihan.unit) patch.unit = tagihan.unit;
      if (!hasValue(values.nominalTagihan) && (tagihan.jumlah || tagihan.jumlah === 0)) patch.nominalTagihan = String(tagihan.jumlah);
      if (!hasValue(values.tanggalJatuhTempo) && tagihan.jatuhTempo) patch.tanggalJatuhTempo = tagihan.jatuhTempo;

      if (!hasValue(values.periodeTagihan)) {
        const mk = monthKeyFromDate(tagihan.jatuhTempo);
        if (mk) patch.periodeTagihan = monthLabelFromKey(mk) || mk;
      }

      if (String(values.jenisSurat || "").trim() === "Surat Tagihan Piutang" && !hasValue(values.perihal)) {
        patch.perihal = "Surat Tagihan Piutang";
      }
    }
  }

  // ID_Unit -> nomorUnit, proyek, cluster
  if (hasValue(values.ID_Unit)) {
    const unitById = matchByAnyKey(allData.unit, values.ID_Unit, ["ID_Unit", "id", "nomorUnit"]);
    if (unitById) {
      if (!hasValue(values.nomorUnit) && unitById.nomorUnit) patch.nomorUnit = unitById.nomorUnit;
      if (!hasValue(values.unit) && unitById.nomorUnit) patch.unit = unitById.nomorUnit;
      if (!hasValue(values.proyek) && unitById.proyek) patch.proyek = unitById.proyek;
      if (!hasValue(values.cluster) && unitById.cluster) patch.cluster = unitById.cluster;
      if (!hasValue(values.ID_Unit) && (unitById.ID_Unit || unitById.id)) patch.ID_Unit = unitById.ID_Unit || unitById.id;
    }
  }

  // ID_Pihak -> namaPihak/namaPembeli/pembeli/atasNama, proyek, unit/nomorUnit
  if (hasValue(values.ID_Pihak)) {
    const pihakById = matchByAnyKey(allData.pembeli, values.ID_Pihak, ["ID_Pihak", "id", "nama"]);
    if (pihakById) {
      if (!hasValue(values.namaPihak) && pihakById.nama) patch.namaPihak = pihakById.nama;
      if (!hasValue(values.namaPembeli) && pihakById.nama) patch.namaPembeli = pihakById.nama;
      if (!hasValue(values.pembeli) && pihakById.nama) patch.pembeli = pihakById.nama;
      if (!hasValue(values.namaDebitur) && pihakById.nama) patch.namaDebitur = pihakById.nama;
      if (!hasValue(values.atasNama) && pihakById.nama) patch.atasNama = pihakById.nama;
      if (!hasValue(values.proyek) && pihakById.proyek) patch.proyek = pihakById.proyek;
      if (!hasValue(values.nomorUnit) && pihakById.unit) patch.nomorUnit = pihakById.unit;
      if (!hasValue(values.unit) && pihakById.unit) patch.unit = pihakById.unit;
      if (!hasValue(values.ID_Pihak) && (pihakById.ID_Pihak || pihakById.id)) patch.ID_Pihak = pihakById.ID_Pihak || pihakById.id;
    }
  }

  // cluster → proyek
  if (!hasValue(values.proyek) && hasValue(values.cluster)) {
    const clusterRec = findRecordByField(allData.clusterproyek, "namaCluster", values.cluster);
    if (clusterRec && clusterRec.proyek) patch.proyek = clusterRec.proyek;
  }

  // nomorUnit → proyek, cluster
  if (hasValue(values.nomorUnit)) {
    const unitRec = findRecordByField(allData.unit, "nomorUnit", values.nomorUnit);
    if (unitRec) {
      if (!hasValue(values.proyek) && unitRec.proyek) patch.proyek = unitRec.proyek;
      if (!hasValue(values.cluster) && unitRec.cluster) patch.cluster = unitRec.cluster;
    }
  }

  // unit (field lama) → proyek
  if (!hasValue(values.proyek) && hasValue(values.unit)) {
    const unitRec = findRecordByField(allData.unit, "nomorUnit", values.unit);
    if (unitRec && unitRec.proyek) patch.proyek = unitRec.proyek;
  }

  // namaPembeli / pembeli → unit, nomorUnit, proyek, cluster, skemaPembayaran
  const pembeliName = values.namaPembeli || values.pembeli || values.namaDebitur || values.atasNama;
  if (hasValue(pembeliName)) {
    const pembeliRec = findRecordByField(allData.pembeli, "nama", pembeliName);
    if (pembeliRec) {
      if (!hasValue(values.unit) && pembeliRec.unit) patch.unit = pembeliRec.unit;
      if (!hasValue(values.nomorUnit) && pembeliRec.unit) patch.nomorUnit = pembeliRec.unit;
      if (!hasValue(values.proyek) && pembeliRec.proyek) patch.proyek = pembeliRec.proyek;
    }
    // Cek transaksi → isi nomorUnit, proyek, cluster, skema secara otomatis
    if (allData.transaksi) {
      const transaksiRec = findRecordByField(allData.transaksi, "namaPembeli", pembeliName);
      if (transaksiRec) {
        if (!hasValue(values.nomorUnit) && transaksiRec.nomorUnit) patch.nomorUnit = transaksiRec.nomorUnit;
        if (!hasValue(values.proyek) && transaksiRec.proyek) patch.proyek = transaksiRec.proyek;
        if (!hasValue(values.cluster) && transaksiRec.cluster) patch.cluster = transaksiRec.cluster;
        if (!hasValue(values.skemaPembayaran) && transaksiRec.skemaPembayaran) patch.skemaPembayaran = transaksiRec.skemaPembayaran;
      }
    }
    // Cek pencairankpr/berkaskpr → isi bank untuk modul NOTARIS secara otomatis
    if (!hasValue(values.bank)) {
      if (allData.pencairankpr) {
        const pencRec = (allData.pencairankpr || []).find((row) => normalizeRefText(row && row.namaPembeli) === normalizeRefText(pembeliName) && isApprovedBankStatus(row && row.status));
        if (pencRec && pencRec.bank) {
          patch.bank = pencRec.bank;
          if (!hasValue(values.unit) && pencRec.nomorUnit) patch.unit = pencRec.nomorUnit;
        }
      }
      if (!patch.bank && allData.berkaskpr) {
        const berkasRec = (allData.berkaskpr || []).find((row) => normalizeRefText(row && row.namaPembeli) === normalizeRefText(pembeliName) && isApprovedBankStatus(row && row.status));
        if (berkasRec && berkasRec.bank) patch.bank = berkasRec.bank;
      }
    }
  }

  // marketing → persen komisi & proyek penugasan (Prospek, Follow Up, Komisi, Target)
  if (hasValue(values.marketing)) {
    const mkRec = findRecordByField(allData.marketing, "namaMarketing", values.marketing);
    if (mkRec) {
      if (!hasValue(values.persenKomisi) && mkRec.persenKomisi) patch.persenKomisi = String(mkRec.persenKomisi);
      if (!hasValue(values.proyek) && mkRec.proyek) patch.proyek = mkRec.proyek;
    }
  }

  // namaProspek → telepon, proyek, marketing (Jejak Follow Up)
  if (hasValue(values.namaProspek)) {
    const prospekRec = findRecordByField(allData.prospek, "namaProspek", values.namaProspek);
    if (prospekRec) {
      if (!hasValue(values.telepon) && prospekRec.telepon) patch.telepon = prospekRec.telepon;
      if (!hasValue(values.proyek) && prospekRec.proyek) patch.proyek = prospekRec.proyek;
      if (!hasValue(values.marketing) && prospekRec.marketing) patch.marketing = prospekRec.marketing;
    }
  }

  // tipe unit → estimasi harga dari Price List (Prospek)
  if (hasValue(values.tipeMinat) && !hasValue(values.budget)) {
    const priceRec = (allData.pricelist || []).find((row) => {
      if (normalizeRefText(row && row.tipeUnit) !== normalizeRefText(values.tipeMinat)) return false;
      return !hasValue(values.proyek) || normalizeRefText(row && row.proyek) === normalizeRefText(values.proyek);
    });
    if (priceRec && priceRec.hargaJual) patch.budget = String(priceRec.hargaJual);
  }

  // namaBarang → satuan, kategori, harga standar, gudang (Barang Keluar)
  if (hasValue(values.namaBarang)) {
    const barangRec = findRecordByField(allData.masterbarang, "namaBarang", values.namaBarang);
    if (barangRec) {
      if (!hasValue(values.satuan) && barangRec.satuan) patch.satuan = barangRec.satuan;
      if (!hasValue(values.kategoriBarang) && barangRec.kategori) patch.kategoriBarang = barangRec.kategori;
      if (!hasValue(values.hargaSatuan) && barangRec.hargaStandar) patch.hargaSatuan = String(barangRec.hargaStandar);
      if (!hasValue(values.gudang) && barangRec.gudang) patch.gudang = barangRec.gudang;
    }
  }

  return Object.keys(patch).length ? patch : null;
}

/** Ambil daftar nilai unik dari modul lain untuk saran isian (field.ref), agar input antar fitur terintegrasi. */
function resolveRefOptions(ref, allData, context) {
  if (!ref || !allData) return [];
  const ctx = context || {};
  const values = ctx.values || {};
  const specs = Array.isArray(ref) ? ref : [ref];
  const set = new Set();
  specs.forEach((spec) => {
    const [entityKey, fieldKey] = spec.split(".");
    const scopedRows = applyRefScope(allData[entityKey] || [], entityKey, values);
    scopedRows.forEach((r) => {
      const val = r[fieldKey];
      if (val) set.add(String(val));
    });
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
}

function getCustomSuratTemplates(allData) {
  const settings = allData && allData.pengaturan && allData.pengaturan[0];
  const templates = settings && Array.isArray(settings.customSuratTemplates) ? settings.customSuratTemplates : [];
  return templates.filter((template) => template && template.id && template.aktif !== false);
}

function getFieldOptions(schema, field, allData) {
  if (schema.key === "generatesurat" && field.key === "customTemplateId") {
    return ["", ...getCustomSuratTemplates(allData).map((template) => template.id)];
  }
  return field.options || [];
}

function getFieldOptionLabel(schema, field, value, allData) {
  if (schema.key === "generatesurat" && field.key === "customTemplateId") {
    if (!value) return "Gunakan template bawaan";
    const template = getCustomSuratTemplates(allData).find((item) => item.id === value);
    return template ? template.nama : value;
  }
  return value;
}

const MAX_ATTACHMENT_SIZE = 8 * 1024 * 1024; // 8MB - batas aman untuk request Apps Script
/** Baca File jadi base64 (tanpa prefix data:mime;base64,) untuk dikirim ke backend. */
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const GENERATE_SURAT_TEMPLATE_MAP = {
  "Draft SPK Rumah Subsidi": {
    perihal: "Surat Perintah Kerja Rumah Subsidi",
    isiRingkas: "Berdasarkan kesepakatan kerja antara pihak perusahaan dan pelaksana, pekerjaan pembangunan rumah subsidi pada unit terkait dinyatakan mulai dilaksanakan sesuai lingkup pekerjaan, jadwal, dan spesifikasi yang berlaku.",
  },
  "Form SPPR Royal Paradise": {
    perihal: "Formulir SPPR Royal Paradise",
    isiRingkas: "Sehubungan dengan pengajuan pembiayaan perumahan, pihak terkait menyampaikan data dan dokumen pendukung SPPR untuk diproses sesuai ketentuan internal dan ketentuan lembaga pembiayaan.",
  },
  "SPJB RPD": {
    perihal: "Surat Perjanjian Jual Beli (SPJB) RPD",
    isiRingkas: "Pada hari dan tanggal tersebut, para pihak sepakat untuk mengikatkan diri dalam Perjanjian Jual Beli atas unit dan proyek terkait, termasuk ketentuan pembayaran, hak, kewajiban, serta penyelesaian sengketa.",
  },
  "Surat Perjanjian Jual Beli": {
    perihal: "Surat Perjanjian Jual Beli",
    isiRingkas: "Surat ini menjadi dasar perikatan jual beli antara pihak penjual dan pihak pembeli atas unit terkait, mencakup nilai transaksi, jadwal pembayaran, dan ketentuan penyerahan dokumen.",
  },
  "Surat Tagihan Piutang": {
    perihal: "Pemberitahuan I Jatuh Tempo",
    isiRingkas: "Bersama surat ini kami menyampaikan tagihan piutang atas kewajiban pembayaran yang telah jatuh tempo. Dimohon penyelesaian pembayaran sesuai nilai dan periode yang tercantum.",
    pemberitahuanKe: "I",
  },
};

const cardBase = { background: "#FFFFFF", border: `1px solid ${UI.boxBorder}`, borderRadius: UI.radius, boxShadow: UI.boxShadow, padding: 20, display: "flex", flexDirection: "column", gap: 10, animation: "kbr-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)" };
const primaryBtn = { display: "inline-flex", alignItems: "center", gap: 7, background: UI.primary, color: "#fff", border: "1px solid transparent", borderRadius: UI.radius, padding: "9px 16px", fontSize: 13, fontWeight: 600, letterSpacing: "0.01em", cursor: "pointer", transition: "background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease" };
const ghostBtn = { display: "inline-flex", alignItems: "center", gap: 7, background: "#FFFFFF", color: C.ink, border: `1px solid #CED4DA`, borderRadius: UI.radius, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease" };
const linkBtn = { display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: UI.primary, fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0, transition: "opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1)" };
const fieldLabelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em", marginLeft: 2 };
const formInputStyle = { width: "100%", boxSizing: "border-box", background: "#FFFFFF", border: `1px solid #CED4DA`, borderRadius: UI.radius, padding: "9px 13px", fontSize: 13.5, color: C.ink, outline: "none", transition: "border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease" };
const currencyInputStyle = { ...formInputStyle, padding: "9px 12px 9px 46px", fontWeight: 700, letterSpacing: "0.01em", background: "#FCFDFE", borderColor: "#CAD4E4" };
const autoInputStyle = { background: "#F1F7EE", borderColor: "#BFD9B5", color: "#1B3A15" };

/** Judul halaman bergaya AdminLTE: besar, tipis, abu-abu. */
const pageTitleStyle = { fontSize: 25, fontWeight: 400, color: UI.headingText, letterSpacing: "-0.01em" };

// Field bertipe uraian/alamat dipaksa selebar form agar isinya tidak terpotong di layout kolom.
const FULL_WIDTH_FIELD_KEYS = new Set([
  "alamat", "alamatPembeli", "pihak1Alamat", "pihak2Alamat", "lokasiTanah", "lokasiFisik", "lokasiProyek",
  "catatan", "catatanBudget", "catatanHasil", "catatanMandor", "level1Catatan", "level2Catatan", "ketentuanTambahan",
  "uraian", "uraianPekerjaan", "isiRingkas", "perihal", "hambatan", "kronologi",
  "judulDokumen", "judulSengketa", "judulLaporan", "itemPekerjaan", "jenisPekerjaan", "materialDipakai",
  "rencanaBerikut", "tujuan", "pihakTerkait", "pemakaiUntuk", "pekerjaan", "terbilang", "namaPerumahan",
]);

function isFullWidthField(field) {
  return FULL_WIDTH_FIELD_KEYS.has(field.key) || String(field.label || "").length > 46;
}

/** Header kartu bergaya AdminLTE: judul kiri + ikon alat kanan. */
function BoxHeader({ title, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderBottom: `1px solid ${UI.boxBorder}`, paddingBottom: 10, marginBottom: 4 }}>
      <div style={{ fontSize: 16, fontWeight: 400, color: "#4E5D6C" }}>{title}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#ADB5BD" }}>{children}</div>
    </div>
  );
}

// Field yang dihitung otomatis oleh formula — ditampilkan read-only dengan hint di label.
const AUTO_CALC_HINTS = {
  pph: { nilaiPph: "Nilai Transaksi × Tarif PPh" },
  bphtb: { nilaiBphtb: "(Nilai − NPOPTKP) × Tarif BPHTB" },
  spkborong: { ppnNilai: "Nilai Borongan × PPN%", totalNilai: "Nilai Borongan + PPN" },
  budgetcontrol: { sisaBudget: "Rencana Budget − Realisasi", prosSisaBudget: "(Sisa ÷ Rencana) × 100" },
  kartupiutang: { hargaSetelahDiskon: "Harga Resmi − Diskon", saldo: "Piutang awal − akumulasi debet + kredit" },
  kartubarangmasuk: { totalNilai: "Jumlah × Harga Satuan", saldoStok: "Saldo sebelumnya + Masuk − Keluar" },
  pengajuankpr: { plafondKPR: "Nilai Rumah − Uang Muka" },
  tagihan: { status: "Otomatis 'Terlambat' bila jatuh tempo lewat" },
  pricelist: { hargaJual: "Harga Dasar + (Harga Dasar × Markup%)", hargaMinimal: "Harga Jual − Diskon Maksimal" },
  targetmarketing: { pencapaianPersen: "(Realisasi ÷ Target) × 100" },
  komisi: { nominalKomisi: "Nilai Transaksi × Persen Komisi", komisiDiterima: "Nominal Komisi − Potongan Pajak" },
  kuitansi: { terbilang: "Otomatis dari nominal" },
  approval: { status: "Otomatis dari status Approval 1 & 2" },
  barangkeluar: { totalNilai: "Jumlah Keluar × Harga Satuan", sisaStok: "Total masuk − total keluar" },
};

function getFormulaValidationError(schemaKey, values) {
  const number = (key) => {
    const raw = String(values[key] ?? "").trim();
    if (!raw) return 0;
    const parsed = Number(raw.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : NaN;
  };
  const nonNegativeFields = {
    pph: ["nilaiTransaksi", "tarifPph"], bphtb: ["nilaiTransaksi", "npoptkp", "tarifBphtb"],
    budgetcontrol: ["rencanaBudget", "realisasi"], komisi: ["nilaiTransaksi", "persenKomisi", "potonganPajak"],
    pengajuankpr: ["nilaiRumah", "uangMuka"], pricelist: ["hargaDasar", "kenaikanPersen", "diskonMaksimal"],
    spkborong: ["nilaiBorongan", "ppnPersen"], barangkeluar: ["jumlahKeluar", "hargaSatuan"],
    kartubarangmasuk: ["jumlahMasuk", "jumlahKeluar", "hargaSatuan"], kartupiutang: ["hargaResmi", "diskon", "debet", "kredit"],
  };
  const invalidNumber = (nonNegativeFields[schemaKey] || []).find((key) => !Number.isFinite(number(key)) || number(key) < 0);
  if (invalidNumber) return "Nilai angka tidak boleh negatif atau tidak valid.";
  const percentageFields = { pph: ["tarifPph"], bphtb: ["tarifBphtb"], komisi: ["persenKomisi"], pricelist: ["kenaikanPersen"], spkborong: ["ppnPersen"] };
  if ((percentageFields[schemaKey] || []).some((key) => number(key) > 100)) return "Persentase harus berada pada rentang 0 sampai 100%.";
  if (schemaKey === "komisi" && number("potonganPajak") > number("nominalKomisi")) return "Potongan pajak tidak boleh melebihi nominal komisi.";
  if (schemaKey === "pengajuankpr" && number("uangMuka") > number("nilaiRumah")) return "Uang muka tidak boleh melebihi nilai rumah.";
  if (schemaKey === "pricelist" && number("diskonMaksimal") > number("hargaJual")) return "Diskon maksimal tidak boleh melebihi harga jual.";
  if (schemaKey === "kartupiutang" && number("diskon") > number("hargaResmi")) return "Diskon tidak boleh melebihi harga resmi.";
  if ((schemaKey === "barangkeluar" && number("sisaStok") < 0) || (schemaKey === "kartubarangmasuk" && number("saldoStok") < 0)) return "Stok tidak mencukupi untuk transaksi ini.";
  if (schemaKey === "approval" && values.level2Status !== "Menunggu" && values.level1Status !== "Disetujui") return "Approval level 2 menunggu persetujuan level 1.";
  return "";
}

// ---------- state kosong / memuat / gagal muat (dipakai di Dashboard & semua modul) ----------
function LoadingState({ label = "Memuat data...", variant = "card", rows = 4 }) {
  const isTable = variant === "table";
  return (
    <div style={{ ...cardBase, padding: isTable ? "16px 16px 20px" : "24px", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div className="kbr-skeleton" style={{ width: isTable ? 180 : 230, height: 14, borderRadius: 999 }} />
        <div className="kbr-skeleton" style={{ width: 80, height: 14, borderRadius: 999 }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="kbr-skeleton" style={{ width: "100%", height: isTable ? 34 : 22, borderRadius: 10 }} />
        ))}
      </div>
      <div style={{ fontSize: 12.5, color: C.muted }}>{label}</div>
    </div>
  );
}
function ErrorState({ onRetry, message }) {
  return (
    <div style={{ ...cardBase, alignItems: "center", textAlign: "center", padding: "60px 24px", gap: 12 }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: palette.red.bg, color: palette.red.fg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <AlertTriangle size={24} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Gagal memuat data</div>
      <div style={{ fontSize: 13, color: C.muted, maxWidth: 420 }}>{message || "Periksa koneksi internet, lalu coba lagi. Jika terus gagal, pastikan deployment web app masih aktif."}</div>
      <button onClick={onRetry} style={{ ...primaryBtn, marginTop: 4 }}>
        <RefreshCw size={14} /> Coba Lagi
      </button>
    </div>
  );
}
function EmptyRow({ colSpan, message }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: "36px 14px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 8, color: C.mutedLight }}>
          <Inbox size={26} strokeWidth={1.5} />
          <span style={{ fontSize: 13 }}>{message}</span>
        </div>
      </td>
    </tr>
  );
}

// ---------- modal form generik (schema-driven) ----------
function RecordFormModal({ schema, initial, allData, onCancel, onSubmit }) {
  const buildValues = () => {
    const v = {};
    schema.fields.forEach((f) => {
      if (f.secure) {
        v[f.key] = "";
      } else {
        const options = getFieldOptions(schema, f, allData);
        v[f.key] = initial ? (initial[f.key] ?? "") : (f.defaultValue ?? (f.type === "select" ? options[0] || "" : ""));
      }
    });
    v.lampiran = initial && Array.isArray(initial.lampiran) ? initial.lampiran : [];
    return v;
  };
  const [values, setValues] = useState(buildValues);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const setField = (key, val) => setValues((v) => ({ ...v, [key]: val }));
  const requiredMissing = schema.fields.some((f) => f.required && !String(values[f.key] || "").trim());
  const formulaValidationError = getFormulaValidationError(schema.key, values);
  const isTaxForm = schema.key === "pph" || schema.key === "bphtb";

  useEffect(() => {
    setValues((prev) => {
      const patch = deriveLinkedDefaults(prev, allData);
      if (!patch) return prev;
      let changed = false;
      const next = { ...prev };
      Object.keys(patch).forEach((k) => {
        if (!String(prev[k] || "").trim()) {
          next[k] = patch[k];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [schema.key, allData, values.proyek, values.cluster, values.unit, values.nomorUnit, values.ID_Unit, values.namaPembeli, values.pembeli, values.namaPihak, values.ID_Pihak, values.namaDebitur, values.atasNama, values.jenisSurat, values.marketing, values.namaProspek, values.tipeMinat, values.namaBarang]);

  useEffect(() => {
    setValues((prev) => {
      let changed = false;
      const next = { ...prev };
      schema.fields.forEach((field) => {
        if (!field.ref) return;
        const current = String(prev[field.key] || "").trim();
        if (!current) return;
        const options = resolveRefOptions(field.ref, allData, { values: prev, schemaKey: schema.key, fieldKey: field.key });
        if (options.length === 0) return;
        const exists = options.some((opt) => normalizeRefText(opt) === normalizeRefText(current));
        if (!exists) {
          next[field.key] = "";
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [schema.key, allData, values.proyek, values.cluster, values.unit, values.nomorUnit, values.ID_Unit, values.namaPembeli, values.pembeli, values.namaPihak, values.ID_Pihak, values.namaDebitur, values.atasNama, values.jenisSurat, values.marketing, values.namaProspek, values.tipeMinat, values.namaBarang]);

  useEffect(() => {
    const toNumber = (value) => {
      const n = Number(String(value || "").replace(/[^0-9.-]/g, ""));
      return isNaN(n) ? 0 : n;
    };
    if (schema.key === "pph") {
      const nilaiTransaksi = toNumber(values.nilaiTransaksi);
      const tarifPph = toNumber(values.tarifPph || "2.5");
      const nilaiPph = Math.round((nilaiTransaksi * tarifPph) / 100);
      if (String(values.nilaiPph || "") !== String(nilaiPph)) {
        setValues((v) => (String(v.nilaiPph || "") === String(nilaiPph) ? v : { ...v, nilaiPph: String(nilaiPph) }));
      }
    }
    if (schema.key === "bphtb") {
      const nilaiTransaksi = toNumber(values.nilaiTransaksi);
      const npoptkp = toNumber(values.npoptkp || "80000000");
      const tarifBphtb = toNumber(values.tarifBphtb || "5");
      const dasar = Math.max(0, nilaiTransaksi - npoptkp);
      const nilaiBphtb = Math.round((dasar * tarifBphtb) / 100);
      if (String(values.nilaiBphtb || "") !== String(nilaiBphtb)) {
        setValues((v) => (String(v.nilaiBphtb || "") === String(nilaiBphtb) ? v : { ...v, nilaiBphtb: String(nilaiBphtb) }));
      }
    }
  }, [schema.key, values.nilaiTransaksi, values.tarifPph, values.npoptkp, values.tarifBphtb, values.nilaiPph, values.nilaiBphtb]);

  // Auto-calc: SPK Borong (PPN & Total Nilai Kontrak)
  useEffect(() => {
    if (schema.key !== "spkborong") return;
    const toNumber = (v) => { const n = Number(String(v || "").replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
    const nilai = toNumber(values.nilaiBorongan);
    const ppnPersen = toNumber(values.ppnPersen != null && values.ppnPersen !== "" ? values.ppnPersen : "11");
    const ppnNilai = Math.round((nilai * ppnPersen) / 100);
    const totalNilai = nilai + ppnNilai;
    setValues((v) => {
      const patch = {};
      if (String(v.ppnNilai || "") !== String(ppnNilai)) patch.ppnNilai = String(ppnNilai);
      if (String(v.totalNilai || "") !== String(totalNilai)) patch.totalNilai = String(totalNilai);
      return Object.keys(patch).length ? { ...v, ...patch } : v;
    });
  }, [schema.key, values.nilaiBorongan, values.ppnPersen]);

  // Auto-calc: Budget Control (Sisa Budget & % Sisa)
  useEffect(() => {
    if (schema.key !== "budgetcontrol") return;
    const toNumber = (v) => { const n = Number(String(v || "").replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
    const rencana = toNumber(values.rencanaBudget);
    const realisasi = toNumber(values.realisasi);
    const sisa = rencana - realisasi;
    const prosSisa = rencana > 0 ? Math.round((sisa / rencana) * 100) : 0;
    setValues((v) => {
      const patch = {};
      if (String(v.sisaBudget || "") !== String(sisa)) patch.sisaBudget = String(sisa);
      if (String(v.prosSisaBudget || "") !== String(prosSisa)) patch.prosSisaBudget = String(prosSisa);
      return Object.keys(patch).length ? { ...v, ...patch } : v;
    });
  }, [schema.key, values.rencanaBudget, values.realisasi]);

  // Auto-calc: Price List Unit (Harga Jual & Harga Minimal)
  useEffect(() => {
    if (schema.key !== "pricelist") return;
    const toNumber = (v) => { const n = Number(String(v || "").replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
    const hargaDasar = toNumber(values.hargaDasar);
    const markup = toNumber(values.kenaikanPersen);
    const hargaJual = Math.round((hargaDasar * (100 + markup)) / 100);
    const hargaMinimal = hargaJual - toNumber(values.diskonMaksimal);
    setValues((v) => {
      const patch = {};
      if (String(v.hargaJual || "") !== String(hargaJual)) patch.hargaJual = String(hargaJual);
      if (String(v.hargaMinimal || "") !== String(hargaMinimal)) patch.hargaMinimal = String(hargaMinimal);
      return Object.keys(patch).length ? { ...v, ...patch } : v;
    });
  }, [schema.key, values.hargaDasar, values.kenaikanPersen, values.diskonMaksimal]);

  // Auto-calc: Target & Realisasi Penjualan (Pencapaian % + status)
  useEffect(() => {
    if (schema.key !== "targetmarketing") return;
    const toNumber = (v) => { const n = Number(String(v || "").replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
    const targetNilai = toNumber(values.targetNilai);
    const realisasiNilai = toNumber(values.realisasiNilai);
    const targetUnit = toNumber(values.targetUnit);
    const realisasiUnit = toNumber(values.realisasiUnit);
    const basisTarget = targetNilai > 0 ? targetNilai : targetUnit;
    const basisRealisasi = targetNilai > 0 ? realisasiNilai : realisasiUnit;
    const persen = basisTarget > 0 ? Math.round((basisRealisasi / basisTarget) * 100) : 0;
    const status = persen >= 100 ? (persen > 100 ? "Melebihi Target" : "Tercapai") : "Belum Tercapai";
    setValues((v) => {
      const patch = {};
      if (String(v.pencapaianPersen || "") !== String(persen)) patch.pencapaianPersen = String(persen);
      if (basisTarget > 0 && v.status !== status) patch.status = status;
      return Object.keys(patch).length ? { ...v, ...patch } : v;
    });
  }, [schema.key, values.targetNilai, values.realisasiNilai, values.targetUnit, values.realisasiUnit]);

  // Auto-calc: Komisi Marketing (Nominal komisi & komisi bersih diterima)
  useEffect(() => {
    if (schema.key !== "komisi") return;
    const toNumber = (v) => { const n = Number(String(v || "").replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
    const nominalKomisi = Math.round((toNumber(values.nilaiTransaksi) * toNumber(values.persenKomisi)) / 100);
    const komisiDiterima = nominalKomisi - toNumber(values.potonganPajak);
    setValues((v) => {
      const patch = {};
      if (String(v.nominalKomisi || "") !== String(nominalKomisi)) patch.nominalKomisi = String(nominalKomisi);
      if (String(v.komisiDiterima || "") !== String(komisiDiterima)) patch.komisiDiterima = String(komisiDiterima);
      return Object.keys(patch).length ? { ...v, ...patch } : v;
    });
  }, [schema.key, values.nilaiTransaksi, values.persenKomisi, values.potonganPajak]);

  // Auto-calc: Kuitansi (terbilang otomatis dari nominal)
  useEffect(() => {
    if (schema.key !== "kuitansi") return;
    const nominal = Number(String(values.nominal || "").replace(/[^0-9.-]/g, ""));
    const terbilang = !isNaN(nominal) && nominal > 0 ? `${angkaKeTeksBulat(nominal)} Rupiah` : "";
    setValues((v) => (String(v.terbilang || "") === terbilang ? v : { ...v, terbilang }));
  }, [schema.key, values.nominal]);

  // Auto-calc: Approval berjenjang (status akhir dari kombinasi level 1 & 2)
  useEffect(() => {
    if (schema.key !== "approval") return;
    const l1 = String(values.level1Status || "Menunggu");
    const l2 = String(values.level2Status || "Menunggu");
    let status = "Menunggu";
    if (l1 === "Ditolak" || l2 === "Ditolak") status = "Ditolak";
    else if (l1 === "Disetujui" && l2 === "Disetujui") status = "Disetujui";
    else if (l1 === "Disetujui" || l2 === "Disetujui") status = "Disetujui Sebagian";
    setValues((v) => (v.status === status ? v : { ...v, status }));
  }, [schema.key, values.level1Status, values.level2Status]);

  // Auto-calc: Barang Keluar (Total nilai & sisa stok gudang setelah pengeluaran)
  useEffect(() => {
    if (schema.key !== "barangkeluar") return;
    const toNumber = (v) => { const n = Number(String(v || "").replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
    const jumlahKeluar = toNumber(values.jumlahKeluar);
    const totalNilai = Math.round(jumlahKeluar * toNumber(values.hargaSatuan));
    const namaBarang = String(values.namaBarang || "").trim().toLowerCase();
    const gudang = String(values.gudang || "").trim().toLowerCase();
    const curId = initial ? initial.id : null;
    let masuk = 0;
    let keluarLain = 0;
    if (namaBarang) {
      ((allData && allData.kartubarangmasuk) || []).forEach((r) => {
        if (String(r.namaBarang || "").trim().toLowerCase() !== namaBarang) return;
        const rg = String(r.gudang || "").trim().toLowerCase();
        if (gudang && rg && rg !== gudang) return;
        masuk += toNumber(r.jumlahMasuk) - toNumber(r.jumlahKeluar);
      });
      ((allData && allData.barangkeluar) || []).forEach((r) => {
        if (curId && r.id === curId) return;
        if (String(r.namaBarang || "").trim().toLowerCase() !== namaBarang) return;
        const rg = String(r.gudang || "").trim().toLowerCase();
        if (gudang && rg && rg !== gudang) return;
        keluarLain += toNumber(r.jumlahKeluar);
      });
    }
    const sisaStok = masuk - keluarLain - jumlahKeluar;
    setValues((v) => {
      const patch = {};
      if (String(v.totalNilai || "") !== String(totalNilai)) patch.totalNilai = String(totalNilai);
      if (String(v.sisaStok || "") !== String(sisaStok)) patch.sisaStok = String(sisaStok);
      return Object.keys(patch).length ? { ...v, ...patch } : v;
    });
  }, [schema.key, values.jumlahKeluar, values.hargaSatuan, values.namaBarang, values.gudang, allData, initial]);

  // Auto-calc: Kartu Piutang (Harga Setelah Diskon & Saldo Piutang cumulative)
  useEffect(() => {
    if (schema.key !== "kartupiutang") return;

    const toNumber = (v) => { const n = Number(String(v || "").replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
    const hargaResmi = toNumber(values.hargaResmi);
    const diskon = toNumber(values.diskon);
    const hargaSetelahDiskon = hargaResmi - diskon;
    // Saldo cumulative: (hargaSetelahDiskon current) - sum(debet prev) + sum(kredit prev) - debet + kredit
    const list = (allData && allData.kartupiutang) || [];
    const nama = String(values.namaPembeli || "").trim().toLowerCase();
    const blok = String(values.blokUnit || "").trim().toLowerCase();
    const curId = initial ? initial.id : null;
    const curTgl = String(values.tanggal || "");
    let prevDebet = 0, prevKredit = 0, hargaAwal = hargaSetelahDiskon;
    if (nama) {
      list.forEach((r) => {
        if (curId && r.id === curId) return;
        const rn = String(r.namaPembeli || "").trim().toLowerCase();
        const rb = String(r.blokUnit || "").trim().toLowerCase();
        const rp = String(r.proyek || "").trim().toLowerCase();
        const proyek = String(values.proyek || "").trim().toLowerCase();
        if (rn !== nama || rb !== blok || rp !== proyek) return;
        const rTgl = String(r.tanggal || "");
        if (curTgl && rTgl && rTgl > curTgl) return;
        prevDebet += toNumber(r.debet);
        prevKredit += toNumber(r.kredit);
        const rh = toNumber(r.hargaSetelahDiskon);
        if (rh > hargaAwal) hargaAwal = rh;
      });
    }
    const debet = toNumber(values.debet);
    const kredit = toNumber(values.kredit);
    const saldo = hargaAwal - (prevDebet + debet) + (prevKredit + kredit);
    setValues((v) => {
      const patch = {};
      if (String(v.hargaSetelahDiskon || "") !== String(hargaSetelahDiskon)) patch.hargaSetelahDiskon = String(hargaSetelahDiskon);
      if (String(v.saldo || "") !== String(saldo)) patch.saldo = String(saldo);
      return Object.keys(patch).length ? { ...v, ...patch } : v;
    });
  }, [schema.key, values.hargaResmi, values.diskon, values.debet, values.kredit, values.namaPembeli, values.blokUnit, values.proyek, values.tanggal, allData, initial]);

  // Auto-calc: Kartu Barang Masuk (Total Nilai & Saldo Stok cumulative)
  useEffect(() => {
    if (schema.key !== "kartubarangmasuk") return;
    const toNumber = (v) => { const n = Number(String(v || "").replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
    const masuk = toNumber(values.jumlahMasuk);
    const keluar = toNumber(values.jumlahKeluar);
    const hargaSatuan = toNumber(values.hargaSatuan);
    const qty = masuk > 0 ? masuk : keluar;
    const totalNilai = Math.round(qty * hargaSatuan);
    // Saldo stok cumulative per (proyek + namaBarang + gudang)
    const list = (allData && allData.kartubarangmasuk) || [];
    const proyek = String(values.proyek || "").trim().toLowerCase();
    const namaBarang = String(values.namaBarang || "").trim().toLowerCase();
    const gudang = String(values.gudang || "").trim().toLowerCase();
    const curId = initial ? initial.id : null;
    const curTgl = String(values.tanggal || "");
    let prevSaldo = 0;
    if (namaBarang) {
      list.forEach((r) => {
        if (curId && r.id === curId) return;
        const rn = String(r.namaBarang || "").trim().toLowerCase();
        const rp = String(r.proyek || "").trim().toLowerCase();
        const rg = String(r.gudang || "").trim().toLowerCase();
        if (rn !== namaBarang) return;
        if (proyek && rp && rp !== proyek) return;
        if (gudang && rg && rg !== gudang) return;
        const rTgl = String(r.tanggal || "");
        if (curTgl && rTgl && rTgl > curTgl) return;
        prevSaldo += toNumber(r.jumlahMasuk) - toNumber(r.jumlahKeluar);
      });
    }
    const saldoStok = prevSaldo + masuk - keluar;
    setValues((v) => {
      const patch = {};
      if (String(v.totalNilai || "") !== String(totalNilai)) patch.totalNilai = String(totalNilai);
      if (String(v.saldoStok || "") !== String(saldoStok)) patch.saldoStok = String(saldoStok);
      return Object.keys(patch).length ? { ...v, ...patch } : v;
    });
  }, [schema.key, values.jumlahMasuk, values.jumlahKeluar, values.hargaSatuan, values.namaBarang, values.proyek, values.gudang, values.tanggal, allData, initial]);

  // Auto-calc: Pengajuan KPR (Plafon KPR = Harga Rumah - Uang Muka)
  useEffect(() => {
    if (schema.key !== "pengajuankpr") return;
    const toNumber = (v) => { const n = Number(String(v || "").replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
    const nilaiRumah = toNumber(values.nilaiRumah);
    const uangMuka = toNumber(values.uangMuka);
    const plafon = nilaiRumah - uangMuka;
    setValues((v) => (String(v.plafondKPR || "") === String(plafon) ? v : { ...v, plafondKPR: String(plafon) }));
  }, [schema.key, values.nilaiRumah, values.uangMuka]);

  // Auto-calc: Tagihan (Sisa Tagihan = nominal - dibayar) & Status
  useEffect(() => {
    if (schema.key !== "tagihan") return;
    const toNumber = (v) => { const n = Number(String(v || "").replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
    const jumlah = toNumber(values.jumlah);
    if (!jumlah) return;
    // Auto-derive status berdasarkan tanggal jatuhTempo vs hari ini (hanya untuk record baru / status kosong)
    const jt = String(values.jatuhTempo || "");
    if (!jt || (initial && initial.status)) return;
    const today = new Date().toISOString().slice(0, 10);
    let status = "Belum Bayar";
    if (jt < today) status = "Terlambat";
    setValues((v) => (v.status === status ? v : { ...v, status }));
  }, [schema.key, values.jumlah, values.jatuhTempo, initial]);

  useEffect(() => {
    if (schema.key !== "generatesurat") return;
    const jenis = String(values.jenisSurat || "").trim();
    if (!jenis) return;
    const tpl = GENERATE_SURAT_TEMPLATE_MAP[jenis];
    if (!tpl) return;

    setValues((prev) => {
      const next = { ...prev };
      let changed = false;

      if (!String(prev.perihal || "").trim() && tpl.perihal) {
        next.perihal = tpl.perihal;
        changed = true;
      }
      if (!String(prev.isiRingkas || "").trim() && tpl.isiRingkas) {
        next.isiRingkas = tpl.isiRingkas;
        changed = true;
      }
      if (!String(prev.pemberitahuanKe || "").trim() && tpl.pemberitahuanKe) {
        next.pemberitahuanKe = tpl.pemberitahuanKe;
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [schema.key, values.jenisSurat]);

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_SIZE) {
      setUploadError(`File "${file.name}" melebihi 8MB - gunakan file yang lebih kecil.`);
      return;
    }
    setUploadError("");
    setUploading(true);
    try {
      const base64 = await readFileAsBase64(file);
      const meta = await gsCall("uploadFile", schema.key, file.name, file.type, base64);
      setValues((v) => ({ ...v, lampiran: [...(v.lampiran || []), meta] }));
      // Auto-arsip file upload (kecuali entitas Arsip Dokumen itu sendiri agar tidak rekursif).
      if (schema.key !== "arsipdokumen") {
        const refCandidate = values.nomorSurat || values.nomorSpk || values.nomorSPK || values.nomor || values.judulDokumen || values.namaPembeli || (initial && initial.id) || "";
        archivePrintedDocument({
          judul: `${schema.label} - ${file.name}`,
          kategori: `Upload ${schema.label}`,
          proyek: values.proyek || values.namaProyek || "",
          entitas: schema.label,
          nomorRef: String(refCandidate),
          sourceKey: `upload:${schema.key}`,
          sourceId: meta && meta.id ? String(meta.id) : file.name,
        });
      }
    } catch (err) {
      setUploadError("Gagal mengunggah file. Periksa koneksi & coba lagi.");
    } finally {
      setUploading(false);
    }
  };
  const handleRemoveAttachment = (file) => {
    setValues((v) => ({ ...v, lampiran: (v.lampiran || []).filter((f) => f.id !== file.id) }));
    gsCall("deleteFile", schema.key, file.id).catch(() => {});
  };

  return (
    <div className="kbr-modal-overlay" onClick={onCancel}>
      <div className="kbr-modal kbr-modal-form" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15.5, color: C.ink }}>{initial ? `Edit ${schema.label}` : `Tambah ${schema.label}`}</div>
          <button onClick={onCancel} className="kbr-icon-btn" aria-label="Tutup" style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: 6 }}>
            <X size={18} />
          </button>
        </div>
        <div className="kbr-form-grid" style={{ padding: "18px 20px", overflowY: "auto" }}>
          {schema.fields.map((f) => {
            const fieldOptions = getFieldOptions(schema, f, allData);
            const listId = f.ref ? `dl-${schema.key}-${f.key}` : undefined;
            const refOptions = f.ref ? resolveRefOptions(f.ref, allData, { values, schemaKey: schema.key, fieldKey: f.key }) : [];
            const isCurrencyField = schema.key === "budgetkonstruksi" && (f.key === "anggaran" || f.key === "realisasi");
            const autoHint = (AUTO_CALC_HINTS[schema.key] || {})[f.key];
            const isAuto = !!autoHint;
            const inputStyle = isCurrencyField
              ? { ...currencyInputStyle, ...(isAuto ? autoInputStyle : {}) }
              : { ...formInputStyle, ...(isAuto ? autoInputStyle : {}) };
            return (
              <label key={f.key} className={isFullWidthField(f) ? "kbr-field-wide" : ""} style={{ display: "block" }}>
                <span style={fieldLabelStyle}>
                  {f.label}
                  {f.required && " *"}
                  {isAuto && (
                    <span style={{ marginLeft: 6, fontSize: 9.5, fontWeight: 700, color: "#3B7A28", background: "#E4F1DC", padding: "2px 6px", borderRadius: 999, letterSpacing: "0.04em" }}>
                      ⚡ AUTO
                    </span>
                  )}
                </span>
                {f.type === "select" ? (
                  <select className="kbr-input" value={values[f.key]} onChange={(e) => setField(f.key, e.target.value)} style={inputStyle} disabled={isAuto}>
                    {fieldOptions.map((o) => (
                      <option key={o || "default"} value={o}>{getFieldOptionLabel(schema, f, o, allData)}</option>
                    ))}
                  </select>
                ) : (
                  <>
                    <div style={{ position: "relative" }}>
                      {isCurrencyField && (
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12.5, fontWeight: 700, color: C.navy, pointerEvents: "none" }}>Rp</span>
                      )}
                      <input
                        className="kbr-input"
                        type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "password" ? "password" : "text"}
                        value={values[f.key]}
                        onChange={(e) => setField(f.key, e.target.value)}
                        style={inputStyle}
                        list={listId}
                        autoComplete="off"
                        readOnly={isAuto}
                        inputMode={f.type === "number" ? "numeric" : undefined}
                        placeholder={f.type === "password" ? (initial ? "Biarkan kosong jika tidak diubah" : "Minimal 8 karakter") : isCurrencyField ? "0" : (f.ref ? "Pilih data terintegrasi" : undefined)}
                      />
                    </div>
                    {autoHint && (
                      <div style={{ fontSize: 10.8, color: "#4A7A3A", marginTop: 4, marginLeft: 2, fontStyle: "italic" }}>
                        Formula: {autoHint}
                      </div>
                    )}
                    {listId && (
                      <datalist id={listId}>
                        {refOptions.map((opt) => (
                          <option key={opt} value={opt} />
                        ))}
                      </datalist>
                    )}
                    {f.ref && (
                      <span style={{ display: "block", marginTop: 6, fontSize: 11, color: C.mutedLight }}>
                        {refOptions.length > 0 ? `${refOptions.length} opsi referensi terintegrasi tersedia.` : "Belum ada data referensi yang cocok. Lengkapi master data terkait terlebih dahulu."}
                      </span>
                    )}
                  </>
                )}
              </label>
            );
          })}

          <div className="kbr-field-wide">
            <span style={fieldLabelStyle}>{isTaxForm ? "Bukti Pembayaran" : "Lampiran Dokumen"}</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(values.lampiran || []).length === 0 && (
                <div style={{ fontSize: 12.5, color: C.mutedLight }}>Belum ada file dilampirkan.</div>
              )}
              {(values.lampiran || []).map((file) => (
                <div key={file.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: C.page, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                  <Paperclip size={14} color={C.muted} />
                  <a href={file.url} target="_blank" rel="noreferrer" style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: C.blue, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {file.name}
                  </a>
                  <button type="button" onClick={() => handleRemoveAttachment(file)} className="kbr-icon-btn" style={{ background: "none", border: "none", color: C.red, cursor: "pointer", padding: 4 }} aria-label="Hapus lampiran">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <label style={{ ...ghostBtn, width: "fit-content", opacity: uploading ? 0.6 : 1, pointerEvents: uploading ? "none" : "auto" }}>
                <Paperclip size={14} /> {uploading ? "Mengunggah..." : "Lampirkan File"}
                <input type="file" onChange={handleFileChange} style={{ display: "none" }} disabled={uploading} />
              </label>
              {uploadError && <div style={{ fontSize: 11.5, color: C.red }}>{uploadError}</div>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 20px", borderTop: `1px solid ${C.border}` }}>
          {formulaValidationError && <div style={{ flex: 1, fontSize: 11.5, color: C.red, alignSelf: "center" }}>{formulaValidationError}</div>}
          <button onClick={onCancel} style={ghostBtn}>Batal</button>
          <button onClick={() => onSubmit(values)} disabled={requiredMissing || uploading || !!formulaValidationError} style={{ ...primaryBtn, opacity: requiredMissing || uploading || formulaValidationError ? 0.45 : 1, cursor: requiredMissing || uploading || formulaValidationError ? "default" : "pointer" }}>
            <Save size={14} /> Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------- Kop surat resmi PT Kolaka Bumi Realty (dipakai di semua fitur cetak) ----------
const KOP_SURAT_INFO = {
  tagline: "Developer & Contraktor",
  alamat: "Office : Jl. Repelita No. 54 · Telp (0405) 2321613 · HP 0852 4197 4777",
  email: "Email : kolakakbr@gmail.com",
  telepon: "Telp (0405) 2321613 · HP 0852 4197 4777",
  emailSingkat: "Email : kolakakbr@gmail.com",
};

// Info bank & kota untuk template surat tagihan piutang (bisa disesuaikan tanpa mengubah render).
const BANK_INFO = {
  kota: "Kolaka",
  bank: "Bank BRI",
  cabang: "Cabang Kolaka",
  atasNama: "PT. KOLAKA BUMI REALTY",
  noRekening: "0000-01-000000-00-0",
  hpKeuangan: "0852 4197 4777",
  divisi: "Div Keuangan",
  manajerKeuangan: "MANAGER KEUANGAN",
  jabatanPenandatangan: "Manager Keuangan",
};

const KOP_SURAT_STYLE = `
  .kop-kbr { display: flex; align-items: center; border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 12px; }
  .kop-kbr img { width: 78px; height: 78px; object-fit: contain; margin-right: 14px; padding: 4px; background: #fff; }
  .kop-kbr .co { flex: 1; text-align: left; font-family: "Times New Roman", Times, serif; color: #000; }
  .kop-kbr .co h1 { margin: 0; font-size: 22pt; font-weight: 700; }
  .kop-kbr .co .tag { font-style: italic; font-size: 11pt; margin-top: 2px; }
  .kop-kbr .co .addr { font-size: 10.5pt; margin-top: 3px; }
`;

function buildKopSuratHtml() {
  const companyName = "PT Kolaka Bumi Realty";
  const logo = escapeHtml(BRAND.logoSrc || "");
  const tagline = escapeHtml(KOP_SURAT_INFO.tagline);
  const alamat = escapeHtml(KOP_SURAT_INFO.alamat);
  const email = escapeHtml(KOP_SURAT_INFO.email);
  return `
    <div class="kop-kbr">
      ${logo ? `<img src="${logo}" alt="Logo">` : ""}
      <div class="co">
        <h1>${companyName}</h1>
        <div class="tag">${tagline}</div>
        <div class="addr">${alamat}</div>
        <div class="addr">${email}</div>
      </div>
    </div>
  `;
}

function buildGenerateSuratPrintHtml(record, dataAll) {
  const jenisRaw = String(record.jenisSurat || "").trim();
  const nomorSurat = escapeHtml(record.nomorSurat || "-");
  const jenisSurat = escapeHtml(jenisRaw || "-");
  const tanggalSurat = escapeHtml(formatTanggal(record.tanggalSurat) || "-");
  const namaPihak = escapeHtml(record.namaPihak || "-");
  const idPihak = escapeHtml(record.ID_Pihak || "-");
  const nomorUnit = escapeHtml(record.nomorUnit || "-");
  const idUnit = escapeHtml(record.ID_Unit || "-");
  const proyek = escapeHtml(record.proyek || "-");
  const perihal = escapeHtml(record.perihal || "-");
  const isiRingkas = escapeHtml(record.isiRingkas || "-").replace(/\n/g, "<br>");
  const penandatangan = escapeHtml(record.penandatangan || "-");
  const periodeTagihan = escapeHtml(record.periodeTagihan || "-");
  const tanggalJatuhTempo = escapeHtml(formatTanggal(record.tanggalJatuhTempo) || "-");
  const nominalTagihan = escapeHtml(formatRupiah(record.nominalTagihan || 0));
  const companyName = escapeHtml(BRAND.fullName || "Perusahaan");
  const companyLine = escapeHtml(BRAND.companyLine || "");
  const companyShort = escapeHtml(BRAND.shortName || "Perusahaan");
  const tanggalHariIni = tanggalSurat;
  const customTemplate = getCustomSuratTemplates(dataAll).find((template) => template.id === record.customTemplateId);

  const style = `
    @page { size: A4; margin: 18mm 18mm 20mm 18mm; }
    body { font-family: "Times New Roman", Times, serif; color: #111; line-height: 1.5; }
    ${KOP_SURAT_STYLE}
    .judul { text-align: center; margin: 10px 0 16px; }
    .judul .jenis { font-size: 14pt; font-weight: 700; text-transform: uppercase; }
    .judul .nomor { font-size: 11pt; margin-top: 4px; }
    .meta { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11pt; }
    .meta td { padding: 2px 0; vertical-align: top; }
    .meta td:first-child { width: 160px; }
    .isi { font-size: 11.5pt; text-align: justify; min-height: 160px; }
    .box { border: 1px solid #111; padding: 10px 12px; margin: 10px 0; }
    .grid { width: 100%; border-collapse: collapse; margin: 10px 0 14px; }
    .grid th, .grid td { border: 1px solid #111; padding: 6px 8px; font-size: 10.5pt; }
    .grid th { background: #f1f1f1; text-align: left; }
    .ttd-wrap { margin-top: 26px; display: flex; justify-content: flex-end; }
    .ttd { text-align: center; min-width: 220px; }
    .ttd .nama { margin-top: 70px; font-weight: 700; text-decoration: underline; }
    .footer-note { margin-top: 22px; font-size: 9pt; color: #444; }
  `;

  const baseTop = `
    ${buildKopSuratHtml()}
    <div class="judul">
      <div class="jenis">${jenisSurat}</div>
      <div class="nomor">Nomor: ${nomorSurat}</div>
    </div>
  `;

  const baseSign = `
    <div class="ttd-wrap">
      <div class="ttd">
        <div>${tanggalHariIni}</div>
        <div>${companyShort}</div>
        <div class="nama">${penandatangan}</div>
        <div>Penandatangan</div>
      </div>
    </div>
    <div class="footer-note">${escapeHtml(ACTIVE_APP_SETTINGS.templateSurat)}</div>
  `;

  if (customTemplate) {
    const placeholderValues = {
      nomorSurat: record.nomorSurat,
      jenisSurat: record.jenisSurat,
      tanggalSurat: formatTanggal(record.tanggalSurat),
      namaPihak: record.namaPihak,
      ID_Pihak: record.ID_Pihak,
      nomorUnit: record.nomorUnit,
      ID_Unit: record.ID_Unit,
      proyek: record.proyek,
      perihal: record.perihal,
      periodeTagihan: record.periodeTagihan,
      nominalTagihan: formatRupiah(record.nominalTagihan || 0),
      tanggalJatuhTempo: formatTanggal(record.tanggalJatuhTempo),
      pemberitahuanKe: record.pemberitahuanKe,
      kotaSurat: record.kotaSurat,
      nomorSPPR: record.nomorSPPR,
      tanggalSPPR: formatTanggal(record.tanggalSPPR),
      nomorSPJB: record.nomorSPJB,
      tanggalSPJB: formatTanggal(record.tanggalSPJB),
      blokUnit: record.blokUnit,
      isiRingkas: record.isiRingkas,
      penandatangan: record.penandatangan,
      namaPerusahaan: BRAND.fullName,
    };
    const renderedText = String(customTemplate.isi || "").replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (match, key) => (
      Object.prototype.hasOwnProperty.call(placeholderValues, key) ? String(placeholderValues[key] || "-") : match
    ));
    const safeBody = escapeHtml(renderedText).replace(/\r?\n/g, "<br>");
    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${nomorSurat} - ${escapeHtml(customTemplate.nama)}</title>
  <style>${style}</style>
</head>
<body>
  ${buildKopSuratHtml()}
  <div class="isi" style="white-space:normal">${safeBody}</div>
  ${baseSign}
</body>
</html>`;
  }

  let bodySection = "";

  if (jenisRaw === "Draft SPK Rumah Subsidi") {
    bodySection = `
      <table class="meta">
        <tr><td>Tanggal</td><td>: ${tanggalSurat}</td></tr>
        <tr><td>Pekerjaan</td><td>: ${perihal}</td></tr>
        <tr><td>Proyek</td><td>: ${proyek}</td></tr>
        <tr><td>Unit</td><td>: ${nomorUnit} (ID: ${idUnit})</td></tr>
        <tr><td>Pelaksana / Pihak</td><td>: ${namaPihak} (ID: ${idPihak})</td></tr>
      </table>
      <div class="box">
        <strong>Ruang Lingkup Pekerjaan</strong><br>
        ${isiRingkas}
      </div>
      <table class="grid">
        <tr><th>Item</th><th>Keterangan</th></tr>
        <tr><td>Target Mulai</td><td>${tanggalSurat}</td></tr>
        <tr><td>Lokasi Kerja</td><td>${proyek} - Unit ${nomorUnit}</td></tr>
        <tr><td>Catatan Teknis</td><td>Dilaksanakan sesuai spesifikasi dan pengawasan tim proyek.</td></tr>
      </table>
      <div class="isi">
        Dengan diterbitkannya SPK ini, pelaksana wajib menyelesaikan pekerjaan sesuai mutu, waktu, dan ketentuan yang disepakati.
      </div>
    `;
  } else if (jenisRaw === "Form SPPR Royal Paradise") {
    bodySection = `
      <table class="meta">
        <tr><td>Tanggal Form</td><td>: ${tanggalSurat}</td></tr>
        <tr><td>Nama Pemohon</td><td>: ${namaPihak}</td></tr>
        <tr><td>ID Pihak</td><td>: ${idPihak}</td></tr>
        <tr><td>Unit Diajukan</td><td>: ${nomorUnit} (ID: ${idUnit})</td></tr>
        <tr><td>Proyek</td><td>: ${proyek}</td></tr>
      </table>
      <div class="box">
        <strong>Ringkasan Pengajuan SPPR</strong><br>
        ${isiRingkas}
      </div>
      <table class="grid">
        <tr><th>Checklist Dokumen</th><th>Status</th></tr>
        <tr><td>KTP, KK, NPWP</td><td>Lengkapi</td></tr>
        <tr><td>Data Penghasilan</td><td>Lengkapi</td></tr>
        <tr><td>Dokumen Unit/Proyek</td><td>Lengkapi</td></tr>
      </table>
      <div class="isi">
        Form ini menjadi dasar proses verifikasi awal pengajuan pembiayaan sebelum dilanjutkan ke tahapan bank/notaris.
      </div>
    `;
  } else if (jenisRaw === "SPJB RPD" || jenisRaw === "Surat Perjanjian Jual Beli") {
    bodySection = `
      <table class="meta">
        <tr><td>Tanggal Perjanjian</td><td>: ${tanggalSurat}</td></tr>
        <tr><td>Nomor SPJB</td><td>: ${nomorSurat}</td></tr>
        <tr><td>Pihak Pembeli</td><td>: ${namaPihak} (ID: ${idPihak})</td></tr>
        <tr><td>Objek</td><td>: Unit ${nomorUnit} pada proyek ${proyek}</td></tr>
        <tr><td>Perihal</td><td>: ${perihal}</td></tr>
      </table>
      <div class="isi">
        Pada hari ini para pihak sepakat mengikatkan diri dalam perjanjian jual beli dengan ketentuan pokok sebagai berikut:<br><br>
        1. Para pihak sepakat terhadap objek jual beli sebagaimana tertera pada data unit/proyek.<br>
        2. Tata cara pembayaran, jadwal, dan ketentuan keterlambatan mengikuti kesepakatan transaksi yang berlaku.<br>
        3. Penyerahan dokumen legal dilakukan setelah kewajiban pembayaran terpenuhi sesuai ketentuan.<br><br>
        Ketentuan tambahan:<br>${isiRingkas}
      </div>
    `;
  } else if (jenisRaw === "Surat Tagihan Piutang") {
    // ----- Format khusus mengikuti template "Surat Tagihan Piutang" (Surat Pemberitahuan Jatuh Tempo) -----
    const d = dataAll || {};
    const rawNama = String(record.namaPihak || "").trim();
    const rawUnit = String(record.nomorUnit || "").trim();
    // Auto-resolve referensi SPPR dari master Pengajuan KPR (nomor & tanggal SPK dipakai sebagai SPPR).
    const kprMatch = (d.pengajuankpr || []).find(
      (r) =>
        String(r.namaPembeli || "").trim().toLowerCase() === rawNama.toLowerCase() ||
        String(r.nomorUnit || "").trim().toLowerCase() === rawUnit.toLowerCase()
    ) || {};
    // Auto-resolve referensi SPJB (PPJB) dari master Booking/Transaksi.
    const trxMatch = (d.transaksi || []).find(
      (r) =>
        String(r.namaPembeli || "").trim().toLowerCase() === rawNama.toLowerCase() ||
        String(r.nomorUnit || "").trim().toLowerCase() === rawUnit.toLowerCase()
    ) || {};
    const proyekMaster = (d.proyek || []).find((p) => String(p.namaProyek || "").trim().toLowerCase() === String(record.proyek || "").trim().toLowerCase()) || {};

    const pemberitahuanKe = escapeHtml(record.pemberitahuanKe || "I");
    const halTagihan = `Pemberitahuan ${pemberitahuanKe} Jatuh Tempo`;
    const tanggalSuratIndo = escapeHtml(formatTanggalIndo(record.tanggalSurat) || "-");
    const kota = escapeHtml(record.kotaSurat || proyekMaster.kota || BANK_INFO.kota || "Kolaka");

    // Rangkai "Pembeli Rumah {NAMA_PROYEK} {BLOK-UNIT}"
    const proyekDisplay = escapeHtml((record.proyek || proyekMaster.namaProyek || "-")).toUpperCase();
    const unitDisplay = escapeHtml((record.blokUnit || record.nomorUnit || "-")).toUpperCase();
    const alamatPembeliBaris = `Pembeli Rumah ${proyekDisplay} ${unitDisplay}`;

    // Referensi SPPR & SPJB
    const nomorSPPR = escapeHtml(record.nomorSPPR || kprMatch.nomorSPK || "-");
    const tglSPPR = escapeHtml(formatTanggal(record.tanggalSPPR || kprMatch.tanggalSPK) || "-");
    const nomorSPJB = escapeHtml(record.nomorSPJB || trxMatch.nomorPPJB || trxMatch.nomor || "-");
    const tglSPJB = escapeHtml(formatTanggal(record.tanggalSPJB || trxMatch.tanggalPPJB) || "-");

    // Nominal + terbilang otomatis
    const nominalNum = Number(String(record.nominalTagihan || 0).replace(/[^0-9.-]/g, "")) || 0;
    const nominalTeks = escapeHtml(nominalNum > 0 ? `Rp. ${formatRupiahAngkaSaja(nominalNum)},-` : "Rp. -");
    const terbilangTeks = escapeHtml(nominalNum > 0 ? `${angkaKeTeksBulat(nominalNum)} Rupiah` : "-");
    const tglJatuhTempoBiasa = escapeHtml(formatTanggal(record.tanggalJatuhTempo) || "-");

    // Info bank & tandatangan (dari BANK_INFO — bisa disesuaikan di constants).
    const bankLine = escapeHtml(`${BANK_INFO.bank} ${BANK_INFO.cabang}`);
    const bankAtasNama = escapeHtml(`a/n ${BANK_INFO.atasNama},  A/C ${BANK_INFO.noRekening}`);
    const hpKeu = escapeHtml(BANK_INFO.hpKeuangan);
    const divKeu = escapeHtml(BANK_INFO.divisi);
    const ttdNama = escapeHtml(record.penandatangan || BANK_INFO.manajerKeuangan);
    const ttdJabatan = escapeHtml(BANK_INFO.jabatanPenandatangan);

    bodySection = `
      <table class="tagihan-header">
        <tr>
          <td style="width:60%;vertical-align:top">
            <table class="no-hal">
              <tr><td>No</td><td>:</td><td>${nomorSurat}</td></tr>
              <tr><td>Hal</td><td>:</td><td><b>${halTagihan}</b></td></tr>
            </table>
          </td>
          <td style="width:40%;text-align:right;vertical-align:top">
            ${kota}, ${tanggalSuratIndo}
          </td>
        </tr>
      </table>

      <div class="tagihan-tujuan">
        Kepada Yth.<br>
        Bpk/Ibu/Sdr. <b>${namaPihak.toUpperCase()}</b><br>
        ${alamatPembeliBaris}<br>
        Di tempat
      </div>

      <div class="tagihan-body">
        <p>Dengan hormat,</p>
        <p style="text-align:justify">
          Bersama ini kami sampaikan bahwa berdasarkan pencatatan kami yang mengacu pada
          <b>SPPR</b> (Surat Pesanan Pembelian Rumah) <b>No. ${nomorSPPR}</b> tgl <b>${tglSPPR}</b>
          dan/atau <b>SPJB</b> (Surat Perikatan Jual Beli) <b>No. ${nomorSPJB}</b> tgl <b>${tglSPJB}</b>
          yang telah bpk/ibu/sdr tanda-tangani, ada kewajiban angsuran pembayaran sebesar ;
        </p>

        <p style="text-align:center;margin:14px 0">
          <b>${nominalTeks}</b> ( ${terbilangTeks} )<br>
          yang telah jatuh tempo pada tanggal <b>${tglJatuhTempoBiasa}</b>.
        </p>

        <p style="text-align:justify">
          Untuk itu dalam Surat Pemberitahuan ${pemberitahuanKe} Jatuh Tempo ini kami mengingatkan bpk/ibu/sdr
          untuk segera menjalankan kewajiban pembayaran dengan cara membayar secara tunai ke kantor
          pemasaran kami, atau dengan cara mentransfer/menyetor ke rekening kami sbb ;
        </p>

        <table class="tagihan-bank">
          <tr><td>Bank</td><td>:</td><td><b>${bankLine}</b></td></tr>
          <tr><td>Rek.</td><td>:</td><td>${bankAtasNama}</td></tr>
        </table>

        <p style="text-align:justify">
          Dan kemudian bukti setor/transfer dikirimkan ke kami (HP/WA <b>${hpKeu}</b>) cq. ${divKeu}.
        </p>

        <p style="text-align:justify">
          Apabila kewajiban pembayaran tersebut diatas ternyata sudah bpk/ibu/sdr lakukan,
          kami mohon maaf dan surat ini diabaikan saja.
        </p>

        <p style="text-align:justify">
          Demikian surat pemberitahuan ini kami sampaikan, atas perhatian serta kerjasamanya
          kami mengucapkan terima kasih.
        </p>
      </div>

      <div class="tagihan-ttd">
        <div class="ttd-block">
          <div>Hormat kami,</div>
          <div><b>${companyShort}</b></div>
          <div style="height:60px"></div>
          <div class="nama-ttd"><b><u>${ttdNama}</u></b></div>
          <div>${ttdJabatan}</div>
        </div>
      </div>

      <div class="tagihan-tembusan">
        Tembusan : &nbsp; - Direktur ${companyShort} &nbsp; - Manajer Pemasaran ${proyekDisplay} &nbsp; - Arsip
      </div>
    `;

    // Layout khusus tagihan piutang — tidak pakai judul besar & ttd default.
    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${nomorSurat} - ${halTagihan}</title>
  <style>
    ${style}
    .tagihan-header { width:100%; border-collapse:collapse; margin:8px 0 14px; font-size:11.5pt; }
    .tagihan-header .no-hal { border-collapse:collapse; }
    .tagihan-header .no-hal td { padding:1px 4px; vertical-align:top; }
    .tagihan-header .no-hal td:first-child { width:34px; }
    .tagihan-header .no-hal td:nth-child(2) { width:10px; }
    .tagihan-tujuan { margin:6px 0 12px; font-size:11.5pt; line-height:1.55; }
    .tagihan-body { font-size:11.5pt; line-height:1.6; }
    .tagihan-body p { margin:8px 0; }
    .tagihan-bank { margin:8px 0 8px 24px; border-collapse:collapse; font-size:11.5pt; }
    .tagihan-bank td { padding:2px 6px; vertical-align:top; }
    .tagihan-bank td:first-child { width:60px; }
    .tagihan-bank td:nth-child(2) { width:10px; }
    .tagihan-ttd { margin-top:22px; display:flex; justify-content:flex-end; }
    .tagihan-ttd .ttd-block { min-width:260px; text-align:left; font-size:11.5pt; line-height:1.55; }
    .tagihan-ttd .nama-ttd { margin-top:2px; }
    .tagihan-tembusan { margin-top:28px; font-size:10pt; color:#000; border-top:1px dashed #444; padding-top:8px; }
  </style>
</head>
<body>
  ${buildKopSuratHtml()}
  ${bodySection}
</body>
</html>`;
  } else {
    bodySection = `
      <table class="meta">
        <tr><td>Tanggal</td><td>: ${tanggalSurat}</td></tr>
        <tr><td>Perihal</td><td>: ${perihal}</td></tr>
        <tr><td>Nama Pihak</td><td>: ${namaPihak} (ID: ${idPihak})</td></tr>
        <tr><td>Unit</td><td>: ${nomorUnit} (ID: ${idUnit})</td></tr>
        <tr><td>Proyek</td><td>: ${proyek}</td></tr>
      </table>
      <div class="isi">
        Dengan ini kami menerangkan bahwa:<br><br>
        ${isiRingkas}<br><br>
        Demikian surat ini dibuat untuk dipergunakan sebagaimana mestinya.
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${nomorSurat} - ${jenisSurat}</title>
  <style>${style}</style>
</head>
<body>
  ${baseTop}
  ${bodySection}
  ${baseSign}
</body>
</html>`;
}

function printGenerateSurat(record, dataAll) {
  const r = record || {};
  const judul = r.jenisSurat || "Surat";
  const nomor = r.nomorSurat || "";
  openDocumentPreview(buildGenerateSuratPrintHtml(r, dataAll || {}), `${judul}${nomor ? " - " + nomor : ""}`, {
    kategori: judul,
    proyek: r.proyek || "",
    entitas: "Generate Surat",
    nomorRef: nomor,
    sourceKey: "generatesurat",
    sourceId: r.id || "",
  });
}

// ---------- Cetak SPK Borong Upah (format sesuai template Excel PT. Kolaka Bumi Realty) ----------
const NAMA_HARI = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
const NAMA_BULAN = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
const NAMA_BULAN_KAPITAL = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function terbilangAngka(n) {
  n = Math.floor(Math.abs(Number(n) || 0));
  if (n === 0) return "nol";
  const satuan = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  function tigaAngka(x) {
    let s = "";
    if (x >= 100) {
      if (Math.floor(x / 100) === 1) s += "seratus ";
      else s += satuan[Math.floor(x / 100)] + " ratus ";
      x = x % 100;
    }
    if (x >= 20) {
      s += satuan[Math.floor(x / 10)] + " puluh ";
      x = x % 10;
      if (x > 0) s += satuan[x] + " ";
    } else if (x >= 12) {
      s += satuan[x - 10] + " belas ";
    } else if (x > 0) {
      s += satuan[x] + " ";
    }
    return s.trim();
  }
  let hasil = "";
  const triliun = Math.floor(n / 1e12);
  const miliar = Math.floor((n % 1e12) / 1e9);
  const juta = Math.floor((n % 1e9) / 1e6);
  const ribu = Math.floor((n % 1e6) / 1e3);
  const sisa = n % 1000;
  if (triliun > 0) hasil += tigaAngka(triliun) + " triliun ";
  if (miliar > 0) hasil += tigaAngka(miliar) + " miliar ";
  if (juta > 0) hasil += tigaAngka(juta) + " juta ";
  if (ribu > 0) hasil += (ribu === 1 ? "seribu" : tigaAngka(ribu) + " ribu") + " ";
  if (sisa > 0) hasil += tigaAngka(sisa);
  return hasil.trim();
}

function angkaKeTeksBulat(n) {
  const kata = terbilangAngka(n);
  return kata.charAt(0).toUpperCase() + kata.slice(1);
}

function tanggalKeTerbilang(tglStr) {
  if (!tglStr) return { hari: "-", tanggalTerbilang: "-", bulan: "-", tahunTerbilang: "-", masehi: "-" };
  const d = new Date(tglStr);
  if (isNaN(d.getTime())) return { hari: "-", tanggalTerbilang: "-", bulan: "-", tahunTerbilang: "-", masehi: "-" };
  const hari = NAMA_HARI[d.getDay()];
  const tgl = d.getDate();
  const bulan = NAMA_BULAN[d.getMonth()];
  const tahun = d.getFullYear();
  const tanggalTerbilang = angkaKeTeksBulat(tgl).toUpperCase();
  const tahunTerbilang = angkaKeTeksBulat(tahun).replace(/\s+/g, " ").toUpperCase();
  const masehi = String(tgl).padStart(2, "0") + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + tahun;
  return { hari, tanggalTerbilang, bulan, tahunTerbilang, masehi };
}

function formatTanggalIndo(tglStr) {
  if (!tglStr) return "-";
  const d = new Date(tglStr);
  if (isNaN(d.getTime())) return "-";
  return `${d.getDate()} ${NAMA_BULAN_KAPITAL[d.getMonth()]} ${d.getFullYear()}`;
}

function buildSpkBorongPrintHtml(record) {
  const r = record || {};
  const t = tanggalKeTerbilang(r.tanggalSpk);
  const nilai = Number(r.nilaiBorongan || 0);
  const ppnPersen = Number(r.ppnPersen != null ? r.ppnPersen : 11);
  const ppnNilai = Number(r.ppnNilai != null && r.ppnNilai !== "" ? r.ppnNilai : Math.round(nilai * ppnPersen / 100));
  const total = Number(r.totalNilai != null && r.totalNilai !== "" ? r.totalNilai : nilai + ppnNilai);
  const terbilangText = r.terbilang && String(r.terbilang).trim() ? String(r.terbilang) : `# ${angkaKeTeksBulat(total)} Rupiah #`;
  const p1 = {
    nama: escapeHtml(r.pihak1Nama || "-"),
    jabatan: escapeHtml(r.pihak1Jabatan || "-"),
    atasNama: escapeHtml(r.pihak1AtasNama || BRAND.fullName || "-"),
    alamat: escapeHtml(r.pihak1Alamat || ""),
  };
  const p2 = {
    nama: escapeHtml(r.pihak2Nama || "-"),
    jabatan: escapeHtml(r.pihak2Jabatan || "Kontraktor / Pemborong"),
    nik: escapeHtml(r.pihak2Nik || "-"),
    hp: escapeHtml(r.pihak2HpWa || "-"),
    alamat: escapeHtml(r.pihak2Alamat || "-"),
  };
  const nomor = escapeHtml(r.nomorSpk || "-");
  const proyek = escapeHtml(r.proyek || "-");
  const lokasi = escapeHtml(r.lokasiProyek || "-");
  const jenis = escapeHtml(r.jenisPekerjaan || "-");
  const blok = escapeHtml(r.blokUnit || "");
  const hargaSatuan = escapeHtml(r.hargaSatuan || "");
  const jenisFull = blok || hargaSatuan
    ? `${jenis}${blok ? " — Blok " + blok : ""}${hargaSatuan ? " (" + hargaSatuan + ")" : ""}`
    : jenis;
  const waktuHari = r.waktuPelaksanaanHari ? Number(r.waktuPelaksanaanHari) : 180;
  const waktuText = `${waktuHari} (${terbilangAngka(waktuHari)}) hari`;
  const mulai = formatTanggalIndo(r.tanggalMulai);
  const selesai = formatTanggalIndo(r.tanggalSelesai);
  const masaPmlh = r.masaPemeliharaanHari ? Number(r.masaPemeliharaanHari) : 90;
  const tp = [
    r.termin1Persen != null && r.termin1Persen !== "" ? Number(r.termin1Persen) : 15,
    r.termin2Persen != null && r.termin2Persen !== "" ? Number(r.termin2Persen) : 20,
    r.termin3Persen != null && r.termin3Persen !== "" ? Number(r.termin3Persen) : 20,
    r.termin4Persen != null && r.termin4Persen !== "" ? Number(r.termin4Persen) : 20,
    r.termin5Persen != null && r.termin5Persen !== "" ? Number(r.termin5Persen) : 20,
    r.termin6Persen != null && r.termin6Persen !== "" ? Number(r.termin6Persen) : 2.5,
    r.termin7Persen != null && r.termin7Persen !== "" ? Number(r.termin7Persen) : 2.5,
  ];
  const tempatCetak = escapeHtml(r.tempatDibuat || "Kolaka");
  const tanggalCetak = escapeHtml(formatTanggalIndo(r.tanggalSpk));
  const ketentuanExtra = escapeHtml(r.ketentuanTambahan || "").replace(/\n/g, "<br>");

  const style = `
    @page { size: A4; margin: 15mm 18mm 18mm 18mm; }
    body { font-family: "Arial Narrow", "Arial", sans-serif; color: #111; font-size: 11pt; line-height: 1.35; }
    ${KOP_SURAT_STYLE}
    .judul { text-align: center; margin: 8px 0 12px; }
    .judul .title { font-size: 14pt; font-weight: 700; letter-spacing: 0.08em; }
    .judul .nomor { font-size: 11pt; margin-top: 3px; }
    .pembuka { text-align: justify; margin: 8px 0; }
    .pembuka b { font-weight: 700; }
    .pihak-table { width: 100%; border-collapse: collapse; margin: 4px 0 8px 12px; font-size: 11pt; }
    .pihak-table td { padding: 1px 4px; vertical-align: top; }
    .pihak-table td:first-child { width: 100px; }
    .pihak-table td:nth-child(2) { width: 10px; }
    .selanjutnya { margin: 2px 0 8px 12px; font-size: 11pt; }
    .selanjutnya b { font-weight: 700; }
    .persetujuan { text-align: justify; margin: 8px 0; }
    .rincian { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 11pt; }
    .rincian td { padding: 2px 4px; vertical-align: top; }
    .rincian td.no { width: 24px; text-align: left; }
    .rincian td.label { width: 165px; }
    .rincian td.colon { width: 12px; }
    .rincian td b { font-weight: 700; }
    .nilai-table { width: 100%; border-collapse: collapse; margin: 4px 0; font-size: 11pt; }
    .nilai-table td { padding: 2px 6px; }
    .nilai-table td.label { width: 220px; }
    .nilai-table td.colon { width: 12px; }
    .nilai-table td.amt { text-align: right; width: 160px; }
    .termin-table { width: 100%; border-collapse: collapse; margin: 4px 0 4px 20px; font-size: 11pt; }
    .termin-table td { padding: 1px 4px; vertical-align: top; }
    .termin-table td.no { width: 130px; font-weight: 600; }
    .ket-list { margin: 4px 0 0 20px; font-size: 11pt; }
    .ket-list .item { display: flex; margin-bottom: 4px; text-align: justify; }
    .ket-list .item .letter { width: 22px; font-weight: 600; }
    .ket-list .item .body { flex: 1; }
    .penutup { margin: 10px 0 6px; text-align: justify; }
    .ttd-wrap { display: flex; justify-content: space-between; margin-top: 14px; }
    .ttd { text-align: center; min-width: 240px; }
    .ttd .nama { margin-top: 60px; font-weight: 700; text-decoration: underline; }
    .ttd .jab { font-size: 10.5pt; margin-top: 2px; }
    .footer-note { margin-top: 20px; font-size: 8.5pt; color: #555; text-align: center; }
    b { font-weight: 700; }
  `;

  const companyName = escapeHtml(BRAND.fullName || "PT. KOLAKA BUMI REALTY");
  const companyLine = escapeHtml(BRAND.companyLine || "");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>SPK Borong Upah - ${nomor}</title>
  <style>${style}</style>
</head>
<body>
  ${buildKopSuratHtml()}
  <div class="judul">
    <div class="title">SURAT PERINTAH KERJA</div>
    <div class="nomor">No. ${nomor}</div>
  </div>

  <div class="pembuka">
    Pada hari ini <b>${t.hari}</b>, tanggal <b>${t.tanggalTerbilang}</b>, bulan <b>${t.bulan}</b> tahun <b>${t.tahunTerbilang}</b> (${t.masehi}), yang bertanda-tangan dibawah ini :
  </div>

  <table class="pihak-table">
    <tr><td>Nama</td><td>:</td><td><b>${p1.nama}</b></td></tr>
    <tr><td>Jabatan</td><td>:</td><td>${p1.jabatan}</td></tr>
    <tr><td>Alamat</td><td>:</td><td>${p1.alamat || p1.atasNama}</td></tr>
  </table>
  <div class="selanjutnya">
    Dalam hal ini bertindak dalam jabatannya tersebut diatas, untuk dan atas nama <b>${p1.atasNama}</b>.<br>
    - Selanjutnya disebut sebagai <b>PIHAK PERTAMA</b>
  </div>

  <table class="pihak-table">
    <tr><td>Nama</td><td>:</td><td><b>${p2.nama}</b></td></tr>
    <tr><td>Jabatan</td><td>:</td><td>${p2.jabatan}</td></tr>
    <tr><td>N I K</td><td>:</td><td>${p2.nik}</td></tr>
    <tr><td>No HP / WA</td><td>:</td><td>${p2.hp}</td></tr>
    <tr><td>Alamat</td><td>:</td><td>${p2.alamat}</td></tr>
  </table>
  <div class="selanjutnya">
    - Selanjutnya disebut sebagai <b>PIHAK KEDUA</b>
  </div>

  <div class="persetujuan">
    Berdasarkan persetujuan bersama, maka dengan ini PIHAK PERTAMA memerintahkan kepada PIHAK KEDUA untuk segera melaksanakan pekerjaan dengan uraian syarat-syarat serta ketentuan sebagai berikut :
  </div>

  <table class="rincian">
    <tr><td class="no">1.</td><td class="label">Nama Proyek</td><td class="colon">:</td><td><b>${proyek}</b></td></tr>
    <tr><td class="no">2.</td><td class="label">Lokasi Proyek</td><td class="colon">:</td><td>${lokasi}</td></tr>
    <tr><td class="no">3.</td><td class="label">Jenis Pekerjaan</td><td class="colon">:</td><td><b>${jenisFull}</b></td></tr>
    <tr><td class="no">4.</td><td class="label">Nilai Borongan</td><td class="colon">:</td><td>
      <table class="nilai-table">
        <tr><td class="label">Nilai Borongan</td><td class="colon">:</td><td class="amt">Rp ${formatRupiahAngkaSaja(nilai)}</td></tr>
        <tr><td class="label">PPN ${ppnPersen}%</td><td class="colon">:</td><td class="amt">Rp ${formatRupiahAngkaSaja(ppnNilai)}</td></tr>
        <tr><td class="label"><b>Total</b></td><td class="colon">:</td><td class="amt"><b>Rp ${formatRupiahAngkaSaja(total)}</b></td></tr>
        <tr><td class="label">Terbilang</td><td class="colon">:</td><td class="amt"><b>${escapeHtml(terbilangText)}</b></td></tr>
      </table>
    </td></tr>
    <tr><td class="no">5.</td><td class="label">Waktu Pelaksanaan</td><td class="colon">:</td><td>${waktuText}<br>${mulai !== "-" && selesai !== "-" ? mulai + " s/d " + selesai : ""}</td></tr>
    <tr><td class="no">6.</td><td class="label">Masa Pemeliharaan</td><td class="colon">:</td><td>${masaPmlh} (${terbilangAngka(masaPmlh)}) hari</td></tr>
    <tr><td class="no">7.</td><td class="label">Cara Pembayaran</td><td class="colon">:</td><td>
      <table class="termin-table">
        <tr><td class="no">Termin ke I (${tp[0]}%)</td><td>- DP saat SPK ditandatangani</td></tr>
        <tr><td class="no">Termin ke II (${tp[1]}%)</td><td>- setelah progress pekerjaan minimal mencapai <b>20%</b></td></tr>
        <tr><td class="no">Termin ke III (${tp[2]}%)</td><td>- setelah progress pekerjaan minimal mencapai <b>40%</b></td></tr>
        <tr><td class="no">Termin ke IV (${tp[3]}%)</td><td>- setelah progress pekerjaan minimal mencapai <b>60%</b></td></tr>
        <tr><td class="no">Termin ke V (${tp[4]}%)</td><td>- setelah progress pekerjaan minimal mencapai <b>80%</b></td></tr>
        <tr><td class="no">Termin ke VI (${tp[5]}%)</td><td>- setelah masa pemeliharaan hari ke-1 s/d ${Math.floor(masaPmlh)}</td></tr>
        <tr><td class="no">Termin ke VII (${tp[6]}%)</td><td>- setelah masa pemeliharaan hari ke-${Math.floor(masaPmlh)} s/d ${Math.floor(masaPmlh) * 2}</td></tr>
      </table>
    </td></tr>
    <tr><td class="no">8.</td><td class="label">Ketentuan lain-lain</td><td class="colon">:</td><td>
      <div class="ket-list">
        <div class="item"><div class="letter">a.</div><div class="body">Harga satuan tetap dan tidak berubah sesuai dengan harga negosiasi dan sudah termasuk seluruh pekerjaan yang ada didalam Gambar Pelaksanaan dan Spesifikasi yang telah ditanda-tangani bersama.</div></div>
        <div class="item"><div class="letter">b.</div><div class="body">Pekerjaan harus dilaksanakan selambat-lambatnya setelah 7 (tujuh) hari dari tanggal penanda-tanganan SPK dan jika tidak dikerjakan maka secara otomatis SPK ini dinyatakan batal.</div></div>
        <div class="item"><div class="letter">c.</div><div class="body">Pengajuan pembelian material harus dilakukan paling lambat H-1 sebelum dilaksanakan pekerjaan, dengan melampirkan data hitungan atau dokumen pendukung seperlunya.</div></div>
        <div class="item"><div class="letter">d.</div><div class="body">Apabila terjadi keterlambatan penyelesaian pekerjaan akan dikenakan denda keterlambatan sebesar 0,1% per hari dari nilai borongan total, yang akan dipotongkan ke termin pembayaran terdekat.</div></div>
        <div class="item"><div class="letter">e.</div><div class="body">Boleh mengajukan kasbon mingguan tiap hari Sabtu.</div></div>
        ${ketentuanExtra ? `<div class="item"><div class="letter">f.</div><div class="body">${ketentuanExtra}</div></div>` : ""}
      </div>
    </td></tr>
  </table>

  <div class="penutup">
    Demikian Surat Perintah Kerja ini dibuat untuk dapat dilaksanakan dengan sebaik-baiknya.
  </div>

  <div style="text-align:right; margin-top:6px;">${tempatCetak}, ${tanggalCetak}</div>

  <div class="ttd-wrap">
    <div class="ttd">
      <div><b>PIHAK KEDUA</b></div>
      <div class="jab">${p2.jabatan}</div>
      <div class="nama">${p2.nama}</div>
    </div>
    <div class="ttd">
      <div><b>PIHAK PERTAMA</b></div>
      <div class="jab">${p1.jabatan}</div>
      <div class="nama">${p1.nama}</div>
    </div>
  </div>

  <div class="footer-note">${escapeHtml(ACTIVE_APP_SETTINGS.templateSpk)}</div>
</body>
</html>`;
}

function formatRupiahAngkaSaja(n) {
  const num = Number(n) || 0;
  return num.toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

// Universal preview + print — inject toolbar sticky di atas HTML dokumen
function openDocumentPreview(html, title, archiveMeta) {
  // Jangan pakai "noopener": sesuai spesifikasi HTML, window.open() akan mengembalikan null
  // sehingga dokumen tidak pernah bisa ditulis. Isi jendela dibuat sendiri oleh aplikasi ini.
  const win = window.open("", "_blank", "width=1000,height=800");
  if (!win) {
    pushToast("Jendela cetak diblokir browser. Izinkan popup untuk situs ini, lalu coba lagi.", "warning");
    return;
  }
  const safeTitle = String(title || "Dokumen").replace(/</g, "&lt;");
  const toolbar = `
<div id="kbr-print-toolbar" style="position:sticky;top:0;background:#0A1930;color:#fff;padding:10px 16px;display:flex;gap:10px;align-items:center;font-family:system-ui,Segoe UI,Arial,sans-serif;z-index:99999;box-shadow:0 2px 8px rgba(0,0,0,.25)">
  <div style="flex:1;font-size:13.5px;font-weight:600">Preview: ${safeTitle}</div>
  <button onclick="window.print()" style="background:#2952B6;color:#fff;border:0;padding:8px 16px;border-radius:6px;font-weight:600;cursor:pointer;font-size:13px">&#128424; Cetak PDF</button>
  <button onclick="window.close()" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,.45);padding:8px 14px;border-radius:6px;cursor:pointer;font-size:13px">Tutup</button>
</div>
<style>@media print { #kbr-print-toolbar { display:none !important; } }</style>`;
  const injected = /<body[^>]*>/i.test(html)
    ? html.replace(/<body([^>]*)>/i, (m, attrs) => `<body${attrs}>${toolbar}`)
    : `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${safeTitle}</title></head><body>${toolbar}${html}</body></html>`;
  win.document.open();
  win.document.write(injected);
  win.document.close();
  win.focus();
  if (archiveMeta) {
    archivePrintedDocument({ judul: title, ...archiveMeta });
  }
}

// Registrasi handler diisi oleh App component; call ini menambahkan record ke menu Arsip Dokumen.
function archivePrintedDocument(meta) {
  const m = meta || {};
  const judul = String(m.judul || "Dokumen").trim() || "Dokumen";
  const setuju = window.confirm(`Setujui arsip otomatis untuk dokumen ini?\n\n${judul}`);
  if (!setuju) return Promise.resolve({ ok: false, canceled: true });
  try {
    if (typeof window.__kbrArchiveDocument === "function") {
      return window.__kbrArchiveDocument(m);
    }
  } catch (e) {}
  return Promise.resolve({ ok: false });
}

function printSpkBorong(record) {
  const r = record || {};
  openDocumentPreview(buildSpkBorongPrintHtml(r), `SPK Borong Upah - ${r.nomorSpk || ""}`, {
    kategori: "SPK Borong Upah",
    proyek: r.proyek || "",
    entitas: "SPK Borong Upah",
    nomorRef: r.nomorSpk || "",
    sourceKey: "spkborong",
    sourceId: r.id || "",
  });
}

// ---------- Surat Keterangan Pesanan Rumah (auto-generate dari Pengajuan KPR) ----------
function buildSuratPesananRumahHtml(record, dataAll) {
  const r = record || {};
  const d = dataAll || {};
  // Auto-resolve dari master pembeli
  const pembeliMaster = (d.pembeli || []).find((p) => String(p.nama || "").trim() === String(r.namaPembeli || "").trim()) || {};
  // Auto-resolve dari master unit
  const unitMaster = (d.unit || []).find((u) => String(u.nomorUnit || "").trim() === String(r.nomorUnit || "").trim()) || {};
  // Auto-resolve dari master proyek
  const proyekMaster = (d.proyek || []).find((p) => String(p.namaProyek || "").trim() === String(r.proyek || "").trim()) || {};

  const nama = escapeHtml(r.namaPembeli || pembeliMaster.nama || "-");
  const alamat = escapeHtml(r.alamatPembeli || pembeliMaster.alamat || "-");
  const telepon = escapeHtml(r.teleponPembeli || pembeliMaster.telepon || "-");
  const tipe = escapeHtml(
    r.tipeRumah ||
      (unitMaster.tipe && (unitMaster.luasBangunan || unitMaster.luasTanah)
        ? `${unitMaster.tipe}${unitMaster.luasTanah ? "/" + unitMaster.luasTanah : ""}`
        : unitMaster.tipe || "-")
  );
  const blokUnit = escapeHtml(r.blokUnit || r.nomorUnit || unitMaster.nomorUnit || "-");
  const namaPerumahan = escapeHtml(r.namaPerumahan || r.proyek || proyekMaster.namaProyek || "-");
  const kelurahan = escapeHtml(r.kelurahan || "-");
  const kecamatan = escapeHtml(r.kecamatan || "-");
  const kabupaten = escapeHtml(r.kabupaten || "-");
  const hargaJual = Number(r.nilaiRumah || 0);
  const uangMuka = Number(r.uangMuka || 0);
  const plafonKpr = Number(r.plafondKPR != null && r.plafondKPR !== "" ? r.plafondKPR : Math.max(0, hargaJual - uangMuka));
  const tglPesanan = r.tanggalPesanan || r.tanggalSPK || new Date().toISOString().slice(0, 10);
  const tanggalTampil = formatTanggalIndo(tglPesanan);
  const tempatCetak = escapeHtml(kabupaten !== "-" ? kabupaten : "Kolaka");
  const penerima = escapeHtml(r.penerimaPesanan || "H. MUH. DUWANA SAID");
  const bankNama = escapeHtml(r.bank || "");

  const style = `
    @page { size: A4; margin: 18mm 20mm; }
    body { font-family: "Times New Roman", Times, serif; font-size: 12pt; color: #000; margin: 0; padding: 0; }
    ${KOP_SURAT_STYLE}
    .judul { text-align: center; margin: 18px 0 14px; }
    .judul .t { font-weight: 700; font-size: 15pt; text-decoration: underline; letter-spacing: 1px; }
    .isi { text-align: justify; line-height: 1.55; margin: 0 0 10px; }
    table.data { margin: 6px 0 10px 12px; border-collapse: collapse; }
    table.data td { padding: 2px 6px; vertical-align: top; font-size: 12pt; }
    table.data td.lbl { width: 90px; }
    table.data td.col { width: 12px; }
    .body-teks { text-align: justify; line-height: 1.6; margin: 8px 0; }
    table.harga { margin: 4px 0 4px 12px; border-collapse: collapse; }
    table.harga td { padding: 2px 8px; font-size: 12pt; }
    table.harga td.lbl { width: 130px; }
    table.harga td.col { width: 12px; }
    table.harga td.amt { text-align: left; }
    .tempat-tgl { text-align: right; margin: 20px 0 6px; }
    .ttd { display: flex; justify-content: space-between; margin-top: 10px; }
    .ttd .col { text-align: center; width: 46%; }
    .ttd .col .head { font-size: 11.5pt; }
    .ttd .col .nama { margin-top: 70px; font-weight: 700; text-decoration: underline; }
    .ttd .col .jab { font-size: 10.5pt; margin-top: 2px; font-style: italic; }
    .footer-note { margin-top: 22px; font-size: 8.5pt; color: #555; text-align: center; }
    b { font-weight: 700; }
  `;

  const companyName = escapeHtml(BRAND.fullName || "PT. KOLAKA BUMI REALTY");
  const noSurat = escapeHtml(r.nomorSPK || "");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Surat Keterangan Pesanan Rumah - ${nama}</title>
  <style>${style}</style>
</head>
<body>
  ${buildKopSuratHtml()}

  <div class="judul">
    <div class="t">SURAT KETERANGAN PESANAN RUMAH</div>
    ${noSurat ? `<div style="margin-top:4px;font-size:11pt">No. ${noSurat}</div>` : ""}
  </div>

  <div class="isi">
    Berdasarkan surat Penawaran rumah kepada <b>${companyName}</b>, maka dengan ini kami menerangkan bahwa :
  </div>

  <table class="data">
    <tr><td class="lbl">Nama</td><td class="col">:</td><td><b>${nama}</b></td></tr>
    <tr><td class="lbl">Alamat</td><td class="col">:</td><td>${alamat}</td></tr>
    <tr><td class="lbl">Telepon</td><td class="col">:</td><td>${telepon}</td></tr>
  </table>

  <div class="body-teks">
    Benar-benar ingin membeli rumah type <b>${tipe}</b> Di Perumahan <b>${namaPerumahan}</b> Blok <b>${blokUnit}</b>, Kelurahan/Desa <b>${kelurahan}</b>, Kecamatan <b>${kecamatan}</b>, Kabupaten <b>${kabupaten}</b>${bankNama ? `, melalui skema <b>KPR ${bankNama}</b>` : ""} dengan harga sebagai berikut :
  </div>

  <table class="harga">
    <tr><td class="lbl">Harga Jual</td><td class="col">:</td><td class="amt"><b>Rp. ${formatRupiahAngkaSaja(hargaJual)}</b></td></tr>
    <tr><td class="lbl">Uang Muka</td><td class="col">:</td><td class="amt">Rp. ${formatRupiahAngkaSaja(uangMuka)}</td></tr>
    <tr><td class="lbl">KPR</td><td class="col">:</td><td class="amt">Rp. ${formatRupiahAngkaSaja(plafonKpr)}</td></tr>
  </table>

  <div class="tempat-tgl">${tempatCetak}, ${tanggalTampil}</div>

  <div class="ttd">
    <div class="col">
      <div class="head">Yang Menerima Pesanan</div>
      <div class="nama">${penerima}</div>
      <div class="jab">Penjual / Developer</div>
    </div>
    <div class="col">
      <div class="head">Pemesan</div>
      <div class="nama">${nama}</div>
      <div class="jab">&nbsp;</div>
    </div>
  </div>

  <div class="footer-note">Dokumen ini dihasilkan otomatis dari modul Pengajuan KPR &mdash; ${companyName}.</div>
</body>
</html>`;
}

function previewSuratPesananRumah(record, dataAll) {
  const r = record || {};
  const nama = r.namaPembeli || "Pemesan";
  openDocumentPreview(buildSuratPesananRumahHtml(r, dataAll || {}), `Surat Keterangan Pesanan Rumah - ${nama}`, {
    kategori: "Surat Keterangan Pesanan Rumah",
    proyek: r.proyek || r.namaPerumahan || "",
    entitas: "Pengajuan KPR",
    nomorRef: r.nomorSPK || nama,
    sourceKey: "pengajuankpr",
    sourceId: r.id || "",
  });
}

// ---------- Kuitansi Penerimaan resmi (kop surat + blok kuitansi + 2 tanda tangan) ----------
function buildKuitansiPrintHtml(record, dataAll) {
  const r = record || {};
  const d = dataAll || {};

  const pembeliMaster = (d.pembeli || []).find((p) => String(p.nama || "").trim().toLowerCase() === String(r.namaPembeli || "").trim().toLowerCase()) || {};
  const unitMaster = (d.unit || []).find((u) => String(u.nomorUnit || "").trim().toLowerCase() === String(r.nomorUnit || "").trim().toLowerCase()) || {};
  const proyekMaster = (d.proyek || []).find((p) => String(p.namaProyek || "").trim().toLowerCase() === String(r.proyek || "").trim().toLowerCase()) || {};

  const nominal = Number(String(r.nominal || 0).replace(/[^0-9.-]/g, "")) || 0;
  const terbilangTeks = String(r.terbilang || "").trim() || (nominal > 0 ? `${angkaKeTeksBulat(nominal)} Rupiah` : "-");

  const nomor = escapeHtml(r.nomorKuitansi || "-");
  const nama = escapeHtml(r.namaPembeli || pembeliMaster.nama || "-");
  const alamat = escapeHtml(pembeliMaster.alamat || "-");
  const unit = escapeHtml(r.nomorUnit || "-");
  const tipeUnit = escapeHtml(unitMaster.tipe || "");
  const proyek = escapeHtml(r.proyek || proyekMaster.namaProyek || "-");
  const jenis = escapeHtml(r.jenisPenerimaan || "-");
  const periode = escapeHtml(r.periode || "");
  const metode = escapeHtml(r.metodeBayar || "-");
  const bank = escapeHtml(r.bank || "");
  const rekening = escapeHtml(r.nomorRekening || "");
  const penerima = escapeHtml(r.penerima || "-");
  const disetujui = escapeHtml(r.disetujuiOleh || "-");
  const catatan = escapeHtml(r.catatan || "");
  const statusKuitansi = String(r.status || "").trim();
  const statusApproval = String(r.statusApproval || "").trim();

  const kota = escapeHtml(proyekMaster.kota || BANK_INFO.kota || "Kolaka");
  const tanggalTampil = escapeHtml(formatTanggalIndo(r.tanggal) || "-");
  const companyShort = escapeHtml(BRAND.shortName || "Perusahaan");

  const objekPembayaran = [
    jenis,
    unit !== "-" ? `Unit ${unit}${tipeUnit ? ` (Tipe ${tipeUnit})` : ""}` : "",
    proyek !== "-" ? `Proyek ${proyek}` : "",
    periode ? `Periode ${periode}` : "",
  ].filter(Boolean).join("<br>");

  const caraBayar = [metode, bank, rekening ? `No. Rek. ${rekening}` : ""].filter((v) => v && v !== "-").join(" &mdash; ") || "-";
  const batal = statusKuitansi.toLowerCase() === "batal";

  const style = `
    @page { size: A4; margin: 14mm 16mm; }
    body { font-family: "Times New Roman", Times, serif; color: #000; font-size: 12pt; line-height: 1.5; margin: 0; }
    ${KOP_SURAT_STYLE}
    .kwt-wrap { position: relative; border: 1.5px solid #000; padding: 16px 20px 20px; margin-top: 6px; }
    .kwt-judul { text-align: center; margin-bottom: 14px; }
    .kwt-judul .t { font-size: 20pt; font-weight: 700; letter-spacing: 5px; }
    .kwt-judul .n { font-size: 11pt; margin-top: 2px; }
    table.kwt { width: 100%; border-collapse: collapse; }
    table.kwt td { padding: 5px 4px; vertical-align: top; font-size: 12pt; }
    table.kwt td.lbl { width: 165px; }
    table.kwt td.col { width: 14px; }
    .kwt-terbilang { border: 1px solid #000; background: #F2F2F2; padding: 8px 12px; font-style: italic; font-weight: 700; }
    .kwt-foot { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 22px; gap: 20px; }
    .kwt-nominal { border: 2px solid #000; padding: 10px 20px; font-size: 16pt; font-weight: 700; white-space: nowrap; }
    .kwt-ttd-group { display: flex; gap: 42px; text-align: center; }
    .kwt-ttd { min-width: 165px; }
    .kwt-ttd .nama { margin-top: 62px; font-weight: 700; text-decoration: underline; }
    .kwt-ttd .jab { font-size: 10pt; font-style: italic; }
    .kwt-tempat { text-align: right; margin-bottom: 4px; font-size: 11.5pt; }
    .kwt-catatan { margin-top: 16px; font-size: 10pt; border-top: 1px dashed #666; padding-top: 6px; }
    .kwt-stempel { position: absolute; top: 96px; right: 34px; border: 3px double #C00; color: #C00; padding: 6px 18px; font-size: 18pt; font-weight: 700; letter-spacing: 3px; transform: rotate(-14deg); opacity: 0.75; }
    .kwt-lembar { margin-top: 10px; text-align: center; font-size: 9pt; color: #444; }
  `;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Kuitansi ${nomor} - ${nama}</title>
  <style>${style}</style>
</head>
<body>
  ${buildKopSuratHtml()}

  <div class="kwt-wrap">
    ${batal ? '<div class="kwt-stempel">BATAL</div>' : ""}

    <div class="kwt-judul">
      <div class="t">KUITANSI</div>
      <div class="n">No. ${nomor}</div>
    </div>

    <table class="kwt">
      <tr>
        <td class="lbl">Telah Terima Dari</td><td class="col">:</td>
        <td><b>${nama.toUpperCase()}</b>${alamat !== "-" ? `<br><span style="font-size:10.5pt">${alamat}</span>` : ""}</td>
      </tr>
      <tr>
        <td class="lbl">Uang Sejumlah</td><td class="col">:</td>
        <td><div class="kwt-terbilang">${escapeHtml(terbilangTeks)}</div></td>
      </tr>
      <tr>
        <td class="lbl">Untuk Pembayaran</td><td class="col">:</td>
        <td>${objekPembayaran || "-"}</td>
      </tr>
      <tr>
        <td class="lbl">Cara Pembayaran</td><td class="col">:</td>
        <td>${caraBayar}</td>
      </tr>
    </table>

    <div class="kwt-foot">
      <div class="kwt-nominal">Rp ${formatRupiahAngkaSaja(nominal)},-</div>
      <div>
        <div class="kwt-tempat">${kota}, ${tanggalTampil}</div>
        <div class="kwt-ttd-group">
          <div class="kwt-ttd">
            <div>Disetujui Oleh,</div>
            <div class="nama">${disetujui}</div>
            <div class="jab">Manager / Direktur</div>
          </div>
          <div class="kwt-ttd">
            <div>Penerima,</div>
            <div class="nama">${penerima}</div>
            <div class="jab">${companyShort}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="kwt-catatan">
      ${catatan ? `<b>Catatan:</b> ${catatan}<br>` : ""}
      <b>Status:</b> ${escapeHtml(statusKuitansi || "-")}${statusApproval ? ` &middot; <b>Approval:</b> ${escapeHtml(statusApproval)}` : ""}
    </div>
  </div>

  <div class="kwt-lembar">Lembar 1: Pembeli &nbsp;&middot;&nbsp; Lembar 2: Arsip Keuangan &nbsp;&middot;&nbsp; ${escapeHtml(ACTIVE_APP_SETTINGS.templateKuitansi)}</div>
</body>
</html>`;
}

function printKuitansi(record, dataAll) {
  const r = record || {};
  const nomor = r.nomorKuitansi || "";
  openDocumentPreview(buildKuitansiPrintHtml(r, dataAll || {}), `Kuitansi ${nomor}${r.namaPembeli ? " - " + r.namaPembeli : ""}`, {
    kategori: "Kuitansi Penerimaan",
    proyek: r.proyek || "",
    entitas: "Kuitansi Penerimaan",
    nomorRef: nomor,
    sourceKey: "kuitansi",
    sourceId: r.id || "",
  });
}

function buildRecordDetailPrintHtml(schema, record) {
  const s = schema || { label: "Dokumen", fields: [] };
  const r = record || {};
  const rows = (s.fields || []).map((f) => {
    const raw = r[f.key];
    const value = f.key === s.statusField ? String(raw || "-") : String(formatFieldValue(raw, f) || "-");
    return `<tr><td class="lbl">${escapeHtml(f.label || f.key)}</td><td class="colon">:</td><td class="val">${escapeHtml(value)}</td></tr>`;
  }).join("");
  const lampiran = Array.isArray(r.lampiran) && r.lampiran.length
    ? r.lampiran.map((f, i) => `<li>${i + 1}. ${escapeHtml(f.name || "Lampiran")}</li>`).join("")
    : "<li>-</li>";

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(s.label || "Dokumen")}</title>
  <style>
    @page { size: A4; margin: 16mm; }
    body { font-family: "Times New Roman", Times, serif; color: #111; line-height: 1.45; }
    ${KOP_SURAT_STYLE}
    .title { text-align: center; font-size: 14pt; font-weight: 700; margin: 8px 0 14px; text-transform: uppercase; }
    .meta { width: 100%; border-collapse: collapse; }
    .meta td { padding: 4px 0; vertical-align: top; font-size: 11pt; }
    .meta .lbl { width: 34%; font-weight: 700; }
    .meta .colon { width: 18px; text-align: center; }
    .meta .val { width: auto; }
    .lamp { margin-top: 14px; font-size: 11pt; }
    .lamp b { display: block; margin-bottom: 4px; }
    .lamp ul { margin: 0; padding-left: 18px; }
    .footer-note { margin-top: 22px; border-top: 1px solid #999; padding-top: 7px; text-align: center; font-size: 9pt; color: #444; }
  </style>
</head>
<body>
  ${buildKopSuratHtml()}
  <div class="title">${escapeHtml(s.label || "Dokumen")}</div>
  <table class="meta">${rows}</table>
  <div class="lamp">
    <b>Lampiran Dokumen:</b>
    <ul>${lampiran}</ul>
  </div>
  <div class="footer-note">${escapeHtml(ACTIVE_APP_SETTINGS.templateDetail)} &middot; ${escapeHtml(ACTIVE_APP_SETTINGS.footerDokumen)}</div>
</body>
</html>`;
}

// ---------- modal detail/tinjau data (review) + cetak satu record ----------
function RecordDetailModal({ schema, record, onCancel, onEdit, canEdit, allData }) {
  return (
    <div className="kbr-modal-overlay" onClick={onCancel}>
      <div className="kbr-modal kbr-print-area" onClick={(e) => e.stopPropagation()}>
        <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15.5, color: C.ink }}>Tinjau {schema.label}</div>
          <button onClick={onCancel} className="kbr-icon-btn" aria-label="Tutup" style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: 6 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
          <div style={{ display: "none", fontWeight: 800, fontSize: 16, color: "#000" }} className="kbr-print-title">
            {schema.label}
          </div>
          {schema.fields.map((f) => (
            <div key={f.key} style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>
              <span style={{ fontSize: 12.5, color: C.muted, fontWeight: 600 }}>{f.label}</span>
              <span style={{ fontSize: 13, color: C.ink, fontWeight: 600, textAlign: "right" }}>
                {f.key === schema.statusField ? <StatusBadge status={record[f.key]} /> : formatFieldValue(record[f.key], f)}
              </span>
            </div>
          ))}
          <div>
            <span style={fieldLabelStyle}>Lampiran Dokumen</span>
            {(record.lampiran || []).length === 0 ? (
              <div style={{ fontSize: 12.5, color: C.mutedLight }}>Tidak ada lampiran.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(record.lampiran || []).map((file) => (
                  <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="no-print" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: C.page, border: `1px solid ${C.border}`, borderRadius: 8, textDecoration: "none" }}>
                    <Paperclip size={14} color={C.muted} />
                    <span style={{ fontSize: 12.5, color: C.blue, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 20px", borderTop: `1px solid ${C.border}` }}>
          <button onClick={onCancel} style={ghostBtn}>Tutup</button>
          {schema.key === "generatesurat" && (
            <button onClick={() => printGenerateSurat(record, allData || {})} style={primaryBtn}>
              <Printer size={14} /> Cetak Surat
            </button>
          )}
          {schema.key === "spkborong" && (
            <button onClick={() => printSpkBorong(record)} style={primaryBtn}>
              <Printer size={14} /> Cetak SPK
            </button>
          )}
          {schema.key === "pengajuankpr" && (
            <button onClick={() => previewSuratPesananRumah(record, allData || {})} style={primaryBtn} title="Preview & cetak Surat Keterangan Pesanan Rumah">
              <Printer size={14} /> Preview Surat Pesanan
            </button>
          )}
          {schema.key === "kuitansi" && (
            <button onClick={() => printKuitansi(record, allData || {})} style={primaryBtn} title="Preview & cetak kuitansi resmi">
              <Printer size={14} /> Cetak Kuitansi
            </button>
          )}
          <button onClick={() => {
            const nomorRef = record.nomorSurat || record.nomorSpk || record.nomorSPK || record.nomor || record.id || "";
            const judul = `${schema.label}${nomorRef ? " - " + nomorRef : ""}`;
            archivePrintedDocument({
              judul,
              kategori: schema.label,
              proyek: record.proyek || record.namaProyek || "",
              entitas: schema.label,
              nomorRef: String(nomorRef),
              sourceKey: schema.key,
              sourceId: record.id || "",
            });
            openDocumentPreview(buildRecordDetailPrintHtml(schema, record), judul);
          }} style={ghostBtn}>
            <Printer size={14} /> Cetak
          </button>
          {canEdit && (
            <button onClick={onEdit} style={primaryBtn}>
              <Pencil size={14} /> Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- dialog konfirmasi hapus ----------
function ConfirmDialog({ title, message, onCancel, onConfirm }) {
  return (
    <div className="kbr-modal-overlay" onClick={onCancel}>
      <div className="kbr-modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "24px 20px 4px" }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: palette.red.bg, color: palette.red.fg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <Trash2 size={21} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 15.5, color: C.ink, marginBottom: 6 }}>{title}</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{message}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "18px 20px 20px" }}>
          <button onClick={onCancel} style={ghostBtn}>Batal</button>
          <button onClick={onConfirm} style={{ ...primaryBtn, background: C.red }}>
            <Trash2 size={14} /> Ya, Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- halaman modul generik: header + pencarian + tabel + CRUD ----------
function EntityPage({ schema, records, allData, onSave, onDelete, onImport, canWrite }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(() => schema.defaultFilters || {});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState({ key: "", dir: "asc" });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [copying, setCopying] = useState(null);
  const [importReport, setImportReport] = useState(null);
  const [importing, setImporting] = useState(false);
  const [saveStatus, flashSave] = useSaveStatus();

  useEffect(() => {
    setQuery("");
    setFilters(schema.defaultFilters || {});
    setPage(1);
    setSort({ key: "", dir: "asc" });
    setModalOpen(false);
    setEditing(null);
    setViewing(null);
    setConfirmTarget(null);
    setCopying(null);
    setImportReport(null);
  }, [schema.key]);

  const q = query.trim().toLowerCase();
  const filtered = records.filter((r) => {
    const matchesSearch = q ? schema.searchFields.map((f) => String(r[f] || "")).join(" ").toLowerCase().includes(q) : true;
    const matchesFilters = !schema.filterFields || schema.filterFields.every((fieldKey) => {
      const value = filters[fieldKey];
      if (!value) return true;
      const recordValue = String(r[fieldKey] || "").trim().toLowerCase();
      return recordValue === String(value).trim().toLowerCase();
    });
    return matchesSearch && matchesFilters;
  });

  useEffect(() => {
    setPage(1);
  }, [query, filters]);

  const sortField = sort.key ? schema.fields.find((f) => f.key === sort.key) : null;
  const sorted = sortField
    ? [...filtered].sort((a, b) => compareFieldValue(a[sort.key], b[sort.key], sortField) * (sort.dir === "desc" ? -1 : 1))
    : filtered;

  const toggleSort = (key) => {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = pageStart + pageSize;
  const pagedRows = sorted.slice(pageStart, pageEnd);

  const statusFieldDef = schema.statusField ? schema.fields.find((f) => f.key === schema.statusField) : null;
  const statusOptions = (statusFieldDef && Array.isArray(statusFieldDef.options)) ? statusFieldDef.options : [];
  const canQuickApprove = canWrite && statusOptions.indexOf("Disetujui") !== -1 && statusOptions.indexOf("Ditolak") !== -1;

  const handleQuickStatus = async (record, nextStatus) => {
    const label = record[schema.columns[0]] || record.id;
    if (!window.confirm(`Ubah status "${label}" menjadi "${nextStatus}"?`)) return;
    const ok = await onSave({ ...record, [schema.statusField]: nextStatus });
    flashSave(ok);
  };

  const filterOptions = (fieldKey) => {
    if (fieldKey === "proyek") return [...new Set(records.map((r) => String(r.proyek || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "id"));
    if (fieldKey === "unit") return [...new Set(records.map((r) => String(r.unit || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "id"));
    if (fieldKey === "periode") return [...new Set(records.map((r) => String(r.periode || monthKeyFromDate(r.tanggalPengajuan) || "").trim()).filter(Boolean))].sort((a, b) => b.localeCompare(a));
    return [...new Set(records.map((r) => String(r[fieldKey] || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "id"));
  };

  const openNew = () => { setEditing(null); setCopying(null); setModalOpen(true); };
  const openEdit = (r) => { setViewing(null); setEditing(r); setCopying(null); setModalOpen(true); };
  const openCopy = (r) => { const { id, lampiran, ...rest } = r; setViewing(null); setEditing(null); setCopying(rest); setModalOpen(true); };
  const openView = (r) => setViewing(r);

  const handleSubmit = async (formValues) => {
    const record = editing ? { ...editing, ...formValues } : { ...formValues };
    const ok = await onSave(record);
    flashSave(ok);
    if (ok) setModalOpen(false);
  };
  const handleConfirmDelete = async () => {
    const target = confirmTarget;
    setConfirmTarget(null);
    const ok = await onDelete(target.id);
    flashSave(ok);
  };

  const importInputRef = useRef(null);

  const handleImportFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    let text = "";
    try {
      text = await file.text();
    } catch (err) {
      setImportReport({ total: 0, saved: 0, failed: 0, errors: ["File tidak bisa dibaca."] });
      return;
    }
    const parsed = parseCsvToRecords(schema, text);
    if (!parsed.records.length) {
      setImportReport({ total: 0, saved: 0, failed: 0, errors: parsed.errors.length ? parsed.errors : ["Tidak ada baris data yang bisa diimpor."] });
      return;
    }
    const konfirmasi = window.confirm(
      `Impor ${parsed.records.length} baris ke ${schema.label}?` +
      (parsed.errors.length ? `\n\n${parsed.errors.length} baris dilewati karena tidak valid.` : "")
    );
    if (!konfirmasi) return;
    setImporting(true);
    const result = await onImport(parsed.records);
    setImporting(false);
    setImportReport({
      total: parsed.records.length,
      saved: result.saved,
      failed: result.failed,
      errors: parsed.errors.concat(result.errors || []),
    });
    flashSave(result.saved > 0);
  };

  const colCount = schema.columns.length + (schema.statusField ? 1 : 0) + 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={pageTitleStyle}>{schema.label}</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>{records.length} data tercatat</div>
        </div>
        <div className="no-print" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => { if (!filtered.length) { pushToast("Tidak ada data untuk diekspor.", "warning"); return; } exportRecordsToCsv(schema, filtered); pushToast(`${filtered.length} baris diekspor ke CSV.`, "success"); }} style={ghostBtn} title="Ekspor data hasil filter ke CSV">
            <Download size={15} /> Export CSV
          </button>
          {canWrite && (
            <React.Fragment>
              <input ref={importInputRef} type="file" accept=".csv,text/csv" onChange={handleImportFile} style={{ display: "none" }} />
              <button onClick={() => importInputRef.current && importInputRef.current.click()} disabled={importing} style={{ ...ghostBtn, opacity: importing ? 0.6 : 1, cursor: importing ? "wait" : "pointer" }} title="Impor banyak data sekaligus dari file CSV (pakai hasil Export CSV sebagai contoh format)">
                <Upload size={15} /> {importing ? "Mengimpor..." : "Import CSV"}
              </button>
            </React.Fragment>
          )}
          <button onClick={() => {
            const today = new Date().toISOString().slice(0, 10);
            archivePrintedDocument({
              judul: `Daftar ${schema.label} - ${today}`,
              kategori: `Daftar ${schema.label}`,
              proyek: "",
              entitas: schema.label,
              nomorRef: `${filtered.length} baris`,
              sourceKey: schema.key,
              sourceId: "",
            });
            window.print();
          }} style={ghostBtn}>
            <Printer size={15} /> Cetak Data
          </button>
          {canWrite && (
            <button onClick={openNew} style={primaryBtn}>
              <Plus size={15} /> Tambah {schema.label}
            </button>
          )}
        </div>
      </div>

      <div className="kbr-print-area" style={cardBase}>
        <div className="no-print" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          {schema.filterFields && schema.filterFields.map((fieldKey) => (
            <select
              key={fieldKey}
              value={filters[fieldKey] || ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, [fieldKey]: e.target.value }))}
              style={{ ...formInputStyle, minWidth: 150, flex: "0 0 auto" }}
            >
              <option value="">Semua {fieldKey === "proyek" ? "Proyek" : fieldKey === "unit" ? "Unit" : "Periode"}</option>
              {filterOptions(fieldKey).map((option) => <option key={option} value={option}>{fieldKey === "periode" ? monthLabelFromKey(option) || option : option}</option>)}
            </select>
          ))}
        </div>
        <div className="no-print" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#212529" }}>
            Show
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value) || 10); setPage(1); }}
              style={{ ...formInputStyle, width: "auto", minWidth: 68, padding: "6px 8px", fontSize: 13 }}
            >
              {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
            entries
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#212529" }}>
            Search:
            <input
              className="kbr-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ ...formInputStyle, width: 210, padding: "6px 10px" }}
            />
          </label>
        </div>
        <KopSuratPrint />
        <div className="kbr-print-title" style={{ display: "none", fontWeight: 800, fontSize: 16, color: "#000" }}>
          {schema.label}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="kbr-data-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 560 }}>
            <thead>
              <tr className="kbr-thead-row">
                {schema.fields.filter((f) => schema.columns.includes(f.key)).map((f) => (
                  <th key={f.key} onClick={() => toggleSort(f.key)} title="Klik untuk urutkan" style={{ padding: "11px 14px", textAlign: "left", color: "#212529", fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer", userSelect: "none", borderBottom: "2px solid #DEE2E6" }}>
                    {f.label}
                    <span style={{ marginLeft: 6, opacity: sort.key === f.key ? 1 : 0.3, fontSize: 10 }}>{sort.key === f.key && sort.dir === "desc" ? "▼" : "▲"}</span>
                  </th>
                ))}
                {schema.statusField && <th onClick={() => toggleSort(schema.statusField)} title="Klik untuk urutkan" style={{ padding: "11px 14px", textAlign: "left", color: "#212529", fontSize: 12.5, fontWeight: 700, cursor: "pointer", userSelect: "none", borderBottom: "2px solid #DEE2E6" }}>
                  Status
                  <span style={{ marginLeft: 6, opacity: sort.key === schema.statusField ? 1 : 0.3, fontSize: 10 }}>{sort.key === schema.statusField && sort.dir === "desc" ? "▼" : "▲"}</span>
                </th>}
                <th className="no-print" style={{ padding: "11px 14px", textAlign: "center", color: "#212529", fontSize: 12.5, fontWeight: 700, borderBottom: "2px solid #DEE2E6" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <EmptyRow colSpan={colCount} message={q ? `Tidak ada "${schema.label}" yang cocok dengan pencarian "${query}"` : canWrite ? `Belum ada data ${schema.label}. Klik "Tambah ${schema.label}" untuk mulai.` : `Belum ada data ${schema.label}.`} />
              ) : (
                pagedRows.map((r) => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    {schema.fields.filter((f) => schema.columns.includes(f.key)).map((f) => (
                      <td key={f.key} style={{ padding: "12px 14px", fontSize: 13, color: C.ink, whiteSpace: "nowrap" }}>{formatFieldValue(r[f.key], f)}</td>
                    ))}
                    {schema.statusField && <td style={{ padding: "12px 14px" }}><StatusBadge status={r[schema.statusField]} /></td>}
                    <td className="no-print" style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                        <button className="kbr-icon-btn" aria-label="Tinjau" onClick={() => openView(r)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: 6 }}><Eye size={14} /></button>
                        {canQuickApprove && r[schema.statusField] !== "Disetujui" && <button className="kbr-icon-btn" aria-label="Setujui" title="Setujui data ini" onClick={() => handleQuickStatus(r, "Disetujui")} style={{ background: "none", border: "none", color: palette.green.fg, cursor: "pointer", padding: 6 }}><Check size={14} /></button>}
                        {canQuickApprove && r[schema.statusField] !== "Ditolak" && <button className="kbr-icon-btn" aria-label="Tolak" title="Tolak data ini" onClick={() => handleQuickStatus(r, "Ditolak")} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", padding: 6 }}><X size={14} /></button>}
                        {schema.key === "generatesurat" && <button className="kbr-icon-btn" aria-label="Cetak Surat" title="Cetak format surat" onClick={() => printGenerateSurat(r, allData || {})} style={{ background: "none", border: "none", color: C.navy, cursor: "pointer", padding: 6 }}><Printer size={14} /></button>}
                        {schema.key === "spkborong" && <button className="kbr-icon-btn" aria-label="Cetak SPK" title="Cetak Surat Perintah Kerja" onClick={() => printSpkBorong(r)} style={{ background: "none", border: "none", color: C.navy, cursor: "pointer", padding: 6 }}><Printer size={14} /></button>}
                        {schema.key === "pengajuankpr" && <button className="kbr-icon-btn" aria-label="Preview Surat Pesanan" title="Preview & cetak Surat Keterangan Pesanan Rumah" onClick={() => previewSuratPesananRumah(r, allData || {})} style={{ background: "none", border: "none", color: C.navy, cursor: "pointer", padding: 6 }}><Printer size={14} /></button>}
                        {schema.key === "kuitansi" && <button className="kbr-icon-btn" aria-label="Cetak Kuitansi" title="Cetak kuitansi resmi" onClick={() => printKuitansi(r, allData || {})} style={{ background: "none", border: "none", color: C.navy, cursor: "pointer", padding: 6 }}><Printer size={14} /></button>}
                        {canWrite && <button className="kbr-icon-btn" aria-label="Duplikat" title="Duplikat data ini" onClick={() => openCopy(r)} style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", padding: 6 }}><Copy size={14} /></button>}
                        {canWrite && <button className="kbr-icon-btn" aria-label="Edit" onClick={() => openEdit(r)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: 6 }}><Pencil size={14} /></button>}
                        {canWrite && <button className="kbr-icon-btn" aria-label="Hapus" onClick={() => setConfirmTarget(r)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", padding: 6 }}><Trash2 size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 13, color: "#212529" }}>
              Showing {pageStart + 1} to {Math.min(pageEnd, filtered.length)} of {filtered.length} entries
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} style={{ ...ghostBtn, borderRadius: `${UI.radius}px 0 0 ${UI.radius}px`, padding: "7px 13px", fontSize: 12.5, opacity: safePage <= 1 ? 0.5 : 1 }}>
                Previous
              </button>
              <span style={{ fontSize: 12.5, minWidth: 62, textAlign: "center", color: "#fff", fontWeight: 600, background: UI.primary, border: `1px solid ${UI.primary}`, padding: "8px 6px" }}>
                {safePage} / {totalPages}
              </span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} style={{ ...ghostBtn, borderRadius: `0 ${UI.radius}px ${UI.radius}px 0`, padding: "7px 13px", fontSize: 12.5, opacity: safePage >= totalPages ? 0.5 : 1 }}>
                Next
              </button>
            </div>
          </div>
        )}
        <div className="no-print" style={{ minHeight: 16 }}><SaveStatus status={saveStatus} /></div>
      </div>

      {modalOpen && <RecordFormModal schema={schema} initial={copying || editing} allData={allData} onCancel={() => { setModalOpen(false); setCopying(null); }} onSubmit={handleSubmit} />}
      {viewing && (
        <RecordDetailModal
          schema={schema}
          record={viewing}
          allData={allData}
          onCancel={() => setViewing(null)}
          canEdit={canWrite}
          onEdit={() => openEdit(viewing)}
        />
      )}
      {confirmTarget && (
        <ConfirmDialog
          title={`Hapus ${schema.label}?`}
          message={`Data "${confirmTarget[schema.columns[0]] || "ini"}" akan dihapus permanen dan tidak bisa dikembalikan.`}
          onCancel={() => setConfirmTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
      {importReport && <ImportReportModal schema={schema} report={importReport} onClose={() => setImportReport(null)} />}
    </div>
  );
}

function ImportReportModal({ schema, report, onClose }) {
  const berhasil = report.saved > 0;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, width: "min(560px, 100%)", maxHeight: "85vh", overflow: "auto", boxShadow: "0 18px 48px rgba(0,0,0,.28)" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          {berhasil ? <Check size={18} color={palette.green.fg} /> : <AlertTriangle size={18} color={C.red} />}
          <div style={{ fontSize: 15, fontWeight: 800, color: C.ink }}>Hasil Import {schema.label}</div>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 120px", background: "#F1F7EE", border: "1px solid #BFD9B5", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 11.5, color: C.muted }}>Berhasil disimpan</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: palette.green.fg }}>{report.saved}</div>
            </div>
            <div style={{ flex: "1 1 120px", background: "#FDF1F0", border: "1px solid #F3C9C5", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 11.5, color: C.muted }}>Dilewati / gagal</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.red }}>{report.errors.length}</div>
            </div>
          </div>
          {report.errors.length > 0 && (
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, marginBottom: 6 }}>Rincian masalah</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: C.muted, display: "flex", flexDirection: "column", gap: 4 }}>
                {report.errors.slice(0, 30).map((msg, i) => <li key={i}>{msg}</li>)}
              </ul>
              {report.errors.length > 30 && <div style={{ fontSize: 12, color: C.mutedLight, marginTop: 6 }}>...dan {report.errors.length - 30} masalah lainnya.</div>}
            </div>
          )}
          <div style={{ fontSize: 12, color: C.mutedLight, lineHeight: 1.6 }}>
            Tips: klik <b>Export CSV</b> lebih dulu untuk mendapatkan contoh format kolom yang benar. Tanggal harus <b>YYYY-MM-DD</b>, angka tanpa titik/koma pemisah ribuan.
          </div>
        </div>
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={primaryBtn}>Tutup</button>
        </div>
      </div>
    </div>
  );
}

const DONUT_COLORS = ["#1F3A66", "#EFA53B", "#1FA97A", "#4C8DF5", "#8B5CF6", "#E0483E"];
const PERIZINAN_STATUS_COLOR = { "Aktif": "#22A55A", "Proses": "#EFA53B", "Menunggu": "#4C8DF5", "Kadaluarsa": "#E0483E" };

/** Selisih hari dari hari ini ke dateStr ("YYYY-MM-DD"). null jika tanggal kosong/tidak valid. */
function daysFromToday(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  const today = new Date(new Date().toDateString());
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

/** Hitung semua angka & daftar yang ditampilkan Dashboard, murni dari data yang sudah ada. */
function computeDashboardStats(data) {
  const proyek = data.proyek || [];
  const clusterproyek = data.clusterproyek || [];
  const progressunit = data.progressunit || [];
  const updateharian = data.updateharian || [];
  const materialrequest = data.materialrequest || [];
  const budgetkonstruksi = data.budgetkonstruksi || [];
  const sertifikat = data.sertifikat || [];
  const perizinan = data.perizinan || [];
  const dokumenlegal = data.dokumenlegal || [];
  const arsipdokumen = data.arsipdokumen || [];
  const prosesbank = data.prosesbank || [];
  const pph = data.pph || [];
  const bphtb = data.bphtb || [];
  const pembayaranGabungan = getCombinedTaxPayments(data);
  const pembeli = data.pembeli || [];
  const tagihan = data.tagihan || [];
  const akadajb = data.akadajb || [];
  const toNumber = (value) => {
    const n = Number(String(value || "").replace(/[^0-9.-]/g, ""));
    return isNaN(n) ? 0 : n;
  };

  const projectMap = {};
  const ensureProject = (name) => {
    const key = String(name || "(Tanpa Proyek)").trim() || "(Tanpa Proyek)";
    if (!projectMap[key]) {
      projectMap[key] = {
        name: key,
        clusterSet: new Set(),
        unitSet: new Set(),
        progressSum: 0,
        progressCount: 0,
        dailyProgressSum: 0,
        dailyProgressCount: 0,
        dailyUpdates: 0,
        materialPending: 0,
        budgetAnggaran: 0,
        budgetRealisasi: 0,
        latestUpdate: "",
        unitDone: 0,
      };
    }
    return projectMap[key];
  };

  proyek.forEach((r) => ensureProject(r.namaProyek || r.proyek || r.nama));
  clusterproyek.forEach((r) => {
    const row = ensureProject(r.proyek);
    if (r.namaCluster) row.clusterSet.add(String(r.namaCluster));
  });
  progressunit.forEach((r) => {
    const row = ensureProject(r.proyek);
    if (r.cluster) row.clusterSet.add(String(r.cluster));
    if (r.unit) row.unitSet.add(String(r.unit));
    const progress = Math.max(0, Math.min(100, toNumber(r.progressPersen)));
    row.progressSum += progress;
    row.progressCount += 1;
    if (String(r.status || "").trim().toLowerCase() === "selesai" || progress >= 100) row.unitDone += 1;
  });
  updateharian.forEach((r) => {
    const row = ensureProject(r.proyek);
    if (r.cluster) row.clusterSet.add(String(r.cluster));
    if (r.unit) row.unitSet.add(String(r.unit));
    const progress = Math.max(0, Math.min(100, toNumber(r.progresHariIni)));
    if (progress > 0) {
      row.dailyProgressSum += progress;
      row.dailyProgressCount += 1;
    }
    row.dailyUpdates += 1;
    if (r.tanggal && (!row.latestUpdate || r.tanggal > row.latestUpdate)) row.latestUpdate = r.tanggal;
  });
  materialrequest.forEach((r) => {
    const row = ensureProject(r.proyek);
    if (r.cluster) row.clusterSet.add(String(r.cluster));
    if (r.unit) row.unitSet.add(String(r.unit));
    const status = String(r.status || "").trim().toLowerCase();
    if (!status || ["diajukan", "disetujui", "dikirim"].indexOf(status) !== -1) row.materialPending += 1;
  });
  budgetkonstruksi.forEach((r) => {
    const row = ensureProject(r.proyek);
    if (r.cluster) row.clusterSet.add(String(r.cluster));
    if (r.unit) row.unitSet.add(String(r.unit));
    row.budgetAnggaran += toNumber(r.anggaran);
    row.budgetRealisasi += toNumber(r.realisasi);
    if (r.tanggalUpdate && (!row.latestUpdate || r.tanggalUpdate > row.latestUpdate)) row.latestUpdate = r.tanggalUpdate;
  });

  const progressProjects = Object.keys(projectMap).map(function (name) {
    var row = projectMap[name];
    var avgProgress = row.progressCount ? (row.progressSum / row.progressCount) : (row.dailyProgressCount ? (row.dailyProgressSum / row.dailyProgressCount) : 0);
    avgProgress = Math.max(0, Math.min(100, avgProgress));
    return {
      name: row.name,
      clusterCount: row.clusterSet.size,
      unitCount: row.unitSet.size || row.progressCount,
      completedUnits: row.unitDone,
      avgProgress: avgProgress,
      dailyUpdates: row.dailyUpdates,
      materialPending: row.materialPending,
      budgetAnggaran: row.budgetAnggaran,
      budgetRealisasi: row.budgetRealisasi,
      budgetSelisih: row.budgetAnggaran - row.budgetRealisasi,
      latestUpdate: row.latestUpdate,
    };
  }).sort(function (a, b) {
    if (b.avgProgress !== a.avgProgress) return b.avgProgress - a.avgProgress;
    return a.name.localeCompare(b.name, "id");
  });

  var totalCluster = clusterproyek.length;
  var totalUnitDipantau = progressunit.length;
  var totalUpdateHarian = updateharian.length;
  var totalMaterialPending = materialrequest.filter(function (r) {
    var status = String(r.status || "").trim().toLowerCase();
    return !status || ["diajukan", "disetujui", "dikirim"].indexOf(status) !== -1;
  }).length;
  var totalBudgetAnggaran = budgetkonstruksi.reduce(function (sum, r) { return sum + toNumber(r.anggaran); }, 0);
  var totalBudgetRealisasi = budgetkonstruksi.reduce(function (sum, r) { return sum + toNumber(r.realisasi); }, 0);
  var totalBudgetSelisih = totalBudgetAnggaran - totalBudgetRealisasi;
  var averageProgress = progressunit.length
    ? progressunit.reduce(function (sum, r) { return sum + Math.max(0, Math.min(100, toNumber(r.progressPersen))); }, 0) / progressunit.length
    : 0;

  const totalDokumen = sertifikat.length + perizinan.length + dokumenlegal.length + arsipdokumen.length;
  const isStatus = (r, val) => String(r.status || "").trim().toLowerCase() === val;

  const statCards = [
    { label: "Total Dokumen", value: totalDokumen, icon: FolderOpen, tone: "blue", targetKey: "dokumenlegal" },
    { label: "Sertifikat Aktif", value: sertifikat.filter((r) => isStatus(r, "aktif")).length, icon: FileCheck, tone: "green", targetKey: "sertifikat" },
    { label: "Perizinan Aktif", value: perizinan.filter((r) => isStatus(r, "aktif")).length, icon: Building2, tone: "brown", targetKey: "perizinan" },
    { label: "Proses Bank (KPR)", value: prosesbank.filter((r) => isStatus(r, "proses")).length, icon: Landmark, tone: "purple", targetKey: "prosesbank" },
    { label: "Pajak Perlu Dibayar", value: pembayaranGabungan.filter((r) => String(r.statusPembayaran || "").toLowerCase() !== "sudah bayar").length, icon: Receipt, tone: "amber", targetKey: "pembayaran" },
    { label: "Pihak Cicilan", value: pembeli.filter((r) => String(r.statusCicilan || "").toLowerCase() === "berjalan").length, icon: Users, tone: "teal", targetKey: "pembeli" },
  ];

  const totalPendapatan = pembayaranGabungan
    .filter((r) => String(r.statusPembayaran || "").trim().toLowerCase() === "sudah bayar")
    .reduce((sum, r) => sum + toNumber(r.nominalPajak), 0);

  const executiveCards = [
    { label: "Total Unit", value: (data.unit || []).length, tone: "blue", icon: Home },
    { label: "Total Penjualan", value: pembeli.length, tone: "teal", icon: TrendingUp },
    { label: "Sertifikat", value: sertifikat.length, tone: "green", icon: FileCheck },
    { label: "Perizinan", value: perizinan.length, tone: "amber", icon: FileText },
    { label: "Tagihan", value: tagihan.length, tone: "red", icon: Receipt },
    { label: "Pendapatan", value: formatRupiah(totalPendapatan), tone: "brown", icon: Landmark },
  ];

  const constructionCards = [
    { label: "Cluster Proyek", valueText: totalCluster.toLocaleString("id-ID"), icon: LayoutGrid, tone: "blue", targetKey: "clusterproyek" },
    { label: "Unit Dipantau", valueText: totalUnitDipantau.toLocaleString("id-ID"), icon: Home, tone: "teal", targetKey: "progressunit" },
    { label: "Update Harian", valueText: totalUpdateHarian.toLocaleString("id-ID"), icon: Calendar, tone: "green", targetKey: "updateharian" },
    { label: "Material Pending", valueText: totalMaterialPending.toLocaleString("id-ID"), icon: Inbox, tone: "amber", targetKey: "materialrequest" },
  ];

  // gabungan dokumen dari 4 modul, dinormalisasi ke bentuk yang sama
  const allDocs = [
    ...sertifikat.map((r) => ({ proyek: r.proyek || "(Tanpa Proyek)", kategori: "Sertifikat", judul: r.nomorSertifikat, tanggal: r.tanggalTerbit, status: r.status })),
    ...perizinan.map((r) => ({ proyek: r.proyek || "(Tanpa Proyek)", kategori: r.jenisIzin || "Perizinan", judul: r.nomorIzin, tanggal: r.tanggalTerbit, status: r.status })),
    ...dokumenlegal.map((r) => ({ proyek: r.proyek || "(Tanpa Proyek)", kategori: r.kategori || "Dokumen Legal", judul: r.judulDokumen, tanggal: r.tanggal, status: r.status })),
    ...arsipdokumen.map((r) => ({ proyek: r.proyek || "(Tanpa Proyek)", kategori: r.kategori || "Arsip", judul: r.judulDokumen, tanggal: r.tanggalArsip, status: "Aktif" })),
  ];

  // donut: ringkasan dokumen per proyek (top 4 proyek + "Lainnya")
  const proyekCounts = {};
  allDocs.forEach((d) => { proyekCounts[d.proyek] = (proyekCounts[d.proyek] || 0) + 1; });
  const proyekEntries = Object.entries(proyekCounts).sort((a, b) => b[1] - a[1]);
  const topProyek = proyekEntries.slice(0, 4).map(([name, value], i) => ({ name, value, color: DONUT_COLORS[i % DONUT_COLORS.length] }));
  const restTotal = proyekEntries.slice(4).reduce((s, [, v]) => s + v, 0);
  const dokumenPerProyek = restTotal > 0 ? [...topProyek, { name: "Lainnya", value: restTotal, color: "#CDD3DC" }] : topProyek;

  // donut: status perizinan
  const statusCounts = {};
  perizinan.forEach((r) => { const s = r.status || "Lainnya"; statusCounts[s] = (statusCounts[s] || 0) + 1; });
  const statusPerizinan = Object.entries(statusCounts).map(([name, value]) => ({
    name, value, color: PERIZINAN_STATUS_COLOR[name] || "#9AA3AF",
    pct: perizinan.length ? ((value / perizinan.length) * 100).toFixed(1) + "%" : "0%",
  }));

  // dokumen terbaru: gabungan 4 modul, urut tanggal terbaru, ambil 5
  const dokumenTerbaru = allDocs
    .filter((d) => d.tanggal && d.judul)
    .sort((a, b) => (a.tanggal < b.tanggal ? 1 : a.tanggal > b.tanggal ? -1 : 0))
    .map((d) => ({ judul: d.judul, proyek: d.proyek, kategori: d.kategori, tanggal: formatTanggal(d.tanggal), status: d.status || "Aktif" }));

  // pengingat: pajak & PBB jatuh tempo + perizinan akan berakhir, dalam 30 hari ke depan
  const pengingat = [];
  pembayaranGabungan.forEach((r) => {
    const tanggalPemantauan = r.tanggalSetor || r.tanggalPengajuan;
    const days = daysFromToday(tanggalPemantauan);
    if (days !== null && days >= 0 && days <= 30 && String(r.statusPembayaran || "").toLowerCase() !== "sudah bayar") {
      pengingat.push({ title: `${r.jenisPajak} - ${r.proyek || r.unit || "Objek"}`, sub: r.tanggalPengajuan ? `Pengajuan ${formatTanggal(r.tanggalPengajuan)}` : "Perlu dipantau", date: formatTanggal(tanggalPemantauan), tone: days <= 7 ? "red" : "amber", days });
    }
  });
  perizinan.forEach((r) => {
    const days = daysFromToday(r.masaBerlaku);
    if (days !== null && days >= 0 && days <= 30 && isStatus(r, "aktif")) {
      pengingat.push({ title: r.nomorIzin || "Perizinan", sub: `Izin berakhir dalam ${days} hari`, date: formatTanggal(r.masaBerlaku), tone: days <= 7 ? "red" : "amber", days });
    }
  });
  pengingat.sort((a, b) => a.days - b.days);

  // akad & AJB mendatang (hari ini dan seterusnya), ambil 5 terdekat
  const todayStr = new Date().toISOString().slice(0, 10);
  const akadMendatang = akadajb
    .filter((r) => r.tanggalAkad && r.tanggalAkad >= todayStr)
    .sort((a, b) => (a.tanggalAkad < b.tanggalAkad ? -1 : 1))
    .slice(0, 5)
    .map((r) => {
      const d = new Date(r.tanggalAkad + "T00:00:00");
      return {
        day: String(d.getDate()).padStart(2, "0"),
        month: MONTH_SHORT[d.getMonth()],
        title: `${r.jenisAkad ? r.jenisAkad + " - " : ""}Unit ${r.unit || "-"}`,
        sub: [r.notaris, r.jamAkad ? r.jamAkad + " WIB" : null].filter(Boolean).join(" / ") || "-",
      };
    });

  return {
    executiveCards,
    statCards,
    constructionCards,
    progressProjects,
    averageProgress,
    totalCluster,
    totalUnitDipantau,
    totalUpdateHarian,
    totalMaterialPending,
    totalBudgetAnggaran,
    totalBudgetRealisasi,
    totalBudgetSelisih,
    dokumenPerProyek,
    totalDokumen,
    statusPerizinan,
    totalPerizinan: perizinan.length,
    dokumenTerbaru,
    pengingat: pengingat.slice(0, 5),
    akadMendatang,
  };
}

function DashboardContent({ data, goTo, user }) {
  const stats = computeDashboardStats(data);
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const unitSoldSeries = months.map((_, i) => Math.max(8, Math.round((stats.totalUnitDipantau || 36) / 5 + Math.sin(i * 0.9) * 16 + (i % 4) * 3)));
  const revenueSeries = months.map((_, i) => Math.max(4, Math.round((stats.totalBudgetRealisasi || 1000000) / 250000000 + Math.cos(i * 0.7) * 8 + i * 0.8)));
  const maxY = Math.max(...unitSoldSeries, ...revenueSeries, 10);
  const toPoints = (values) => values.map((v, i) => `${(i / (values.length - 1)) * 100},${100 - (v / maxY) * 100}`).join(" ");
  const prospekRows = (data && data.pembeli) || [];
  const bookingRows = (data && data.transaksi) || [];
  const bookingAktif = bookingRows.filter((r) => {
    const status = String(r.status || "").trim().toLowerCase();
    return !status || status === "booking" || status === "ppjb" || status === "akad kredit";
  });
  const legalWatchlist = (stats.pengingat || []).slice(0, 5);
  const recentDocs = (stats.dokumenTerbaru || []).slice(0, 4);
  const ownerSnapshot = [
    { label: "Prospek", value: prospekRows.length, note: "Master pihak / calon pembeli", tone: "blue", key: "pembeli" },
    { label: "Booking Aktif", value: bookingAktif.length, note: "Booking, PPJB, akad berjalan", tone: "teal", key: "transaksi" },
    { label: "Progress Rata-rata", value: `${Math.round(stats.averageProgress || 0)}%`, note: `${stats.progressProjects.length} proyek dipantau`, tone: "green", key: "progressunit" },
    { label: "Dokumen Legal", value: stats.totalDokumen, note: `${stats.totalPerizinan} perizinan terdaftar`, tone: "amber", key: "dokumenlegal" },
  ];

  const workflowStages = [
    {
      title: "PROYEK",
      subtitle: "Perencanaan, unit, progress lapangan",
      items: [
        { key: "proyek", label: "Proyek" },
        { key: "unit", label: "Master Unit" },
        { key: "progressunit", label: "Progress Proyek" },
      ],
    },
    {
      title: "LEGAL",
      subtitle: "Dokumen, perizinan, surat legal",
      items: [
        { key: "dokumenlegal", label: "Dokumen Legal" },
        { key: "perizinan", label: "Perizinan" },
        { key: "generatesurat", label: "Generate Surat" },
      ],
    },
    {
      title: "MARKETING",
      subtitle: "Prospek, follow up, target tim",
      items: [
        { key: "prospek", label: "Database Prospek" },
        { key: "followup", label: "Jejak Follow Up" },
        { key: "targetmarketing", label: "Target Penjualan" },
      ],
    },
    {
      title: "PENJUALAN",
      subtitle: "Prospek, booking, skema bayar",
      items: [
        { key: "pembeli", label: "Master Pihak" },
        { key: "transaksi", label: "Booking" },
        { key: "jadwalcicilan", label: "Skema Pembayaran" },
      ],
    },
    {
      title: "BANK",
      subtitle: "Berkas, proses, pencairan KPR",
      items: [
        { key: "berkaskpr", label: "Berkas KPR" },
        { key: "prosesbank", label: "Proses Bank/Notaris" },
        { key: "pencairankpr", label: "Pencairan KPR" },
      ],
    },
    {
      title: "NOTARIS",
      subtitle: "Akad, AJB, balik nama, roya",
      items: [
        { key: "akadajb", label: "Akad & AJB" },
        { key: "baliknama", label: "Balik Nama" },
        { key: "royaht", label: "Roya & HT" },
      ],
    },
    {
      title: "PAJAK",
      subtitle: "PPh, BPHTB, monitoring setor",
      items: [
        { key: "pph", label: "PPh" },
        { key: "bphtb", label: "BPHTB" },
        { key: "pembayaran", label: "Pembayaran Pajak" },
      ],
    },
    {
      title: "KEUANGAN",
      subtitle: "Kas, kuitansi, approval, budget",
      items: [
        { key: "kuitansi", label: "Kuitansi" },
        { key: "approval", label: "Approval" },
        { key: "budgetcontrol", label: "Budget Control" },
      ],
    },
    {
      title: "GUDANG",
      subtitle: "Supplier, material, stok real-time",
      items: [
        { key: "masterbarang", label: "Master Barang" },
        { key: "barangkeluar", label: "Barang Keluar" },
        { key: "stokgudang", label: "Stok Material" },
      ],
    },
  ];

  const progressProjects = stats.progressProjects.slice(0, 4);
  const quickActions = [
    { key: "prospek", label: "Tambah Prospek", icon: UserPlus },
    { key: "followup", label: "Catat Follow Up", icon: PhoneCall },
    { key: "pricelist", label: "Atur Price List", icon: Tag },
    { key: "transaksi", label: "Buat Booking", icon: Receipt },
    { key: "kuitansi", label: "Terbitkan Kuitansi", icon: Wallet },
    { key: "approval", label: "Ajukan Approval", icon: ShieldCheck },
  ];

  const activities = [
    ...(data.updateharian || []).map((r) => ({ title: `Update Proyek ${r.proyek || "-"}`, sub: r.uraianPekerjaan || "Update harian lapangan", date: r.tanggal || "" })),
    ...(data.pembeli || []).map((r) => ({ title: `Pembeli baru: ${r.nama || "-"}`, sub: `Unit ${r.unit || "-"}`, date: r.tanggalBeli || "" })),
    ...(data.perizinan || []).map((r) => ({ title: `Perizinan ${r.jenisIzin || "-"}`, sub: `${r.nomorIzin || "Tanpa nomor"}`, date: r.tanggalTerbit || "" })),
  ]
    .filter((a) => a.date)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 5);

  const salesByProject = stats.progressProjects.slice(0, 4).map((p, i) => ({ name: p.name, value: Math.max(1, p.unitCount || 1), color: DONUT_COLORS[i % DONUT_COLORS.length] }));
  const totalSales = salesByProject.reduce((sum, d) => sum + d.value, 0) || 1;

  const pendapatan = getCombinedTaxPayments(data)
    .filter((r) => String(r.statusPembayaran || "").toLowerCase() === "sudah bayar")
    .reduce((sum, r) => sum + Number(r.nominalPajak || 0), 0);
  const pengeluaran = Math.max(0, stats.totalBudgetRealisasi - pendapatan);
  const laba = pendapatan - pengeluaran;
  const trend = [12, 17, 16, 22, 25, 27, 30, 28, 32, 34, 33, 36];
  const trendPoints = trend.map((v, i) => `${(i / (trend.length - 1)) * 100},${100 - (v / 40) * 100}`).join(" ");

  // --- Kendali marketing: funnel prospek, follow up tertunda, dan peringkat tim ---
  const toAngka = (v) => { const n = Number(String(v == null ? "" : v).replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
  const prospekList = (data && data.prospek) || [];
  const PROSPEK_TAHAP = ["Baru", "Follow Up", "Hot Prospect", "Booking", "Closing"];
  const prospekFunnel = PROSPEK_TAHAP.map((label, i) => ({
    label,
    value: prospekList.filter((r) => String(r.status || "") === label).length,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }));
  const prospekMaks = Math.max(1, ...prospekFunnel.map((f) => f.value));
  const followUpTertunda = prospekList.filter((r) => {
    const status = String(r.status || "");
    if (status === "Closing" || status === "Batal") return false;
    const sisa = daysFromToday(r.tanggalFollowUpBerikut);
    return sisa !== null && sisa <= 0;
  }).length;

  const peringkatMarketing = Object.values(
    ((data && data.targetmarketing) || []).reduce((acc, r) => {
      const nama = String(r.marketing || "").trim();
      if (!nama) return acc;
      if (!acc[nama]) acc[nama] = { nama, targetNilai: 0, realisasiNilai: 0, realisasiUnit: 0 };
      acc[nama].targetNilai += toAngka(r.targetNilai);
      acc[nama].realisasiNilai += toAngka(r.realisasiNilai);
      acc[nama].realisasiUnit += toAngka(r.realisasiUnit);
      return acc;
    }, {})
  )
    .map((r) => ({ ...r, persen: r.targetNilai > 0 ? Math.round((r.realisasiNilai / r.targetNilai) * 100) : 0 }))
    .sort((a, b) => b.realisasiNilai - a.realisasiNilai)
    .slice(0, 5);

  const unitRows = (data && data.unit) || [];
  const hitungStatusUnit = (label) => unitRows.filter((r) => String(r.status || "").trim().toLowerCase() === label).length;
  const stokUnit = [
    { label: "Tersedia", value: hitungStatusUnit("tersedia"), tone: "green" },
    { label: "Proses", value: hitungStatusUnit("proses"), tone: "amber" },
    { label: "Terjual", value: hitungStatusUnit("terjual"), tone: "blue" },
  ];

  const stokMenipis = computeStokGudang(data).filter((r) => r.status !== "Aman").slice(0, 5);

  // --- Widget "Jatuh Tempo Pembayaran": angsuran & tagihan belum lunas dikelompokkan per sisa hari ---
  const jatuhTempoItems = [
    ...((data && data.jadwalcicilan) || [])
      .filter((r) => String(r.statusBayar || "") !== "Sudah Bayar")
      .map((r) => daysFromToday(r.tanggalJatuhTempo)),
    ...((data && data.tagihan) || [])
      .filter((r) => String(r.status || "") !== "Lunas")
      .map((r) => daysFromToday(r.jatuhTempo)),
  ].filter((d) => d !== null);
  const jatuhTempo = [
    { label: "Mendekati", value: jatuhTempoItems.filter((d) => d > 0 && d <= 7).length, bg: "#FFFF00", fg: "#3B3B00", iconBg: "rgba(0,0,0,0.14)" },
    { label: "Hari ini", value: jatuhTempoItems.filter((d) => d === 0).length, bg: "#2E86C1", fg: "#FFFFFF", iconBg: "rgba(255,255,255,0.9)" },
    { label: "Melewati", value: jatuhTempoItems.filter((d) => d < 0).length, bg: "#F4CCCC", fg: "#8B2B24", iconBg: "#A03A31" },
  ];

  // --- Widget "Statistik": rekap penjualan harian/mingguan/bulanan + jumlah konsumen ---
  const hariIni = new Date();
  const isoOf = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const todayIso = isoOf(hariIni);
  const awalMinggu = new Date(hariIni); awalMinggu.setDate(hariIni.getDate() - hariIni.getDay());
  const akhirMinggu = new Date(awalMinggu); akhirMinggu.setDate(awalMinggu.getDate() + 6);
  const bulanIni = todayIso.slice(0, 7);
  const tanggalBooking = (r) => String(r.tanggalBooking || r.tanggalPPJB || "");
  const bookingSah = bookingRows.filter((r) => String(r.status || "") !== "Batal");
  const statistik = [
    { label: "Penjualan Hari Ini", sub: todayIso, value: `${bookingSah.filter((r) => tanggalBooking(r) === todayIso).length} Unit` },
    { label: "Penjualan Minggu Ini", sub: `${isoOf(awalMinggu)} - ${isoOf(akhirMinggu)}`, value: `${bookingSah.filter((r) => { const t = tanggalBooking(r); return t >= isoOf(awalMinggu) && t <= isoOf(akhirMinggu); }).length} Unit` },
    { label: "Penjualan Bulan Ini", sub: monthLabelFromKey(bulanIni), value: `${bookingSah.filter((r) => tanggalBooking(r).slice(0, 7) === bulanIni).length} Unit` },
    { label: "Total Calon Konsumen", sub: "", value: `${((data && data.prospek) || []).length} Konsumen` },
    { label: "Total Konsumen", sub: "", value: `${prospekRows.length} Konsumen` },
    { label: "Sudah Proses PPJB", sub: "", value: `${((data && data.ppjb) || []).length} PPJB` },
  ];

  const shortcutLinks = [
    { key: "approval", label: "Approval Berjenjang", icon: ShieldCheck },
    { key: "kuitansi", label: "Kuitansi Penerimaan", icon: Receipt },
    { key: "hutang", label: "Laporan Hutang", icon: Scale },
    { key: "generatesurat", label: "Generate Surat", icon: FileSignature },
    { key: "kartupiutang", label: "Kartu Piutang", icon: BookOpen },
    { key: "piutang", label: "Rekap Piutang", icon: HandCoins },
    { key: "prospek", label: "Daftar Calon Konsumen", icon: UserPlus },
    { key: "pembeli", label: "Daftar Konsumen", icon: Users },
    { key: "transaksi", label: "Daftar Transaksi", icon: Receipt },
    { key: "laporankeuangan", label: "Laporan Keuangan", icon: PieChart },
    { key: "pricelist", label: "Price List Unit", icon: Tag },
    { key: "stokgudang", label: "Stok Material", icon: Warehouse },
    { key: "budgetcontrol", label: "Budget Control", icon: FileBarChart2 },
  ];

  return (
    <>
      <div className="kbr-welcome kbr-dash-section" style={{ ...cardBase, flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18, gap: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.ink }}>Selamat Datang, {user && user.nama ? user.nama : "Pengguna"}</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>ERP Developer Properti - alur kerja terhubung lewat ID_Unit dan ID_Pihak.</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F8FAFD", border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 12px", flexShrink: 0 }}>
          <Calendar size={15} color={C.navy} />
          <div style={{ fontSize: 12, color: C.ink, fontWeight: 600 }}>{new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</div>
        </div>
      </div>

      <div className="kbr-dash-bot kbr-dash-section" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.15fr", gap: 14 }}>
        <div style={{ ...cardBase, padding: 16 }}>
          <BoxHeader title="Shortcut Link">
            <ChevronDown size={14} style={{ transform: "rotate(180deg)" }} />
            <Settings size={14} />
            <X size={14} />
          </BoxHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 6 }}>
            <button onClick={() => goTo("dashboard")} className="kbr-shortcut" style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: "7px 4px", cursor: "pointer", fontSize: 13.5, color: "#4E5D6C", textAlign: "left" }}>
              <Home size={15} strokeWidth={1.8} /> Dashboard
            </button>
            {shortcutLinks.map((item) => (
              <button key={item.key} onClick={() => goTo(item.key)} className="kbr-shortcut" style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: "7px 4px", cursor: "pointer", fontSize: 13.5, color: "#4E5D6C", textAlign: "left" }}>
                <item.icon size={15} strokeWidth={1.8} /> {item.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ ...cardBase, padding: 16 }}>
          <BoxHeader title="Jatuh Tempo Pembayaran">
            <ChevronDown size={14} style={{ transform: "rotate(180deg)" }} />
            <Settings size={14} />
            <X size={14} />
          </BoxHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
            {jatuhTempo.map((k) => (
              <button key={k.label} onClick={() => goTo("tagihan")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: k.bg, color: k.fg, border: "none", borderRadius: UI.radius, padding: "18px 20px", cursor: "pointer", textAlign: "right" }}>
                <span style={{ width: 52, height: 52, borderRadius: "50%", background: k.iconBg, color: k.bg === "#2E86C1" ? "#2E86C1" : (k.label === "Melewati" ? "#F4CCCC" : "#FFFF00"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 27, fontWeight: 700, fontStyle: "italic", fontFamily: "Georgia, serif", flexShrink: 0 }}>i</span>
                <span style={{ lineHeight: 1.3 }}>
                  <span style={{ display: "block", fontSize: 17, fontWeight: 600 }}>{k.value}</span>
                  <span style={{ display: "block", fontSize: 13.5 }}>{k.label}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ ...cardBase, padding: 16 }}>
          <BoxHeader title={`${BRAND.shortName} Statistik`}>
            <ChevronDown size={14} style={{ transform: "rotate(180deg)" }} />
            <Settings size={14} />
            <X size={14} />
          </BoxHeader>
          <div style={{ position: "relative", paddingLeft: 22, marginTop: 8 }}>
            <span style={{ position: "absolute", left: 5, top: 6, bottom: 6, width: 2, background: "#DEE2E6" }} />
            {statistik.map((s) => (
              <div key={s.label} style={{ position: "relative", padding: "10px 0", borderBottom: `1px solid ${UI.boxBorder}` }}>
                <span style={{ position: "absolute", left: -21, top: 14, width: 11, height: 11, borderRadius: "50%", background: "#fff", border: "2px solid #ADB5BD" }} />
                <div style={{ fontSize: 14.5, color: "#3D7EAA" }}>{s.label} :</div>
                <div style={{ fontSize: 12.5, color: "#6C757D", marginTop: 2 }}>{s.sub ? `${s.sub} : ${s.value}` : s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="kbr-dash-section" style={{ ...cardBase, padding: 16, gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>Alur Kerja Operasional</div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>PROYEK → LEGAL → PENJUALAN → BANK → NOTARIS → PAJAK → KEUANGAN</div>
          </div>
          <div style={{ fontSize: 11.5, color: C.mutedLight, fontWeight: 600 }}>Terhubung lintas modul</div>
        </div>
        <div className="kbr-dash-swipe" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
          {workflowStages.map((stage) => (
            <div key={stage.title} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, background: "linear-gradient(180deg, #FFFFFF 0%, #FAFCFF 100%)" }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: C.ink }}>{stage.title}</div>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{stage.subtitle}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {stage.items.map((item) => (
                  <button key={item.key} onClick={() => goTo(item.key)} style={{ border: `1px solid ${C.border}`, borderRadius: 999, background: "#fff", padding: "7px 10px", fontSize: 11.5, fontWeight: 700, color: C.ink, cursor: "pointer" }}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="kbr-dash-swipe-hint">◂ Geser untuk melihat tahap lainnya ▸</div>
      </div>

      <div className="kbr-dash-section" style={{ ...cardBase, padding: 16, gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>Dashboard Owner</div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>Ringkasan operasional prospek, booking, progress proyek, dan legal.</div>
          </div>
          <button onClick={() => goTo("dashboard")} style={ghostBtn}>
            <Bell size={14} /> Fokus Utama
          </button>
        </div>

        <div className="kbr-dash-swipe kbr-dash-swipe-sm" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          {ownerSnapshot.map((item) => (
            <button key={item.label} onClick={() => goTo(item.key)} style={{ textAlign: "left", border: `1px solid ${C.border}`, borderRadius: 14, background: "#fff", padding: 14, cursor: "pointer" }}>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700 }}>{item.label}</div>
              <div style={{ fontSize: 28, lineHeight: 1.1, fontWeight: 800, color: palette[item.tone].fg, marginTop: 6 }}>{item.value}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{item.note}</div>
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 12 }} className="kbr-dash-bot">
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, background: "#FCFDFF" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: C.ink }}>Progress Proyek Teratas</div>
              <button onClick={() => goTo("progressunit")} style={{ ...linkBtn, fontSize: 11.5 }}>Buka Modul</button>
            </div>
            {progressProjects.length === 0 ? (
              <div style={{ fontSize: 12.5, color: C.mutedLight, padding: "14px 0", textAlign: "center" }}>Belum ada data progres proyek.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {progressProjects.slice(0, 3).map((p, i) => (
                  <div key={p.name} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, background: "#fff" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{p.unitCount} unit dipantau</div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: palette[i % 2 === 0 ? "blue" : "green"].fg }}>{p.avgProgress.toFixed(0)}%</div>
                    </div>
                    <div style={{ marginTop: 8, height: 6, borderRadius: 999, background: "#E8EEF7", overflow: "hidden" }}>
                      <div style={{ width: `${Math.max(0, Math.min(100, p.avgProgress))}%`, height: "100%", background: i % 2 === 0 ? C.navy : C.accent, borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, background: "#FCFDFF" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: C.ink }}>Legal Watchlist</div>
              <button onClick={() => goTo("perizinan")} style={{ ...linkBtn, fontSize: 11.5 }}>Lihat Legal</button>
            </div>
            {legalWatchlist.length === 0 ? (
              <div style={{ fontSize: 12.5, color: C.mutedLight, padding: "14px 0", textAlign: "center" }}>Tidak ada pengingat legal.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {legalWatchlist.map((item, i) => (
                  <div key={i} style={{ borderBottom: `1px dashed ${C.border}`, paddingBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{item.sub}</div>
                    <div style={{ fontSize: 10.8, color: C.mutedLight, marginTop: 2 }}>{item.date}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, background: "#FCFDFF" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: C.ink }}>Dokumen Terbaru</div>
              <button onClick={() => goTo("dokumenlegal")} style={{ ...linkBtn, fontSize: 11.5 }}>Buka Arsip</button>
            </div>
            {recentDocs.length === 0 ? (
              <div style={{ fontSize: 12.5, color: C.mutedLight, padding: "14px 0", textAlign: "center" }}>Belum ada dokumen terbaru.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {recentDocs.map((doc, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, borderBottom: `1px dashed ${C.border}`, paddingBottom: 8 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: palette.blue.bg, color: palette.blue.fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>{i + 1}</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.judul}</div>
                      <div style={{ fontSize: 11, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.proyek} · {doc.kategori}</div>
                      <div style={{ fontSize: 10.8, color: C.mutedLight }}>{doc.tanggal}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="kbr-dash-section kbr-dash-swipe kbr-dash-swipe-sm" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
        {stats.executiveCards.map((s) => (
          <div key={s.label} className="kbr-stat-card" style={{ ...cardBase, padding: 14, gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: palette[s.tone].bg, color: palette[s.tone].fg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <s.icon size={17} strokeWidth={1.9} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10.5, color: C.muted, letterSpacing: "0.07em", textTransform: "uppercase", fontWeight: 700 }}>{s.label}</div>
                <div style={{ fontSize: 27, lineHeight: 1.1, color: C.ink, fontWeight: 800 }}>{typeof s.value === "number" ? s.value.toLocaleString("id-ID") : s.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1.25fr 1fr", gap: 14 }} className="kbr-dash-mid kbr-dash-section">
        <div style={{ ...cardBase, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>Grafik Penjualan Unit</div>
            <span style={{ fontSize: 11.5, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 999, padding: "4px 10px" }}>Tahun Ini</span>
          </div>
          <div style={{ height: 260, border: `1px solid ${C.border}`, borderRadius: 12, background: "linear-gradient(180deg,#FFFFFF 0%,#F9FBFE 100%)", padding: 12 }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
              {[20, 40, 60, 80].map((y) => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#E8EEF7" strokeWidth="0.6" />)}
              <polyline points={toPoints(unitSoldSeries)} fill="none" stroke="#1E4594" strokeWidth="1.5" />
              <polyline points={toPoints(revenueSeries)} fill="none" stroke="#D5A24A" strokeWidth="1.5" />
            </svg>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10.5, color: C.muted }}>
              {months.map((m) => <span key={m}>{m}</span>)}
            </div>
          </div>
        </div>

        <div style={{ ...cardBase, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>Progress Proyek</div>
            <button style={{ ...linkBtn, fontSize: 11.5 }} onClick={() => goTo("progressunit")}>Lihat Semua</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {progressProjects.length === 0 ? (
              <div style={{ fontSize: 12.5, color: C.mutedLight, padding: "18px 0", textAlign: "center" }}>Belum ada data progres.</div>
            ) : (
              progressProjects.map((p, i) => (
                <div key={p.name} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 8, background: "#FBFCFF" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 48, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${DONUT_COLORS[i % DONUT_COLORS.length]}22 0%, #F4F6FA 100%)`, border: `1px solid ${C.border}` }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{p.unitCount} unit</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{p.avgProgress.toFixed(0)}%</div>
                  </div>
                  <div style={{ marginTop: 6, height: 6, background: "#E8EEF7", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${Math.max(0, Math.min(100, p.avgProgress))}%`, height: "100%", background: "#1E4594", borderRadius: 999 }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ ...cardBase, padding: 14, gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>Quick Action</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {quickActions.map((item) => (
                <button key={item.key} onClick={() => goTo(item.key)} style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: "#fff", padding: "8px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <item.icon size={16} color={C.navy} />
                  <span style={{ fontSize: 10.5, color: C.ink, fontWeight: 600, textAlign: "center" }}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ ...cardBase, padding: 14, gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>Pengingat</div>
              <button style={{ ...linkBtn, fontSize: 11.5 }} onClick={() => goTo("dashboard")}>Lihat Semua</button>
            </div>
            {stats.pengingat.length === 0 ? (
              <div style={{ fontSize: 12.5, color: C.mutedLight, textAlign: "center", padding: "16px 0" }}>Tidak ada pengingat.</div>
            ) : (
              stats.pengingat.slice(0, 3).map((n, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, borderBottom: `1px dashed ${C.border}`, paddingBottom: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11.8, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.title}</div>
                    <div style={{ fontSize: 10.8, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.sub}</div>
                  </div>
                  <div style={{ fontSize: 10.8, color: C.mutedLight, flexShrink: 0 }}>{n.date}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1.25fr 1fr", gap: 14 }} className="kbr-dash-bot kbr-dash-section">
        <div style={{ ...cardBase, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 8 }}>Penjualan Berdasarkan Proyek</div>
          {salesByProject.length === 0 ? (
            <div style={{ fontSize: 12.5, color: C.mutedLight, textAlign: "center", padding: "18px 0" }}>Belum ada data proyek.</div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ position: "relative", width: 150, height: 150 }}>
                <Donut data={salesByProject} size={150} thickness={28} />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                  <div style={{ fontSize: 21, fontWeight: 800, color: C.ink }}>{totalSales}</div>
                  <div style={{ fontSize: 10.5, color: C.muted }}>Unit</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1, minWidth: 150 }}>
                {salesByProject.map((d) => (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                    <span style={{ flex: 1, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</span>
                    <span style={{ color: C.muted }}>{Math.round((d.value / totalSales) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ ...cardBase, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>Aktivitas Terbaru</div>
            <button style={{ ...linkBtn, fontSize: 11.5 }} onClick={() => goTo("updateharian")}>Lihat Semua</button>
          </div>
          {activities.length === 0 ? (
            <div style={{ fontSize: 12.5, color: C.mutedLight, textAlign: "center", padding: "18px 0" }}>Belum ada aktivitas terbaru.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {activities.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: palette.blue.bg, color: palette.blue.fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>{i + 1}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</div>
                    <div style={{ fontSize: 11, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.sub}</div>
                  </div>
                  <div style={{ fontSize: 10.5, color: C.mutedLight, flexShrink: 0 }}>{formatTanggal(a.date)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ ...cardBase, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>Ringkasan Keuangan</div>
            <button style={{ ...linkBtn, fontSize: 11.5 }} onClick={() => goTo("budgetkonstruksi")}>Lihat Detail</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, background: "#F9FBFE" }}>
              <div style={{ fontSize: 10.5, color: C.muted }}>Total Pemasukan (Bulan Ini)</div>
              <div style={{ fontSize: 21, fontWeight: 800, color: C.ink }}>{formatRupiah(pendapatan)}</div>
            </div>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, background: "#FFF8F6" }}>
              <div style={{ fontSize: 10.5, color: C.muted }}>Total Pengeluaran (Bulan Ini)</div>
              <div style={{ fontSize: 21, fontWeight: 800, color: C.ink }}>{formatRupiah(pengeluaran)}</div>
            </div>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, background: "#F7FBF8" }}>
              <div style={{ fontSize: 10.5, color: C.muted }}>Laba Bersih (Bulan Ini)</div>
              <div style={{ fontSize: 21, fontWeight: 800, color: laba >= 0 ? palette.green.fg : C.red }}>{formatRupiah(laba)}</div>
              <div style={{ marginTop: 8, height: 42 }}>
                <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
                  <polyline points={trendPoints} fill="none" stroke="#1D9A63" strokeWidth="1.8" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1.25fr 1fr", gap: 14 }} className="kbr-dash-bot kbr-dash-section">
        <div style={{ ...cardBase, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>Pipeline Prospek</div>
            <button style={{ ...linkBtn, fontSize: 11.5 }} onClick={() => goTo("prospek")}>Kelola</button>
          </div>
          {prospekList.length === 0 ? (
            <div style={{ fontSize: 12.5, color: C.mutedLight, textAlign: "center", padding: "18px 0" }}>Belum ada data prospek.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {prospekFunnel.map((f) => (
                <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 92, fontSize: 11.8, color: C.muted, flexShrink: 0 }}>{f.label}</span>
                  <div style={{ flex: 1, height: 10, borderRadius: 999, background: "#EEF2F8", overflow: "hidden" }}>
                    <div style={{ width: `${Math.round((f.value / prospekMaks) * 100)}%`, height: "100%", background: f.color, borderRadius: 999 }} />
                  </div>
                  <span style={{ width: 28, textAlign: "right", fontSize: 12.5, fontWeight: 800, color: C.ink }}>{f.value}</span>
                </div>
              ))}
              <button onClick={() => goTo("followup")} style={{ ...ghostBtn, marginTop: 4, justifyContent: "center", fontSize: 12, color: followUpTertunda > 0 ? C.red : C.ink }}>
                <PhoneCall size={14} /> {followUpTertunda > 0 ? `${followUpTertunda} follow up tertunda` : "Follow up terjadwal aman"}
              </button>
            </div>
          )}
        </div>

        <div style={{ ...cardBase, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>Kinerja Tim Marketing</div>
            <button style={{ ...linkBtn, fontSize: 11.5 }} onClick={() => goTo("targetmarketing")}>Lihat Target</button>
          </div>
          {peringkatMarketing.length === 0 ? (
            <div style={{ fontSize: 12.5, color: C.mutedLight, textAlign: "center", padding: "18px 0" }}>Belum ada target penjualan yang dicatat.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {peringkatMarketing.map((m, i) => (
                <div key={m.nama} style={{ display: "flex", alignItems: "center", gap: 9, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: palette.teal.bg, color: palette.teal.fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.nama}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{m.realisasiUnit} unit · {formatRupiah(m.realisasiNilai)}</div>
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: m.persen >= 100 ? palette.green.fg : C.muted, flexShrink: 0 }}>{m.persen}%</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ ...cardBase, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>Stok Unit &amp; Material</div>
            <button style={{ ...linkBtn, fontSize: 11.5 }} onClick={() => goTo("stokgudang")}>Stok Gudang</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {stokUnit.map((s) => (
              <div key={s.label} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 10px", background: palette[s.tone].bg }}>
                <div style={{ fontSize: 10.5, color: C.muted }}>{s.label}</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: palette[s.tone].fg }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.muted, marginTop: 10, marginBottom: 4 }}>Material Perlu Restock</div>
          {stokMenipis.length === 0 ? (
            <div style={{ fontSize: 12, color: C.mutedLight, padding: "8px 0" }}>Semua stok material aman.</div>
          ) : (
            stokMenipis.map((s) => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11.8, borderBottom: `1px dashed ${C.border}`, padding: "5px 0" }}>
                <span style={{ minWidth: 0, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.namaBarang}</span>
                <span style={{ flexShrink: 0, fontWeight: 700, color: s.status === "Habis" ? C.red : palette.amber.fg }}>{s.sisaStok} {s.satuan}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="kbr-dash-section" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: C.mutedLight, padding: "8px 4px 4px", flexWrap: "wrap", gap: 8 }}>
        <span>© 2025 PT Kolaka Bumi Realty. All rights reserved.</span>
        <span>ERP Developer Properti v1.0.0</span>
      </div>
    </>
  );
}

function IconAvatar({ tone, icon: Icon = Bell }) {
  const t = palette[tone];
  return (
    <div style={{ width: 36, height: 36, borderRadius: "50%", background: t.bg, color: t.fg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon size={15} strokeWidth={1.9} />
    </div>
  );
}

/** Format ukuran file (byte) jadi teks ringkas (KB/MB). */
function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
/** Format tanggal+jam ISO jadi teks lokal id-ID. */
function formatDateTime(isoStr) {
  if (!isoStr) return "-";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return String(isoStr);
  return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function SettingsPage({ settings, onSave }) {
  const [values, setValues] = useState(() => ({ ...DEFAULT_APP_SETTINGS, ...(settings || {}) }));
  const [saving, setSaving] = useState(false);
  const [assetUploading, setAssetUploading] = useState("");
  const [assetError, setAssetError] = useState("");
  const [installReady, setInstallReady] = useState(() => !!window.__kbrInstallPrompt);
  const [installed, setInstalled] = useState(() => window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent || "");

  useEffect(() => {
    setValues({ ...DEFAULT_APP_SETTINGS, ...(settings || {}) });
  }, [settings]);

  useEffect(() => {
    const ready = () => setInstallReady(true);
    const done = () => { setInstallReady(false); setInstalled(true); };
    window.addEventListener("kbr-install-ready", ready);
    window.addEventListener("kbr-app-installed", done);
    return () => {
      window.removeEventListener("kbr-install-ready", ready);
      window.removeEventListener("kbr-app-installed", done);
    };
  }, []);

  const setField = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  const updateTemplate = (id, patch) => setValues((current) => ({
    ...current,
    customSuratTemplates: (current.customSuratTemplates || []).map((template) => template.id === id ? { ...template, ...patch } : template),
  }));
  const removeTemplate = (template) => {
    if (!window.confirm(`Hapus template "${template.nama}"?`)) return;
    setValues((current) => ({
      ...current,
      customSuratTemplates: (current.customSuratTemplates || []).filter((item) => item.id !== template.id),
    }));
    if (template.file && template.file.id) gsCall("deleteFile", "pengaturan", template.file.id).catch(() => {});
  };
  const uploadLogo = async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setAssetError("Logo harus berformat PNG, JPG, atau WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAssetError("Ukuran logo maksimal 2 MB.");
      return;
    }
    setAssetError("");
    setAssetUploading("logo");
    try {
      const meta = await gsCall("uploadFile", "pengaturan", file.name, file.type, await readFileAsBase64(file));
      const previous = values.logoFile;
      setValues((current) => ({ ...current, logoUrl: meta.directUrl || meta.url, logoFile: meta }));
      if (previous && previous.id) gsCall("deleteFile", "pengaturan", previous.id).catch(() => {});
    } catch (error) {
      setAssetError(error && error.message ? error.message : "Logo gagal diunggah.");
    } finally {
      setAssetUploading("");
    }
  };
  const uploadTemplate = async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    if (!/\.(doc|docx)$/i.test(file.name)) {
      setAssetError("Template harus berupa file .doc atau .docx.");
      return;
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      setAssetError("Ukuran template maksimal 8 MB.");
      return;
    }
    if ((values.customSuratTemplates || []).length >= 10) {
      setAssetError("Maksimal 10 template surat aktif/tersimpan.");
      return;
    }
    setAssetError("");
    setAssetUploading("template");
    try {
      let extractedText = "";
      if (/\.docx$/i.test(file.name)) {
        const extracted = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        extractedText = String(extracted.value || "").trim();
      }
      const meta = await gsCall("uploadFile", "pengaturan", file.name, file.type || "application/msword", await readFileAsBase64(file));
      const baseName = file.name.replace(/\.(doc|docx)$/i, "");
      const template = {
        id: `tpl-${Date.now()}`,
        nama: baseName,
        aktif: true,
        isi: extractedText || "Nomor: {{nomorSurat}}\nTanggal: {{tanggalSurat}}\nPerihal: {{perihal}}\n\nYth. {{namaPihak}}\n\n{{isiRingkas}}\n\nUnit {{nomorUnit}} - {{proyek}}",
        file: meta,
      };
      setValues((current) => ({ ...current, customSuratTemplates: [...(current.customSuratTemplates || []), template] }));
    } catch (error) {
      setAssetError(error && error.message ? error.message : "Template gagal diunggah.");
    } finally {
      setAssetUploading("");
    }
  };
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...values, id: "default" });
    } finally {
      setSaving(false);
    }
  };
  const install = async () => {
    const prompt = window.__kbrInstallPrompt;
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    window.__kbrInstallPrompt = null;
    setInstallReady(false);
  };
  const field = (key, label, type = "text") => (
    <label>
      <span style={fieldLabelStyle}>{label}</span>
      <input type={type} value={values[key] || ""} onChange={(event) => setField(key, event.target.value)} style={formInputStyle} />
    </label>
  );
  const templateField = (key, label) => (
    <label className="kbr-field-wide">
      <span style={fieldLabelStyle}>{label}</span>
      <textarea value={values[key] || ""} onChange={(event) => setField(key, event.target.value)} rows={3} maxLength={5000} style={{ ...formInputStyle, resize: "vertical", lineHeight: 1.5 }} />
    </label>
  );

  return (
    <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={pageTitleStyle}>Pengaturan Aplikasi</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>Kelola tampilan, identitas perusahaan, format dokumen, dan instalasi perangkat.</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setValues({ ...DEFAULT_APP_SETTINGS })} style={ghostBtn}>Pulihkan Default</button>
          <button type="submit" disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}><Save size={14} /> {saving ? "Menyimpan..." : "Simpan Pengaturan"}</button>
        </div>
      </div>

      <section style={cardBase}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 14 }}>Tampilan &amp; Branding</div>
        <div className="kbr-form-grid">
          {field("namaPerusahaan", "Nama Perusahaan")}
          {field("namaSingkat", "Nama Singkat")}
          {field("logoUrl", "URL Logo HTTPS")}
          {field("warnaUtama", "Warna Utama", "color")}
          {field("warnaSidebar", "Warna Sidebar", "color")}
          {field("warnaAksen", "Warna Aksen", "color")}
        </div>
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 14, padding: 14, background: "#F7F9FC", border: `1px solid ${C.border}`, borderRadius: 6 }}>
          <img src={values.logoUrl || DEFAULT_APP_SETTINGS.logoUrl} alt="Preview logo" style={{ width: 64, height: 64, objectFit: "contain", background: "#fff", border: `1px solid ${C.border}` }} />
          <div style={{ minWidth: 0 }}><div style={{ fontWeight: 800, color: values.warnaSidebar }}>{values.namaPerusahaan}</div><div style={{ fontSize: 12, color: C.muted }}>{values.tagline}</div></div>
          <label style={{ ...ghostBtn, marginLeft: "auto", opacity: assetUploading === "logo" ? 0.6 : 1 }}>
            <Upload size={14} /> {assetUploading === "logo" ? "Mengunggah..." : "Upload / Ganti Logo"}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadLogo} disabled={!!assetUploading} style={{ display: "none" }} />
          </label>
          <div style={{ width: 72, height: 32, background: values.warnaUtama, borderBottom: `5px solid ${values.warnaAksen}` }} title="Preview warna" />
        </div>
      </section>

      <section style={cardBase}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>Template Surat Word</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Upload DOC/DOCX, edit isi, lalu pilih templatenya pada menu Generate Surat.</div>
          </div>
          <label style={{ ...primaryBtn, opacity: assetUploading === "template" ? 0.6 : 1 }}>
            <Upload size={14} /> {assetUploading === "template" ? "Memproses..." : "Upload Template"}
            <input type="file" accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={uploadTemplate} disabled={!!assetUploading} style={{ display: "none" }} />
          </label>
        </div>
        <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 12 }}>
          Placeholder utama: {"{{nomorSurat}} · {{jenisSurat}} · {{tanggalSurat}} · {{namaPihak}} · {{nomorUnit}} · {{proyek}} · {{perihal}} · {{isiRingkas}} · {{penandatangan}} · {{namaPerusahaan}}"}
          <br />Placeholder khusus: {"{{periodeTagihan}} · {{nominalTagihan}} · {{tanggalJatuhTempo}} · {{pemberitahuanKe}} · {{kotaSurat}} · {{nomorSPPR}} · {{tanggalSPPR}} · {{nomorSPJB}} · {{tanggalSPJB}} · {{blokUnit}} · {{ID_Pihak}} · {{ID_Unit}}"}
        </div>
        {(values.customSuratTemplates || []).length === 0 ? (
          <div style={{ padding: 18, textAlign: "center", color: C.mutedLight, border: `1px dashed ${C.border}` }}>Belum ada template Word.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(values.customSuratTemplates || []).map((template) => (
              <div key={template.id} style={{ border: `1px solid ${C.border}`, padding: 12, background: "#FAFCFF" }}>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) auto auto", gap: 10, alignItems: "end" }}>
                  <label><span style={fieldLabelStyle}>Nama Template</span><input value={template.nama || ""} maxLength={120} onChange={(event) => updateTemplate(template.id, { nama: event.target.value })} style={formInputStyle} /></label>
                  <label style={{ display: "flex", alignItems: "center", gap: 7, paddingBottom: 9, fontSize: 12.5 }}><input type="checkbox" checked={template.aktif !== false} onChange={(event) => updateTemplate(template.id, { aktif: event.target.checked })} /> Aktif</label>
                  <button type="button" onClick={() => removeTemplate(template)} style={{ ...ghostBtn, color: C.red }} title="Hapus template"><Trash2 size={14} /> Hapus</button>
                </div>
                <textarea value={template.isi || ""} maxLength={30000} rows={9} onChange={(event) => updateTemplate(template.id, { isi: event.target.value })} style={{ ...formInputStyle, marginTop: 10, resize: "vertical", lineHeight: 1.55, fontFamily: "Georgia, serif" }} />
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 6, fontSize: 11, color: C.muted }}>
                  <span>{template.file ? `${template.file.name} · ${formatFileSize(template.file.size)}` : "Tanpa file sumber"}</span>
                  {template.file && <a href={template.file.url} target="_blank" rel="noreferrer" style={{ color: C.blue }}>Buka file asli</a>}
                </div>
              </div>
            ))}
          </div>
        )}
        {assetError && <div style={{ marginTop: 10, fontSize: 12, color: C.red }}>{assetError}</div>}
      </section>

      <section style={cardBase}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 14 }}>Kop &amp; Template Dokumen</div>
        <div className="kbr-form-grid">
          {field("tagline", "Tagline Kop")}
          {field("email", "Email Perusahaan", "email")}
          {field("alamat", "Alamat Kantor")}
          {field("telepon", "Telepon / WhatsApp")}
          {templateField("templateSurat", "Catatan Footer Surat")}
          {templateField("templateKuitansi", "Catatan Legal Kuitansi")}
          {templateField("templateSpk", "Catatan Footer SPK")}
          {templateField("templateDetail", "Catatan Footer Cetak Detail")}
          {field("footerDokumen", "Nama Perusahaan pada Footer")}
        </div>
      </section>

      <section style={cardBase}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>Instalasi PWA</div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>
              {installed ? "Aplikasi sedang berjalan dalam mode terpasang." : isIos ? "Di Safari pilih Bagikan, lalu Tambahkan ke Layar Utama." : installReady ? "Perangkat ini siap memasang aplikasi." : "Gunakan menu browser: Install app atau Tambahkan ke layar utama."}
            </div>
          </div>
          {!installed && installReady && <button type="button" onClick={install} style={primaryBtn}><Download size={15} /> Instal Aplikasi</button>}
          {installed && <span style={{ color: palette.green.fg, background: palette.green.bg, padding: "7px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>Terpasang</span>}
        </div>
      </section>
    </form>
  );
}

// ---------- halaman Profil Pengguna (ganti password sendiri) ----------
function ProfilePage({ user, onLogout }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (next !== confirm) { pushToast("Konfirmasi password tidak cocok.", "warning"); return; }
    if (next.length < 8) { pushToast("Password baru minimal 8 karakter.", "warning"); return; }
    setBusy(true);
    try {
      await gsCall("changeOwnPassword", current, next);
      pushToast("Password berhasil diperbarui. Silakan login ulang.", "success");
      setCurrent(""); setNext(""); setConfirm("");
      setTimeout(() => { if (onLogout) onLogout(); }, 1200);
    } catch (err) {
      pushToast((err && err.message) || "Gagal ganti password.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={pageTitleStyle}>Profil Saya</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>Kelola informasi akun dan ganti password login Anda.</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="kbr-content-cols">
        <div style={cardBase}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 8 }}>Informasi Akun</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 0" }}>
            <div style={{ width: 62, height: 62, borderRadius: "50%", background: "#DCE6F5", color: C.navy, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 26 }}>
              {(user && user.nama ? user.nama.charAt(0) : "?").toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>{(user && user.nama) || "-"}</div>
              <div style={{ fontSize: 12.5, color: C.muted }}>@{(user && user.username) || "-"}</div>
              <div style={{ fontSize: 12, color: C.mutedLight, marginTop: 3 }}>{(user && user.email) || "Email belum diisi"}</div>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 10, paddingTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12.5 }}>
            <div><div style={{ color: C.muted }}>Peran</div><div style={{ fontWeight: 700, color: C.ink }}>{(user && user.role) || "Manager"}</div></div>
            <div><div style={{ color: C.muted }}>ID Pengguna</div><div style={{ fontWeight: 700, color: C.ink, fontFamily: "monospace", fontSize: 11.5 }}>{(user && user.id) || "-"}</div></div>
          </div>
        </div>
        <div style={cardBase}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 8 }}>Ganti Password</div>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label>
              <span style={fieldLabelStyle}>Password Lama</span>
              <input type="password" className="kbr-input" value={current} onChange={(e) => setCurrent(e.target.value)} required style={formInputStyle} autoComplete="current-password" />
            </label>
            <label>
              <span style={fieldLabelStyle}>Password Baru (min 8 karakter)</span>
              <input type="password" className="kbr-input" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} style={formInputStyle} autoComplete="new-password" />
            </label>
            <label>
              <span style={fieldLabelStyle}>Konfirmasi Password Baru</span>
              <input type="password" className="kbr-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} style={formInputStyle} autoComplete="new-password" />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
              <button type="submit" disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.55 : 1 }}>
                {busy ? "Menyimpan..." : "Ubah Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ---------- halaman Audit Log (hanya Admin) ----------
function AuditLogPage() {
  const [rows, setRows] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const load = () => {
    setRows(null);
    setLoadError(false);
    gsCall("listAuditLog", 500)
      .then((res) => setRows(res || []))
      .catch(() => { setRows([]); setLoadError(true); });
  };
  useEffect(() => { load(); }, []);

  const q = filter.trim().toLowerCase();
  const filtered = (rows || []).filter((r) => {
    if (!q) return true;
    return [r.username, r.role, r.action, r.entity, r.recordId].join(" ").toLowerCase().includes(q);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const actionTone = (action) => {
    if (action === "CREATE") return "green";
    if (action === "UPDATE") return "blue";
    if (action === "DELETE") return "red";
    if (action === "LOGIN") return "teal";
    if (action === "LOGOUT") return "gray";
    if (action && action.indexOf("PASSWORD") >= 0) return "amber";
    if (action && (action.indexOf("BACKUP") >= 0 || action.indexOf("RESTORE") >= 0)) return "purple";
    return "gray";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={pageTitleStyle}>Audit Log</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>Semua aktivitas penting pengguna (login, buat, ubah, hapus, backup) tersimpan di sini.</div>
        </div>
        <button onClick={load} style={ghostBtn}><RefreshCw size={14} /> Muat Ulang</button>
      </div>
      <div style={cardBase}>
        <div style={{ position: "relative", maxWidth: 360, marginBottom: 10 }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.mutedLight }} />
          <input value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} placeholder="Filter user, action, entity, ID..." style={{ ...formInputStyle, padding: "9px 11px 9px 34px" }} />
        </div>
        {rows === null ? <LoadingState label="Memuat audit log..." variant="table" rows={6} /> : loadError ? <ErrorState onRetry={load} /> : (
          <div style={{ overflowX: "auto" }}>
            <table className="kbr-data-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 720 }}>
              <thead>
                <tr className="kbr-thead-row">
                  <th style={{ padding: "11px 14px", textAlign: "left", color: "#212529", fontSize: 12.5, fontWeight: 700, borderBottom: "2px solid #DEE2E6" }}>Waktu</th>
                  <th style={{ padding: "11px 14px", textAlign: "left", color: "#212529", fontSize: 12.5, fontWeight: 700, borderBottom: "2px solid #DEE2E6" }}>Pengguna</th>
                  <th style={{ padding: "11px 14px", textAlign: "left", color: "#212529", fontSize: 12.5, fontWeight: 700, borderBottom: "2px solid #DEE2E6" }}>Aksi</th>
                  <th style={{ padding: "11px 14px", textAlign: "left", color: "#212529", fontSize: 12.5, fontWeight: 700, borderBottom: "2px solid #DEE2E6" }}>Modul</th>
                  <th style={{ padding: "11px 14px", textAlign: "left", color: "#212529", fontSize: 12.5, fontWeight: 700, borderBottom: "2px solid #DEE2E6" }}>Record</th>
                  <th style={{ padding: "11px 14px", textAlign: "left", color: "#212529", fontSize: 12.5, fontWeight: 700, borderBottom: "2px solid #DEE2E6" }}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 30, textAlign: "center", color: C.mutedLight, fontSize: 12.5 }}>{filter ? "Tidak ada log yang cocok." : "Belum ada aktivitas tercatat."}</td></tr>
                ) : pageRows.map((r, i) => {
                  const tone = palette[actionTone(r.action)] || palette.gray;
                  const detailStr = Object.keys(r.details || {}).map((k) => k + ": " + r.details[k]).join(" · ") || "-";
                  return (
                    <tr key={i}>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: C.ink, whiteSpace: "nowrap" }}>{formatDateTime(r.timestamp)}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12.5, color: C.ink }}>
                        <div style={{ fontWeight: 700 }}>{r.username || "-"}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{r.role || "-"}</div>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ background: tone.bg, color: tone.fg, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>{r.action}</span>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: C.ink }}>{r.entity || "-"}</td>
                      <td style={{ padding: "10px 14px", fontSize: 11.5, color: C.muted, fontFamily: "monospace" }}>{r.recordId || "-"}</td>
                      <td style={{ padding: "10px 14px", fontSize: 11.5, color: C.muted, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis" }}>{detailStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length > pageSize && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                <div style={{ fontSize: 12, color: C.muted }}>Menampilkan {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filtered.length)} dari {filtered.length}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} style={{ ...ghostBtn, padding: "6px 10px", fontSize: 12, opacity: safePage <= 1 ? 0.4 : 1 }}>Prev</button>
                  <span style={{ fontSize: 12, fontWeight: 700, alignSelf: "center", minWidth: 60, textAlign: "center" }}>{safePage} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} style={{ ...ghostBtn, padding: "6px 10px", fontSize: 12, opacity: safePage >= totalPages ? 0.4 : 1 }}>Next</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Global Search Dropdown ----------
function GlobalSearchDropdown({ query, data, onClose, onNavigate }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = String(query || "").trim();
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    const timer = window.setTimeout(() => {
      const normalizedQuery = q.toLocaleLowerCase("id-ID");
      const hits = [];
      ENTITIES.some((schema) => {
        const rows = schema.virtual ? computeVirtualRecords(schema.key, data || {}) : ((data && data[schema.key]) || []);
        return rows.some((record) => {
          const searchableFields = schema.searchFields && schema.searchFields.length
            ? schema.searchFields
            : schema.fields.filter((field) => !field.secure).map((field) => field.key);
          const haystack = searchableFields
            .map((field) => String(record && record[field] != null ? record[field] : ""))
            .join(" ")
            .toLocaleLowerCase("id-ID");
          if (!haystack.includes(normalizedQuery)) return false;
          const labelField = searchableFields.find((field) => String(record && record[field] || "").trim());
          hits.push({
            entity: schema.key,
            id: record.id,
            label: (labelField && record[labelField]) || record.id || schema.label,
            subtitle: record.status || record.statusBayar || record.statusPembayaran || record.proyek || "",
          });
          return hits.length >= 60;
        });
      });
      setResults(hits);
      setLoading(false);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [query, data]);

  if (!query || query.trim().length < 2) return null;

  return (
    <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: "0 12px 30px rgba(0,0,0,0.12)", maxHeight: 420, overflowY: "auto", zIndex: 40 }}>
      {loading ? (
        <div style={{ padding: "18px 16px", fontSize: 12.5, color: C.muted, textAlign: "center" }}>Mencari...</div>
      ) : results.length === 0 ? (
        <div style={{ padding: "18px 16px", fontSize: 12.5, color: C.mutedLight, textAlign: "center" }}>Tidak ada hasil untuk "{query}".</div>
      ) : (
        results.map((r, i) => {
          const schema = entityByKey(r.entity);
          const IconComp = schema && schema.icon ? schema.icon : FileText;
          return (
            <button
              key={i}
              onClick={() => { onNavigate(r.entity); onClose(); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "none", border: "none", borderBottom: i < results.length - 1 ? `1px solid ${C.border}` : "none", cursor: "pointer", textAlign: "left" }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#F5F8FC")}
              onMouseOut={(e) => (e.currentTarget.style.background = "none")}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: palette.blue.bg, color: palette.blue.fg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <IconComp size={15} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.label}</div>
                <div style={{ fontSize: 11, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{(schema ? schema.label : r.entity)}{r.subtitle ? " · " + r.subtitle : ""}</div>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}

// ---------- halaman Laporan Keuangan (view read-only agregat) ----------
function FinanceReportPage({ data }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    gsCall("getFinanceSummary", { from: from || null, to: to || null })
      .then((res) => setSummary(res || null))
      .catch((err) => { pushToast((err && err.message) || "Gagal memuat laporan.", "error"); setSummary(null); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const s = summary || { totalMasuk: 0, totalKeluar: 0, netCashflow: 0, totalPiutangOpen: 0, totalHutangOpen: 0, totalBudgetRencana: 0, totalBudgetRealisasi: 0, sisaBudget: 0, perAkun: [], perKategoriKeluar: [] };
  const kartuStat = [
    { label: "Total Kas Masuk (Kredit)", value: s.totalMasuk, icon: ArrowDownCircle, tone: "green" },
    { label: "Total Kas Keluar (Debet)", value: s.totalKeluar, icon: ArrowUpCircle, tone: "red" },
    { label: "Arus Kas Bersih", value: s.netCashflow, icon: TrendingUp, tone: s.netCashflow >= 0 ? "blue" : "amber" },
    { label: "Piutang Belum Lunas", value: s.totalPiutangOpen, icon: HandCoins, tone: "amber" },
    { label: "Hutang Belum Lunas", value: s.totalHutangOpen, icon: Scale, tone: "purple" },
    { label: "Rencana Budget", value: s.totalBudgetRencana, icon: FileBarChart2, tone: "blue" },
    { label: "Realisasi Budget", value: s.totalBudgetRealisasi, icon: TrendingUp, tone: "brown" },
    { label: "Sisa Budget", value: s.sisaBudget, icon: PieChart, tone: s.sisaBudget >= 0 ? "green" : "red" },
  ];

  const exportSummaryCsv = () => {
    if (!summary) return;
    const rows = [
      ["Laporan Keuangan"],
      ["Periode dari", from || "(semua)"],
      ["Periode sampai", to || "(semua)"],
      [],
      ["Ringkasan"],
      ["Total Kas Masuk (Kredit)", s.totalMasuk],
      ["Total Kas Keluar (Debet)", s.totalKeluar],
      ["Arus Kas Bersih", s.netCashflow],
      ["Piutang Belum Lunas", s.totalPiutangOpen],
      ["Hutang Belum Lunas", s.totalHutangOpen],
      ["Rencana Budget", s.totalBudgetRencana],
      ["Realisasi Budget", s.totalBudgetRealisasi],
      ["Sisa Budget", s.sisaBudget],
      [],
      ["Saldo per Akun Kas/Bank"],
      ...s.perAkun.map((r) => [r.akun, r.saldo]),
      [],
      ["Realisasi per Kelompok Biaya"],
      ...s.perKategoriKeluar.map((r) => [r.kategori, r.jumlah]),
    ];
    const csv = rows.map((row) => row.map((c) => csvEscape(c)).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url; a.download = `laporan-keuangan-${stamp}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={pageTitleStyle}>Laporan Keuangan</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>Ringkasan arus kas, saldo akun, piutang & hutang.</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flexWrap: "wrap" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={fieldLabelStyle}>Dari</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ ...formInputStyle, padding: "8px 12px" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={fieldLabelStyle}>Sampai</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ ...formInputStyle, padding: "8px 12px" }} />
          </label>
          <button onClick={load} disabled={loading} style={primaryBtn}><RefreshCw size={14} /> {loading ? "Memuat..." : "Terapkan"}</button>
          <button onClick={exportSummaryCsv} disabled={!summary} style={{ ...ghostBtn, opacity: !summary ? 0.5 : 1 }}><Download size={14} /> Export CSV</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        {kartuStat.map((k, i) => {
          const tone = palette[k.tone] || palette.blue;
          const IconComp = k.icon;
          return (
            <div key={i} className="kbr-stat-card" style={{ ...cardBase, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 11.5, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.label}</div>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: tone.bg, color: tone.fg, display: "flex", alignItems: "center", justifyContent: "center" }}><IconComp size={17} /></div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.ink, marginTop: 6 }}>{formatRupiah(k.value)}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="kbr-content-cols">
        <div style={cardBase}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 8 }}>Saldo per Akun Kas/Bank</div>
          {s.perAkun.length === 0 ? (
            <div style={{ fontSize: 12.5, color: C.mutedLight, padding: "12px 0" }}>Belum ada transaksi tercatat.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {s.perAkun.map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px dashed ${C.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{r.akun}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: r.saldo >= 0 ? palette.green.fg : palette.red.fg }}>{formatRupiah(r.saldo)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={cardBase}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 8 }}>Realisasi Budget per Kelompok Biaya</div>
          {s.perKategoriKeluar.length === 0 ? (
            <div style={{ fontSize: 12.5, color: C.mutedLight, padding: "12px 0" }}>Belum ada realisasi budget tercatat.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {s.perKategoriKeluar.map((r, i) => {
                const pct = s.totalKeluar > 0 ? (r.jumlah / s.totalKeluar) * 100 : 0;
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
                      <span style={{ color: C.ink, fontWeight: 600 }}>{r.kategori}</span>
                      <span style={{ color: C.muted, fontWeight: 700 }}>{formatRupiah(r.jumlah)}</span>
                    </div>
                    <div style={{ height: 6, background: "#EEF2F8", borderRadius: 999 }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: palette.brown.fg, borderRadius: 999 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- halaman Backup Data - buat backup baru, lihat riwayat, unduh, pulihkan ----------
function BackupPage() {
  const [backups, setBackups] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loadError, setLoadError] = useState("");
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [backups && backups.length]);

  const loadBackups = () => {
    setBackups(null);
    setLoadError("");
    gsCall("listBackups")
      .then((res) => setBackups(res || []))
      .catch((error) => {
        setBackups([]);
        setLoadError((error && error.message) || "Daftar backup tidak dapat dimuat.");
      });
  };
  useEffect(() => { loadBackups(); }, []);

  const handleBackupNow = async () => {
    setRunning(true);
    setRunError("");
    try {
      await gsCall("backupData");
      pushToast("Backup data berhasil dibuat.", "success");
      loadBackups();
    } catch (e) {
      setRunError((e && e.message) || "Gagal membuat backup.");
    } finally {
      setRunning(false);
    }
  };

  const handleRestore = async () => {
    const target = restoreTarget;
    setRestoreTarget(null);
    setRestoring(true);
    try {
      await gsCall("restoreBackup", target.id);
      window.location.reload();
    } catch (e) {
      setRunError((e && e.message) || "Gagal memulihkan data dari backup ini.");
      setRestoring(false);
    }
  };

  const backupRows = backups || [];
  const totalPages = Math.max(1, Math.ceil(backupRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = pageStart + pageSize;
  const pagedBackups = backupRows.slice(pageStart, pageEnd);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={pageTitleStyle}>Backup Data</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>Amankan seluruh data ke Google Drive, dan pulihkan kapan saja jika diperlukan.</div>
        </div>
        <button onClick={handleBackupNow} disabled={running} style={{ ...primaryBtn, opacity: running ? 0.6 : 1, cursor: running ? "default" : "pointer" }}>
          <DatabaseBackup size={15} /> {running ? "Membuat Backup..." : "Backup Sekarang"}
        </button>
      </div>

      {runError && (
        <div style={{ ...cardBase, background: palette.red.bg, border: "none", color: palette.red.fg, fontSize: 13, fontWeight: 600 }}>{runError}</div>
      )}

      <div style={cardBase}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>Riwayat Backup</div>
        {backups === null ? (
          <LoadingState label="Memuat riwayat backup..." variant="table" rows={6} />
        ) : loadError ? (
          <ErrorState onRetry={loadBackups} message={loadError} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="kbr-data-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 560 }}>
              <thead>
                <tr className="kbr-thead-row">
                  <th style={{ padding: "11px 14px", textAlign: "left", color: "#212529", fontSize: 12.5, fontWeight: 700, borderBottom: "2px solid #DEE2E6" }}>Nama File</th>
                  <th style={{ padding: "11px 14px", textAlign: "left", color: "#212529", fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", borderBottom: "2px solid #DEE2E6" }}>Dibuat</th>
                  <th style={{ padding: "11px 14px", textAlign: "left", color: "#212529", fontSize: 12.5, fontWeight: 700, borderBottom: "2px solid #DEE2E6" }}>Ukuran</th>
                  <th style={{ padding: "11px 14px", textAlign: "center", color: "#212529", fontSize: 12.5, fontWeight: 700, borderBottom: "2px solid #DEE2E6" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {backups.length === 0 ? (
                  <EmptyRow colSpan={4} message='Belum ada backup. Klik "Backup Sekarang" untuk membuat yang pertama.' />
                ) : (
                  pagedBackups.map((b) => (
                    <tr key={b.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "12px 14px", fontSize: 13, color: C.ink }}>{b.name}</td>
                      <td style={{ padding: "12px 14px", fontSize: 13, color: C.ink, whiteSpace: "nowrap" }}>{formatDateTime(b.createdAt)}</td>
                      <td style={{ padding: "12px 14px", fontSize: 13, color: C.ink }}>{formatFileSize(b.size)}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                          <a href={b.url} target="_blank" rel="noreferrer" className="kbr-icon-btn" aria-label="Unduh" style={{ background: "none", color: C.muted, padding: 6, display: "inline-flex" }}><Download size={14} /></a>
                          <button className="kbr-icon-btn" aria-label="Pulihkan" onClick={() => setRestoreTarget(b)} disabled={restoring} style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", padding: 6 }}><RefreshCw size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {backups.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                <div style={{ fontSize: 12, color: C.muted }}>
                  Menampilkan {pageStart + 1}-{Math.min(pageEnd, backups.length)} dari {backups.length} backup
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value) || 10);
                      setPage(1);
                    }}
                    style={{ ...formInputStyle, minWidth: 88, padding: "7px 10px", fontSize: 12.5 }}
                  >
                    {[10, 20, 50].map((size) => <option key={size} value={size}>{size}/hal</option>)}
                  </select>
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} style={{ ...ghostBtn, padding: "7px 10px", fontSize: 12.5, opacity: safePage <= 1 ? 0.45 : 1 }}>
                    <ArrowLeft size={13} /> Prev
                  </button>
                  <span style={{ fontSize: 12.5, minWidth: 64, textAlign: "center", color: C.ink, fontWeight: 600 }}>{safePage} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} style={{ ...ghostBtn, padding: "7px 10px", fontSize: 12.5, opacity: safePage >= totalPages ? 0.45 : 1 }}>
                    Next <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {restoreTarget && (
        <ConfirmDialog
          title="Pulihkan data dari backup ini?"
          message={`Seluruh data saat ini akan DITIMPA dengan isi backup "${restoreTarget.name}" (${formatDateTime(restoreTarget.createdAt)}). Tindakan ini tidak bisa dibatalkan.`}
          onCancel={() => setRestoreTarget(null)}
          onConfirm={handleRestore}
        />
      )}
    </div>
  );
}

function LoginPage({ onLogin, loading, error }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <div className="kbr-login-page" style={{ minHeight: "100vh", backgroundColor: "#26343F", backgroundImage: `linear-gradient(90deg, rgba(7, 18, 33, 0.48), rgba(7, 18, 33, 0.16)), url('${window.KBR_ASSET_BASE_URL || "./"}bachground.png'), url('${window.KBR_ASSET_BASE_URL || "./"}bachground.png')`, backgroundSize: "100% 100%, contain, cover", backgroundPosition: "center, center, center", backgroundRepeat: "no-repeat", fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(18px, 5vw, 72px)", boxSizing: "border-box" }}>
      <style>{`
        .kbr-login-card {
          max-height: calc(100vh - 36px);
          overflow-y: auto;
          scrollbar-width: thin;
        }
        @media (max-width: 480px) {
          .kbr-login-page {
            justify-content: center !important;
            padding: 16px !important;
            background-size: 100% 100%, cover, cover !important;
            background-position: center, 44% center, 44% center !important;
          }
          .kbr-login-card { padding: 24px 20px !important; gap: 18px !important; }
          .kbr-login-footer { justify-content: center !important; text-align: center; }
        }
      `}</style>
      <div className="kbr-login-card" style={{ width: "100%", maxWidth: 410, background: "rgba(255,255,255,0.84)", border: "1px solid rgba(255,255,255,0.72)", borderRadius: 8, boxShadow: "0 24px 64px rgba(3, 12, 24, 0.32)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: "30px 28px", display: "flex", flexDirection: "column", gap: 20, boxSizing: "border-box" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10 }}>
          <CompanyLogo size={68} radius={8} />
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em" }}>{BRAND.fullName}</div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>Silakan masuk memakai akun yang terdaftar.</div>
            <div style={{ fontSize: 12, color: C.mutedLight, marginTop: 8, lineHeight: 1.7 }}>
              {KOP_SURAT_INFO.telepon}<br />{KOP_SURAT_INFO.emailSingkat}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ display: "block" }}>
            <span style={fieldLabelStyle}>Email</span>
            <input
              className="kbr-input"
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="nama@perusahaan.com"
              style={formInputStyle}
              autoComplete="email"
              required
              autoFocus
            />
          </label>

          <label style={{ display: "block" }}>
            <span style={fieldLabelStyle}>Password</span>
            <div style={{ position: "relative" }}>
              <input
                className="kbr-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                style={{ ...formInputStyle, paddingRight: 42 }}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.mutedLight, padding: 6, display: "flex" }}
              >
                <Eye size={15} />
              </button>
            </div>
          </label>

          {error && (
            <div role="alert" style={{ borderRadius: 10, background: palette.red.bg, color: palette.red.fg, fontSize: 12.5, padding: "9px 12px", border: `1px solid ${palette.red.fg}22` }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            style={{ ...primaryBtn, justifyContent: "center", width: "100%", padding: "12px 16px", marginTop: 2, opacity: loading || !username.trim() || !password.trim() ? 0.6 : 1, cursor: loading || !username.trim() || !password.trim() ? "default" : "pointer" }}
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>

          <button
            type="button"
            onClick={() => pushToast(`Lupa password? Hubungi Super Admin di ${KOP_SURAT_INFO.emailSingkat.replace("Email : ", "")} untuk direset.`, "info")}
            style={{ ...linkBtn, alignSelf: "center", fontSize: 12.5 }}
          >
            Lupa Password?
          </button>
        </form>

        <div className="kbr-login-footer" style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, fontSize: 11, color: C.mutedLight, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span>©2024 PT Kolaka Bumi Realty</span>
          <span>v{APP_VERSION}</span>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(SIDEBAR_PREF_KEY) === "1";
    } catch (e) {
      return false;
    }
  });
  const [active, setActive] = useState("dashboard");
  const [openMenus, setOpenMenus] = useState(() => buildClosedMenus());
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [authSession, setAuthSession] = useState(null);
  const [restoring, setRestoring] = useState(true);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [data, setData] = useState(null); // null = sedang memuat
  const [loadError, setLoadError] = useState(false);
  const deferredGlobalSearch = useDeferredValue(globalSearch);

  const readableEntities = (authSession && authSession.permissions && authSession.permissions.readableEntities) || [];
  const visibleEntities = ENTITIES.filter((en) => en.key !== "pengguna" && canReadEntity(authSession, en.key));
  const canBackup = !!(authSession && authSession.permissions && authSession.permissions.canBackup);
  const canManageSettings = !!(authSession && authSession.permissions && authSession.permissions.canManageUsers);

  // Firebase Auth memulihkan sesi persisten dan profil role dari Firestore.
  useEffect(() => {
    try {
      return observeSession((session, error) => {
        setAuthSession(session);
        setRestoring(false);
        if (error) setLoginError(error.message || "Sesi Firebase tidak dapat dipulihkan.");
      });
    } catch (error) {
      setAuthSession(null);
      setRestoring(false);
      setLoginError(error.message || "Konfigurasi Firebase belum valid.");
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (active === "backup" || active === "pengaturan" || active === "pengguna") {
      setOpenMenus((prev) => (prev[NAV_SYSTEM_GROUP_KEY] ? prev : { ...prev, [NAV_SYSTEM_GROUP_KEY]: true }));
      return;
    }
    const schema = entityByKey(active);
    if (!schema) return;
    const groupKey = getNavGroupKey(schema.group);
    setOpenMenus((prev) => (prev[groupKey] ? prev : { ...prev, [groupKey]: true }));
  }, [active]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(SIDEBAR_PREF_KEY, sidebarCollapsed ? "1" : "0");
    } catch (e) {
      // abaikan jika storage diblokir browser
    }
  }, [sidebarCollapsed]);

  const handleLogin = async (username, password) => {
    setLoginBusy(true);
    setLoginError("");
    try {
      const res = await gsCall("authenticateUser", username, password);
      setAuthSession(res.session || null);
      setActive("dashboard");
    } catch (err) {
      const msg = (err && err.message) ? String(err.message) : "Login gagal. Periksa email dan password Anda.";
      setLoginError(msg);
      setAuthSession(null);
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await gsCall("logout");
    } catch (err) {
      // tetap lanjut logout lokal meski sesi server sudah tidak ada
    }
    setAuthSession(null);
    setData(null);
    setLoadError(false);
    setSidebarOpen(false);
    setNotifOpen(false);
    setUserOpen(false);
    setActive("dashboard");
  };

  const loadData = () => {
    if (!authSession) return;
    setData(null);
    setLoadError(false);
    gsCall("listAllData")
      .then((res) => setData(res || {}))
      .catch(() => { setData({}); setLoadError(true); });
  };
  useEffect(() => { if (authSession) loadData(); }, [authSession]);

  const settingsRecord = data && data.pengaturan && data.pengaturan[0] ? data.pengaturan[0] : DEFAULT_APP_SETTINGS;
  applyAppSettings(settingsRecord);

  // Registrasi handler global untuk auto-arsip dokumen tercetak (dipanggil dari fungsi print).
  useEffect(() => {
    window.__kbrArchiveDocument = async (meta) => {
      const m = meta || {};
      const judul = String(m.judul || "Dokumen Tercetak").trim();
      if (!judul) return { ok: false };
      const list = (data && data.arsipdokumen) || [];
      const dedupeKey = (m.sourceKey && m.sourceId) ? `${m.sourceKey}#${m.sourceId}` : "";
      const already = list.find((r) => {
        if (dedupeKey && String(r.lokasiFisik || "").includes(dedupeKey)) return true;
        return String(r.judulDokumen || "").toLowerCase() === judul.toLowerCase();
      });
      if (already) return { ok: true, skipped: true };
      const today = new Date().toISOString().slice(0, 10);
      const catatan = [
        m.entitas ? `Sumber: ${m.entitas}` : "",
        m.nomorRef ? `Ref: ${m.nomorRef}` : "",
        dedupeKey ? `[${dedupeKey}]` : "",
      ].filter(Boolean).join(" | ");
      const record = {
        id: uid(),
        judulDokumen: judul,
        kategori: m.kategori || "Dokumen Tercetak",
        proyek: m.proyek || "",
        tanggalArsip: today,
        lokasiFisik: catatan || "Dicetak dari aplikasi",
      };
      try {
        setData((d) => ({ ...d, arsipdokumen: [record, ...((d && d.arsipdokumen) || [])] }));
        await gsCall("saveRecord", "arsipdokumen", record);
        pushToast(`Dokumen "${judul}" diarsipkan ke Arsip Dokumen.`, "success");
        return { ok: true };
      } catch (e) {
        setData((d) => ({ ...d, arsipdokumen: ((d && d.arsipdokumen) || []).filter((r) => r.id !== record.id) }));
        return { ok: false };
      }
    };
    return () => { window.__kbrArchiveDocument = null; };
  }, [data]);

  if (restoring) {
    return <div id="kbr-loading">Memulihkan sesi&hellip;</div>;
  }
  if (!authSession) {
    return <LoginPage onLogin={handleLogin} loading={loginBusy} error={loginError} />;
  }

  const handleSidebarToggle = () => {
    if (typeof window !== "undefined" && window.innerWidth <= 1024) {
      setSidebarOpen(true);
      return;
    }
    setSidebarCollapsed((v) => !v);
  };

  const expandAllMenus = () => {
    const nextMenus = buildClosedMenus();
    GROUP_ORDER.forEach((group) => {
      const hasItems = visibleEntities.some((en) => en.group === group);
      if (hasItems) {
        nextMenus[getNavGroupKey(group)] = true;
      }
    });
    if (canBackup || canManageSettings) nextMenus[NAV_SYSTEM_GROUP_KEY] = true;
    setOpenMenus(nextMenus);
  };

  const collapseAllMenus = () => {
    setOpenMenus(buildClosedMenus());
  };

  const goTo = (key) => {
    if (key === "backup" && !canBackup) return;
    if (key === "pengaturan" && !canManageSettings) return;
    if (key !== "dashboard" && key !== "backup" && key !== "pengaturan" && key !== "profil" && key !== "auditlog" && !readableEntities.includes(key)) return;
    setActive(key);
    if (typeof window !== "undefined" && window.innerWidth <= 1024) {
      const nextMenus = buildClosedMenus();
      if (key === "backup" || key === "pengaturan" || key === "pengguna") {
        nextMenus[NAV_SYSTEM_GROUP_KEY] = true;
      } else {
        const schema = entityByKey(key);
        if (schema) {
          nextMenus[getNavGroupKey(schema.group)] = true;
        }
      }
      setOpenMenus(nextMenus);
    }
    setSidebarOpen(false);
  };

  const handleSaveRecord = async (entityKey, record) => {
    if (!canWriteEntity(authSession, entityKey)) return false;
    const list = (data && data[entityKey]) || [];
    const isNew = !record.id || !list.some((item) => item.id === record.id);
    const finalRecord = attachWorkflowIds(entityKey, isNew ? { ...record, id: uid() } : { ...record }, data || {});
    const prevList = list;
    const nextList = isNew ? [finalRecord, ...list] : list.map((r) => (r.id === finalRecord.id ? finalRecord : r));
    setData((d) => ({ ...d, [entityKey]: nextList }));
    try {
      const savedRecord = await gsCall("saveRecord", entityKey, finalRecord);
      if (savedRecord && savedRecord.id && savedRecord.id !== finalRecord.id) {
        setData((current) => ({
          ...current,
          [entityKey]: ((current && current[entityKey]) || []).map((item) =>
            item.id === finalRecord.id ? savedRecord : item
          ),
        }));
      }
      const schemaLabel = (entityByKey(entityKey) || {}).label || entityKey;
      pushToast(`${schemaLabel} berhasil ${isNew ? "ditambahkan" : "diperbarui"}.`, "success");
      // Auto-sync: ketika Pengajuan KPR disetujui → buat record Berkas KPR di menu BANK
      if (entityKey === "pengajuankpr" && finalRecord.status === "Disetujui") {
        const berkasId = "berkaskpr-" + finalRecord.id;
        const berkasRecord = {
          id: berkasId,
          namaPembeli: finalRecord.namaPembeli || "",
          unit: finalRecord.nomorUnit || "",
          ID_Unit: finalRecord.ID_Unit || "",
          ID_Pihak: finalRecord.ID_Pihak || "",
          proyek: finalRecord.proyek || "",
          jenisKPR: finalRecord.jenisKPR || "",
          bank: finalRecord.bank || "",
          nomorBerkas: finalRecord.nomorSPK || "",
          plafondKPR: finalRecord.plafondKPR || "",
          uangMuka: finalRecord.uangMuka || "",
          tenorTahun: finalRecord.tenorTahun || "",
          namaPIC: "",
          tanggalAjukan: finalRecord.tanggalSPK || "",
          tanggalPersetujuan: finalRecord.tanggalSPK || "",
          catatan: finalRecord.catatan || "",
          status: "Disetujui",
        };
        try {
          await gsCall("saveRecord", "berkaskpr", berkasRecord);
          setData((d) => {
            const prev = (d && d.berkaskpr) || [];
            const next = prev.find((r) => r.id === berkasId) ? prev.map((r) => (r.id === berkasId ? berkasRecord : r)) : [berkasRecord, ...prev];
            return { ...d, berkaskpr: next };
          });
        } catch (e) {}
      }
      return true;
    } catch (e) {
      setData((d) => ({ ...d, [entityKey]: prevList }));
      pushToast(`Gagal menyimpan: ${(e && e.message) || "periksa koneksi jaringan"}`, "error");
      return false;
    }
  };

  /** Simpan banyak record hasil impor CSV sekaligus, tanpa toast per baris. */
  const handleImportRecords = async (entityKey, newRecords) => {
    if (!canWriteEntity(authSession, entityKey)) {
      return { saved: 0, failed: newRecords.length, errors: ["Akses ditolak untuk mengimpor data di modul ini."] };
    }
    const errors = [];
    const saved = [];
    for (let i = 0; i < newRecords.length; i++) {
      const record = attachWorkflowIds(entityKey, { ...newRecords[i] }, data || {});
      try {
        await gsCall("saveRecord", entityKey, record);
        saved.push(record);
      } catch (e) {
        errors.push(`Data ke-${i + 1}: ${(e && e.message) || "gagal disimpan"}`);
      }
    }
    if (saved.length) {
      setData((d) => ({ ...d, [entityKey]: [...saved.slice().reverse(), ...((d && d[entityKey]) || [])] }));
      pushToast(`${saved.length} data berhasil diimpor.`, "success");
    }
    if (errors.length) pushToast(`${errors.length} data gagal diimpor.`, "error");
    return { saved: saved.length, failed: errors.length, errors };
  };

  const handleDeleteRecord = async (entityKey, id) => {
    if (!canWriteEntity(authSession, entityKey)) return false;
    const list = (data && data[entityKey]) || [];
    const prevList = list;
    setData((d) => ({ ...d, [entityKey]: list.filter((r) => r.id !== id) }));
    try {
      await gsCall("deleteRecord", entityKey, id);
      const schemaLabel = (entityByKey(entityKey) || {}).label || entityKey;
      pushToast(`${schemaLabel} berhasil dihapus.`, "success");
      return true;
    } catch (e) {
      setData((d) => ({ ...d, [entityKey]: prevList }));
      pushToast(`Gagal menghapus: ${(e && e.message) || "periksa koneksi jaringan"}`, "error");
      return false;
    }
  };

  const activeSchema = (active === "dashboard" || active === "backup" || active === "pengaturan" || active === "profil" || active === "auditlog" || active === "laporankeuangan") ? null : entityByKey(active);
  const activeRecords = activeSchema ? (activeSchema.virtual ? computeVirtualRecords(activeSchema.key, data) : (data[activeSchema.key] || [])) : [];
  const notifCount = data ? computeDashboardStats(data).pengingat.length : 0;
  const userInitial = ((authSession.user && authSession.user.nama) ? authSession.user.nama : "?").trim().charAt(0).toUpperCase() || "?";
  const canWriteActive = activeSchema ? (canWriteEntity(authSession, activeSchema.key) && !activeSchema.readOnly) : false;

  return (
    <div className={`kbr-app ${sidebarCollapsed ? "sidebar-collapsed" : ""}`} style={{ minHeight: "100vh", background: C.page, fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif", display: "flex" }}>
      <style>{`
        :root {
          --kbr-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
          --kbr-ease-standard: cubic-bezier(0.2, 0, 0, 1);
          --kbr-surface: #FFFFFF;
          --kbr-surface-muted: #F7F9FC;
          --kbr-line: #DCE3EC;
          --kbr-focus: rgba(31, 95, 154, 0.22);
          --kbr-shadow-float: 0 18px 48px rgba(9, 30, 56, 0.16);
        }
        * { box-sizing: border-box; }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Manrope:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        button { font-family: inherit; }
        html { background: #E8EDF4; }
        body { background: #F4F6F9; color: ${C.ink}; text-rendering: optimizeLegibility; }
        body, button, input, select, textarea { letter-spacing: 0; }
        ::selection { background: rgba(184,134,59,0.22); color: #0A1930; }
        .kbr-sidebar-close { display: none; }
        .kbr-menu-group { margin-bottom: 2px; }
        .kbr-menu-bulk { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 6px 0 8px; }
        .kbr-menu-bulk-btn { flex: 1; border: 1px solid ${SIDE.divider}; background: rgba(255,255,255,0.05); color: ${SIDE.textDim}; border-radius: ${UI.radius}px; padding: 6px 8px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; cursor: pointer; transition: all 0.15s ease; }
        .kbr-menu-bulk-btn:hover { background: rgba(255,255,255,0.09); color: #fff; border-color: rgba(255,255,255,0.3); }
        .kbr-menu-toggle { transition: background 0.18s var(--kbr-ease-standard), color 0.18s var(--kbr-ease-standard); }
        .kbr-menu-toggle:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .kbr-submenu { display: flex; flex-direction: column; gap: 1px; padding: 2px 0 4px; background: ${SIDE.submenuBg}; border-radius: ${UI.radius}px; margin-top: 1px; transform-origin: top; animation: kbr-menu-reveal 0.24s var(--kbr-ease-out) both; }
        .kbr-bullet { width: 6px; height: 6px; border-radius: 50%; border: 1px solid currentColor; flex-shrink: 0; opacity: 0.55; }
        .kbr-nav-item { transition: background 0.18s var(--kbr-ease-standard), color 0.18s var(--kbr-ease-standard), transform 0.18s var(--kbr-ease-standard); }
        .kbr-nav-item:hover:not(.active) { background: rgba(255,255,255,0.08); color: #fff; }
        .kbr-nav-item.active { font-weight: 500; }
        .kbr-link { transition: opacity 0.15s ease; }
        .kbr-link:hover { opacity: 0.7; }
        .kbr-stat-card, .kbr-panel-row { transition: box-shadow 0.22s var(--kbr-ease-out), transform 0.22s var(--kbr-ease-out), background 0.18s ease, border-color 0.18s ease; }
        .kbr-stat-card:hover { box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 14px 32px rgba(15,23,42,0.08); transform: translateY(-2px); border-color: #D6DDE8; }
        .kbr-panel-row:hover { background: #F7F9FC; }
        .kbr-icon-btn { transition: background 0.18s ease, color 0.18s ease, transform 0.18s var(--kbr-ease-out); border-radius: ${UI.radius}px; }
        .kbr-icon-btn:hover { background: #F0F3F8; }
        .kbr-shortcut:hover { color: ${UI.primary} !important; text-decoration: underline; }
        .kbr-data-table thead th { position: sticky; top: 0; z-index: 2; background: #FFFFFF; }
        .kbr-data-table tbody tr:nth-child(odd) { background: #FFFFFF; }
        .kbr-data-table tbody tr:nth-child(even) { background: #F8F9FA; }
        .kbr-data-table tbody tr:hover { background: #ECF3FB; }
        .kbr-data-table tbody td { border-top: 1px solid #E9ECEF; }
        button:hover { transform: translateY(-1px); }
        button:active { transform: translateY(0) scale(0.99); }
        button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, a:focus-visible { outline: 2px solid ${C.blue}; outline-offset: 2px; border-color: ${C.blue}; box-shadow: 0 0 0 4px var(--kbr-focus); }
        .kbr-input:focus { border-color: ${C.blue} !important; box-shadow: 0 0 0 3px rgba(41,82,182,0.16); }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: #C7D0DD; border-radius: 4px; }
        .kbr-scrim { display: none; }
        .kbr-dropdown-overlay { position: fixed; inset: 0; z-index: 45; background: transparent; }
        .kbr-dropdown { position: absolute; top: calc(100% + 8px); right: 0; background: rgba(255,255,255,0.98); border: 1px solid var(--kbr-line); border-radius: 10px; box-shadow: var(--kbr-shadow-float); z-index: 46; overflow: hidden; transform-origin: top right; animation: kbr-dropdown-in 0.2s var(--kbr-ease-out) both; backdrop-filter: blur(14px); }
        .kbr-dropdown-item { transition: background 0.12s ease; }
        .kbr-dropdown-item:hover { background: #F3F5F9; }
        .kbr-modal-overlay { position: fixed; inset: 0; background: rgba(5,18,36,0.58); z-index: 50; display: flex; align-items: center; justify-content: center; padding: 20px; animation: kbr-fade-in 0.2s ease; backdrop-filter: blur(5px); }
        .kbr-modal { background: #fff; border: 1px solid rgba(255,255,255,0.72); border-radius: 12px; width: 100%; max-width: 480px; max-height: 88vh; display: flex; flex-direction: column; box-shadow: 0 28px 70px rgba(5,18,36,0.28); animation: kbr-scale-in 0.28s var(--kbr-ease-out); }
        .kbr-modal-form { max-width: 1040px; }
        .kbr-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 14px 18px; align-content: start; }
        .kbr-form-grid > .kbr-field-wide { grid-column: 1 / -1; }
        .kbr-skeleton { background: linear-gradient(90deg, #EEF2F8 25%, #F8FAFD 37%, #EEF2F8 63%); background-size: 400% 100%; animation: kbr-skeleton 1.3s ease infinite; }
        .kbr-spinner { width: 30px; height: 30px; border-radius: 50%; border: 3px solid #E7EAF1; border-top-color: ${C.navy}; animation: kbr-spin 0.7s linear infinite; }
        @keyframes kbr-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes kbr-scale-in { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes kbr-view-enter { from { opacity: 0; transform: translate3d(18px, 0, 0); } to { opacity: 1; transform: translate3d(0, 0, 0); } }
        @keyframes kbr-menu-reveal { from { opacity: 0; transform: scaleY(0.94) translateY(-4px); } to { opacity: 1; transform: scaleY(1) translateY(0); } }
        @keyframes kbr-dropdown-in { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes kbr-slide-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes kbr-slide-in-right { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes kbr-skeleton { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
        @keyframes kbr-spin { to { transform: rotate(360deg); } }
        @keyframes kbr-toast-in { from { opacity: 0; transform: translateX(80px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes kbr-dash-in { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes kbr-card-pop { from { opacity: 0; transform: translateY(14px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .kbr-toast { animation: kbr-toast-in 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
        .kbr-view-stage { display: flex; flex-direction: column; gap: 20px; min-width: 0; animation: kbr-view-enter 0.34s var(--kbr-ease-out) both; }
        .kbr-dash-section { animation: kbr-dash-in 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .kbr-dash-section:nth-of-type(1) { animation-delay: 0.02s; }
        .kbr-dash-section:nth-of-type(2) { animation-delay: 0.10s; }
        .kbr-dash-section:nth-of-type(3) { animation-delay: 0.18s; }
        .kbr-dash-section:nth-of-type(4) { animation-delay: 0.26s; }
        .kbr-dash-section:nth-of-type(5) { animation-delay: 0.34s; }
        .kbr-dash-section:nth-of-type(6) { animation-delay: 0.42s; }
        .kbr-dash-section:nth-of-type(7) { animation-delay: 0.50s; }
        .kbr-dash-swipe > * { animation: kbr-card-pop 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .kbr-dash-swipe > *:nth-child(1) { animation-delay: 0.05s; }
        .kbr-dash-swipe > *:nth-child(2) { animation-delay: 0.11s; }
        .kbr-dash-swipe > *:nth-child(3) { animation-delay: 0.17s; }
        .kbr-dash-swipe > *:nth-child(4) { animation-delay: 0.23s; }
        .kbr-dash-swipe > *:nth-child(5) { animation-delay: 0.29s; }
        .kbr-dash-swipe > *:nth-child(6) { animation-delay: 0.35s; }
        .kbr-dash-swipe > *:nth-child(7) { animation-delay: 0.41s; }
        .kbr-dash-swipe > *:nth-child(8) { animation-delay: 0.47s; }
        .kbr-fatal { min-height: 100vh; display: grid; place-content: center; justify-items: start; gap: 20px; padding: 32px; background: #F4F6F9; color: #10233F; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .kbr-fatal h1 { margin: 4px 0 8px; font-size: clamp(24px, 4vw, 38px); font-weight: 750; }
        .kbr-fatal p { margin: 0; max-width: 560px; color: #5A687A; line-height: 1.65; }
        .kbr-fatal-kicker { color: #8B672D; font-size: 12px; font-weight: 800; text-transform: uppercase; }
        .kbr-fatal button { border: 0; border-radius: 8px; padding: 11px 16px; background: #123A63; color: #fff; font-weight: 700; cursor: pointer; }
        @media (min-width: 1440px) {
          .kbr-content-pad { max-width: 1440px; margin-left: auto !important; margin-right: auto !important; }
        }
        @media (max-width: 1024px) {
          .kbr-sidebar { position: fixed; z-index: 40; height: 100vh; transform: translateX(-100%); transition: transform 0.3s var(--kbr-ease-out); box-shadow: 22px 0 55px rgba(5,18,36,0.18); }
          .kbr-sidebar.open { transform: translateX(0); }
          .kbr-scrim.open { display: block; position: fixed; inset: 0; background: rgba(10,20,40,0.45); z-index: 30; }
          .kbr-main { margin-left: 0 !important; }
          .kbr-sidebar-close { display: flex; }
          .kbr-brand-text { display: block !important; }
          .kbr-dash-mid { grid-template-columns: 1fr !important; }
          .kbr-dash-bot { grid-template-columns: 1fr !important; }
        }
        .kbr-grid-2 { grid-template-columns: 1fr !important; }
        .kbr-content-cols { grid-template-columns: 1fr !important; }
      }
      @media (max-width: 640px) {
        .kbr-topbar-title { display: none !important; }
        .kbr-topbar-user { display: none !important; }
        .kbr-searchbar { display: none !important; }
        .kbr-content-pad { padding: 16px !important; }
        .kbr-welcome { flex-direction: column; align-items: flex-start !important; gap: 14px; }
        .kbr-modal { max-height: 94vh; border-radius: 14px 14px 0 0; align-self: flex-end; }
        .kbr-modal-overlay { align-items: flex-end; padding: 0; }
        .kbr-form-grid { grid-template-columns: 1fr !important; gap: 13px !important; }
        .kbr-dash-swipe {
          display: flex !important;
          grid-template-columns: none !important;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          gap: 12px !important;
          padding: 4px 4px 12px !important;
          margin: 0 -12px !important;
          padding-left: 12px !important;
          padding-right: 12px !important;
        }
        .kbr-dash-swipe::-webkit-scrollbar { display: none; }
        .kbr-dash-swipe > * {
          flex: 0 0 82%;
          scroll-snap-align: start;
          min-width: 0;
        }
        .kbr-dash-swipe.kbr-dash-swipe-sm > * { flex: 0 0 68%; }
        .kbr-dash-swipe-hint {
          display: block !important;
          font-size: 10.5px;
          color: #94A3B8;
          margin-top: 4px;
          font-weight: 600;
          letter-spacing: 0.05em;
        }
      }
      .kbr-dash-swipe-hint { display: none; }
      .sidebar-collapsed .kbr-brand-text { display: none; }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          scroll-behavior: auto !important;
          animation-duration: 0.001ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.001ms !important;
        }
        button:hover, button:active, .kbr-stat-card:hover { transform: none !important; }
      }
      @media print {
        .kbr-sidebar, .kbr-scrim, header, .no-print { display: none !important; }
        body, .kbr-main, main { background: #fff !important; margin: 0 !important; padding: 0 !important; }
        .kbr-modal-overlay { position: static !important; background: none !important; padding: 0 !important; display: block !important; }
        .kbr-modal { box-shadow: none !important; max-width: none !important; max-height: none !important; width: 100% !important; }
        .kbr-print-area { border: none !important; box-shadow: none !important; }
        .kbr-print-title { display: block !important; margin-bottom: 14px; }
        .kbr-kop-print { display: block !important; }
      }
    `}</style>

      <div className={`kbr-scrim ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`kbr-sidebar ${sidebarOpen ? "open" : ""} ${sidebarCollapsed ? "collapsed" : ""}`} style={{ width: sidebarCollapsed ? 82 : 250, background: SIDE.bg, display: "flex", flexDirection: "column", flexShrink: 0, transition: "width 0.18s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: sidebarCollapsed ? "16px 10px" : "16px 16px", height: 62, background: SIDE.brandBg, borderBottom: `1px solid ${SIDE.divider}`, flexShrink: 0, justifyContent: sidebarCollapsed ? "center" : "flex-start" }}>
          <CompanyLogo size={30} radius={6} ring={true} />
          <div className="kbr-brand-text" style={{ minWidth: 0, color: "#fff", fontWeight: 400, fontSize: 19, letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
            KBR MENU
          </div>
          <button className="kbr-icon-btn kbr-sidebar-close" onClick={() => setSidebarOpen(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: SIDE.text, cursor: "pointer" }} aria-label="Tutup menu">
            <X size={18} />
          </button>
        </div>

        <nav style={{ flex: 1, overflowY: "auto", padding: sidebarCollapsed ? "8px 6px 20px" : "8px 8px 20px" }}>
          <button
            className={`kbr-nav-item ${active === "dashboard" ? "active" : ""}`}
            onClick={() => goTo("dashboard")}
            title="Dashboard"
            style={sidebarCollapsed
              ? { width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 4px", marginBottom: 4, borderRadius: UI.radius, border: "none", cursor: "pointer", background: active === "dashboard" ? SIDE.activeBg : "transparent", color: active === "dashboard" ? "#fff" : SIDE.text }
              : { width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", marginBottom: 2, borderRadius: UI.radius, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 400, textAlign: "left", background: active === "dashboard" ? SIDE.activeBg : "transparent", color: active === "dashboard" ? "#fff" : SIDE.text }}
          >
            <Home size={18} strokeWidth={1.9} />
            {sidebarCollapsed ? <span style={{ fontSize: 9.5, lineHeight: 1.15, textAlign: "center" }}>Dashboard</span> : <span>Dashboard</span>}
          </button>

          {sidebarCollapsed ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {visibleEntities.map((item) => (
                <button
                  key={item.key}
                  className={`kbr-nav-item ${active === item.key ? "active" : ""}`}
                  onClick={() => goTo(item.key)}
                  title={item.label}
                  style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 4px", borderRadius: UI.radius, border: "none", cursor: "pointer", background: active === item.key ? SIDE.activeBg : "transparent", color: active === item.key ? "#fff" : SIDE.text }}
                >
                  <item.icon size={17} strokeWidth={1.9} />
                  <span style={{ fontSize: 9, lineHeight: 1.15, textAlign: "center", overflow: "hidden" }}>{getMenuLabel(item)}</span>
                </button>
              ))}
              {canBackup && (
                <button
                  className={`kbr-nav-item ${active === "backup" ? "active" : ""}`}
                  onClick={() => goTo("backup")}
                  title="Backup Data"
                  style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 4px", borderRadius: UI.radius, border: "none", cursor: "pointer", background: active === "backup" ? SIDE.activeBg : "transparent", color: active === "backup" ? "#fff" : SIDE.text }}
                >
                  <DatabaseBackup size={17} strokeWidth={1.9} />
                  <span style={{ fontSize: 9, lineHeight: 1.15, textAlign: "center" }}>Backup</span>
                </button>
              )}
              {canManageSettings && (
                <button
                  className={`kbr-nav-item ${active === "pengguna" ? "active" : ""}`}
                  onClick={() => goTo("pengguna")}
                  title="Pengguna & Hak Akses"
                  style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 4px", borderRadius: UI.radius, border: "none", cursor: "pointer", background: active === "pengguna" ? SIDE.activeBg : "transparent", color: active === "pengguna" ? "#fff" : SIDE.text }}
                >
                  <UserCog size={17} strokeWidth={1.9} />
                  <span style={{ fontSize: 9, lineHeight: 1.15, textAlign: "center" }}>Hak Akses</span>
                </button>
              )}
              {canManageSettings && (
                <button
                  className={`kbr-nav-item ${active === "pengaturan" ? "active" : ""}`}
                  onClick={() => goTo("pengaturan")}
                  title="Pengaturan Aplikasi"
                  style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 4px", borderRadius: UI.radius, border: "none", cursor: "pointer", background: active === "pengaturan" ? SIDE.activeBg : "transparent", color: active === "pengaturan" ? "#fff" : SIDE.text }}
                >
                  <Settings size={17} strokeWidth={1.9} />
                  <span style={{ fontSize: 9, lineHeight: 1.15, textAlign: "center" }}>Pengaturan</span>
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="kbr-menu-bulk">
                <button className="kbr-menu-bulk-btn" onClick={expandAllMenus} type="button">Expand All</button>
                <button className="kbr-menu-bulk-btn" onClick={collapseAllMenus} type="button">Collapse All</button>
              </div>
              {GROUP_ORDER.map((group) => {
                const items = visibleEntities.filter((en) => en.group === group);
                if (items.length === 0) return null;
                const groupKey = getNavGroupKey(group);
                const isOpen = !!openMenus[groupKey];
                const GroupIcon = getNavGroupIcon(groupKey);
                const hasActiveChild = items.some((en) => en.key === active);
                return (
                  <div key={groupKey} className="kbr-menu-group">
                    <button
                      className="kbr-menu-toggle"
                      onClick={() => setOpenMenus((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }))}
                      aria-expanded={isOpen}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: UI.radius, border: "none", background: hasActiveChild ? SIDE.activeBg : "transparent", color: hasActiveChild ? "#fff" : SIDE.text, cursor: "pointer", fontSize: 14, fontWeight: 400, textAlign: "left" }}
                    >
                      <GroupIcon size={18} strokeWidth={1.9} />
                      <span style={{ flex: 1, textTransform: "capitalize" }}>{getNavGroupLabel(group).toLowerCase()}</span>
                      <ChevronDown size={14} style={{ transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s ease", flexShrink: 0 }} />
                    </button>
                    {isOpen && (
                      <div className="kbr-submenu">
                        {items.map((item) => (
                          <button
                            key={item.key}
                            className={`kbr-nav-item kbr-subitem ${active === item.key ? "active" : ""}`}
                            onClick={() => goTo(item.key)}
                            title={item.label}
                            style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px 8px 22px", borderRadius: UI.radius, border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", background: active === item.key ? SIDE.activeBg : "transparent", color: active === item.key ? "#fff" : SIDE.text }}
                          >
                            <span className="kbr-bullet" />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getMenuLabel(item)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {(canBackup || canManageSettings) && (
                <div className="kbr-menu-group">
                  <button
                    className="kbr-menu-toggle"
                    onClick={() => setOpenMenus((prev) => ({ ...prev, [NAV_SYSTEM_GROUP_KEY]: !prev[NAV_SYSTEM_GROUP_KEY] }))}
                    aria-expanded={!!openMenus[NAV_SYSTEM_GROUP_KEY]}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: UI.radius, border: "none", background: active === "backup" || active === "pengaturan" || active === "pengguna" ? SIDE.activeBg : "transparent", color: active === "backup" || active === "pengaturan" || active === "pengguna" ? "#fff" : SIDE.text, cursor: "pointer", fontSize: 14, fontWeight: 400, textAlign: "left" }}
                  >
                    <Settings size={18} strokeWidth={1.9} />
                    <span style={{ flex: 1 }}>Sistem</span>
                    <ChevronDown size={14} style={{ transform: openMenus[NAV_SYSTEM_GROUP_KEY] ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s ease", flexShrink: 0 }} />
                  </button>
                  {openMenus[NAV_SYSTEM_GROUP_KEY] && (
                    <div className="kbr-submenu">
                      {canManageSettings && <button
                        className={`kbr-nav-item kbr-subitem ${active === "pengguna" ? "active" : ""}`}
                        onClick={() => goTo("pengguna")}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px 8px 22px", borderRadius: UI.radius, border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", background: active === "pengguna" ? SIDE.activeBg : "transparent", color: active === "pengguna" ? "#fff" : SIDE.text }}
                      >
                        <span className="kbr-bullet" />
                        <span>Pengguna &amp; Hak Akses</span>
                      </button>}
                      {canManageSettings && <button
                        className={`kbr-nav-item kbr-subitem ${active === "pengaturan" ? "active" : ""}`}
                        onClick={() => goTo("pengaturan")}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px 8px 22px", borderRadius: UI.radius, border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", background: active === "pengaturan" ? SIDE.activeBg : "transparent", color: active === "pengaturan" ? "#fff" : SIDE.text }}
                      >
                        <span className="kbr-bullet" />
                        <span>Pengaturan Aplikasi</span>
                      </button>}
                      {canBackup && <button
                        className={`kbr-nav-item kbr-subitem ${active === "backup" ? "active" : ""}`}
                        onClick={() => goTo("backup")}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px 8px 22px", borderRadius: UI.radius, border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", background: active === "backup" ? SIDE.activeBg : "transparent", color: active === "backup" ? "#fff" : SIDE.text }}
                      >
                        <span className="kbr-bullet" />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Backup Database</span>
                      </button>}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </nav>
        <div className="kbr-hide-menu-wrap" style={{ padding: "0 10px 12px" }}>
          <button
            onClick={handleSidebarToggle}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: sidebarCollapsed ? "center" : "flex-start", gap: 8, border: `1px solid ${SIDE.divider}`, background: "rgba(255,255,255,0.05)", color: SIDE.text, borderRadius: UI.radius, padding: "9px 11px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
          >
            <ChevronDown size={14} style={{ transform: sidebarCollapsed ? "rotate(-90deg)" : "rotate(90deg)" }} />
            {!sidebarCollapsed && <span>Sembunyikan Menu</span>}
          </button>
        </div>
      </aside>

      <div className="kbr-main" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header style={{ background: C.card, borderBottom: `1px solid ${UI.boxBorder}`, padding: "0 18px", height: 62, display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 20 }}>
          <button className="kbr-icon-btn" onClick={handleSidebarToggle} style={{ background: "none", border: "none", color: "#495057", cursor: "pointer", padding: 8, flexShrink: 0 }} aria-label="Buka menu">
            <Menu size={22} />
          </button>

          <div className="kbr-searchbar" style={{ flex: 1, maxWidth: 420, position: "relative" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.mutedLight }} />
              <input
                value={globalSearch}
                onChange={(e) => { setGlobalSearch(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Cari data di semua modul..."
                style={{ ...formInputStyle, padding: "9px 12px 9px 34px", background: "#F9FBFF" }}
              />
              {globalSearch && (
                <button onClick={() => { setGlobalSearch(""); setSearchOpen(false); }} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.mutedLight, padding: 4 }} aria-label="Bersihkan pencarian"><X size={13} /></button>
              )}
            </div>
            {searchOpen && globalSearch && (
              <>
                <div onClick={() => setSearchOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 39 }} />
                <GlobalSearchDropdown query={deferredGlobalSearch} data={data} onClose={() => { setSearchOpen(false); setGlobalSearch(""); }} onNavigate={(entity) => goTo(entity)} />
              </>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
            <div style={{ position: "relative" }}>
              <button className="kbr-icon-btn" onClick={() => { setNotifOpen((v) => !v); setUserOpen(false); }} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: 8, color: "#495057" }} aria-label="Notifikasi" aria-expanded={notifOpen}>
                <Bell size={19} />
                {notifCount > 0 && <span style={{ position: "absolute", top: 2, right: 2, background: C.red, color: "#fff", fontSize: 9.5, fontWeight: 700, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>{notifCount}</span>}
              </button>
              {notifOpen && (
                <>
                  <div className="kbr-dropdown-overlay" onClick={() => setNotifOpen(false)} />
                  <div className="kbr-dropdown" style={{ width: 290 }}>
                    <div style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, color: C.ink, borderBottom: `1px solid ${C.border}` }}>Pengingat &amp; Notifikasi</div>
                    {!data || computeDashboardStats(data).pengingat.length === 0 ? (
                      <div style={{ padding: "18px 14px", fontSize: 12.5, color: C.mutedLight, textAlign: "center" }}>Tidak ada pengingat saat ini.</div>
                    ) : (
                      computeDashboardStats(data).pengingat.map((n, i) => (
                        <div key={i} className="kbr-dropdown-item" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" }}>
                          <IconAvatar tone={n.tone} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.title}</div>
                            <div style={{ fontSize: 11.5, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.sub}</div>
                          </div>
                        </div>
                      ))
                    )}
                    <button className="kbr-dropdown-item" onClick={() => { goTo("dashboard"); setNotifOpen(false); }} style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", borderTop: `1px solid ${C.border}`, color: C.blue, fontSize: 12.5, fontWeight: 600, cursor: "pointer", textAlign: "center" }}>
                      Lihat di Dashboard
                    </button>
                  </div>
                </>
              )}
            </div>
            <div style={{ position: "relative" }}>
              <button onClick={() => { setUserOpen((v) => !v); setNotifOpen(false); }} aria-expanded={userOpen} aria-label="Menu pengguna" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: "none", border: "none", padding: "6px 8px", borderRadius: UI.radius }} className="kbr-icon-btn">
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#DCE6F5", color: C.navy, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12.5, flexShrink: 0 }}>{userInitial}</div>
                <span className="kbr-topbar-user" style={{ fontSize: 13.5, color: "#495057", whiteSpace: "nowrap" }}>
                  {(authSession.user && authSession.user.role) || "Pengguna"} - {(authSession.user && authSession.user.nama) || "-"}
                </span>
                <ChevronDown size={14} color="#6C757D" />
              </button>
              {userOpen && (
                <>
                  <div className="kbr-dropdown-overlay" onClick={() => setUserOpen(false)} />
                  <div className="kbr-dropdown" style={{ width: 200 }}>
                    <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{(authSession.user && authSession.user.nama) || "Pengguna"}</div>
                      <div style={{ fontSize: 11.5, color: C.muted }}>{(authSession.user && authSession.user.role) || "Manager"}</div>
                    </div>
                    <button className="kbr-dropdown-item" onClick={() => { setUserOpen(false); goTo("profil"); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.ink, textAlign: "left" }}>
                      <UserRound size={15} /> Profil Saya
                    </button>
                    {authSession.permissions && authSession.permissions.canManageUsers && (
                      <button className="kbr-dropdown-item" onClick={() => { setUserOpen(false); goTo("auditlog"); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.ink, textAlign: "left" }}>
                        <ClipboardList size={15} /> Audit Log
                      </button>
                    )}
                    <button className="kbr-dropdown-item" onClick={handleLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.red, textAlign: "left", borderTop: `1px solid ${C.border}` }}>
                      <LogOut size={15} /> Keluar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="kbr-content-pad" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          {authSession.bootstrapMode && (
            <div style={{ ...cardBase, border: "none", background: palette.amber.bg, color: palette.amber.fg }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>Mode bootstrap aktif</div>
              <div style={{ fontSize: 12.5 }}>
                Belum ada pengguna aktif pada menu Pengguna &amp; Hak Akses. Anda masuk sebagai Superadmin sementara; segera tambah pengguna resmi.
              </div>
            </div>
          )}
          <section className="kbr-view-stage" key={`${active}-${data === null ? "loading" : "ready"}`} aria-live="polite">
            {data === null ? (
              <LoadingState />
            ) : loadError ? (
              <ErrorState onRetry={loadData} />
            ) : active === "dashboard" ? (
              <DashboardContent data={data} goTo={goTo} user={authSession.user} />
            ) : active === "backup" ? (
              canBackup ? <BackupPage /> : <ErrorState onRetry={() => goTo("dashboard")} />
            ) : active === "pengaturan" ? (
              canManageSettings ? <SettingsPage settings={settingsRecord} onSave={(record) => handleSaveRecord("pengaturan", record)} /> : <ErrorState onRetry={() => goTo("dashboard")} />
            ) : active === "profil" ? (
              <ProfilePage user={authSession.user} onLogout={handleLogout} />
            ) : active === "auditlog" ? (
              (authSession.permissions && authSession.permissions.canManageUsers) ? <AuditLogPage /> : <ErrorState onRetry={() => goTo("dashboard")} />
            ) : active === "laporankeuangan" ? (
              canReadEntity(authSession, "laporankeuangan") ? <FinanceReportPage data={data} /> : <ErrorState onRetry={() => goTo("dashboard")} />
            ) : activeSchema && canReadEntity(authSession, activeSchema.key) ? (
              <EntityPage
                schema={activeSchema}
                records={activeRecords}
                allData={data}
                onSave={(record) => handleSaveRecord(activeSchema.key, record)}
                onDelete={(id) => handleDeleteRecord(activeSchema.key, id)}
                onImport={(rows) => handleImportRecords(activeSchema.key, rows)}
                canWrite={canWriteActive}
              />
            ) : (
              <ErrorState onRetry={() => goTo("dashboard")} />
            )}
          </section>
        </main>
      </div>
    </div>
  );
}



    ReactDOM.createRoot(document.getElementById("root")).render(<AppErrorBoundary><App /><ToastContainer /></AppErrorBoundary>);
  