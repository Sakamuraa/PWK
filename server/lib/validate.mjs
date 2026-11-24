import { textIncludes, similarity, comparable } from "./text.mjs";
import { CFG } from "../config.mjs";
import { listKatalog } from "../db.mjs";

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s));

export function validateItem(item, ctx) {
  const { text, url, tier, now = Date.now() } = ctx;
  const reasons = [];

  if (!item.n || item.n.length < 5) reasons.push("nama terlalu pendek");

  // sasaran harus mahasiswa / SMA ke atas, bukan lomba anak sekolah dasar
  const schoolOnly = /(siswa\s+(sd|smp)|tingkat\s+(sd|smp)|anak\s+(sd|smp|usia dini)|tk\/sd|keluarga berencana)/i.test(text);
  const studentish = /(mahasiswa|mahasiswi|d3|d4|s1|s2|s3|sarjana|diploma|perguruan tinggi|kuliah)/i.test(text);
  if (schoolOnly && !studentish) reasons.push("sasaran bukan mahasiswa");
  if (!item.o || item.o.length < 3) reasons.push("penyelenggara kosong");
  if (!item.d || item.d.length < 20) reasons.push("deskripsi terlalu pendek");

  // kutipan bukti: nama & penyelenggara wajib ditemukan di teks sumber
  const quotesFor = (f) => item.evidence.filter((e) => e.field === f);
  for (const f of ["n", "o"]) {
    const value = f === "n" ? item.n : item.o;
    const inText = textIncludes(text, value) || textIncludes(text, value.split(/\s+/).slice(0, 4).join(" "));
    const qs = quotesFor(f);
    if (!qs.length) {
      // tidak ada entri kutipan: cukup nilainya benar-benar tertulis di halaman
      if (!inText) reasons.push(`tidak ada kutipan bukti untuk ${f}`);
      continue;
    }
    if (!qs.some((e) => textIncludes(text, e.quote)) && !inText) reasons.push(`kutipan ${f} tidak ditemukan di halaman`);
  }

  // kutipan lain (kalau ada) juga harus valid
  for (const e of item.evidence) {
    if (["n", "o"].includes(e.field)) continue;
    if (e.quote && !textIncludes(text, e.quote)) reasons.push(`kutipan ${e.field || "?"} tidak cocok dengan halaman`);
  }

  const minConf = CFG.minConfidence[tier] ?? 95;
  if (!Number.isFinite(item.confidence) || item.confidence < minConf) {
    reasons.push(`confidence ${item.confidence} di bawah ambang ${tier} (${minConf})`);
  }

  if (item.dl && !isDate(item.dl)) reasons.push("format tenggat tidak valid");
  if (item.op && !isDate(item.op)) reasons.push("format tanggal buka tidak valid");
  if (item.dl && item.op && Date.parse(item.op) > Date.parse(item.dl)) reasons.push("tanggal buka melewati tenggat");

  // tenggat lewat → arsip, bukan tayang
  let expired = false;
  if (item.dl && Date.parse(item.dl) < now) expired = true;

  // link pendaftaran harus disebut halaman (boleh berupa domain/path)
  if (item.u) {
    // model kadang memberi domain tanpa skema ("pwk.example.ac.id/lomba")
    if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(item.u)) item.u = "https://" + item.u;
    let host = "";
    try { host = new URL(item.u).hostname.replace(/^www\./, ""); } catch { reasons.push("URL pendaftaran tidak valid"); }
    if (host && !textIncludes(text, host) && !text.includes(item.u)) {
      item.u = undefined; // jangan tayang dengan tautan yang tidak terbukti
      reasons.push("tautan pendaftaran tidak ditemukan di halaman (dibuang)");
    }
  }
  if (expired) reasons.push("tenggat sudah lewat");

  // duplikat dengan katalog yang sudah ada
  let duplicateOf = null;
  for (const ex of listKatalog({ status: "published" }).concat(listKatalog({ status: "draft" }), listKatalog({ status: "expired" }))) {
    if (ex.source_url === url) continue;
    const s = similarity(`${item.n} ${item.o}`, `${ex.n} ${ex.o}`);
    if (s >= 0.9) { duplicateOf = ex; break; }
  }

  const fatal = reasons.filter((r) =>
    /nama terlalu pendek|penyelenggara kosong|deskripsi terlalu pendek|tidak ada kutipan|tidak ditemukan di halaman|confidence|format tenggat|melewati tenggat|tidak valid/.test(r)
  );

  return {
    ok: fatal.length === 0,
    fatal,
    warnings: reasons.filter((r) => !fatal.includes(r)),
    expired,
    duplicateOf,
    comparableKey: comparable(`${item.n} ${item.o}`),
  };
}
