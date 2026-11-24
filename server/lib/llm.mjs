import { CFG } from "../config.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(body, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(CFG.llmUrl, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${CFG.llmKey}`,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      const err = new Error(`llm ${res.status}: ${text.slice(0, 300)}`);
      err.retryable = [408, 425, 429].includes(res.status) || res.status >= 500;
      throw err;
    }
    const json = JSON.parse(text);
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) throw new Error("llm mengembalikan konten kosong");
    return content;
  } finally {
    clearTimeout(timer);
  }
}

export async function chat(messages, { model = CFG.llmModel, maxTokens = 2600, timeoutMs = 120000, retries = 2 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await post(
        { model, messages, temperature: 0.1, max_tokens: maxTokens, response_format: { type: "json_object" } },
        timeoutMs
      );
    } catch (e) {
      lastErr = e;
      if (!e.retryable || attempt === retries) break;
      await sleep(1500 * (attempt + 1));
    }
  }
  throw lastErr;
}

export const visionText = async (buffer, mime = "image/jpeg") => {
  const b64 = buffer.toString("base64");
  const content = await chat(
    [
      {
        role: "system",
        content:
          "Kamu pembaca poster. Transkripsikan seluruh teks yang terlihat apa adanya, urut atas ke bawah. Jangan menambah tafsiran. Balas JSON {\"text\":\"...\"}.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Transkripsikan teks poster ini." },
          { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
        ],
      },
    ],
    { model: CFG.visionModel, maxTokens: 2000 }
  );
  try {
    const parsed = JSON.parse(content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1));
    return String(parsed.text || "").slice(0, 12000);
  } catch {
    return content.slice(0, 12000);
  }
};

export const llm = { chat, visionText };
