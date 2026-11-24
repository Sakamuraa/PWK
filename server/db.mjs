import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { CFG } from "./config.mjs";

export const db = new DatabaseSync(CFG.dbPath);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA busy_timeout = 5000;");

db.exec(`
CREATE TABLE IF NOT EXISTS pwk_katalog (
  slug TEXT PRIMARY KEY,
  source_url TEXT NOT NULL DEFAULT '',
  tier TEXT NOT NULL DEFAULT 'T1',
  payload TEXT NOT NULL,
  evidence TEXT NOT NULL DEFAULT '[]',
  evidence_text TEXT,
  image_url TEXT,
  image_sha256 TEXT,
  content_hash TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published',
  confidence INTEGER NOT NULL DEFAULT 100,
  corroborated_by TEXT DEFAULT '[]',
  first_seen_at TEXT NOT NULL,
  last_verified_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_katalog_status ON pwk_katalog (status, last_verified_at DESC);

CREATE TABLE IF NOT EXISTS pwk_pages (
  url TEXT PRIMARY KEY,
  content_hash TEXT NOT NULL,
  text TEXT,
  fetched_at TEXT NOT NULL,
  http_status INTEGER,
  kind TEXT
);

CREATE TABLE IF NOT EXISTS pwk_candidates (
  url TEXT PRIMARY KEY,
  query TEXT,
  tier TEXT,
  found_at TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'new'
);

CREATE TABLE IF NOT EXISTS pwk_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  step TEXT,
  cursor TEXT,
  found INTEGER DEFAULT 0,
  published INTEGER DEFAULT 0,
  drafts INTEGER DEFAULT 0,
  rejected INTEGER DEFAULT 0,
  errors TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS pwk_laporan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT,
  pesan TEXT,
  ip_hash TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pwk_state (
  k TEXT PRIMARY KEY,
  v TEXT,
  at TEXT
);
`);

const now = () => new Date().toISOString();

try { db.exec("ALTER TABLE pwk_pages ADD COLUMN extracted_hash TEXT;"); } catch {}
try { db.exec("ALTER TABLE pwk_pages ADD COLUMN tier TEXT;"); } catch {}

export function seedIfEmpty() {
  const n = db.prepare("SELECT COUNT(*) n FROM pwk_katalog").get().n;
  if (n > 0) return 0;
  if (!fs.existsSync(CFG.fallbackJson)) return 0;
  const data = JSON.parse(fs.readFileSync(CFG.fallbackJson, "utf8"));
  let c = 0;
  for (const it of data.items || []) {
    upsertItem({ ...it, status: it.status || "published" }, { source_url: it.source_url, tier: it.tier || "T1" });
    c++;
  }
  return c;
}


export function stateGet(k, fallback = null) {
  const row = db.prepare("SELECT v FROM pwk_state WHERE k = ?").get(k);
  if (!row) return fallback;
  try { return JSON.parse(row.v); } catch { return row.v; }
}

export function stateSet(k, v) {
  db.prepare(
    "INSERT INTO pwk_state (k, v, at) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, at = excluded.at"
  ).run(k, JSON.stringify(v), now());
}

/* ---------- katalog ---------- */

export function rowToItem(r) {
  const base = JSON.parse(r.payload);
  return {
    ...base,
    slug: r.slug,
    status: r.status,
    tier: r.tier,
    source_url: r.source_url,
    confidence: r.confidence,
    last_verified_at: r.last_verified_at,
    confidence_note: undefined,
  };
}

export function listKatalog({ j, t, q, status = "published" } = {}) {
  // status "any" = tayang + arsip, dipakai endpoint publik supaya halaman
  // Arsip di frontend tetap terisi item yang tenggatnya sudah lewat.
  const where = status === "any" ? ["status IN ('published','expired')"] : ["status = ?"];
  const args = status === "any" ? [] : [status];
  if (j) { where.push("json_extract(payload,'$.j') = ?"); args.push(j); }
  if (t) { where.push("json_extract(payload,'$.t') = ?"); args.push(t); }
  const rows = db.prepare(`SELECT * FROM pwk_katalog WHERE ${where.join(" AND ")} ORDER BY last_verified_at DESC`).all(...args);
  let items = rows.map(rowToItem);
  if (q) {
    const needle = q.toLowerCase();
    items = items.filter((x) =>
      [x.n, x.o, x.d, x.b, x.tg].filter(Boolean).join(" ").toLowerCase().includes(needle)
    );
  }
  return items;
}

export function slugBySource(url) {
  if (!url) return null;
  const r = db.prepare("SELECT slug FROM pwk_katalog WHERE source_url = ? LIMIT 1").get(url);
  return r?.slug || null;
}

export function getItem(slug) {
  const r = db.prepare("SELECT * FROM pwk_katalog WHERE slug = ?").get(slug);
  if (!r) return null;
  const item = rowToItem(r);
  item.evidence = JSON.parse(r.evidence || "[]");
  item.evidence_text = r.evidence_text || undefined;
  item.image_url = r.image_url || undefined;
  item.corroborated_by = JSON.parse(r.corroborated_by || "[]");
  return item;
}

export function upsertItem(item, extra = {}) {
  const payload = { ...item };
  for (const k of ["status", "tier", "source_url", "evidence", "evidence_text", "image_url", "image_sha256", "confidence", "corroborated_by", "last_verified_at", "discovered_by"]) {
    delete payload[k];
  }
  const existing = db.prepare("SELECT first_seen_at FROM pwk_katalog WHERE slug = ?").get(item.slug);
  db.prepare(`
    INSERT INTO pwk_katalog (slug, source_url, tier, payload, evidence, evidence_text, image_url, image_sha256,
                             content_hash, status, confidence, corroborated_by, first_seen_at, last_verified_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(slug) DO UPDATE SET
      source_url = excluded.source_url, tier = excluded.tier, payload = excluded.payload,
      evidence = excluded.evidence, evidence_text = excluded.evidence_text,
      image_url = excluded.image_url, image_sha256 = excluded.image_sha256,
      content_hash = excluded.content_hash, status = excluded.status,
      confidence = excluded.confidence, corroborated_by = excluded.corroborated_by,
      last_verified_at = excluded.last_verified_at, updated_at = excluded.updated_at
  `).run(
    item.slug,
    item.source_url || extra.source_url || "",
    item.tier || extra.tier || "T1",
    JSON.stringify(payload),
    JSON.stringify(item.evidence || extra.evidence || []),
    item.evidence_text || extra.evidence_text || null,
    item.image_url || extra.image_url || null,
    item.image_sha256 || extra.image_sha256 || null,
    item.content_hash || "",
    item.status || "draft",
    Math.round(item.confidence ?? 0),
    JSON.stringify(item.corroborated_by || []),
    existing?.first_seen_at || now(),
    item.last_verified_at || now(),
    now()
  );
  return item.slug;
}

export function setStatus(slug, status) {
  db.prepare("UPDATE pwk_katalog SET status = ?, updated_at = ? WHERE slug = ?").run(status, now(), slug);
}

export function expireOld() {
  const rows = db.prepare("SELECT slug, payload FROM pwk_katalog WHERE status = 'published'").all();
  let n = 0;
  for (const r of rows) {
    const dl = JSON.parse(r.payload).dl;
    if (dl && Date.parse(dl) < Date.now()) { setStatus(r.slug, "expired"); n++; }
  }
  return n;
}

/* ---------- halaman & kandidat ---------- */

export function getPageHash(url) {
  return db.prepare("SELECT content_hash FROM pwk_pages WHERE url = ?").get(url)?.content_hash || null;
}

export function savePage(url, { hash, text, status, kind, tier }) {
  db.prepare(`
    INSERT INTO pwk_pages (url, content_hash, text, fetched_at, http_status, kind, tier)
    VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(url) DO UPDATE SET content_hash=excluded.content_hash, text=excluded.text,
      fetched_at=excluded.fetched_at, http_status=excluded.http_status, kind=excluded.kind,
      tier=excluded.tier
  `).run(url, hash, text, now(), status, kind, tier || null);
}

export function addCandidate(url, query, tier) {
  db.prepare(`INSERT OR IGNORE INTO pwk_candidates (url, query, tier, found_at) VALUES (?,?,?,?)`)
    .run(url, query, tier, now());
}

export function nextCandidates(limit = 4) {
  return db.prepare("SELECT url, tier FROM pwk_candidates WHERE state = 'new' ORDER BY found_at LIMIT ?").all(limit);
}

export function markCandidate(url, state) {
  db.prepare("UPDATE pwk_candidates SET state = ? WHERE url = ?").run(state, url);
}

/* ---------- run ---------- */

export function startRun() {
  const r = db.prepare("INSERT INTO pwk_runs (started_at, step, cursor) VALUES (?, 'search', '{}')").run(now());
  return Number(r.lastInsertRowid);
}

export function updateRun(id, patch) {
  const cur = db.prepare("SELECT * FROM pwk_runs WHERE id = ?").get(id);
  if (!cur) return;
  const next = { ...cur, ...patch };
  db.prepare(`UPDATE pwk_runs SET finished_at=?, step=?, cursor=?, found=?, published=?, drafts=?, rejected=?, errors=? WHERE id=?`)
    .run(next.finished_at ?? null, next.step ?? null, next.cursor ?? null,
         next.found ?? 0, next.published ?? 0, next.drafts ?? 0, next.rejected ?? 0,
         next.errors ?? "[]", id);
}

export function lastRun() {
  const r = db.prepare("SELECT * FROM pwk_runs ORDER BY id DESC LIMIT 1").get();
  if (!r) return null;
  return { ...r, cursor: r.cursor ? JSON.parse(r.cursor) : {}, errors: r.errors ? JSON.parse(r.errors) : [] };
}

export function counts() {
  const q = (s) => db.prepare(s).get().n;
  return {
    published: q("SELECT COUNT(*) n FROM pwk_katalog WHERE status='published'"),
    draft: q("SELECT COUNT(*) n FROM pwk_katalog WHERE status='draft'"),
    expired: q("SELECT COUNT(*) n FROM pwk_katalog WHERE status='expired'"),
    rejected: q("SELECT COUNT(*) n FROM pwk_katalog WHERE status='rejected'"),
    pages: q("SELECT COUNT(*) n FROM pwk_pages"),
    candidates: q("SELECT COUNT(*) n FROM pwk_candidates WHERE state='new'"),
  };
}

export function listDrafts(limit = 50) {
  return db.prepare("SELECT * FROM pwk_katalog WHERE status='draft' ORDER BY confidence DESC LIMIT ?").all(limit).map(rowToItem);
}

export function saveLaporan(slug, pesan, ipHash) {
  db.prepare("INSERT INTO pwk_laporan (slug, pesan, ip_hash, created_at) VALUES (?,?,?,?)").run(slug, pesan, ipHash, now());
}

export function countLaporan(ipHash, hours = 1) {
  const since = new Date(Date.now() - hours * 3600e3).toISOString();
  return db.prepare("SELECT COUNT(*) n FROM pwk_laporan WHERE ip_hash = ? AND created_at > ?").get(ipHash, since).n;
}

/* ---------- halaman yang perlu diekstrak ---------- */

export function getPendingPages(limit = 2) {
  return db.prepare(
    "SELECT url, content_hash, text, kind, tier FROM pwk_pages WHERE text IS NOT NULL AND (extracted_hash IS NULL OR extracted_hash != content_hash) ORDER BY fetched_at DESC LIMIT ?"
  ).all(limit);
}

export function markExtracted(url, hash) {
  db.prepare("UPDATE pwk_pages SET extracted_hash = ? WHERE url = ?").run(hash, url);
}

export function getPagesByUrl(url) {
  return db.prepare("SELECT url FROM pwk_pages WHERE url = ?").get(url);
}

export function addManualCandidate(url, tier = "T3", query = "manual") {
  db.prepare("INSERT OR REPLACE INTO pwk_candidates (url, query, tier, found_at, state) VALUES (?,?,?,?, 'new')")
    .run(url, query, tier, new Date().toISOString());
}

export function sourceLastFetch() {
  const rows = db.prepare("SELECT k, v FROM pwk_state WHERE k LIKE 'src:%'").all();
  const out = {};
  for (const r of rows) { try { out[r.k.slice(4)] = JSON.parse(r.v); } catch {} }
  return out;
}

/* item tayang yang lama tidak diverifikasi → masuk antrean cek ulang */
export function staleForReverify(hours = 24, limit = 8) {
  const cutoff = new Date(Date.now() - hours * 3600e3).toISOString();
  return db.prepare(
    "SELECT slug, source_url, tier FROM pwk_katalog WHERE status IN ('published','expired') AND source_url <> '' AND last_verified_at < ? ORDER BY last_verified_at ASC LIMIT ?"
  ).all(cutoff, limit);
}
