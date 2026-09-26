/**
 * M10.9: the replay-at-speed driver — "opening a report link replays the run's decisions at
 * speed" (Phase 2 brief). `share/bootRunLink.ts`'s config+fragment mode resets `useRun` to a
 * fresh hour-0 run and hands the decoded input log here, instead of jumping straight to the
 * final state the way M10.6/M10.8 originally did (`replayRun`, instant) — the viewer watches
 * the same mission a real player made, tick by tick, rather than only ever seeing its ending.
 *
 * Deliberately a separate, smaller store from `useRun`'s own `step()`: that one is built
 * around the M8 core loop (Sol Planning's phase gate, auto-pause on a notable event so a real
 * player can react to it) — none of which applies here, since every decision this drives is
 * already decided; there is nothing left to react to. This ticks straight through at whatever
 * speed the viewer picks, applying each recorded input the instant `state.hour` reaches it —
 * the exact same rule `packages/sim`'s own `replayRun` (M10.4) uses for its own instant
 * reconstruction, so watching a replay play out here and computing its final state directly
 * (still what "Copy report link" and the done-when proof both do) always agree: a replay is
 * nothing but the same recorded inputs applied through the same `applyInput` seam either way.
 */
import { tick as simTick, type RecordedInput, type RunInput } from "@sol-keeper/sim";
import { create } from "zustand";
import { useRun, type Speed } from "./run.js";

function applyRecordedInput(input: RunInput): void {
  const store = useRun.getState();
  switch (input.kind) {
    case "rations":
      store.setSurvivalMode(input.mode);
      return;
    case "priority":
      store.setPriority(input.systemId, input.direction);
      return;
    case "crewLocation":
      store.setCrewLocation(input.crewId, input.location);
      return;
    case "station":
      store.assignStation(input.crewId, input.station);
      return;
    case "commsPriority":
      store.setCommsPriority(input.priority);
      return;
    case "incidentResponse":
      store.resolveIncident(input.incidentId, input.responseId);
      return;
  }
}

/** Every input recorded for `hour`, applied through `useRun`'s own six mutators — the same
 *  ones a real player's click would have called, so each appends to `useRun`'s `inputLog` and
 *  logs its own causal entry exactly as it did the first time. Returns whatever's left. */
function applyInputsForHour(hour: number, remaining: readonly RecordedInput[]): RecordedInput[] {
  for (const recorded of remaining) {
    if (recorded.hour === hour) applyRecordedInput(recorded.input);
  }
  return remaining.filter((r) => r.hour !== hour);
}

interface ReplayStore {
  active: boolean;
  speed: Speed;
  throughHour: number;
  /** Still-unapplied recorded inputs, in the same chronological order `inputLog` always
   *  holds them — consumed from the front as `state.hour` reaches each one. */
  remaining: RecordedInput[];

  /** Starts replaying `inputLog` up to `throughHour`. The caller (`share/bootRunLink.ts`) has
   *  already reset `useRun` to a fresh hour-0 run with the matching config — this only
   *  applies whatever's recorded for hour 0 (a pre-play Sol Planning choice, not something to
   *  animate) and starts the clock rolling from there, at the default "normal" (4×) speed. */
  start: (inputLog: readonly RecordedInput[], throughHour: number) => void;
  setSpeed: (speed: Speed) => void;
  /** Applies every input due at the current hour, then advances one hour — the interval tick
   *  `components/ReplayControls.tsx` drives. A no-op once the replay has already finished. */
  tickOnce: () => void;
  stop: () => void;
}

export const useReplay = create<ReplayStore>((set, get) => ({
  active: false,
  speed: "normal",
  throughHour: 0,
  remaining: [],

  start: (inputLog, throughHour) => {
    const remaining = applyInputsForHour(useRun.getState().state.hour, [...inputLog]);
    set({ active: true, speed: "normal", throughHour, remaining });
  },

  setSpeed: (speed) => {
    set({ speed });
  },

  stop: () => {
    set({ active: false, remaining: [] });
  },

  tickOnce: () => {
    const { active, throughHour, remaining } = get();
    if (!active) return;
    const { state, params, scenario } = useRun.getState();
    if (state.hour >= throughHour || state.status !== "running") {
      set({ active: false, remaining: [] });
      return;
    }

    simTick(state, params, scenario);
    const stillPending = applyInputsForHour(state.hour, remaining);
    useRun.setState((s) => ({ version: s.version + 1 }));

    const finished = state.hour >= throughHour || state.status !== "running";
    set({ remaining: stillPending, active: !finished });
  },
}));
