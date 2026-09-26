import { useState } from "react";
import {
  failureRatePerHour,
  requiredMarginFraction,
  scenarioEsmBreakdown,
  sizeShielding,
  type ProjectPhase,
} from "@sol-keeper/sim";
import { useSetup, resolveScenario } from "../../store/setup.js";
import { useDial } from "../../store/dial.js";
import { systemLabel } from "../../dial/labels.js";

const PHASES: readonly { id: ProjectPhase; label: string; hint: string }[] = [
  { id: "srr", label: "SRR", hint: "System Requirements Review — earliest, most padding" },
  { id: "pdr", label: "PDR", hint: "Preliminary Design Review" },
  { id: "cdr", label: "CDR", hint: "Critical Design Review" },
  { id: "sir", label: "SIR", hint: "System Integration Review — right before flight" },
];

/** Hours to a rough, readable unit — this screen only needs an order of magnitude. */
function readableHours(hours: number): string {
  if (hours >= 24 * 365) return `${(hours / (24 * 365)).toFixed(1)} years`;
  if (hours >= 24) return `${Math.round(hours / 24).toLocaleString()} days`;
  return `${Math.round(hours).toLocaleString()} hours`;
}

/**
 * Launch Packing (M6, revived as the setup wizard's final review step in M9.2d): the
 * mass-budget and reliability screen, now previewing the *actual* scenario the player is
 * about to launch — every earlier wizard choice (landing site, crew size, power
 * architecture, shielding approach) already flows into `resolveScenario`, so nothing shown
 * here can disagree with what "Launch Mission" is about to commit.
 *
 * Reuses the same per-system ESM breakdown the Operate view's ESM panel already computes
 * (so hardware mass here can never disagree with that readout) and pairs it with two things
 * ESM doesn't show — TRL-scaled failure rate and phase-dependent required margin — to teach
 * the actual trade a real flight program makes: closer to launch, less contingency mass
 * you're allowed to carry, and a lower TRL choice buys performance at the cost of
 * reliability.
 *
 * M9 extends the totals with the two lines the original M6 screen never had: launched
 * consumables (`consumablesMassKg`) and, for a regolith berm, the pre-mission construction
 * crew-hours converted into ESM-equivalent kg (`shieldingCrewTimeKg`) — both real, both
 * driven by this wizard's own choices, neither invented.
 *
 * The M6 risk-matrix explorer (player-picked likelihood/consequence, since no system has a
 * sourced rating) is dropped here rather than revived — a teaching aside, not part of this
 * wizard's own review-and-launch purpose.
 *
 * M10.2 adds the mission seed control here — the last review step, so a player who cares
 * enough to record or fix a seed sees it right before launching, not buried earlier in the
 * wizard alongside choices that don't need memorising.
 */
export function LaunchPackingStep() {
  const scenarioId = useSetup((s) => s.scenarioId);
  const crewSize = useSetup((s) => s.crewSize);
  const landingSiteId = useSetup((s) => s.landingSiteId);
  const powerArchitecture = useSetup((s) => s.powerArchitecture);
  const shieldingApproach = useSetup((s) => s.shieldingApproach);
  const seed = useSetup((s) => s.seed);
  const setSeed = useSetup((s) => s.setSeed);
  const rerollSeed = useSetup((s) => s.rerollSeed);
  const level = useDial((s) => s.level);
  const [phase, setPhase] = useState<ProjectPhase>("pdr");

  const scenario = resolveScenario({
    scenarioId,
    landingSiteId,
    crewSize,
    powerArchitecture,
    shieldingApproach,
  });
  const shieldingCrewHours = sizeShielding(shieldingApproach).constructionCrewHours;
  const breakdown = scenarioEsmBreakdown(scenario, "surfaceMid", shieldingCrewHours);
  const marginFraction = requiredMarginFraction(phase);

  const sourcedLines = breakdown.perSystem.filter((line) => line.massKg !== undefined);
  const unsourcedLines = breakdown.perSystem.filter((line) => line.massKg === undefined);
  const bareMassTotal = sourcedLines.reduce((sum, line) => sum + (line.massKg ?? 0), 0);
  const packedMassTotal = bareMassTotal * (1 + marginFraction);
  const grandTotalKg = packedMassTotal + breakdown.consumablesMassKg + breakdown.shieldingCrewTimeKg;

  return (
    <section className="panel" aria-labelledby="setup-packing-heading">
      <h2 id="setup-packing-heading">Launch Packing — final review</h2>
      <p className="panel-hint">
        The mass you can actually launch for this exact mission, once technology maturity and
        design-review margin are counted — not just the bare hardware weight.
      </p>

      <div className="seed-row">
        <label htmlFor="setup-seed-input" className="seed-label">
          Mission seed
        </label>
        <input
          id="setup-seed-input"
          className="seed-input"
          type="number"
          inputMode="numeric"
          min={0}
          max={4294967295}
          step={1}
          value={seed}
          onChange={(e) => {
            const parsed = Number(e.target.value);
            if (Number.isFinite(parsed)) setSeed(parsed);
          }}
        />
        <button type="button" className="btn btn-tiny" onClick={rerollSeed}>
          🎲 Reroll
        </button>
      </div>
      <p className="panel-hint">
        Same seed, same choices, same outcome — every incident, every dice roll. Write it down
        (or share a mission link, once you've flown) to reproduce this exact mission later.
      </p>

      <div className="button-row" role="group" aria-label="Project review phase">
        {PHASES.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`btn ${phase === p.id ? "btn-active" : ""}`}
            aria-pressed={phase === p.id}
            onClick={() => {
              setPhase(p.id);
            }}
          >
            {p.label}
            <span className="btn-sub">{p.hint}</span>
          </button>
        ))}
      </div>

      <table className="launch-packing-table">
        <thead>
          <tr>
            <th scope="col">System</th>
            <th scope="col">TRL</th>
            <th scope="col">Hardware mass</th>
            <th scope="col">Reliability (MTBF)</th>
            <th scope="col">
              Packed at {PHASES.find((p) => p.id === phase)?.label} (+{Math.round(marginFraction * 100)}%)
            </th>
          </tr>
        </thead>
        <tbody>
          {breakdown.perSystem.map((line) => {
            const spec = scenario.systems.find((s) => s.id === line.system);
            const trl = spec?.trl ?? 0;
            const mtbfHours = trl > 0 ? 1 / failureRatePerHour(trl) : undefined;
            return (
              <tr key={line.system}>
                <td>{systemLabel(line.system, level)}</td>
                <td>{trl || "—"}</td>
                <td>{line.massKg !== undefined ? `${Math.round(line.massKg)} kg` : "not sourced"}</td>
                <td>{mtbfHours !== undefined ? readableHours(mtbfHours) : "—"}</td>
                <td>
                  {line.massKg !== undefined
                    ? `${Math.round(line.massKg * (1 + marginFraction))} kg`
                    : "not sourced"}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td>Hardware total (sourced only)</td>
            <td />
            <td>{Math.round(bareMassTotal)} kg</td>
            <td />
            <td>{Math.round(packedMassTotal)} kg</td>
          </tr>
          <tr>
            <td>+ Consumables launched (O2/CO2/food/water)</td>
            <td colSpan={3} />
            <td>{Math.round(breakdown.consumablesMassKg)} kg</td>
          </tr>
          <tr>
            <td>+ Shielding crew-time (ESM-equivalent)</td>
            <td colSpan={3} />
            <td>{Math.round(breakdown.shieldingCrewTimeKg)} kg</td>
          </tr>
          <tr>
            <td>
              <strong>Grand total</strong>
            </td>
            <td colSpan={3} />
            <td>
              <strong>{Math.round(grandTotalKg)} kg</strong>
            </td>
          </tr>
        </tfoot>
      </table>
      {unsourcedLines.length > 0 && (
        <p className="panel-hint">
          {unsourcedLines.map((l) => systemLabel(l.system, level)).join(", ")} carr
          {unsourcedLines.length === 1 ? "ies" : "y"} no sourced hardware mass and{" "}
          {unsourcedLines.length === 1 ? "is" : "are"} left out of the hardware totals above rather
          than guessed — see Data Sources for why.
        </p>
      )}
      {shieldingCrewHours > 0 && (
        <p className="panel-hint">
          The regolith berm's {shieldingCrewHours} pre-mission construction crew-hours are shown here
          as their ESM-equivalent kg, not as launched cargo — no rocket carries crew-hours.
        </p>
      )}
    </section>
  );
}
