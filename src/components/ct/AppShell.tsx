import { ThemeToggle } from "./ThemeToggle";
import { ControlContext } from "./ControlProvider";
import { useContext } from "react";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const context = useContext(ControlContext);
  if (!context) {
    throw new Error("AppShell must be rendered within ControlProvider");
  }
  const { state } = context;

  // Hitung jumlah aset siber yang sedang mengeksekusi payload
  const activeExploits = state.assets.filter((a: { isExecuting: boolean }) => a.isExecuting).length;

  const threatPosture =
    state.globalThreat === "breached"
      ? { label: "Breached", color: "var(--critical)" }
      : state.globalThreat === "scanned"
        ? { label: "Scanned", color: "var(--caution)" }
        : { label: "Secure", color: "var(--nominal)" };

  return (
    <div className="relative z-10 min-h-screen">
      <header
        className="relative z-30 border-b border-border backdrop-blur-md"
        style={{ backgroundColor: "var(--header-bg)" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <div
              className="grid size-9 place-items-center rounded-(--radius-sm) border"
              style={{ borderColor: "var(--primary)", backgroundColor: "var(--primary-soft)" }}
            >
              <svg
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" strokeOpacity="0.45" />
                <path d="M12 2a10 10 0 0 0-10 10M12 22a10 10 0 0 0 10-10" />
                <circle cx="12" cy="12" r="4.5" />
              </svg>
            </div>
            <div>
              <h1 className="text-[15px] font-semibold leading-none tracking-tight">
                Pusat Komando Siber
              </h1>
              <p className="eyebrow mt-1">
                urdictator.dev · {state.hubs.length} Server Hubs Global
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-xs text-muted-foreground">Status Jaringan</span>
              <span
                className="rounded-(--radius-sm) border px-2 py-1 text-xs font-medium uppercase tracking-wider"
                style={{
                  color: threatPosture.color,
                  borderColor: threatPosture.color,
                  backgroundColor: "var(--surface-2)",
                }}
              >
                {threatPosture.label}
              </span>
            </div>
            <div className="panel px-3 py-1.5">
              <p className="eyebrow">Aset Tereksekusi</p>
              <p
                className="num text-lg font-semibold leading-tight"
                style={{ color: "var(--critical)" }}
              >
                {activeExploits}
                <span className="text-xs text-muted-foreground">/{state.assets.length}</span>
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="space-y-2 p-2 lg:p-3">
        <p className="flex flex-wrap items-center gap-x-2 px-1 pt-1 text-xs text-muted-foreground">
          <span>Pilih Kebijakan Operasi (Event) untuk melihat efek infrastruktur.</span>
          <span className="text-border">·</span>
          <span>
            <span className="num">{state.activeEvents.length}</span> operasi aktif
          </span>
        </p>
        {children}

        <footer className="flex flex-wrap items-center justify-between gap-2 px-2 pb-2 pt-1">
          <p className="text-xs text-muted-foreground">
            Engine urdictator.dev · <span className="num">{state.assets.length}</span> payload ·{" "}
            <span className="num">{state.hubs.length}</span> nodes
          </p>
          <p className="text-xs text-muted-foreground">
            Pusat Data Taktis · <span className="num">2026.07</span>
          </p>
        </footer>
      </main>
    </div>
  );
}
