import { project } from "./geo";

export type ThreatLevel = "peaceful" | "tension" | "at-war";
export type Ideology = "democracy" | "fascism" | "communism" | "non-aligned";
export type DivisionType = "infantry" | "armor" | "navy" | "air-wing";
export type CombatStance = "entrenched" | "moving" | "in-combat" | "retreating";

export interface City {
  id: string;
  code: string; // Misal: BER, LON, MOS
  name: string;
  country: string; // ISO Code
  x: number;
  y: number;
  infrastructure: number; // IC Capacity
  manpowerReserve: number;
}

export interface Faction {
  id: string;
  name: string;
  ideology: Ideology;
  stability: number; // 0..1
  warSupport: number; // 0..1
}

export interface Division {
  id: string;
  factionId: string;
  commander: string;
  type: DivisionType;
  originCityId: string;
  targetCityId: string;

  // Stats pertempuran
  strength: number; // 0..100 (Hitpoints)
  organization: number; // 0..100 (Morale/Stamina)
  speed: number; // Berapa hari untuk sampai tujuan

  // State pergerakan
  progress: number; // 0..1 (Posisi fisik antara origin & target)
  stance: CombatStance;
  daysInTransit: number;
  etaDays: number;
}

export interface NationalEvent {
  id: string;
  label: string;
  detail: string;
  kind: "declare-war" | "border-skirmish" | "industrial-boom" | "mobilization" | "propaganda";
  targetId: string; // Target negara/faksi
  magnitude: number;
  durationInDays?: number;
}

/* ---------- Data Bebas Statis / Seeded ---------- */

// Kita memposisikan kota-kota besar di wilayah proyeksi utama kita (Eropa/Timur Tengah)
export const CITIES: City[] = [
  {
    id: "ber",
    code: "BER",
    name: "Berlin",
    country: "DE",
    ...project(13.4, 52.52),
    infrastructure: 85,
    manpowerReserve: 2500000,
  },
  {
    id: "lon",
    code: "LON",
    name: "London",
    country: "GB",
    ...project(-0.12, 51.5),
    infrastructure: 75,
    manpowerReserve: 1800000,
  },
  {
    id: "mos",
    code: "MOS",
    name: "Moskow",
    country: "SU",
    ...project(37.6, 55.75),
    infrastructure: 60,
    manpowerReserve: 5500000,
  },
  {
    id: "par",
    code: "PAR",
    name: "Paris",
    country: "FR",
    ...project(2.35, 48.85),
    infrastructure: 70,
    manpowerReserve: 2000000,
  },
  {
    id: "rom",
    code: "ROM",
    name: "Roma",
    country: "IT",
    ...project(12.49, 41.9),
    infrastructure: 55,
    manpowerReserve: 1200000,
  },
  {
    id: "war",
    code: "WAR",
    name: "Warsawa",
    country: "PL",
    ...project(21.01, 52.22),
    infrastructure: 30,
    manpowerReserve: 800000,
  },
  {
    id: "ist",
    code: "IST",
    name: "Istanbul",
    country: "TR",
    ...project(28.97, 41.0),
    infrastructure: 25,
    manpowerReserve: 950000,
  },
];

export const FACTIONS: Faction[] = [
  { id: "AXIS", name: "Axis Powers", ideology: "fascism", stability: 0.8, warSupport: 0.9 },
  { id: "ALLIES", name: "Allied Forces", ideology: "democracy", stability: 0.85, warSupport: 0.6 },
  { id: "COMINTERN", name: "Comintern", ideology: "communism", stability: 0.7, warSupport: 0.75 },
];

export const cityById = (id: string) => CITIES.find((c) => c.id === id)!;
export const factionById = (id: string) => FACTIONS.find((f) => f.id === id)!;

/* ---------- Pembuatan Pasukan Acak Deterministik ---------- */
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(19390901); // Seed: Tanggal invasi Polandia WW2
const between = (a: number, b: number) => a + rnd() * (b - a);
const pick = <T>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
const round = (n: number, d = 0) => Number(n.toFixed(d));

const COMMANDERS = [
  "Guderian",
  "Rommel",
  "Patton",
  "Montgomery",
  "Zhukov",
  "Rokossovsky",
  "MacArthur",
  "Yamamoto",
];

export const DIVISIONS: Division[] = Array.from({ length: 45 }, (_, i) => {
  const origin = pick(CITIES);
  let target = pick(CITIES);
  while (target.id === origin.id) target = pick(CITIES); // Pastikan bukan kota yang sama

  const typeChance = rnd();
  const type =
    typeChance > 0.8
      ? "air-wing"
      : typeChance > 0.6
        ? "navy"
        : typeChance > 0.4
          ? "armor"
          : "infantry";
  const inTransit = rnd() > 0.3; // 70% pasukan sedang bergerak

  return {
    id: `DIV-${101 + i}`,
    factionId: pick(FACTIONS).id,
    commander: pick(COMMANDERS),
    type: type,
    originCityId: origin.id,
    targetCityId: target.id,
    strength: round(between(60, 100)),
    organization: round(between(40, 100)),
    speed: type === "armor" ? 3 : type === "air-wing" ? 8 : 1,
    progress: inTransit ? round(between(0.1, 0.9), 3) : 0,
    stance: inTransit ? "moving" : "entrenched",
    daysInTransit: inTransit ? round(between(2, 14)) : 0,
    etaDays: round(between(4, 21)),
  };
});

/* ---------- Event Geopolitik (Simulator Actions) ---------- */
export const EVENT_LIBRARY: NationalEvent[] = [
  {
    id: "ev-mobilize",
    label: "Mobilisasi Total",
    detail: "+2 Juta Manpower, Industri Beralih ke Produksi Senjata",
    kind: "mobilization",
    targetId: "self",
    magnitude: 1.5,
  },
  {
    id: "ev-danzig",
    label: "Tuntut Danzig atau Perang",
    detail: "Meningkatkan Tensi Global Ekstrem (+40%)",
    kind: "declare-war",
    targetId: "PL",
    magnitude: 40,
  },
  {
    id: "ev-border",
    label: "Bentrokan Perbatasan",
    detail: "Kerusakan Divisi Ringan, Tensi Sedang",
    kind: "border-skirmish",
    targetId: "SU",
    magnitude: 15,
  },
  {
    id: "ev-industry",
    label: "Rencana Lima Tahun",
    detail: "Kapasitas Industri +30%, Stabilitas Sementara Turun",
    kind: "industrial-boom",
    targetId: "self",
    magnitude: 30,
  },
];
