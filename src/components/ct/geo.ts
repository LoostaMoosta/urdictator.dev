// src/components/ct/geo.ts

/**
 * Modul utilitas untuk Proyeksi Geospasial (Geospatial Projection)
 * Menggunakan Web Mercator Projection standar (EPSG:3857) yang umum digunakan
 * pada Google Maps dan Leaflet.
 */

// Ukuran referensi kanvas layar SVG (Sesuai dengan viewBox 1000x620 di WarRoomMap.tsx)
export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 620;

/**
 * Mengubah titik koordinat Longitude dan Latitude nyata
 * menjadi koordinat piksel (X, Y) untuk digambar pada Peta SVG.
 *
 * @param lng Longitude (Garis Bujur) dari -180 (Barat) hingga 180 (Timur)
 * @param lat Latitude (Garis Lintang) dari -90 (Selatan) hingga 90 (Utara)
 * @returns Object titik { x, y }
 */
export function project(lng: number, lat: number): { x: number; y: number } {
  // 1. Batasi latitude ekstrem (Mencegah nilai infinity pada kutub utara/selatan di proyeksi Mercator)
  const MAX_LAT = 85.0511287798;
  const clampedLat = Math.max(Math.min(lat, MAX_LAT), -MAX_LAT);

  // 2. Konversi Lintang ke Radian
  const latRad = (clampedLat * Math.PI) / 180;

  // 3. Hitung Proyeksi X (Bujur bersifat linier membentang di sumbu X)
  const x = (lng + 180) * (MAP_WIDTH / 360);

  // 4. Hitung Proyeksi Y (Rumus Web Mercator untuk meregangkan lintang ke arah kutub)
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));

  // Kami sesuaikan konstanta di sini agar peta pas di tengah layar berukuran 620px
  const y = MAP_HEIGHT / 2 - (MAP_WIDTH * mercN) / (2 * Math.PI);

  // Kembalikan hasil dengan pembulatan 2 angka desimal agar performa render SVG lebih ringan
  return {
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
  };
}

/**
 * REVERSE PROJECTION (Opsional namun sangat berguna untuk Game RTS):
 * Mengubah koordinat klik mouse/piksel (X, Y) kembali menjadi koordinat dunia nyata (Longitude, Latitude).
 * Sangat membantu jika nantinya Anda membuat fitur "Klik negara untuk menyerang/menaruh server".
 *
 * @param x Posisi kursor/koordinat X di kanvas SVG
 * @param y Posisi kursor/koordinat Y di kanvas SVG
 * @returns Object { lng, lat }
 */
export function unproject(x: number, y: number): { lng: number; lat: number } {
  // Hitung kembali Lintang
  const lng = (x * 360) / MAP_WIDTH - 180;

  // Hitung kembali Bujur dari rumus Mercator yang dibalik (Inverse Mercator)
  const mercN = ((MAP_HEIGHT / 2 - y) * (2 * Math.PI)) / MAP_WIDTH;
  const latRad = 2 * Math.atan(Math.exp(mercN)) - Math.PI / 2;
  const lat = (latRad * 180) / Math.PI;

  return {
    lng: Number(lng.toFixed(4)),
    lat: Number(lat.toFixed(4)),
  };
}

/**
 * Menghitung jarak kasar antara dua koordinat menggunakan formula Haversine.
 * Bisa digunakan untuk menghitung delay (ping/latency) serangan siber antar benua.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius bumi dalam kilometer
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
