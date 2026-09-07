import { project } from "./geo";

export type ThreatLevel = "secure" | "scanned" | "breached";
export type AssetType = "botnet" | "zero-day" | "ddos-swarm" | "apt-module";
export type CyberStance = "dormant" | "infiltrating" | "executing";

export interface ServerHub {
  id: string;
  code: string;
  name: string;
  country: string;
  x: number;
  y: number;
  computePower: number; // PFLOPS
  bandwidthCap: number; // Tbps
}

export interface Faction {
  id: string;
  name: string;
  type: "state-sponsored" | "hacktivist" | "syndicate" | "corp";
}

export interface CyberAsset {
  id: string;
  factionId: string;
  operator: string;
  type: AssetType;
  originHubId: string;
  targetHubId: string;

  payload: number; // Kekuatan serangan (0..100)
  stealth: number; // Kemampuan bersembunyi dari firewall (0..100)
  speed: number;

  progress: number; // Posisi di jaringan global (0..1)
  stance: CyberStance;
}

export interface CyberEvent {
  id: string;
  label: string;
  detail: string;
  kind: "ransomware" | "infrastructure-hack" | "zero-day-leak" | "psyops";
  targetId: string;
  magnitude: number;
}

/* ---------- Data Server Global (Cyber Hubs) ---------- */

export const SERVER_HUBS: ServerHub[] = [
  {
    id: "dc-us",
    code: "US-CYBERCOM",
    name: "Fort Meade",
    country: "US",
    ...project(-76.74, 39.1),
    computePower: 950,
    bandwidthCap: 15000,
  },
  {
    id: "dc-ru",
    code: "GRU-CENTER",
    name: "Moscow Data Center",
    country: "RU",
    ...project(37.6, 55.75),
    computePower: 720,
    bandwidthCap: 8000,
  },
  {
    id: "dc-cn",
    code: "PLA-UNIT",
    name: "Beijing Hub",
    country: "CN",
    ...project(116.4, 39.9),
    computePower: 880,
    bandwidthCap: 12000,
  },
  {
    id: "dc-uk",
    code: "GCHQ",
    name: "Cheltenham",
    country: "UK",
    ...project(-2.07, 51.9),
    computePower: 650,
    bandwidthCap: 9000,
  },
  {
    id: "dc-il",
    code: "UNIT-8200",
    name: "Tel Aviv",
    country: "IL",
    ...project(34.78, 32.08),
    computePower: 500,
    bandwidthCap: 6000,
  },
  {
    id: "dc-sg",
    code: "APAC-NODE",
    name: "Singapore",
    country: "SG",
    ...project(103.81, 1.35),
    computePower: 450,
    bandwidthCap: 10000,
  },
  {
    id: "dc-sv",
    code: "SILICON-VAL",
    name: "San Jose",
    country: "US",
    ...project(-121.88, 37.33),
    computePower: 1200,
    bandwidthCap: 20000,
  },
];

export const FACTIONS: Faction[] = [
  { id: "FEYES", name: "Five Eyes Alliance", type: "state-sponsored" },
  { id: "APT28", name: "Fancy Bear", type: "state-sponsored" },
  { id: "LAZARUS", name: "Lazarus Group", type: "syndicate" },
  { id: "ANON", name: "Anonymous", type: "hacktivist" },
];

export const hubById = (id: string) => SERVER_HUBS.find((c) => c.id === id)!;

/* ---------- Pembuatan Aset Siber Acak Deterministik ---------- */
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20420101); // Seed: Future Cyber War Era
const between = (a: number, b: number) => a + rnd() * (b - a);
const pick = <T>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
export const round = (n: number, d = 0) => Number(n.toFixed(d));

const OPERATORS = ["Ghost", "Cipher", "Null", "Root", "Overlord", "Void", "Phreak", "Morpheus"];

export const CYBER_ASSETS: CyberAsset[] = Array.from({ length: 60 }, (_, _i) => {
  const origin = pick(SERVER_HUBS);
  let target = pick(SERVER_HUBS);
  while (target.id === origin.id) target = pick(SERVER_HUBS);

  const typeChance = rnd();
  const type: AssetType =
    typeChance > 0.85
      ? "zero-day"
      : typeChance > 0.6
        ? "apt-module"
        : typeChance > 0.3
          ? "ddos-swarm"
          : "botnet";
  const inTransit = rnd() > 0.2; // 80% aset sedang bergerak di jaringan

  return {
    id: `0x${Math.floor(rnd() * 16777215)
      .toString(16)
      .toUpperCase()
      .padStart(6, "0")}`,
    factionId: pick(FACTIONS).id,
    operator: pick(OPERATORS),
    type: type,
    originHubId: origin.id,
    targetHubId: target.id,
    payload: round(between(40, 100)),
    stealth: round(between(20, 100)),
    speed: type === "zero-day" ? 10 : type === "ddos-swarm" ? 2 : 5,
    progress: inTransit ? round(between(0.05, 0.95), 3) : 0,
    stance: inTransit ? (rnd() > 0.7 ? "executing" : "infiltrating") : "dormant",
  };
});

/* ---------- Event Geopolitik & Operasi Siber ---------- */
export const EVENT_LIBRARY: CyberEvent[] = [
  {
    id: "ev-grid",
    label: "Peretasan Infrastruktur Listrik",
    detail: "Melumpuhkan jaringan listrik nasional, Tensi Global +30%",
    kind: "infrastructure-hack",
    targetId: "US",
    magnitude: 30,
  },
  {
    id: "ev-ransomware",
    label: "WannaCry 3.0 Outbreak",
    detail: "Menyerang sistem perbankan global, mengunci data",
    kind: "ransomware",
    targetId: "GLOBAL",
    magnitude: 45,
  },
  {
    id: "ev-cable",
    label: "Sabotase Kabel Bawah Laut",
    detail: "Kapasitas Bandwidth Global -40%",
    kind: "infrastructure-hack",
    targetId: "ATLANTIC",
    magnitude: 40,
  },
  {
    id: "ev-leak",
    label: "Kebocoran NSA Zero-Day",
    detail: "Memperkuat semua serangan APT (+20 Payload)",
    kind: "zero-day-leak",
    targetId: "ALL",
    magnitude: 20,
  },
];

/* ---------- Ekspor Konstanta UI Peta (Mencegah Fast Refresh Error) ---------- */
export const ASSET_MODES: AssetType[] = ["botnet", "ddos-swarm", "apt-module", "zero-day"];

export const MODE_LABEL: Record<AssetType, string> = {
  botnet: "Botnet Node",
  "ddos-swarm": "DDoS Swarm",
  "apt-module": "APT Script",
  "zero-day": "0-Day Exploit",
};

export const MODE_SPEC: Record<
  AssetType,
  { dash: string; speed: number; marker: "dot" | "diamond" | "square" | "triangle" }
> = {
  botnet: { dash: "1 4", speed: 0.05, marker: "dot" },
  "ddos-swarm": { dash: "2 2", speed: 0.08, marker: "triangle" },
  "apt-module": { dash: "8 4", speed: 0.03, marker: "square" },
  "zero-day": { dash: "15 5", speed: 0.1, marker: "diamond" },
};
