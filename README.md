# Katalog Lomba & Beasiswa TI

Aplikasi web statis berbasis Vite dan TypeScript, disiapkan untuk deployment ke Vercel.

## Menjalankan di komputer

Pastikan Node.js versi 20 atau lebih baru sudah terpasang, lalu jalankan dari folder proyek:

```powershell
npm install
npm run dev
```

Buka alamat lokal yang dicetak Vite di terminal. Untuk menguji hasil produksi:

```powershell
npm run build
npm run preview
```

## Status otomatis dan arsip

Status pendaftaran dihitung sendiri dari tanggal, tanpa admin mengubahnya manual:

- Tanggal dibaca dengan zona waktu WIB (Asia/Jakarta). Tenggat bertanggal saja (`2027-02-15`) berarti berlaku sampai 23.59.59 WIB di hari itu.
- Lewat tenggat → status otomatis `Sudah ditutup` dan tombol pendaftaran berubah menjadi nonaktif (`Pendaftaran ditutup`).
- Beranda hanya menampilkan info yang belum lewat tenggat; statistiknya ikut menghitung info aktif saja.
- Info yang sudah lewat dipindahkan ke halaman **Arsip** (`#arsip`), dikelompokkan per tahun dan bisa disaring per jenis.
- Pengecekan ulang berjalan tiap menit dan setiap tab kembali aktif, jadi status ikut berubah tanpa reload.
- Di halaman Cari, info kedaluwarsa masih bisa ditemukan (misalnya untuk melihat periode lalu), tetapi tombol pendaftarannya nonaktif.

Untuk menambah info baru cukup isi `nama`, `dl` (tenggat), dan untuk lomba `k` (kategori) di `DATA` pada `src/app.ts`. Info yang belum punya `dl` diberi status `Tanggal belum ada`: tetap tampil di katalog, tetapi tidak bisa masuk arsip dan tidak dihitung sebagai "aktif" pada statistik beranda. Jumlah info tanpa tanggal ditampilkan apa adanya di beranda.

## Kategori lomba

Setiap entri ber-`j: "Lomba"` wajib punya `k`, yaitu `"Akademik"` atau `"Nonakademik"`:

- **Akademik** — kompetisi berbasis keilmuan, riset, atau karya tulis (PIMNAS, PKM, GEMASTIK, KDMI, IISE).
- **Nonakademik** — kompetisi keterampilan, kewirausahaan, atau minat-bakat (KMI Expo, Hult Prize, Google Solution Challenge, Shell Eco-marathon).

Kategori tampil sebagai label di kartu, baris, dan halaman detail, serta bisa disaring lewat tab **Semua kategori / Akademik / Nonakademik** di halaman Info Lomba. Beasiswa tidak punya kategori. Saat `npm run dev`, konsol memberi peringatan bila ada lomba yang lupa diberi `k`.

## Contact person

Footer punya blok **CONTACT PERSON** yang datanya diatur di objek `CP` pada `src/app.ts` (nama, jabatan/divisi, `ig`, `email`). Email dirender sebagai tautan `mailto:` dan Instagram sebagai tautan keluar. Nomor telepon sengaja tidak dicantumkan karena belum ada data resmi; isi `nama` dengan nama pengurus yang bisa dihubungi.

## Nama divisi

Tampilan memakai nama resmi **Pengembangan Wawasan Keilmuan FT-UMB** (konstanta `DIV`), bukan singkatan. Nama itu muncul di navbar, hero beranda, footer, serta metadata `index.html` dan `manifest.webmanifest`. Singkatan lama hanya tersimpan di komentar kode dan ID internal berkas `.ics`, tidak pernah dirender ke pengguna.

## Halaman detail

Setiap info punya halaman sendiri di `#item/<slug>` (misalnya `#item/gemastik`), dibuat dari `slugOf(nama)`. Tautan ini bisa dibagikan; judul kartu dan baris mengarah ke sini, sedangkan tombol "Buka situs resmi" tetap menuju portal penyelenggara. Isi halaman: ringkasan, jadwal, syarat indikatif dari `REQ`, info terkait, tombol simpan, serta ekspor kalender.

## Ekspor kalender

Untuk info yang punya `dl`, halaman detail menyediakan:

- **Ekspor .ics** — berkas `VEVENT` dengan tenggat WIB yang bisa diimpor ke kalender mana pun.
- **Google Calendar** — tautan `action=TEMPLATE` siap tambah acara.

Mulai acara diambil dari `op` bila ada; kalau tidak, sehari sebelum tenggat.

## PWA dan offline

`public/manifest.webmanifest` dan `public/sw.js` didaftarkan saat build produksi (`import.meta.env.PROD`). Aset disimpan cache-first, navigasi network-first dengan fallback ke `index.html`, jadi katalog tetap terbuka saat sinyal jelek. Naikkan angka `CACHE` di `sw.js` setiap deploy agar aset lama dibuang.

## Deploy ke Vercel

1. Push folder proyek ini ke repository GitHub.
2. Import repository tersebut dari dashboard Vercel.
3. Vercel membaca konfigurasi `vercel.json`; build command `npm run build` dan output `dist` sudah disetel.
4. Deploy dan bagikan URL `.vercel.app` yang diberikan.

## Sebelum publikasi

Ganti `public/hmti.svg` dan `public/umb.svg` dengan logo resmi yang boleh digunakan. Daftar info tersimpan (tombol Simpan) hanya ada di local storage browser pengguna, bukan di server. Tanggal dan syarat lomba/beasiswa perlu diperiksa terhadap situs penyelenggara sebelum digunakan sebagai informasi resmi.
