import { FiBookOpen, FiExternalLink, FiCheckCircle, FiAlertTriangle, FiAward } from "react-icons/fi";
import { type CrisisScenario, isCrisisScenario, type SimState, type Scenario } from "@sol-keeper/sim";
import "./CrisisDebriefPanel.css";

export interface CrisisDebriefPanelProps {
  readonly scenario: Scenario;
  readonly state: SimState;
}

export function CrisisDebriefPanel({ scenario, state }: CrisisDebriefPanelProps) {
  if (!isCrisisScenario(scenario)) return null;

  const crisis = scenario as CrisisScenario;
  const outcome = crisis.historicalOutcome;
  const playerMetricValue = outcome.keyMetric.playerValue(state);
  const historicalMetricValue = outcome.keyMetric.historicalValue;
  const unit = outcome.keyMetric.unit;

  const delta = Math.round((playerMetricValue - historicalMetricValue) * 10) / 10;
  const betterThanHistorical = delta <= 0;

  return (
    <section className="panel crisis-debrief-panel panel-span-full" aria-labelledby="crisis-debrief-heading">
      <div className="crisis-debrief-badge">
        <FiAward className="debrief-badge-icon" />
        <span>HISTORICAL ACCIDENT COMPARISON · SOURCE: {outcome.sourceId}</span>
      </div>

      <h2 id="crisis-debrief-heading" className="crisis-debrief-title">
        What Actually Happened
      </h2>

      <div className="crisis-debrief-content">
        <div className="crisis-debrief-narrative">
          <p className="crisis-narrative-lead">
            <strong>Historical Resolution (April 1970):</strong> Following the oxygen tank 2 rupture,
            Mission Control team led by Ed Smylie and Tony Centrich spent 48 straight hours in Houston
            building an improvised adapter using only materials confirmed to be aboard Odyssey and Aquarius.
          </p>
          <p className="crisis-narrative-text">
            Astronauts Jim Lovell and Fred Haise taped flight plan covers into square funnels over the Command Module
            canisters, routed LM suit hoses into the tops with grey duct tape, and secured them with socks to
            create an airtight draft through Aquarius’s ventilation loop.
          </p>
          <p className="crisis-narrative-text">
            Cabin carbon dioxide had surged to <strong>15.0 mmHg</strong> by the time the adapter was assembled at
            GET 93h. Within 1 hour of activation, ppCO₂ plunged to <strong>2.0 mmHg</strong> and remained safe
            for the remainder of translunar coast and splashdown.
          </p>

          <div className="crisis-source-action">
            <a
              href={outcome.nasaLink}
              target="_blank"
              rel="noreferrer"
              className="btn btn-quiet crisis-external-report"
            >
              <FiBookOpen className="btn-icon" />
              <span>Read the original NASA report ({outcome.sourceId})</span>
              <FiExternalLink className="btn-icon-sm" />
            </a>
          </div>
        </div>

        {/* Key Metric Comparison Card */}
        <div className="crisis-metric-comparison">
          <h3 className="comparison-title">{outcome.keyMetric.label}</h3>

          <div className="comparison-bars">
            {/* Player's Result */}
            <div className="comparison-row">
              <div className="comparison-label-row">
                <span className="comparison-agent">Your Simulation</span>
                <span className="comparison-number player-color">
                  {playerMetricValue} {unit}
                </span>
              </div>
              <div className="comparison-track">
                <div
                  className={`comparison-fill ${betterThanHistorical ? "fill-success" : "fill-danger"}`}
                  style={{ width: `${Math.min(100, (playerMetricValue / 20) * 100)}%` }}
                />
              </div>
            </div>

            {/* Historical Result */}
            <div className="comparison-row">
              <div className="comparison-label-row">
                <span className="comparison-agent">NASA Apollo 13 Historical Peak</span>
                <span className="comparison-number historical-color">
                  {historicalMetricValue} {unit}
                </span>
              </div>
              <div className="comparison-track">
                <div
                  className="comparison-fill fill-historical"
                  style={{ width: `${Math.min(100, (historicalMetricValue / 20) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Delta evaluation */}
          <div className={`comparison-delta-box ${betterThanHistorical ? "delta-good" : "delta-warning"}`}>
            {betterThanHistorical ? (
              <>
                <FiCheckCircle className="delta-icon" />
                <span>
                  Your solution kept cabin CO₂ <strong>{Math.abs(delta)} {unit}</strong> lower than the historical
                  Apollo 13 flight peak.
                </span>
              </>
            ) : (
              <>
                <FiAlertTriangle className="delta-icon" />
                <span>
                  Your cabin CO₂ peaked <strong>{delta} {unit}</strong> higher than NASA’s historical telemetry
                  (15.0 mmHg limit).
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
