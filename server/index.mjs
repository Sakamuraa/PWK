import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { CFG, ROOT } from "./config.mjs";
import {
  listKatalog, getItem, listDrafts, setStatus, counts, lastRun, saveLaporan, countLaporan,
  seedIfEmpty, stateGet,
} from "./db.mjs";
import { runPipeline, addManual, isLocked } from "./lib/pipeline.mjs";
import { loadSources } from "./lib/sources.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pkgVersion = (() => { try { return JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version; } catch { return "0.0.0"; } })();

seedIfEmpty();

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8", ".woff2": "font/woff2",
};

const json = (res, code, body, headers = {}) => {
  const buf = Buffer.from(JSON.stringify(body));
  res.writeHead(code, { "content-type": "application/json; charset=utf-8", "content-length": buf.length, ...headers });
  res.end(buf);
};

function secureEqual(a, b) {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));
  if (!x.length || x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

function auth(req) {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : "";
  return {
    cron: secureEqual(token, CFG.cronSecret) && !!CFG.cronSecret,
    admin: secureEqual(token, CFG.adminToken) && !!CFG.adminToken,
  };
}

function readBody(req, limit = 32 * 1024) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    req.on("data", (c) => {
      total += c.length;
      if (total > limit) { reject(new Error("body terlalu besar")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error("JSON tidak valid")); }
    });
    req.on("error", reject);
  });
}

function serveStatic(req, res, urlPath) {
  const root = CFG.staticDir;
  let file = path.join(root, decodeURIComponent(urlPath === "/" ? "/index.html" : urlPath));
  if (!file.startsWith(root)) return json(res, 403, { error: "forbidden" });
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    if (path.extname(file)) return json(res, 404, { error: "not found" });
    file = path.join(root, "index.html");
    if (!fs.existsSync(file)) return json(res, 404, { error: "build belum ada" });
  }
  const ext = path.extname(file);
  const buf = fs.readFileSync(file);
  const cache = ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable";
  res.writeHead(200, { "content-type": MIME[ext] || "application/octet-stream", "content-length": buf.length, "cache-control": cache });
  res.end(buf);
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://localhost");
  const p = u.pathname.replace(/\/+$/, "") || "/";
  const method = req.method || "GET";
  const a = auth(req);

  try {
    if (p.startsWith("/api/")) res.setHeader("cache-control", "no-store");

    if (p === "/api/katalog" && method === "GET") {
      const items = listKatalog({ j: u.searchParams.get("j") || undefined, t: u.searchParams.get("t") || undefined, q: u.searchParams.get("q") || undefined, status: "any" });
      return json(res, 200, { updated: newest(items), total: items.length, items }, { "cache-control": "public, max-age=60, s-maxage=300" });
    }

    if (p.startsWith("/api/katalog/") && method === "GET") {
      const slug = p.slice("/api/katalog/".length);
      const item = getItem(slug);
      return item ? json(res, 200, item) : json(res, 404, { error: "tidak ditemukan" });
    }

    if (p === "/api/meta/sources" && method === "GET") {
      const sources = loadSources().map((s) => ({ name: s.name, url: s.url, tier: s.tier, j: s.j }));
      const last = stateGet("src:last", {});
      return json(res, 200, {
        version: pkgVersion,
        updated: new Date().toISOString(),
        counts: counts(),
        sources: sources.map((s) => ({ ...s, last_fetch: last[s.name] || null })),
      });
    }

    if (p === "/api/cron/discover" && method === "POST") {
      if (!a.cron) return json(res, 401, { error: "unauthorized" });
      if (isLocked()) return json(res, 202, { accepted: false, running: true });
      const run = runPipeline({ trigger: "cron" }).catch(() => {});
      void run;
      return json(res, 202, { accepted: true, started_at: new Date().toISOString() });
    }

    if (p === "/api/cron/status" && method === "GET") {
      if (!a.cron && !a.admin) return json(res, 401, { error: "unauthorized" });
      return json(res, 200, { running: isLocked(), counts: counts(), last_run: lastRun() });
    }

    if (p === "/api/admin/review" && method === "GET") {
      if (!a.admin) return json(res, 401, { error: "unauthorized" });
      return json(res, 200, { drafts: listDrafts(100) });
    }

    if (p === "/api/admin/review" && method === "POST") {
      if (!a.admin) return json(res, 401, { error: "unauthorized" });
      const body = await readBody(req);
      if (!body.slug || !["approve", "reject"].includes(body.action)) return json(res, 400, { error: "slug/action wajib" });
      setStatus(body.slug, body.action === "approve" ? "published" : "rejected");
      return json(res, 200, { slug: body.slug, status: body.action === "approve" ? "published" : "rejected" });
    }

    if (p === "/api/admin/refresh" && method === "POST") {
      if (!a.admin) return json(res, 401, { error: "unauthorized" });
      const body = await readBody(req);
      if (body.url) return json(res, 200, addManual(body.url));
      const run = runPipeline({ trigger: "admin" }).catch(() => {});
      void run;
      return json(res, 202, { accepted: true });
    }

    if (p === "/api/laporan" && method === "POST") {
      const body = await readBody(req);
      const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
      const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
      if (countLaporan(ipHash, 1) >= 5) return json(res, 429, { error: "terlalu banyak laporan, coba lagi nanti" });
      if (!body.slug || !body.pesan) return json(res, 400, { error: "slug dan pesan wajib" });
      saveLaporan(String(body.slug).slice(0, 120), String(body.pesan).slice(0, 1000), ipHash);
      return json(res, 201, { ok: true });
    }

    if (p.startsWith("/api/")) return json(res, 404, { error: "endpoint tidak ada" });
    return serveStatic(req, res, u.pathname);
  } catch (e) {
    return json(res, 500, { error: e.message });
  }
});

function newest(items) {
  return items.reduce((max, x) => (x.last_verified_at > max ? x.last_verified_at : max), "");
}

server.listen(CFG.port, CFG.host, () => {
  console.log(`PWK API + static di http://${CFG.host}:${CFG.port} | db=${CFG.dbPath} | discovery=${CFG.enabled ? "on" : "off"}`);
});

if (CFG.autoRunMinutes > 0) {
  setInterval(() => {
    runPipeline({ trigger: "timer" }).catch((e) => console.error("autorun", e.message));
  }, CFG.autoRunMinutes * 60 * 1000);
  console.log(`autorun tiap ${CFG.autoRunMinutes} menit`);
}
