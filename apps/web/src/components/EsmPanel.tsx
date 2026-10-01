import { scenarioEsmBreakdown } from "@sol-keeper/sim";
import { useRun } from "../store/run.js";
import { useDial } from "../store/dial.js";
import { systemLabel } from "../dial/labels.js";
import { useAppLanguage } from "../i18n/useAppLanguage.js";
import { esmCadetHeadline, esmIntro, ESM_PARTIAL_DISCLOSURE } from "../dial/esmPresent.js";

/**
 * The ESM budget — the P1 "one currency" mechanic, as a live readout (M4).
 *
 * Deliberately not interactive: the player cannot yet spend this budget on anything, only
 * see it. A real spend-a-budget mechanic still needs a Prepare view; the hardware mass,
 * cooling and crew-time data it would spend against is now sourced for every system except
 * Life Support (kept out on purpose, to avoid double-counting the five subsystems that
 * already model real life-support hardware) — see the note on scenarioEsmBreakdown in
 * packages/sim/src/engine/esm.ts.
 *
 * Player request: the six-column table (System/Power/Hardware/Cooling/Crew time/Equivalent
 * mass) reads as cramped squeezed into half of Mission Command's two-column console — same
 * optional `className` escape hatch FactCardGallery.tsx already uses, so this one call site
 * can opt into `panel-span-full` (styles.css) without every future EsmPanel use defaulting
 * to full width.
 */
export function EsmPanel({ className }: { readonly className?: string } = {}) {
  const scenario = useRun((s) => s.scenario);
  const level = useDial((s) => s.level);
  const language = useAppLanguage();
  const breakdown = scenarioEsmBreakdown(scenario);

  return (
    <section className={`panel ${className ?? ""}`} aria-labelledby="esm-heading">
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

          {/* Six columns, plus the new "not sourced" pills widening cells further, don't fit a
           *  phone screen — the same real overflow bug Launch Packing's own table had, fixed
           *  the same way there: a horizontally scrollable wrapper instead of clipping. */}
          <div className="table-scroll">
          <table className="esm-table">
            <thead>
              <tr>
                <th scope="col">System</th>
                <th scope="col">Power</th>
                <th scope="col">Hardware</th>
                <th scope="col">Cooling</th>
                <th scope="col">Crew time</th>
                <th scope="col">Equivalent mass</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.perSystem.map((line) => (
                <tr key={line.system} className={line.fullySourced ? undefined : "esm-partial-row"}>
                  <td>
                    {systemLabel(line.system, level, language)}
                    {!line.fullySourced && (
                      <span aria-hidden="true" className="esm-partial-mark">
                        {" "}
                        *
                      </span>
                    )}
                  </td>
                  <td>{line.powerKw.toFixed(1)} kW</td>
                  <td>
                    {line.massKg !== undefined ? (
                      `${Math.round(line.massKg)} kg`
                    ) : (
                      <span className="status-pill is-standby esm-not-sourced">not sourced</span>
                    )}
                  </td>
                  <td>
                    {line.coolingKg !== undefined ? (
                      `${Math.round(line.coolingKg)} kg`
                    ) : (
                      <span className="status-pill is-standby esm-not-sourced">not sourced</span>
                    )}
                  </td>
                  <td>
                    {line.crewTimeKg !== undefined ? (
                      `${Math.round(line.crewTimeKg)} kg`
                    ) : (
                      <span className="status-pill is-standby esm-not-sourced">not sourced</span>
                    )}
                  </td>
                  <td>{Math.round(line.equivalentKg)} kg</td>
                </tr>
              ))}
              <tr>
                <td>Habitat pressurised volume</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
                <td>{Math.round(breakdown.habitatVolumeKg)} kg</td>
              </tr>
              <tr>
                <td>Battery hardware</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
                <td>{Math.round(breakdown.batteryMassKg)} kg</td>
              </tr>
              {breakdown.reactorMassKg > 0 && (
                <tr>
                  <td>Fission reactor (NASA-FSP)</td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                  <td>{Math.round(breakdown.reactorMassKg)} kg</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
          <p className="esm-table-note">* not sourced for every term — see the note below.</p>

          <p className="esm-disclosure">{ESM_PARTIAL_DISCLOSURE}</p>
        </>
      )}
    </section>
  );
}
