import fs from "node:fs";
import * as cheerio from "cheerio";
import { safeFetch } from "./http.mjs";
import { htmlToText, sha256 } from "./text.mjs";

export function loadSources() {
  const raw = fs.readFileSync(new URL("../sources.json", import.meta.url), "utf8");
  return JSON.parse(raw);
}

export function classify(url) {
  const u = String(url);
  if (/instagram\.com\/(p|reel|tv)\//.test(u)) return "instagram";
  if (/drive\.google\.com/.test(u)) return "gdrive";
  if (/\.pdf($|\?)/i.test(u)) return "pdf";
  if (/\.(jpe?g|png|webp)($|\?)/i.test(u)) return "image";
  if (/(\/feed\/?$|\/rss\/?$|\.xml($|\?)|format=rss)/i.test(u)) return "rss";
  return "html";
}

export function tierOf(url, fallback = "T2") {
  try {
    const h = new URL(url).hostname;
    if (/(\.ac\.id|\.go\.id|\.or\.id)$/.test(h)) return "T1";
  } catch {}
  return fallback;
}

/* ---------- daftar kandidat dari RSS / listing ---------- */

export function parseRss(xml, { j }) {
  const $ = cheerio.load(xml, { xmlMode: true });
  const out = [];
  $("item").each((_, el) => {
    const link = $(el).find("link").text().trim();
    const title = $(el).find("title").text().trim();
    const desc = $(el).find("description").text();
    if (link) out.push({ url: link, title, hint: `${title} ${desc}`.slice(0, 400), j });
  });
  return out;
}

export function parseListing(html, { baseUrl, linkPattern, j }) {
  const $ = cheerio.load(html);
  const re = new RegExp(linkPattern || "(lomba|beasiswa|kompetisi|pendaftaran)", "i");
  const out = [];
  const seen = new Set();
  $("a").each((_, el) => {
    const href = $(el).attr("href");
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (!href) return;
    let abs;
    try { abs = new URL(href, baseUrl).toString(); } catch { return; }
    if (!/^https?:/.test(abs)) return;
    if (seen.has(abs)) return;
    if (!re.test(text) && !re.test(abs)) return;
    if (text.length < 12) return;
    seen.add(abs);
    out.push({ url: abs, title: text.slice(0, 140), hint: text.slice(0, 400), j });
  });
  return out.slice(0, 25);
}

export async function discoverFromSource(source) {
  const kind = source.type === "rss" ? "rss" : "html";
  const res = await safeFetch(source.url, { accept: kind === "rss" ? "application/rss+xml,text/xml" : "text/html", timeoutMs: 20000 });
  if (res.status !== 200) throw new Error(`${source.name}: HTTP ${res.status}`);
  const body = res.buffer.toString("utf8");
  return kind === "rss"
    ? parseRss(body, source)
    : parseListing(body, { baseUrl: source.url, linkPattern: source.linkPattern, j: source.j });
}

/* ---------- dokumen detail ---------- */

export async function fetchDocument(url, { llm } = {}) {
  const kind = classify(url);

  if (kind === "instagram") {
    const code = (url.match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/) || [])[1];
    if (!code) throw new Error("shortcode Instagram tidak ditemukan");
    let caption = "";
    let thumb = null;
    let author = "";
    try {
      const oe = await safeFetch(`https://www.instagram.com/api/v1/oembed/?url=https://www.instagram.com/p/${code}/`, {
        accept: "application/json", timeoutMs: 15000, maxBytes: 1024 * 1024,
      });
      if (oe.status === 200) {
        const j = JSON.parse(oe.buffer.toString("utf8"));
        caption = String(j.title || "").trim();
        thumb = j.thumbnail_url || null;
        author = String(j.author_name || "");
      }
    } catch { /* lanjut ke OCR kalau ada gambar */ }

    // OCR poster di dalam post (kalau thumbnail bisa diunduh)
    let ocr = "";
    if (thumb) {
      try {
        const img = await safeFetch(thumb, { timeoutMs: 20000, maxBytes: 8 * 1024 * 1024 });
        if (img.status === 200 && /^image\//.test(img.contentType || "")) {
          if (!llm) throw new Error("butuh model vision untuk membaca poster Instagram");
          ocr = await llm.visionText(img.buffer, img.contentType);
        }
      } catch { /* caption saja tetap dipakai */ }
    }

    const text = [caption, author ? `Akun: @${author}` : "", ocr].filter(Boolean).join("\n\n").slice(0, 12000);
    if (text.length < 60) throw new Error("isi post Instagram tidak bisa dibaca (login-gated)");
    return { text, kind, imageUrl: thumb || undefined };
  }

  if (kind === "gdrive") {
    const id = (url.match(/\/d\/([a-zA-Z0-9_-]{10,})/) || url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/) || [])[1];
    if (!id) throw new Error("ID Google Drive tidak ditemukan");
    const dl = `https://drive.google.com/uc?export=download&id=${id}`;
    const res = await safeFetch(dl, { timeoutMs: 25000, maxBytes: 15 * 1024 * 1024 });
    const ct = res.contentType || "";
    if (ct.includes("pdf") || res.buffer.slice(0, 4).toString() === "%PDF") {
      throw new Error("drive-pdf");
    }
    if (!/^image\//.test(ct)) throw new Error(`berkas Drive bukan gambar/pdf (${ct})`);
    if (!llm) throw new Error("butuh model vision untuk membaca poster Drive");
    const text = await llm.visionText(res.buffer, ct);
    return { text, kind: "image", imageUrl: dl, imageHash: sha256(res.buffer) };
  }

  if (kind === "image" || kind === "pdf") {
    const res = await safeFetch(url, { timeoutMs: 25000, maxBytes: 15 * 1024 * 1024 });
    if (kind === "image" || /^image\//.test(res.contentType)) {
      if (!llm) throw new Error("butuh model vision untuk membaca gambar");
      const text = await llm.visionText(res.buffer, res.contentType || "image/jpeg");
      return { text, kind: "image", imageUrl: url, imageHash: sha256(res.buffer) };
    }
    const pdfParse = (await import("pdf-parse")).default;
    const parsed = await pdfParse(res.buffer);
    const text = (parsed.text || "").trim();
    if (text.length < 400) {
      if (!llm) throw new Error("PDF hasil scan tanpa teks; butuh model vision");
      const ocr = await llm.visionPdf?.(res.buffer);
      if (!ocr) throw new Error("PDF hasil scan tanpa teks yang bisa dibaca");
      return { text: ocr, kind: "pdf-image" };
    }
    return { text: text.slice(0, 12000), kind: "pdf" };
  }

  const res = await safeFetch(url, { accept: "text/html", timeoutMs: 20000 });
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
  const html = res.buffer.toString("utf8");
  const $ = cheerio.load(html);
  const og = $('meta[property="og:image"]').attr("content") || null;
  const text = htmlToText(html).slice(0, 14000);
  if (text.length < 250) throw new Error("isi halaman terlalu pendek");
  return { text, kind: "html", imageUrl: og };
}
