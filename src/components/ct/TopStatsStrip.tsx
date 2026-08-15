import { useEffect, useRef, useState } from "react";
import type { GameState } from "@/lib/ct/engine";
import { manpower } from "@/lib/ct/format";

// (Fungsi Cell dan useCountUp sama seperti aslinya, jadi tidak saya ubah logika core-nya)
function useCountUp(target: number, decimals: number) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 620);
      const e = 1 - Math.pow(1 - k, 3);
      setV(Number((a + (target - a) * e).toFixed(decimals)));
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, decimals]);
  return v;
}

interface Metric {
  label: string;
  value: number;
  decimals: number;
  suffix: string;
  target: string;
  good: "up" | "down";
  baseline: number;
  scale?: number;
  signed?: boolean;
  hideDelta?: boolean;
  manpowerFormat?: boolean; // Tipe data baru untuk angka pasukan
}

function Cell({ m }: { m: Metric }) {
  const v = useCountUp(m.value, m.decimals);
  const delta = Number((m.value - m.baseline).toFixed(m.decimals));
  const bad = m.good === "up" ? delta < 0 : delta > 0;
  const color =
    delta === 0 ? "var(--muted-foreground)" : bad ? "var(--critical)" : "var(--nominal)";
  const pct = Math.min(1, Math.abs(m.value) / (m.scale ?? (m.good === "up" ? 100 : 40)));
  const sign = m.signed && v > 0 ? "+" : "";

  return (
    <div className="panel relative flex-1 overflow-hidden px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="eyebrow">{m.label}</p>
        {delta !== 0 && !m.hideDelta && (
          <span className="num text-[10px] font-semibold" style={{ color }}>
            {delta > 0 ? "▲" : "▼"}{" "}
            {m.manpowerFormat ? manpower(Math.abs(delta)) : Math.abs(delta).toFixed(m.decimals)}
          </span>
        )}
      </div>
      <p
        className="num mt-1.5 text-3xl font-semibold leading-none tracking-tight"
        style={{ color: bad ? "var(--critical)" : "var(--foreground)" }}
      >
        {sign}
        {m.manpowerFormat ? manpower(v) : v.toFixed(m.decimals)}
        <span className="ml-0.5 text-base text-muted-foreground">{m.suffix}</span>
      </p>
      <div className="mt-2.5 h-0.75 w-full overflow-hidden rounded-full bg-(--surface-2)">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct * 100}%`,
            backgroundColor: bad ? "var(--critical)" : "var(--primary)",
          }}
        />
      </div>
      <p className="num mt-1.5 text-[10px] text-muted-foreground">{m.target}</p>
    </div>
  );
}

export function TopStatsStrip({ state, baseline }: { state: GameState; baseline: GameState }) {
  const metrics: Metric[] = [
    {
      label: "TOTAL PASUKAN (MANPOWER)",
      value: state.kpis.totalManpowerFielded,
      baseline: baseline.kpis.totalManpowerFielded,
      decimals: 0,
      suffix: "",
      target: "Kapasitas Wajib Militer: 5M",
      good: "up",
      scale: 5000000,
      manpowerFormat: true,
    },
    {
      label: "KETEGANGAN GLOBAL (TENSION)",
      value: state.kpis.globalTension,
      baseline: baseline.kpis.globalTension,
      decimals: 1,
      suffix: "%",
      target: "Ancaman Perang Terbuka > 50%",
      good: "down",
      scale: 100,
    },
    {
      label: "KAPASITAS INDUSTRI CIVIL",
      value: state.kpis.industrialCapacity,
      baseline: baseline.kpis.industrialCapacity,
      decimals: 0,
      suffix: " IC",
      target: "Produksi pabrik aktif vs hancur",
      good: "up",
      scale: baseline.kpis.industrialCapacity * 1.5,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
      {metrics.map((m) => (
        <Cell key={m.label} m={m} />
      ))}
    </div>
  );
}
