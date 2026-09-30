import { useLiveOrSnapshot } from "../data/liveOrSnapshot.js";
import { ProvenanceBadge } from "./ProvenanceBadge.js";
import type { ImageQueryKey } from "../../server-lib/validate.js";
import type { NasaImagesResponse } from "../../server-lib/types.js";

/**
 * "What NASA did" fact cards (brief P2, M6): real mission photos for a fixed topic, using
 * the same /api/nasa-images + snapshot machinery M5 already built and tested. No outbound
 * "view on NASA's site" link is included — the public image-library site's detail-page URL
 * pattern isn't something this project has independently confirmed, and a guessed link is
 * exactly the kind of thing rule 1's spirit extends to even outside physical constants.
 */
export function FactCardGallery({
  topic,
  heading,
  className,
}: {
  readonly topic: ImageQueryKey;
  readonly heading: string;
  /** Player request: some galleries (a horizontally-scrolling photo strip) read as cramped
   *  squeezed into half of a two-column console — `panel-span-full` (styles.css) restores the
   *  full-width look they had before that layout shipped, at the same call sites the player
   *  named, not every gallery everywhere. */
  readonly className?: string;
}) {
  const result = useLiveOrSnapshot<NasaImagesResponse>(
    `/snapshots/nasa-images-${topic}.json`,
    `/api/nasa-images?q=${topic}`,
  );

  return (
    <section className={`panel ${className ?? ""}`} aria-labelledby={`fact-cards-${topic}-heading`}>
      <div className="panel-head-row">
        <h2 id={`fact-cards-${topic}-heading`}>{heading}</h2>
        <ProvenanceBadge status={result.status} fetchedAt={result.data?.fetchedAt} />
      </div>
      {result.data && result.data.items.length > 0 ? (
        <ul className="fact-card-strip">
          {result.data.items.slice(0, 6).map((item) => (
            <li key={item.nasaId} className="fact-card">
              <img src={item.thumbUrl} alt="" loading="lazy" />
              <p className="fact-card-title">{item.title}</p>
              <p className="fact-card-credit">{item.credit}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="panel-hint">Loading real NASA photos…</p>
      )}
    </section>
  );
}
