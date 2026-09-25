import { getScenario, landingSitesForBody, type Confidence, type LandingSite, type LandingSiteId } from "@sol-keeper/sim";
import { useSetup } from "../../store/setup.js";
import { LandingSiteMap, type MapMarker } from "../../components/LandingSiteMap.js";

const CONFIDENCE_PRESENTATION: Record<Confidence, { glyph: string; label: string; className: string }> = {
  measured: { glyph: "●", label: "Measured", className: "is-nominal" },
  derived: { glyph: "◐", label: "Derived", className: "is-nominal" },
  tuned: { glyph: "▲", label: "Tuned for gameplay", className: "is-caution" },
  placeholder: { glyph: "?", label: "Not yet sourced", className: "is-critical" },
};

/** A confidence badge — icon + word + colour together (brief rule 6: never colour alone). */
function ConfidenceBadge({ confidence }: { readonly confidence: Confidence }) {
  const p = CONFIDENCE_PRESENTATION[confidence];
  return (
    <span className={`confidence-badge ${p.className}`}>
      <span aria-hidden="true">{p.glyph}</span> {p.label}
    </span>
  );
}

function illuminationLine(site: LandingSite): string {
  switch (site.illuminationModel) {
    case "latitudeSolar":
      return `Ordinary day/night cycle, sun angle by latitude — dark stretch up to ${site.maxDarkHours.value.toFixed(1)} h`;
    case "polarRidge":
      return site.illuminationFraction !== undefined
        ? `Sunlit roughly ${Math.round(site.illuminationFraction.value * 100)}% of the year, but in short, frequent shadow periods — dark stretch up to ${site.maxDarkHours.value.toFixed(0)} h`
        : `Short, frequent shadow periods — dark stretch up to ${site.maxDarkHours.value.toFixed(0)} h`;
    case "equatorialLunar":
      return `One long night per cycle — dark stretch up to ${site.maxDarkHours.value.toFixed(0)} h`;
  }
}

const ICE_ACCESS_LABEL: Record<LandingSite["iceAccess"], string> = {
  none: "None known",
  low: "Low",
  moderate: "Moderate",
  high: "High",
};

/** M9.2b's fourth setup step: every real candidate site for the chosen scenario's body,
 *  picked on the same real Leaflet+Trek map Briefing already uses (extended, M9.2b, for
 *  multi-site selection), with each site's trade-offs shown plainly — confidence badge on
 *  every number, never presented as fact (the brief's own M9 rule). */
export function LandingSiteStep() {
  const scenarioId = useSetup((s) => s.scenarioId);
  const landingSiteId = useSetup((s) => s.landingSiteId);
  const setLandingSiteId = useSetup((s) => s.setLandingSiteId);

  const scenario = getScenario(scenarioId);
  const sites = landingSitesForBody(scenario.body);
  const defaultId = sites[0]?.id;
  const selectedId = landingSiteId ?? defaultId;

  const markers: readonly MapMarker[] = sites.map((s) => ({
    id: s.id,
    name: s.name,
    latDeg: s.latDeg.value,
    lonDeg: s.lonDeg.value,
  }));

  return (
    <section className="panel" aria-labelledby="setup-landing-site-heading">
      <h2 id="setup-landing-site-heading">Choose a landing site</h2>
      <p className="panel-hint">
        No site is best at everything — sunlight, water ice, radiation shelter, comms, and
        terrain pull against each other.
      </p>

      <LandingSiteMap sites={markers} selectedId={selectedId} onSelect={(id) => { setLandingSiteId(id as LandingSiteId); }} body={scenario.body} />

      <div className="landing-site-cards">
        {sites.map((site) => {
          const isSelected = site.id === selectedId;
          return (
            <button
              key={site.id}
              type="button"
              className={`btn landing-site-card ${isSelected ? "btn-active" : ""}`}
              aria-pressed={isSelected}
              onClick={() => {
                setLandingSiteId(site.id);
              }}
            >
              <span className="landing-site-card-name">{site.name}</span>
              <ul className="status-list">
                <li>
                  <span className="status-list-label">Sunlight</span>
                  <span className="status-list-value">
                    {illuminationLine(site)} <ConfidenceBadge confidence={site.maxDarkHours.confidence} />
                  </span>
                </li>
                <li>
                  <span className="status-list-label">Water ice</span>
                  <span className="status-list-value">
                    {ICE_ACCESS_LABEL[site.iceAccess]}
                    {site.iceTraverseHours !== undefined && (
                      <>
                        {" "}
                        · {site.iceTraverseHours.value.toFixed(1)} crew-h/run{" "}
                        <ConfidenceBadge confidence={site.iceTraverseHours.confidence} />
                      </>
                    )}
                  </span>
                </li>
                <li>
                  <span className="status-list-label">Radiation</span>
                  <span className="status-list-value">
                    {site.doseMSvPerDay.value.toFixed(2)} mSv/day <ConfidenceBadge confidence={site.doseMSvPerDay.confidence} />
                  </span>
                </li>
                <li>
                  <span className="status-list-label">Comms visibility</span>
                  <span className="status-list-value">
                    {Math.round(site.commsVisibilityFraction.value * 100)}%{" "}
                    <ConfidenceBadge confidence={site.commsVisibilityFraction.confidence} />
                  </span>
                </li>
                <li>
                  <span className="status-list-label">Terrain difficulty</span>
                  <span className="status-list-value">
                    {Math.round(site.terrainDifficulty.value * 100)}%{" "}
                    <ConfidenceBadge confidence={site.terrainDifficulty.confidence} />
                  </span>
                </li>
                {site.body === "mars" && (
                  <li>
                    <span className="status-list-label">Dust exposure</span>
                    <span className="status-list-value">
                      {Math.round(site.dustExposure.value * 100)}% <ConfidenceBadge confidence={site.dustExposure.confidence} />
                    </span>
                  </li>
                )}
              </ul>
              {site.id === "MOON-CONNECTING-RIDGE" && (
                <p className="panel-hint landing-site-caveat">
                  This project&apos;s own default Moon scenarios use a nearby but not identical
                  coordinate (&minus;88.5°, 129.0°, labelled &quot;Shackleton Ridge&quot;) — a
                  real discrepancy in the source material, not resolved here.
                </p>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
