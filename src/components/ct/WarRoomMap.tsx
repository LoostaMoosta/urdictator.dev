/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type Mode = "botnet" | "zero-day" | "ddos-swarm" | "apt-module";

const MODES: Mode[] = ["botnet", "ddos-swarm", "apt-module", "zero-day"];

const MODE_SPEC: Record<
  Mode,
  { dash: string; speed: number; marker: "dot" | "diamond" | "square" | "triangle" }
> = {
  botnet: { dash: "1 4", speed: 0.05, marker: "dot" },
  "ddos-swarm": { dash: "2 2", speed: 0.08, marker: "triangle" },
  "apt-module": { dash: "8 4", speed: 0.03, marker: "square" },
  "zero-day": { dash: "15 5", speed: 0.1, marker: "diamond" },
};

const MODE_LABEL: Record<Mode, string> = {
  botnet: "Botnet Node",
  "ddos-swarm": "DDoS Swarm",
  "apt-module": "APT Script",
  "zero-day": "0-Day Exploit",
};

const STANCE_VAR: Record<string, string> = {
  dormant: "var(--nominal)",
  infiltrating: "var(--caution)",
  executing: "var(--critical)",
};

const W = 1000;
const H = 620;

const LAND_PATHS: string[] = [];
const COUNTRY_BORDERS = "";
const STATE_BORDERS = "";
const GRATICULE: string[] = [];

type Hub = {
  id: string;
  code: string;
  x: number;
  y: number;
};

type ResolvedAsset = {
  id: string;
  type: Mode;
  stance: "dormant" | "infiltrating" | "executing";
  isExecuting: boolean;
  path: string;
  progress: number;
  operator: string;
  originName: string;
  targetName: string;
  payload: number;
  stealth: number;
  statusText: string;
};

type GameState = {
  hubs?: Hub[];
  assets?: ResolvedAsset[];
};

interface Props {
  state: GameState;
  rippleKey: number;
  revealed: string[];
  visibleModes: Mode[];
  onToggleMode: (m: Mode) => void;
}

export function WarRoomMap({ state, rippleKey, revealed, visibleModes, onToggleMode }: Props) {
  const hubs = state.hubs ?? [];
  const assets = state.assets ?? [];

  const activeModes = visibleModes?.length ? visibleModes : MODES;
  const activeAssets = assets.filter((a) => a.stance !== "dormant" || a.isExecuting);

  const pathRefs = useRef<Record<string, SVGPathElement | null>>({});
  const dotRefs = useRef<Record<string, SVGGElement | null>>({});
  const progress = useRef<Record<string, number>>({});
  const [hover, setHover] = useState<{ d: ResolvedAsset; x: number; y: number } | null>(null);

  const [rippling, setRippling] = useState(false);
  useEffect(() => {
    if (!rippleKey) return;
    setRippling(true);
    const t = setTimeout(() => setRippling(false), 5200);
    return () => clearTimeout(t);
  }, [rippleKey]);

  const frameRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const drag = useRef<{ px: number; py: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);

  const K_MIN = 0.45;
  const K_MAX = 8;

  const clamp = (v: { k: number; x: number; y: number }) => {
    const k = Math.min(K_MAX, Math.max(K_MIN, v.k));
    const bx = W * (1 - k);
    const by = H * (1 - k);
    const pad = k <= 1 ? 0.18 * W : 0;
    return {
      k,
      x: Math.max(Math.min(0, bx) - pad, Math.min(Math.max(0, bx) + pad, v.x)),
      y: Math.max(Math.min(0, by) - pad, Math.min(Math.max(0, by) + pad, v.y)),
    };
  };

  const zoomAt = (factor: number, sx: number, sy: number) => {
    setView((v) => {
      const k = Math.min(K_MAX, Math.max(K_MIN, v.k * factor));
      const wx = (sx - v.x) / v.k;
      const wy = (sy - v.y) / v.k;
      return clamp({ k, x: sx - wx * k, y: sy - wy * k });
    });
  };

  const viewScale = (r: DOMRect) => Math.max(r.width / W, r.height / H);
  const toView = (r: DOMRect, cx: number, cy: number) => {
    const s = viewScale(r);
    return {
      x: (cx - r.left - (r.width - W * s) / 2) / s,
      y: (cy - r.top - (r.height - H * s) / 2) / s,
    };
  };

  const [frame, setFrame] = useState({ w: W, h: H });
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      setFrame({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const p = toView(r, e.clientX, e.clientY);
      zoomAt(Math.exp(-e.deltaY * 0.0018), p.x, p.y);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const byId = useMemo(
    () => Object.fromEntries(assets.map((a) => [a.id, a])) as Record<string, ResolvedAsset>,
    [assets],
  );

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const lengths: Record<string, number> = {};

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      for (const a of activeAssets) {
        const p = pathRefs.current[a.id];
        const g = dotRefs.current[a.id];
        if (!p || !g) continue;
        if (lengths[a.id] === undefined) lengths[a.id] = p.getTotalLength();
        const len = lengths[a.id];
        if (!len) continue;

        if (progress.current[a.id] === undefined) progress.current[a.id] = a.progress;
        const spec = MODE_SPEC[a.type as Mode];

        const speed = a.stance === "dormant" ? 0 : spec.speed;
        progress.current[a.id] = (progress.current[a.id] + speed * dt) % 1;
        const pt = p.getPointAtLength(progress.current[a.id] * len);
        g.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [activeAssets]);

  return (
    <div className="panel relative flex flex-col overflow-hidden bg-panel border-border">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-2 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-primary">
            Peta Jaringan Global
          </h2>
          <span className="text-xs uppercase text-muted-foreground">
            <span className="num font-bold text-foreground">
              {activeAssets.filter((a) => activeModes.includes(a.type as Mode)).length}
            </span>
            /<span className="num">{assets.length}</span> Sesi Aktif
          </span>
          <div className="flex items-center gap-1">
            {MODES.map((m) => {
              const on = activeModes.includes(m);
              const n = activeAssets.filter((a) => a.type === m).length;
              return (
                <button
                  key={m}
                  onClick={() => onToggleMode(m)}
                  className={`chip border px-2 py-1 text-[10px] uppercase tracking-widest ${
                    on
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {MODE_LABEL[m]} <span className="num ml-1">{n}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div
        ref={frameRef}
        className="relative min-h-0 w-full flex-1 touch-none overflow-hidden [aspect-ratio:1000/620] xl:aspect-auto"
      >
        <svg
          viewBox="0 0 1000 620"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 size-full"
          style={{
            cursor: dragging ? "grabbing" : "crosshair",
            backgroundColor: "var(--map-ocean)",
          }}
          onMouseLeave={() => {
            setHover(null);
            drag.current = null;
            setDragging(false);
          }}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            drag.current = { px: e.clientX, py: e.clientY, moved: false };
            setDragging(true);
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            const r = frameRef.current?.getBoundingClientRect();
            if (!r) return;
            const sc = viewScale(r);
            const dx = (e.clientX - d.px) / sc;
            const dy = (e.clientY - d.py) / sc;
            if (Math.abs(dx) + Math.abs(dy) > 1) {
              d.moved = true;
              setHover(null);
            }
            d.px = e.clientX;
            d.py = e.clientY;
            setView((v) => clamp({ ...v, x: v.x + dx, y: v.y + dy }));
          }}
          onPointerUp={() => {
            drag.current = null;
            setDragging(false);
          }}
          onDoubleClick={(e) => {
            const r = frameRef.current?.getBoundingClientRect();
            if (!r) return;
            const p = toView(r, e.clientX, e.clientY);
            zoomAt(1.8, p.x, p.y);
          }}
        >
          <defs>
            <linearGradient id="cyber-land" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--map-land-a)" />
              <stop offset="100%" stopColor="var(--map-land-b)" />
            </linearGradient>
            <pattern id="cyber-grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path
                d="M30 0 H0 V30"
                fill="none"
                stroke="var(--primary)"
                strokeOpacity="0.05"
                strokeWidth="0.5"
              />
            </pattern>
            <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            <rect width="1000" height="620" fill="url(#cyber-grid)" />
            <g fill="none" stroke="var(--primary)" strokeOpacity="0.1" strokeWidth="0.5">
              {GRATICULE.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
            <g>
              {LAND_PATHS.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  fill="url(#cyber-land)"
                  stroke="var(--primary)"
                  strokeOpacity="0.3"
                  strokeWidth="0.5"
                />
              ))}
              <path
                d={COUNTRY_BORDERS}
                fill="none"
                stroke="var(--primary)"
                strokeOpacity="0.15"
                strokeWidth="0.4"
              />
              <path
                d={STATE_BORDERS}
                fill="none"
                stroke="var(--primary)"
                strokeOpacity="0.1"
                strokeWidth="0.3"
              />
            </g>

            <g fill="none">
              {activeAssets.map((a) => {
                const c = a.isExecuting ? STANCE_VAR.executing : STANCE_VAR.infiltrating;
                const shown = activeModes.includes(a.type as Mode);
                const hovered = hover?.d.id === a.id;
                return (
                  <g key={a.id}>
                    <path
                      ref={(el) => {
                        pathRefs.current[a.id] = el;
                      }}
                      d={a.path}
                      stroke={c}
                      strokeOpacity={!shown ? 0.05 : hovered ? 1 : a.isExecuting ? 0.7 : 0.3}
                      strokeWidth={!shown ? 0.5 : hovered ? 2 : 1}
                      strokeDasharray={MODE_SPEC[a.type as Mode].dash}
                      className={
                        shown && ((a.isExecuting && rippling) || hovered)
                          ? "animate-dash"
                          : undefined
                      }
                      style={{
                        transition: "stroke-opacity .35s, stroke-width .35s",
                        filter: hovered ? "url(#neon-glow)" : "none",
                      }}
                    />
                  </g>
                );
              })}
            </g>

            <g>
              {hubs.map((h) => {
                const shown = revealed.includes(h.id);
                return (
                  <g
                    key={h.id}
                    transform={`translate(${h.x} ${h.y})`}
                    style={{ opacity: shown ? 1 : 0, transition: "opacity 0.5s ease-in" }}
                  >
                    <circle
                      r="6"
                      fill="var(--background)"
                      stroke="var(--primary)"
                      strokeWidth="1.5"
                      filter="url(#neon-glow)"
                    />
                    <circle r="2" fill="var(--primary)" />
                    <g transform="translate(10, -5)">
                      <text
                        className="num font-mono"
                        fontSize="9"
                        fontWeight="bold"
                        fill="var(--primary)"
                        letterSpacing="0.1em"
                      >
                        {h.code}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>

            <g>
              {activeAssets.map((a) => {
                const c = a.isExecuting ? STANCE_VAR.executing : STANCE_VAR.infiltrating;
                const active = hover?.d.id === a.id;
                const spec = MODE_SPEC[a.type as Mode];
                const shown = activeModes.includes(a.type as Mode);
                return (
                  <g
                    key={a.id}
                    style={{ opacity: shown ? 1 : 0 }}
                    pointerEvents={shown ? "auto" : "none"}
                    ref={(el) => {
                      dotRefs.current[a.id] = el;
                    }}
                  >
                    {active && <circle r="10" fill={c} opacity={0.4} filter="url(#neon-glow)" />}
                    {spec.marker === "diamond" ? (
                      <rect
                        x={-3}
                        y={-3}
                        width={6}
                        height={6}
                        transform="rotate(45)"
                        fill={c}
                        filter="url(#neon-glow)"
                      />
                    ) : spec.marker === "triangle" ? (
                      <path d="M 0 -4 L 4 3 L -4 3 Z" fill={c} filter="url(#neon-glow)" />
                    ) : spec.marker === "square" ? (
                      <rect
                        x={-2.5}
                        y={-2.5}
                        width={5}
                        height={5}
                        fill={c}
                        filter="url(#neon-glow)"
                      />
                    ) : (
                      <circle r={3} fill={c} filter="url(#neon-glow)" />
                    )}
                    <circle
                      r="12"
                      fill="transparent"
                      className="cursor-crosshair"
                      onMouseEnter={(e) => {
                        const g = e.currentTarget.parentElement as SVGGElement | null;
                        const t = g?.getAttribute("transform") ?? "";
                        const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(t);
                        setHover({
                          d: byId[a.id],
                          x: m ? Number(m[1]) : 500,
                          y: m ? Number(m[2]) : 310,
                        });
                      }}
                    />
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        {hover &&
          (() => {
            const sc = Math.max(frame.w / W, frame.h / H);
            const vx = hover.x * view.k + view.x;
            const vy = hover.y * view.k + view.y;
            const px = (frame.w - W * sc) / 2 + vx * sc;
            const py = (frame.h - H * sc) / 2 + vy * sc;
            const isCritical = hover.d.isExecuting;
            const cColor = isCritical ? STANCE_VAR.executing : STANCE_VAR.infiltrating;

            return (
              <div
                className="pointer-events-none absolute z-20 w-[280px] animate-rise font-mono"
                style={{
                  left: `${px}px`,
                  top: `${py}px`,
                  transform: `translate(${px > frame.w - 300 ? "calc(-100% - 14px)" : "14px"}, ${py > frame.h - 260 ? "calc(-100% - 10px)" : "-10px"})`,
                }}
              >
                <div
                  className="panel border border-primary/50 bg-[#020617]/90 backdrop-blur-md"
                  style={{ borderColor: isCritical ? "var(--critical)" : "var(--primary)" }}
                >
                  <div
                    className="flex items-center justify-between border-b border-border bg-primary/10 px-3 py-2"
                    style={{
                      backgroundColor: isCritical ? "rgba(255,0,60,0.1)" : "rgba(0,240,255,0.1)",
                    }}
                  >
                    <span className="num text-[11px] font-bold text-foreground">
                      PACKET: {hover.d.id}
                    </span>
                    <span
                      className="rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: cColor, backgroundColor: "var(--surface-2)" }}
                    >
                      {hover.d.type}
                    </span>
                  </div>
                  <dl className="space-y-1.5 px-3 py-2.5 text-[10px]">
                    <Row k="Operator ID" v={hover.d.operator} />
                    <Row k="Source IP" v={hover.d.originName} />
                    <Row k="Target IP" v={hover.d.targetName} />
                    <Row
                      k="Payload Size"
                      v={<span className="num text-critical font-bold">{hover.d.payload} TB</span>}
                    />
                    <Row
                      k="Stealth Lvl"
                      v={<span className="num text-primary font-bold">{hover.d.stealth}%</span>}
                    />
                  </dl>
                  <div className="border-t border-border px-3 py-2">
                    <p className="eyebrow mb-1 text-muted-foreground">STATUS PROSES</p>
                    <p
                      className="text-[11px] font-bold uppercase"
                      style={{ color: cColor, textShadow: `0 0 5px ${cColor}` }}
                    >
                      &gt;_ {hover.d.statusText}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground uppercase">{k}</dt>
      <dd className="text-right text-foreground font-bold">{v}</dd>
    </div>
  );
}
