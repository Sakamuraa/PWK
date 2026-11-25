# API katalog — auto-fetch, auto-filter, auto-publish

Server Node.js kecil yang menyalakan tiga hal sekaligus: situs PWK (hasil build Vite di `dist/`), API katalog, dan pipeline yang mencari lomba/beasiswa baru, memfilter, lalu menerbitkannya.

Tidak ada dependensi layanan luar selain LLM (router OpenAI-compatible). Database memakai SQLite bawaan Node (`node:sqlite`), file di `/data/workspace/pwk-data/pwk.db`.

## Menjalankan

```bash
node server/index.mjs          # API + situs di http://127.0.0.1:8098
```

Sebagai layanan: `systemctl --user status pwk-katalog` (unit di `~/.config/systemd/user/pwk-katalog.service`).

Konfigurasi dibaca dari `/data/workspace/pwk-data/env` (mode 600). Daftar kunci
yang dipakai ada di `.env.example` di root repo; salin lalu isi bagian rahasianya
(`CRON_SECRET`, `ADMIN_TOKEN`, `DISCOVERY_LLM_KEY`) di server, jangan di repo.

```
CRON_SECRET=...                # Bearer untuk cron-job.org
ADMIN_TOKEN=...                # Bearer untuk review & tambah URL manual
DISCOVERY_LLM_URL=https://doomps.web.id/v1/chat/completions
DISCOVERY_LLM_KEY=...
DISCOVERY_LLM_MODEL=hmti-v1.0
DISCOVERY_VISION_MODEL=hmti-v1.0vl   # OCR poster / IG
DISCOVERY_ENABLED=1            # 0 = kill switch
PWK_PORT=8098
MAX_ITEMS_PER_RUN=12
STEP_BUDGET_MS=210000
```

## Endpoint

| Endpoint | Metode | Auth | Keterangan |
|---|---|---|---|
| `/api/katalog` | GET | – | item `published`, filter `?j=Lomba&t=Nasional&q=...`, cache 5 menit |
| `/api/katalog/:slug` | GET | – | detail + `evidence` (kutipan sumber) + `source_url` |
| `/api/meta/sources` | GET | – | jumlah per status + sumber terdaftar + waktu ambil terakhir |
| `/api/cron/discover` | POST | Bearer `CRON_SECRET` | memulai satu putaran pipeline (balas `202` seketika) |
| `/api/cron/status` | GET | Bearer | status run, jumlah item, error terakhir |
| `/api/admin/review` | GET/POST | Bearer `ADMIN_TOKEN` | antrean `draft`; `{"slug":..,"action":"approve"\|"reject"}` |
| `/api/admin/refresh` | POST | Bearer `ADMIN_TOKEN` | `{"url":..}` untuk poster IG/Drive, atau tanpa body untuk memicu run |
| `/api/laporan` | POST | – | `{"slug":..,"pesan":..}`, batas 5/jam per IP |

Pemicu dari cron-job.org: satu job, `POST https://hmti-mercubuana.web.id/api/cron/discover`, header `Authorization: Bearer <CRON_SECRET>`, jadwal tiap 5 menit. Endpoint menjawab di bawah 1 detik, jadi batas 30 detik cron-job.org tidak pernah tersentuh; kerja berjalan di latar dan dikunci supaya tidak ada dua run bersamaan.

## Pipeline

`lib/pipeline.mjs`, empat langkah:

1. **discover** — membaca `server/sources.json` (RSS dan halaman listing), menaruh URL kandidat di `pwk_candidates`. Interval per sumber diatur `intervalHours`.
2. **fetch** — ambil halaman (HTML, PDF, gambar, post IG, poster Drive), hash isi, simpan teks di `pwk_pages`. Halaman yang isinya tidak berubah tidak masuk LLM.
3. **extract** — LLM mengekstrak item + kutipan bukti, `validate.mjs` memeriksa: kutipan benar-benar ada di teks, `confidence` sesuai tier, tanggal valid dan belum lewat, tautan pendaftaran muncul di sumber, bukan duplikat, sasaran bukan lomba anak SD.
4. **publish** — aturan per tingkat sumber:
   - **T1** (domain `ac.id`/`go.id`/penyelenggara): `confidence ≥ 90` → `published`
   - **T2** (agregat, media): `confidence ≥ 92` → `published`
   - **T3** (post IG, poster Drive/gambar): `confidence ≥ 95` **dan** ada sumber pembanding → `published`, selain itu `draft` untuk direview
   - tenggat lewat → `expired`, masuk arsip otomatis

Batas: 12 item per run, 6 batch fetch per run, anggaran 210 detik, plus jaring pengaman yang melepas lock kalau satu panggilan jaringan menggantung.

## Menambah sumber

Edit `server/sources.json`:

```json
{
  "name": "Nama sumber",
  "url": "https://contoh.ac.id/feed/",
  "type": "rss",            // atau "listing"
  "j": "Lomba",             // atau "Beasiswa"
  "tier": "T1",
  "intervalHours": 6,
  "linkPattern": "(lomba|beasiswa|pendaftaran)"   // hanya untuk listing
}
```

Untuk sumber yang tidak punya feed (post IG, poster di Drive), kirim URL-nya ke `/api/admin/refresh`; pipeline akan meng-OCR dan memasukkannya sebagai T3.

## Skema data

`pwk_katalog` (satu baris per item, `payload` JSON siap dipakai frontend), `pwk_pages` (cache teks + hash), `pwk_candidates` (antrean URL), `pwk_runs` (audit tiap putaran), `pwk_laporan` (laporan pengguna), `pwk_state` (lock dan waktu ambil per sumber).

Frontend mengambil `/api/katalog` saat boot; kalau API mati, `DATA` yang dibundel di `src/app.ts` tetap dipakai sehingga situs dan PWA tidak ikut mati.
