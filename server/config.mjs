import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.PWK_DATA_DIR || "/data/workspace/pwk-data";
fs.mkdirSync(DATA_DIR, { recursive: true });

// muat env sederhana (KEY=VALUE) dari folder data, tanpa dependensi
const envFile = path.join(DATA_DIR, "env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const val = m[2].replace(/^["']|["']$/g, "");
    if (!(m[1] in process.env)) process.env[m[1]] = val;
  }
}

const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

export const CFG = {
  dataDir: DATA_DIR,
  dbPath: process.env.PWK_DB || path.join(DATA_DIR, "pwk.db"),
  port: num(process.env.PWK_PORT, 8098),
  host: process.env.PWK_HOST || "127.0.0.1",
  staticDir: process.env.PWK_STATIC || "/data/workspace/PWK/dist",
  fallbackJson: process.env.PWK_FALLBACK || "/data/workspace/PWK/public/data/katalog.json",

  cronSecret: process.env.CRON_SECRET || "",
  adminToken: process.env.ADMIN_TOKEN || "",

  llmUrl: process.env.DISCOVERY_LLM_URL || "https://doomps.web.id/v1/chat/completions",
  llmKey: process.env.DISCOVERY_LLM_KEY || "",
  llmModel: process.env.DISCOVERY_LLM_MODEL || "dv/gemini-3.0-flash-high",
  visionModel: process.env.DISCOVERY_VISION_MODEL || "dv/gemini-3.0-flash-high",

  enabled: (process.env.DISCOVERY_ENABLED ?? "1") !== "0",
  maxItemsPerRun: num(process.env.MAX_ITEMS_PER_RUN, 12),
  stepBudgetMs: num(process.env.STEP_BUDGET_MS, 240000),
  minConfidence: { T1: 90, T2: 92, T3: 95 },

  autoRunMinutes: num(process.env.PWK_AUTORUN_MINUTES, 0), // 0 = hanya lewat endpoint
};

export const QUERIES = [
  "lomba mahasiswa 2027 pendaftaran",
  "kompetisi mahasiswa teknik industri 2027",
  "beasiswa 2027 pendaftaran dibuka",
  "lomba desain produk mahasiswa 2027",
  "beasiswa D4 S1 2027 dalam negeri",
  "hackathon mahasiswa 2027 indonesia",
];
