import { FiBookOpen, FiExternalLink, FiCheckCircle, FiAlertTriangle, FiAward } from "react-icons/fi";
import { type CrisisScenario, isCrisisScenario, type SimState, type Scenario } from "@sol-keeper/sim";
import "./CrisisDebriefPanel.css";

export interface CrisisDebriefPanelProps {
  readonly scenario: Scenario;
  readonly state: SimState;
}

interface NarrativeData {
  lead: string;
  p1: string;
  p2: string;
  maxScale: number;
  goodInterpretation: (val: number, hist: number, unit: string) => string;
  warnInterpretation: (val: number, hist: number, unit: string) => string;
}

const NARRATIVES: Record<string, NarrativeData> = {
  "crisis-apollo13-co2": {
    lead: "Historical Resolution (April 1970): Following the oxygen tank 2 rupture, Mission Control team led by Ed Smylie and Tony Centrich spent 48 straight hours in Houston building an improvised adapter using only materials confirmed to be aboard Odyssey and Aquarius.",
    p1: "Astronauts Jim Lovell and Fred Haise taped flight plan covers into square funnels over the Command Module canisters, routed LM suit hoses into the tops with grey duct tape, and secured them with socks to create an airtight draft through Aquarius’s ventilation loop.",
    p2: "Cabin carbon dioxide had surged to 15.0 mmHg by the time the adapter was assembled at GET 93h. Within 1 hour of activation, ppCO₂ plunged to 2.0 mmHg and remained safe for the remainder of translunar coast and splashdown.",
    maxScale: 20,
    goodInterpretation: (val, hist, unit) =>
      `Your solution kept cabin CO₂ ${Math.abs(Math.round((val - hist) * 10) / 10)} ${unit} lower than the historical Apollo 13 flight peak.`,
    warnInterpretation: (val, hist, unit) =>
      `Your cabin CO₂ peaked ${Math.round((val - hist) * 10) / 10} ${unit} higher than NASA’s historical telemetry (15.0 mmHg limit).`,
  },
  "crisis-spe-1972": {
    lead: "Historical Outcome (August 1972): The colossal August 1972 solar particle event occurred between Apollo 16 (April) and Apollo 17 (December). Fortuitously, no astronauts were on the lunar surface during the coronal mass ejection impact.",
    p1: "NASA radiation biophysicists modeled the event (HRP-ARS, NASA-TP-3643): an unshielded astronaut on EVA would have absorbed an acute skin dose exceeding 400 rem (4,000 mSv) and deep-tissue doses > 1,400 mSv, triggering lethal Acute Radiation Syndrome.",
    p2: "Inside an Apollo Command Module or behind 20 g/cm² regolith storm shelters, dose was attenuated below the 250 mSv 30-day acute limit, proving that dedicated storm shelter architecture is critical for lunar surface survival.",
    maxScale: 350,
    goodInterpretation: (val, hist, unit) =>
      `Crew peak acute radiation dose was held to ${val} ${unit}, safely below NASA's ${hist} ${unit} 30-day acute limit.`,
    warnInterpretation: (val, hist, unit) =>
      `Crew peak acute radiation dose reached ${val} ${unit}, exceeding NASA's ${hist} ${unit} acute limit (Acute Radiation Syndrome risk).`,
  },
  "crisis-mir-fire": {
    lead: "Historical Resolution (February 1997): On February 23, 1997, cosmonaut Aleksandr Lazutkin ignited a Vika solid-fuel oxygen candle in Kvant-1. A defect caused it to burst into a blowtorch flame, charring station bulkheads and threatening the docked Soyuz lifeboat.",
    p1: "Commander Valeri Korzun and the crew battled dense black smoke and burning perchlorate with 3 foam and water extinguishers for 14 desperate minutes while donning gas masks and respirators in zero gravity.",
    p2: "The fire was smothered at minute 14. Heavy smoke and toxic carbon monoxide required over 45 minutes of intensive scrubbing by the station life support loop, but Mir and all six crew members survived.",
    maxScale: 60,
    goodInterpretation: (val, hist, unit) =>
      `Fire suppressed in ${val} ${unit} (matched or beat historical ${hist}-minute suppression).`,
    warnInterpretation: (val, hist, unit) =>
      `Fire burned for ${val} ${unit}, exceeding the historical ${hist}-minute suppression timeline.`,
  },
};

export function CrisisDebriefPanel({ scenario, state }: CrisisDebriefPanelProps) {
  if (!isCrisisScenario(scenario)) return null;

  const crisis = scenario as CrisisScenario;
  const outcome = crisis.historicalOutcome;
  const playerMetricValue = outcome.keyMetric.playerValue(state);
  const historicalMetricValue = outcome.keyMetric.historicalValue;
  const unit = outcome.keyMetric.unit;

  const narrative = (NARRATIVES[scenario.id] ?? NARRATIVES["crisis-apollo13-co2"])!;
  const delta = Math.round((playerMetricValue - historicalMetricValue) * 10) / 10;
  const betterThanHistorical = delta <= 0;
  const scale = narrative.maxScale;

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
            <strong>{narrative.lead}</strong>
          </p>
          <p className="crisis-narrative-text">{narrative.p1}</p>
          <p className="crisis-narrative-text">{narrative.p2}</p>

          <div className="crisis-source-action">
            <a
              href={outcome.nasaLink}
              target="_blank"
              rel="noreferrer"
              className="btn btn-quiet crisis-external-report"
            >
              <FiBookOpen className="btn-icon" />
              <span>Read the original NASA document ({outcome.sourceId})</span>
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
                  style={{ width: `${Math.min(100, (playerMetricValue / scale) * 100)}%` }}
                />
              </div>
            </div>

            {/* Historical Result */}
            <div className="comparison-row">
              <div className="comparison-label-row">
                <span className="comparison-agent">Historical Baseline / Limit</span>
                <span className="comparison-number historical-color">
                  {historicalMetricValue} {unit}
                </span>
              </div>
              <div className="comparison-track">
                <div
                  className="comparison-fill fill-historical"
                  style={{ width: `${Math.min(100, (historicalMetricValue / scale) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Delta evaluation */}
          <div className={`comparison-delta-box ${betterThanHistorical ? "delta-good" : "delta-warning"}`}>
            {betterThanHistorical ? (
              <>
                <FiCheckCircle className="delta-icon" />
                <span>{narrative.goodInterpretation(playerMetricValue, historicalMetricValue, unit)}</span>
              </>
            ) : (
              <>
                <FiAlertTriangle className="delta-icon" />
                <span>{narrative.warnInterpretation(playerMetricValue, historicalMetricValue, unit)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
