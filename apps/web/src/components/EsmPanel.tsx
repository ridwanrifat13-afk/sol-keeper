import { scenarioEsmBreakdown } from "@sol-keeper/sim";
import { useRun } from "../store/run.js";
import { useDial } from "../store/dial.js";
import { systemLabel } from "../dial/labels.js";
import { esmCadetHeadline, esmIntro, ESM_PARTIAL_DISCLOSURE } from "../dial/esmPresent.js";

/**
 * The ESM budget — the P1 "one currency" mechanic, as a live readout (M4).
 *
 * Deliberately not interactive: the player cannot yet spend this budget on anything, only
 * see it. A real spend-a-budget mechanic needs a Prepare view and per-system hardware mass
 * data this project does not have sourced yet — see the note on scenarioEsmBreakdown in
 * packages/sim/src/engine/esm.ts for exactly what was researched and why it came up short.
 */
export function EsmPanel() {
  const scenario = useRun((s) => s.scenario);
  const level = useDial((s) => s.level);
  const breakdown = scenarioEsmBreakdown(scenario);

  return (
    <section className="panel" aria-labelledby="esm-heading">
      <h2 id="esm-heading">Mission ESM budget</h2>
      <p className="panel-hint">{esmIntro(level)}</p>

      {level === "cadet" ? (
        <p className="esm-cadet-headline">{esmCadetHeadline(breakdown.totalKg)}</p>
      ) : (
        <>
          <div className="esm-total">
            <span className="esm-total-label">Total equivalent mass</span>
            <span className="esm-total-value">{Math.round(breakdown.totalKg).toLocaleString()} kg</span>
          </div>

          <table className="esm-table">
            <thead>
              <tr>
                <th scope="col">System</th>
                <th scope="col">Power</th>
                <th scope="col">Equivalent mass</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.perSystem.map((line) => (
                <tr key={line.system}>
                  <td>{systemLabel(line.system, level)}</td>
                  <td>{line.powerKw.toFixed(1)} kW</td>
                  <td>{Math.round(line.equivalentKg)} kg</td>
                </tr>
              ))}
              <tr>
                <td>Habitat pressurised volume</td>
                <td>—</td>
                <td>{Math.round(breakdown.habitatVolumeKg)} kg</td>
              </tr>
              <tr>
                <td>Battery hardware</td>
                <td>—</td>
                <td>{Math.round(breakdown.batteryMassKg)} kg</td>
              </tr>
              {breakdown.reactorMassKg > 0 && (
                <tr>
                  <td>Fission reactor (NASA-FSP)</td>
                  <td>—</td>
                  <td>{Math.round(breakdown.reactorMassKg)} kg</td>
                </tr>
              )}
            </tbody>
          </table>

          <p className="esm-disclosure">{ESM_PARTIAL_DISCLOSURE}</p>
        </>
      )}
    </section>
  );
}
