import * as cheerio from "cheerio";
import { safeFetch } from "./http.mjs";

const SKIP_HOSTS = [
  "pinterest.", "linkedin.com", "tiktok.com", "youtube.com", "x.com", "twitter.com",
  "facebook.com/login", "accounts.google.com", "play.google.com", "apps.apple.com",
];

const isSkipped = (url) => SKIP_HOSTS.some((h) => url.includes(h));

function decodeDdg(href) {
  try {
    const u = new URL(href, "https://duckduckgo.com");
    const target = u.searchParams.get("uddg");
    return target ? decodeURIComponent(target) : u.toString();
  } catch {
    return null;
  }
}

export async function ddgSearch(query, limit = 8) {
  const res = await safeFetch("https://html.duckduckgo.com/html/", {
    method: "POST",
    body: new URLSearchParams({ q: query, kl: "id-id" }).toString(),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
    },
    accept: "text/html",
    timeoutMs: 15000,
  });
  if (res.status !== 200) throw new Error(`ddg ${res.status}`);
  const $ = cheerio.load(res.buffer.toString("utf8"));
  const out = [];
  $("a.result__a").each((_, el) => {
    const href = decodeDdg($(el).attr("href") || "");
    const title = $(el).text().trim();
    if (href && /^https?:\/\//.test(href) && !isSkipped(href)) out.push({ url: href, title });
  });
  return dedupe(out).slice(0, limit);
}

export async function bingRss(query, limit = 8) {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&format=rss&count=20&setlang=id`;
  const res = await safeFetch(url, { accept: "application/rss+xml,text/xml", timeoutMs: 15000 });
  if (res.status !== 200) throw new Error(`bing ${res.status}`);
  const xml = res.buffer.toString("utf8");
  const $ = cheerio.load(xml, { xmlMode: true });
  const out = [];
  $("item").each((_, el) => {
    const link = $(el).find("link").text().trim();
    const title = $(el).find("title").text().trim();
    if (link && /^https?:\/\//.test(link) && !isSkipped(link)) out.push({ url: link, title });
  });
  return dedupe(out).slice(0, limit);
}

export async function search(query, limit = 8) {
  const results = [];
  for (const fn of [bingRss, ddgSearch]) {
    try {
      const r = await fn(query, limit);
      results.push(...r);
      if (results.length >= limit) break;
    } catch (e) {
      // satu mesin gagal tidak menghentikan pipeline
    }
  }
  return dedupe(results).slice(0, limit);
}

export async function jinaText(url, maxChars = 12000) {
  const res = await safeFetch(`https://r.jina.ai/${url}`, {
    accept: "text/plain",
    timeoutMs: 25000,
    maxBytes: 4 * 1024 * 1024,
  });
  if (res.status !== 200) throw new Error(`jina ${res.status}`);
  return res.buffer.toString("utf8").slice(0, maxChars);
}

function dedupe(list) {
  const seen = new Set();
  const out = [];
  for (const r of list) {
    const key = r.url.split("#")[0].replace(/\/$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...r, url: key });
  }
  return out;
}
