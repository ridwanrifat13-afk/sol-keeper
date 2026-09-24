import { useState } from "react";
import { failureRatePerHour, requiredMarginFraction, riskBand, scenarioEsmBreakdown, type ProjectPhase } from "@sol-keeper/sim";
import { useRun } from "../../store/run.js";
import { useDial } from "../../store/dial.js";
import { systemLabel } from "../../dial/labels.js";

const PHASES: readonly { id: ProjectPhase; label: string; hint: string }[] = [
  { id: "srr", label: "SRR", hint: "System Requirements Review — earliest, most padding" },
  { id: "pdr", label: "PDR", hint: "Preliminary Design Review" },
  { id: "cdr", label: "CDR", hint: "Critical Design Review" },
  { id: "sir", label: "SIR", hint: "System Integration Review — right before flight" },
];

const LIKELIHOOD_CONSEQUENCE = [1, 2, 3, 4, 5] as const;

const RISK_PRESENTATION: Record<ReturnType<typeof riskBand>, { glyph: string; word: string; className: string }> = {
  low: { glyph: "●", word: "Low", className: "is-nominal" },
  medium: { glyph: "▲", word: "Medium", className: "is-caution" },
  high: { glyph: "■", word: "High", className: "is-critical" },
};

/** Hours to a rough, readable unit — this screen only needs an order of magnitude. */
function readableHours(hours: number): string {
  if (hours >= 24 * 365) return `${(hours / (24 * 365)).toFixed(1)} years`;
  if (hours >= 24) return `${Math.round(hours / 24).toLocaleString()} days`;
  return `${Math.round(hours).toLocaleString()} hours`;
}

/**
 * Launch Packing (M6, brief P2): the mass-budget and reliability screen. It reuses the
 * same per-system ESM breakdown the Operate view's ESM panel already computes (so hardware
 * mass here can never disagree with the ESM total) and pairs it with two things ESM doesn't
 * show — TRL-scaled failure rate and phase-dependent required margin — to teach the actual
 * trade a real flight program makes: closer to launch, less contingency mass you're allowed
 * to carry, and a lower TRL choice buys performance at the cost of reliability.
 *
 * The risk-matrix explorer at the bottom is a teaching tool, not a per-system assessment:
 * this project has no sourced likelihood/consequence rating for any real system, so it lets
 * the player pick both axes themselves and see how the 5x5 band responds, rather than
 * presenting an invented "this system's risk is medium" claim rule 1 would forbid.
 */
export function LaunchPackingView() {
  const scenario = useRun((s) => s.scenario);
  const level = useDial((s) => s.level);
  const [phase, setPhase] = useState<ProjectPhase>("pdr");
  const [likelihood, setLikelihood] = useState(3);
  const [consequence, setConsequence] = useState(3);

  const breakdown = scenarioEsmBreakdown(scenario);
  const marginFraction = requiredMarginFraction(phase);
  const band = riskBand(likelihood, consequence);
  const riskInfo = RISK_PRESENTATION[band];

  const sourcedLines = breakdown.perSystem.filter((line) => line.massKg !== undefined);
  const unsourcedLines = breakdown.perSystem.filter((line) => line.massKg === undefined);
  const bareMassTotal = sourcedLines.reduce((sum, line) => sum + (line.massKg ?? 0), 0);
  const packedMassTotal = bareMassTotal * (1 + marginFraction);

  return (
    <div className="launch-packing">
      <header className="view-head">
        <h2>Launch Packing</h2>
        <p className="view-hint">
          The mass you can actually launch, once technology maturity and design-review margin
          are counted — not just the bare hardware weight.
        </p>
      </header>

      <section className="panel" aria-labelledby="phase-heading">
        <h2 id="phase-heading">Project phase</h2>
        <p className="panel-hint">
          Required margin shrinks the closer a design gets to flight (NASA Ames APR 8070.1) —
          pick a phase to see how much padding each system's mass carries at that point.
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
      </section>

      <section className="panel" aria-labelledby="packing-heading">
        <h2 id="packing-heading">Per-system packed mass</h2>
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
              <td>Total (sourced hardware only)</td>
              <td />
              <td>{Math.round(bareMassTotal)} kg</td>
              <td />
              <td>{Math.round(packedMassTotal)} kg</td>
            </tr>
          </tfoot>
        </table>
        {unsourcedLines.length > 0 && (
          <p className="panel-hint">
            {unsourcedLines.map((l) => systemLabel(l.system, level)).join(", ")} carr
            {unsourcedLines.length === 1 ? "ies" : "y"} no sourced hardware mass and{" "}
            {unsourcedLines.length === 1 ? "is" : "are"} left out of the totals above rather than guessed —
            see Data Sources for why.
          </p>
        )}
      </section>

      <section className="panel" aria-labelledby="risk-heading">
        <h2 id="risk-heading">Risk matrix explorer</h2>
        <p className="panel-hint">
          A teaching tool, not a real per-system rating: this project has no sourced
          likelihood/consequence score for any system, so pick both yourself and see how a
          5×5 risk matrix bands the result.
        </p>
        <div className="risk-matrix-controls">
          <label>
            Likelihood
            <select value={likelihood} onChange={(e) => { setLikelihood(Number(e.target.value)); }}>
              {LIKELIHOOD_CONSEQUENCE.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            Consequence
            <select value={consequence} onChange={(e) => { setConsequence(Number(e.target.value)); }}>
              {LIKELIHOOD_CONSEQUENCE.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <span className={`risk-result ${riskInfo.className}`}>
            <span aria-hidden="true">{riskInfo.glyph}</span> {riskInfo.word} risk
          </span>
        </div>
      </section>
    </div>
  );
}
