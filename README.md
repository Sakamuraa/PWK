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

## Deploy ke Vercel

1. Push folder proyek ini ke repository GitHub.
2. Import repository tersebut dari dashboard Vercel.
3. Vercel membaca konfigurasi `vercel.json`; build command `npm run build` dan output `dist` sudah disetel.
4. Deploy dan bagikan URL `.vercel.app` yang diberikan.

## Sebelum publikasi

Ganti `public/hmti.svg` dan `public/umb.svg` dengan logo resmi yang boleh digunakan. Data profil dan daftar simpanan aplikasi tersimpan di local storage browser pengguna, bukan di server. Tanggal dan syarat lomba/beasiswa perlu diperiksa terhadap situs penyelenggara sebelum digunakan sebagai informasi resmi.
