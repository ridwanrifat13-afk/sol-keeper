import { useRun } from "../store/run.js";
import { timestampLabel } from "../dial/missionTime.js";

/**
 * M9.1's own rule for `ticker` regions: "one-line readouts only (mission elapsed time, sol
 * clock, power margin)" — not a registered console panel (CockpitTarget/assignPanels is for
 * those), the same kind of station-independent, StationCockpit-supplied content as
 * `alertContent`, just with a fixed, small vocabulary instead of a caller-chosen node.
 */
export type TickerMetric = "missionTime" | "powerMargin";

/** The fixed, ordered list StationCockpit cycles a station's ticker regions through, in the
 *  screen map's own declared region order (not by region id — keeps this generic across
 *  stations, the same reason overflowHost picks by list position, not a specific id). */
export const TICKER_METRICS: readonly TickerMetric[] = ["missionTime", "powerMargin"];

export function CockpitTicker({ metric }: { readonly metric: TickerMetric }) {
  const hour = useRun((s) => s.state.hour);
  const body = useRun((s) => s.scenario.body);
  const generationKw = useRun((s) => s.state.power.generationKw);
  const demandKw = useRun((s) => s.state.power.demandKw);

  if (metric === "missionTime") {
    return <span className="cockpit-ticker-readout">{timestampLabel(hour, body)}</span>;
  }

  const marginKw = generationKw - demandKw;
  return (
    <span className="cockpit-ticker-readout">
      Power margin {marginKw >= 0 ? "+" : ""}
      {marginKw.toFixed(1)} kW
    </span>
  );
}
