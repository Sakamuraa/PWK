import { CFG } from "../config.mjs";
import {
  stateGet, stateSet, startRun, updateRun, addCandidate, nextCandidates, markCandidate,
  getPageHash, savePage, getPendingPages, markExtracted, startRun as _s, expireOld,
  getPagesByUrl, addManualCandidate,
} from "../db.mjs";
import { loadSources, discoverFromSource, fetchDocument, tierOf } from "./sources.mjs";
import { extractFromText } from "./extract.mjs";
import { validateItem } from "./validate.mjs";
import { resolveStatus, findCorroboration, publishItem } from "./publish.mjs";
import { hashText } from "./text.mjs";
import { llm } from "./llm.mjs";

const LOCK_KEY = "run:lock";

export function isLocked() {
  const lock = stateGet(LOCK_KEY);
  if (!lock) return false;
  const age = Date.now() - Date.parse(lock.at || 0);
  return age < 25 * 60 * 1000;
}

function lock(runId) { stateSet(LOCK_KEY, { runId, at: new Date().toISOString() }); }
function unlock() { stateSet(LOCK_KEY, null); }

/* ---------- langkah ---------- */

async function discoverStep(stats) {
  const sources = loadSources();
  const last = stateGet("src:last", {});
  for (const src of sources) {
    const key = src.name;
    const prev = last[key] ? Date.parse(last[key]) : 0;
    if (Date.now() - prev < (src.intervalHours || 6) * 3600e3) continue;
    try {
      const items = await discoverFromSource(src);
      let added = 0;
      for (const it of items) {
        if (!it.url) continue;
        addCandidate(it.url, src.name, tierOf(it.url, src.tier || "T2"));
        added++;
      }
      stats.found += added;
      last[key] = new Date().toISOString();
      stats.errors.push({ stage: "discover", source: key, ok: added });
    } catch (e) {
      stats.errors.push({ stage: "discover", source: key, error: e.message });
    }
  }
  stateSet("src:last", last);
}

async function fetchStep(stats, deadline) {
  let batches = 0;
  while (Date.now() < deadline && batches < 6) {
    batches++;
    const batch = nextCandidates(3);
    if (!batch.length) break;
    for (const { url, tier: candTier } of batch) {
      if (Date.now() >= deadline) return;
      try {
        const doc = await fetchDocument(url, { llm });
        const text = doc.text || "";
        const minLen = doc.kind === "image" || doc.kind === "pdf-image" ? 60 : 200;
        if (text.length < minLen) throw new Error("teks terlalu pendek");
        const hash = hashText(text);
        const prev = getPageHash(url);
        if (prev === hash) { markCandidate(url, "unchanged"); continue; }
        savePage(url, { hash, text, status: 200, kind: doc.kind, tier: candTier || tierOf(url, "T2") });
        markCandidate(url, "fetched");
        stats.fetched = (stats.fetched || 0) + 1;
      } catch (e) {
        markCandidate(url, "error");
        stats.errors.push({ stage: "fetch", url, error: e.message });
      }
    }
  }
}

const RELEVANT = /(lomba|kompetisi|beasiswa|pendaftaran|tenggat|deadline|hadiah|sayembara|olimpiade|hackathon|scholarship)/gi;

function relevance(text) {
  const hits = new Set((text.match(RELEVANT) || []).map((x) => x.toLowerCase()));
  return hits.size;
}

async function extractStep(stats, deadline) {
  let done = 0;
  const maxPerRun = CFG.maxItemsPerRun;
  while (Date.now() < deadline && done < maxPerRun) {
    const pages = getPendingPages(1);
    if (!pages.length) break;
    const page = pages[0];
    // halaman yang tidak menyebut lomba/beasiswa sama sekali tidak perlu LLM
    if (relevance(page.text || "") < 2) { markExtracted(page.url, page.content_hash); continue; }
    done++;
    try {
      const items = await extractFromText({
        text: page.text,
        url: page.url,
        sourceName: new URL(page.url).hostname,
      });
      if (!items.length) { markExtracted(page.url, page.content_hash); continue; }

      for (const item of items.slice(0, 3)) {
        const tier = page.tier || tierOf(page.url, "T2");
        const verdict = validateItem(item, { text: page.text, url: page.url, tier });
        item.corroborated_by = findCorroboration(item, page.url);
        item.status = resolveStatus(item, verdict, { tier, url: page.url });

        if (item.status === "rejected") {
          stats.rejected++;
          stats.errors.push({ stage: "validate", url: page.url, item: item.n, reasons: verdict.fatal });
          continue;
        }
        publishItem({
          item, tier, url: page.url,
          evidence: item.evidence,
          sourceName: new URL(page.url).hostname,
          kind: page.kind,
        });
        if (item.status === "published") stats.published++;
        else if (item.status === "draft") stats.drafts++;
        else if (item.status === "expired") stats.expired = (stats.expired || 0) + 1;
      }
      markExtracted(page.url, page.content_hash);
    } catch (e) {
      markExtracted(page.url, page.content_hash);
      stats.errors.push({ stage: "extract", url: page.url, error: e.message });
    }
  }
}

/* ---------- orkestrasi ---------- */

export async function runPipeline({ trigger = "api", budgetMs = CFG.stepBudgetMs } = {}) {
  if (!CFG.enabled) return { skipped: true, reason: "DISCOVERY_ENABLED=0" };
  if (isLocked()) return { skipped: true, reason: "run lain masih berjalan" };

  const runId = startRun();
  lock(runId);
  const started = Date.now();
  // jaring pengaman: kalau satu panggilan jaringan menggantung, lock tidak
  // tertahan selamanya dan run berikutnya tetap bisa jalan.
  const guard = setTimeout(() => {
    try {
      updateRun(runId, { finished_at: new Date().toISOString(), step: "timeout", errors: JSON.stringify(stats.errors.slice(0, 40)) });
    } catch {}
    unlock();
  }, budgetMs + 90000);
  guard.unref?.();
  const deadline = started + budgetMs;
  const stats = { found: 0, fetched: 0, published: 0, drafts: 0, rejected: 0, errors: [] };

  try {
    await discoverStep(stats);
    await fetchStep(stats, deadline);
    await extractStep(stats, deadline);
    const expired = expireOld();
    stats.expired = (stats.expired || 0) + expired;

    updateRun(runId, {
      finished_at: new Date().toISOString(),
      step: "done",
      cursor: JSON.stringify({ trigger, ms: Date.now() - started }),
      found: stats.found,
      published: stats.published,
      drafts: stats.drafts,
      rejected: stats.rejected,
      errors: JSON.stringify(stats.errors.slice(0, 40)),
    });
    return { runId, ms: Date.now() - started, ...stats, errors: stats.errors.slice(0, 10) };
  } catch (e) {
    updateRun(runId, {
      finished_at: new Date().toISOString(),
      step: "failed",
      errors: JSON.stringify([...(stats.errors || []), { stage: "run", error: e.message }].slice(0, 40)),
      found: stats.found, published: stats.published, drafts: stats.drafts, rejected: stats.rejected,
    });
    return { runId, error: e.message, ...stats };
  } finally {
    clearTimeout(guard);
    unlock();
  }
}

/* ---------- tambah kandidat manual (IG / poster Drive) ---------- */

export function addManual(url) {
  addManualCandidate(url, tierOf(url, "T3"), "manual");
  return { queued: url };
}

export { getPagesByUrl, _s };
