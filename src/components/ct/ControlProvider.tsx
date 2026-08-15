/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { type Mode } from "./WarRoomMap";
import { CITIES } from "@/lib/ct/data";
import { computeGameState, type GameState } from "@/lib/ct/engine";

const ALL_CITIES = CITIES.map((c) => c.id);
const MODES: Mode[] = [];

interface Ctx {
  state: GameState;
  active: string[];
  revealed: string[];
  rippleKey: number;
  visibleModes: Mode[];
  toggleMode: (m: Mode) => void;
  toggleEvent: (id: string) => void;
  reset: () => void;
}

const ControlCtx = createContext<Ctx | null>(null);

export function useControl() {
  const ctx = useContext(ControlCtx);
  if (!ctx) throw new Error("useControl harus berada dalam <ControlProvider>");
  return ctx;
}

export function ControlProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<string[]>([]);
  const [revealed, setRevealed] = useState<string[]>(ALL_CITIES);
  const [rippleKey, setRippleKey] = useState(0);
  const [visibleModes, setVisibleModes] = useState<Mode[]>(MODES);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const toggleMode = useCallback((m: Mode) => {
    setVisibleModes((prev) =>
      prev.includes(m) ? (prev.length === 1 ? prev : prev.filter((x) => x !== m)) : [...prev, m],
    );
  }, []);

  const state = useMemo(() => computeGameState(active), [active]);

  /** Ripple effect: Menghapus cache node kota, lalu memunculkannya bertahap */
  const ripple = useCallback((next: string[]) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setActive(next);
    setRippleKey((k) => k + 1);
    if (next.length === 0) {
      setRevealed(ALL_CITIES);
      return;
    }
    const s = computeGameState(next);
    // Mengurutkan prioritas berdasarkan infrastruktur tertinggi
    const order = [...s.cities]
      .sort((a, b) => b.infrastructure - a.infrastructure)
      .map((c) => c.id);

    setRevealed([]);
    order.forEach((id, i) => {
      timers.current.push(setTimeout(() => setRevealed((prev) => [...prev, id]), 460 + i * 420));
    });
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const toggleEvent = useCallback(
    (id: string) => ripple(active.includes(id) ? active.filter((x) => x !== id) : [...active, id]),
    [active, ripple],
  );

  const reset = useCallback(() => ripple([]), [ripple]);

  const value = useMemo(
    () => ({
      state,
      active,
      revealed,
      rippleKey,
      visibleModes,
      toggleMode,
      toggleEvent,
      reset,
    }),
    [state, active, revealed, rippleKey, visibleModes, toggleMode, toggleEvent, reset],
  );

  return <ControlCtx.Provider value={value}>{children}</ControlCtx.Provider>;
}
