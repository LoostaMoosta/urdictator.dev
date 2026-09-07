/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useState, useMemo, type ReactNode } from "react";
import {
  SERVER_HUBS,
  CYBER_ASSETS,
  EVENT_LIBRARY,
  hubById,
  type ServerHub,
  type CyberAsset,
  type AssetType,
  type CyberEvent,
  type ThreatLevel,
} from "../data";

/* Kalkulasi Garis Lengkung Rute Jaringan (Fiber/Satelit) */
function routePath(fromX: number, fromY: number, toX: number, toY: number, type: AssetType) {
  const dx = toX - fromX;
  const dy = toY - fromY;

  if (type === "zero-day") {
    const lift = 150 + Math.min(100, Math.abs(dx) * 0.2);
    return `M ${fromX} ${fromY} C ${fromX + dx * 0.2} ${fromY - lift}, ${fromX + dx * 0.8} ${toY - lift}, ${toX} ${toY}`;
  }
  if (type === "ddos-swarm") {
    return `M ${fromX} ${fromY} Q ${fromX + dx * 0.5} ${fromY - 50}, ${toX} ${toY}`;
  }

  const mx = fromX + dx * 0.5;
  const my = fromY + dy * 0.5 + Math.sin(dx * 0.05) * 40;
  return `M ${fromX} ${fromY} Q ${mx} ${my}, ${toX} ${toY}`;
}

export interface ResolvedAsset extends CyberAsset {
  originName: string;
  targetName: string;
  path: string;
  isExecuting: boolean;
  statusText: string;
}

export interface GameState {
  assets: ResolvedAsset[];
  hubs: ServerHub[];
  globalThreat: ThreatLevel;
  activeEvents: CyberEvent[];
  kpis: {
    totalBandwidthActive: number;
    globalTension: number;
    activeCompute: number;
  };
}

export function computeGameState(activeEventIds: string[]): GameState {
  const activeEvents = EVENT_LIBRARY.filter((s: CyberEvent) => activeEventIds.includes(s.id));

  let extraTension = 0;
  let bwPenalty = 0;
  let payloadBuff = 0;

  for (const ev of activeEvents) {
    if (ev.kind === "infrastructure-hack") extraTension += ev.magnitude;
    if (ev.kind === "ransomware") extraTension += ev.magnitude;
    if (ev.id === "ev-cable") bwPenalty = 0.4;
    if (ev.kind === "zero-day-leak") payloadBuff = ev.magnitude;
  }

  let totalBw = 0;

  const resolvedAssets: ResolvedAsset[] = CYBER_ASSETS.map((a: CyberAsset) => {
    const origin = hubById(a.originHubId);
    const target = hubById(a.targetHubId);

    const assetBandwidth = a.type === "ddos-swarm" ? 500 : 50;
    totalBw += assetBandwidth;

    const isExecuting = a.stance === "executing" || (activeEvents.length > 0 && a.progress > 0.7);
    const currentStealth = isExecuting ? Math.max(0, a.stealth - 40) : a.stealth;
    const currentPayload = a.payload + payloadBuff;

    let statusText =
      a.stance === "dormant" ? `Idle di Node ${origin.code}` : `Traceroute ke ${target.code}`;
    if (isExecuting) statusText = `INJEKSI PAYLOAD (${currentStealth}% STEALTH)`;

    return {
      ...a,
      payload: currentPayload,
      stealth: currentStealth,
      originName: origin.name,
      targetName: target.name,
      path: routePath(origin.x, origin.y, target.x, target.y, a.type),
      isExecuting,
      statusText,
    };
  });

  const tensionBase = 10;
  const computedTension = Math.min(
    100,
    tensionBase +
      extraTension +
      resolvedAssets.filter((a: ResolvedAsset) => a.isExecuting).length * 0.5,
  );

  const globalThreat: ThreatLevel =
    computedTension >= 80 ? "breached" : computedTension >= 40 ? "scanned" : "secure";

  const baseCompute = SERVER_HUBS.reduce((acc: number, c: ServerHub) => acc + c.computePower, 0);
  const baseBandwidth = SERVER_HUBS.reduce((acc: number, c: ServerHub) => acc + c.bandwidthCap, 0);

  return {
    assets: resolvedAssets,
    hubs: SERVER_HUBS,
    globalThreat,
    activeEvents,
    kpis: {
      totalBandwidthActive: baseBandwidth - baseBandwidth * bwPenalty,
      globalTension: computedTension,
      activeCompute: baseCompute,
    },
  };
}

export const GAME_STATE_BASELINE = computeGameState([]);

/* ---------- KONFIGURASI REACT CONTEXT ---------- */

export interface ControlContextType {
  state: GameState;
  activeEventIds: string[];
  toggleEvent: (id: string) => void;
  resetEvents: () => void;
  revealedHubs: string[];
}

export const ControlContext = createContext<ControlContextType | null>(null);

export function ControlProvider({ children }: { children: ReactNode }) {
  const [activeEventIds, setActiveEventIds] = useState<string[]>([]);
  const [revealedHubs, setRevealedHubs] = useState<string[]>(
    SERVER_HUBS.map((h: ServerHub) => h.id),
  );

  const state = useMemo(() => computeGameState(activeEventIds), [activeEventIds]);

  const toggleEvent = (id: string) => {
    setActiveEventIds((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  };

  const resetEvents = () => {
    setActiveEventIds([]);
  };

  return (
    <ControlContext.Provider
      value={{ state, activeEventIds, toggleEvent, resetEvents, revealedHubs }}
    >
      {children}
    </ControlContext.Provider>
  );
}

// Custom Hook untuk mempermudah pemanggilan di komponen lain
export function useControl() {
  const context = useContext(ControlContext);
  if (!context) {
    throw new Error("useControl must be used within a ControlProvider");
  }
  return context;
}
