import dns from "node:dns/promises";
import net from "node:net";

const BLOCKED = [
  /^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
  /^0\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, /^::1$/, /^f[cd]/i, /^fe80/i,
];

function isPrivateIp(ip) {
  return BLOCKED.some((re) => re.test(ip));
}

async function assertPublicHost(hostname) {
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error(`alamat internal ditolak: ${hostname}`);
    return;
  }
  const addrs = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addrs.length) throw new Error("DNS tidak mengembalikan alamat");
  for (const a of addrs) if (isPrivateIp(a.address)) throw new Error(`host mengarah ke jaringan internal: ${hostname} → ${a.address}`);
}

const UA = "Mozilla/5.0 (compatible; PWK-KatalogBot/1.0; +https://pwk.hmti.local)";

export async function safeFetch(url, { maxBytes = 10 * 1024 * 1024, timeoutMs = 20000, headers = {}, accept = "*/*", maxHops = 4, method = "GET", body = undefined } = {}) {
  let current = url;
  for (let hop = 0; hop <= maxHops; hop++) {
    const u = new URL(current);
    if (!/^https?:$/.test(u.protocol)) throw new Error(`protokol tidak didukung: ${u.protocol}`);
    await assertPublicHost(u.hostname);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res;
    try {
      res = await fetch(current, {
        redirect: "manual",
        method,
        body,
        signal: ctrl.signal,
        headers: { "user-agent": UA, accept, "accept-language": "id,en;q=0.8", ...headers },
      });
    } finally {
      clearTimeout(timer);
    }

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get("location");
      if (!loc) throw new Error("redirect tanpa location");
      current = new URL(loc, current).toString();
      continue;
    }

    const len = Number(res.headers.get("content-length") || 0);
    if (len > maxBytes) throw new Error(`berkas terlalu besar (${len} byte)`);

    const chunks = [];
    let total = 0;
    const reader = res.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes) { reader.cancel().catch(() => {}); throw new Error("berkas melebihi batas ukuran"); }
      chunks.push(value);
    }
    return {
      status: res.status,
      finalUrl: current,
      contentType: res.headers.get("content-type") || "",
      buffer: Buffer.concat(chunks),
    };
  }
  throw new Error("terlalu banyak redirect");
}
