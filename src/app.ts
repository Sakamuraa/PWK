"use strict";
// Katalog Lomba & Beasiswa TI - HMTI FT-UMB (Divisi PWK)
// Seluruh tampilan dibangun dari kode ini. HTML hanya kerangka kosong (#app).
// Tambah/ubah info lewat DATA dan REQ di bawah.

type Jenis = "Lomba" | "Beasiswa";
type Tingkat = "Kampus" | "Nasional" | "Internasional";
type Route = "beranda" | "cari" | "lomba" | "beasiswa" | "profil";
type Verdict = "ok" | "cek" | "no";
type Status = "buka" | "segera" | "belum" | "ditutup" | "tbd";
interface StInfo { s: Status; n: number }

// Syarat beasiswa. Field kosong = tidak diperiksa. Isi dari pedoman resmi.
interface Req { ipkMin?: number; semMin?: number; semMax?: number; lulusS1?: boolean; kerjaMin?: number; ekonomi?: boolean }
interface Item {
  n: string; j: Jenis; t: Tingkat; b: string; o: string; d: string;
  tg: string;            // catatan tanggal manual, kosong = "cek situs resmi"
  dl?: string;           // tenggat: "2026-12-31" (akhir hari WIB) atau ISO lengkap "2026-10-06T11:00:00Z"
  op?: string;           // tanggal pendaftaran dibuka (opsional, format sama)
  u?: string;            // tautan resmi (wajib https)
  jen?: string;          // jenjang beasiswa
  req?: Req;
}
interface Profil { nama: string; nim: string; angkatan: string; semester: string; ipk: string; jenjang: string; minat: string[] }
interface Filter { q: string; jenis: Set<string>; tingkat: Set<string>; jenjang: Set<string>; bidang: Set<string>; status: Set<string>; only: Set<string>; year: number; month: number }
interface Student { status: string; sem: string; ipk: string; kerja: string; biaya: boolean; tujuan: string }
interface Why { v: Verdict; t: string }

const HM = "/IMG_4190.PNG";
const UM = "/LOGO UMB_WARNA OPSI 2.png";

const DATA: Item[] = [
{n:"PIMNAS (hasil PKM)",j:"Lomba",t:"Nasional",b:"Riset & Inovasi",o:"Kemdiktisaintek",d:"Pekan Ilmiah Mahasiswa Nasional untuk tim lolos pendanaan PKM.",tg:""},
{n:"PKM (Program Kreativitas Mahasiswa)",j:"Lomba",t:"Nasional",b:"Riset & Inovasi",o:"Kemdiktisaintek",d:"Skema riset, pengabdian, kewirausahaan, karsa cipta. Seleksi dimulai dari kampus.",tg:""},
{n:"GEMASTIK",u:"https://kemdiktisaintek.go.id/announcement/article/penawaran-gemastik-2026",op:"2026-07-20",dl:"2026-08-14",j:"Lomba",t:"Nasional",b:"Teknologi & Data",o:"Kemdiktisaintek",d:"Pagelaran mahasiswa nasional bidang TIK: data mining, pemrograman, desain, dll.",tg:""},
{n:"KMI Expo",j:"Lomba",t:"Nasional",b:"Bisnis & Kewirausahaan",o:"Kemdiktisaintek",d:"Ajang pameran dan seleksi usaha mahasiswa.",tg:""},
{n:"KDMI (Debat Mahasiswa Indonesia)",j:"Lomba",t:"Nasional",b:"Umum",o:"Kemdiktisaintek",d:"Kompetisi debat mahasiswa tingkat nasional.",tg:""},
{n:"IISE Student Competitions",j:"Lomba",t:"Internasional",b:"Teknik Industri",o:"Institute of Industrial and Systems Engineers",d:"Kompetisi mahasiswa seputar industrial & systems engineering.",tg:"",u:"https://www.iise.org"},
{n:"Hult Prize",j:"Lomba",t:"Internasional",b:"Bisnis & Kewirausahaan",o:"Hult Prize Foundation",d:"Kompetisi social enterprise untuk tim mahasiswa, seleksi berjenjang dari kampus.",tg:"",u:"https://www.hultprize.org"},
{n:"Google Solution Challenge",u:"https://developers.google.com/community/gdsc-solution-challenge",j:"Lomba",t:"Internasional",b:"Teknologi & Data",o:"Google Developer Groups",d:"Bangun solusi teknologi untuk tujuan SDGs.",tg:""},
{n:"Shell Eco-marathon",j:"Lomba",t:"Internasional",b:"Rekayasa & Manufaktur",o:"Shell",d:"Rancang kendaraan hemat energi. Ada regional Asia.",tg:""},
{n:"KIP Kuliah",u:"https://kip-kuliah.kemdiktisaintek.go.id/",j:"Beasiswa",t:"Nasional",b:"Umum",o:"Pemerintah RI",d:"Bantuan biaya pendidikan untuk mahasiswa berprestasi dari keluarga kurang mampu.",tg:"",jen:"S1"},
{n:"LPDP",j:"Beasiswa",t:"Internasional",b:"Umum",o:"Kemenkeu RI",d:"Beasiswa S2/S3 dalam dan luar negeri.",tg:"",jen:"S2/S3",u:"https://lpdp.kemenkeu.go.id"},
{n:"Beasiswa Unggulan",op:"2026-08-20",dl:"2026-08-24",j:"Beasiswa",t:"Nasional",b:"Umum",o:"Kemdiktisaintek",d:"Untuk mahasiswa berprestasi, jenjang sarjana hingga doktor.",tg:"",jen:"S1/S2/S3"},
{n:"Djarum Beasiswa Plus",u:"https://register.djarumbeasiswaplus.org/",op:"2026-04-08",dl:"2026-06-10",j:"Beasiswa",t:"Nasional",b:"Umum",o:"Djarum Foundation",d:"Beasiswa dan pengembangan soft skill untuk mahasiswa aktif.",tg:"",jen:"S1"},
{n:"Beasiswa Bakti BCA",u:"https://www.bca.co.id/id/tentang-bca/CSR/Bakti-BCA/bakti-pendidikan/beasiswa-bakti-bca",op:"2026-08-03",dl:"2026-09-30",j:"Beasiswa",t:"Nasional",b:"Umum",o:"Bakti BCA",d:"Beasiswa mahasiswa berprestasi dan aktif berorganisasi.",tg:"",jen:"S1"},
{n:"Tanoto Foundation Scholarship",u:"https://www.tanotofoundation.org/",j:"Beasiswa",t:"Nasional",b:"Umum",o:"Tanoto Foundation",d:"Beasiswa dan pembinaan kepemimpinan untuk mahasiswa.",tg:"",jen:"S1"},
{n:"GENBI",j:"Beasiswa",t:"Nasional",b:"Umum",o:"Bank Indonesia",d:"Beasiswa dan komunitas Generasi Baru Indonesia.",tg:"",jen:"S1"},
{n:"Chevening",dl:"2026-10-06T11:00:00Z",op:"2026-08-04T11:00:00Z",j:"Beasiswa",t:"Internasional",b:"Umum",o:"Pemerintah Inggris",d:"Beasiswa S2 ke Inggris.",tg:"",jen:"S2",u:"https://www.chevening.org"},
{n:"Fulbright (AMINEF)",j:"Beasiswa",t:"Internasional",b:"Umum",o:"AMINEF",d:"Beasiswa studi ke Amerika Serikat.",tg:"",jen:"S2/S3",u:"https://www.aminef.or.id"},
{n:"MEXT (Jepang)",j:"Beasiswa",t:"Internasional",b:"Umum",o:"Pemerintah Jepang",d:"Beasiswa pemerintah Jepang untuk berbagai jenjang.",tg:"",jen:"S1/S2/S3",u:"https://www.studyinjapan.go.jp"},
{n:"Global Korea Scholarship (GKS)",u:"https://www.studyinkorea.go.kr/",j:"Beasiswa",t:"Internasional",b:"Umum",o:"Pemerintah Korea Selatan",d:"Beasiswa studi di Korea Selatan.",tg:"",jen:"S1/S2/S3"},
{n:"DAAD (Jerman)",u:"https://www.daad.de/en/",j:"Beasiswa",t:"Internasional",b:"Umum",o:"DAAD",d:"Beasiswa studi dan riset di Jerman.",tg:"",jen:"S2/S3"},
{n:"Australia Awards",j:"Beasiswa",t:"Internasional",b:"Umum",o:"Pemerintah Australia",d:"Beasiswa S2/S3 ke Australia.",tg:"",jen:"S2/S3",u:"https://www.australiaawards.gov.au"},
{n:"Erasmus Mundus Joint Masters",j:"Beasiswa",t:"Internasional",b:"Umum",o:"Uni Eropa",d:"Program magister gabungan di beberapa negara Eropa.",tg:"",jen:"S2",u:"https://erasmus-plus.ec.europa.eu"},
{n:"Türkiye Burslari",u:"https://turkiyeburslari.gov.tr/",j:"Beasiswa",t:"Internasional",b:"Umum",o:"Pemerintah Turki",d:"Beasiswa studi di Turki.",tg:"",jen:"S1/S2/S3"},
{n:"Chinese Government Scholarship (CSC)",u:"https://www.csc.edu.cn/",j:"Beasiswa",t:"Internasional",b:"Umum",o:"China Scholarship Council",d:"Beasiswa studi di universitas China.",tg:"",jen:"S1/S2/S3"}
];

// Syarat INDIKATIF, belum diverifikasi PWK. Cek pedoman resmi sebelum mendaftar.
const REQ: Record<string, Req> = {
  "KIP Kuliah": { ekonomi: true },
  "LPDP": { lulusS1: true, ipkMin: 3 },
  "Chevening": { lulusS1: true, kerjaMin: 2 },
  "Fulbright (AMINEF)": { lulusS1: true },
  "DAAD (Jerman)": { lulusS1: true },
  "Australia Awards": { lulusS1: true },
  "Erasmus Mundus Joint Masters": { lulusS1: true },
  "Djarum Beasiswa Plus": { ipkMin: 3 },
};
for (const x of DATA) { const r = REQ[x.n]; if (r) x.req = r; }

/* ---------- util aman ---------- */
type Child = Node | string | null | false;
// Teks lewat append(string) = text node, jadi tidak ada risiko injeksi HTML.
function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, ...kids: Child[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const k of Object.keys(attrs)) e.setAttribute(k, attrs[k]);
  for (const c of kids) if (c) e.append(c);
  return e;
}
const safeUrl = (u: string): string | null => { try { const x = new URL(u); return x.protocol === "https:" ? x.href : null; } catch { return null; } };
const linkOf = (x: Item): string => (x.u && safeUrl(x.u)) || "https://www.google.com/search?q=" + encodeURIComponent(x.n + " pendaftaran resmi");
const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every(s => typeof s === "string");
const isProfil = (v: unknown): v is Partial<Profil> => {
  const p = v as Profil;
  return !!p && typeof p === "object" && typeof p.nama === "string" && typeof p.nim === "string" && typeof p.angkatan === "string" && typeof p.jenjang === "string" && isStrArr(p.minat);
};
function load<T>(key: string, ok: (v: unknown) => v is T, fallback: T): T {
  try { const raw = localStorage.getItem(key); if (!raw) return fallback; const v: unknown = JSON.parse(raw); return ok(v) ? v : fallback; } catch { return fallback; }
}
function save(key: string, v: unknown): void { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage dimatikan */ } }
const num = (s: string): number | null => { const n = parseFloat(s.replace(",", ".")); return Number.isFinite(n) ? n : null; };
const NS = "http://www.w3.org/2000/svg";
function icon(name: "sliders" | "bookmark"): SVGSVGElement {
  const s = document.createElementNS(NS, "svg");
  for (const [k, v] of Object.entries({ viewBox: "0 0 24 24", width: "22", height: "22", fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" })) s.setAttribute(k, v);
  const paths = name === "bookmark" ? ["M6 3h12v18l-6-4-6 4z"] : ["M3 6h9", "M16 6h5", "M3 12h3", "M10 12h11", "M3 18h11", "M18 18h3"];
  for (const d of paths) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.append(p); }
  if (name === "sliders") for (const [cx, cy] of [[14, 6], [8, 12], [16, 18]]) { const c = document.createElementNS(NS, "circle"); c.setAttribute("cx", String(cx)); c.setAttribute("cy", String(cy)); c.setAttribute("r", "2"); s.append(c); }
  return s;
}
const MON = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];
const MONFULL = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
function inMonth(x: Item, y: number, m: number): boolean {
  if (!x.dl) return false;
  const p = (n: number): string => String(n).padStart(2, "0");
  const a = Date.parse(y + "-" + p(m) + "-01T00:00:00+07:00"), b = Date.parse((m === 12 ? y + 1 : y) + "-" + p(m === 12 ? 1 : m + 1) + "-01T00:00:00+07:00");
  const end = toTime(x.dl, true), start = x.op ? toTime(x.op, false) : end;
  return start < b && end >= a;
}
const img = (src: string, alt = ""): HTMLImageElement => { const i = h("img", { alt }); i.src = src; return i; };

/* ---------- status tenggat ---------- */
// Isi dl (tenggat) hanya dari sumber resmi. Tanpa dl = "Tanggal belum diverifikasi".
const UPDATED = "2026-11-21";   // ubah setiap kali data diperbarui
const DAY = 86400000, NOW = Date.now();
const toTime = (s: string, end: boolean): number => Date.parse(s.length === 10 ? s + (end ? "T23:59:59+07:00" : "T00:00:00+07:00") : s);
const fmtDate = (s: string, end = true): string => new Date(toTime(s, end)).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
const STLABEL: Record<Status, string> = { buka: "Dibuka", segera: "Segera ditutup", belum: "Belum dibuka", ditutup: "Sudah ditutup", tbd: "Tanggal belum diverifikasi" };
const RANK: Record<Status, number> = { segera: 0, buka: 1, belum: 2, tbd: 3, ditutup: 4 };
function statusOf(x: Item): StInfo {
  const dl = x.dl ? toTime(x.dl, true) : NaN, op = x.op ? toTime(x.op, false) : NaN;
  if (Number.isNaN(dl)) return { s: "tbd", n: 0 };
  if (NOW > dl) return { s: "ditutup", n: Math.floor((NOW - dl) / DAY) };
  if (!Number.isNaN(op) && NOW < op) return { s: "belum", n: Math.ceil((op - NOW) / DAY) };
  const n = Math.ceil((dl - NOW) / DAY);
  return { s: n <= 14 ? "segera" : "buka", n };
}
function dateInfo(x: Item, ss: StInfo): string {
  const dl = x.dl ? fmtDate(x.dl) : "";
  switch (ss.s) {
    case "ditutup": return "Ditutup " + dl + (ss.n > 0 ? " (" + ss.n + " hari lalu)" : "");
    case "belum": return "Dibuka " + fmtDate(x.op ?? "", false) + ", tutup " + dl;
    case "segera": case "buka": return "Tutup " + dl + " (" + (ss.n <= 0 ? "hari ini" : ss.n + " hari lagi") + ")";
    default: return "Tanggal: " + (x.tg || "cek situs resmi");
  }
}
const byStatus = (a: Item, b: Item): number => { const sa = statusOf(a), sb = statusOf(b); return RANK[sa.s] - RANK[sb.s] || sa.n - sb.n; };
const statusMatch = (f: string, s: Status): boolean => f === "semua" || (f === "aktif" ? s === "buka" || s === "segera" : f === s);

/* ---------- state ---------- */
const ROUTES: Record<Route, [string, string]> = {
  beranda: ["", ""],
  cari: ["Cari lomba dan beasiswa", "Cari dengan kata kunci, atau cek beasiswa yang cocok dengan kondisi akademikmu."],
  lomba: ["Info lomba", "Lomba tingkat kampus, nasional, dan internasional."],
  beasiswa: ["Info beasiswa", "Beasiswa dalam dan luar negeri untuk S1 sampai S3."],
  profil: ["Profil mahasiswa", "Isi data akademik dan minat supaya rekomendasi sesuai kebutuhanmu."],
};
const isRoute = (s: string): s is Route => Object.prototype.hasOwnProperty.call(ROUTES, s);
const EMPTY: Profil = { nama: "", nim: "", angkatan: "", semester: "", ipk: "", jenjang: "", minat: [] };
const BID: string[] = Array.from(new Set(DATA.map(x => x.b)));
const STAT = [
  { id: "S1", label: "Mahasiswa S1", target: "S1", lulus: false },
  { id: "S2", label: "Lulusan S1 (cari S2)", target: "S2", lulus: true },
  { id: "S3", label: "Lulusan S2 (cari S3)", target: "S3", lulus: true },
];
let view: Route = "beranda", mode: "biasa" | "layak" = "biasa", eligRun = false;
const YEAR0 = new Date(NOW).getFullYear();
const st: Filter = { q: "", jenis: new Set(), tingkat: new Set(), jenjang: new Set(), bidang: new Set(), status: new Set(), only: new Set(), year: YEAR0, month: 0 };
const saved = new Set<string>(load("tiSaved", isStrArr, []));
let pf: Profil = { ...EMPTY, ...load<Partial<Profil>>("tiProfil", isProfil, {}) };
let pw = { jenjang: "", minat: [] as string[] };
const sd: Student = { status: "S1", sem: pf.semester, ipk: pf.ipk, kerja: "0", biaya: false, tujuan: "Semua" };

/* ---------- komponen ---------- */
function card(x: Item, why: Why[] = []): HTMLElement {
  const on = saved.has(x.n), k = x.j.toLowerCase(), ss = statusOf(x);
  return h("article", { class: "card " + k + (ss.s === "ditutup" ? " closed" : "") },
    h("div", { class: "tags" }, h("span", { class: "st " + ss.s }, STLABEL[ss.s]), h("span", { class: "tag " + k }, x.j), h("span", { class: "tag" }, x.t), h("span", { class: "tag" }, x.b), x.jen ? h("span", { class: "tag" }, x.jen) : null),
    h("h3", {}, x.n), h("p", { class: "org" }, x.o), h("p", { class: "desc" }, x.d),
    why.length ? h("ul", { class: "why" }, ...why.map(w => h("li", { class: w.v }, w.t))) : null,
    ss.s === "ditutup" ? h("p", { class: "closedn" }, "Periode ini sudah lewat. Cek situs resmi untuk periode berikutnya.") : null,
    h("div", { class: "cf" }, h("span", { class: "dt" + (ss.s === "segera" ? " hot" : "") }, dateInfo(x, ss)),
      h("div", { class: "acts" },
        h("a", { class: "btn main", href: linkOf(x), target: "_blank", rel: "noopener noreferrer" }, x.u ? "Buka situs resmi" : "Cari info resmi"),
        h("button", { class: "btn" + (on ? " saved" : ""), type: "button", "data-s": x.n }, on ? "Tersimpan" : "Simpan"))));
}
const fill = (host: HTMLElement, rows: Item[], msg: string): void => host.replaceChildren(...(rows.length ? rows.map(x => card(x)) : [h("div", { class: "empty" }, msg)]));
function row(x: Item, why: Why[] = []): HTMLElement {
  const on = saved.has(x.n), ss = statusOf(x), k = x.j.toLowerCase();
  const labels = x.jen ? x.jen.split("/") : [x.t === "Internasional" ? "INT" : x.t === "Nasional" ? "NAS" : "KMP"];
  return h("article", { class: "row" + (ss.s === "ditutup" ? " closed" : "") },
    h("div", { class: "rl" }, h("div", { class: "dots" }, ...labels.map(l => h("span", { class: "dot " + k }, l))),
      h("div", { class: "dts" }, h("span", {}, "Mulai:"), h("span", {}, x.op ? fmtDate(x.op, false) : "-"), h("span", { class: "dlx " + ss.s }, "Deadline:"), h("span", { class: "dlx " + ss.s }, x.dl ? fmtDate(x.dl) : "Belum diverifikasi"))),
    h("div", { class: "rr" },
      h("div", { class: "rt" }, h("a", { class: "rn", href: linkOf(x), target: "_blank", rel: "noopener noreferrer" }, x.n),
        h("button", { class: "bm" + (on ? " on" : ""), type: "button", "data-s": x.n, "aria-pressed": String(on), "aria-label": (on ? "Hapus dari tersimpan: " : "Simpan: ") + x.n }, icon("bookmark"))),
      h("p", { class: "rs" }, x.o + " \u00b7 " + x.t + " \u00b7 " + x.b),
      h("p", { class: "rd" }, x.d),
      h("div", { class: "rb" }, h("span", { class: "st " + ss.s }, STLABEL[ss.s]), h("span", { class: "dt" + (ss.s === "segera" ? " hot" : "") }, dateInfo(x, ss)),
        h("a", { class: "btn main", href: linkOf(x), target: "_blank", rel: "noopener noreferrer" }, x.u ? "Buka portal resmi" : "Cari info resmi (Google)")),
      ss.s === "ditutup" ? h("p", { class: "closedn" }, "Periode ini sudah lewat. Cek situs resmi untuk periode berikutnya.") : null,
      why.length ? h("ul", { class: "why" }, ...why.map(w => h("li", { class: w.v }, w.t))) : null));
}
const fillRows = (host: HTMLElement, rows: Item[], msg: string): void => host.replaceChildren(...(rows.length ? rows.map(x => row(x)) : [h("div", { class: "empty" }, msg)]));
function chipRow(host: HTMLElement, values: string[], onPick: (v: string) => void, labels?: Record<string, string>): HTMLElement {
  for (const v of values) { const b = h("button", { class: "chip", type: "button", "data-v": v }, labels?.[v] ?? v); b.addEventListener("click", () => onPick(v)); host.append(b); }
  return host;
}
const mark = (host: HTMLElement, on: (v: string) => boolean): void => host.querySelectorAll<HTMLButtonElement>(".chip").forEach(c => c.setAttribute("aria-pressed", String(on(c.dataset.v ?? ""))));
const group = (label: string, body: Node, extra: Record<string, string> = {}): HTMLElement => h("div", { class: "fg", ...extra }, h("span", { class: "fl" }, label), body);
function input(id: string, attrs: Record<string, string> = {}): HTMLInputElement { return h("input", { id, class: "input", ...attrs }); }
const field = (label: string, i: HTMLInputElement): HTMLElement => h("div", { class: "field" }, h("label", { for: i.id }, label), i);

/* ---------- kerangka tampilan ---------- */
const navLinks = ([["beranda", "Beranda"], ["cari", "Cari"], ["lomba", "Info Lomba"], ["beasiswa", "Info Beasiswa"], ["profil", "Profil"]] as [Route, string][]).map(([r, l]) => h("a", { href: "#" + r }, l));
const nav = h("nav", { class: "nav", "aria-label": "Menu utama" }, h("div", { class: "wrap nav-in" },
  h("a", { class: "brand", href: "#beranda" }, h("span", { class: "badge sm" }, img(HM, "Logo HMTI")), h("span", { class: "bt" }, "Lomba & Beasiswa TI")),
  h("div", { class: "links" }, ...navLinks)));

// Beranda
const hq = input("hq", { type: "search", placeholder: "Cari lomba atau beasiswa…", "aria-label": "Cari" });
const hs = h("form", { class: "hs" }, hq, h("button", { class: "go", type: "submit" }, "Cari"));
const stat = (n: number, l: string): HTMLElement => h("div", {}, h("b", {}, String(n)), h("span", {}, l));
const hl = h("div", { class: "grid" }), hb = h("div", { class: "grid" });
const sech = (t: string, p: string, to: Route, lt: string): HTMLElement => h("div", { class: "sech" }, h("div", {}, h("h2", {}, t), h("p", {}, p)), h("a", { href: "#" + to }, lt));
const vBeranda = h("section", {},
  h("header", { class: "hero" }, h("div", { class: "gear", "aria-hidden": "true" }),
    h("div", { class: "wrap hero-in" },
      h("div", { class: "brands" }, h("span", { class: "badge" }, img(HM, "Logo HMTI FT-UMB")), h("span", { class: "pill" }, img(UM, "Logo Universitas Mercu Buana"))),
      h("p", { class: "kicker" }, "Divisi PWK, HMTI FT-UMB"),
      h("h1", {}, "Lomba dan beasiswa untuk ", h("em", {}, "insinyur industri"), " masa depan"),
      h("p", { class: "sub" }, "Satu tempat untuk mencari lomba kampus, nasional, internasional, dan beasiswa dalam maupun luar negeri. Khusus anggota Teknik Industri."),
      hs,
      h("div", { class: "stats" }, stat(DATA.filter(x => x.j === "Lomba").length, "lomba"), stat(DATA.filter(x => x.j === "Beasiswa").length, "beasiswa"), stat(DATA.filter(x => x.t === "Internasional").length, "internasional")))),
  h("div", { class: "wrap" }, sech("Lomba pilihan", "Ajang nasional untuk mahasiswa.", "lomba", "Lihat semua lomba"), hl, sech("Beasiswa luar negeri", "Studi lanjut di luar negeri.", "beasiswa", "Lihat semua beasiswa"), hb));

// Katalog + cek kelayakan
const ptitle = h("h1"), pdesc = h("p");
const q = input("q", { type: "search", placeholder: "Nama, penyelenggara, bidang\u2026" });
const syncs: Array<() => void> = [];
function checks(title: string, opts: [string, string][], set: Set<string>): HTMLElement {
  const boxes = opts.map(([v, l]) => {
    const c = h("input", { type: "checkbox" });
    c.addEventListener("change", () => { if (c.checked) set.add(v); else set.delete(v); paint(); });
    syncs.push(() => { c.checked = set.has(v); });
    return h("label", { class: "cb" }, h("span", {}, l), c);
  });
  return h("div", { class: "fg" }, h("span", { class: "fl" }, title), ...boxes);
}
const fixedJenis = (): string | null => (view === "lomba" ? "Lomba" : view === "beasiswa" ? "Beasiswa" : null);
const resetBtn = h("button", { class: "chip ghost", type: "button" }, "Reset filter");
const gJenis = checks("Jenis", [["Lomba", "Lomba"], ["Beasiswa", "Beasiswa"]], st.jenis);
const filterPanel = h("div", { class: "pnl" }, h("div", { class: "ph" }, icon("sliders"), h("b", {}, "Filter")),
  group("Kata kunci", q), gJenis,
  checks("Tingkat", [["Kampus", "Kampus"], ["Nasional", "Nasional"], ["Internasional", "Internasional"]], st.tingkat),
  checks("Jenjang", [["S1", "S1"], ["S2", "S2"], ["S3", "S3"]], st.jenjang),
  checks("Bidang", BID.map(b => [b, b] as [string, string]), st.bidang),
  checks("Status pendaftaran", [["aktif", "Masih dibuka"], ["segera", "Segera ditutup"], ["ditutup", "Sudah ditutup"], ["tbd", "Belum ada tanggal"]], st.status),
  checks("Daftarku", [["saved", "Tersimpan saja"]], st.only), resetBtn);
const yearLbl = h("h2", { class: "yr" });
const yPrev = h("button", { class: "yb", type: "button", "aria-label": "Tahun sebelumnya" }, "\u2039"), yNext = h("button", { class: "yb", type: "button", "aria-label": "Tahun berikutnya" }, "\u203a");
const mTabs = h("div", { class: "mtabs" });
const mBtns = ["SEMUA", ...MON].map((l, i) => { const b = h("button", { class: "mt", type: "button" }, l); b.addEventListener("click", () => { st.month = i; paint(); }); mTabs.append(b); return b; });
const dateBar = h("div", { class: "dbar" }, h("div", { class: "yrow" }, yearLbl, yPrev, yNext), mTabs);
const mh = h("h2", { class: "mh" }), count = h("span"), list = h("div", { class: "rows" });
const resBiasa = h("div", {}, dateBar, mh, h("div", { class: "rh" }, count), list);

const cStatus = h("div", { class: "chips" }), cTujuan = h("div", { class: "chips" }), cBiaya = h("div", { class: "chips" });
const eSem = input("eSem", { type: "number", min: "1", max: "14", inputmode: "numeric", placeholder: "mis. 5" });
const eIpk = input("eIpk", { type: "number", min: "0", max: "4", step: "0.01", inputmode: "decimal", placeholder: "mis. 3.45" });
const eKerja = input("eKerja", { type: "number", min: "0", max: "40", inputmode: "numeric" });
const semField = field("Semester sekarang", eSem);
const runBtn = h("button", { class: "go", type: "button" }, "Cek kelayakan");
const eligPanel = h("div", { class: "pnl" }, h("div", { class: "ph" }, icon("sliders"), h("b", {}, "Cek kelayakan")),
  group("Status saya", cStatus), semField, field("IPK terakhir (skala 4)", eIpk), field("Pengalaman kerja (tahun)", eKerja),
  group("Butuh bantuan biaya?", cBiaya), group("Tujuan", cTujuan), runBtn,
  h("p", { class: "dt" }, "Hasil bersifat indikatif. Syarat resmi bisa berubah tiap periode, jadi selalu cek pedoman penyelenggara."));
const resElig = h("div", {});

const tabBiasa = h("button", { class: "tab", type: "button" }, "Cari biasa"), tabLayak = h("button", { class: "tab", type: "button" }, "Cek kelayakan beasiswa");
const tabs = h("div", { class: "tabs" }, tabBiasa, tabLayak);
const side = h("aside", { class: "side", "aria-label": "Filter" }, filterPanel, eligPanel);
const vCat = h("section", {},
  h("div", { class: "phead" }, h("div", { class: "wrap" }, ptitle, pdesc)),
  h("div", { class: "wrap" },
    h("p", { class: "alert" }, "Versi awal. Baru sebagian info yang punya tenggat terverifikasi. Untuk yang belum, buka sumber resmi untuk jadwal dan syarat terbaru sebelum mendaftar."),
    tabs, h("div", { class: "layout" }, side, h("div", {}, resBiasa, resElig))));

// Profil
const pNama = input("pNama", { maxlength: "60", autocomplete: "name" }), pNim = input("pNim", { maxlength: "20", inputmode: "numeric" });
const pAng = input("pAng", { maxlength: "4", inputmode: "numeric", placeholder: "2024" });
const pSem = input("pSem", { type: "number", min: "1", max: "14", inputmode: "numeric" });
const pIpk = input("pIpk", { type: "number", min: "0", max: "4", step: "0.01", inputmode: "decimal" });
const pJen = h("div", { class: "chips" }), pMin = h("div", { class: "chips" });
const pAv = h("span", { class: "av" }, "TI"), pHi = h("b"), pSub = h("div", { class: "org" });
const pSave = h("button", { class: "btn main", type: "button" }, "Simpan profil"), pDel = h("button", { class: "btn", type: "button" }, "Hapus profil");
const toastEl = h("span", { class: "toast", role: "status" });
const pRec = h("div", { class: "grid g1" }), pSaved = h("div", { class: "grid g1" });
const vProfil = h("section", {},
  h("div", { class: "phead" }, h("div", { class: "wrap" }, h("h1", {}, "Profil mahasiswa"), h("p", {}, ROUTES.profil[1]))),
  h("div", { class: "wrap pgrid" },
    h("div", { class: "pcard" }, h("div", { class: "who" }, pAv, h("div", {}, pHi, pSub)),
      field("Nama", pNama), h("div", { class: "row2" }, field("NIM", pNim), field("Angkatan", pAng)), h("div", { class: "row2b" }, field("Semester", pSem), field("IPK terakhir", pIpk)),
      group("Jenjang yang dituju", pJen), group("Minat bidang", pMin), h("div", { class: "acts" }, pSave, pDel), toastEl,
      h("p", { class: "dt" }, "Profil hanya tersimpan di browser ini dan tidak dikirim ke mana pun.")),
    h("div", { class: "pcol" }, h("div", { class: "sech" }, h("div", {}, h("h2", {}, "Rekomendasi untukmu"))), pRec, h("div", { class: "sech" }, h("div", {}, h("h2", {}, "Tersimpan"))), pSaved)));

const foot = h("footer", {}, h("div", { class: "wrap" }, h("span", { class: "badge" }, img(HM)), h("span", { class: "pill" }, img(UM)),
  h("p", {}, "Divisi PWK, HMTI Fakultas Teknik, Universitas Mercu Buana. Data hanya penunjuk awal; selalu cek situs resmi penyelenggara. Data diperbarui " + fmtDate(UPDATED) + ".")));

/* ---------- kelayakan beasiswa ---------- */
function evaluate(x: Item, s: Student): { item: Item; v: Verdict; why: Why[] } {
  const a = STAT.find(z => z.id === s.status) ?? STAT[0];
  const why: Why[] = [];
  if (x.jen) why.push(x.jen.includes(a.target) ? { v: "ok", t: "Jenjang " + a.target + " sesuai" } : { v: "no", t: "Untuk jenjang " + x.jen });
  const r = x.req;
  if (!r) why.push({ v: "cek", t: "Syarat belum diinput PWK, cek pedoman resmi" });
  else {
    if (r.lulusS1) why.push(a.lulus ? { v: "ok", t: "Sudah lulus S1" } : { v: "no", t: "Perlu ijazah S1" });
    if (r.ipkMin !== undefined) {
      const ipk = num(s.ipk), min = r.ipkMin.toFixed(2);
      if (ipk === null || ipk < 0 || ipk > 4) why.push({ v: "cek", t: "Isi IPK (0-4). Syarat minimal " + min });
      else why.push(ipk >= r.ipkMin ? { v: "ok", t: "IPK " + ipk.toFixed(2) + " memenuhi minimal " + min } : { v: "no", t: "IPK " + ipk.toFixed(2) + " di bawah minimal " + min });
    }
    if (r.kerjaMin !== undefined) { const k = num(s.kerja) ?? 0; why.push(k >= r.kerjaMin ? { v: "ok", t: "Pengalaman kerja " + k + " tahun" } : { v: "no", t: "Perlu pengalaman kerja minimal " + r.kerjaMin + " tahun" }); }
    if (r.ekonomi) why.push(s.biaya ? { v: "ok", t: "Butuh bantuan biaya" } : { v: "no", t: "Untuk yang butuh bantuan biaya" });
    if (r.semMin !== undefined || r.semMax !== undefined) {
      const m = num(s.sem);
      if (a.lulus) why.push({ v: "no", t: "Untuk mahasiswa S1 aktif" });
      else if (m === null) why.push({ v: "cek", t: "Isi semester untuk dicek" });
      else if ((r.semMin !== undefined && m < r.semMin) || (r.semMax !== undefined && m > r.semMax)) why.push({ v: "no", t: "Semester " + m + " di luar rentang " + (r.semMin ?? 1) + " sampai " + (r.semMax ?? "akhir") });
      else why.push({ v: "ok", t: "Semester " + m + " sesuai" });
    }
  }
  const v: Verdict = why.some(w => w.v === "no") ? "no" : why.some(w => w.v === "cek") ? "cek" : "ok";
  return { item: x, v, why };
}
function paintElig(): void {
  if (!eligRun) { resElig.replaceChildren(h("div", { class: "empty" }, "Isi data di samping, lalu tekan Cek kelayakan.")); return; }
  const res = DATA.filter(x => x.j === "Beasiswa" && (sd.tujuan === "Semua" || x.t === sd.tujuan)).map(x => evaluate(x, sd));
  const out: HTMLElement[] = [];
  for (const [v, t] of [["ok", "Kemungkinan memenuhi"], ["cek", "Perlu dicek"], ["no", "Belum memenuhi"]] as [Verdict, string][]) {
    const rs = res.filter(r => r.v === v).sort((a, b) => byStatus(a.item, b.item));
    if (rs.length) out.push(h("div", { class: "vh" }, h("i", { class: v }), t + " (" + rs.length + ")"), h("div", { class: "rows" }, ...rs.map(r => row(r.item, r.why))));
  }
  resElig.replaceChildren(...(out.length ? out : [h("div", { class: "empty" }, "Tidak ada beasiswa untuk tujuan ini.")]));
}

/* ---------- render ---------- */
function paintCat(): void {
  const eligMode = view === "cari" && mode === "layak";
  tabs.hidden = view !== "cari"; tabBiasa.setAttribute("aria-pressed", String(!eligMode)); tabLayak.setAttribute("aria-pressed", String(eligMode));
  filterPanel.hidden = eligMode; eligPanel.hidden = !eligMode; resBiasa.hidden = eligMode; resElig.hidden = !eligMode;
  gJenis.hidden = view !== "cari";
  if (eligMode) {
    mark(cStatus, v => sd.status === v); mark(cTujuan, v => sd.tujuan === v); mark(cBiaya, v => sd.biaya === (v === "ya"));
    semField.hidden = sd.status !== "S1"; paintElig(); return;
  }
  syncs.forEach(f => f());
  const fj = fixedJenis(), ql = st.q.toLowerCase();
  const pool = DATA.filter(x => fj ? x.j === fj : st.jenis.size === 0 || st.jenis.has(x.j));
  const rows = pool.filter(x =>
    (st.tingkat.size === 0 || st.tingkat.has(x.t)) && (st.bidang.size === 0 || st.bidang.has(x.b)) &&
    (st.jenjang.size === 0 || Array.from(st.jenjang).some(j => (x.jen ?? "").includes(j))) &&
    (st.status.size === 0 || Array.from(st.status).some(f => statusMatch(f, statusOf(x).s))) &&
    (!st.only.has("saved") || saved.has(x.n)) && (st.month === 0 || inMonth(x, st.year, st.month)) &&
    (!ql || (x.n + " " + x.o + " " + x.b + " " + x.d).toLowerCase().includes(ql))).sort(byStatus);
  const jl = fj ?? (st.jenis.size === 1 ? Array.from(st.jenis)[0] : "Lomba & Beasiswa");
  yearLbl.textContent = String(st.year);
  mBtns.forEach((b, i) => b.setAttribute("aria-pressed", String(st.month === i)));
  mh.textContent = st.month === 0 ? jl + ", semua periode" : jl + " Bulan " + MONFULL[st.month - 1] + " " + st.year;
  count.textContent = rows.length + " dari " + pool.length + " info";
  fillRows(list, rows, st.month !== 0 ? "Belum ada info bertanggal di bulan ini. Pilih SEMUA untuk melihat daftar lengkap." : st.tingkat.has("Kampus") && st.tingkat.size === 1 ? "Belum ada info tingkat kampus. PWK menambahkannya di daftar DATA." : "Tidak ada hasil. Ubah kata kunci atau reset filter.");
}
function paintProfil(): void {
  const n = pf.nama.trim();
  pAv.textContent = n ? n.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() : "TI";
  pHi.textContent = n ? "Halo, " + n.split(/\s+/)[0] : "Profil belum diisi";
  pSub.textContent = [pf.nim, pf.angkatan && "Angkatan " + pf.angkatan, pf.semester && "Semester " + pf.semester, pf.ipk && "IPK " + pf.ipk].filter(Boolean).join(", ") || "Mahasiswa Teknik Industri, Universitas Mercu Buana";
  fill(pRec, DATA.filter(x => pf.minat.includes(x.b) || (!!pf.jenjang && !!x.jen && x.jen.includes(pf.jenjang))).slice(0, 6), "Pilih jenjang atau minat, lalu simpan profil untuk melihat rekomendasi.");
  fill(pSaved, DATA.filter(x => saved.has(x.n)), "Belum ada yang disimpan. Tekan Simpan di kartu mana pun.");
}
const pwChips = (): void => { mark(pJen, v => pw.jenjang === v); mark(pMin, v => pw.minat.includes(v)); };
function paint(): void {
  navLinks.forEach(a => { if (a.getAttribute("href") === "#" + view) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  if (view === "beranda") { const live = (x: Item): boolean => statusOf(x).s !== "ditutup"; fill(hl, DATA.filter(x => x.j === "Lomba" && live(x)).sort(byStatus).slice(0, 3), ""); fill(hb, DATA.filter(x => x.j === "Beasiswa" && x.t === "Internasional" && live(x)).sort(byStatus).slice(0, 3), ""); }
  else if (view === "profil") paintProfil(); else paintCat();
}
function route(): void {
  const raw = (location.hash || "#beranda").slice(1);
  view = isRoute(raw) ? raw : "beranda";
  vBeranda.hidden = view !== "beranda"; vProfil.hidden = view !== "profil"; vCat.hidden = view === "beranda" || view === "profil";
  ptitle.textContent = ROUTES[view][0]; pdesc.textContent = ROUTES[view][1];
  if (view === "profil") { pw = { jenjang: pf.jenjang, minat: pf.minat.slice() }; pNama.value = pf.nama; pNim.value = pf.nim; pAng.value = pf.angkatan; pSem.value = pf.semester; pIpk.value = pf.ipk; pwChips(); }
  if (view === "cari") { eSem.value = sd.sem; eIpk.value = sd.ipk; eKerja.value = sd.kerja; }
  window.scrollTo(0, 0); paint();
}
function toast(t: string): void { toastEl.textContent = t; window.setTimeout(() => { toastEl.textContent = ""; }, 2200); }

/* ---------- init ---------- */
function init(): void {
  document.documentElement.style.setProperty("--hmti", "url(" + HM + ")");
  chipRow(cStatus, STAT.map(z => z.id), v => { sd.status = v; eligRun = false; paint(); }, Object.fromEntries(STAT.map(z => [z.id, z.label])));
  chipRow(cTujuan, ["Semua", "Nasional", "Internasional"], v => { sd.tujuan = v; paint(); }, { Semua: "Semua", Nasional: "Dalam negeri", Internasional: "Luar negeri" });
  chipRow(cBiaya, ["ya", "tidak"], v => { sd.biaya = v === "ya"; paint(); }, { ya: "Ya", tidak: "Tidak" });
  chipRow(pJen, ["S1", "S2", "S3"], v => { pw.jenjang = pw.jenjang === v ? "" : v; pwChips(); });
  chipRow(pMin, BID, v => { const i = pw.minat.indexOf(v); if (i < 0) pw.minat.push(v); else pw.minat.splice(i, 1); pwChips(); });
  tabBiasa.addEventListener("click", () => { mode = "biasa"; paint(); });
  tabLayak.addEventListener("click", () => { mode = "layak"; paint(); });
  runBtn.addEventListener("click", () => { sd.sem = eSem.value.trim(); sd.ipk = eIpk.value.trim(); sd.kerja = eKerja.value.trim() || "0"; eligRun = true; paint(); });
  document.addEventListener("click", ev => {
    const k = (ev.target as Element).closest<HTMLElement>("[data-s]")?.dataset.s;
    if (!k) return;
    if (saved.has(k)) saved.delete(k); else saved.add(k);
    save("tiSaved", Array.from(saved)); paint();
  });
  q.addEventListener("input", () => { st.q = q.value; paint(); });
  resetBtn.addEventListener("click", () => { for (const s of [st.jenis, st.tingkat, st.jenjang, st.bidang, st.status, st.only]) s.clear(); st.q = ""; q.value = ""; paint(); });
  yPrev.addEventListener("click", () => { st.year = Math.max(YEAR0 - 2, st.year - 1); paint(); });
  yNext.addEventListener("click", () => { st.year = Math.min(YEAR0 + 3, st.year + 1); paint(); });
  hs.addEventListener("submit", e => { e.preventDefault(); st.q = hq.value.trim().slice(0, 100); q.value = st.q; mode = "biasa"; if (location.hash === "#cari") route(); else location.hash = "#cari"; });
  pSave.addEventListener("click", () => {
    pf = { nama: pNama.value.trim().slice(0, 60), nim: pNim.value.trim().slice(0, 20), angkatan: pAng.value.trim().slice(0, 4), semester: pSem.value.trim().slice(0, 2), ipk: pIpk.value.trim().slice(0, 4), jenjang: pw.jenjang, minat: pw.minat.slice() };
    sd.sem = pf.semester; sd.ipk = pf.ipk;
    save("tiProfil", pf); paint(); toast("Profil disimpan");
  });
  pDel.addEventListener("click", () => { pf = { ...EMPTY }; try { localStorage.removeItem("tiProfil"); } catch { /* abaikan */ } route(); toast("Profil dihapus"); });
  window.addEventListener("hashchange", route);
  document.getElementById("app")!.replaceChildren(nav, h("main", {}, vBeranda, vCat, vProfil), foot);
  route();
}
init();
