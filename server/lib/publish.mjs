import { slugify, similarity } from "./text.mjs";
import { listKatalog, upsertItem, setStatus } from "../db.mjs";
import { CFG } from "../config.mjs";

export function resolveStatus(item, verdict, { tier, url, sourceUrl }) {
  if (verdict.expired) return "expired";
  if (!verdict.ok) return "rejected";

  const corroborated = findCorroboration(item, url);
  const minConf = CFG.minConfidence[tier] ?? 95;

  if (tier === "T3") {
    return corroborated.length >= 1 ? "published" : "draft";
  }
  if (tier === "T2") {
    return item.confidence >= Math.max(minConf, 92) ? "published" : "draft";
  }
  return item.confidence >= minConf ? "published" : "draft";
}

export function findCorroboration(item, url) {
  const out = [];
  const all = [...listKatalog({ status: "published" }), ...listKatalog({ status: "draft" })];
  for (const ex of all) {
    if (!ex.source_url || ex.source_url === url) continue;
    if (similarity(`${item.n} ${item.o}`, `${ex.n} ${ex.o}`) >= 0.85) out.push(ex.source_url);
  }
  return [...new Set(out)];
}

export function publishItem({ item, tier, url, evidence, sourceName, kind, imageUrl, imageHash, evidenceText }) {
  const slug = uniqueSlug(item.n, url);
  const record = {
    ...item,
    slug,
    status: item.status || "draft",
    tier,
    source_url: url,
    evidence: { source: sourceName || null, kind, quotes: evidence, corroborated: item.corroborated_by || [] },
    evidence_text: evidenceText ? evidenceText.slice(0, 8000) : undefined,
    image_url: imageUrl || undefined,
    image_sha256: imageHash || undefined,
    confidence: Math.round(item.confidence),
    corroborated_by: item.corroborated_by || [],
    last_verified_at: new Date().toISOString(),
    discovered_by: "auto",
  };
  record.evidence = evidence;
  upsertItem(record, { source_url: url, tier, evidence, evidence_text: evidenceText, image_url: imageUrl, image_sha256: imageHash });
  return slug;
}

function uniqueSlug(name, url) {
  const base = slugify(name) || "item";
  const all = listKatalog({ status: "published" })
    .concat(listKatalog({ status: "draft" }), listKatalog({ status: "expired" }));
  // satu artikel kadang memuat beberapa program; slug harus per program, bukan per URL
  const sameName = all.find((x) => x.slug === base || similarity(x.n, name) >= 0.9);
  if (sameName) return sameName.slug;
  return base;
}

export { setStatus };
