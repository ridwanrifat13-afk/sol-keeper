/**
 * M10: a compatibility token for a shared run link, not a modelled quantity — never a
 * `Constant` (rule 1 has nothing to say about it; it isn't a physical or mission parameter).
 * A plain integer, not semver: a URL only ever needs to ask "can this decoder replay that
 * link," a yes/no question, not a three-part comparison.
 *
 * Bump this whenever a change to this package could change the numbers a run produces:
 * `engine/tick.ts`'s `PIPELINE` or its order, anything in `models/`, any value in
 * `data/constants.ts` or `data/scenarios/`, the incident catalog or its responses, the RNG
 * or the number/order of draws it makes, `engine/state.ts`'s initial state, or
 * `engine/setup.ts`'s sizing. Never bump it for `apps/web`, i18n, styling, or docs — none of
 * those can move a single number this package computes.
 *
 * A decoded run link whose `v` doesn't match this shows "made with an older version"
 * (apps/web's `share/runLink.ts`) rather than silently replaying wrong, or crashing.
 */
export const SIM_VERSION = 2;
