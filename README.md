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

- Tanggal dibaca dengan zona waktu WIB (Asia/Jakarta). Tenggat bertanggal saja (`2026-08-14`) berarti berlaku sampai 23.59.59 WIB di hari itu.
- Lewat tenggat → status otomatis `Sudah ditutup` dan tombol pendaftaran berubah menjadi nonaktif (`Pendaftaran ditutup`).
- Beranda hanya menampilkan info yang belum lewat tenggat; statistiknya ikut menghitung info aktif saja.
- Info yang sudah lewat dipindahkan ke halaman **Arsip** (`#arsip`), dikelompokkan per tahun dan bisa disaring per jenis.
- Pengecekan ulang berjalan tiap menit dan setiap tab kembali aktif, jadi status ikut berubah tanpa reload.
- Di halaman Cari, info kedaluwarsa masih bisa ditemukan (misalnya untuk melihat periode lalu), tetapi tombol pendaftarannya nonaktif.

Untuk menambah info baru cukup isi `nama`, `dl` (tenggat) di `DATA` pada `src/app.ts`.

## Deploy ke Vercel

1. Push folder proyek ini ke repository GitHub.
2. Import repository tersebut dari dashboard Vercel.
3. Vercel membaca konfigurasi `vercel.json`; build command `npm run build` dan output `dist` sudah disetel.
4. Deploy dan bagikan URL `.vercel.app` yang diberikan.

## Sebelum publikasi

Ganti `public/hmti.svg` dan `public/umb.svg` dengan logo resmi yang boleh digunakan. Daftar info tersimpan (tombol Simpan) hanya ada di local storage browser pengguna, bukan di server. Tanggal dan syarat lomba/beasiswa perlu diperiksa terhadap situs penyelenggara sebelum digunakan sebagai informasi resmi.
