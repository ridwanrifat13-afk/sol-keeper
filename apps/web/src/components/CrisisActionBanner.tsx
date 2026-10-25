import {
  FiAlertOctagon,
  FiAlertTriangle,
  FiAward,
  FiCheckCircle,
  FiRefreshCw,
  FiShield,
  FiZap,
} from "react-icons/fi";
import { isCrisisScenario } from "@sol-keeper/sim";
import { useRun } from "../store/run.js";
import { assessCrisisOutcome } from "../dial/crisisThreatAssessment.js";
import "./CrisisActionBanner.css";

const CRISIS_START_PARAMS: Record<string, { startIso: string; crewNames: string[] }> = {
  "crisis-apollo13-co2": {
    startIso: "1970-04-11T19:13:00Z",
    crewNames: ["Jim Lovell", "Jack Swigert", "Fred Haise"],
  },
  "crisis-spe-1972": {
    startIso: "1972-08-04T06:00:00Z",
    crewNames: ["Commander", "Lunar Module Pilot", "Command Module Pilot"],
  },
  "crisis-mir-fire": {
    startIso: "1997-02-23T19:35:00Z",
    crewNames: [
      "Valeri Korzun",
      "Aleksandr Kaleri",
      "Jerry Linenger",
      "Vasily Tsibliyev",
      "Aleksandr Lazutkin",
      "Reinhold Ewald",
    ],
  },
};

export function CrisisActionBanner({
  targetStation,
}: {
  readonly targetStation?: "lifeSupport" | "incidentCommand";
}) {
  useRun((s) => s.version);
  const state = useRun((s) => s.state);
  const scenario = useRun((s) => s.scenario);
  const resolveIncident = useRun((s) => s.resolveIncident);
  const setCrewLocation = useRun((s) => s.setCrewLocation);
  const resetRun = useRun((s) => s.reset);

  if (!isCrisisScenario(scenario)) return null;

  // If the crisis has elapsed (run ended: success, partial, abort, loss),
  // present the comprehensive Threat & Caution Assessment Evaluation card.
  if (state.status !== "running") {
    // Show only at the owning station console (or when no targetStation is specified)
    if (
      (scenario.id === "crisis-apollo13-co2" && targetStation && targetStation !== "lifeSupport") ||
      ((scenario.id === "crisis-spe-1972" || scenario.id === "crisis-mir-fire") &&
        targetStation &&
        targetStation !== "incidentCommand")
    ) {
      return null;
    }

    const assessment = assessCrisisOutcome(scenario, state);
    const outcomeCls =
      assessment.outcomeLevel === "critical"
        ? "is-critical"
        : assessment.outcomeLevel === "caution"
        ? "is-caution"
        : "is-nominal";

    const handleRestartFresh = () => {
      const meta = CRISIS_START_PARAMS[scenario.id];
      resetRun(
        {
          scenarioId: scenario.id,
          crewSize: scenario.crewSize,
          difficulty: "nominal",
          ...(meta?.crewNames ? { crewNames: meta.crewNames } : {}),
          ...(meta?.startIso ? { missionStartIso: meta.startIso } : {}),
        },
        structuredClone(scenario),
      );
    };

    const handleOpenDebrief = () => {
      window.dispatchEvent(new CustomEvent("sol-keeper:navigate", { detail: "debrief" }));
    };

    return (
      <aside
        className={`crisis-action-banner crisis-outcome-panel ${outcomeCls}`}
        aria-label="Crisis Evaluation and Hazards"
      >
        <div className="crisis-banner-head">
          <div className="crisis-banner-title">
            {assessment.outcomeLevel === "critical" ? (
              <FiAlertOctagon aria-hidden="true" />
            ) : assessment.outcomeLevel === "caution" ? (
              <FiAlertTriangle aria-hidden="true" />
            ) : (
              <FiCheckCircle aria-hidden="true" />
            )}
            <span>{assessment.badgeHeadline}</span>
          </div>
          <span className="crisis-banner-badge">
            {assessment.outcomeLevel.toUpperCase()} OUTCOME
          </span>
        </div>

        <div className="crisis-outcome-body">
          <p className="crisis-outcome-decision">
            <strong>Decision Taken:</strong> {assessment.decisionTakenText}
          </p>

          <div className="crisis-threats-section">
            <h4 className="crisis-threats-title">Cautions &amp; Threats Incurred:</h4>
            <ul className="crisis-threats-list">
              {assessment.threatsAndCautions.map((threat, idx) => (
                <li key={idx} className="crisis-threat-item">
                  <span className="crisis-threat-bullet">▶</span> {threat}
                </li>
              ))}
            </ul>
          </div>

          <p className="crisis-outcome-hist">
            <strong>Historical Telemetry:</strong> {assessment.historicalComparisonText}
          </p>
        </div>

        <div className="crisis-banner-actions">
          <button
            type="button"
            className="crisis-action-btn-primary"
            onClick={handleRestartFresh}
          >
            <FiRefreshCw aria-hidden="true" /> Replay Crisis (Fresh Start)
          </button>
          <button
            type="button"
            className="crisis-action-btn-secondary"
            onClick={handleOpenDebrief}
          >
            <FiAward aria-hidden="true" /> View Full Debrief &amp; Black Box
          </button>
        </div>
      </aside>
    );
  }

  // Apollo 13 CO2 Buildup banner (targeted to lifeSupport)
  if (scenario.id === "crisis-apollo13-co2") {
    if (targetStation && targetStation !== "lifeSupport") return null;
    const incident = state.activeIncidents.find((i) => i.definitionId === "o2tank-apollo13");
    const isResolved =
      incident?.resolvedAtHour !== undefined || incident?.chosenResponseId === "improviseAdapter";

    if (isResolved) {
      return (
        <aside className="crisis-action-banner" aria-label="Crisis Status">
          <div className="crisis-resolved-box">
            <FiCheckCircle aria-hidden="true" />
            <span>
              <strong>Apollo 13 Fix Deployed:</strong> Improvised LiOH canister adapter successfully
              installed. Round LM scrubber operational; cabin ppCO₂ stabilizing below 2.0 mmHg.
            </span>
          </div>
        </aside>
      );
    }

    return (
      <aside className="crisis-action-banner" aria-label="Crisis Action Required">
        <div className="crisis-banner-head">
          <div className="crisis-banner-title">
            <FiAlertTriangle aria-hidden="true" />
            <span>Emergency Action: Apollo 13 CO₂ Buildup</span>
          </div>
          <span className="crisis-banner-badge">A13-CO2 TELEMETRY</span>
        </div>
        <p className="crisis-banner-body">
          Lunar Module cylindrical scrubbers are exhausted. Cabin ppCO₂ is{" "}
          <strong>{state.atmosphere.co2PartialPressureMmHg.toFixed(1)} mmHg</strong> and rising toward
          the lethal 15.0 mmHg hypercapnia ceiling. Fabricate the improvised &quot;mailbox&quot; adapter to
          fit Command Module square canisters to the round LM socket.
        </p>
        <div className="crisis-banner-materials">
          <span className="crisis-material-chip">✓ Suit Hoses</span>
          <span className="crisis-material-chip">✓ Cardboard Covers</span>
          <span className="crisis-material-chip">✓ Plastic Bags</span>
          <span className="crisis-material-chip">✓ Grey Duct Tape</span>
          <span className="crisis-material-chip">✓ Lunar Overshoe Sock</span>
        </div>
        <div className="crisis-banner-actions">
          <button
            type="button"
            className="crisis-action-btn-primary"
            onClick={() => {
              if (incident) {
                resolveIncident(incident.id, "improviseAdapter");
              }
            }}
          >
            <FiZap aria-hidden="true" /> Improvise LiOH Canister Adapter
          </button>
        </div>
      </aside>
    );
  }

  // Solar Particle Event August 1972 banner (targeted to incidentCommand)
  if (scenario.id === "crisis-spe-1972") {
    if (targetStation && targetStation !== "incidentCommand") return null;
    const incident = state.activeIncidents.find((i) => i.definitionId === "spe-1972");
    const evaCrew = state.crew.filter((c) => c.alive && c.location === "eva");
    const shelterCrew = state.crew.filter((c) => c.alive && c.location === "stormShelter");
    const allSheltered = evaCrew.length === 0 && shelterCrew.length === state.crew.length;

    if (allSheltered) {
      return (
        <aside className="crisis-action-banner" aria-label="Crisis Status">
          <div className="crisis-resolved-box">
            <FiCheckCircle aria-hidden="true" />
            <span>
              <strong>Storm Shelter Active:</strong> All crew members are secured inside the 20 g/cm²
              regolith storm shelter. Radiation dose attenuated below the 250 mSv acute limit.
            </span>
          </div>
        </aside>
      );
    }

    return (
      <aside className="crisis-action-banner" aria-label="Crisis Action Required">
        <div className="crisis-banner-head">
          <div className="crisis-banner-title">
            <FiAlertTriangle aria-hidden="true" />
            <span>Emergency Action: Extreme Solar Particle Event</span>
          </div>
          <span className="crisis-banner-badge">&gt;400 REM PROTON FLUX</span>
        </div>
        <p className="crisis-banner-body">
          {evaCrew.length > 0 ? (
            <>
              <strong>Warning:</strong> {evaCrew.length} astronaut(s) caught outside on EVA in 0.5 g/cm²
              spacesuits ({evaCrew.map((c) => c.name).join(", ")}). Unshielded dose accumulation will
              cause Acute Radiation Syndrome (&gt;100 mSv).
            </>
          ) : (
            <>Crew currently in habitat (20 g/cm² base). Retreat to regolith storm shelter for maximum protection.</>
          )}
        </p>
        <div className="crisis-banner-actions">
          <button
            type="button"
            className="crisis-action-btn-primary"
            onClick={() => {
              for (const member of state.crew) {
                if (member.alive) setCrewLocation(member.id, "stormShelter");
              }
              if (incident && incident.chosenResponseId === undefined) {
                resolveIncident(incident.id, "shelterNow");
              }
            }}
          >
            <FiShield aria-hidden="true" /> Order Immediate Storm Shelter (All Crew)
          </button>
          {evaCrew.length > 0 && (
            <button
              type="button"
              className="crisis-action-btn-secondary"
              onClick={() => {
                for (const member of evaCrew) {
                  setCrewLocation(member.id, "habitat");
                }
              }}
            >
              Recall EVA Crew to Habitat (6 min)
            </button>
          )}
        </div>
      </aside>
    );
  }

  // Mir Fire 1997 banner (targeted to incidentCommand)
  if (scenario.id === "crisis-mir-fire") {
    if (targetStation && targetStation !== "incidentCommand") return null;
    const incident = state.activeIncidents.find((i) => i.definitionId === "fire-mir97");
    const isSuppressed =
      incident?.chosenResponseId === "fight" || incident?.chosenResponseId === "evacuate";

    if (isSuppressed) {
      return (
        <aside className="crisis-action-banner" aria-label="Crisis Status">
          <div className="crisis-resolved-box">
            <FiCheckCircle aria-hidden="true" />
            <span>
              <strong>Fire Suppressed &amp; Contained:</strong> Flame extinguished. Crew wearing
              respirators during 45-minute smoke clearance phase. Station integrity preserved.
            </span>
          </div>
        </aside>
      );
    }

    return (
      <aside className="crisis-action-banner" aria-label="Crisis Action Required">
        <div className="crisis-banner-head">
          <div className="crisis-banner-title">
            <FiAlertTriangle aria-hidden="true" />
            <span>Emergency Action: Mir Kvant-1 Candle Fire</span>
          </div>
          <span className="crisis-banner-badge">NASA-SP-4030 TELEMETRY</span>
        </div>
        <p className="crisis-banner-body">
          Solid-fuel oxygen generator (Vika/TGK) burning out of control in Kvant-1 module. Dense toxic
          smoke threatens station atmosphere and access to docked Soyuz return vehicle.
        </p>
        <div className="crisis-banner-materials">
          <span className="crisis-material-chip">
            Extinguishers: <strong>{state.safetyConsumables.fireExtinguishers} available</strong>
          </span>
          <span className="crisis-material-chip">
            Respirator Cartridges:{" "}
            <strong>{state.safetyConsumables.respiratorCartridges} in stock</strong>
          </span>
        </div>
        <div className="crisis-banner-actions">
          <button
            type="button"
            className="crisis-action-btn-primary"
            onClick={() => {
              if (incident) resolveIncident(incident.id, "fight");
            }}
          >
            <FiZap aria-hidden="true" /> Deploy Fire Extinguishers (Direct Attack)
          </button>
          <button
            type="button"
            className="crisis-action-btn-secondary"
            onClick={() => {
              if (incident) resolveIncident(incident.id, "evacuate");
            }}
          >
            <FiShield aria-hidden="true" /> Isolate Kvant-1 Ventilation &amp; Seal Hatch
          </button>
        </div>
      </aside>
    );
  }

  return null;
}
