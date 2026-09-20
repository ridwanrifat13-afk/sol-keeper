/**
 * The four states a system can be in, shared by PowerPriorities and the Ripple Web so the
 * two views can never disagree about what "Shed" means. See PowerPriorities.tsx's own
 * comment for why "Standby" exists as a genuine fourth state, not a colour choice: before
 * the first tick, `poweredThisHour` is just its unset default, not a real result yet.
 */
import type { SystemState } from "@sol-keeper/sim";

export type SystemRunState = "standby" | "powered" | "shed" | "failed";

export interface SystemStatusInfo {
  readonly runState: SystemRunState;
  readonly glyph: string;
  readonly word: string;
  readonly className: string;
}

const RUN_STATE_INFO: Record<SystemRunState, SystemStatusInfo> = {
  standby: { runState: "standby", glyph: "○", word: "Standby", className: "is-standby" },
  powered: { runState: "powered", glyph: "●", word: "Powered", className: "is-nominal" },
  shed: { runState: "shed", glyph: "▲", word: "Shed", className: "is-caution" },
  failed: { runState: "failed", glyph: "■", word: "Failed", className: "is-critical" },
};

export function systemStatusInfo(
  system: SystemState | undefined,
  missionStarted: boolean,
): SystemStatusInfo {
  if (!missionStarted || system === undefined) return RUN_STATE_INFO.standby;
  if (!system.operational) return RUN_STATE_INFO.failed;
  return system.poweredThisHour ? RUN_STATE_INFO.powered : RUN_STATE_INFO.shed;
}
