import { useState } from "react";
import {
  FiAlertOctagon,
  FiArrowRight,
  FiBookOpen,
  FiClock,
  FiExternalLink,
  FiPackage,
  FiUsers,
} from "react-icons/fi";
import { crisisApollo13Co2, type CrisisScenario } from "@sol-keeper/sim";
import { useRun } from "../../store/run.js";
import "./CrisisSelectionView.css";

export interface CrisisSelectionViewProps {
  readonly onLaunchCrisis: () => void;
}

export function CrisisSelectionView({ onLaunchCrisis }: CrisisSelectionViewProps) {
  const [selectedCrisis] = useState<CrisisScenario>(crisisApollo13Co2);

  const handleStartCrisis = () => {
    // Reset simulation state with exact historical parameters and Apollo 13 crew
    useRun.getState().reset(
      {
        scenarioId: selectedCrisis.id,
        crewSize: selectedCrisis.crewSize,
        crewNames: ["Jim Lovell", "Jack Swigert", "Fred Haise"],
        missionStartIso: "1970-04-11T19:13:00Z",
        difficulty: "nominal",
      },
      selectedCrisis,
    );
    onLaunchCrisis();
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

      <div className="crisis-grid">
        {/* Active Crisis Dossier: Apollo 13 */}
        <section className="crisis-card crisis-card-active" aria-labelledby="apollo13-title">
          <div className="crisis-card-banner">
            <span className="crisis-tag-status">READY FOR REPLAY</span>
            <span className="crisis-tag-source">SOURCE: A13-CO2 · OCHMO-TB-004</span>
          </div>

          <div className="crisis-card-body">
            <div className="crisis-mission-meta">
              <span className="crisis-mission-date">APRIL 13, 1970 · 55:54:53 MET</span>
              <h2 id="apollo13-title" className="crisis-mission-name">
                Apollo 13: Lunar Module CO₂ Buildup
              </h2>
              <div className="crisis-location">
                Translunar Return Trajectory (Free-Return) · LM <em>Aquarius</em>
              </div>
            </div>

            {/* Crew list */}
            <div className="crisis-meta-row">
              <div className="crisis-meta-item">
                <span className="crisis-meta-label">
                  <FiUsers className="meta-icon" /> HISTORICAL CREW (3)
                </span>
                <span className="crisis-meta-value">
                  Jim Lovell (CDR) · Jack Swigert (CMP) · Fred Haise (LMP)
                </span>
              </div>
              <div className="crisis-meta-item">
                <span className="crisis-meta-label">
                  <FiClock className="meta-icon" /> NOMINAL TIME TO FIX
                </span>
                <span className="crisis-meta-value">~4.0 Hours (Onset: +00:00)</span>
              </div>
            </div>

            {/* Situation overview */}
            <div className="crisis-dossier-box">
              <h3 className="crisis-dossier-heading">
                <FiAlertOctagon className="dossier-icon text-caution" /> THE ONSET SITUATION
              </h3>
              <p className="crisis-dossier-text">
                Service Module Oxygen Tank 2 ruptured at 55h 55m elapsed mission time. The crew
                shut down Odyssey and evacuated to the Lunar Module <em>Aquarius</em> as an emergency lifeboat.
                Built for 2 astronauts for ~45 hours, Aquarius must now sustain 3 astronauts across
                an 84-hour translunar return.
              </p>
              <p className="crisis-dossier-text">
                <strong>The Critical Bottleneck:</strong> Aquarius’s round LiOH scrubbers are exhausted.
                The Command Module carries abundant square LiOH canisters, but they <em>do not fit</em>{" "}
                the LM receptacles. Cabin ppCO₂ is climbing steadily at ~0.31 mmHg/hr toward lethal hypercapnia
                (15.0 mmHg peak historical ceiling).
              </p>
            </div>

            {/* Available materials */}
            <div className="crisis-materials-box">
              <h3 className="crisis-dossier-heading">
                <FiPackage className="dossier-icon" /> AVAILABLE MATERIALS ONBOARD (A13-CO2)
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
              <div className="crisis-constraint-card">
                <span className="constraint-title">Cabin Net Volume</span>
                <span className="constraint-value">6.7 m³</span>
                <span className="constraint-sub">LM Ascent Cabin [A13-CO2]</span>
              </div>
              <div className="crisis-constraint-card">
                <span className="constraint-title">Cabin Pressure / Gas</span>
                <span className="constraint-value">5.0 psia (258 mmHg)</span>
                <span className="constraint-sub">100% Pure O₂ Atmosphere</span>
              </div>
              <div className="crisis-constraint-card">
                <span className="constraint-title">Historical Peak ppCO₂</span>
                <span className="constraint-value text-caution">15.0 mmHg</span>
                <span className="constraint-sub">Accident Review Board [A13-CO2]</span>
              </div>
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
                title="Read official NASA Apollo 13 Mission Report"
              >
                <FiBookOpen className="btn-icon" />
                <span>Original NASA Report ({selectedCrisis.historicalOutcome.sourceId})</span>
                <FiExternalLink className="btn-icon-sm" />
              </a>
            </div>
          </div>
        </section>

        {/* Future Crisis Teasers: SPE 1972 & Mir Fire */}
        <div className="crisis-upcoming-column">
          <section className="crisis-card crisis-card-upcoming" aria-labelledby="spe1972-title">
            <div className="crisis-card-banner">
              <span className="crisis-tag-upcoming">COMING IN STAGE 2</span>
              <span className="crisis-tag-source">SOURCE: SPE-1972 · OCHMO-TB-003</span>
            </div>
            <div className="crisis-card-body">
              <span className="crisis-mission-date">AUGUST 4, 1972</span>
              <h2 id="spe1972-title" className="crisis-mission-name-sm">
                Solar Particle Event: King of the Space Age
              </h2>
              <p className="crisis-teaser-text">
                Between Apollo 16 and Apollo 17, a colossal solar flare unleashed a proton storm that
                would have delivered &gt;400 rem to astronauts on the lunar surface. Evacuate crew to
                the regolith storm shelter before acute radiation sickness strikes.
              </p>
            </div>
          </section>

          <section className="crisis-card crisis-card-upcoming" aria-labelledby="mirfire-title">
            <div className="crisis-card-banner">
              <span className="crisis-tag-upcoming">COMING IN STAGE 3</span>
              <span className="crisis-tag-source">SOURCE: MIR-FIRE · NASA TM-104825</span>
            </div>
            <div className="crisis-card-body">
              <span className="crisis-mission-date">FEBRUARY 23, 1997</span>
              <h2 id="mirfire-title" className="crisis-mission-name-sm">
                Mir Space Station: Kvant-1 Oxygen Candle Fire
              </h2>
              <p className="crisis-teaser-text">
                A solid-fuel Vika oxygen generator bursts into an open blowtorch flame in Kvant-1, filling
                the orbital complex with toxic fumes. Don gas masks and battle the blaze before the
                Soyuz escape vehicles are compromised.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
