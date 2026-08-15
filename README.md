# Simulator Pengiriman & Logistik (Meridian Freight)

Aplikasi web simulasi rantai pasok: peta jaringan pengiriman masuk, KPI (ketepatan waktu kirim,
kas jatuh tempo, biaya sampai tujuan, eksepsi terbuka), dan simulator gangguan
(keterlambatan pelabuhan, pemasok berhenti, lonjakan permintaan, tarif impor, langkah pemulihan).

Seluruh antarmuka menggunakan Bahasa Indonesia.

## Teknologi

- React 19 + TypeScript
- TanStack Start (TanStack Router) — routing berbasis file di `src/routes`
- Vite 7 sebagai build tool
- Tailwind CSS v4 (`src/styles.css`)

## Menjalankan di VS Code

1. Pasang **Node.js 20+** (https://nodejs.org) dan **VS Code**.
2. Unduh kode: di Lovable klik **GitHub → Connect / Export**, lalu clone:
   ```bash
   git clone <url-repo-anda>
   cd <nama-folder>
   ```
3. Buka folder di VS Code: `File → Open Folder`.
4. Buka Terminal (`Ctrl + ~`) lalu jalankan:
   ```bash
   npm install
   npm run dev
   ```
5. Buka http://localhost:8080 di browser.

### Perintah lain

| Perintah          | Fungsi                              |
| ----------------- | ----------------------------------- |
| `npm run dev`     | Mode pengembangan (hot reload)      |
| `npm run build`   | Build produksi                      |
| `npm run preview` | Pratinjau hasil build               |
| `npm run lint`    | Cek kualitas kode                   |

### Ekstensi VS Code yang disarankan

- ESLint
- Prettier - Code formatter
- Tailwind CSS IntelliSense

## Struktur kode

```
src/
  routes/
    __root.tsx        # Kerangka HTML, metadata, provider global
    index.tsx         # Halaman utama (KPI + peta + simulator)
  components/ct/
    AppShell.tsx      # Header, status jaringan, footer
    KpiStrip.tsx      # Empat kartu KPI
    NetworkMap.tsx    # Peta SVG jaringan pengiriman
    Simulator.tsx     # Panel skenario gangguan & pemulihan
    ControlProvider.tsx # State global simulasi
  lib/ct/
    data.ts           # Data demo: pelabuhan, gudang, pemasok, skenario
    engine.ts         # Mesin perhitungan dampak & KPI
    geo.ts, format.ts # Proyeksi peta & format angka
```

## Mengganti data dengan data Anda sendiri

- Edit `src/lib/ct/data.ts` untuk mengganti daftar pelabuhan, gudang/DC, pemasok, dan skenario.
- Koordinat memakai `project(lon, lat)` dari `src/lib/ct/geo.ts`.
- Rumus KPI ada di `src/lib/ct/engine.ts` (fungsi `computeState`).

> Catatan: dataset saat ini adalah data demo fiktif (seed 20260723).
