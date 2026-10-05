import { CONSTANTS, SOURCE_IDS, walkConstants, type Confidence, type SourceId } from "@sol-keeper/sim";
import { SOURCE_REGISTRY } from "../../data/sourceRegistry.js";
import sourceVerification from "../../data/sourceVerification.generated.json" with { type: "json" };

/**
 * Where every number in the game comes from (brief rule 1, rule 5).
 *
 * Nothing here is hand-typed prose about which constants exist — the table is built by
 * walking the live constants tree, so it can never say something the sim itself no longer
 * agrees with. Only the source *metadata* (titles, links) is a hand-kept manifest
 * (data/sourceRegistry.ts), because the sim has no reason to know what a citation looks like.
 */

const CONFIDENCE_LABELS: Record<Confidence, string> = {
  measured: "Measured — stated directly by the cited source",
  derived: "Derived — arithmetic on measured values",
  tuned: "Tuned for gameplay — not a NASA figure",
  placeholder: "Placeholder — not yet sourced",
};

const CONFIDENCE_ORDER: readonly Confidence[] = ["measured", "derived", "tuned", "placeholder"];

/**
 * `docs/DATA_SOURCES.md`'s own ☐/☑ Status column, mirrored (never set) here by
 * `scripts/generate-source-verification.ts` — CLAUDE.md is explicit that only the lead
 * developer marks a row ☑, after checking the page/table in the source document, so this
 * screen only ever surfaces what that file already says, never its own judgment. Icon +
 * pattern (a filled vs. hollow circle) + text, never color alone (brief rule 6).
 */
interface VerificationEntry {
  readonly verified: boolean;
  readonly verifiedBy?: string;
}
const SOURCE_VERIFICATION: Record<string, VerificationEntry | undefined> = sourceVerification;

interface SourceRow {
  readonly id: SourceId;
  readonly info: (typeof SOURCE_REGISTRY)[SourceId];
  readonly count: number;
  readonly confidences: ReadonlySet<Confidence>;
  readonly verification: VerificationEntry;
}

function buildSourceRows(): SourceRow[] {
  const all = walkConstants(CONSTANTS);
  const bySource = new Map<SourceId, { count: number; confidences: Set<Confidence> }>();

  for (const { constant } of all) {
    const id = constant.source;
    const entry = bySource.get(id) ?? { count: 0, confidences: new Set<Confidence>() };
    entry.count += 1;
    entry.confidences.add(constant.confidence);
    bySource.set(id, entry);
  }

  return SOURCE_IDS.map((id) => {
    const entry = bySource.get(id) ?? { count: 0, confidences: new Set<Confidence>() };
    const verification = SOURCE_VERIFICATION[id] ?? { verified: false };
    return { id, info: SOURCE_REGISTRY[id], count: entry.count, confidences: entry.confidences, verification };
  })
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);
}

function placeholders(): { path: string; note: string | undefined }[] {
  return walkConstants(CONSTANTS)
    .filter((x) => x.constant.confidence === "placeholder")
    .map((x) => ({ path: x.path, note: x.constant.note }));
}

export function DataSourcesView() {
  const rows = buildSourceRows();
  const openPlaceholders = placeholders();

  return (
    <div className="data-sources">
      <header className="view-head">
        <h2>Data Sources</h2>
        <p className="view-hint">
          Every number in Sol Keeper cites one of the sources below. This page is generated
          from the same constants file the simulation runs on — it cannot drift from what the
          game actually uses.
        </p>
      </header>

      <section className="panel" aria-labelledby="credit-heading">
        <h2 id="credit-heading">Credit</h2>
        <p className="credit-line">
          Not affiliated with or endorsed by NASA. Data credited to NASA, the NASA Ames
          Research Center, Goddard Space Flight Center, MIT, UC Berkeley, and the cited
          independent researchers. Sol Keeper is a Space Apps Challenge project and carries
          no NASA logo, insignia, or "meatball".
        </p>
      </section>

      {/* M9.1's own "Provenance and disclosure (REQUIRED)" section: station cockpit-view
          photographs are illustrative artwork, not NASA photography, stated plainly here as
          well as in apps/web/public/stations/CREDITS.md (the fuller, per-image record). */}
      <section className="panel" aria-labelledby="artwork-heading">
        <h2 id="artwork-heading">Artwork</h2>
        <p className="panel-hint">
          Cockpit view (an optional, toggleable layout on each station console) shows that
          console's own real content inside a photograph of a mission-control console —
          illustrative artwork, not NASA photography, and carrying no NASA insignia.
        </p>
        <p className="source-verification source-unverified">
          <span aria-hidden="true">○</span> All ten station photographs (power, comms,
          incident command, mission command, life support — Moon and Mars) have unresolved
          provenance — not yet cleared to ship. Full record in{" "}
          <code>apps/web/public/stations/CREDITS.md</code>.
        </p>
      </section>

      <section className="panel" aria-labelledby="sources-heading">
        <h2 id="sources-heading">Sources ({rows.length})</h2>
        <ul className="source-list">
          {rows.map((row) => (
            <li key={row.id} className="source-row">
              <div className="source-row-head">
                <span className="source-id">{row.id}</span>
                <span className="source-count">
                  {row.count} constant{row.count === 1 ? "" : "s"}
                </span>
              </div>
              <p
                className={`source-verification ${row.verification.verified ? "source-verified" : "source-unverified"}`}
              >
                <span aria-hidden="true">{row.verification.verified ? "●" : "○"}</span>{" "}
                {row.verification.verified
                  ? `Verified${row.verification.verifiedBy !== undefined ? ` by ${row.verification.verifiedBy}` : ""}`
                  : "Not yet verified against the source document"}
              </p>
              <p className="source-title">
                {row.info.url !== undefined ? (
                  <a href={row.info.url} target="_blank" rel="noreferrer">
                    {row.info.title}
                  </a>
                ) : (
                  row.info.title
                )}
              </p>
              <p className="source-used-for">{row.info.usedFor}</p>
              <p className="source-confidence">
                {CONFIDENCE_ORDER.filter((c) => row.confidences.has(c))
                  .map((c) => CONFIDENCE_LABELS[c])
                  .join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Rendered whether or not any placeholders remain. An empty list is the stronger
          statement of the two, and hiding the section at zero would make "everything is
          sourced" invisible exactly when it becomes true. */}
      <section className="panel" aria-labelledby="placeholders-heading">
        <h2 id="placeholders-heading">Still unsourced ({openPlaceholders.length})</h2>
        {openPlaceholders.length === 0 ? (
          <p className="panel-hint">
            None. Every number this simulation runs on is backed by a NASA source listed
            above — no value is a quiet guess. Where a figure is derived by arithmetic, or
            tuned for playability rather than measured, it says so in its own entry.
          </p>
        ) : (
          <>
            <p className="panel-hint">
              Every value below is a placeholder: it is not yet backed by a checked NASA source,
              and the brief requires that to stay visible rather than quietly guessed.
            </p>
            <ul className="placeholder-list">
              {openPlaceholders.map((p) => (
                <li key={p.path} className="placeholder-row">
                  <code>{p.path}</code>
                  {p.note !== undefined && <p className="placeholder-note">{p.note}</p>}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="panel" aria-labelledby="simplifications-heading">
        <h2 id="simplifications-heading">Game simplifications</h2>
        <ul className="simplification-list">
          <li>
            Shielding curves, crop yields, thermal conductance, and failure rates are tuned
            for gameplay, not measured.
          </li>
          <li>
            NASA-STD-3001 states the solar-particle-event limit as 250 mGy-Eq over 30 days.
            Gray-equivalent weights by biological effect where the sievert weights by
            radiation type, so the two are not strictly interchangeable — the game compares
            its accumulated mSv dose against 250 directly, close enough for the lesson (get
            the crew to shelter) but not a dosimetry calculation.
          </li>
          <li>DONKI space-weather events are observed near Earth, not at Mars or the Moon.</li>
          <li>Equirectangular map layers stretch visibly near the poles.</li>
          <li>
            Fire risk from an oxygen-rich cabin is not modelled. NASA's guidance is that
            flammability tracks oxygen <em>concentration</em> and total pressure, not oxygen
            partial pressure alone — and this simulation tracks only O₂ and CO₂ partial
            pressures, with no nitrogen or total-pressure model, so it has no honest way to
            compute a concentration. Rather than threshold on the wrong quantity, it doesn't
            claim to model fire at all.
          </li>
          <li>
            The Mission ESM budget now carries hardware mass, cooling load and crew-time for
            every system except Life Support, which is intentionally left without its own
            hardware-mass figure: BVAD only baselines individual life-support functions, and
            giving "Life Support" a mass on top of the five subsystems already listed here
            (CO2 scrubber, thermal control, oxygen generator, water recovery, greenhouse)
            would double-count the same hardware under two names. Water Recovery is missing
            only its cooling figure — no NASA source checked so far states one.
          </li>
        </ul>
      </section>
    </div>
  );
}
