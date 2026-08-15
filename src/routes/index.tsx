import { createFileRoute } from "@tanstack/react-router";
import { WarRoomMap } from "../components/ct/WarRoomMap";
import { GeopoliticPanel } from "../components/ct/GeopoliticPanel";
import { TopStatsStrip } from "../components/ct/TopStatsStrip";
import { useControl } from "@/components/ct/ControlProvider";
import { GAME_STATE_BASELINE } from "@/lib/ct/engine";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Command Center | urdictator.dev" },
      {
        name: "description",
        content:
          "Pantau pergerakan divisi militer, produksi sumber daya, dan ekspansi wilayah secara real-time.",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Command Center | urdictator.dev" },
    ],
  }),
  component: CommandCenterPage,
});

function CommandCenterPage() {
  const { state, rippleKey, revealed, visibleModes, toggleMode, active, toggleEvent, reset } =
    useControl();

  return (
    <>
      <TopStatsStrip state={state} baseline={GAME_STATE_BASELINE} />
      <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_340px]">
        <WarRoomMap
          state={state}
          rippleKey={rippleKey}
          revealed={revealed}
          visibleModes={visibleModes}
          onToggleMode={toggleMode}
        />
        <GeopoliticPanel
          active={active}
          onToggle={toggleEvent}
          onReset={reset}
          state={state}
          revealed={revealed}
        />
      </div>
    </>
  );
}
