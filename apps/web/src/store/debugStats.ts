/**
 * M11's `?debug=1` overlay own tick-time metric. A tiny, always-on, non-persisted store —
 * `record()`'s handful of `performance.now()` calls and one object write per tick cost nothing
 * next to what `simTick` itself does for a real mission hour, so this runs whether or not the
 * overlay is mounted, the same way `store/run.ts`'s own `version` counter always increments
 * regardless of whether anything is currently subscribed to it.
 */
import { create } from "zustand";

interface DebugStatsStore {
  lastTickMs: number;
  avgTickMs: number;
  tickCount: number;
  recordTick: (ms: number) => void;
}

export const useDebugStats = create<DebugStatsStore>((set, get) => ({
  lastTickMs: 0,
  avgTickMs: 0,
  tickCount: 0,
  recordTick: (ms) => {
    const { avgTickMs, tickCount } = get();
    const nextCount = tickCount + 1;
    // Running mean, not a stored array of samples — a 30-sol mission is 740+ ticks and this
    // never needs to answer anything but "the last one" and "the average so far".
    const nextAvg = avgTickMs + (ms - avgTickMs) / nextCount;
    set({ lastTickMs: ms, avgTickMs: nextAvg, tickCount: nextCount });
  },
}));
