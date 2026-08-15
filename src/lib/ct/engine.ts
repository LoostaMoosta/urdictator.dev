import {
  CITIES,
  DIVISIONS,
  EVENT_LIBRARY,
  cityById,
  type City,
  type Division,
  type DivisionType,
  type NationalEvent,
  type ThreatLevel,
} from "./data";

/* Kalkulasi Garis Lengkung Rute Pasukan */
export function routePath(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  type: DivisionType,
) {
  const dx = toX - fromX;
  const dy = toY - fromY;

  if (type === "air-wing") {
    const lift = 100 + Math.min(80, Math.abs(dx) * 0.15);
    return `M ${fromX} ${fromY} C ${fromX + dx * 0.2} ${fromY - lift}, ${fromX + dx * 0.8} ${toY - lift}, ${toX} ${toY}`;
  }
  if (type === "navy") {
    // Angkatan laut mengambil jalur sedikit menjauh (pura-puranya mencari lautan)
    return `M ${fromX} ${fromY} C ${fromX + dx * 0.3} ${fromY + 50}, ${fromX + dx * 0.7} ${toY + 50}, ${toX} ${toY}`;
  }
  // Pasukan darat menarik garis lengkung efisien
  const mx = fromX + dx * 0.5 - dy * 0.1;
  const my = fromY + dy * 0.5 + dx * 0.1;
  return `M ${fromX} ${fromY} Q ${mx} ${my}, ${toX} ${toY}`;
}

export interface ResolvedDivision extends Division {
  originName: string;
  targetName: string;
  path: string;
  inCombat: boolean;
  statusText: string;
  threatModifier: number;
}

export interface GameState {
  divisions: ResolvedDivision[];
  cities: City[];
  globalThreat: ThreatLevel;
  activeEvents: NationalEvent[];
  kpis: {
    totalManpowerFielded: number;
    globalTension: number;
    industrialCapacity: number;
  };
}

export function computeGameState(activeEventIds: string[]): GameState {
  const activeEvents = EVENT_LIBRARY.filter((s) => activeEventIds.includes(s.id));

  let extraTension = 0;
  let industryMultiplier = 1.0;
  let manpowerBonus = 0;

  // Terapkan efek dari kebijakan aktif (Event Geopolitik)
  for (const ev of activeEvents) {
    if (ev.kind === "declare-war") extraTension += ev.magnitude;
    if (ev.kind === "border-skirmish") extraTension += ev.magnitude;
    if (ev.kind === "industrial-boom") industryMultiplier += ev.magnitude / 100;
    if (ev.kind === "mobilization") manpowerBonus += ev.magnitude * 1_000_000;
  }

  // Selesaikan resolusi divisi (Kalkulasi jika pasukan menabrak musuh di rute)
  let totalFielded = 0;

  const resolvedDivisions: ResolvedDivision[] = DIVISIONS.map((d) => {
    const origin = cityById(d.originCityId);
    const target = cityById(d.targetCityId);

    // Asumsi manpower 1 divisi = 10,000 sampai 15,000 tentara (tergantung strength)
    const divisionManpower = Math.round(12000 * (d.strength / 100));
    totalFielded += divisionManpower;

    // Tentukan apakah divisi ini terlibat perang gara-gara event
    const isAtWar = activeEvents.some(
      (e) => e.kind === "declare-war" || e.kind === "border-skirmish",
    );
    // Jika perang aktif dan divisi tidak berada di markas, anggap masuk pertempuran
    const inCombat = isAtWar && d.stance === "moving" && d.progress > 0.4;

    // Saat bertempur, organisasi menurun drastis
    const currentOrg = inCombat ? Math.max(0, d.organization - 30) : d.organization;

    let statusText =
      d.stance === "entrenched" ? `Siaga di ${origin.name}` : `Menuju ${target.name}`;
    if (inCombat) statusText = `TERLIBAT KONTAK TEMPUR (${currentOrg}% ORG)`;

    return {
      ...d,
      originName: origin.name,
      targetName: target.name,
      path: routePath(origin.x, origin.y, target.x, target.y, d.type),
      organization: currentOrg,
      inCombat,
      statusText,
      threatModifier: inCombat ? 0.8 : 0,
    };
  });

  const tensionBase = 15;
  const computedTension = Math.min(100, tensionBase + extraTension);

  const globalThreat: ThreatLevel =
    computedTension >= 75 ? "at-war" : computedTension >= 30 ? "tension" : "peaceful";

  // Total Kapasitas Industri (IC)
  const baseIndustry = CITIES.reduce((acc, c) => acc + c.infrastructure, 0);
  const totalIndustry = Math.round(baseIndustry * industryMultiplier);

  // Total Manpower yang dialokasikan di seluruh kota + bonus mobilisasi
  const baseManpower = CITIES.reduce((acc, c) => acc + c.manpowerReserve, 0);

  return {
    divisions: resolvedDivisions,
    cities: CITIES,
    globalThreat,
    activeEvents,
    kpis: {
      totalManpowerFielded: totalFielded + manpowerBonus + baseManpower, // Simulasi militer skala penuh
      globalTension: computedTension,
      industrialCapacity: totalIndustry,
    },
  };
}

export const GAME_STATE_BASELINE = computeGameState([]);
