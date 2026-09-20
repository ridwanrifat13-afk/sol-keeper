import { useTranslation } from "react-i18next";
import type { LiveOrSnapshotStatus } from "../data/liveOrSnapshot.js";
import type { SpaceWeatherStatus } from "../data/spaceWeather.js";

/**
 * Wherever external NASA data appears, the brief requires a visible "Live" / "Snapshot
 * (date)" label — never left implicit, and never carried by color alone (rule 6): the
 * glyph and the word both change with status, not just the badge's class.
 *
 * `"historical"` is Space Weather's own extra state: DONKI itself confirmed a quiet
 * period (a real "live" response, just an empty one), so the panel shows a saved real
 * event instead of nothing — worded differently from `"snapshot"` (which means live
 * couldn't be reached at all) so a player never mistakes history for something offline
 * merely failed to fetch.
 */
export function ProvenanceBadge({
  status,
  fetchedAt,
}: {
  readonly status: LiveOrSnapshotStatus | SpaceWeatherStatus;
  readonly fetchedAt?: string | undefined;
}) {
  const { t } = useTranslation();
  const date = fetchedAt
    ? new Date(fetchedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : undefined;

  if (status === "loading") {
    return (
      <span className="provenance-badge is-loading">
        <span aria-hidden="true">○</span> {t("badge.loading")}
      </span>
    );
  }
  if (status === "live") {
    return (
      <span className="provenance-badge is-live">
        <span aria-hidden="true">●</span> {t("badge.live")}
      </span>
    );
  }
  if (status === "historical") {
    return (
      <span className="provenance-badge is-historical">
        <span aria-hidden="true">◑</span>{" "}
        {date ? t("badge.historicalWithDate", { date }) : t("badge.historical")}
      </span>
    );
  }
  return (
    <span className="provenance-badge is-snapshot">
      <span aria-hidden="true">◐</span> {date ? t("badge.snapshotWithDate", { date }) : t("badge.snapshot")}
    </span>
  );
}
