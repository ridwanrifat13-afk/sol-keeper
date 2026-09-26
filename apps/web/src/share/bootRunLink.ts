/**
 * M10.6: boot-time URL entry. The brief's own three modes for opening the app:
 *
 * 1. **No params** — an ordinary fresh app load. Untouched: the app opens on Setup exactly as
 *    it always has.
 * 2. **Config-only** — a class-mission link ("Create class link" on Setup, M10.7): a query
 *    string with no `i=` fragment. Every student gets the identical mission, seed included,
 *    landing on Briefing (nothing has been played yet).
 * 3. **Config + fragment** — a report/replay link (M10.7's "Copy report link"): the query
 *    string plus the played-out decision log. Rebuilt here via `@sol-keeper/sim`'s own
 *    `replayRun` (M10.4) — the exact final state, not an animated replay; M10.9's own
 *    replay-at-speed driver is a later, separate concern from "does this link land somewhere
 *    correct at all."
 *
 * A version mismatch or a malformed link never partially applies (CLAUDE.md's `/api`
 * whitelisting rule's own spirit, per `docs/M10_PLAN.md`'s finding #9) — both degrade to the
 * same fresh-app-load behaviour as "no params," plus a banner explaining why.
 *
 * Deliberately takes `location` as a plain `{ search, hash }` rather than reading
 * `window.location` itself, the same "inject what varies" shape `packages/sim` uses for its
 * own clock/RNG — lets this run under Vitest's plain Node environment (no `window` global)
 * and keeps `window` access confined to `App.tsx`'s own boot-time `useEffect`.
 */
import { decodeRunLinkFragment, decodeRunLinkQuery } from "./runLink.js";
import { useRun, type RunSetupChoices } from "../store/run.js";

export type BootRunLinkResult =
  | { readonly kind: "none" }
  | { readonly kind: "versionMismatch"; readonly foundVersion: number }
  | { readonly kind: "invalid"; readonly reason: string }
  | { readonly kind: "configOnly" }
  | { readonly kind: "fullReplay" };

export function applyRunLinkFromLocation(location: { readonly search: string; readonly hash: string }): BootRunLinkResult {
  const decodedConfig = decodeRunLinkQuery(location.search);
  if (decodedConfig.kind === "none") return { kind: "none" };
  if (decodedConfig.kind === "versionMismatch") return decodedConfig;
  if (decodedConfig.kind === "invalid") return decodedConfig;

  const decodedFragment = decodeRunLinkFragment(location.hash);
  if (decodedFragment.kind === "invalid") {
    // A config that decoded fine but a fragment that didn't is still the whole link failing —
    // silently dropping the input log and loading a config-only mission would quietly replace
    // "here's exactly how it went" with a different, un-asked-for mission.
    return { kind: "invalid", reason: decodedFragment.reason };
  }

  const setupChoices: RunSetupChoices = {
    landingSiteId: decodedConfig.config.landingSiteId,
    powerArchitecture: decodedConfig.config.powerArchitecture,
    shieldingApproach: decodedConfig.config.shieldingApproach,
  };

  if (decodedFragment.kind === "none") {
    useRun.getState().reset(decodedConfig.params, decodedConfig.scenario, setupChoices);
    return { kind: "configOnly" };
  }

  useRun
    .getState()
    .loadReplayedRun(
      decodedConfig.params,
      decodedConfig.scenario,
      setupChoices,
      decodedFragment.inputLog,
      decodedFragment.throughHour,
    );
  return { kind: "fullReplay" };
}
