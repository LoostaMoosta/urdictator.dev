import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LAND_PATHS, COUNTRY_BORDERS, GRATICULE } from "@/lib/ct/geo";
import type { GameState, ResolvedDivision } from "@/lib/ct/engine";

/* Penyesuaian Offset Label Kota agar tidak saling bertumpuk di peta */
const CITY_LABEL: Record<string, [number, number]> = {
  ber: [-10, -20],
  lon: [-40, -15],
  mos: [15, -15],
  par: [-10, 20],
  rom: [10, 20],
  war: [15, -10],
  ist: [15, 15],
};

export type Mode = "infantry" | "armor" | "navy" | "air-wing";

const MODES: Mode[] = ["infantry", "armor", "navy", "air-wing"];

const MODE_SPEC: Record<
  Mode,
  { dash: string; speed: number; marker: "dot" | "diamond" | "square" }
> = {
  infantry: { dash: "2 4", speed: 0.015, marker: "dot" },
  armor: { dash: "4 6", speed: 0.025, marker: "square" },
  navy: { dash: "4 7", speed: 0.02, marker: "dot" },
  "air-wing": { dash: "1 6", speed: 0.06, marker: "diamond" },
};

const MODE_LABEL: Record<Mode, string> = {
  infantry: "Infanteri",
  armor: "Kavaleri Lapis Baja",
  navy: "Armada Laut",
  "air-wing": "Skuadron Udara",
};

// Menggunakan variabel CSS bawaan tema untuk indikator status tempur
const STANCE_VAR: Record<string, string> = {
  entrenched: "var(--nominal)", // Hijau / Biru (Siaga)
  moving: "var(--caution)", // Kuning / Oranye (Bergerak)
  "in-combat": "var(--critical)", // Merah (Bertempur)
};

const STATE_BORDERS = "";

const W = 1000;
const H = 620;

interface Props {
  state: GameState;
  rippleKey: number;
  revealed: string[];
  visibleModes: Mode[];
  onToggleMode: (m: Mode) => void;
}

export function WarRoomMap({ state, rippleKey, revealed, visibleModes, onToggleMode }: Props) {
  const { cities, divisions } = state;

  // Filter divisi yang sedang bergerak/bertempur untuk digambar di peta
  const activeDivisions = divisions.filter((d) => d.stance !== "entrenched" || d.inCombat);
  const garrisonDivisions = divisions.length - activeDivisions.length;

  const pathRefs = useRef<Record<string, SVGPathElement | null>>({});
  const dotRefs = useRef<Record<string, SVGGElement | null>>({});
  const progress = useRef<Record<string, number>>({});
  const [hover, setHover] = useState<{ d: ResolvedDivision; x: number; y: number } | null>(null);

  const [rippling, setRippling] = useState(false);
  useEffect(() => {
    if (!rippleKey) return;
    setRippling(true);
    const t = setTimeout(() => setRippling(false), 5200);
    return () => clearTimeout(t);
  }, [rippleKey]);

  /* ---- PAN / ZOOM LOGIC ---- */
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

  const zoomAt = useCallback((factor: number, sx: number, sy: number) => {
    setView((v) => {
      const k = Math.min(K_MAX, Math.max(K_MIN, v.k * factor));
      const wx = (sx - v.x) / v.k;
      const wy = (sy - v.y) / v.k;
      return clamp({ k, x: sx - wx * k, y: sy - wy * k });
    });
  }, []);

  const viewScale = useCallback((r: DOMRect) => Math.max(r.width / W, r.height / H), []);
  const toView = useCallback(
    (r: DOMRect, cx: number, cy: number) => {
      const s = viewScale(r);
      return {
        x: (cx - r.left - (r.width - W * s) / 2) / s,
        y: (cy - r.top - (r.height - H * s) / 2) / s,
      };
    },
    [viewScale],
  );

  const [frame, setFrame] = useState({ w: W, h: H });
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setFrame({ w: e.contentRect.width, h: e.contentRect.height }),
    );
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
  }, [toView, zoomAt]);

  const byId = useMemo(
    () => Object.fromEntries(divisions.map((d) => [d.id, d])) as Record<string, ResolvedDivision>,
    [divisions],
  );

  /* ---- ANIMASI PERGERAKAN DIVISI (Request Animation Frame) ---- */
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const lengths: Record<string, number> = {};

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      for (const d of activeDivisions) {
        const p = pathRefs.current[d.id];
        const g = dotRefs.current[d.id];
        if (!p || !g) continue;
        if (lengths[d.id] === undefined) lengths[d.id] = p.getTotalLength();
        const len = lengths[d.id];
        if (!len) continue;

        if (progress.current[d.id] === undefined) progress.current[d.id] = d.progress;
        const spec = MODE_SPEC[d.type as Mode];

        // Jika bertempur, kecepatan melambat drastis. Jika diam, kecepatan 0.
        const combatSlowdown = d.inCombat ? 0.2 : 1;
        const speed = d.stance === "entrenched" ? 0 : spec.speed * combatSlowdown;

        progress.current[d.id] = (progress.current[d.id] + speed * dt) % 1;
        const pt = p.getPointAtLength(progress.current[d.id] * len);
        g.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [activeDivisions]);

  return (
    <div className="panel relative flex flex-col overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold tracking-tight">Peta Operasi Gabungan</h2>
          <span className="text-xs text-muted-foreground">
            <span className="num">
              {activeDivisions.filter((d) => visibleModes.includes(d.type as Mode)).length}
            </span>
            /<span className="num">{divisions.length}</span> Divisi Dikerahkan ·{" "}
            <span className="num">{garrisonDivisions}</span> Divisi Garnisun
          </span>

          <div className="flex items-center gap-1">
            {MODES.map((m) => {
              const on = visibleModes.includes(m);
              const n = activeDivisions.filter((d) => d.type === m).length;
              return (
                <button
                  key={m}
                  onClick={() => onToggleMode(m)}
                  aria-pressed={on}
                  className="chip px-2 py-1"
                >
                  {MODE_LABEL[m]} <span className="num">{n}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <i
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: STANCE_VAR["entrenched"] }}
            />{" "}
            Garnisun
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <i
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: STANCE_VAR["moving"] }}
            />{" "}
            Bergerak
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <i
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: STANCE_VAR["in-combat"] }}
            />{" "}
            Kontak Tempur
          </span>
        </div>
      </header>

      <div
        ref={frameRef}
        className="relative min-h-0 w-full flex-1 touch-none overflow-hidden aspect-1000/620 xl:aspect-auto"
      >
        <svg
          viewBox="0 0 1000 620"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 size-full"
          style={{
            cursor: dragging ? "grabbing" : "grab",
            backgroundColor: "var(--map-ocean, #0a111a)",
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
            <linearGradient id="ct-land" x1="0" y1="0" x2="0.4" y2="1">
              <stop offset="0%" stopColor="var(--map-land-a, #131e2b)" stopOpacity="0.95" />
              <stop offset="100%" stopColor="var(--map-land-b, #0d1620)" stopOpacity="0.8" />
            </linearGradient>
            <pattern id="ct-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0 H0 V40" fill="none" stroke="var(--hairline)" strokeWidth="0.7" />
            </pattern>
            <filter id="ct-soft" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>

          <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            {/* Grid Latar */}
            <rect width="1000" height="620" fill="url(#ct-grid)" opacity="0.4" />

            {/* Garis Lintang Bujur (Graticule) */}
            <g fill="none" stroke="var(--hairline)" strokeWidth="0.7">
              {GRATICULE.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>

            {/* Benua & Daratan */}
            <g>
              {LAND_PATHS.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  fill="url(#ct-land)"
                  stroke="var(--signal)"
                  strokeOpacity="0.5"
                  strokeWidth="0.8"
                />
              ))}
              <path
                d={COUNTRY_BORDERS}
                fill="none"
                stroke="var(--signal)"
                strokeOpacity="0.22"
                strokeWidth="0.7"
              />
              <path
                d={STATE_BORDERS}
                fill="none"
                stroke="var(--signal)"
                strokeOpacity="0.16"
                strokeWidth="0.6"
              />
            </g>

            {/* Jalur Rute Pasukan */}
            <g fill="none">
              {activeDivisions.map((d) => {
                const c = d.inCombat ? STANCE_VAR["in-combat"] : STANCE_VAR["moving"];
                const shown = visibleModes.includes(d.type as Mode);
                const hovered = hover?.d.id === d.id;
                return (
                  <g key={d.id}>
                    <path
                      ref={(el) => {
                        pathRefs.current[d.id] = el;
                      }}
                      d={d.path}
                      stroke={c}
                      strokeOpacity={!shown ? 0.05 : hovered ? 0.85 : d.inCombat ? 0.6 : 0.24}
                      strokeWidth={!shown ? 0.5 : hovered ? 1.6 : 1.2}
                      strokeDasharray={MODE_SPEC[d.type as Mode].dash}
                      className={
                        shown && ((d.inCombat && rippling) || hovered) ? "animate-dash" : undefined
                      }
                      style={{ transition: "stroke-opacity .35s, stroke-width .35s, stroke .5s" }}
                    />
                    {d.inCombat && shown && (
                      <path
                        key={`${d.id}-${rippleKey}`}
                        d={d.path}
                        stroke={c}
                        strokeWidth="3"
                        strokeOpacity="0.5"
                        filter="url(#ct-soft)"
                        className="animate-flash"
                      />
                    )}
                  </g>
                );
              })}
            </g>

            {/* Titik Kota / Markas */}
            <g>
              {cities.map((c) => {
                const shown = revealed.includes(c.id);
                // Jika sedang ada ripple dan direveal, tampil terang. Jika tidak, redup.
                const strokeColor = shown ? "var(--foreground)" : "var(--muted-foreground)";
                const offset = CITY_LABEL[c.id] || [12, -12];
                return (
                  <g
                    key={c.id}
                    transform={`translate(${c.x} ${c.y})`}
                    style={{ opacity: shown ? 1 : 0, transition: "opacity 0.5s ease-in" }}
                  >
                    <circle r="3" fill="var(--background)" stroke={strokeColor} strokeWidth="1.5" />
                    {/* Garis penunjuk ke teks */}
                    <line
                      x1="0"
                      y1="0"
                      x2={offset[0] * 0.7}
                      y2={offset[1] * 0.7}
                      stroke={strokeColor}
                      strokeOpacity="0.4"
                      strokeWidth="0.8"
                    />
                    <g transform={`translate(${offset[0]} ${offset[1]})`}>
                      <text
                        textAnchor={offset[0] < 0 ? "end" : "start"}
                        className="num"
                        fontSize="10"
                        fontWeight="600"
                        fill="var(--foreground)"
                        letterSpacing="0.05em"
                      >
                        {c.name}
                      </text>
                      <text
                        y="10"
                        textAnchor={offset[0] < 0 ? "end" : "start"}
                        className="num"
                        fontSize="8"
                        fill="var(--muted-foreground)"
                      >
                        IC: {c.infrastructure}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>

            {/* Ikon Bergerak Pasukan */}
            <g>
              {activeDivisions.map((d) => {
                const c = d.inCombat ? STANCE_VAR["in-combat"] : STANCE_VAR["moving"];
                const active = hover?.d.id === d.id;
                const spec = MODE_SPEC[d.type as Mode];
                const shown = visibleModes.includes(d.type as Mode);
                return (
                  <g
                    key={d.id}
                    style={{ opacity: shown ? 1 : 0, transition: "opacity .4s" }}
                    pointerEvents={shown ? "auto" : "none"}
                    ref={(el) => {
                      dotRefs.current[d.id] = el;
                    }}
                  >
                    {active && <circle r="8" fill={c} opacity={0.3} filter="url(#ct-soft)" />}
                    {spec.marker === "diamond" ? (
                      <rect
                        x={active ? -4 : -3}
                        y={active ? -4 : -3}
                        width={active ? 8 : 6}
                        height={active ? 8 : 6}
                        transform="rotate(45)"
                        fill={c}
                        stroke="var(--background)"
                        strokeWidth="0.8"
                      />
                    ) : spec.marker === "square" ? (
                      <rect
                        x={active ? -4 : -3}
                        y={active ? -4 : -3}
                        width={active ? 8 : 6}
                        height={active ? 8 : 6}
                        fill={c}
                        stroke="var(--background)"
                        strokeWidth="0.8"
                      />
                    ) : (
                      <circle
                        r={active ? 4.5 : 3.5}
                        fill={c}
                        stroke="var(--background)"
                        strokeWidth="0.8"
                      />
                    )}

                    {/* Area tangkap klik/hover */}
                    <circle
                      r="12"
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={(e) => {
                        const g = e.currentTarget.parentElement as SVGGElement | null;
                        const t = g?.getAttribute("transform") ?? "";
                        const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(t);
                        setHover({
                          d: byId[d.id],
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

        {/* Kontrol Zoom (Kanan Bawah) */}
        <div
          className="absolute bottom-3 right-3 z-10 flex flex-col overflow-hidden rounded-(--radius-sm) border border-border backdrop-blur-sm"
          style={{ backgroundColor: "var(--header-bg)" }}
        >
          {[
            { k: "+", fn: () => zoomAt(1.5, W / 2, H / 2) },
            { k: "−", fn: () => zoomAt(1 / 1.5, W / 2, H / 2) },
          ].map((b) => (
            <button
              key={b.k}
              onClick={b.fn}
              aria-label={b.k === "+" ? "Perbesar" : "Perkecil"}
              className="num size-7 border-b border-border text-xs text-muted-foreground transition-colors last:border-0 hover:text-foreground"
            >
              {b.k}
            </button>
          ))}
          <button
            onClick={() => setView({ k: 1, x: 0, y: 0 })}
            disabled={view.k === 1 && view.x === 0 && view.y === 0}
            className="border-t border-border px-1.5 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
          >
            Pas
          </button>
        </div>

        {/* HOVER TOOLTIP (HTML Overlay) */}
        {hover &&
          (() => {
            const sc = Math.max(frame.w / W, frame.h / H);
            const vx = hover.x * view.k + view.x;
            const vy = hover.y * view.k + view.y;
            const px = (frame.w - W * sc) / 2 + vx * sc;
            const py = (frame.h - H * sc) / 2 + vy * sc;
            const isCombat = hover.d.inCombat;
            const cColor = isCombat ? STANCE_VAR["in-combat"] : STANCE_VAR["moving"];

            return (
              <div
                className="pointer-events-none absolute z-20 w-67 animate-rise"
                style={{
                  left: `${px}px`,
                  top: `${py}px`,
                  transform: `translate(${px > frame.w - 300 ? "calc(-100% - 14px)" : "14px"}, ${py > frame.h - 260 ? "calc(-100% - 10px)" : "-10px"})`,
                }}
              >
                <div
                  className="panel"
                  style={{
                    backgroundColor: "var(--popover)",
                    border: `1px solid ${isCombat ? "rgba(220,38,38,0.5)" : "var(--border)"}`,
                  }}
                >
                  <div
                    className="flex items-center justify-between border-b border-border px-3 py-2"
                    style={{ backgroundColor: isCombat ? "rgba(220,38,38,0.1)" : "transparent" }}
                  >
                    <span className="num text-[11px] font-bold text-foreground">{hover.d.id}</span>
                    <span
                      className="rounded-(--radius-sm) px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: cColor, backgroundColor: "var(--surface-2)" }}
                    >
                      {isCombat ? "Bertempur" : "Bermanuver"}
                    </span>
                  </div>

                  <dl className="space-y-1.5 px-3 py-2.5 text-xs">
                    <Row k="Komandan" v={hover.d.commander} />
                    <Row k="Tipe Unit" v={MODE_LABEL[hover.d.type as Mode]} />
                    <Row k="Asal Markas" v={hover.d.originName} />
                    <Row k="Target Operasi" v={hover.d.targetName} />
                    <Row k="Kekuatan (STR)" v={<span className="num">{hover.d.strength}%</span>} />
                    <Row
                      k="Organisasi (ORG)"
                      v={
                        <span
                          className="num"
                          style={{
                            color: hover.d.organization < 30 ? "var(--critical)" : "inherit",
                          }}
                        >
                          {hover.d.organization}%
                        </span>
                      }
                    />
                  </dl>
                  <div className="border-t border-border px-3 py-2">
                    <p className="eyebrow mb-1">Status Operasi</p>
                    <p className="text-[11px] leading-snug font-medium" style={{ color: cColor }}>
                      {hover.d.statusText}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

        {/* Telemetri Kiri Bawah */}
        <div className="pointer-events-none absolute bottom-2 left-3 text-[11px] text-muted-foreground">
          <span className="num">Satelit Taktis MIL-01</span> · Proyeksi Mercator Eropa/Asia ·{" "}
          <span className="num">{view.k.toFixed(1)}×</span> · Gulir untuk zoom, seret untuk geser
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="eyebrow shrink-0 pt-px text-muted-foreground">{k}</dt>
      <dd className="text-right text-[11px] leading-snug font-medium text-foreground">{v}</dd>
    </div>
  );
}
