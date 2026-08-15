import { geoMercator, geoPath, type GeoProjection } from "d3-geo";
import { feature, mesh } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import countriesTopo from "world-atlas/countries-110m.json";

export const MAP_W = 1000;
export const MAP_H = 620;

// Kita menggeser window agar fokus pada daratan Eurasia, Afrika, dan sebagian benua Amerika (Eropa/Asia Centric)
const NW: [number, number] = [-20, 70]; // Kiri atas (Kira-kira eslandia/samudra atlantik utara)
const SE: [number, number] = [150, -10]; // Kanan bawah (Australia bagian utara / Samudera pasifik)

function buildProjection(): GeoProjection {
  // Proyeksi mercator standar, centering longitude 0 (Greenwich)
  const p = geoMercator().rotate([0, 0]).scale(1).translate([0, 0]);
  const a = p(NW)!;
  const b = p(SE)!;
  const k = Math.min(MAP_W / (b[0] - a[0]), MAP_H / (b[1] - a[1]));
  const cx = (a[0] + b[0]) / 2;
  const cy = (a[1] + b[1]) / 2;
  return p.scale(k).translate([MAP_W / 2 - cx * k, MAP_H / 2 - cy * k]);
}

export const projection = buildProjection();
const pathGen = geoPath(projection);

export function project(lon: number, lat: number): { x: number; y: number } {
  const [x, y] = projection([lon, lat]) ?? [0, 0];
  return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
}

const countries = countriesTopo as unknown as Topology<{
  countries: GeometryCollection;
}>;

export const LAND_PATHS: string[] = feature(countries, countries.objects.countries)
  .features.map((f) => pathGen(f))
  .filter((d): d is string => Boolean(d));

export const COUNTRY_BORDERS: string =
  pathGen(mesh(countries, countries.objects.countries, (a, b) => a !== b)) ?? "";

export const GRATICULE: string[] = [
  ...[20, 30, 40, 50, 60].map((lat) => {
    const pts: string[] = [];
    for (let lon = -180; lon <= 180; lon += 4) {
      const { x, y } = project(lon, lat);
      pts.push(`${x} ${y}`);
    }
    return `M ${pts.join(" L ")}`;
  }),
  ...[-90, -45, 0, 45, 90, 135].map((lon) => {
    const pts: string[] = [];
    for (let lat = -60; lat <= 75; lat += 2) {
      const { x, y } = project(lon, lat);
      pts.push(`${x} ${y}`);
    }
    return `M ${pts.join(" L ")}`;
  }),
];
