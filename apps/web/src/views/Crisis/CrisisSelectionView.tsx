import { useState } from "react";
import {
  FiAlertOctagon,
  FiArrowRight,
  FiBookOpen,
  FiClock,
  FiExternalLink,
  FiPackage,
  FiUsers,
  FiShield,
  FiAlertTriangle,
  FiZap,
} from "react-icons/fi";
import {
  crisisApollo13Co2,
  crisisSpe1972,
  crisisMirFire,
  type CrisisScenario,
} from "@sol-keeper/sim";
import { useRun } from "../../store/run.js";
import "./CrisisSelectionView.css";

export interface CrisisSelectionViewProps {
  readonly onLaunchCrisis: (targetTab?: "lifeSupport" | "incidentCommand" | "power") => void;
}

interface CrisisMeta {
  readonly id: string;
  readonly date: string;
  readonly name: string;
  readonly location: string;
  readonly crewLabel: string;
  readonly crewNames: string[];
  readonly nominalTime: string;
  readonly targetTab: "lifeSupport" | "incidentCommand" | "power";
  readonly onsetLead: string;
  readonly onsetDetail: string;
  readonly constraints: Array<{ title: string; value: string; sub: string }>;
  readonly icon: typeof FiAlertOctagon;
}

const CRISES: Array<{ scenario: CrisisScenario; meta: CrisisMeta }> = [
  {
    scenario: crisisApollo13Co2,
    meta: {
      id: "crisis-apollo13-co2",
      date: "APRIL 13, 1970 · 55:54:53 MET",
      name: "Apollo 13: Lunar Module CO₂ Buildup",
      location: "Translunar Return Trajectory (Free-Return) · LM Aquarius",
      crewLabel: "HISTORICAL CREW (3)",
      crewNames: ["Jim Lovell (CDR)", "Jack Swigert (CMP)", "Fred Haise (LMP)"],
      nominalTime: "~4.0 Hours (Onset: +00:00)",
      targetTab: "lifeSupport",
      onsetLead:
        "Service Module Oxygen Tank 2 ruptured at 55h 55m elapsed mission time. The crew shut down Odyssey and evacuated to the Lunar Module Aquarius as an emergency lifeboat. Built for 2 astronauts for ~45 hours, Aquarius must now sustain 3 astronauts across an 84-hour translunar return.",
      onsetDetail:
        "Aquarius’s round LiOH scrubbers are exhausted. The Command Module carries abundant square LiOH canisters, but they do not fit the LM receptacles. Cabin ppCO₂ is climbing steadily at ~0.31 mmHg/hr toward lethal hypercapnia (15.0 mmHg peak historical ceiling).",
      constraints: [
        { title: "Cabin Net Volume", value: "6.7 m³", sub: "LM Ascent Cabin [A13-CO2]" },
        { title: "Cabin Pressure / Gas", value: "5.0 psia (258 mmHg)", sub: "100% Pure O₂ Atmosphere" },
        { title: "Historical Peak ppCO₂", value: "15.0 mmHg", sub: "Accident Review Board [A13-CO2]" },
      ],
      icon: FiZap,
    },
  },
  {
    scenario: crisisSpe1972,
    meta: {
      id: "crisis-spe-1972",
      date: "AUGUST 4, 1972 · SOLAR CYCLE 20",
      name: "August 1972 Solar Particle Event",
      location: "Translunar Space / Descartes Lunar Highlands Outpost",
      crewLabel: "ASTRONAUT ROSTER (3)",
      crewNames: ["Commander (EVA)", "Lunar Module Pilot (EVA)", "Command Module Pilot (HAB)"],
      nominalTime: "~6.0 Hours (Peak Storm Duration)",
      targetTab: "incidentCommand",
      onsetLead:
        "Between Apollo 16 and Apollo 17, solar active region McMath 11976 unleashed a sequence of extreme solar flares and coronal mass ejections. Fast-travel shock fronts accelerated solar protons to nearly relativistic velocities directly along interplanetary magnetic field lines toward the Moon.",
      onsetDetail:
        "Two crew members are caught on EVA with spacesuit shielding of only 0.3 g/cm². Unshielded surface dose rates exceed 400 rem (4,000 mSv), which would cause severe acute radiation syndrome or death. Immediate evacuation to the regolith storm shelter (20 g/cm²) is mandatory.",
      constraints: [
        { title: "Peak Proton Flux", value: ">400 rem (4,000 mSv)", sub: "Unshielded Modeled Dose [HRP-ARS]" },
        { title: "NASA 30-Day Acute Limit", value: "250 mSv", sub: "Flight Rule Ceiling [OCHMO-RAD]" },
        { title: "Storm Shelter Attenuation", value: "20 g/cm² Regolith", sub: "Effective Dose <250 mSv" },
      ],
      icon: FiShield,
    },
  },
  {
    scenario: crisisMirFire,
    meta: {
      id: "crisis-mir-fire",
      date: "FEBRUARY 23, 1997 · 22:35 MOSCOW TIME",
      name: "Mir Space Station: Kvant-1 Oxygen Candle Fire",
      location: "Low Earth Orbit (51.6° Inclination) · Mir Kvant-1 Module",
      crewLabel: "EXPEDITION CREW (6)",
      crewNames: [
        "Valeri Korzun (CDR)",
        "Aleksandr Kaleri (FE)",
        "Jerry Linenger (Cosmonaut-Researcher)",
        "Vasily Tsibliyev",
        "Aleksandr Lazutkin",
        "Reinhold Ewald",
      ],
      nominalTime: "~14 Minutes Burn Duration",
      targetTab: "incidentCommand",
      onsetLead:
        "During evening preparation, a lithium perchlorate solid-fuel oxygen generation candle (Vika / TGK) ruptured inside Kvant-1. Molten metal and pressurized oxygen created a blowtorch flame spraying against the aluminum hull and filling the modules with dense, choking black smoke.",
      onsetDetail:
        "The flame blocked the hatchway to one of the docked Soyuz return craft, threatening the crew's emergency escape path. The cosmonauts and astronauts must battle zero-gravity fireballs using 3 foam/water extinguishers while donning respirators in pitch darkness.",
      constraints: [
        { title: "Burn Duration", value: "14 Minutes", sub: "Historical Suppression [NASA-SP-4030]" },
        { title: "Safety Consumables", value: "3 Extinguishers / 4 Respirators", sub: "Station Stock [MIR-FIRE-LINENGER]" },
        { title: "Atmosphere Recovery", value: "~45 min Heavy Smoke", sub: "Air Quality Restoration" },
      ],
      icon: FiAlertTriangle,
    },
  },
];

export function CrisisSelectionView({ onLaunchCrisis }: CrisisSelectionViewProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const current = CRISES[selectedIdx] ?? CRISES[0]!;
  const selectedCrisis = current.scenario;
  const meta = current.meta;

  const handleStartCrisis = () => {
    // Reset simulation state with exact historical parameters and crew
    useRun.getState().reset(
      {
        scenarioId: selectedCrisis.id,
        crewSize: selectedCrisis.crewSize,
        crewNames: meta.crewNames.map((n) => n.split(" (")[0] ?? n),
        missionStartIso:
          selectedCrisis.id === "crisis-apollo13-co2"
            ? "1970-04-11T19:13:00Z"
            : selectedCrisis.id === "crisis-spe-1972"
            ? "1972-08-04T06:00:00Z"
            : "1997-02-23T19:35:00Z",
        difficulty: "nominal",
      },
      selectedCrisis,
    );
    onLaunchCrisis(meta.targetTab);
  };

  return (
    <div className="crisis-view">
      <header className="crisis-header">
        <div className="crisis-header-badge">
          <FiAlertOctagon className="crisis-badge-icon" />
          <span>DECLASSIFIED HISTORICAL MISSION ARCHIVE · M9.3</span>
        </div>
        <h1 className="crisis-title">Historical Crisis Replay</h1>
        <p className="crisis-subtitle">
          Step into the command seat during real spaceflight emergencies. Every constraint,
          buildup rate, and consumable matches published NASA accident review board telemetry.
        </p>
      </header>

      {/* Scenario Selector Tabs */}
      <div className="crisis-tab-selector" role="tablist" aria-label="Historical Crises">
        {CRISES.map((c, idx) => {
          const Icon = c.meta.icon;
          const isActive = idx === selectedIdx;
          return (
            <button
              key={c.scenario.id}
              id={`select-${c.scenario.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`crisis-selector-btn ${isActive ? "active" : ""}`}
              onClick={() => setSelectedIdx(idx)}
            >
              <Icon className="crisis-tab-icon" />
              <div className="crisis-tab-text">
                <span className="crisis-tab-date">{c.meta.date.split(" · ")[0]}</span>
                <span className="crisis-tab-title">{c.meta.name.split(":")[0]}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="crisis-grid-single">
        {/* Active Selected Crisis Dossier */}
        <section className="crisis-card crisis-card-active" aria-labelledby="crisis-active-title">
          <div className="crisis-card-banner">
            <span className="crisis-tag-status">READY FOR REPLAY</span>
            <span className="crisis-tag-source">SOURCE: {selectedCrisis.historicalOutcome.sourceId}</span>
          </div>

          <div className="crisis-card-body">
            <div className="crisis-mission-meta">
              <span className="crisis-mission-date">{meta.date}</span>
              <h2 id="crisis-active-title" className="crisis-mission-name">
                {meta.name}
              </h2>
              <div className="crisis-location">{meta.location}</div>
            </div>

            {/* Crew list */}
            <div className="crisis-meta-row">
              <div className="crisis-meta-item">
                <span className="crisis-meta-label">
                  <FiUsers className="meta-icon" /> {meta.crewLabel}
                </span>
                <span className="crisis-meta-value">{meta.crewNames.join(" · ")}</span>
              </div>
              <div className="crisis-meta-item">
                <span className="crisis-meta-label">
                  <FiClock className="meta-icon" /> NOMINAL TIME HORIZON
                </span>
                <span className="crisis-meta-value">{meta.nominalTime}</span>
              </div>
            </div>

            {/* Situation overview */}
            <div className="crisis-dossier-box">
              <h3 className="crisis-dossier-heading">
                <FiAlertOctagon className="dossier-icon text-caution" /> THE ONSET SITUATION
              </h3>
              <p className="crisis-dossier-text">{meta.onsetLead}</p>
              <p className="crisis-dossier-text">{meta.onsetDetail}</p>
            </div>

            {/* Available materials */}
            <div className="crisis-materials-box">
              <h3 className="crisis-dossier-heading">
                <FiPackage className="dossier-icon" /> AVAILABLE MATERIALS &amp; SPARES
              </h3>
              <ul className="crisis-materials-list">
                {selectedCrisis.availableMaterials.map((mat, i) => (
                  <li key={i} className="crisis-material-chip">
                    <span className="bullet">■</span> {mat}
                  </li>
                ))}
              </ul>
            </div>

            {/* Mission constraints */}
            <div className="crisis-constraints-grid">
              {meta.constraints.map((con, i) => (
                <div key={i} className="crisis-constraint-card">
                  <span className="constraint-title">{con.title}</span>
                  <span className="constraint-value">{con.value}</span>
                  <span className="constraint-sub">{con.sub}</span>
                </div>
              ))}
            </div>

            {/* Action CTA */}
            <div className="crisis-card-actions">
              <button
                id="begin-crisis-replay-btn"
                type="button"
                className="btn btn-primary crisis-start-btn"
                onClick={handleStartCrisis}
              >
                <span>BEGIN CRISIS REPLAY</span>
                <FiArrowRight className="btn-icon" />
              </button>

              <a
                href={selectedCrisis.historicalOutcome.nasaLink}
                target="_blank"
                rel="noreferrer"
                className="btn btn-quiet crisis-source-btn"
                title={`Read official NASA report (${selectedCrisis.historicalOutcome.sourceId})`}
              >
                <FiBookOpen className="btn-icon" />
                <span>Original NASA Document ({selectedCrisis.historicalOutcome.sourceId})</span>
                <FiExternalLink className="btn-icon-sm" />
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
