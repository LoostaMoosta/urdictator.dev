import { type NationalEvent, EVENT_LIBRARY } from "@/lib/ct/data";
import type { GameState } from "@/lib/ct/engine";

interface Props {
  active: string[];
  onToggle: (id: string) => void;
  onReset: () => void;
  state: GameState;
  revealed: string[];
}

export function GeopoliticPanel({ active, onToggle, onReset, state, revealed }: Props) {
  return (
    <div className="panel flex h-full flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Fokus Nasional & Kebijakan</h2>
          <p className="eyebrow mt-0.5">Aktifkan keputusan · Lihat respons faksi lain</p>
        </div>
        <button
          onClick={onReset}
          disabled={active.length === 0}
          className="num shrink-0 rounded-sm border border-border px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-35"
        >
          Reset Event
        </button>
      </header>

      {/* Military Events (Deklarasi, Mobilisasi) */}
      <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-1">
        <p className="eyebrow mb-1 ml-1">Keputusan Militer</p>
        {EVENT_LIBRARY.filter((e) => e.kind === "declare-war" || e.kind === "mobilization").map(
          (ev) => {
            const on = active.includes(ev.id);
            return (
              <button
                key={ev.id}
                onClick={() => onToggle(ev.id)}
                className="group flex items-center gap-3 rounded-sm border px-3 py-2.5 text-left transition-all"
                style={{
                  borderColor: on ? "var(--critical)" : "var(--border)",
                  backgroundColor: on ? "rgba(220,38,38,0.15)" : "transparent",
                }}
              >
                <span className="min-w-0 flex-1">
                  <span
                    className="block text-xs font-semibold"
                    style={{ color: on ? "var(--critical)" : "var(--foreground)" }}
                  >
                    {ev.label}
                  </span>
                  <span className="eyebrow block normal-case text-muted-foreground">
                    {ev.detail}
                  </span>
                </span>
              </button>
            );
          },
        )}
      </div>

      {/* Industrial / Diplomacy */}
      <div className="grid gap-2 px-3 pb-3 sm:grid-cols-2 xl:grid-cols-1 border-t border-border pt-2">
        <p className="eyebrow mb-1 ml-1">Ekonomi & Diplomasi</p>
        {EVENT_LIBRARY.filter(
          (e) => e.kind === "industrial-boom" || e.kind === "border-skirmish",
        ).map((ev) => {
          const on = active.includes(ev.id);
          return (
            <button
              key={ev.id}
              onClick={() => onToggle(ev.id)}
              className="flex w-full items-center gap-3 rounded-sm border px-3 py-2 text-left"
              style={{
                borderColor: on ? "var(--nominal)" : "var(--border)",
                backgroundColor: on ? "var(--surface-2)" : "transparent",
              }}
            >
              <span className="min-w-0 flex-1">
                <span
                  className="block text-xs font-semibold"
                  style={{ color: on ? "var(--nominal)" : "var(--foreground)" }}
                >
                  {ev.label}
                </span>
                <span className="eyebrow block normal-case text-muted-foreground">{ev.detail}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Divisi Perang Summary */}
      <div className="mt-auto border-t border-border">
        <div className="flex items-center justify-between px-4 py-2">
          <p className="eyebrow">Status Pergerakan Divisi</p>
          <p className="num text-[10px] text-muted-foreground">
            {state.divisions.length} Unit Aktif
          </p>
        </div>
        <ul className="max-h-50 space-y-px overflow-y-auto px-2 pb-2">
          {state.divisions.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-2.5 rounded-sm px-2 py-1.5"
            >
              <span className="num text-[10px] uppercase text-muted-foreground">{d.id}</span>
              <span
                className="text-[11px] font-semibold"
                style={{ color: d.inCombat ? "var(--critical)" : "var(--nominal)" }}
              >
                {d.type} {d.inCombat ? "[BERTEMPUR]" : "[SIAGA]"}
              </span>
              <span className="num text-[11px] text-muted-foreground">{d.strength}% STR</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
