// Ekstrak konstanta DATA dari src/app.ts menjadi JSON seed untuk API.
// Dipakai sekali (npm run seed), bukan bagian runtime.
import fs from "node:fs";
import vm from "node:vm";

const src = fs.readFileSync(new URL("../src/app.ts", import.meta.url), "utf8");
const start = src.indexOf("const DATA");
if (start < 0) throw new Error("DATA tidak ditemukan");
const eq = src.indexOf("=", start);
let i = src.indexOf("[", eq);
let depth = 0, end = -1, inStr = null, esc = false;
for (let p = i; p < src.length; p++) {
  const ch = src[p];
  if (inStr) {
    if (esc) esc = false;
    else if (ch === "\\") esc = true;
    else if (ch === inStr) inStr = null;
    continue;
  }
  if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; continue; }
  if (ch === "[") depth++;
  else if (ch === "]") { depth--; if (depth === 0) { end = p; break; } }
}
if (end < 0) throw new Error("penutup array DATA tidak ditemukan");
const literal = src.slice(i, end + 1);
const arr = vm.runInNewContext("(" + literal + ")", {});
if (!Array.isArray(arr) || !arr.length) throw new Error("DATA kosong");

const slug = (s) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").slice(0, 60);

const items = arr.map((x) => ({
  ...x,
  slug: slug(x.n),
  status: x.dl && Date.parse(x.dl) < Date.now() ? "expired" : "published",
  tier: "T1",
  source_url: x.u || "",
  confidence: 100,
  content_hash: "",
  last_verified_at: new Date().toISOString(),
  discovered_by: "seed",
}));

fs.mkdirSync(new URL("../public/data/", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("../public/data/katalog.json", import.meta.url), JSON.stringify({ updated: new Date().toISOString(), items }, null, 2));
console.log("seed:", items.length, "item →", "public/data/katalog.json");
console.log("contoh:", items[0].n, "|", items[0].slug, "|", items[0].status);
