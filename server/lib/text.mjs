import crypto from "node:crypto";
import * as cheerio from "cheerio";

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function htmlToText(html) {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe, form, nav, footer, header").remove();
  const main = $("main").length ? $("main") : $("article").length ? $("article") : $("body");
  let text = main.text() || $.root().text();
  return normalizeText(text);
}

export function normalizeText(t) {
  return String(t || "")
    .replace(/\r/g, "")
    .replace(/[\u00a0\u200b\u200e\u200f]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// teks untuk pencocokan kutipan: buang tanda baca & spasi berlebih, huruf kecil
export function comparable(t) {
  return String(t || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function textIncludes(haystack, quote) {
  const h = comparable(haystack);
  const q = comparable(quote);
  if (!q || q.length < 12) return false;
  return h.includes(q);
}

export function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export function hashText(t) {
  return crypto.createHash("sha1").update(comparable(t)).digest("hex").slice(0, 24);
}

export function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 70);
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

export function similarity(a, b) {
  const x = comparable(a), y = comparable(b);
  if (!x || !y) return 0;
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length);
}

// ambil objek JSON pertama yang seimbang dari keluaran model
export function extractJson(raw) {
  if (!raw) throw new Error("keluaran model kosong");
  const clean = String(raw).replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const s = clean.indexOf("{");
  if (s < 0) throw new Error("tidak ada objek JSON");
  let depth = 0, inStr = null, esc = false;
  for (let i = s; i < clean.length; i++) {
    const ch = clean[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"') inStr = ch;
    else if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) return JSON.parse(clean.slice(s, i + 1)); }
  }
  throw new Error("JSON tidak lengkap");
}
