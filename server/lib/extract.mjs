import { chat } from "./llm.mjs";
import { extractJson } from "./text.mjs";

const FIELDS = ["n", "o", "d", "dl", "u"];

const SYS = `Kamu kurator katalog lomba dan beasiswa untuk mahasiswa Indonesia.
Tugas: dari teks satu halaman, ambil HANYA program (lomba/kompetisi atau beasiswa) yang benar-benar dibahas di halaman itu.

Aturan wajib:
1. Jangan mengarang. Kalau halaman tidak membahas program tertentu (mis. hanya berita umum, profil, opini), balas {"items":[]}.
2. "dl" (tenggat) hanya diisi kalau tanggal penutupan tertulis eksplisit di teks, format YYYY-MM-DD. Kalau tidak ada, null.
3. "u" hanya diisi kalau URL pendaftaran/info resmi tertulis di teks.
4. Setiap fakta penting (nama, penyelenggara, deskripsi, tenggat, link) WAJIB punya kutipan "evidence" yang diambil PERSIS dari teks (minimal 12 karakter, tanpa diubah).
5. "confidence" 0-100: seberapa yakin semua fakta diambil dari teks ini.
6. "j": "Lomba" atau "Beasiswa". "t": "Kampus", "Nasional", atau "Internasional".
7. "b" (bidang) pilih satu: "Riset & Inovasi", "Teknologi & Data", "Bisnis & Kewirausahaan", "Umum", "Teknik Industri", "Rekayasa & Manufaktur".
8. "k" kategori untuk lomba: "Akademik" (riset, karya tulis, keilmuan) atau "Nonakademik" (keterampilan, kewirausahaan, minat-bakat). Untuk beasiswa isi null.
9. "d" ringkasan 1-2 kalimat (maks 300 karakter), "tg" ringkasan tenggat apa adanya dari teks.
9. Sasaran harus mahasiswa (D3/D4/S1/S2/S3) atau siswa SMA yang boleh ikut. Lomba/beasiswa khusus SD, SMP, atau keluarga (mis. lomba mewarnai anak) JANGAN diambil.
10. Kalau halaman membahas beberapa program sekaligus, ambil maksimal 3 yang paling jelas tanggal/tautannya.

Balas JSON: {"items":[{"n","j","t","k","b","o","d","tg","dl","op","u","jen","confidence","evidence":[{"field","quote"}]}]}
"op" = tanggal buka pendaftaran (YYYY-MM-DD) kalau ada, selain itu null.`;

export async function extractFromText({ text, url, sourceName, hint, model }) {
  const user = `URL SUMBER: ${url}
SUMBER: ${sourceName || "tidak diketahui"}
PETUNJUK DARI DAFTAR: ${hint || "-"}

TEKS HALAMAN (${text.length} karakter):
"""
${text.slice(0, 12000)}
"""`;

  const raw = await chat(
    [
      { role: "system", content: SYS },
      { role: "user", content: user },
    ],
    { maxTokens: 2600, ...(model ? { model } : {}) }
  );

  const parsed = extractJson(raw);
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  return items.map((it) => ({
    n: String(it.n || "").trim().slice(0, 180),
    j: it.j === "Beasiswa" ? "Beasiswa" : "Lomba",
    t: ["Kampus", "Nasional", "Internasional"].includes(it.t) ? it.t : "Nasional",
    b: String(it.b || "Umum").slice(0, 40),
    o: String(it.o || "").trim().slice(0, 180),
    d: String(it.d || "").trim().slice(0, 500),
    tg: String(it.tg || "").trim().slice(0, 300),
    dl: it.dl ? String(it.dl).slice(0, 10) : undefined,
    op: it.op ? String(it.op).slice(0, 10) : undefined,
    u: it.u ? String(it.u).slice(0, 500) : undefined,
    jen: it.jen ? String(it.jen).slice(0, 60) : undefined,
    k: it.j === "Lomba" && ["Akademik", "Nonakademik"].includes(it.k) ? it.k : undefined,
    confidence: Number(it.confidence || 0),
    evidence: Array.isArray(it.evidence)
      ? it.evidence.filter((e) => e && typeof e.quote === "string").map((e) => ({ field: String(e.field || ""), quote: e.quote.slice(0, 1000) }))
      : [],
    _fields: FIELDS,
  }));
}
