import type { GameState } from "./ControlProvider";

type EventKind = "infrastructure-hack" | "ransomware" | "zero-day-leak" | "psyops";

interface EventDefinition {
  id: string;
  kind: EventKind;
  label: string;
  detail: string;
}

// Kept local because this panel must also compile when the optional data module
// is not present in the component bundle.
const EVENT_LIBRARY: EventDefinition[] = [
  {
    id: "infrastructure-hack",
    kind: "infrastructure-hack",
    label: "Intrusi Infrastruktur",
    detail: "Gangguan pada layanan infrastruktur kritis",
  },
  {
    id: "ransomware",
    kind: "ransomware",
    label: "Serangan Ransomware",
    detail: "Enkripsi aset dan pemerasan operator",
  },
  {
    id: "zero-day-leak",
    kind: "zero-day-leak",
    label: "Kebocoran Zero-Day",
    detail: "Eksploitasi dan kebocoran data sensitif",
  },
  {
    id: "psyops",
    kind: "psyops",
    label: "Operasi Psyops",
    detail: "Disinformasi untuk memicu kepanikan publik",
  },
];

interface Props {
  active: string[];
  onToggle: (id: string) => void;
  onReset: () => void;
  state: GameState;
  revealed: string[];
}

export function GeopoliticPanel({ active, onToggle, onReset, state }: Props) {
  return (
    <div className="panel flex h-full flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Operasi & Kebijakan Siber</h2>
          <p className="eyebrow mt-0.5">Aktifkan keputusan · Lihat respons anomali</p>
        </div>
        <button
          onClick={onReset}
          disabled={active.length === 0}
          className="num shrink-0 rounded-sm border border-border px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-35"
        >
          Reset Event
        </button>
      </header>

      {/* Cyber Offensive Events */}
      <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-1">
        <p className="eyebrow mb-1 ml-1">Serangan Infrastruktur</p>
        {EVENT_LIBRARY.filter(
          (e) => e.kind === "infrastructure-hack" || e.kind === "ransomware",
        ).map((ev) => {
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
                <span className="eyebrow block normal-case text-muted-foreground">{ev.detail}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Network / Global Panic Events */}
      <div className="grid gap-2 px-3 pb-3 sm:grid-cols-2 xl:grid-cols-1 border-t border-border pt-2">
        <p className="eyebrow mb-1 ml-1">Anomali & Kebocoran Data</p>
        {EVENT_LIBRARY.filter((e) => e.kind === "zero-day-leak" || e.kind === "psyops").map(
          (ev) => {
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
                  <span className="eyebrow block normal-case text-muted-foreground">
                    {ev.detail}
                  </span>
                </span>
              </button>
            );
          },
        )}
      </div>

      {/* Status Payload Summary */}
      <div className="mt-auto border-t border-border">
        <div className="flex items-center justify-between px-4 py-2">
          <p className="eyebrow">Status Jaringan Siber</p>
          <p className="num text-[10px] text-muted-foreground">{state.assets.length} Aset</p>
        </div>
        <ul className="max-h-50 space-y-px overflow-y-auto px-2 pb-2">
          {state.assets.map((a) => (
            <li
              key={a.name}
              className="flex items-center justify-between gap-2.5 rounded-sm px-2 py-1.5"
            >
              <span className="num text-[10px] uppercase text-muted-foreground">{a.name}</span>
              <span
                className="text-[11px] font-semibold"
                style={{ color: a.executing ? "var(--critical)" : "var(--nominal)" }}
              >
                {a.kind} {a.executing ? "[EKSEKUSI]" : "[DORMANT]"}
              </span>
              <span className="num text-[11px] text-muted-foreground">{a.stealth}% STL</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
